// v-B.18 퀘스트용 레벨 도우미: 지금 캐릭터가 '무난히' 구할 수 있는 물건 · 이길 만한 적을 고른다.
//
// 캐릭터의 수준
//  - 퀘스트 스탯 = 기본 육조 스탯 + 착용 장비 보정. 하루짜리 음식 버프 · 쇠약은 넣지 않는다(그날 부탁이 흔들리지 않게).
//  - S = 퀘스트 스탯의 평균(내림). 적의 적정 스탯(모든 스탯 기준)과 같은 단위다.
//
// 적: 혼자 싸울 수 있는 적(보스 · 일행 전투 제외) 가운데 적정 스탯의 아래 끝이 S 이하인 것. 그중 가장 높은 단계에서 고른다.
//
// 물건: 실제 개척 규칙으로 '무난히 구할 수 있는지'를 본다.
//  - 개척 칸(식물 · 장애물 · 동물): 그 칸의 종류에 쓰이는 두 스탯 합으로 성공 확률을 계산(huntOdds 그대로). 80% 이상이어야 한다.
//  - 영물: 여섯 스탯 합으로 성공 확률 80% 이상 + 나타날 확률(15~20%)을 곱한다.
//  - 개척 요괴의 전리품: 그 요괴 단계의 적정 스탯 이상이어야 하고, 만날 확률(15%) × 떨어뜨릴 확률을 곱한다.
//  - 칸의 드롭 확률(예: 봉인석 10%)과 개수(1d2 등)도 곱한다. 오전 · 오후에만 나오는 건 절반으로 친다.
//  - 개척 보너스(대팻밥 · 자갈돌 · 덫 부스러기): 가장 쉬운 칸에서 (스탯 합 − 칸 레벨)% 확률.
//  - 매점 · 텃밭은 언제나 무난하다. 이동 중에 줍는 분실물은 운이라서 '갖고 있을 때만' 부탁한다.
//  - 제작품은 재료가 모두 무난해야 한다.
//  → 한 번 시도할 때 기대 개수(y)가 0.12 미만이면 '무난하지 않다'로 보고 부탁하지 않는다.
//    무난하더라도 귀한 물건은 부탁 개수를 줄인다(개수 × y, 최소 1).
import { ALL_ENEMIES, ENEMIES, REC_STATS } from './battle.js'
import { MATERIAL_SOURCES } from './materialLevels.js'
import { RECIPES } from './crafting.js'
import { COOK_RECIPES } from './cooking.js'
import { STAT_KEYS } from './constants.js'
import { itemOf, gearBonus, STORE_ITEMS } from './items.js'
import { HUNT_SITES, HUNT_SPECIES, HUNT_BONUSES, HUNT_STAT_KEYS } from './huntSites.js'
import { huntOdds } from './huntField.js'
import { GARDEN_CROPS, GARDEN_EXTRA_SEEDS } from './garden.js'

export const COMFORT_ODDS = 80 // 개척 성공 확률이 이 이상이어야 '무난하다'
export const MIN_YIELD = 0.12 // 한 번 시도할 때 기대 개수가 이보다 작으면 부탁하지 않는다

/** 퀘스트 스탯: 기본 스탯 + 착용 장비 보정 */
export function questStats(player) {
  const base = player?.stats ?? {}
  let bonus = {}
  try { bonus = gearBonus(player ?? {}) ?? {} } catch { bonus = {} }
  return Object.fromEntries(STAT_KEYS.map((k) => [k, (Number(base[k]) || 0) + (Number(bonus[k]) || 0)]))
}
const avgOf = (stats) => Math.max(1, Math.floor(STAT_KEYS.reduce((a, k) => a + (Number(stats?.[k]) || 0), 0) / STAT_KEYS.length))
export const playerS = (player) => avgOf(questStats(player))
export const statsS = avgOf

// 단계마다 '이 정도면 그 단계 적과 싸울 만하다'고 보는 S 의 아래 끝(보상 크기 · 증표 수에 쓴다)
export const TIER_LOW = [0, 0, 6, 10, 15, 18, 29, 39, 45, 50, 60]
export const tierForS = (S) => {
  let t = 1
  for (let i = 1; i <= 10; i++) if (S >= TIER_LOW[i]) t = i
  return t
}
export const playerTier = (player) => tierForS(playerS(player))

// ───────── 적 ─────────
const lowOf = (rec) => parseInt(String(rec ?? '').split('~')[0], 10)
/** 그 적의 적정 스탯 아래 끝 */
export const recLow = (e) => {
  const v = lowOf(e?.rec ?? REC_STATS[e?.tier])
  return Number.isFinite(v) ? v : TIER_LOW[e?.tier ?? 1] ?? 0
}
export const tierRecLow = (tier) => lowOf(REC_STATS[tier]) || TIER_LOW[tier] || 0
/** 혼자 싸울 수 있는 적(보스 · 일행 전투 제외) */
const SOLO = ALL_ENEMIES.filter((e) => !e.boss && (e.partySize || 1) <= 1)
export const soloEnemies = (tier) => SOLO.filter((e) => e.tier === tier)
/** 지금 S 로 이길 만한 적(적정 스탯 아래 끝 ≤ S) */
export const fightableEnemies = (S) => SOLO.filter((e) => recLow(e) <= S)
const BASIC_IDS = new Set(ENEMIES.map((e) => e.id))
/** 그 적을 어디서 만나는지 */
export const whereToFight = (enemyId) => (BASIC_IDS.has(enemyId) ? '뒷산 · 퇴마 실습' : '뒷산 · 산 탐사 · 둘레길 바깥 숲 [추가전투]')
/** 대사 안에 넣는 짧은 장소 이름 */
export const whereShort = (enemyId) => (BASIC_IDS.has(enemyId) ? '퇴마 실습장' : '둘레길 바깥 숲')

/**
 * 지금 S 에 맞는 적 하나: 이길 만한 적 가운데 가장 높은 단계(easier 면 그 한 단계 아래)에서 고른다.
 * 이길 만한 적이 하나도 없으면(아주 처음) 가장 쉬운 적.
 */
export function pickEnemyFor(S, rng = Math.random, { easier = false, only = null } = {}) {
  let list = fightableEnemies(S)
  if (only) list = list.filter((e) => only.includes(e.id))
  if (!list.length) {
    const all = only ? SOLO.filter((e) => only.includes(e.id)) : SOLO
    if (!all.length) return null
    return [...all].sort((a, b) => recLow(a) - recLow(b))[0]
  }
  const top = Math.max(...list.map((e) => e.tier))
  const want = easier ? Math.max(1, top - 1) : top
  let band = list.filter((e) => e.tier === want)
  if (!band.length) band = list.filter((e) => e.tier === top)
  return band[Math.floor(rng() * band.length)]
}
/** 지금 S 로 이길 만한 적인가 */
export const canFight = (enemy, S) => !!enemy && !enemy.boss && (enemy.partySize || 1) <= 1 && recLow(enemy) <= S

// ───────── 물건을 얻는 곳 ─────────
const avgAmt = (r) => (r.dice ? (r.dice + 1) / 2 : r.amount ?? 1) + (r.plus ?? 0)
function buildSources() {
  const src = {}
  const add = (id, s) => { if (id) (src[id] ??= []).push(s) }
  for (const site of Object.values(HUNT_SITES)) {
    for (const n of site.nodes ?? []) {
      const sp = HUNT_SPECIES[n.species]
      if (!sp) continue
      for (const r of sp.rewards ?? []) {
        const s = { kind: 'node', statKind: sp.kind, level: n.level, factor: r.chance ?? 1, amt: avgAmt(r), where: `${site.name} · ${sp.name}` }
        if (r.item) add(r.item, s)
        if (r.am) add(r.am, { ...s, factor: s.factor * 0.5 })
        if (r.pm) add(r.pm, { ...s, factor: s.factor * 0.5 })
      }
    }
    for (const sp of site.spirits ?? (site.spirit ? [site.spirit] : [])) {
      const spec = HUNT_SPECIES[sp.species] ?? sp
      for (const r of spec.rewards ?? sp.rewards ?? []) {
        const s = { kind: 'spirit', statKind: 'spirit', level: sp.level, factor: (sp.chance ?? 0.15) * (r.chance ?? 1), amt: avgAmt(r), where: `${site.name} · ${spec.name}(영물)` }
        if (r.item) add(r.item, s)
        if (r.am) add(r.am, { ...s, factor: s.factor * 0.5 })
        if (r.pm) add(r.pm, { ...s, factor: s.factor * 0.5 })
      }
    }
    const g = site.ghost
    for (const r of g?.rewardItems ?? []) add(r.item, { kind: 'ghost', tier: g.enemy?.tier ?? g.level ?? 1, factor: (g.chance ?? 0.15) * (r.chance ?? 1), amt: avgAmt(r), where: `${site.name} · ${g.name}(요괴)` })
  }
  for (const [kind, b] of Object.entries(HUNT_BONUSES)) add(b.item, { kind: 'bonus', statKind: kind, amt: avgAmt(b), where: '개척 보너스' })
  for (const it of STORE_ITEMS) add(it.id, { kind: 'store', where: '기숙사 매점' })
  for (const c of GARDEN_CROPS) { add(c.id, { kind: 'garden', where: '텃밭' }); add(c.seedId, { kind: 'store', where: '씨앗 상점' }) }
  for (const s of GARDEN_EXTRA_SEEDS) add(s.id, { kind: 'store', where: '씨앗 상점' })
  // 볍씨: 볍씨 주머니(솟대 등)를 도깨비 농장에서 연다
  add('rice-grain', { kind: 'via', from: 'rice-seeds', mult: 2, where: '볍씨 주머니' })
  // 그 밖에 수급처 표에만 있는 곳(분실물 등) — 운이라서 무난하지 않다
  for (const [id, list] of Object.entries(MATERIAL_SOURCES)) for (const s of list) if (s.type === '이동') add(id, { kind: 'lost', where: s.where })
  return src
}
export const QUEST_SOURCES = buildSources()
const MIN_NODE_LEVEL = (() => {
  const m = {}
  for (const site of Object.values(HUNT_SITES)) for (const n of site.nodes ?? []) {
    const k = HUNT_SPECIES[n.species]?.kind
    if (k && k !== 'spirit') m[k] = Math.min(m[k] ?? 999, n.level)
  }
  return m
})()
const recipeOf = new Map([...RECIPES, ...COOK_RECIPES].map((r) => [r.result, r]))
export const isCrafted = (id) => recipeOf.has(id)
const huntValue = (kind, stats) => (HUNT_STAT_KEYS[kind] ?? []).reduce((a, k) => a + (Number(stats[k]) || 0), 0)

/**
 * 이 캐릭터가 이 물건을 무난히 구할 수 있는지.
 * { ok, y: 한 번 시도할 때 기대 개수(매점 · 텃밭은 99), score: 지금 수준에 얼마나 가까운지(0~1, 클수록 '지금 수준의 물건'), via }
 */
export function makeAccess(stats) {
  const S = avgOf(stats)
  const memo = new Map()
  const one = (s) => {
    if (s.kind === 'store' || s.kind === 'garden') return { y: 99, score: 0, via: s.where }
    if (s.kind === 'node' || s.kind === 'spirit') {
      const o = huntOdds(s.statKind, s.level, stats)
      if (o.blocked || o.success < COMFORT_ODDS) return null
      return { y: (o.success / 100) * s.factor * s.amt, score: Math.min(1, s.level / Math.max(1, o.value)), via: s.where }
    }
    if (s.kind === 'ghost') {
      const low = tierRecLow(s.tier)
      if (S < low) return null
      return { y: s.factor * s.amt, score: Math.min(1, low / Math.max(1, S)), via: s.where }
    }
    if (s.kind === 'bonus') {
      const lv = MIN_NODE_LEVEL[s.statKind]
      if (lv == null) return null
      const chance = Math.max(0, Math.min(100, huntValue(s.statKind, stats) - lv)) / 100
      return { y: chance * s.amt, score: 0, via: s.where }
    }
    if (s.kind === 'via') {
      const a = access(s.from)
      return a.ok ? { y: a.y * s.mult, score: a.score, via: s.where } : null
    }
    return null // lost 등
  }
  const access = (id, seen = new Set()) => {
    if (memo.has(id)) return memo.get(id)
    if (seen.has(id) || !itemOf(id)) return { ok: false, y: 0, score: 0 }
    seen.add(id)
    let best = null
    for (const s of QUEST_SOURCES[id] ?? []) {
      const r = s.kind === 'via' ? (() => { const a = access(s.from, seen); return a.ok ? { y: a.y * s.mult, score: a.score, via: s.where } : null })() : one(s)
      if (r && (!best || r.y > best.y || (r.y === best.y && r.score > best.score))) best = r
    }
    if (itemOf(id)?.price != null && (!best || best.y < 99)) best = { y: 99, score: best?.score ?? 0, via: '기숙사 매점' }
    const rec = recipeOf.get(id)
    if (rec) {
      const parts = rec.inputs.map(([i, need]) => ({ a: access(i, seen), need }))
      if (parts.every((p) => p.a.ok)) {
        const y = Math.min(...parts.map((p) => p.a.y / p.need))
        const c = { y, score: Math.max(0, ...parts.map((p) => p.a.score)), via: '제작' }
        if (!best || c.y > best.y) best = c
      }
    }
    seen.delete(id)
    const out = best && best.y >= MIN_YIELD ? { ok: true, ...best } : { ok: false, y: best?.y ?? 0, score: best?.score ?? 0, via: best?.via }
    if (!seen.size) memo.set(id, out)
    return out
  }
  return (id) => access(id)
}
/** 귀한 물건은 부탁 개수를 줄인다(개수 × 기대 개수, 최소 1) */
export const scaledCount = (n, a) => Math.max(1, Math.min(n, Math.round(n * Math.min(1, a.y))))

/**
 * 후보 [[id, n], …] 중에서 지금 무난히 구할 수 있는 것을 고른다.
 * 쉬운 것보다 지금 수준에 가까운 것(score 가 높은 쪽 셋 중 하나)을 고르고, 귀한 물건이면 개수를 줄인다. 하나도 없으면 null.
 */
export function pickItemFor(stats, pool, rng = Math.random) {
  const access = makeAccess(stats)
  const ok = pool.map(([id, n]) => ({ id, n, a: access(id) })).filter((x) => x.a.ok).sort((p, q) => q.a.score - p.a.score)
  if (!ok.length) return null
  const top = ok.slice(0, Math.min(3, ok.length))
  const x = top[Math.floor(rng() * top.length)]
  return { id: x.id, n: scaledCount(x.n, x.a), access: x.a }
}

// 예전 표(스프레드시트 등) 호환용: 수급처 레벨을 '모든 스탯'으로 환산한 대략값
const memoS = new Map()
export function itemReqS(id, seen = new Set()) {
  if (memoS.has(id)) return memoS.get(id)
  if (seen.has(id)) return Infinity
  seen.add(id)
  let best = Infinity
  for (const s of MATERIAL_SOURCES[id] ?? []) {
    if (s.level == null) continue
    if (s.type === '매점' || s.type === '텃밭' || s.type === '이동') { best = 0; continue }
    best = Math.min(best, s.level / (/\(영물/.test(s.what ?? '') ? 6 : 2))
  }
  if (itemOf(id)?.price != null) best = 0
  const r = recipeOf.get(id)
  if (r) best = Math.min(best, Math.max(...r.inputs.map(([i]) => itemReqS(i, seen))))
  seen.delete(id)
  if (!seen.size) memoS.set(id, best)
  return best
}

// ───────── 단계별 보상 크기 ─────────
// 냥 · 영력. 퇴마 실습 한 판(1단계 10 · 5단계 50 · 10단계 150 남짓)과 견줘 정한다.
export const MONEY_T = [0, 12, 18, 26, 36, 46, 66, 86, 96, 110, 130]
export const SPIRIT_T = [0, 6, 9, 13, 18, 23, 33, 43, 48, 55, 65]
