import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'
import { HUNT_SITES } from '../src/game/huntSites.js'
import { VERIFIED_EXPEDITION_COST, VERIFIED_EXPEDITION_REGEN_MS } from '../src/game/verifiedExpeditionRules.js'

const actor = 'verifiedExplorerAlpha'
const key = (n) => `b13-expedition-${String(n).padStart(18, '0')}`
const code = (c) => (e) => { assert.equal(e.code, c); return true }
const setup = (t, rng = () => 0.5) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b13-expedition-'))
  const file = path.join(dir, 'ledger.json')
  const clock = { value: 1800000000000 }
  const create = () => createVerifiedEconomyStore({ file, itemIds: ['mushroom', 'fine-woodchip', 'stone', 'pebble', 'snake-berry', 'poison-mushroom', 'snake-skin', 'wild-raspberry'], now: () => clock.value, rng })
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return { ledger: create(), clock, create, file }
}
const moveRoute = async (ledger, positions, start = 20) => {
  for (let i = 0; i < positions.length; i++) await ledger.expeditionMove({ actor, requestId: key(start + i), position: positions[i] })
}

test('B13: 서버 지도 A10→I10 이동과 채집을 검증하고 장부에 한 번만 지급한다', async (t) => {
  const { ledger, create, file } = setup(t)
  const entered = await ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'left-trail-1', money: 100000000, stats: { insight: 100000 } })
  assert.equal(entered.ok, true)
  assert.equal(entered.energy, 100 - VERIFIED_EXPEDITION_COST)
  assert.equal(entered.session.status, 'active')
  const replay = await ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'left-trail-1' })
  assert.equal(replay.replay, true)
  assert.equal((await ledger.wallet(actor)).expeditionEnergy, 90)
  await assert.rejects(ledger.expeditionEnter({ actor, requestId: key(2), siteId: 'left-trail-1' }), code('expedition-already-active'))
  await assert.rejects(ledger.expeditionMove({ actor, requestId: key(3), position: { x: 9, y: 9 } }), code('expedition-invalid-move'))
  await assert.rejects(ledger.expeditionAttempt({ actor, requestId: key(4), nodeId: 'I10', stats: { insight: 999 } }), code('expedition-invalid-attempt'))
  // A10 → A9 → B9 → ... → I9 → I10. C10의 장애물을 경유하지 않는다.
  const route = [{ x: 0, y: 8 }, ...Array.from({ length: 8 }, (_, n) => ({ x: n + 1, y: 8 })), { x: 8, y: 9 }]
  await moveRoute(ledger, route)
  const attempt = await ledger.expeditionAttempt({ actor, requestId: key(40), nodeId: 'I10', stats: { insight: 999999 }, items: { mushroom: 1000000 }, success: true })
  assert.equal(attempt.success, true)
  assert.equal(attempt.items.mushroom, 2)
  assert.equal((await ledger.expeditionAttempt({ actor, requestId: key(40), nodeId: 'I10' })).replay, true)
  assert.equal((await create().wallet(actor)).inventory.mushroom, 2)
  const after = await ledger.wallet(actor)
  const storedOp = JSON.parse(fs.readFileSync(file, 'utf8'))[`verified-economy:v1:op:${actor}:${key(40)}`]
  assert.equal(Object.hasOwn(storedOp.result, 'session'), false, '멱등 기록에 10×10 지도를 중복 저장하지 않음')
  assert.equal(after.expedition.turn, route.length + 1)
  assert.equal(after.money, 0)
  assert.ok(after.expedition.rewards.mushroom === 2)
})

test('B13: 종료/재시작/에너지 서버시각/중복 요청 검증', async (t) => {
  const { ledger, clock, create } = setup(t)
  assert.equal(HUNT_SITES['left-trail-1'].id, 'left-trail-1')
  assert.throws(() => ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'invalid' }), code('unknown-expedition-site'))
  await assert.rejects(ledger.expeditionLeave({ actor, requestId: key(2) }), code('expedition-not-active'))
  await ledger.expeditionEnter({ actor, requestId: key(3), siteId: 'left-trail-1' })
  assert.equal((await create().wallet(actor)).expedition.status, 'active')
  const result = await create().expeditionLeave({ actor, requestId: key(4) })
  assert.equal(result.session.status, 'finished')
  assert.equal((await create().expeditionLeave({ actor, requestId: key(4) })).replay, true)
  const resumed = create()
  await assert.rejects(resumed.expeditionMove({ actor, requestId: key(5), position: { x: 0, y: 8 } }), code('expedition-not-active'))
  // 10번 입장 시 입장 비용 100. 처음 수확한 적이 없어도 11번째 입장 불가.
  for (let i = 0; i < 9; i++) {
    await resumed.expeditionEnter({ actor, requestId: key(100 + i * 2), siteId: 'left-trail-1' })
    await resumed.expeditionLeave({ actor, requestId: key(101 + i * 2) })
  }
  assert.equal((await resumed.wallet(actor)).expeditionEnergy, 0)
  await assert.rejects(resumed.expeditionEnter({ actor, requestId: key(200), siteId: 'left-trail-1', mp: 9999 }), code('expedition-low-energy'))
  clock.value += 10 * VERIFIED_EXPEDITION_REGEN_MS
  assert.equal((await create().wallet(actor)).expeditionEnergy, 10)
  assert.equal((await create().expeditionEnter({ actor, requestId: key(201), siteId: 'left-trail-1' })).energy, 0)
})

test('B13: 동시 이동에서는 서버가 이전 위치를 확정한 후 다음 행동을 판정', async (t) => {
  const { ledger } = setup(t)
  await ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'left-trail-1' })
  const attempts = await Promise.allSettled([
    ledger.expeditionMove({ actor, requestId: key(2), position: { x: 0, y: 8 } }),
    ledger.expeditionMove({ actor, requestId: key(3), position: { x: 0, y: 8 } }),
  ])
  assert.equal(attempts.filter((x) => x.status === 'fulfilled').length, 1)
  assert.equal((await ledger.wallet(actor)).expedition.turn, 1)
  await assert.rejects(ledger.expeditionMove({ actor, requestId: key(4), position: { x: -1, y: 8 } }), code('expedition-invalid-move'))
  await assert.rejects(ledger.expeditionAttempt({ actor, requestId: key(5), nodeId: 'nonexistent' }), code('expedition-invalid-attempt'))
})

test('B13: 서버 요괴 조우는 클라이언트 승리 주장 없이 보상 없는 회피로 종료', async (t) => {
  const { ledger } = setup(t, () => 0.01)
  const entry = await ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'left-trail-1' })
  assert.equal(entry.session.nodes.some((node) => node.kind === 'ghost'), true)
  let avoided = false
  for (let i = 1; i <= 9; i++) {
    const step = await ledger.expeditionMove({ actor, requestId: key(10 + i), position: { x: 0, y: 9 - i }, win: true, rewardSpirit: 999999, items: {'gold-crown': 999999} })
    if (step.ghostAvoided) { avoided = true; break }
  }
  assert.equal(avoided, true)
  const wallet = await ledger.wallet(actor)
  assert.deepEqual(wallet.inventory, {})
  assert.equal(wallet.money, 0)
  assert.equal(wallet.expedition.spiritGained, 0)
  assert.equal(wallet.expedition.encounter, null)
  assert.match(wallet.expedition.log.join(' '), /보상 없이 회피/)
})

test('B13: 개척 획득 아이템은 기존 검증 장터에 예약·구매되며 거래 후 복제 불가', async (t) => {
  const { ledger } = setup(t)
  await ledger.expeditionEnter({ actor, requestId: key(1), siteId: 'left-trail-1' })
  const route = [{ x: 0, y: 8 }, ...Array.from({ length: 8 }, (_, n) => ({ x: n + 1, y: 8 })), { x: 8, y: 9 }]
  await moveRoute(ledger, route)
  await ledger.expeditionAttempt({ actor, requestId: key(50), nodeId: 'I10' })
  const listed = await ledger.list({ actor, requestId: key(51), item: 'mushroom', qty: 2, price: 3 })
  assert.equal(listed.ok, true)
  assert.equal((await ledger.wallet(actor)).inventory.mushroom, undefined)
  await assert.rejects(ledger.list({ actor, requestId: key(52), item: 'mushroom', qty: 2, price: 3 }), code('insufficient-items'))
  const buyer = 'buyerExpeditionTest'
  await ledger.grantTrusted({ target: buyer, sourceKey: key(53), money: 6 })
  const purchase = await ledger.buy({ actor: buyer, requestId: key(54), listing: listed.id })
  assert.equal(purchase.total, 6)
  assert.equal((await ledger.wallet(buyer)).inventory.mushroom, 2)
  assert.equal((await ledger.wallet(actor)).pendingMoney, 6)
})
