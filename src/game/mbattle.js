/**
 * 다인 전투(여럿이 함께 상대 한 명을 치는 전투)의 순수 로직. 서버가 이 모듈로 판을 진행하고, 클라이언트는 결과(view)만 받는다.
 *
 * 한 라운드: 살아 있는 모두가 행동을 고른다 → 신속이 빠른 순서대로 한 명씩 해결 → 상대가 한 번 움직인다(체력이 가장 많은 사람을 노린다).
 * 개인 판정(명중·피해·돌발·버티기…)은 기존 단독 전투의 함수(playerTurn · enemyTurn · resolveSurvive)를 그대로 쓴다.
 */
import { ENEMIES, enemyTurn, newBattle, pickTarget, playerTurn, psychicTurn, resolveSurvive, rollInitiative, rollRash, maxHp } from './battle.js'

export const MULTI_TAG = '다인 전투'
export const isMulti = (e) => !!e?.tags?.includes(MULTI_TAG)
export const MB_INPUT_MS = 45_000
export const MB_SURVIVE_MS = 20_000
export const MB_LOG_MAX = 80

const STAT_KEYS = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension']
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : lo))

/** 클라이언트가 보낸 스탯을 안전한 정수로 고친다. */
export function cleanStats(raw = {}) {
  const out = {}
  for (const k of Object.keys(raw)) if (typeof raw[k] === 'number') out[k] = clampNum(Math.round(raw[k]), 1, 999)
  for (const k of ['insight', 'aggression', 'endurance', 'control', 'agility']) if (!out[k]) out[k] = 1
  return out
}

export function makeMember({ id, name, stats, hp, hpMax, mp, mpMax, revive, boost }) {
  const st = cleanStats(stats)
  const phpMax = Math.round(clampNum(hpMax ?? maxHp(st), 1, 9999))
  return {
    id,
    name,
    stats: st,
    php: Math.round(clampNum(hp ?? phpMax, 1, phpMax)),
    phpMax,
    mp: Math.floor(clampNum(mp ?? 0, 0, 9999)),
    mpMax: Math.floor(clampNum(mpMax ?? mp ?? 0, 0, 9999)),
    charms: 3,
    guard: false,
    bound: false,
    curse: 0,
    survived: false,
    status: 'alive', // alive | down | fled
    pendingDeath: false,
    revive: !!revive,
    boost: !!boost,
    act: null, // 이번 라운드에 고른 행동 { action, scanAmount?, psychic?, forced? }
  }
}

let logSeq = 1
const tag = (events, by) => events.map((e) => ({ ...e, by, id: logSeq++ }))

export function createMB(enemyId, rawMembers, rng = Math.random) {
  const enemy = ENEMIES.find((e) => e.id === enemyId)
  const members = rawMembers.map(makeMember)
  const base = newBattle(enemy, members[0].stats, rng) // 상대의 행동 큐(여럿이 함께 본다)
  const mb = {
    enemy,
    ehp: enemy.hp,
    queue: base.queue,
    known: 0,
    round: 1,
    phase: 'input', // input | survive | over
    members,
    over: null, // 'win' | 'lose'
    log: [],
  }
  addLog(mb, [{ kind: 'info', text: `${enemy.name}이(가) 나타났다. (${members.length}인 전투: ${members.map((m) => m.name).join(', ')})` }])
  return mb
}

function addLog(mb, events, by = null) {
  const t = tag(events, by)
  mb.log.push(...t)
  if (mb.log.length > MB_LOG_MAX) mb.log.splice(0, mb.log.length - MB_LOG_MAX)
  return t
}

const aliveOf = (mb) => mb.members.filter((m) => m.status === 'alive')
const viewOfMember = (mb, m) => ({
  enemy: mb.enemy,
  ehp: mb.ehp,
  php: m.php,
  phpMax: m.phpMax,
  round: mb.round,
  queue: mb.queue,
  known: mb.known,
  guard: m.guard,
  charms: m.charms,
  bound: m.bound,
  curse: m.curse,
  pendingDeath: false,
  survived: m.survived,
  over: null,
})

/** 시작 선공 판정: 일행에서 가장 신속한 사람의 굴림. 상대가 먼저면 첫 라운드 앞에 상대가 한 번 움직인다. */
export function openingInitiative(mb, rng = Math.random) {
  const lead = [...mb.members].sort((a, b) => b.stats.agility - a.stats.agility)[0]
  const init = rollInitiative(mb.enemy, lead.stats, rng)
  const text = init.auto
    ? `선공 판정: ${lead.name}의 신속 ${lead.stats.agility} ≥ 행동력이라 일행이 먼저 움직인다.`
    : `선공 판정(${lead.name}): d10 ${init.a} + d${lead.stats.agility} ${init.b} = ${init.total} → ${init.playerFirst ? '일행이 먼저 움직인다.' : '상대가 먼저 움직인다!'}`
  const evs = addLog(mb, [{ kind: 'info', text, roll: init.auto ? undefined : init.a }])
  if (!init.playerFirst) evs.push(...enemyPhase(mb, rng))
  return evs
}

/** 라운드 시작: 돌발 판정을 굴리고, 돌발이 터진 사람은 이번 턴 행동이 일반 공격으로 정해진다. */
export function beginRound(mb, rng = Math.random) {
  mb.phase = 'input'
  const evs = []
  for (const m of aliveOf(mb)) {
    m.act = null
    const rr = rollRash(m.stats, rng)
    if (rr.percent > 0) {
      evs.push(...addLog(mb, [{ kind: rr.hit ? 'rash' : 'info', text: `[${m.name}] 돌발 판정 d100 = ${rr.roll} (확률 ${rr.percent}%) → ${rr.hit ? '돌발 행동 발생! 이번 턴엔 무조건 일반 공격.' : '이상 없음'}` }], m.id))
    }
    if (rr.hit) m.act = { action: 'attack', forced: true }
  }
  return evs
}

/** 아직 행동을 고르지 않은 살아 있는 사람 */
export const waitingOn = (mb) => (mb.phase === 'input' ? aliveOf(mb).filter((m) => !m.act) : [])
export const ready = (mb) => mb.phase === 'input' && waitingOn(mb).length === 0

/** 행동 제출. 반환 { ok } 또는 { error } */
export function submit(mb, id, act) {
  const m = mb.members.find((x) => x.id === id)
  if (!m || m.status !== 'alive') return { error: 'not-fighting' }
  if (mb.phase !== 'input') return { error: 'wrong-phase' }
  if (m.act) return { error: 'already' }
  const a = act?.action
  if (!['attack', 'guard', 'charm', 'scan', 'buff', 'psychic'].includes(a)) return { error: 'bad-action' }
  if ((a === 'charm' || a === 'scan' || a === 'buff') && m.mp < 1) return { error: 'no-mp' }
  if (a === 'charm' && m.charms <= 0) return { error: 'no-charm' }
  if (a === 'guard' && m.bound) return { error: 'bound' }
  if (a === 'psychic' && act.psychic !== 'survival') return { error: 'bad-psychic' }
  m.act = { action: a, scanAmount: a === 'scan' ? Math.max(1, Math.min(m.mp, Math.floor(act.scanAmount ?? 1))) : undefined, psychic: act.psychic }
  return { ok: true }
}

/** 시간이 다 되었을 때: 고르지 않은 사람은 막기(막을 수 없으면 일반 공격). */
export function autoFill(mb) {
  for (const m of waitingOn(mb)) m.act = { action: m.bound ? 'attack' : 'guard', auto: true }
}

/** 아이템 효과(전투 중). 반환 { ok, text } 또는 { error } */
export function useItemMB(mb, id, item, targetId) {
  const m = mb.members.find((x) => x.id === id)
  const t = mb.members.find((x) => x.id === (targetId || id))
  if (!m || !t || m.status !== 'alive' || mb.phase === 'over') return { error: 'not-fighting' }
  const e = item?.effect ?? {}
  if (!item?.battle) return { error: 'not-battle-item' }
  if (e.boost) {
    if (t.status !== 'alive') return { error: 'bad-target' }
    if (t.boost) return { error: 'already' }
    t.boost = true
    const who = t.id === m.id ? '자신' : t.name
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) ${who}에게 건넸다. ${t.name}의 다음 행동 피해가 2배가 된다.` }], m.id)
    return { ok: true }
  }
  if (t.id !== m.id) return { error: 'self-only' }
  if (e.revive) {
    if (m.revive) return { error: 'already' }
    m.revive = true
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 마셨다. (전투불능 시 1회 부활 대기)` }], m.id)
    return { ok: true }
  }
  if (e.hp) m.php = Math.min(m.phpMax, m.php + e.hp)
  if (e.mp) m.mp = Math.min(m.mpMax, m.mp + e.mp)
  addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 사용했다.` }], m.id)
  return { ok: true }
}

function finishIfOver(mb) {
  if (mb.over) return true
  if (mb.ehp <= 0) {
    mb.over = 'win'
  } else if (aliveOf(mb).length === 0) {
    mb.over = 'lose'
    addLog(mb, [{ kind: 'end', text: '일행이 모두 쓰러지거나 물러났다. 전투에서 패배했다.' }])
  }
  if (mb.over) mb.phase = 'over'
  return !!mb.over
}

/** 라운드 해결: 각자 행동 → 상대 한 번. 이어서 다음 라운드(또는 버티기 대기/종료)까지 만든다. 반환: 이번에 생긴 로그 */
export function resolveRound(mb, rng = Math.random) {
  const evs = []
  const order = [...aliveOf(mb)].sort((a, b) => b.stats.agility - a.stats.agility || (a.id < b.id ? -1 : 1))
  for (const m of order) {
    if (m.status !== 'alive') continue
    const act = m.act ?? { action: 'guard' }
    const v = viewOfMember(mb, m)
    let r
    if (act.action === 'psychic') {
      r = psychicTurn(v, act.psychic ?? 'survival', { stats: m.stats, mp: m.mp, boost: m.boost }, rng)
      if (r.invalid) r = { state: v, events: [{ kind: 'warn', text: '쓸 수 없는 영능력이다.' }], mpCost: 0 }
    } else {
      r = playerTurn(v, act.action, { stats: m.stats, mp: m.mp, boost: m.boost, scanAmount: act.scanAmount, noRash: true }, rng)
      if (r.invalid) r = { state: v, events: [{ kind: 'warn', text: `[${m.name}] 의지력이 모자라 행동하지 못했다.` }], mpCost: 0 }
    }
    if (r.boostUsed) m.boost = false
    m.mp = Math.max(0, m.mp - (r.mpCost || 0))
    mb.ehp = r.state.ehp
    mb.queue = r.state.queue
    mb.known = r.state.known
    m.guard = r.state.guard
    m.charms = r.state.charms
    m.bound = r.state.bound
    const forced = act.forced ? ' (돌발)' : act.auto ? ' (시간 초과로 막기)' : ''
    evs.push(...addLog(mb, r.events.map((e) => ({ ...e, text: `[${m.name}${forced}] ${e.text}` })), m.id))
    if (r.state.over === 'fled') {
      m.status = 'fled'
      continue
    }
    if (mb.ehp <= 0) {
      mb.over = 'win'
      break
    }
  }
  if (mb.over !== 'win') {
    for (const m of mb.members) m.act = null
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
    evs.push(...enemyPhase(mb, rng))
  } else {
    mb.phase = 'over'
    return evs
  }
  return evs
}

/** 상대가 한 번 움직인다. 반환: 로그. 끝나면 다음 라운드 준비(또는 버티기 대기). */
function enemyPhase(mb, rng) {
  const evs = []
  const alive = aliveOf(mb).filter((m) => m.php > 0)
  if (!alive.length) {
    finishIfOver(mb)
    return evs
  }
  const intent = mb.queue[0]
  const hits = intent === 'jab' || intent === 'smash' || intent === 'special'
  const pick = pickTarget(alive.map((m) => ({ id: m.id, hp: m.php })), rng)
  const t = mb.members.find((m) => m.id === pick.id)
  if (hits) evs.push(...addLog(mb, [{ kind: 'info', text: `▶ ${mb.enemy.name}이(가) ${t.name}을(를) 노린다! (체력이 가장 많은 사람)` }], 'enemy'))
  const v = { ...viewOfMember(mb, t), guard: t.guard }
  const r = enemyTurn(v, { stats: t.stats, mp: t.mp }, rng)
  mb.queue = r.state.queue
  mb.known = r.state.known
  mb.round = r.state.round
  mb.ehp = r.state.ehp // 막기 반격으로 쓰러질 수도 있다
  t.php = r.state.php
  t.curse = r.state.curse
  t.bound = r.state.bound || t.bound
  t.mp = Math.max(0, t.mp - (r.mpDrain || 0))
  for (const m of mb.members) m.guard = false
  let tevs = r.events.map((e) => (e.kind === 'warn' || e.kind === 'end' ? { ...e, kind: e.kind === 'end' ? 'warn' : e.kind, text: `[${t.name}] ${e.text}` } : e))
  const downed = r.state.pendingDeath || r.state.over === 'lose'
  if (downed && t.revive) {
    t.revive = false
    t.php = 1
    tevs = [...tevs.filter((e) => !/버티기를 쓸 수 있다|쓰러졌다|버티지 못/.test(e.text || '')), { kind: 'warn', text: `[${t.name}] 에너지드링크의 힘으로 체력 1로 다시 일어섰다!` }]
    t.reviveUsed = true
  } else if (r.state.pendingDeath) {
    t.pendingDeath = true
    t.php = 0
  } else if (r.state.over === 'lose') {
    t.status = 'down'
    t.php = 0
  }
  evs.push(...addLog(mb, tevs, 'enemy'))
  if (mb.ehp <= 0) {
    mb.over = 'win'
    mb.phase = 'over'
    evs.push(...addLog(mb, [{ kind: 'end', text: `${mb.enemy.name}이(가) 쓰러졌다.` }]))
    return evs
  }
  return evs.concat(afterEnemy(mb, rng))
}

/** 버티기 대기자가 있으면 그 단계로, 없으면 다음 라운드로 */
export function afterEnemy(mb, rng = Math.random) {
  if (mb.members.some((m) => m.pendingDeath)) {
    mb.phase = 'survive'
    return []
  }
  if (finishIfOver(mb)) return []
  return beginRound(mb, rng)
}

export const pendingSurvivors = (mb) => (mb.phase === 'survive' ? mb.members.filter((m) => m.pendingDeath) : [])

/** 버티기 선택(또는 시간 초과로 포기). 반환: 로그 */
export function survive(mb, id, accept, rng = Math.random) {
  const m = mb.members.find((x) => x.id === id)
  if (!m || !m.pendingDeath) return { error: 'not-pending' }
  m.pendingDeath = false
  const v = { ...viewOfMember(mb, m), php: 0, pendingDeath: true }
  const r = resolveSurvive(v, accept, m.mp, m.stats, rng)
  m.mp = Math.max(0, m.mp - (r.mpCost || 0))
  if (r.state.over === 'lose') {
    m.status = 'down'
    m.php = 0
  } else {
    m.php = r.state.php
    m.survived = true
  }
  const evs = addLog(mb, r.events.map((e) => ({ ...e, kind: e.kind === 'end' ? 'warn' : e.kind, text: `[${m.name}] ${e.text}` })), m.id)
  if (!pendingSurvivors(mb).length) evs.push(...afterEnemy(mb, rng))
  return { ok: true, events: evs }
}

/** 접속이 끊긴 사람을 전투에서 뺀다 */
export function dropMember(mb, id) {
  const m = mb.members.find((x) => x.id === id)
  if (!m || m.status !== 'alive') return []
  m.status = 'fled'
  m.pendingDeath = false
  m.act = null
  const evs = addLog(mb, [{ kind: 'warn', text: `[${m.name}] 전투에서 이탈했다.` }], m.id)
  if (!pendingSurvivors(mb).length && mb.phase === 'survive') evs.push(...afterEnemy(mb))
  else finishIfOver(mb)
  return evs
}

/** 개인별 결과: 'win' | 'lose' | 'fled' (전투 중이면 null) */
export function resultOf(mb, id) {
  if (!mb.over) return null
  const m = mb.members.find((x) => x.id === id)
  if (!m) return null
  if (m.status === 'fled') return 'fled'
  return mb.over === 'win' ? 'win' : 'lose'
}

/** 클라이언트에 보내는 모습. 상대의 행동 큐는 알려진 만큼만 보낸다. */
export function viewOf(mb, extra = {}) {
  return {
    enemyId: mb.enemy.id,
    ehp: mb.ehp,
    queue: mb.queue.slice(0, mb.over ? 0 : mb.known),
    known: mb.over ? 0 : mb.known,
    round: mb.round,
    phase: mb.phase,
    over: mb.over,
    members: mb.members.map((m) => ({
      id: m.id,
      name: m.name,
      php: m.php,
      phpMax: m.phpMax,
      mp: m.mp,
      charms: m.charms,
      bound: m.bound,
      curse: m.curse,
      status: m.status,
      pendingDeath: m.pendingDeath,
      survived: m.survived,
      boost: m.boost,
      revive: m.revive,
      reviveUsed: !!m.reviveUsed,
      acted: !!m.act,
      result: resultOf(mb, m.id),
    })),
    log: mb.log.slice(-40),
    ...extra,
  }
}

export { STAT_KEYS }
