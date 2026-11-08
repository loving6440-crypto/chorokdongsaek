// v-B.17 적 난이도 재조정 시뮬레이터 (실제 전투 엔진 battle.js · mbattle.js 를 그대로 돌린다)
//
//  기준: v-B.04/05 에서 맞춘 난이도(아이템 없이 적정 스탯에서의 체감)를 '정답'으로 둔다.
//  1) 적마다 아이템 없이 싸운 결과(M0)를 잰다.
//  2) 그 단계(적정 스탯)의 플레이어가 만들 수 있는 v-B.16 제작품 묶음(신체 장비 · 장신구 · 일상 버프 1 + 전투 아이템 혼자 1 / 일행 2 / 보스 3개)을 들고 싸운다.
//  3) 적의 체력 × k, 공격력 × (1 + (k−1)/2) 로 키워 가며 M(아이템, k) = M0 이 되는 k 를 이분 탐색한다.
//  M = 이기면 1 + 남은 체력 비율 × 0.5, 지면 적에게 깎은 체력 비율 — 승률보다 흔들림이 적은 연속 지표.
//
//  실행: node scripts/balance-sim.mjs [적 id …] [--runs 1500] [--json out.json]
//  (매점 상품은 이전 밸런스 때도 있었으므로 '새로 생긴 제작품'만 키트에 넣는다.)
import { writeFileSync } from 'node:fs'
import { ALL_ENEMIES, REC_STATS, newBattle, rollInitiative, playerTurnStart, beforePlayer, playerTurn, afterPlayer, enemyTurn, resolveSurvive, rollRash, maxHp, BUFF_COST, mpCostOf } from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'
import { itemOf } from '../src/game/items.js'
import { applyItemToBattle } from '../src/game/battleItems.js'
import { B16_GROUPS, B16_ITEM_EFFECTS } from '../src/game/itemEffectsB16.js'
import { MATERIAL_SOURCES } from '../src/game/materialLevels.js'
import { RECIPES } from '../src/game/crafting.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { STAT_KEYS } from '../src/game/constants.js'

// ───────── 단계별 적정 스탯 ─────────
const mid = (rec) => { const [a, b] = String(rec).split('~').map(Number); return Math.round(b ? (a + b) / 2 : a) }
export const recStatOf = (e) => mid(e.rec ?? REC_STATS[e.tier] ?? 10)

// ───────── 제작품을 무난히 만들 수 있는 '모든 스탯' 수준 (재료 수급처 레벨 ÷ 견주는 스탯 수) ─────────
const recipeOf = new Map([...RECIPES, ...COOK_RECIPES].map((r) => [r.result, r]))
const sMemo = new Map()
export function craftStatReq(id, seen = new Set()) {
  if (sMemo.has(id)) return sMemo.get(id)
  if (seen.has(id)) return Infinity
  seen.add(id)
  let best = Infinity
  for (const s of MATERIAL_SOURCES[id] ?? []) {
    if (s.level == null) continue
    if (s.type === '매점' || s.type === '텃밭' || s.type === '이동') { best = 0; continue }
    best = Math.min(best, s.level / (/\(영물/.test(s.what) ? 6 : 2))
  }
  const r = recipeOf.get(id)
  if (r) best = Math.min(best, Math.max(...r.inputs.map(([i]) => craftStatReq(i, seen))))
  seen.delete(id)
  if (!seen.size) sMemo.set(id, best)
  return best
}
const statSum = (m) => Object.values(m ?? {}).reduce((a, b) => a + b, 0)
const avail = (ids, S) => ids.filter((id) => craftStatReq(id) <= S)
const bestBy = (ids, f) => ids.reduce((a, b) => (a == null || f(b) > f(a) ? b : a), null)

/** 적정 스탯 S 의 플레이어가 들고 오는 묶음.
 *  장비(신체 · 장신구)와 하루짜리 일상 버프는 늘 걸려 있다고 보고, 소모하는 전투 아이템은
 *  단독 전투 1개 · 2인 전투 2개 · 보스 전투 3개(지참 한도)만 쓴다고 본다 — 평소 사냥에 제작품을 셋씩 태우지는 않으니까. */
export function kitFor(S, { party = false, slots = 3 } = {}) {
  const G = B16_GROUPS
  const body = bestBy(avail(G.body, S), (id) => statSum(itemOf(id).bonus))
  const trinket = bestBy(avail(G.trinket, S), (id) => statSum(itemOf(id).bonus))
  // 하루짜리 일상 버프(시간제 육조) 중 가장 센 것 하나가 걸려 있다고 본다.
  const buffVal = (id) => { const e = itemOf(id).effect; return (e.buffAll ? e.buffAll.amount * 6 : 0) + (e.buffs ? e.buffs.reduce((a, b) => a + b.amount, 0) : 0) + (e.buff ? e.buff.amount : 0) + (e.randomBuff ? e.randomBuff.amount * e.randomBuff.count : 0) }
  const daily = bestBy(avail(G.foodDaily, S).filter((id) => buffVal(id) > 0), buffVal)
  const bonus = {}
  for (const id of [body, trinket].filter(Boolean)) for (const [k, v] of Object.entries(itemOf(id).bonus)) bonus[k] = (bonus[k] || 0) + v
  let random = null
  if (daily) {
    const e = itemOf(daily).effect
    if (e.buffAll) for (const k of STAT_KEYS) bonus[k] = (bonus[k] || 0) + e.buffAll.amount
    for (const b of e.buffs ?? []) bonus[b.stat] = (bonus[b.stat] || 0) + b.amount
    if (e.buff) bonus[e.buff.stat] = (bonus[e.buff.stat] || 0) + e.buff.amount
    if (e.randomBuff) random = e.randomBuff
  }
  // 전투 아이템 3개(보스 전투 지참 한도와 같다)
  const self = [...G.foodBattleSelf, ...G.workshopBattle, ...G.foodBattleGive].filter((id) => !itemOf(id).party)
  const has = (id, k) => !!itemOf(id).effect?.[k]
  const pwr = (id) => { const e = itemOf(id).effect; return (e.enemyHit ? (e.enemyHit.n * (e.enemyHit.sides + 1) / 2 + (e.enemyHit.plus || 0)) : 0) + (e.charms || 0) * 15 + statSum(e.battleStat) * 4 + (e.drainSpirit || 0) * 1.5 + (e.reveal || 0) * 2 }
  const offense = bestBy(avail(self, S).filter((id) => pwr(id) > 0 && !has(id, 'revive')), pwr)
  const revive = bestBy(avail(self, S).filter((id) => has(id, 'revive')), (id) => (itemOf(id).effect.hp || 0) + 1)
  const healOf = (id) => { const e = itemOf(id).effect; return (e.hp || 0) + (e.giveHp ? e.giveHp.self : 0) }
  const heal = bestBy(avail(self, S).filter((id) => healOf(id) > 0 && !has(id, 'revive')), healOf)
  const partyItem = party ? bestBy(avail([...G.foodBattleParty, ...G.workshopBattle].filter((id) => itemOf(id).party), S), (id) => { const e = itemOf(id).effect; return (e.partyHp || 0) + (e.partyMp || 0) * 0.5 + statSum(e.partyStat) * 4 + (e.partyCharms || 0) * 15 + (e.partyCleanse ? 5 : 0) }) : null
  const items = [partyItem, offense, revive, heal].filter(Boolean).slice(0, slots)
  return { S, body, trinket, daily, bonus, random, items }
}

// ───────── 재현 가능한 난수 ─────────
function rngOf(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const statsOf = (S, kit, rng) => {
  const st = Object.fromEntries(STAT_KEYS.map((k) => [k, S + (kit?.bonus?.[k] || 0)]))
  if (kit?.random) { const pool = [...STAT_KEYS]; for (let i = 0; i < kit.random.count; i++) st[pool.splice(Math.floor(rng() * pool.length), 1)[0]] += kit.random.amount }
  return st
}
const scaled = (enemy, k) => (k === 1 ? enemy : { ...enemy, hp: Math.round(enemy.hp * k), atk: Math.max(1, Math.round(enemy.atk * (1 + (k - 1) / 2))) })

// ───────── 단독 전투 (Battle.jsx 진행 순서 그대로, 숙련 플레이) ─────────
function pickSolo(s, mp, st) {
  const q0 = s.known > 0 ? s.queue[0] : null
  if (s.known === 0 && mp >= mpCostOf(st, 3) + 1) return { action: 'scan', scanAmount: 3 }
  if (q0 === 'smash' && !s.bound) return { action: 'guard' }
  if (s.charms > 0 && (q0 === 'guard' || mp >= 30)) return { action: 'charm' }
  return { action: 'attack', buff: mp >= mpCostOf(st, BUFF_COST) + 6 }
}
export function soloRun(enemy, S, kit, seed) {
  const rng = rngOf(seed)
  let st = statsOf(S, kit, rng)
  let s = newBattle(enemy, st, rng)
  let mp = 100
  let revive = false
  let boost = false
  const bag = [...(kit?.items ?? [])]
  const use = (id) => {
    const e = itemOf(id).effect
    if (e.battleStat) { st = { ...st }; for (const [k, v] of Object.entries(e.battleStat)) st[k] = (st[k] || 0) + v }
    if (e.revive) revive = true
    if (e.boost) boost = true
    const heal = (e.hp || 0) + (e.giveHp ? e.giveHp.self : 0)
    if (heal) s = { ...s, php: Math.min(s.phpMax, s.php + heal) }
    if (e.mp || e.giveMp) mp = Math.min(100, mp + (e.mp || 0) + (e.giveMp ? e.giveMp.self : 0))
    s = applyItemToBattle(s, { ...e, cleanse: e.cleanse || e.giveCleanse }, { rng }).state
  }
  const init = rollInitiative(s.enemy, st, rng)
  let phase = init.playerFirst ? 'player' : 'enemy'
  let turns = 0
  for (let step = 0; step < 400 && !s.over; step++) {
    if (phase === 'enemy') {
      const r = enemyTurn(s, { stats: st, mp, reduction: s.earthReduction || 0 }, rng)
      mp = Math.max(0, mp - (r.mpDrain || 0))
      s = r.state
      if ((s.pendingDeath || s.over === 'lose') && revive) { s = { ...s, php: 1, pendingDeath: false, over: null }; revive = false }
      if (s.over) break
      if (s.pendingDeath) { const sv = resolveSurvive(s, true, mp, st, rng); mp -= sv.mpCost || 0; s = sv.state; if (s.over) break }
      phase = 'player'
      continue
    }
    turns++
    s = playerTurnStart(s, rng).state
    if (s.pstun > 0) { s = { ...s, pstun: s.pstun - 1, bound: false }; phase = 'enemy'; continue }
    // 아이템(턴과 상관없이): 첫 턴에 공격·부활 아이템, 체력 40% 아래에서 회복 아이템
    for (let i = bag.length - 1; i >= 0; i--) {
      const e = itemOf(bag[i]).effect
      const healer = (e.hp || e.giveHp) && !e.revive && !e.battleStat && !e.enemyHit && !e.charms
      if ((turns === 1 && !healer) || (healer && s.php < s.phpMax * 0.4)) { use(bag[i]); bag.splice(i, 1) }
    }
    let choice = (s.ps?.forceRash || 0) > 0 || rollRash(st, rng).hit ? { action: 'attack', forced: true } : pickSolo(s, mp, st)
    const pre = beforePlayer(s, choice.action, { mp }, rng)
    if (pre.failed) { s = pre.state; phase = 'enemy'; continue }
    s = pre.state
    if (pre.action !== choice.action) choice = { action: pre.action, scanAmount: 1 }
    const buff = !!choice.buff && (choice.action === 'attack' || choice.action === 'charm')
    let r = playerTurn(s, choice.action, { stats: st, mp, boost, noRash: true, buff, scanAmount: choice.scanAmount, forced: choice.forced }, rng)
    if (r.invalid) r = playerTurn(s, 'attack', { stats: st, mp, boost, noRash: true }, rng)
    r = afterPlayer(s, r, { action: choice.action, mp }, rng)
    if (r.boostUsed) boost = false
    mp = Math.max(0, mp - (r.mpCost || 0))
    s = r.state
    phase = 'enemy'
  }
  return { win: s.over === 'win', ehpFrac: Math.max(0, s.ehp) / s.enemy.hp, hpFrac: Math.max(0, s.php) / s.phpMax, rounds: turns }
}

// ───────── 다인 · 보스 전투 (mbattle.js) ─────────
function pickMB(mb, m) {
  const q0 = mb.known > 0 ? mb.queue[0] : null
  if (mb.known === 0 && m.mp >= mpCostOf(m.stats, 3) + 1 && mb.members.find((x) => x.status === 'alive')?.id === m.id) return { action: 'scan', scanAmount: 3 }
  if ((q0 === 'smash' || q0 === 'group') && !m.bound && m.php < m.phpMax * 0.6) return { action: 'guard' }
  if (m.charms > 0 && (q0 === 'guard' || m.mp >= 30)) return { action: 'charm' }
  return { action: 'attack', buff: m.mp >= mpCostOf(m.stats, BUFF_COST) + 6 }
}
export function partyRun(enemy, S, kit, seed) {
  const rng = rngOf(seed)
  const n = enemy.partySize || 2
  const bring = {}
  for (const id of kit?.items ?? []) bring[id] = (bring[id] || 0) + 1
  const members = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, stats: statsOf(S, kit, rng), mp: 100, mpMax: 100, psychics: [], ...(enemy.boss ? { bring: { ...bring } } : {}) }))
  const mb = MB.createMB(enemy, members, rng)
  const bags = Object.fromEntries(members.map((m) => [m.id, [...(kit?.items ?? [])]]))
  MB.openingInitiative(mb, rng)
  if (mb.phase === 'input' && !mb.turn) MB.beginRound(mb, rng)
  for (let g = 0; g < 6000 && !mb.over; g++) {
    if (mb.phase === 'survive') { for (const p of MB.pendingSurvivors(mb)) MB.survive(mb, p.id, true, rng); continue }
    if (MB.ready(mb)) { MB.resolveTurn(mb, rng); continue }
    const w = MB.waitingOn(mb)[0]
    if (!w) break
    const bag = bags[w.id]
    for (let i = bag.length - 1; i >= 0; i--) {
      const item = itemOf(bag[i])
      const e = item.effect
      const alive = mb.members.filter((x) => x.status === 'alive')
      const teamLow = alive.reduce((a, x) => a + x.php / x.phpMax, 0) / Math.max(1, alive.length) < 0.55
      const healer = (e.hp || e.giveHp) && !e.revive && !e.battleStat && !e.enemyHit && !e.charms
      const partyHeal = (e.partyHp || e.partyMp) && !e.partyStat && !e.partyCharms && !e.partyCleanse
      const now = mb.round <= 1 ? !healer && !partyHeal : (healer && w.php < w.phpMax * 0.4) || (partyHeal && teamLow)
      if (!now) continue
      const r = MB.useItemMB(mb, w.id, item, w.id)
      if (r.ok || r.error === 'already') bag.splice(i, 1)
      if (w.act) break // 턴을 쓰는 아이템이면 이번 차례는 끝
    }
    if (w.act || mb.phase !== 'input' || mb.turn !== w.id) continue
    const r = MB.submit(mb, w.id, pickMB(mb, w))
    if (r.error) MB.submit(mb, w.id, { action: 'attack' })
  }
  const alive = mb.members.filter((x) => x.status === 'alive')
  return { win: mb.over === 'win', ehpFrac: Math.max(0, mb.ehp) / mb.enemy.hp, hpFrac: alive.reduce((a, x) => a + x.php / x.phpMax, 0) / n, rounds: mb.round }
}

// ───────── 측정 · 보정 ─────────
export function measure(enemy, k, kit, runs, seed0 = 1) {
  const e = scaled(enemy, k)
  const S = recStatOf(enemy)
  const run = (enemy.partySize || 1) > 1 ? partyRun : soloRun
  let wins = 0, M = 0, rounds = 0
  for (let i = 0; i < runs; i++) {
    const r = run(e, S, kit, seed0 + i * 7919)
    if (r.win) wins++
    M += r.win ? 1 + r.hpFrac * 0.5 : 1 - r.ehpFrac
    rounds += r.rounds
  }
  return { win: wins / runs, M: M / runs, rounds: rounds / runs }
}
export function calibrate(enemy, runs) {
  const S = recStatOf(enemy)
  const kit = kitFor(S, { party: (enemy.partySize || 1) > 1, slots: enemy.boss ? 3 : (enemy.partySize || 1) > 1 ? 2 : 1 })
  const base = measure(enemy, 1, null, runs)
  const withKit = measure(enemy, 1, kit, runs)
  let lo = 1.0, hi = 2.5, best = { k: 1, ...withKit }
  if (withKit.M <= base.M + 0.01) return { enemy: enemy.id, S, kit, base, withKit, k: 1, after: withKit }
  for (let i = 0; i < 9; i++) {
    const k = (lo + hi) / 2
    const r = measure(enemy, k, kit, runs)
    best = Math.abs(r.M - base.M) < Math.abs(best.M - base.M) ? { k, ...r } : best
    if (r.M > base.M) lo = k
    else hi = k
  }
  return { enemy: enemy.id, S, kit, base, withKit, k: Math.round(best.k * 100) / 100, after: best }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const runs = Number(args[args.indexOf('--runs') + 1]) || 1500
  const out = args.includes('--json') ? args[args.indexOf('--json') + 1] : null
  const ids = args.filter((a, i) => !a.startsWith('--') && !['--runs', '--json'].includes(args[i - 1]))
  const list = ids.length ? ALL_ENEMIES.filter((e) => ids.includes(e.id)) : ALL_ENEMIES
  const results = []
  for (const e of list) {
    const t = Date.now()
    const r = calibrate(e, runs)
    results.push(r)
    console.log(`${e.id.padEnd(18)} T${e.tier} S${r.S} k=${r.k.toFixed(2)}  win ${(r.base.win * 100).toFixed(0)}% → (kit) ${(r.withKit.win * 100).toFixed(0)}% → (조정) ${(r.after.win * 100).toFixed(0)}%  M ${r.base.M.toFixed(3)}/${r.withKit.M.toFixed(3)}/${r.after.M.toFixed(3)}  kit=${[r.kit.body, r.kit.trinket, r.kit.daily, ...r.kit.items].filter(Boolean).join(',')}  ${((Date.now() - t) / 1000).toFixed(1)}s`)
    if (out) writeFileSync(out, JSON.stringify(results, null, 1))
  }
}
