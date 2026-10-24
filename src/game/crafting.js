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
  { id: 'r-feather-deco', result: 'feather-deco', inputs: [['dove-feather', 2], ['five-color-thread', 3]] },
  { id: 'r-jangseung-keyring', result: 'jangseung-keyring', inputs: [['carving-knife', 1], ['jangseung-piece', 2]] },
  { id: 'r-green-charm', result: 'green-charm', inputs: [['charm-scrap', 1], ['mugwort', 3]] },
  { id: 'r-clover-bookmark', result: 'clover-bookmark', inputs: [['hanji', 1], ['pouch', 1], ['clover', 1]] },
  { id: 'r-jaeaek-charm', result: 'jaeaek-charm', inputs: [['deer-tooth', 1], ['hanji', 1], ['brush', 1], ['inkstick', 1]] },
  { id: 'r-exorcism-gate', result: 'exorcism-gate', inputs: [['snake-skin', 1], ['mugwort', 3]] },
  { id: 'r-red-fox-charm', result: 'red-fox-charm', inputs: [['fox-fur', 2], ['hanji', 2], ['five-color-thread', 2]] },
  { id: 'r-spirit-disposable', result: 'spirit-disposable', inputs: [['raccoon-claw', 2], ['jangseung-piece', 1]] },
  { id: 'r-hanji', result: 'hanji', inputs: [['crumpled-hanji', 2]], note: '구김살이 난 종이를 부드러운 종이로 재활용하자.' },
  { id: 'r-brush', result: 'brush', inputs: [['split-brush', 2]], note: '다 쓴 붓을 모아오면 새 붓으로 교환해준다.' },
]
export const recipeOf = (id) => RECIPES.find((r) => r.id === id)
export const knowsRecipe = (player, id, admin = false) => admin || !!player.recipes?.[id]

/** 제작법 익히기 (이미 알면 같은 player) */
export function learnRecipe(player, id) {
  if (!recipeOf(id) || player.recipes?.[id]) return player
  return { ...player, recipes: { ...(player.recipes ?? {}), [id]: true } }
}
export const canCraft = (player, r) => r.inputs.every(([id, n]) => countOf(player, id) >= n)

/** 제작: 제작법을 모르면 { error }. 관리자는 재료를 쓰지 않는다. 성공하면 { player, item } */
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
  return { player: { ...player, inventory: inv }, item: itemOf(r.result) }
}
