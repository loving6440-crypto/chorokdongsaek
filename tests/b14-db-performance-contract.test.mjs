import test from 'node:test'
import assert from 'node:assert/strict'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'
import { createAccountStore } from '../server/accounts.js'

function mockPg() {
  const rows = new Map()
  const queries = []
  const locks = []
  let begin = 0
  let commits = 0
  let rollbacks = 0
  let transient = false
  const query = async (sql, params = []) => {
    queries.push(sql)
    if (sql === 'BEGIN') { begin++; return { rows: [] } }
    if (sql === 'COMMIT') { commits++; return { rows: [] } }
    if (sql === 'ROLLBACK') { rollbacks++; return { rows: [] } }
    if (sql.startsWith('SELECT pg_advisory_xact_lock')) { locks.push(params); return { rows: [] } }
    if (sql.startsWith('SELECT data FROM saves')) {
      const value = rows.get(params[0])
      return { rows: value === undefined ? [] : [{ data: structuredClone(value) }] }
    }
    if (sql.startsWith('INSERT INTO saves')) {
      if (transient) { transient = false; const e = new Error('deadlock retry'); e.code = '40P01'; throw e }
      const key = params[0]
      if (!sql.includes('DO NOTHING') || !rows.has(key)) rows.set(key, JSON.parse(params[1]))
      return { rows: [] }
    }
    throw new Error('unexpected SQL: ' + sql)
  }
  return {
    db: { query, async connect() { return { query, release() {} } } }, rows, queries, locks,
    get begin() { return begin }, get commits() { return commits }, get rollbacks() { return rollbacks },
    injectDeadlock() { transient = true },
  }
}
const id = (i) => 'performanceUser' + String(i).padStart(3, '0')
const requestId = (i) => 'perf-request-key-' + String(i).padStart(17, '0')

test('B14: 100 distinct users have distinct advisory lock IDs; no global economy lock', async () => {
  const pg = mockPg()
  const store = createVerifiedEconomyStore({ db: pg.db, itemIds: ['stone'] })
  for (let i = 0; i < 100; i++) {
    const result = await store.startGather({ actor: id(i), requestId: requestId(i), spotId: 'garden' })
    assert.equal(result.ok, true)
  }
  assert.equal(pg.locks.length, 100)
  assert.equal(new Set(pg.locks.map(([ns, k]) => `${ns}:${k}`)).size, 100)
  assert.ok(pg.queries.some((q) => q.includes('FOR UPDATE')))
  assert.equal(pg.queries.filter((q) => q === 'BEGIN').length, 100)
  const before = pg.queries.length
  await store.wallet(id(0))
  await store.marketplace(id(1))
  const subsequent = pg.queries.slice(before)
  assert.equal(subsequent.filter((q) => q === 'BEGIN').length, 0)
  assert.equal(subsequent.filter((q) => q.startsWith('SELECT pg_advisory')).length, 0)
  assert.ok(subsequent.every((q) => q === 'SELECT data FROM saves WHERE id=$1'))
})

test('B14: PostgreSQL deadlock abort retries the entire request without duplicate payout', async () => {
  const pg = mockPg()
  const store = createVerifiedEconomyStore({ db: pg.db, itemIds: ['stone'] })
  pg.injectDeadlock()
  const result = await store.startGather({ actor: id(0), requestId: requestId(0), spotId: 'garden' })
  assert.equal(result.ok, true)
  assert.equal(pg.rollbacks, 1)
  assert.equal(pg.commits, 1)
  const replay = await store.startGather({ actor: id(0), requestId: requestId(0), spotId: 'garden' })
  assert.equal(replay.replay, true)
})

test('B14: auth session on PostgreSQL loads only scalar fields, without game-save JSON', async () => {
  const queries = []
  const db = {
    async query(sql, args = []) {
      queries.push(sql)
      if (sql.startsWith('select data from saves')) return { rows: [{ data: { value: 'unit-test-secret' } }] }
      if (sql.includes("data->>'sessionVersion'")) return { rows: [{ id: 'someone123', version: '8', reset: 'false' }] }
      throw new Error('unexpected auth query: ' + sql)
    },
  }
  const accounts = await createAccountStore({ db })
  assert.deepEqual(await accounts.session('someone123'), { id: 'someone123', sessionVersion: 8, mustReset: false })
  assert.equal(queries.length, 2)
  assert.match(queries[1], /data->>'sessionVersion'/)
  assert.doesNotMatch(queries[1], /SELECT\s+data\s+FROM\s+saves/i)
})
