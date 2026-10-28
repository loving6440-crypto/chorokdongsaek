// 소지품은 저장 시 아이템별 총량을 유지한다. 화면에서는 재료 99 / 기타 9개씩
// 독립된 묶음으로 보여 주며, 같은 아이템의 마지막 묶음부터 채운다.
import { itemOf } from './items.js'

export const INVENTORY_SLOTS = 30
export const MATERIAL_STACK = 99
export const PRODUCT_STACK = 9
export const maxStack = (id) => itemOf(id)?.tags?.includes('재료') ? MATERIAL_STACK : PRODUCT_STACK
export const countSlots = (inventory = {}) => Object.entries(inventory ?? {}).reduce((total, [id, quantity]) =>
  total + (Number.isFinite(quantity) && quantity > 0 ? Math.ceil(quantity / maxStack(id)) : 0), 0)

export function inventoryStacks(inventory = {}) {
  return Object.entries(inventory ?? {}).flatMap(([id, quantity]) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !itemOf(id)) return []
    const limit = maxStack(id)
    return Array.from({ length: Math.ceil(quantity / limit) }, (_, index) => ({
      id, index, quantity: Math.min(limit, quantity - index * limit),
    }))
  })
}

export function capacityFor(inventory = {}, id) {
  if (!itemOf(id)) return 0
  const current = Math.max(0, Number(inventory?.[id]) || 0)
  const limit = maxStack(id)
  const unusedInLastStack = current > 0 ? Math.ceil(current / limit) * limit - current : 0
  return Math.max(0, unusedInLastStack + Math.max(0, INVENTORY_SLOTS - countSlots(inventory)) * limit)
}
export const canAddInventory = (inventory, additions = {}) => {
  const next = { ...(inventory ?? {}) }
  for (const [id, amount] of Object.entries(additions)) {
    if (!itemOf(id) || !Number.isSafeInteger(amount) || amount < 0) return false
    next[id] = (next[id] || 0) + amount
  }
  return countSlots(next) <= INVENTORY_SLOTS
}

/** 기존 소지품(이전 버전에서 30칸을 넘게 보관한 경우 포함)은 절대 삭제하지 않는다.
 * 이번 상태 변경에서 새로 생긴 물품만 한도에 맞춰 받고, 나머지는 수령 대기로 보낸다.
 * pendingInventory도 캐릭터 저장 데이터의 일부이므로 나중에 수령할 수 있다. */
export function limitNewGains(previous, next) {
  if (!previous || !next || previous === next || next.inventory === previous.inventory) return next
  const before = previous.inventory ?? {}
  const after = next.inventory ?? {}
  const gains = Object.entries(after).filter(([id, amount]) => itemOf(id) && amount > (before[id] || 0))
  if (!gains.length || countSlots(after) <= INVENTORY_SLOTS) return next
  const inventory = { ...after }
  const pending = { ...(next.pendingInventory ?? {}) }
  // 기존부터 있었던 수량과 이번에 획득하지 않은 변화는 그대로 유지한다.
  for (const [id] of gains) inventory[id] = before[id] || 0
  for (const [id, amount] of gains) {
    const gained = amount - (before[id] || 0)
    const accepted = Math.min(gained, capacityFor(inventory, id))
    inventory[id] = (inventory[id] || 0) + accepted
    if (!inventory[id]) delete inventory[id]
    if (gained > accepted) pending[id] = (pending[id] || 0) + gained - accepted
  }
  return { ...next, inventory, pendingInventory: pending }
}

export function claimPending(player, id, requested) {
  const available = player.pendingInventory?.[id] ?? 0
  if (!itemOf(id) || !Number.isSafeInteger(requested) || requested < 1 || requested > available) return { error: '수령할 수량을 확인해 주세요.' }
  if (!canAddInventory(player.inventory, { [id]: requested })) return { error: '소지품이 가득 찼다. 빈 칸을 만든 뒤 수령해 주세요.' }
  const pendingInventory = { ...(player.pendingInventory ?? {}) }
  pendingInventory[id] -= requested
  if (!pendingInventory[id]) delete pendingInventory[id]
  return { player: { ...player, pendingInventory, inventory: { ...(player.inventory ?? {}), [id]: (player.inventory?.[id] || 0) + requested } } }
}
