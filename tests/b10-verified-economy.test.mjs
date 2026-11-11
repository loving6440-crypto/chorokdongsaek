import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createVerifiedEconomyStore } from '../server/verifiedEconomy.js'

const ALPHA = 'traderAlpha'
const BRAVO = 'traderBravo'
const CHARLIE = 'traderCharlie'
const req = (n) => `request-${String(n).padStart(16, '0')}`
const create = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chorok-ledger-'))
  const file = path.join(dir, 'verified-economy.json')
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const ledger = createVerifiedEconomyStore({ file, itemIds: ['stone', 'picnic', 'ramen'] })
  return { ledger, file }
}
const code = (err, expected) => { assert.equal(err?.code, expected); return true }

test('B10: 신뢰 보상만 입금되며 지출·판매 예약은 서버 잔액에서만 가능', async (t) => {
  const { ledger } = create(t)
  assert.deepEqual((await ledger.wallet(ALPHA)).inventory, {})
  await assert.rejects(ledger.list({ actor: ALPHA, requestId: req(1), item: 'stone', qty: 10, price: 5 }), (e) => code(e, 'insufficient-items'))
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(2), money: 25, items: { stone: 12 } })
  const l = await ledger.list({ actor: ALPHA, requestId: req(3), item: 'stone', qty: 10, price: 5 })
  assert.match(l.id, /^v-/)
  assert.equal((await ledger.wallet(ALPHA)).inventory.stone, 2)
  assert.equal((await ledger.marketplace(BRAVO))[0].mine, false)
  assert.equal((await ledger.marketplace(ALPHA))[0].mine, true)
  await assert.rejects(ledger.buy({ actor: BRAVO, requestId: req(4), listing: l.id }), (e) => code(e, 'insufficient-money'))
  assert.equal((await ledger.marketplace(ALPHA)).length, 1)
})

test('B10: 구매·판매대금·정산은 같은 원자 장부로 반영되며 요청 재시도에 중복 처리되지 않음', async (t) => {
  const { ledger, file } = create(t)
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(10), items: { stone: 10 } })
  await ledger.grantTrusted({ target: BRAVO, sourceKey: req(11), money: 400 })
  const l = await ledger.list({ actor: ALPHA, requestId: req(12), item: 'stone', qty: 10, price: 13 })
  const result = await ledger.buy({ actor: BRAVO, requestId: req(13), listing: l.id })
  assert.equal(result.total, 130)
  const duplicate = await ledger.buy({ actor: BRAVO, requestId: req(13), listing: l.id })
  assert.equal(duplicate.replay, true)
  assert.equal(duplicate.total, 130)
  const buyer = await ledger.wallet(BRAVO)
  const seller = await ledger.wallet(ALPHA)
  assert.equal(buyer.money, 270)
  assert.equal(buyer.inventory.stone, 10)
  assert.equal(seller.pendingMoney, 130)
  assert.equal((await ledger.marketplace(BRAVO)).length, 0)
  const claim = await ledger.claim({ actor: ALPHA, requestId: req(14) })
  assert.equal(claim.amount, 130)
  assert.equal((await ledger.claim({ actor: ALPHA, requestId: req(14) })).replay, true)
  assert.equal((await ledger.claim({ actor: ALPHA, requestId: req(15) })).amount, 0)
  assert.equal((await ledger.wallet(ALPHA)).money, 130)
  // 로컬 파일 재시작에서도 모든 데이터와 중복 요청 영구 기록이 보존된다.
  const restarted = createVerifiedEconomyStore({ file, itemIds: ['stone', 'picnic', 'ramen'] })
  assert.equal((await restarted.wallet(BRAVO)).money, 270)
  assert.equal((await restarted.claim({ actor: ALPHA, requestId: req(14) })).replay, true)
})

test('B10: 경쟁 구매는 한 사람만 승리하고 나머지의 돈이 사라지지 않음', async (t) => {
  const { ledger } = create(t)
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(20), items: { stone: 1 } })
  await ledger.grantTrusted({ target: BRAVO, sourceKey: req(21), money: 100 })
  await ledger.grantTrusted({ target: CHARLIE, sourceKey: req(22), money: 100 })
  const l = await ledger.list({ actor: ALPHA, requestId: req(23), item: 'stone', qty: 1, price: 40 })
  const outcomes = await Promise.allSettled([
    ledger.buy({ actor: BRAVO, requestId: req(24), listing: l.id }),
    ledger.buy({ actor: CHARLIE, requestId: req(25), listing: l.id }),
  ])
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1)
  assert.equal(outcomes.filter((x) => x.status === 'rejected').length, 1)
  const b = await ledger.wallet(BRAVO)
  const c = await ledger.wallet(CHARLIE)
  assert.equal(b.money + c.money, 160)
  assert.equal((b.inventory.stone || 0) + (c.inventory.stone || 0), 1)
  assert.equal((await ledger.wallet(ALPHA)).pendingMoney, 40)
})

test('B10: 멱등키 재사용으로 다른 작업을 실행할 수 없음', async (t) => {
  const { ledger } = create(t)
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(30), items: { stone: 10 } })
  await ledger.list({ actor: ALPHA, requestId: req(31), item: 'stone', qty: 1, price: 1 })
  await assert.rejects(ledger.list({ actor: ALPHA, requestId: req(31), item: 'stone', qty: 9, price: 1 }), (e) => code(e, 'request-id-conflict'))
  assert.equal((await ledger.wallet(ALPHA)).inventory.stone, 9)
  assert.equal((await ledger.marketplace(ALPHA)).length, 1)
  const grant = await ledger.grantTrusted({ target: ALPHA, sourceKey: req(30), items: { stone: 10 } })
  assert.equal(grant.replay, true)
  assert.equal((await ledger.wallet(ALPHA)).inventory.stone, 9)
  await assert.rejects(ledger.grantTrusted({ target: ALPHA, sourceKey: req(30), money: 999 }), (e) => code(e, 'request-id-conflict'))
})

test('B10: 취소는 판매자 본인만 가능하며 반환도 한 번만 실행', async (t) => {
  const { ledger } = create(t)
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(40), items: { ramen: 8 } })
  const l = await ledger.list({ actor: ALPHA, requestId: req(41), item: 'ramen', qty: 4, price: 20 })
  await assert.rejects(ledger.cancel({ actor: BRAVO, requestId: req(42), listing: l.id }), (e) => code(e, 'gone'))
  const refund = await ledger.cancel({ actor: ALPHA, requestId: req(43), listing: l.id })
  assert.equal(refund.qty, 4)
  assert.equal((await ledger.cancel({ actor: ALPHA, requestId: req(43), listing: l.id })).replay, true)
  assert.equal((await ledger.wallet(ALPHA)).inventory.ramen, 8)
})

test('B10: 선물은 우편함에 보관하고 수령 시 한번만 재고에 반영', async (t) => {
  const { ledger } = create(t)
  await ledger.grantTrusted({ target: ALPHA, sourceKey: req(50), items: { picnic: 5 } })
  const send = await ledger.gift({ actor: ALPHA, requestId: req(51), to: BRAVO, items: { picnic: 3 }, note: '반가워' })
  assert.equal(send.ok, true)
  assert.equal((await ledger.wallet(ALPHA)).inventory.picnic, 2)
  assert.equal((await ledger.wallet(BRAVO)).inventory.picnic, undefined)
  assert.equal((await ledger.wallet(BRAVO)).inbox[0].id, send.giftId)
  assert.equal((await ledger.gift({ actor: ALPHA, requestId: req(51), to: BRAVO, items: { picnic: 3 }, note: '반가워' })).replay, true)
  await ledger.claimGift({ actor: BRAVO, requestId: req(52), giftId: send.giftId })
  assert.equal((await ledger.wallet(BRAVO)).inventory.picnic, 3)
  assert.equal((await ledger.claimGift({ actor: BRAVO, requestId: req(52), giftId: send.giftId })).replay, true)
  await assert.rejects(ledger.claimGift({ actor: BRAVO, requestId: req(53), giftId: send.giftId }), (e) => code(e, 'gift-gone'))
})

test('B10: 유효하지 않은 지급, 초과 금액, 알려지지 않은 아이템은 거부', async (t) => {
  const { ledger } = create(t)
  assert.throws(() => ledger.grantTrusted({ target: ALPHA, sourceKey: req(60), money: -10 }), (e) => code(e, 'bad-money'))
  assert.throws(() => ledger.grantTrusted({ target: ALPHA, sourceKey: req(61), items: { fake: 10 } }), (e) => code(e, 'not-tradable'))
  assert.throws(() => ledger.list({ actor: ALPHA, requestId: req(62), item: 'stone', qty: 1, price: 100000 }), (e) => code(e, 'bad-price'))
  assert.throws(() => ledger.claim({ actor: ALPHA, requestId: 'short' }), (e) => code(e, 'request-id-required'))
  assert.equal((await ledger.wallet(ALPHA)).money, 0)
})

test('B10: 손상된 파일 장부는 0으로 재초기화하지 않고 오류를 반환', (t) => {
  const { file } = create(t)
  fs.writeFileSync(file, '{ corrupt ledger')
  assert.throws(() => createVerifiedEconomyStore({ file, itemIds: ['stone'] }), SyntaxError)
})
