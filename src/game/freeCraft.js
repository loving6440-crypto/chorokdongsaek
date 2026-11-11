// v-B.18 자유 제작: 조리실 · 공작소의 [제작] 칸(최대 10칸)에 소지품에서 물건을 옮겨 놓고 [제작]을 누른다.
//  - 올려 둔 물건이 어떤 제작법의 재료와 정확히 맞으면 그 제작법대로 만든다.
//    재료가 제작법의 딱 k배면(예: A 4 · B 6 ↔ A 2 · B 3) k개를 만든다.
//  - 맞는 제작법이 없으면 올려 둔 재료가 모두 사라지고 실패작이 나온다: 조리실 → 숯, 공작소 → 쓰레기.
import { RECIPES, startCraft } from './crafting.js'
import { COOK_RECIPES, cook } from './cooking.js'
import { countOf, itemOf } from './items.js'
import { canAddInventory } from './inventoryCapacity.js'

export const BENCH_SLOTS = 10
export const FAIL_ITEM = { kitchen: 'charcoal', workshop: 'trash' }
export const PLACE_RECIPES = { kitchen: COOK_RECIPES, workshop: RECIPES }

/** 칸들을 물건별로 합친다: { id: 개수 } */
export function benchTotals(slots) {
  const out = {}
  for (const s of slots ?? []) if (s && s.id && s.n > 0) out[s.id] = (out[s.id] || 0) + s.n
  return out
}

/** 올려 둔 물건과 맞는 제작법: { recipe, k } 또는 null */
export function matchRecipe(slots, place) {
  const tot = benchTotals(slots)
  const ids = Object.keys(tot)
  if (!ids.length) return null
  for (const r of PLACE_RECIPES[place] ?? []) {
    if (r.inputs.length !== ids.length) continue
    let k = null
    let ok = true
    for (const [id, need] of r.inputs) {
      const have = tot[id]
      if (!have || have % need !== 0) { ok = false; break }
      const kk = have / need
      if (k == null) k = kk
      else if (k !== kk) { ok = false; break }
    }
    if (ok && k >= 1) return { recipe: r, k }
  }
  return null
}

/** [제작] 전에 보여 줄 미리 보기 */
export function benchPreview(slots, place) {
  const tot = benchTotals(slots)
  if (!Object.keys(tot).length) return { empty: true }
  const m = matchRecipe(slots, place)
  if (m) return { recipe: m.recipe, k: m.k, item: itemOf(m.recipe.result) }
  return { fail: true, item: itemOf(FAIL_ITEM[place]) }
}

/**
 * 제작. 반환 { player, item, qty, recipe, failed } 또는 { error }
 * admin 이면 제작법대로 만들 때 재료를 쓰지 않는다(기존 규칙과 같다). 실패작은 관리자도 재료가 빠진다.
 */
export function benchCraft(player, slots, place, admin = false) {
  const tot = benchTotals(slots)
  const ids = Object.keys(tot)
  if (!ids.length) return { error: '제작 칸이 비어 있다.' }
  if ((slots ?? []).filter((s) => s?.id).length > BENCH_SLOTS) return { error: `제작 칸은 ${BENCH_SLOTS}칸까지다.` }
  for (const id of ids) {
    if (!itemOf(id)) return { error: '알 수 없는 물건이 있다.' }
    if (!Number.isSafeInteger(tot[id]) || tot[id] < 1) return { error: '개수를 확인해 주세요.' }
    if (countOf(player, id) < tot[id]) return { error: `${itemOf(id).name}이(가) 모자란다.` }
  }
  const m = matchRecipe(slots, place)
  if (m) {
    if (place === 'workshop') {
      const r = startCraft(player, m.recipe.id, m.k, admin)
      if (r.error) return r
      return { player: r.player, item: itemOf(m.recipe.result), qty: r.qty ?? m.k, recipe: m.recipe, failed: false }
    }
    let p = player
    for (let i = 0; i < m.k; i++) {
      const r = cook(p, m.recipe.id, admin)
      if (r.error) return i === 0 ? r : { player: p, item: itemOf(m.recipe.result), qty: i, recipe: m.recipe, failed: false, note: r.error }
      p = r.player
    }
    return { player: p, item: itemOf(m.recipe.result), qty: m.k, recipe: m.recipe, failed: false }
  }
  // 맞는 제작법이 없다 → 재료가 모두 사라지고 실패작 하나
  const failId = FAIL_ITEM[place]
  const inv = { ...(player.inventory ?? {}) }
  for (const id of ids) {
    inv[id] -= tot[id]
    if (inv[id] <= 0) delete inv[id]
  }
  if (!canAddInventory(inv, { [failId]: 1 })) return { error: '소지품이 가득 차 만들 수 없다.' }
  inv[failId] = (inv[failId] || 0) + 1
  return { player: { ...player, inventory: inv }, item: itemOf(failId), qty: 1, recipe: null, failed: true }
}

// ───────── v-B.18 아는 제작법대로 만들기 ─────────
// player.madeRecipes = { 제작법 id: 처음 만든 시각 } — 제작법대로 한 번이라도 만든 것(이 기능이 생긴 뒤부터 기록).
export const madeBefore = (player, recipeId) => !!player?.madeRecipes?.[recipeId]
export function markMade(player, recipeId, now = Date.now()) {
  if (!recipeId || madeBefore(player, recipeId)) return player
  return { ...player, madeRecipes: { ...(player.madeRecipes ?? {}), [recipeId]: now } }
}
/** 지금 재료로 이 제작법을 몇 번 만들 수 있나(최대 99) */
export function maxQtyFor(player, r) {
  return Math.max(0, Math.min(99, ...r.inputs.map(([id, n]) => Math.floor(countOf(player, id) / n))))
}
/** 팝업 목록: 지금 만들 수 있고 · 이미 한 번 만들어 본 제작법(교집합), 가나다순 */
export function knownMakeable(player, place) {
  return (PLACE_RECIPES[place] ?? [])
    .filter((r) => madeBefore(player, r.id) && maxQtyFor(player, r) >= 1)
    .sort((a, b) => (itemOf(a.result)?.name ?? '').localeCompare(itemOf(b.result)?.name ?? '', 'ko'))
}
/** 제작법대로 qty개. 반환 { player, item, qty, recipe } 또는 { error } */
export function knownCraft(player, place, recipeId, qty, admin = false) {
  const r = (PLACE_RECIPES[place] ?? []).find((x) => x.id === recipeId)
  if (!r) return { error: '그런 제작법은 없다.' }
  if (!madeBefore(player, r.id)) return { error: '아직 만들어 본 적 없는 제작법이다.' }
  if (!Number.isSafeInteger(qty) || qty < 1) return { error: '개수를 확인해 주세요.' }
  if (!admin && qty > maxQtyFor(player, r)) return { error: '재료가 모자란다.' }
  return benchCraft(player, r.inputs.map(([id, n]) => ({ id, n: n * qty })), place, admin)
}
