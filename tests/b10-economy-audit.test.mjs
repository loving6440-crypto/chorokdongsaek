import test from 'node:test'
import assert from 'node:assert/strict'
import { auditLegacyEconomy } from '../server/economyAudit.js'

test('B10: 옛 경제 기록의 불일치를 찾되 승인이나 이전을 자동 수행하지 않는다', () => {
  const original = { accounts: [
    { id: 'traderAlpha', save: { player: { money: 123, inventory: { stone: 3, fake: 2 } } } },
    { id: 'traderBravo', save: { player: { money: -20, inventory: { stone: -3 } } } },
  ], snapshot: { market: {
    listings: [
      { id: 'm1', seller: 'traderAlpha', item: 'stone', qty: 2, price: 10 },
      { id: 'm1', seller: 'missingSeller', item: 'stone', qty: 3, price: 10 },
    ], proceeds: { traderAlpha: 50, missingSeller: 10 },
  } }, itemIds: ['stone'] }
  const before = JSON.stringify(original)
  const r = auditLegacyEconomy(original)
  assert.equal(r.safeToAutoMigrate, false)
  assert.equal(r.counts.accounts, 2)
  assert.equal(r.counts.listings, 2)
  assert.equal(r.counts.unclaimedProceeds, 60)
  for (const issue of ['unknown-item', 'invalid-player-money', 'invalid-item-quantity', 'duplicate-listing-id', 'unknown-listing-seller', 'unknown-proceeds-owner']) {
    assert.ok(r.issues.some((i) => i.code === issue), issue)
  }
  assert.equal(JSON.stringify(original), before, 'audit must not mutate source records')
})

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('B10: 이전 감사 CLI는 로컬 원본 파일을 변경하지 않는다', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chorok-audit-cli-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const accFile = path.join(dir, 'accounts.json')
  const snapshotFile = path.join(dir, 'data.json')
  const accText = JSON.stringify({ accounts: { traderAlpha: { id: 'traderAlpha', save: { player: { money: 30, inventory: { stone: 1 } } } } } })
  const snapText = JSON.stringify({ market: { listings: [], proceeds: {} } })
  fs.writeFileSync(accFile, accText)
  fs.writeFileSync(snapshotFile, snapText)
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const r = spawnSync(process.execPath, ['scripts/economy-audit.mjs'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: '', CHOROK_ACCOUNTS: accFile, CHOROK_DATA: snapshotFile },
  })
  assert.equal(r.status, 0, r.stderr)
  const report = JSON.parse(r.stdout)
  assert.equal(report.safeToAutoMigrate, false)
  assert.equal(report.counts.accounts, 1)
  assert.equal(report.counts.totalPlayerMoney, 30)
  assert.equal(fs.readFileSync(accFile, 'utf8'), accText)
  assert.equal(fs.readFileSync(snapshotFile, 'utf8'), snapText)
})
