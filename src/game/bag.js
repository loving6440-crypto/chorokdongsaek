// v-B.17 가방: 소지품 안에 들고 다니는 보관 공간.
//  - 누구나 하나씩 갖고 시작한다(예전 캐릭터도 불러올 때 한 번 지급). 기숙사 매점에서 50냥에 더 살 수 있다.
//  - 가방 하나에 40칸. 칸 규칙은 소지품과 같다(재료 99개 · 그 밖의 아이템 9개가 한 칸, 넘치면 다음 칸).
//  - 가방은 서로 구별되지 않는 물건이라, 가방 개수 = player.inventory.bag, 가방 속 = player.bags[0..개수-1].
//    물건이 든 가방 수보다 가방 개수를 줄이는 일(버리기·팔기·맡기기·선물)은 막는다 — 가방을 비운 뒤에만 내보낼 수 있다.
//  - 가방 속 물건은 바로 쓸 수 없다. 꺼내서 쓴다. 가방 안에 가방은 넣을 수 없다.
import { itemOf } from './items.js'
import { canAddInventory, maxStack } from './inventoryCapacity.js'

import { BAG_ID, BAG_SLOTS } from './itemsB17.js'
export { BAG_ID, BAG_SLOTS, BAG_PRICE, BAG_ITEM } from './itemsB17.js'

export const bagCount = (player) => Math.max(0, Math.floor(player?.inventory?.[BAG_ID] || 0))
export const bagContents = (player, i) => (player?.bags?.[i] && typeof player.bags[i] === 'object' ? player.bags[i] : {})
export const bagsOf = (player) => Array.from({ length: bagCount(player) }, (_, i) => bagContents(player, i))
export const bagSlotsUsed = (contents = {}) => Object.entries(contents).reduce((n, [id, q]) => n + (q > 0 && itemOf(id) ? Math.ceil(q / maxStack(id)) : 0), 0)
const isEmpty = (contents) => !Object.values(contents ?? {}).some((q) => q > 0)
/** 물건이 든 가방 수 */
export const filledBags = (player) => (player?.bags ?? []).filter((c) => !isEmpty(c)).length

/** 이 가방에 이 물건을 더 넣을 수 있는 최대 개수 */
export function bagRoom(contents, id) {
  if (!itemOf(id) || id === BAG_ID) return 0
  const cur = Math.max(0, contents?.[id] || 0)
  const per = maxStack(id)
  const lastFree = cur > 0 ? Math.ceil(cur / per) * per - cur : 0
  return lastFree + Math.max(0, BAG_SLOTS - bagSlotsUsed(contents)) * per
}

const withBag = (player, i, contents) => {
  const bags = bagsOf(player)
  bags[i] = contents
  return bags
}

/** 넣기. { player } 또는 { error } */
export function putInBag(player, i, id, n) {
  if (!Number.isInteger(i) || i < 0 || i >= bagCount(player)) return { error: '그 가방이 없다.' }
  if (id === BAG_ID) return { error: '가방 안에 가방을 넣을 수는 없다.' }
  if (!itemOf(id) || !Number.isSafeInteger(n) || n < 1) return { error: '넣을 개수를 확인해 주세요.' }
  const have = player.inventory?.[id] || 0
  if (have < n) return { error: '가진 개수가 모자란다.' }
  const cur = bagContents(player, i)
  if (n > bagRoom(cur, id)) return { error: `가방에 칸이 모자란다. (가방 하나에 ${BAG_SLOTS}칸)` }
  const inventory = { ...player.inventory, [id]: have - n }
  if (inventory[id] <= 0) delete inventory[id]
  return { player: { ...player, inventory, bags: withBag(player, i, { ...cur, [id]: (cur[id] || 0) + n }) } }
}

/** 꺼내기. 소지품 칸이 모자라면 꺼내지 않는다. */
export function takeFromBag(player, i, id, n) {
  if (!Number.isInteger(i) || i < 0 || i >= bagCount(player)) return { error: '그 가방이 없다.' }
  const cur = bagContents(player, i)
  const have = cur[id] || 0
  if (!itemOf(id) || !Number.isSafeInteger(n) || n < 1 || n > have) return { error: '꺼낼 개수를 확인해 주세요.' }
  if (!canAddInventory(player.inventory, { [id]: n })) return { error: '소지품 칸이 모자란다. 빈 칸을 만든 뒤 꺼내 주세요.' }
  const box = { ...cur, [id]: have - n }
  if (box[id] <= 0) delete box[id]
  return { player: { ...player, inventory: { ...player.inventory, [id]: (player.inventory?.[id] || 0) + n }, bags: withBag(player, i, box) } }
}

/** 소지품에서 가방을 내보낼 때(버리기 · 팔기 · 맡기기 · 선물): 남는 가방 수가 물건이 든 가방 수보다 적으면 막는다. */
export function bagRemovalError(player, removeCount) {
  if (!(removeCount > 0)) return null
  const left = bagCount(player) - removeCount
  if (left < filledBags(player)) return '물건이 든 가방은 내보낼 수 없다. 가방을 먼저 비워 주세요.'
  return null
}
/** 가방을 내보낸 뒤: 물건이 든 가방을 앞으로 모으고 남은 개수에 맞춘다. */
export function compactBags(player) {
  const count = bagCount(player)
  const filled = (player.bags ?? []).filter((c) => !isEmpty(c))
  const bags = Array.from({ length: count }, (_, i) => filled[i] ?? {})
  return { ...player, bags }
}

/** 처음 한 번 가방 하나를 지급한다(새 캐릭터 · 예전 저장). 버리거나 팔아도 다시 생기지 않는다. */
export function grantStarterBag(player) {
  if (!player || player.bagStarter) return player
  return { ...player, bagStarter: true, inventory: { ...(player.inventory ?? {}), [BAG_ID]: (player.inventory?.[BAG_ID] || 0) + 1 } }
}

/** 마지막 안전망(setPlayer): 어떤 경로든 물건이 든 가방이 사라지게 바뀌면 가방 개수를 되돌린다. */
export function protectBags(previous, next) {
  if (!next?.inventory || next === previous) return next
  const filled = filledBags(next)
  if (bagCount(next) >= filled) return next.bags && next.bags.length > bagCount(next) ? compactBags(next) : next
  return { ...next, inventory: { ...next.inventory, [BAG_ID]: Math.max(filled, bagCount(previous)) } }
}
