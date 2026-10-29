// 물품보관함(본관 3층): 학년마다 하나씩. 자기 학년의 보관함만 쓸 수 있다.
//  - 최대 100칸. 같은 물건은 개수와 상관없이 '한 종류'로 치지만, 한 칸에 담기는 묶음에는 한도가 있다.
//    재료(재료 태그) 99개 · 그 밖의 아이템 9개. 넘으면 나뉘어 여러 칸을 쓴다. (아이템 30개 → 9/9/9/3 = 4칸)
//  - 내용물은 player.lockers[학년] = { 아이템id: 개수 } 에 저장된다.
import { CAT_MATERIAL, itemOf } from './items.js'
import { gradeOf } from './character.js'
import { canAddInventory } from './inventoryCapacity.js'

export const LOCKER_SLOTS = 100
export const STACK_MATERIAL = 99
export const STACK_ITEM = 9
export const LOCKED_TEXT = '다른 학우들의 보관함인 것 같다. 잠겨 있다. 쓸만한 도구가 있으면 열 수 있을지도?'

export const stackMax = (item) => (item?.tags?.includes(CAT_MATERIAL) ? STACK_MATERIAL : STACK_ITEM)
export const slotsFor = (id, n) => (n > 0 ? Math.ceil(n / stackMax(itemOf(id))) : 0)
export const slotsUsed = (contents = {}) => Object.entries(contents).reduce((a, [id, n]) => a + slotsFor(id, n), 0)

/** 이 캐릭터가 쓸 수 있는 보관함의 학년인가 */
export const canOpenLocker = (player, grade) => gradeOf(player) === grade
export const lockerOf = (player, grade) => player.lockers?.[grade] ?? {}

/** 더 넣을 수 있는 최대 개수 (남은 칸 기준) */
export function maxDeposit(contents, id, have) {
  const cur = contents[id] || 0
  const per = stackMax(itemOf(id))
  const free = LOCKER_SLOTS - slotsUsed(contents)
  // 지금 마지막 칸의 빈자리 + 새 칸들
  const room = (cur ? Math.ceil(cur / per) * per - cur : 0) + free * per
  return Math.max(0, Math.min(have, room))
}

/** 맡기기. { player } 또는 { error } */
export function deposit(player, grade, id, n) {
  const item = itemOf(id)
  const have = player.inventory?.[id] || 0
  if (!item || !Number.isInteger(n) || n < 1) return { error: '개수를 확인해 주세요.' }
  if (have < n) return { error: '가진 개수가 모자란다.' }
  const cur = lockerOf(player, grade)
  if (n > maxDeposit(cur, id, have)) return { error: '보관함에 칸이 모자란다.' }
  const inv = { ...player.inventory, [id]: have - n }
  if (inv[id] <= 0) delete inv[id]
  return { player: { ...player, inventory: inv, lockers: { ...(player.lockers ?? {}), [grade]: { ...cur, [id]: (cur[id] || 0) + n } } } }
}

/** 꺼내기. */
export function withdraw(player, grade, id, n) {
  const cur = lockerOf(player, grade)
  const have = cur[id] || 0
  if (!itemOf(id) || !Number.isInteger(n) || n < 1 || n > have) return { error: '개수를 확인해 주세요.' }
  if (!canAddInventory(player.inventory, { [id]: n })) return { error: '소지품이 30칸을 넘는다. 빈 칸을 만든 뒤 꺼내 주세요.' }
  const box = { ...cur, [id]: have - n }
  if (box[id] <= 0) delete box[id]
  return { player: { ...player, inventory: { ...player.inventory, [id]: (player.inventory?.[id] || 0) + n }, lockers: { ...(player.lockers ?? {}), [grade]: box } } }
}
