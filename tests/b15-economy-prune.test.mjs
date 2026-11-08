import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'

test('B15 검증 장부: 30일 지난 멱등 기록만 지우고 지갑·장터·최근 기록은 남긴다', async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15prune-'))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  const file = path.join(tmp, 'economy.json')
  const day = 86_400_000
  writeFileSync(file, JSON.stringify({
    'verified-economy:v1:wallet:pruneUser': { money: 5, inventory: {}, version: 1 },
    'verified-economy:v1:market': { listings: [] },
    'verified-economy:v1:op:pruneUser:old-request-0000001': { kind: 'claim', fingerprint: 'x', result: {}, at: Date.now() - 40 * day },
    'verified-economy:v1:op:pruneUser:new-request-0000002': { kind: 'claim', fingerprint: 'y', result: {}, at: Date.now() - 2 * day },
  }))
  const store = createVerifiedEconomyStore({ file, itemIds: ['stone'] })
  assert.equal(await store.pruneOperations(30 * day), 1)
  const rows = JSON.parse(readFileSync(file, 'utf8'))
  assert.ok(rows['verified-economy:v1:wallet:pruneUser'])
  assert.ok(rows['verified-economy:v1:market'])
  assert.ok(!rows['verified-economy:v1:op:pruneUser:old-request-0000001'])
  assert.ok(rows['verified-economy:v1:op:pruneUser:new-request-0000002'])
  assert.equal((await store.wallet('pruneUser')).money, 5)
  await assert.rejects(() => store.pruneOperations(1000)) // 하루보다 짧은 보관 기간은 거부
})

test('B15 검증 장부(PostgreSQL): 정리는 op 접두사와 보관 기간을 매개변수로 한 DELETE 한 번', async () => {
  const calls = []
  const db = { async query(sql, params) { calls.push({ sql, params }); return { rows: [], rowCount: 3 } }, async connect() { throw new Error('unused') } }
  const store = createVerifiedEconomyStore({ db, itemIds: ['stone'] })
  assert.equal(await store.pruneOperations(30 * 86_400_000), 3)
  assert.equal(calls.length, 1)
  assert.match(calls[0].sql, /^DELETE FROM saves WHERE id LIKE \$1 AND updated_at < now\(\)/)
  assert.deepEqual(calls[0].params, ['verified-economy:v1:op:%', 30 * 86400])
})
