/**
 * v-B.08 재료 수급처 · 적정 레벨.
 *  - 개척 터에서 나오는 재료는 그 재료를 주는 칸(식물 · 장애물 · 동물 · 영물)의 레벨 중 가장 낮은 것을 적정 레벨로 본다.
 *    (레벨은 개척 지도에 적힌 그대로 — 식물 · 장애물 · 동물은 두 스탯의 합, 영물은 여섯 스탯의 합과 견준다)
 *  - 개척 요괴가 떨어뜨리는 재료는 그 터의 가장 낮은 칸 레벨(요괴를 만나려면 그 터에 들어가야 한다).
 *  - 매점 · 텃밭 · 이동 중 줍기는 0, 볍씨는 볍씨 주머니의 레벨을 따른다.
 *  - 제작품은 재료들의 적정 레벨 중 가장 높은 것(재료를 다 모을 수 있어야 만든다). 중간 재료도 같은 규칙으로 거슬러 올라간다.
 *  - 위 어디에도 없으면 '수급처 없음'(null).
 */
import { ITEMS, STORE_ITEMS, isMaterial } from './items.js'
import { HUNT_SITES, HUNT_SPECIES, HUNT_BONUSES } from './huntSites.js'
import { GARDEN_CROPS, GARDEN_EXTRA_SEEDS } from './garden.js'
import { RECIPES } from './crafting.js'
import { COOK_RECIPES } from './cooking.js'
import { LOST_THINGS } from './travelEvents.js'

const KIND = { plant: '식물', obstacle: '장애물', animal: '동물', spirit: '영물', ghost: '요괴' }

function collectSources() {
  const src = {}
  const add = (id, s) => { if (id) (src[id] ??= []).push(s) }
  const minKind = {}
  for (const site of Object.values(HUNT_SITES)) {
    const spirits = site.spirits ?? (site.spirit ? [site.spirit] : [])
    const siteMin = Math.min(...(site.nodes ?? []).map((n) => n.level))
    for (const n of [...(site.nodes ?? []), ...spirits]) {
      const sp = HUNT_SPECIES[n.species]
      if (!sp) continue
      if (sp.kind !== 'spirit') minKind[sp.kind] = Math.min(minKind[sp.kind] ?? 999, n.level)
      for (const r of sp.rewards ?? []) {
        const base = { type: '개척', where: site.name, what: `${sp.name}(${KIND[sp.kind]})`, level: n.level, chance: sp.kind === 'spirit' ? n.chance ?? null : null }
        if (r.item) add(r.item, base)
        if (r.am) add(r.am, { ...base, what: `${sp.name}(${KIND[sp.kind]}, 오전)` })
        if (r.pm) add(r.pm, { ...base, what: `${sp.name}(${KIND[sp.kind]}, 오후)` })
      }
    }
    for (const r of site.ghost?.rewardItems ?? []) {
      add(r.item, { type: '개척 요괴', where: site.name, what: `${site.ghost.name}(요괴 ${site.ghost.enemy?.tier ?? site.ghost.level}단계)에게 이기면 ${Math.round((r.chance ?? 1) * 100)}%`, level: Number.isFinite(siteMin) ? siteMin : null })
    }
  }
  for (const [kind, b] of Object.entries(HUNT_BONUSES)) add(b.item, { type: '개척 보너스', where: '모든 개척 터', what: `${KIND[kind]} 칸을 채집할 때 덤`, level: minKind[kind] ?? 0 })
  for (const it of STORE_ITEMS) add(it.id, { type: '매점', where: '기숙사 매점', what: `${it.price}냥`, level: 0 })
  for (const c of GARDEN_CROPS) { add(c.id, { type: '텃밭', where: '비닐하우스', what: '씨앗을 심어 거둔다', level: 0 }); add(c.seedId, { type: '텃밭', where: '씨앗 상점', what: '3냥', level: 0 }) }
  for (const s of GARDEN_EXTRA_SEEDS) add(s.id, { type: '텃밭', where: '씨앗 상점', what: '3냥', level: 0 })
  for (const id of LOST_THINGS) add(id, { type: '이동', where: '건물 이동 중', what: '분실물 줍기', level: 0 })
  // v-B.18 제작 실패작: 조리실 숯 · 공작소 쓰레기 (제작 칸에 제작법에 없는 조합을 올리면)
  add('trash', { type: '제작 실패', where: '공작소', what: '제작법에 없는 조합으로 만들면', level: 0 })
  add('charcoal', { type: '제작 실패', where: '조리실', what: '제작법에 없는 조합으로 만들면', level: 0 })
  // 볍씨: 도깨비 농장에서 볍씨 주머니를 열면 나온다 → 주머니를 얻는 레벨을 따른다.
  const pouch = src['rice-seeds']
  if (pouch) add('rice-grain', { type: '도깨비 농장', where: '볍씨 주머니 열기', what: '주머니 o개 → o d o개', level: Math.min(...pouch.map((s) => s.level ?? 0)) })
  return src
}

export const MATERIAL_SOURCES = collectSources()

const ALL_RECIPES = [...RECIPES.map((r) => ({ ...r, where: '공작소' })), ...COOK_RECIPES.map((r) => ({ ...r, where: '조리실' }))]
const recipesFor = (id) => ALL_RECIPES.filter((r) => r.result === id)

const levelMemo = new Map()
/** 아이템 하나의 적정 레벨. 얻을 길이 없으면 null. */
export function itemLevel(id, seen = new Set()) {
  if (levelMemo.has(id)) return levelMemo.get(id)
  if (seen.has(id)) return null
  seen.add(id)
  const direct = (MATERIAL_SOURCES[id] ?? []).map((s) => s.level).filter((v) => v != null)
  const made = recipesFor(id).map((r) => recipeLevel(r, seen)).filter((v) => v != null)
  const all = [...direct, ...made]
  const lv = all.length ? Math.min(...all) : null
  seen.delete(id)
  if (!seen.size) levelMemo.set(id, lv)
  return lv
}
/** 제작법의 적정 레벨 = 재료 적정 레벨의 최댓값. 재료 하나라도 얻을 길이 없으면 null. */
export function recipeLevel(recipe, seen = new Set()) {
  let max = 0
  for (const [id] of recipe.inputs) {
    const lv = itemLevel(id, seen)
    if (lv == null) return null
    max = Math.max(max, lv)
  }
  return max
}
/** 제작이 몇 단계로 이어지는지: 재료가 모두 바로 얻는 것이면 1, 제작 재료가 섞이면 그 단계 + 1 */
export function recipeDepth(recipe, seen = new Set()) {
  let d = 1
  for (const [id] of recipe.inputs) {
    if (seen.has(id) || MATERIAL_SOURCES[id]?.length) continue
    const sub = recipesFor(id)[0]
    if (!sub) continue
    seen.add(id)
    d = Math.max(d, 1 + recipeDepth(sub, seen))
    seen.delete(id)
  }
  return d
}

/** 재료 목록(수급처 · 적정 레벨). 수급처가 하나도 없는 재료는 level null · sources [] */
export function materialTable() {
  return ITEMS.filter((it) => !it.id.includes('#') && isMaterial(it)).map((it) => ({
    id: it.id,
    name: it.name,
    level: itemLevel(it.id),
    sources: MATERIAL_SOURCES[it.id] ?? [],
    made: recipesFor(it.id).map((r) => r.where),
  }))
}
