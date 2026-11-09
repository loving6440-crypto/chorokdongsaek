import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'
import { GARDEN_GROW_MS, GARDEN_CROPS, SEED_PRICE } from '../src/game/garden.js'
const actor = 'gardenLegacyAccount'
const key = (n) => `b12-garden-operation-${String(n).padStart(14, '0')}`
const code = (code) => (e) => { assert.equal(e.code, code); return true }
const setup = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b12-garden-'))
  const file = path.join(dir, 'ledger.json')
  const time = { value: 1800000000000 }
  const items = [...GARDEN_CROPS.map((c) => c.id), ...GARDEN_CROPS.map((c) => c.seedId), 'wheat-seed', 'barley-seed', 'fine-woodchip', 'snake-berry']
  const create = () => createVerifiedEconomyStore({ file, itemIds: items, now: () => time.value, rng: () => 0.7 })
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return { ledger: create(), create, time }
}
async function fund(ledger, time) {
  for (let i = 0; i < SEED_PRICE; i++) {
    await ledger.startGather({ actor, requestId: key(i * 3 + 1), spotId: 'garden' })
    time.value += 20 * 60_000
    await ledger.claimGather({ actor, requestId: key(i * 3 + 2) })
    await ledger.npcSell({ actor, requestId: key(i * 3 + 3), item: 'fine-woodchip', qty: 1 })
  }
}
test('B12: 무료 재화 생성 없이 서버 채집→NPC매입→씨앗 구매→재배→수확', async (t) => {
  const { ledger, time } = setup(t)
  await assert.rejects(ledger.buySeed({ actor, requestId: key(20), seedId: 'seed-carrot', qty: 1, money: 1000 }), code('insufficient-money'))
  await fund(ledger, time)
  assert.equal((await ledger.wallet(actor)).money, 9)
  const bought = await ledger.buySeed({ actor, requestId: key(21), seedId: 'seed-carrot', qty: 1, price: 0 })
  assert.deepEqual({ seedId: bought.seedId, total: bought.total }, { seedId: 'seed-carrot', total: 3 })
  assert.equal((await ledger.buySeed({ actor, requestId: key(21), seedId: 'seed-carrot', qty: 1 })).replay, true)
  const planted = await ledger.plantSeed({ actor, requestId: key(22), slot: 0, seedId: 'seed-carrot', plantedAt: 0 })
  assert.equal(planted.readyAt, time.value + GARDEN_GROW_MS)
  await assert.rejects(ledger.plantSeed({ actor, requestId: key(23), slot: 0, seedId: 'seed-carrot' }), code('plot-occupied'))
  await assert.rejects(ledger.harvestSeed({ actor, requestId: key(24), slot: 0, cropId: 'carrot', readyAt: 0 }), code('garden-not-ready'))
  time.value += GARDEN_GROW_MS - 1
  await assert.rejects(ledger.harvestSeed({ actor, requestId: key(25), slot: 0 }), code('garden-not-ready'))
  time.value += 1
  const earned = await ledger.harvestSeed({ actor, requestId: key(26), slot: 0, item: 'carrot', qty: 999 })
  assert.equal(earned.qty, 1)
  assert.equal((await ledger.harvestSeed({ actor, requestId: key(26), slot: 0 })).replay, true)
  await assert.rejects(ledger.harvestSeed({ actor, requestId: key(27), slot: 0 }), code('plot-empty'))
  const wallet = await ledger.wallet(actor)
  assert.equal(wallet.inventory.carrot, 1)
  assert.equal(wallet.money, 6)
  assert.deepEqual(wallet.gardenPlots, [null, null, null, null, null])
})
test('B12: 씨앗 구매/심기는 동시 요청에도 한 번만 성공하고 재시작 후 밭이 유지된다', async (t) => {
  const { ledger, create, time } = setup(t)
  await fund(ledger, time)
  await ledger.buySeed({ actor, requestId: key(30), seedId: 'seed-soybean', qty: 1 })
  const attempts = await Promise.allSettled([
    ledger.plantSeed({ actor, requestId: key(31), seedId: 'seed-soybean', slot: 1 }),
    ledger.plantSeed({ actor, requestId: key(32), seedId: 'seed-soybean', slot: 2 }),
  ])
  assert.equal(attempts.filter((x) => x.status === 'fulfilled').length, 1)
  const reloaded = create()
  assert.equal((await reloaded.wallet(actor)).gardenPlots.filter(Boolean).length, 1)
  time.value += GARDEN_GROW_MS
  const occupied = (await reloaded.wallet(actor)).gardenPlots.findIndex(Boolean)
  const r = await reloaded.harvestSeed({ actor, requestId: key(33), slot: occupied })
  assert.equal(r.item, 'soybean')
  assert.equal((await reloaded.wallet(actor)).inventory.soybean, 1)
})
test('B12: 임의 보상/존재하지 않는 씨앗·슬롯/판매되지 않는 종자 차단', async (t) => {
  const { ledger, time } = setup(t)
  await fund(ledger, time)
  assert.throws(() => ledger.buySeed({ actor, requestId: key(40), seedId: 'golden-coin', qty: 1 }), code('unknown-seed'))
  assert.throws(() => ledger.plantSeed({ actor, requestId: key(41), seedId: 'wheat-seed', slot: 0 }), code('unknown-seed'))
  assert.throws(() => ledger.harvestSeed({ actor, requestId: key(42), slot: -1 }), code('bad-slot'))
  await ledger.buySeed({ actor, requestId: key(43), seedId: 'wheat-seed', qty: 1 })
  assert.equal((await ledger.wallet(actor)).inventory['wheat-seed'], 1)
  const noItem = await ledger.wallet(actor)
  assert.equal(noItem.inventory['golden-coin'], undefined)
})
