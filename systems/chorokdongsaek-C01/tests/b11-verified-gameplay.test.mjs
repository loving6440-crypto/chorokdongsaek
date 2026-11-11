import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createVerifiedEconomyStore, NPC_BUY_PRICES } from '../server/verifiedEconomy.js'

const ACTOR = 'verifiedGardener'
const req = (n) => `gameplay-action-${String(n).padStart(16, '0')}`
const asCode = (code) => (e) => { assert.equal(e.code, code); return true }
const setup = (t, rng = () => 0.1) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chorok-b11-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'ledger.json')
  const time = { value: 1770000000000 }
  const create = () => createVerifiedEconomyStore({ file, itemIds: ['snake-berry', 'mugwort', 'clover-leaf', 'clover', 'fine-woodchip', 'curse-doll', 'stone'], now: () => time.value, rng })
  return { ledger: create(), file, time, create }
}

test('B11: 서버 채집은 조기 수령/중복 시작을 거절하며 20분 뒤 한 번만 지급', async (t) => {
  const { ledger, time } = setup(t)
  const start = await ledger.startGather({ actor: ACTOR, requestId: req(1), spotId: 'garden' })
  assert.equal(start.gathering.readyAt - start.gathering.startedAt, 20 * 60_000)
  assert.equal((await ledger.startGather({ actor: ACTOR, requestId: req(1), spotId: 'garden' })).replay, true)
  await assert.rejects(ledger.startGather({ actor: ACTOR, requestId: req(2), spotId: 'garden' }), asCode('gather-already-active'))
  await assert.rejects(ledger.claimGather({ actor: ACTOR, requestId: req(3) }), asCode('gather-not-ready'))
  assert.deepEqual((await ledger.wallet(ACTOR)).inventory, {})
  time.value += 20 * 60_000 - 1
  await assert.rejects(ledger.claimGather({ actor: ACTOR, requestId: req(4) }), asCode('gather-not-ready'))
  time.value += 1
  const reward = await ledger.claimGather({ actor: ACTOR, requestId: req(5) })
  assert.deepEqual(reward.items, { 'snake-berry': 1, mugwort: 1, 'clover-leaf': 1 })
  assert.equal((await ledger.claimGather({ actor: ACTOR, requestId: req(5) })).replay, true)
  await assert.rejects(ledger.claimGather({ actor: ACTOR, requestId: req(6) }), asCode('gather-not-active'))
  assert.deepEqual((await ledger.wallet(ACTOR)).inventory, reward.items)
})

test('B11: 채집 대기는 재시작 후에도 유지되며 보상 금액을 요청에서 받아들이지 않는다', async (t) => {
  const { ledger, create, time } = setup(t, () => 0.7)
  assert.throws(() => ledger.startGather({ actor: ACTOR, requestId: req(1), spotId: 'unknown', readyAt: 0 }), asCode('unknown-gather-site'))
  await ledger.startGather({ actor: ACTOR, requestId: req(2), spotId: 'garden', startedAt: 0, readyAt: 0 })
  const afterRestart = create()
  await assert.rejects(afterRestart.claimGather({ actor: ACTOR, requestId: req(3), readyAt: 0, items: { stone: 99 } }), asCode('gather-not-ready'))
  time.value += 20 * 60_000
  const claim = await afterRestart.claimGather({ actor: ACTOR, requestId: req(4) })
  assert.deepEqual(claim.items, { 'fine-woodchip': 1 })
  assert.equal((await afterRestart.wallet(ACTOR)).inventory.stone, undefined)
})

test('B11: 5회 채집으로 획득한 재료를 서버 제작법으로 1회 제작 가능', async (t) => {
  const { ledger, time } = setup(t, () => 0.7)
  for (let i = 0; i < 5; i++) {
    await ledger.startGather({ actor: ACTOR, requestId: req(i * 2 + 1), spotId: 'garden' })
    time.value += 20 * 60_000
    await ledger.claimGather({ actor: ACTOR, requestId: req(i * 2 + 2) })
  }
  assert.equal((await ledger.wallet(ACTOR)).inventory['fine-woodchip'], 5)
  const crafted = await ledger.craft({ actor: ACTOR, requestId: req(11), recipeId: 'r-curse-doll', qty: 1 })
  assert.equal(crafted.result, 'curse-doll')
  assert.deepEqual((await ledger.wallet(ACTOR)).inventory, { 'curse-doll': 1 })
  assert.equal((await ledger.craft({ actor: ACTOR, requestId: req(11), recipeId: 'r-curse-doll', qty: 1 })).replay, true)
  await assert.rejects(ledger.craft({ actor: ACTOR, requestId: req(12), recipeId: 'r-curse-doll', qty: 1 }), asCode('insufficient-items'))
  assert.throws(() => ledger.craft({ actor: ACTOR, requestId: req(13), recipeId: 'hacker-recipe', qty: 99 }), asCode('unknown-recipe'))
})

test('B11: 교내 매입은 서버 고정가와 실제 재고만 사용하고 중복 대금이 지급되지 않는다', async (t) => {
  const { ledger, time } = setup(t)
  assert.equal(NPC_BUY_PRICES.mugwort, 2)
  await ledger.startGather({ actor: ACTOR, requestId: req(1), spotId: 'garden' })
  time.value += 20 * 60_000
  await ledger.claimGather({ actor: ACTOR, requestId: req(2) })
  assert.throws(() => ledger.npcSell({ actor: ACTOR, requestId: req(3), item: 'stone', qty: 1 }), asCode('npc-not-buying'))
  await assert.rejects(ledger.npcSell({ actor: ACTOR, requestId: req(4), item: 'mugwort', qty: 2, price: 99999999 }), asCode('insufficient-items'))
  const sold = await ledger.npcSell({ actor: ACTOR, requestId: req(5), item: 'mugwort', qty: 1, price: 99999999 })
  assert.equal(sold.money, 2)
  assert.equal((await ledger.npcSell({ actor: ACTOR, requestId: req(5), item: 'mugwort', qty: 1, price: 99999999 })).replay, true)
  const wallet = await ledger.wallet(ACTOR)
  assert.equal(wallet.money, 2)
  assert.equal(wallet.inventory.mugwort, undefined)
  await assert.rejects(ledger.npcSell({ actor: ACTOR, requestId: req(6), item: 'mugwort', qty: 1 }), asCode('insufficient-items'))
})

test('B11: 채집→매입→장터·선물 전체 경로에서 기존 게임 저장의 금액이 유입되지 않는다', async (t) => {
  const { ledger, time } = setup(t)
  await ledger.startGather({ actor: ACTOR, requestId: req(1), spotId: 'garden' })
  time.value += 20 * 60_000
  await ledger.claimGather({ actor: ACTOR, requestId: req(2) })
  await ledger.npcSell({ actor: ACTOR, requestId: req(3), item: 'snake-berry', qty: 1 })
  assert.equal((await ledger.wallet(ACTOR)).money, 1)
  const listing = await ledger.list({ actor: ACTOR, requestId: req(4), item: 'clover-leaf', qty: 1, price: 1 })
  assert.equal((await ledger.marketplace(ACTOR))[0].id, listing.id)
  const cancel = await ledger.cancel({ actor: ACTOR, requestId: req(5), listing: listing.id })
  assert.equal(cancel.item, 'clover-leaf')
  const gift = await ledger.gift({ actor: ACTOR, requestId: req(6), to: 'verifiedBravoo', items: { 'clover-leaf': 1 } })
  assert.ok(gift.giftId.startsWith('g-'))
  const claimed = await ledger.claimGift({ actor: 'verifiedBravoo', requestId: req(7), giftId: gift.giftId })
  assert.deepEqual(claimed.items, { 'clover-leaf': 1 })
  assert.equal((await ledger.wallet('verifiedBravoo')).inventory['clover-leaf'], 1)
})

test('B11: 가입 정책 강화 전 기존 한 글자 계정도 검증 장부를 사용할 수 있다', async (t) => {
  const { ledger } = setup(t)
  assert.deepEqual((await ledger.wallet('김')).inventory, {})
  await ledger.startGather({ actor: '김', requestId: req(99), spotId: 'garden' })
  assert.equal((await ledger.wallet('김')).gathering.spotId, 'garden')
})
