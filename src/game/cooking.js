// 조리실의 요리법과 요리. 공작소(crafting.js)와 완전히 같은 구조이지만 별도의 재료·결과물 체계를 쓴다.
// 등록된 조리실 요리법은 별도로 익히지 않아도 재료만 있으면 즉시 조리 가능하다.
import { countOf, itemOf } from './items.js'
import { canAddInventory } from './inventoryCapacity.js'

export const KITCHEN = {
  id: 'kitchen',
  name: '조리실',
  desc: '가스불과 커다란 조리대, 각종 식자재가 갖춰진 공간. 이곳에서 식재료를 조합해서 음식을 만들 수 있다.',
}

// inputs: [아이템 id, 개수]. result: 만들어지는 아이템 id (qty 기본 1)
export const COOK_RECIPES = [
  { id: 'cook-soybean-oil', result: 'soybean-oil', inputs: [['soybean', 5]] },
  { id: 'cook-rice-cake', result: 'rice-cake', inputs: [['mugwort', 3], ['rice', 2]] },
  { id: 'cook-carp-soup', result: 'carp-soup', inputs: [['carp', 3], ['lake-water', 3]] },
  { id: 'cook-snakeberry-jam', result: 'snakeberry-jam', inputs: [['snake-berry', 4], ['sugar', 3]] },
  { id: 'cook-mushroom-stew', result: 'mushroom-stew', inputs: [['mushroom', 5]] },
  { id: 'cook-king-mushroom-stew', result: 'king-mushroom-stew', inputs: [['mushroom', 3], ['king-mushroom', 2]] },
  { id: 'cook-poison-mushroom-stew', result: 'poison-mushroom-stew', inputs: [['poison-mushroom', 5]] },
  { id: 'cook-bibimbap', result: 'bibimbap', inputs: [['chwinamul', 2], ['lettuce', 2], ['fern', 2], ['rice', 2]] },
  { id: 'cook-flower-pancake', result: 'flower-pancake', inputs: [['azalea', 1], ['dandelion', 1], ['rice', 2]] },
]

export const cookRecipeOf = (id) => COOK_RECIPES.find((r) => r.id === id)
export const knowsCookRecipe = (player, id, admin = false) => !!cookRecipeOf(id)

/** 요리법 익히기 (이미 알면 같은 player) */
export function learnCookRecipe(player, id) {
  if (!cookRecipeOf(id) || player.cookRecipes?.[id]) return player
  return { ...player, cookRecipes: { ...(player.cookRecipes ?? {}), [id]: true } }
}
export const canCook = (player, r) => r.inputs.every(([id, n]) => countOf(player, id) >= n)

/** 조리: 요리법을 모르면 { error }. 관리자는 재료를 쓰지 않는다. 성공하면 { player, item } */
export function cook(player, recipeId, admin = false) {
  const r = cookRecipeOf(recipeId)
  if (!r) return { error: '그런 요리법은 없다.' }
  if (!admin && !canCook(player, r)) return { error: '재료가 모자란다.' }
  const inv = { ...(player.inventory ?? {}) }
  if (!admin) {
    for (const [id, n] of r.inputs) {
      inv[id] -= n
      if (inv[id] <= 0) delete inv[id]
    }
  }
  if (!canAddInventory(inv, { [r.result]: 1 })) return { error: '소지품이 가득 차 조리할 수 없다.' }
  inv[r.result] = (inv[r.result] || 0) + 1
  return { player: { ...player, inventory: inv }, item: itemOf(r.result) }
}
