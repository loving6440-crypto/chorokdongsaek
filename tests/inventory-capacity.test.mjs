import test from 'node:test'
import assert from 'node:assert/strict'
import { INVENTORY_SLOTS, maxStack, countSlots, inventoryStacks, capacityFor, canAddInventory, limitNewGains, claimPending } from '../src/game/inventoryCapacity.js'

test('30칸 기본 한도 및 재료/완성품 묶음 크기', () => {
  assert.equal(INVENTORY_SLOTS, 30)
  assert.equal(maxStack('mugwort'), 99)
  assert.equal(maxStack('picnic'), 9)
  assert.deepEqual(inventoryStacks({ picnic: 10 }).map(x => x.quantity), [9, 1])
  assert.deepEqual(inventoryStacks({ mugwort: 100 }).map(x => x.quantity), [99, 1])
  assert.equal(countSlots({ picnic: 10, mugwort: 100 }), 4)
})

test('동일 종류의 남은 묶음 자리 우선 채우기', () => {
  const inventory = { picnic: 8, mugwort: 98 }
  assert.equal(capacityFor(inventory, 'picnic'), 1 + 28 * 9)
  assert.equal(capacityFor(inventory, 'mugwort'), 1 + 28 * 99)
  assert.equal(countSlots({ picnic: 9, mugwort: 99 }), 2)
})

test('30칸 소지품에 다른 물품 추가를 거절하고 기존 묶음 채우기는 허용', () => {
  const full = { picnic: 9 * 30 }
  assert.equal(countSlots(full), 30)
  assert.equal(capacityFor(full, 'chocolate'), 0)
  assert.equal(canAddInventory(full, { chocolate: 1 }), false)
  assert.equal(canAddInventory(full, { picnic: 1 }), false)
  const almost = { picnic: 9 * 29 + 8 }
  assert.equal(capacityFor(almost, 'picnic'), 1)
  assert.equal(canAddInventory(almost, { picnic: 1 }), true)
  assert.equal(canAddInventory(almost, { picnic: 2 }), false)
})

test('보상/선물 초과분은 수령 대기로 이동하고 기존 소지품은 보존', () => {
  const previous = { inventory: { picnic: 9 * 29 } }
  const candidate = { ...previous, inventory: { picnic: 9 * 29, chocolate: 10 } }
  const result = limitNewGains(previous, candidate)
  assert.equal(result.inventory.chocolate, 9)
  assert.equal(result.pendingInventory.chocolate, 1)
  assert.equal(countSlots(result.inventory), 30)
  assert.equal(previous.inventory.chocolate, undefined)
})

test('기존 30칸 초과 데이터는 강제로 삭제하지 않고 새로 얻은 것만 보류', () => {
  const old = { inventory: { picnic: 300 } }
  const changed = limitNewGains(old, { ...old, inventory: { picnic: 300, chocolate: 2 } })
  assert.equal(changed.inventory.picnic, 300)
  assert.equal(changed.inventory.chocolate, undefined)
  assert.equal(changed.pendingInventory.chocolate, 2)
})

test('수령 대기 물품은 빈 칸 생성 후 수령할 수 있으며 수량 보존', () => {
  const p = { inventory: { picnic: 270 }, pendingInventory: { chocolate: 10 } }
  assert.match(claimPending(p, 'chocolate', 1).error, /가득/)
  const freed = { ...p, inventory: { picnic: 261 } }
  const received = claimPending(freed, 'chocolate', 9)
  assert.equal(received.player.inventory.chocolate, 9)
  assert.equal(received.player.pendingInventory.chocolate, 1)
  assert.equal(countSlots(received.player.inventory), 30)
})

test('보관함 출고 및 매점에서 사용하는 사전검증: 가득 찬 상태는 추가 불가', () => {
  const full = { picnic: 270 }
  assert.equal(canAddInventory(full, { chocolate: 1 }), false)
  assert.equal(canAddInventory({ picnic: 261 }, { chocolate: 1 }), true)
})
