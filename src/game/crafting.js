// 제작법과 제작. 제작법을 모르면 어떤 재료를 섞어도 아무것도 만들 수 없다.
//  - player.recipes = { [recipeId]: true }  (익힌 제작법)
//  - 관리자는 모든 제작법을 아는 것으로 친다.
import { countOf, itemOf } from './items'

export const WORKSHOP = {
  id: 'workshop',
  name: '공작소',
  desc: '일반 고등학교의 미술실 대신 쓰는 시설이라 해도 좋을 정도로 다양한 도구가 준비되어 있는 공간. 이곳에서 재료를 합성해서 물건을 제작할 수 있다.',
}

// inputs: [아이템 id, 개수]. result: 만들어지는 아이템 id (qty 기본 1)
export const RECIPES = [
  { id: 'r-exercise-lamp', result: 'exercise-lamp', inputs: [['cloth-scrap', 2], ['alcohol-lamp', 1]] },
  { id: 'r-beginner-godok', result: 'beginner-godok', inputs: [['sewer-rat', 2], ['centipede', 2], ['small-pot', 1]] },
  { id: 'r-godok', result: 'godok', inputs: [['sewer-rat', 5], ['centipede', 5], ['small-pot', 1]] },
  { id: 'r-curse-doll', result: 'curse-doll', inputs: [['fine-woodchip', 5]] },
  { id: 'r-whetstone', result: 'whetstone', inputs: [['stone', 9]] },
  { id: 'r-five-knot', result: 'five-knot', inputs: [['five-color-thread', 3]] },

  { id: 'r-feather-deco', result: 'feather-deco', inputs: [['dove-feather', 3], ['five-color-thread', 1]] },
  { id: 'r-jangseung-keyring', result: 'jangseung-keyring', inputs: [['carving-knife', 1], ['jangseung-piece', 5]] },
  { id: 'r-green-charm', result: 'green-charm', inputs: [['charm-scrap', 2], ['mugwort', 3]] },
  { id: 'r-clover-bookmark', result: 'clover-bookmark', inputs: [['hanji', 3], ['pouch', 1], ['clover', 1]] },
  { id: 'r-jaeaek-charm', result: 'jaeaek-charm', inputs: [['deer-tooth', 2], ['hanji', 2], ['brush', 1], ['inkstick', 1]] },
  { id: 'r-exorcism-gate', result: 'exorcism-gate', inputs: [['snake-skin', 2], ['mugwort', 3]] },
  { id: 'r-red-fox-charm', result: 'red-fox-charm', inputs: [['charm-scrap', 2], ['fox-fur', 3], ['hanji', 3], ['five-color-thread', 1], ['jangseung-piece', 1], ['inkstick', 1], ['pouch', 1]] },
  { id: 'r-spirit-disposable', result: 'spirit-disposable', inputs: [['raccoon-claw', 3], ['jangseung-piece', 3]] },
  { id: 'r-hanji', result: 'hanji', inputs: [['crumpled-hanji', 2]], note: '구김살이 난 종이를 부드러운 종이로 재활용하자.', price: 30 },
  { id: 'r-brush', result: 'brush', inputs: [['split-brush', 2]], note: '다 쓴 붓을 모아오면 새 붓으로 교환해준다.', price: 40 },
]
export const recipeOf = (id) => RECIPES.find((r) => r.id === id)
export const knowsRecipe = (player, id, admin = false) => admin || !!player.recipes?.[id]

/** 매점에서 파는 제작법 (price 가 있는 것). */
export const RECIPE_SHOP = RECIPES.filter((r) => r.price != null)

/** 매점에서 제작법을 산다. 이미 아는 제작법은 다시 살 수 없다. */
export function buyRecipe(player, recipeId, admin = false) {
  const r = recipeOf(recipeId)
  if (!r || r.price == null) return { error: '매점에서 팔지 않는 제작법이다.' }
  if (knowsRecipe(player, recipeId, admin)) return { error: '이미 아는 제작법이다.' }
  if (!admin && player.money < r.price) return { error: '냥이 모자라다.' }
  const paid = admin ? player : { ...player, money: player.money - r.price }
  return { player: learnRecipe(paid, recipeId), recipe: r }
}

/** 제작법 익히기 (이미 알면 같은 player) */
export function learnRecipe(player, id) {
  if (!recipeOf(id) || player.recipes?.[id]) return player
  return { ...player, recipes: { ...(player.recipes ?? {}), [id]: true } }
}
export const canCraft = (player, r) => r.inputs.every(([id, n]) => countOf(player, id) >= n)
export const canCraftQty = (player, r, qty, admin = false) => admin || r.inputs.every(([id, n]) => countOf(player, id) >= n * qty)

// 제작 소요 시간: 한 번 만드는 데 소모하는 재료 총 개수 × 10분. (갯수만큼 비례해서 늘어난다.)
export const CRAFT_MIN_PER_MATERIAL = 10
export const totalInputCount = (r) => r.inputs.reduce((s, [, n]) => s + n, 0)
export const craftMinutes = (r, qty = 1) => totalInputCount(r) * CRAFT_MIN_PER_MATERIAL * Math.max(1, Math.floor(qty))
export const maxCraftQty = (player, r, admin = false) => {
  if (admin) return 99
  const n = r.inputs.reduce((min, [id, need]) => Math.min(min, Math.floor(countOf(player, id) / need)), Infinity)
  return Number.isFinite(n) ? n : 0
}

/**
 * 제작 시작: 재료를 그 즉시 소모하고 player.crafting 에 대기를 건다. (완료는 progress.js 의 tickPlayer 가 처리)
 * 끝까지 기다려야 완성품이 나온다. 중간에 나가면(끊기면) 재료도 완성품도 돌아오지 않는다.
 * 제작법을 모르거나 재료가 모자라면 { error }. 이미 제작 중이면 { error }. 성공하면 { player, minutes }
 */
export function startCraft(player, recipeId, qty = 1, admin = false, now = Date.now()) {
  if (player.crafting) return { error: '이미 제작 중이다.' }
  const r = recipeOf(recipeId)
  if (!r) return { error: '그런 제작법은 없다.' }
  if (!knowsRecipe(player, recipeId, admin)) return { error: '제작법을 모른다. 제작법이 없으면 아무것도 만들 수 없다.' }
  const q = Math.max(1, Math.floor(qty))
  if (!admin && !canCraftQty(player, r, q)) return { error: '재료가 모자란다.' }
  const inv = { ...(player.inventory ?? {}) }
  if (!admin) {
    for (const [id, n] of r.inputs) {
      inv[id] -= n * q
      if (inv[id] <= 0) delete inv[id]
    }
  }
  const minutes = craftMinutes(r, q)
  return { player: { ...player, inventory: inv, crafting: { recipeId, qty: q, startedAt: now, minutes } }, minutes }
}

/** 제작 대기를 끊는다. 재료도 완성품도 돌아오지 않는다. */
export function cancelCraft(player) {
  if (!player.crafting) return player
  return { ...player, crafting: null }
}

/** 제작 완료 처리 (tickPlayer 에서 부른다). 반환 { player, item, qty } 또는 null(제작 중이 아니면) */
export function finishCraft(player) {
  const c = player.crafting
  if (!c) return null
  const r = recipeOf(c.recipeId)
  const inv = { ...(player.inventory ?? {}) }
  inv[r.result] = (inv[r.result] || 0) + c.qty
  return { player: { ...player, inventory: inv, crafting: null, ...(r.result === 'exercise-lamp' ? { cleared: { ...player.cleared, 'exercise-lamp': Date.now() } } : {}) }, item: itemOf(r.result), qty: c.qty }
}

/** (옛 1회성 즉석 제작. 지금은 쓰지 않지만 혹시 참조하는 곳이 있을까봐 남겨둔다.) */
export function craft(player, recipeId, admin = false) {
  const r = recipeOf(recipeId)
  if (!r) return { error: '그런 제작법은 없다.' }
  if (!knowsRecipe(player, recipeId, admin)) return { error: '제작법을 모른다. 제작법이 없으면 아무것도 만들 수 없다.' }
  if (!admin && !canCraft(player, r)) return { error: '재료가 모자란다.' }
  const inv = { ...(player.inventory ?? {}) }
  if (!admin) {
    for (const [id, n] of r.inputs) {
      inv[id] -= n
      if (inv[id] <= 0) delete inv[id]
    }
  }
  inv[r.result] = (inv[r.result] || 0) + 1
  return { player: { ...player, inventory: inv, ...(r.result === 'exercise-lamp' ? { cleared: { ...player.cleared, 'exercise-lamp': Date.now() } } : {}) }, item: itemOf(r.result) }
}
