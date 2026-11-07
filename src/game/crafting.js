// 공작소 제작법. 등록된 제작법은 별도 습득 없이 재료만 있으면 즉시 제작한다.
// - 예전 player.recipes 데이터와 진행 중인 player.crafting 은 호환을 위해 유지한다.
import { countOf, itemOf } from './items.js'
import { canAddInventory } from './inventoryCapacity.js'

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
  { id: 'r-oil-cloth', result: 'oil-cloth', inputs: [['soybean-oil', 3], ['cloth-scrap', 1]] },
  { id: 'r-cinnabar-charm', result: 'cinnabar-charm', inputs: [['brush', 1], ['charm-scrap', 3], ['crescent-flower', 2], ['waning-flower', 2], ['cinnabar', 3]] },

  { id: 'r-feather-deco', result: 'feather-deco', inputs: [['dove-feather', 3], ['five-color-thread', 1]] },
  { id: 'r-jangseung-keyring', result: 'jangseung-keyring', inputs: [['carving-knife', 1], ['jangseung-piece', 5]] },
  { id: 'r-green-charm', result: 'green-charm', inputs: [['charm-scrap', 2], ['mugwort', 3]] },
  { id: 'r-clover-bookmark', result: 'clover-bookmark', inputs: [['hanji', 3], ['pouch', 1], ['clover', 1]] },
  { id: 'r-jaeaek-charm', result: 'jaeaek-charm', inputs: [['deer-tooth', 2], ['hanji', 2], ['brush', 1], ['inkstick', 1]] },
  { id: 'r-exorcism-gate', result: 'exorcism-gate', inputs: [['snake-skin', 2], ['mugwort', 3]] },
  { id: 'r-red-fox-charm', result: 'red-fox-charm', inputs: [['charm-scrap', 2], ['fox-fur', 3], ['hanji', 3], ['five-color-thread', 1], ['jangseung-piece', 1], ['inkstick', 1], ['pouch', 1]] },
  { id: 'r-spirit-disposable', result: 'spirit-disposable', inputs: [['raccoon-claw', 3], ['jangseung-piece', 3]] },
  { id: 'r-goblin-mask', result: 'goblin-mask', inputs: [['jangseung-piece', 2], ['fine-woodchip', 2]] },
  { id: 'r-five-color-thread', result: 'five-color-thread', inputs: [['web', 5], ['dye', 1]] },
  { id: 'r-hanji', result: 'hanji', inputs: [['crumpled-hanji', 2]], note: '구김살이 난 종이를 부드러운 종이로 재활용하자.', price: 30 },
  { id: 'r-brush', result: 'brush', inputs: [['split-brush', 2]], note: '다 쓴 붓을 모아오면 새 붓으로 교환해준다.', price: 40 },
]
export const recipeOf = (id) => RECIPES.find((r) => r.id === id)
export const knowsRecipe = (player, id, admin = false) => !!recipeOf(id)

/** v79.0.6부터 제작법 구매를 요구하지 않는다. */
export const RECIPE_SHOP = []

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
 * v79.0.6: 공작소에서 레시피와 재료가 있으면 즉시 완성한다.
 * 기존 저장 데이터의 제작 대기는 progress.js/finishCraft 로 완료시켜 호환한다.
 */
export function startCraft(player, recipeId, qty = 1, admin = false, now = Date.now()) {
  if (player.crafting) return { error: '기존에 진행 중인 제작을 먼저 마쳐야 한다.' }
  const r = recipeOf(recipeId)
  if (!r) return { error: '그런 제작법은 없다.' }
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 99) return { error: '제작 수량은 1~99개여야 한다.' }
  if (!admin && !canCraftQty(player, r, qty)) return { error: '재료가 모자란다.' }
  const inv = { ...(player.inventory ?? {}) }
  if (!admin) {
    for (const [id, n] of r.inputs) {
      inv[id] -= n * qty
      if (inv[id] <= 0) delete inv[id]
    }
  }
  if (!canAddInventory(inv, { [r.result]: qty })) return { error: '소지품이 가득 차 제작할 수 없다.' }
  inv[r.result] = (inv[r.result] || 0) + qty
  const next = { ...player, inventory: inv,
    ...(r.result === 'exercise-lamp' ? { cleared: { ...(player.cleared ?? {}), 'exercise-lamp': now } } : {}),
  }
  return { player: next, item: itemOf(r.result), qty, minutes: 0 }
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

/** 기존 호출을 위한 즉시 제작 진입점. */
export function craft(player, recipeId, admin = false) {
  return startCraft(player, recipeId, 1, admin)
}
