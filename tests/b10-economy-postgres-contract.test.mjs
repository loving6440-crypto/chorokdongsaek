import test from 'node:test'
import assert from 'node:assert/strict'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'

// 실제 PostgreSQL은 이 실행 환경에서 연결되지 않으므로 SQL 계약을 흉내 낸 작은 격리 클라이언트로
// BEGIN → per-actor advisory lock + row-level FOR UPDATE → writes → COMMIT/ROLLBACK 경로와 부분 쓰기 실패 처리를 확인한다.
function fakePg() {
  const pool = { rows: new Map(), queries: [], failOnWrite: false, rollbacks: 0, commits: 0 }
  pool.query = async (sql, params = []) => {
    pool.queries.push(sql)
    if (sql.startsWith('SELECT data FROM saves')) {
      const value = pool.rows.get(params[0])
      return { rows: value === undefined ? [] : [{ data: structuredClone(value) }] }
    }
    throw new Error(`unexpected pool query: ${sql}`)
  }
  pool.connect = async () => {
    let rows = null
    return {
      release() {},
      async query(sql, params = []) {
        pool.queries.push(sql)
        if (sql === 'BEGIN') { rows = new Map(pool.rows); return { rows: [] } }
        if (sql.startsWith('SELECT pg_advisory_xact_lock')) {
          assert.ok(rows, 'advisory lock must happen inside a transaction')
          return { rows: [] }
        }
        if (sql.startsWith('SELECT data FROM saves')) {
          const data = rows.get(params[0])
          return { rows: data === undefined ? [] : [{ data: structuredClone(data) }] }
        }
        if (sql.startsWith('INSERT INTO saves')) {
          if (pool.failOnWrite) { pool.failOnWrite = false; throw new Error('simulated database disk failure') }
          rows.set(params[0], JSON.parse(params[1]))
          return { rows: [] }
        }
        if (sql === 'COMMIT') { pool.rows = rows; pool.commits++; return { rows: [] } }
        if (sql === 'ROLLBACK') { pool.rollbacks++; rows = null; return { rows: [] } }
        throw new Error(`unexpected SQL: ${sql}`)
      },
    }
  }
  return pool
}
const req = (n) => `sql-mock-request-${n.toString().padStart(8, '0')}`

test('B10 PostgreSQL 경로 계약: 트랜잭션·잠금·다중 행 COMMIT', async () => {
  const db = fakePg()
  const ledger = createVerifiedEconomyStore({ db, itemIds: ['stone'] })
  await ledger.grantTrusted({ target: 'sellerAlpha', sourceKey: req(1), items: { stone: 2 } })
  await ledger.grantTrusted({ target: 'buyerBravoo', sourceKey: req(2), money: 20 })
  const l = await ledger.list({ actor: 'sellerAlpha', requestId: req(3), item: 'stone', qty: 2, price: 6 })
  assert.equal((await ledger.buy({ actor: 'buyerBravoo', requestId: req(4), listing: l.id })).total, 12)
  assert.equal((await ledger.wallet('buyerBravoo')).money, 8)
  assert.equal((await ledger.wallet('sellerAlpha')).pendingMoney, 12)
  assert.ok(db.queries.some((sql) => sql.startsWith('SELECT pg_advisory_xact_lock')))
  assert.ok(db.queries.some((sql) => sql.includes('ON CONFLICT (id) DO UPDATE')))
  assert.ok(db.commits > 0)
})

test('B10 PostgreSQL 경로 계약: 부분 쓰기 실패는 ROLLBACK하고 멱등키를 남기지 않음', async () => {
  const db = fakePg()
  const ledger = createVerifiedEconomyStore({ db, itemIds: ['stone'] })
  await ledger.grantTrusted({ target: 'sellerAlpha', sourceKey: req(10), items: { stone: 4 } })
  db.failOnWrite = true
  await assert.rejects(ledger.list({ actor: 'sellerAlpha', requestId: req(11), item: 'stone', qty: 1, price: 5 }), /simulated database disk failure/)
  assert.equal(db.rollbacks, 1)
  assert.equal((await ledger.wallet('sellerAlpha')).inventory.stone, 4)
  assert.deepEqual(await ledger.marketplace('sellerAlpha'), [])
  const success = await ledger.list({ actor: 'sellerAlpha', requestId: req(11), item: 'stone', qty: 1, price: 5 })
  assert.equal(success.ok, true)
  assert.equal(success.replay, undefined)
})
