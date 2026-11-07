// v-B.08 제작법 목록 보조: 적정 레벨순 정렬 · 분류 · 몇 단 제작인지
import { itemOf } from '../../game/items'
import { recipeDepth, recipeLevel } from '../../game/materialLevels'

export const recipeGroup = (r) => {
  const it = itemOf(r.result)
  if (it?.kind === 'material') return 'material'
  if (it?.kind === 'gear') return it.slot === 'trinket' ? 'trinket' : 'body'
  return 'etc'
}
/** 제작법마다 { lv, depth, group } — lv 가 null 이면 재료 가운데 아직 얻을 길이 없는 것이 있다. */
export const withMeta = (recipes) =>
  recipes
    .map((r, i) => ({ r, i, lv: recipeLevel(r), depth: recipeDepth(r), group: recipeGroup(r) }))
    .sort((a, b) => (a.lv ?? 1e9) - (b.lv ?? 1e9) || a.i - b.i)
