// v-B.18 퀘스트 엔진: 바리(도깨비 증표) · [의뢰] NPC 부탁 · 엑스트라 랜덤 부탁 · 동아리별 주간 납품/토벌.
//
// 저장 모양(player.quests):
//   active: [{ uid, src: 'bari'|'npc'|'extra', npc, tpl, title, who, zone, goal: { type, id, n, unit, key, where }, have, reward, at, until }]
//   bari:   { used: 밤 키 }            — 그 밤에 한 건을 끝냈거나 포기했다(다음 밤까지 새 부탁 없음)
//   npc:    { [npcId]: { used: 날 키 } } — 그 날 그 NPC 의 부탁을 끝냈거나 포기했다
//   extra:  { day: 날 키, rolls: n, acceptedDay } — 오늘 엑스트라를 마주친 횟수 · 마지막으로 받아들인 날
//   seq:    uid 번호
// 목표 진행: 처치 · 놀이 · 개척 · 방문은 받은 뒤부터 센다(have). 납품은 건넬 때 소지품을 본다.
// 시간 기준은 한국 시각: 날 = 매일 0시, 바리의 밤 = 오후 6시 ~ 다음 날 오전 6시(정오 기준으로 같은 밤).
import { itemOf, countOf, GOBLIN_TOKEN } from './items.js'
import { canAddInventory } from './inventoryCapacity.js'
import { enemyById } from './battle.js'
import { clampSpirit } from './constants.js'
import { dayStartOf, ensureWeekly, setClubTasks, setWeekInit } from './clubQuests.js'
import { clubOf } from './clubs.js'
import { playerS, statsS, questStats, tierForS, pickItemFor, pickEnemyFor, canFight, fightableEnemies, makeAccess, scaledCount, whereToFight, whereShort, MONEY_T, SPIRIT_T } from './questLevels.js'
import { BARI_QUESTS, BARI_LINES, NPC_QUESTS, QUEST_NPCS, CLUB_TASK_DATA, EXTRA_QUESTS, EXTRA_ZONES, EXTRA_QUEST_DAYS } from './questData.js'

export { BARI_LINES, BARI_NPC, QUEST_NPCS, NPC_IDLE, EXTRA_ZONES, EXTRA_QUEST_DAYS } from './questData.js'

const HOUR = 3600 * 1000
const DAY = 24 * HOUR
export const dayKeyOf = (now = Date.now()) => dayStartOf(now)
export const nightKeyOf = (now = Date.now()) => dayStartOf(now - 12 * HOUR)

// 엑스트라: 도착할 때 이 확률로 마주친다. 하루에 받아들일 수 있는 건 한 건(받아들이면 그날은 더 뜨지 않는다).
// 지나친 만남까지 합쳐 하루에 마주치는 건 다섯 번까지, 받아 둔 부탁은 기한(3일) 안에 셋까지.
// v-B.18: 엑스트라 부탁은 데이터 · 구현을 남겨 둔 채 게임에서는 꺼 둔다. 다시 켜려면 true.
export const EXTRA_ENABLED = false
export const EXTRA_CHANCE = 0.1
export const EXTRA_DAILY_ACCEPT = 1
export const EXTRA_MAX_ACTIVE = 3
export const EXTRA_DAILY_ROLLS = 5
/** 오늘 이미 엑스트라의 부탁을 받아들였는가 */
export const extraAcceptedToday = (p, now = Date.now()) => questState(p).extra.acceptedDay === dayKeyOf(now)

// ───────── 작은 도구 ─────────
function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function seededRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed))
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const seedOf = (p) => `${p?.name ?? ''}|${p?.createdAt ?? ''}`
/** 정해진 rng 로 섞는다(피셔-예이츠) */
function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const JOSA = { 을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'] }
const batchim = (word) => {
  const c = String(word).trim().slice(-1).charCodeAt(0) - 0xac00
  if (c < 0 || c > 11171) return -1
  return c % 28
}
/** 받침에 맞는 조사 */
export function josa(word, j) {
  const pair = JOSA[j]
  if (!pair) return `${word}${j}`
  const b = batchim(word)
  if (pair[0] === '으로') return `${word}${b > 0 && b !== 8 ? '으로' : '로'}`
  return `${word}${b > 0 ? pair[0] : pair[1]}`
}
/** 글 안의 {자리표}를 채운다. {key|조사} 는 받침에 맞춰 조사를 붙인다. */
export function fillText(text, vars = {}) {
  return String(text ?? '').replace(/\{(\w+)(?:\|([가-힣]+))?\}/g, (m, key, j) => {
    const v = vars[key]
    if (v == null) return m
    return j ? josa(v, j) : String(v)
  })
}

const UNIT_OF = { kill: '번', play: '판', pioneer: '번', visit: '번' }
// 물건을 세는 말(없으면 '개')
export const ITEM_UNIT = { 'acorn-jelly': '모', 'rice-grain': '알', 'five-color-thread': '타래', hanji: '장', 'yarn-ball': '뭉치', 'lake-water': '병' }
const unitOf = (id, fallback) => fallback ?? ITEM_UNIT[id] ?? '개'
const enemyName = (id) => enemyById(id)?.name ?? id
const itemName = (id) => itemOf(id)?.name ?? id

/** 퀘스트 상태(빈 칸은 채워서) */
export function questState(p) {
  const q = p?.quests ?? {}
  return { active: Array.isArray(q.active) ? q.active : [], bari: q.bari ?? {}, npc: q.npc ?? {}, extra: q.extra ?? {}, seq: q.seq ?? 0 }
}
const withQuests = (p, q) => ({ ...p, quests: q })

// ───────── 템플릿 → 실제 부탁 ─────────
function eligible(tpl, S) {
  if (tpl.minS != null && S < tpl.minS) return false
  if (tpl.maxS != null && S > tpl.maxS) return false
  return true
}

/** 목표를 지금 수준에 맞게 정한다. 정할 수 없으면 null */
export function resolveGoal(goal, p, rng = Math.random, { needHave = false } = {}) {
  const stats = questStats(p)
  const S = statsS(stats)
  if (goal.type === 'kill') {
    // 정해진 적이면 지금 이길 만할 때만, 아니면 지금 이길 만한 적 가운데 가장 높은 단계에서 고른다.
    const e = goal.enemy ? enemyById(goal.enemy) : pickEnemyFor(S, rng, { easier: goal.easier })
    if (!e || (goal.enemy && !canFight(e, S))) return null
    return { type: 'kill', id: e.id, n: goal.n, unit: '번' }
  }
  if (goal.type === 'deliver') {
    if (needHave) {
      const list = goal.item ? [[goal.item, goal.n]] : goal.pool
      const held = list.filter(([id, n]) => itemOf(id) && countOf(p, id) >= n)
      if (!held.length) return null
      const [id, n] = held[Math.floor(rng() * held.length)]
      return { type: 'deliver', id, n, unit: unitOf(id, goal.unit) }
    }
    if (goal.item) {
      // 정해진 물건이면 지금 무난히 구할 수 있을 때만. 귀한 물건이면 개수를 줄인다.
      const a = itemOf(goal.item) ? makeAccess(stats)(goal.item) : { ok: false }
      if (!a.ok) return null
      return { type: 'deliver', id: goal.item, n: scaledCount(goal.n, a), unit: unitOf(goal.item, goal.unit) }
    }
    const pick = pickItemFor(stats, goal.pool, rng)
    if (!pick) return null
    return { type: 'deliver', id: pick.id, n: pick.n, unit: unitOf(pick.id, goal.unit) }
  }
  if (goal.type === 'visit') return { type: 'visit', key: goal.key, where: goal.where, n: 1, unit: '번' }
  if (goal.type === 'play' || goal.type === 'pioneer') return { type: goal.type, n: goal.n, unit: UNIT_OF[goal.type] }
  return null
}

/**
 * 바리: 처치는 지금 이길 만한 적 가운데 가장 높은 단계면 2개,
 * 납품은 지금 수준에 가까운 물건(score ≥ 0.6)이거나 귀한 물건(한 번에 0.5개 미만)이면 2개, 나머지는 1개.
 */
export function bariTokens(goal, p) {
  const stats = questStats(p)
  const S = statsS(stats)
  if (goal.type === 'kill') {
    const top = Math.max(1, ...fightableEnemies(S).map((e) => e.tier))
    return (enemyById(goal.id)?.tier ?? 0) >= top ? 2 : 1
  }
  if (goal.type === 'deliver') {
    const a = makeAccess(stats)(goal.id)
    return a.score >= 0.6 || a.y < 0.5 ? 2 : 1
  }
  return 1
}

function moneyReward(p, mult = 1, extra = {}) {
  const t = tierForS(playerS(p))
  return { money: Math.max(1, Math.round(MONEY_T[t] * mult)), spirit: Math.max(1, Math.round(SPIRIT_T[t] * mult)), ...extra }
}

/** 보상 한 줄 */
export function rewardLine(r) {
  if (!r) return ''
  const parts = []
  if (r.token) parts.push(`도깨비 증표 ${r.token}개`)
  if (r.money) parts.push(`${r.money}냥`)
  if (r.spirit) parts.push(`영력 +${r.spirit}`)
  for (const [id, n] of Object.entries(r.items ?? {})) parts.push(`${itemName(id)}${n > 1 ? ` ×${n}` : ''}`)
  if (r.affinity) parts.push(`호감도 +${r.affinity}`)
  return parts.join(' · ')
}

/** 글에 넣을 값 */
export function questVars(goal, p, extra = {}) {
  const v = { name: p?.name ?? '', n: goal?.n ?? 1, unit: goal?.unit ?? '개', ...extra }
  if (goal?.type === 'kill') { v.enemy = enemyName(goal.id); v.where = whereShort(goal.id) }
  if (goal?.type === 'deliver') { v.item = itemName(goal.id); v.have = Math.min(countOf(p, goal.id), goal.n) }
  if (goal?.type === 'visit') v.where = goal.where
  return v
}

// ───────── 전하기(다른 사람에게 대신 건네는 부탁) ─────────
// 템플릿의 relay: { to, button, line, caption } → 받은 부탁에 relay: { to } · relayed 가 붙는다.
// 그 사람에게 직접 건네면(물건이 빠짐) relayed = true, 그 뒤 부탁한 사람에게 [보고한다]로 마친다.
export const RELAY_TARGETS = {
  bari: { name: '바리', where: '뒷산 · 산 탐사 · 오른길 · 캠핑장 (오후 6시 ~ 오전 6시)' },
  danae: { name: '오단애', where: '별관 2층 · 조리실' },
}
export const relayPending = (q) => !!q?.relay && !q.relayed

/** 목표 한 줄 */
export function goalLine(goal, relay = null) {
  if (!goal) return ''
  if (goal.type === 'kill') return `${enemyName(goal.id)} ${goal.n}번 쓰러뜨리기 · ${whereToFight(goal.id)}`
  if (goal.type === 'deliver' && relay?.to && RELAY_TARGETS[relay.to]) return `${itemName(goal.id)} ${goal.n}${goal.unit ?? '개'}을(를) ${RELAY_TARGETS[relay.to].name}에게 전하기 · ${RELAY_TARGETS[relay.to].where}`
  if (goal.type === 'deliver') return `${itemName(goal.id)} ${goal.n}${goal.unit ?? '개'} 건네기`
  if (goal.type === 'play') return `도깨비 농장에서 도깨비들과 ${goal.n}판 놀기 · 뒷산 · 산 탐사 · 왼길`
  if (goal.type === 'pioneer') return `개척 ${goal.n}번 하기`
  if (goal.type === 'visit') return `${goal.where} 가 보기`
  return ''
}

/** [지금, 목표] */
export function questProgress(q, p) {
  const n = q.goal?.n ?? 1
  if (q.relay && q.relayed) return [n, n] // 이미 전했다
  if (q.goal?.type === 'deliver') return [Math.min(countOf(p, q.goal.id), n), n]
  return [Math.min(q.have || 0, n), n]
}
export const questReady = (q, p) => { if (relayPending(q)) return false; const [a, b] = questProgress(q, p); return a >= b }
/** 전할 물건을 다 갖고 있어 지금 전할 수 있는가 */
export const canRelay = (q, p) => relayPending(q) && q.goal?.type === 'deliver' && countOf(p, q.goal.id) >= q.goal.n
export const questExpired = (q, now = Date.now()) => q.until != null && now > q.until

const tplOf = (q) => {
  if (q.src === 'bari') return BARI_QUESTS.find((t) => t.id === q.tpl)
  if (q.src === 'npc') return NPC_QUESTS[q.npc]?.find((t) => t.id === q.tpl)
  if (q.src === 'extra') return EXTRA_QUESTS.find((t) => t.id === q.tpl)
  return null
}
/** 그 부탁의 대사 · 지문(자리표 채움). kind: offer · accept · progress · done · relay(전해 받은 사람의 반응) */
export function questLine(q, p, kind) {
  const t = tplOf(q)
  if (!t) return null
  if (kind === 'progress' && q.relay && q.relayed && t.relayed) kind = 'relayed' // 전하고 돌아왔을 때
  const raw = q.src === 'extra' ? { offer: t.text, accept: t.acceptText, done: t.doneText ?? t.acceptText, decline: t.declineText }[kind] : kind === 'relay' ? t.relay?.line : t[kind]
  if (!raw) return null
  const [have, n] = questProgress(q, p)
  const vars = questVars(q.goal, p, { left: Math.max(0, n - have) })
  if (typeof raw === 'string') return { face: 'plain', text: fillText(raw, vars) }
  return { face: raw.face ?? 'plain', text: fillText(raw.text, vars) }
}

/** 받은 부탁 중 기한이 지난 엑스트라를 치운다. */
export function pruneQuests(p, now = Date.now()) {
  const q = questState(p)
  const active = q.active.filter((x) => !questExpired(x, now))
  if (active.length === q.active.length) return p
  return withQuests(p, { ...q, active })
}

// ───────── 바리 ─────────
export function bariActive(p) {
  return questState(p).active.find((x) => x.src === 'bari') ?? null
}
/** 오늘 밤 바리가 내미는 부탁(아직 받지 않은 것). 이미 받았거나 오늘 밤 끝냈으면 null */
export function bariOffer(p, now = Date.now()) {
  const st = questState(p)
  const night = nightKeyOf(now)
  if (st.active.some((x) => x.src === 'bari') || st.bari.used === night) return null
  const S = playerS(p)
  const rng = seededRng(`${seedOf(p)}|bari|${night}`)
  const pool = BARI_QUESTS.filter((t) => eligible(t, S))
  // 고른 템플릿이 지금 못 하는 것(구할 수 없는 물건 등)이면 다음 후보로 넘어간다.
  const order = shuffled(pool, rng)
  for (const t of order) {
    const goal = resolveGoal(t.goal, p, rng)
    if (!goal) continue
    return { src: 'bari', tpl: t.id, title: t.title, goal, reward: { token: bariTokens(goal, p) } }
  }
  return null
}
export const bariDoneTonight = (p, now = Date.now()) => questState(p).bari.used === nightKeyOf(now)

// ───────── NPC ─────────
export function npcActive(p, npcId) {
  return questState(p).active.find((x) => x.src === 'npc' && x.npc === npcId) ?? null
}
export function npcOffer(p, npcId, now = Date.now()) {
  const st = questState(p)
  const day = dayKeyOf(now)
  if (st.active.some((x) => x.src === 'npc' && x.npc === npcId) || st.npc[npcId]?.used === day) return null
  const list = NPC_QUESTS[npcId] ?? []
  const S = playerS(p)
  const rng = seededRng(`${seedOf(p)}|npc|${npcId}|${day}`)
  const order = shuffled(list.filter((t) => eligible(t, S)), rng)
  for (const t of order) {
    const goal = resolveGoal(t.goal, p, rng, { needHave: !!t.needHave })
    if (!goal) continue
    return { src: 'npc', npc: npcId, tpl: t.id, title: t.title, goal, reward: moneyReward(p, t.mult ?? 1, { affinity: 2 }), ...(t.relay ? { relay: { to: t.relay.to } } : {}) }
  }
  return null
}
export const npcDoneToday = (p, npcId, now = Date.now()) => questState(p).npc[npcId]?.used === dayKeyOf(now)

// ───────── 엑스트라 ─────────
/** 도착할 때 굴린다. { player, enc } — enc 가 없으면 아무 일도 없다. (마주친 횟수는 player 에 남는다) */
export function rollExtra(p, zone, now = Date.now(), rng = Math.random, { force = false } = {}) {
  if (!EXTRA_ENABLED && !force) return { player: p, enc: null } // 꺼 둠(테스트는 force)
  if (!EXTRA_ZONES.includes(zone)) return { player: p, enc: null }
  let pp = pruneQuests(p, now)
  const st = questState(pp)
  const day = dayKeyOf(now)
  const rolls = st.extra.day === day ? st.extra.rolls || 0 : 0
  if (st.extra.acceptedDay === day) return { player: pp, enc: null } // 오늘은 이미 한 건 받아들였다
  if (rolls >= EXTRA_DAILY_ROLLS) return { player: pp, enc: null }
  if (st.active.filter((x) => x.src === 'extra').length >= EXTRA_MAX_ACTIVE) return { player: pp, enc: null }
  if (rng() >= EXTRA_CHANCE) return { player: pp, enc: null }
  const enc = pickExtra(pp, zone, rng)
  if (!enc) return { player: pp, enc: null }
  pp = withQuests(pp, { ...st, extra: { ...st.extra, day, rolls: rolls + 1 } })
  return { player: pp, enc }
}

/** 그 구역에서 지금 나올 수 있는 엑스트라 하나(받아 둔 것과 같은 건 빼고) */
export function pickExtra(p, zone, rng = Math.random) {
  const st = questState(p)
  const taken = new Set(st.active.filter((x) => x.src === 'extra').map((x) => x.tpl))
  const cands = shuffled(EXTRA_QUESTS.filter((t) => (t.zone === zone || t.zone == null) && !taken.has(t.id)), rng)
  for (const t of cands) {
    const enc = resolveExtra(t, p, zone, rng)
    if (enc) return enc
  }
  return null
}
export function resolveExtra(t, p, zone, rng = Math.random) {
  if (t.kind === 'give') {
    if (countOf(p, t.cost.item) < t.cost.n) return null
    return { src: 'extra', tpl: t.id, zone, who: t.who, title: t.title, kind: 'give', cost: t.cost, reward: moneyReward(p, t.mult ?? 0.5, t.item ? { items: { [t.item[0]]: t.item[1] } } : {}) }
  }
  if (t.kind === 'mp') {
    if ((p.mp ?? 0) < t.cost.mp) return null
    return { src: 'extra', tpl: t.id, zone, who: t.who, title: t.title, kind: 'mp', cost: t.cost, reward: moneyReward(p, t.mult ?? 0.5) }
  }
  const goal = resolveGoal(t.goal, p, rng, { needHave: !!t.needHave })
  if (!goal) return null
  return { src: 'extra', tpl: t.id, zone, who: t.who, title: t.title, kind: 'quest', goal, reward: moneyReward(p, t.mult ?? 0.8) }
}
/** 마주친 장면의 글 */
export function extraText(enc, p, kind = 'offer') {
  const t = EXTRA_QUESTS.find((x) => x.id === enc.tpl)
  if (!t) return ''
  const raw = { offer: t.text, accept: t.acceptText, decline: t.declineText, done: t.doneText ?? t.acceptText }[kind]
  const vars = enc.goal ? questVars(enc.goal, p, { left: enc.goal.n }) : { name: p?.name ?? '' }
  return fillText(raw, vars)
}

// ───────── 받기 · 건네기 · 포기 ─────────
function pushActive(p, offer, now) {
  const st = questState(p)
  const uid = `q${st.seq + 1}`
  const rec = { uid, src: offer.src, npc: offer.npc ?? null, tpl: offer.tpl, title: offer.title, who: offer.who ?? null, zone: offer.zone ?? null, goal: offer.goal, have: 0, reward: offer.reward, at: now }
  if (offer.relay) { rec.relay = { to: offer.relay.to }; rec.relayed = false }
  if (offer.src === 'extra') rec.until = now + EXTRA_QUEST_DAYS * DAY
  return { player: withQuests(p, { ...st, active: [...st.active, rec], seq: st.seq + 1 }), quest: rec }
}

export function acceptBari(p, now = Date.now()) {
  const offer = bariOffer(p, now)
  if (!offer) return { error: bariActive(p) ? '이미 바리의 부탁을 받았다.' : '오늘 밤 바리의 부탁은 끝났다.' }
  const r = pushActive(p, offer, now)
  return { ...r, log: `바리의 부탁을 받았다: [${offer.title}] ${goalLine(offer.goal)}` }
}
export function acceptNpc(p, npcId, now = Date.now()) {
  const offer = npcOffer(p, npcId, now)
  const npc = QUEST_NPCS.find((n) => n.id === npcId)
  if (!offer || !npc) return { error: '지금은 받을 수 있는 부탁이 없다.' }
  const r = pushActive(p, offer, now)
  return { ...r, log: `${npc.name}의 부탁을 받았다: [${offer.title}] ${goalLine(offer.goal)}` }
}
/** 엑스트라를 받아들인다(하루 한 건). 그 자리에서 끝나는 것(의지력 · 물건)은 곧바로 보상까지 받는다. */
export function acceptExtra(p, enc, now = Date.now()) {
  if (!enc || enc.src !== 'extra') return { error: '그런 부탁이 없다.' }
  if (extraAcceptedToday(p, now)) return { error: '오늘은 이미 다른 부탁을 받아들였다. 내일 다시 마주칠지도 모른다.' }
  const r = acceptExtraOnce(p, enc, now)
  if (r.error) return r
  const st = questState(r.player)
  return { ...r, player: withQuests(r.player, { ...st, extra: { ...st.extra, acceptedDay: dayKeyOf(now) } }) }
}
function acceptExtraOnce(p, enc, now) {
  if (enc.kind === 'mp') {
    if ((p.mp ?? 0) < enc.cost.mp) return { error: `의지력이 모자란다. (의지력 ${enc.cost.mp} 필요)` }
    const g = grant({ ...p, mp: p.mp - enc.cost.mp }, enc.reward)
    if (g.error) return g
    return { player: g.player, instant: true, text: extraText(enc, p, 'accept'), log: `${josa(enc.who, '을')} 도왔다. 의지력 -${enc.cost.mp} · ${rewardLine(enc.reward)}` }
  }
  if (enc.kind === 'give') {
    if (countOf(p, enc.cost.item) < enc.cost.n) return { error: `${josa(itemName(enc.cost.item), '이')} 모자란다.` }
    const g = grant({ ...p, inventory: take(p.inventory, enc.cost.item, enc.cost.n) }, enc.reward)
    if (g.error) return g
    return { player: g.player, instant: true, text: extraText(enc, p, 'accept'), log: `${enc.who}에게 ${itemName(enc.cost.item)} ${enc.cost.n}${unitOf(enc.cost.item)}을(를) 건넸다. ${rewardLine(enc.reward)}` }
  }
  const st = questState(p)
  if (st.active.filter((x) => x.src === 'extra').length >= EXTRA_MAX_ACTIVE) return { error: `엑스트라의 부탁은 ${EXTRA_MAX_ACTIVE}개까지 받아 둘 수 있다.` }
  const r = pushActive(p, enc, now)
  return { ...r, text: extraText(enc, p, 'accept'), log: `${enc.who}의 부탁을 받았다: [${enc.title}] ${goalLine(enc.goal)} (${EXTRA_QUEST_DAYS}일 안에)` }
}

const take = (inv, id, n) => {
  const next = { ...(inv ?? {}) }
  next[id] = (next[id] || 0) - n
  if (next[id] <= 0) delete next[id]
  return next
}
/** 보상 지급. 소지품이 모자라면 { error } */
function grant(p, r) {
  const items = { ...(r.items ?? {}) }
  if (r.token) items[GOBLIN_TOKEN] = (items[GOBLIN_TOKEN] || 0) + r.token
  if (Object.keys(items).length && !canAddInventory(p.inventory ?? {}, items)) return { error: '소지품이 가득 차 보상을 받을 수 없다. 빈 칸을 만든 뒤 다시 건네 주세요.' }
  const inventory = { ...(p.inventory ?? {}) }
  for (const [id, n] of Object.entries(items)) inventory[id] = (inventory[id] || 0) + n
  const affinity = r.affinity && r.npc ? { ...(p.affinity ?? {}), [r.npc]: (p.affinity?.[r.npc] || 0) + r.affinity } : p.affinity
  return { player: clampSpirit({ ...p, money: (p.money ?? 0) + (r.money || 0), spirit: (p.spirit ?? 0) + (r.spirit || 0), inventory, ...(affinity ? { affinity } : {}) }) }
}

/** 받은 부탁을 마친다. via: 'bari'(캠핑장) | 'board'([의뢰]) — 바리의 부탁은 바리에게만 건넨다. */
export function turnInQuest(p, uid, now = Date.now(), { via = 'board' } = {}) {
  const pp = pruneQuests(p, now)
  const st = questState(pp)
  const q = st.active.find((x) => x.uid === uid)
  if (!q) return { error: questState(p).active.some((x) => x.uid === uid) ? '기한이 지나 부탁이 사라졌다.' : '그런 부탁이 없다.' }
  if (q.src === 'bari' && via !== 'bari') return { error: '바리의 부탁은 캠핑장의 바리에게 건넨다. (오후 6시 ~ 오전 6시)' }
  if (relayPending(q)) { const t = RELAY_TARGETS[q.relay.to]; return { error: `먼저 ${t?.name ?? '그 사람'}에게 직접 전해야 한다. (${t?.where ?? ''})` } }
  if (!questReady(q, pp)) return { error: '아직 부탁을 다 들어주지 못했다.' }
  let next = pp
  if (q.goal.type === 'deliver' && !q.relay) next = { ...next, inventory: take(next.inventory, q.goal.id, q.goal.n) } // 전하는 부탁은 전할 때 이미 빠졌다
  const g = grant(next, { ...q.reward, npc: q.npc })
  if (g.error) return g
  const active = st.active.filter((x) => x.uid !== uid)
  const marks = {}
  if (q.src === 'bari') marks.bari = { ...st.bari, used: nightKeyOf(now) }
  if (q.src === 'npc') marks.npc = { ...st.npc, [q.npc]: { used: dayKeyOf(now) } }
  const line = questLine(q, pp, 'done')
  const from = q.src === 'bari' ? '바리' : q.src === 'npc' ? QUEST_NPCS.find((n) => n.id === q.npc)?.name : q.who
  return { player: withQuests(g.player, { ...st, ...marks, active }), quest: q, line, log: `${from}의 부탁 [${q.title}]을(를) 마쳤다. ${rewardLine(q.reward)}${q.goal.type === 'deliver' && !q.relay ? ` (${itemName(q.goal.id)} ${q.goal.n}${q.goal.unit ?? '개'}을(를) 건넸다)` : ''}` }
}

/** 지금 그 사람(to)에게 전할 수 있는 부탁들 */
export function relaysFor(p, to) {
  return questState(p).active.filter((q) => relayPending(q) && q.relay.to === to)
}
/** 그 사람에게 직접 전한다. 물건이 빠지고, 받은 사람의 반응 대사(line)를 돌려준다. */
export function relayQuest(p, uid, to, now = Date.now()) {
  const st = questState(p)
  const q = st.active.find((x) => x.uid === uid)
  if (!q || !q.relay) return { error: '그런 부탁이 없다.' }
  if (q.relay.to !== to) return { error: `이 부탁은 ${RELAY_TARGETS[q.relay.to]?.name ?? '다른 사람'}에게 전해야 한다.` }
  if (q.relayed) return { error: '이미 전했다.' }
  if (!canRelay(q, p)) return { error: `${josa(itemName(q.goal.id), '이')} 모자란다. (${q.goal.n}${q.goal.unit ?? '개'} 필요)` }
  const next = { ...p, inventory: take(p.inventory, q.goal.id, q.goal.n) }
  const done = { ...q, relayed: true, relayedAt: now }
  const line = questLine(q, p, 'relay')
  const who = QUEST_NPCS.find((n) => n.id === q.npc)?.name ?? ''
  return {
    player: withQuests(next, { ...st, active: st.active.map((x) => (x.uid === uid ? done : x)) }),
    quest: done,
    line,
    log: `${RELAY_TARGETS[to]?.name ?? ''}에게 ${itemName(q.goal.id)} ${q.goal.n}${q.goal.unit ?? '개'}을(를) 전했다. ${who}에게 [의뢰]에서 보고하자.`,
  }
}
/** 전하기 버튼 글자 */
export function relayButton(q, p) {
  const t = tplOf(q)
  return fillText(t?.relay?.button ?? '{item|을} 건넨다', questVars(q.goal, p))
}
export function relayCaption(q) {
  const t = tplOf(q)
  return t?.relay?.caption ?? `${QUEST_NPCS.find((n) => n.id === q.npc)?.name ?? ''}의 부탁 · ${q.title}`
}

/** 포기. 바리 · NPC 는 그 밤/그 날 새 부탁을 받지 않는다. */
export function abandonQuest(p, uid, now = Date.now()) {
  const st = questState(p)
  const q = st.active.find((x) => x.uid === uid)
  if (!q) return { error: '그런 부탁이 없다.' }
  const active = st.active.filter((x) => x.uid !== uid)
  const marks = {}
  if (q.src === 'bari') marks.bari = { ...st.bari, used: nightKeyOf(now) }
  if (q.src === 'npc') marks.npc = { ...st.npc, [q.npc]: { used: dayKeyOf(now) } }
  return { player: withQuests(p, { ...st, ...marks, active }), quest: q, log: `부탁 [${q.title}]을(를) 그만두었다.` }
}

// ───────── 진행 이벤트 ─────────
/**
 * 게임 곳곳에서 부른다.
 *  { type: 'kill', id }   적을 쓰러뜨렸다 (받은 부탁 + 동아리 주간 토벌)
 *  { type: 'play' }       도깨비 농장에서 한 판 놀았다
 *  { type: 'pioneer' }    개척 터에 들어갔다
 *  { type: 'visit', key } 그 장소에 갔다
 */
export function questEvent(p, ev, now = Date.now()) {
  let next = p
  if (ev?.type === 'kill' && ev.id) {
    next = freezeWeek(ensureWeekly(next, now))
    const w = next.weekly
    next = { ...next, weekly: { ...w, kills: { ...(w.kills ?? {}), [ev.id]: ((w.kills ?? {})[ev.id] || 0) + 1 } } }
  }
  const st = questState(next)
  if (!st.active.length) return next
  let changed = false
  const active = st.active.map((q) => {
    if (questExpired(q, now) || (q.have || 0) >= (q.goal?.n ?? 1)) return q
    const g = q.goal
    const hit = g?.type === ev?.type && (g.type === 'kill' ? g.id === ev.id : g.type === 'visit' ? g.key === ev.key : true)
    if (!hit) return q
    changed = true
    return { ...q, have: (q.have || 0) + 1 }
  })
  return changed ? withQuests(next, { ...st, active }) : next
}

/** 지금 [의뢰]에서 건넬 수 있는 부탁 수 (메뉴 표시용) */
export function readyCount(p, now = Date.now()) {
  return questState(p).active.filter((q) => q.src !== 'bari' && !questExpired(q, now) && questReady(q, p)).length
}

// ───────── 동아리별 주간 납품 · 토벌 ─────────
// 그 주가 시작될 때의 퀘스트 스탯을 잠근다(주중에 스탯 · 장비가 바뀌어도 동아리 목표가 흔들리지 않게).
const weekInit = (p) => { const st = questStats(p); return { questS: statsS(st), questStats: st } }
const freezeWeek = (p) => (p.weekly && p.weekly.questStats == null ? { ...p, weekly: { ...p.weekly, ...weekInit(p) } } : p)
setWeekInit(weekInit)

/** 그 주 · 그 동아리의 납품 물건 · 토벌 대상 */
export function clubTask(w, ctx) {
  const clubId = ctx?.clubId
  const data = CLUB_TASK_DATA[clubId]
  if (!data || !w) return null
  const stats = w.questStats ?? questStats(ctx.player)
  const S = statsS(stats)
  const tier = tierForS(S)
  const rng = seededRng(`${w.weekStart}|${clubId}|${STAT_SIG(stats)}`)
  const deliver = pickItemFor(stats, data.deliver, rng)
  const enemy = pickEnemyFor(S, rng)
  return {
    club: clubOf(clubId),
    tier,
    data,
    deliver: deliver ? { type: 'deliver', id: deliver.id, n: deliver.n, unit: unitOf(deliver.id) } : null,
    hunt: enemy ? { type: 'kill', id: enemy.id, n: 3, unit: '번' } : null,
  }
}
const STAT_SIG = (st) => Object.values(st).join(',')
const clubReward = (kind, tier) => (kind === 'deliver' ? { money: 25 + MONEY_T[tier], spirit: 10 + SPIRIT_T[tier] } : { money: 30 + MONEY_T[tier], spirit: 15 + SPIRIT_T[tier] })

setClubTasks({
  label(kind, w, ctx) {
    const t = clubTask(w, ctx)
    if (!t) return null
    if (kind === 'deliver' && t.deliver) return `[${t.club?.name ?? '동아리'}] ${t.data.deliverWhy} ${itemName(t.deliver.id)} ${t.deliver.n}${t.deliver.unit} 납품하기`
    if (kind === 'hunt' && t.hunt) return `[${t.club?.name ?? '동아리'}] ${t.data.huntWhy} ${enemyName(t.hunt.id)} ${t.hunt.n}번 토벌하기 (${whereToFight(t.hunt.id)})`
    return null
  },
  reward(kind, w, ctx) {
    const t = clubTask(w, ctx)
    return t ? clubReward(kind, t.tier) : null
  },
  progress(kind, w, ctx) {
    const t = clubTask(w, ctx)
    if (!t) return [0, 1]
    if (kind === 'deliver' && t.deliver) return [Math.min(countOf(ctx.player ?? {}, t.deliver.id), t.deliver.n), t.deliver.n]
    if (kind === 'hunt' && t.hunt) return [Math.min(w.kills?.[t.hunt.id] || 0, t.hunt.n), t.hunt.n]
    return [0, 1]
  },
  done(kind, w, ctx) {
    const [a, b] = this.progress(kind, w, ctx)
    return !!clubTask(w, ctx) && a >= b
  },
  claim(kind, p, ctx) {
    const w = p.weekly
    const t = clubTask(w, { ...ctx, player: p })
    if (!t) return { error: '동아리에 가입해 있어야 한다.' }
    const r = clubReward(kind, t.tier)
    let next = p
    if (kind === 'deliver') {
      if (!t.deliver || countOf(p, t.deliver.id) < t.deliver.n) return { error: '납품할 물건이 모자란다.' }
      next = { ...next, inventory: take(next.inventory, t.deliver.id, t.deliver.n) }
    } else if (!t.hunt || (w.kills?.[t.hunt.id] || 0) < t.hunt.n) return { error: '아직 토벌을 마치지 못했다.' }
    next = { ...next, money: (next.money ?? 0) + r.money, spirit: (next.spirit ?? 0) + r.spirit }
    const what = kind === 'deliver' ? `${itemName(t.deliver.id)} ${t.deliver.n}${t.deliver.unit} 납품` : `${enemyName(t.hunt.id)} ${t.hunt.n}번 토벌`
    return { player: next, log: `동아리 활동: [${t.club?.name ?? '동아리'}] ${what} 보상을 받았다. 영력 +${r.spirit} · 돈 +${r.money}냥` }
  },
})
