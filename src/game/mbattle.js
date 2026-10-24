/**
 * 다인 전투(여럿이 함께 상대 한 명을 치는 전투)의 순수 로직. 서버가 이 모듈로 판을 진행하고, 클라이언트는 결과(view)만 받는다.
 *
 * 한 라운드: 살아 있는 모두가 행동을 고른다 → 신속이 빠른 순서대로 한 명씩 해결 → 상대가 한 번 움직인다(체력이 가장 많은 사람을 노린다).
 * 개인 판정(명중·피해·돌발·버티기…)은 기존 단독 전투의 함수(playerTurn · enemyTurn · resolveSurvive)를 그대로 쓴다.
 */
import { ENEMIES, auraOf, enemyTurn, mpCostOf, newBattle, pickTarget, playerTurn, psychicTurn, resolveSurvive, rollInitiative, rollRash, maxHp } from './battle.js'

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

export const FX_IDS = ['fan', 'spear', 'dagger', 'sword', 'bow', 'bell', 'instrument', 'sickle', 'staff', 'mace']

export function makeMember({ id, name, stats, fx, hp, hpMax, mp, mpMax, revive, boost, bring }) {
  const st = cleanStats(stats)
  // 무구의 특수 효과 id 는 스탯 목록에 나타나지 않게(열거되지 않게) 붙인다. (엔진은 stats.fx 를 본다)
  const fxId = FX_IDS.includes(fx) ? fx : null
  if (fxId) Object.defineProperty(st, 'fx', { value: fxId, enumerable: false })
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
    survived: 0,
    fx: fxId,
    status: 'alive', // alive | down | fled
    pendingDeath: false,
    revive: !!revive,
    boost: !!boost,
    bring: bring ?? null, // 보스 전투: 가져온 아이템 { id: 개수 } (null 이면 제한 없음)
    act: null, // 이번 라운드에 고른 행동 { action, scanAmount?, psychic?, forced? }
  }
}

let logSeq = 1
const tag = (events, by) => events.map((e) => ({ ...e, by, id: logSeq++ }))

export function createMB(enemyId, rawMembers, rng = Math.random) {
  const enemy = ENEMIES.find((e) => e.id === enemyId)
  const members = rawMembers.map(makeMember)
  const base = newBattle(enemy, members[0].stats, rng, undefined, undefined, { party: true }) // 상대의 행동 큐(여럿이 함께 본다) — 일행을 상대하는 판
  const mb = {
    enemy,
    ehp: enemy.hp,
    party: true,
    queue: base.queue,
    known: 0,
    order: [],
    turn: null,
    turnIdx: -1,
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
  party: true,
  over: null,
})

/** 시작 선공 판정: 일행에서 가장 신속한 사람의 굴림. 상대가 먼저면 첫 라운드 앞에 상대가 한 번 움직인다. */
export function openingInitiative(mb, rng = Math.random) {
  const lead = [...mb.members].sort((a, b) => b.stats.agility - a.stats.agility)[0]
  const fanner = mb.members.find((m) => m.fx === 'fan')
  const init = fanner ? rollInitiative(mb.enemy, fanner.stats, rng) : rollInitiative(mb.enemy, lead.stats, rng)
  const text = fanner
    ? `선공 판정: ${fanner.name}의 부채 덕에 일행이 무조건 먼저 움직인다.`
    : init.auto
    ? `선공 판정: ${lead.name}의 신속 ${lead.stats.agility} ≥ 행동력이라 일행이 먼저 움직인다.`
    : `선공 판정(${lead.name}): d10 ${init.a} + d${lead.stats.agility} ${init.b} = ${init.total} → ${init.playerFirst ? '일행이 먼저 움직인다.' : '상대가 먼저 움직인다!'}`
  const evs = addLog(mb, [{ kind: 'info', text, roll: init.auto ? undefined : init.a }])
  if (!init.playerFirst) evs.push(...enemyPhase(mb, rng))
  return evs
}

/** 라운드 시작: 행동 순서를 정한다(일행 안에서 신속이 높은 순서). 이어서 첫 사람의 차례가 시작된다. */
export function beginRound(mb, rng = Math.random) {
  mb.phase = 'input'
  const evs = []
  for (const m of mb.members) m.act = null
  mb.order = [...aliveOf(mb)].sort((a, b) => b.stats.agility - a.stats.agility || (a.id < b.id ? -1 : 1)).map((m) => m.id)
  mb.turnIdx = -1
  mb.turn = null
  evs.push(...addLog(mb, [{ kind: 'info', text: `── 라운드 ${mb.round} · 일행 차례: ${mb.order.map((id) => mb.members.find((m) => m.id === id).name).join(' → ')} (신속 순) ──` }]))
  evs.push(...nextActor(mb, rng))
  return evs
}

/** 다음 사람의 차례로 넘긴다. 돌발 판정도 그 사람 차례가 시작될 때 굴린다. 더 없으면 turn 이 null. */
function nextActor(mb, rng = Math.random) {
  const evs = []
  while (true) {
    mb.turnIdx += 1
    if (mb.turnIdx >= mb.order.length) {
      mb.turn = null
      return evs
    }
    const m = mb.members.find((x) => x.id === mb.order[mb.turnIdx])
    if (!m || m.status !== 'alive') continue
    mb.turn = m.id
    m.act = null
    const rr = rollRash(m.stats, rng)
    if (rr.percent > 0) {
      evs.push(...addLog(mb, [{ kind: rr.hit ? 'rash' : 'info', text: `[${m.name}] 돌발 판정 d100 = ${rr.roll} (확률 ${rr.percent}%) → ${rr.hit ? '돌발 행동 발생! 이번 턴엔 무조건 일반 공격.' : '이상 없음'}` }], m.id))
    }
    if (rr.hit) m.act = { action: 'attack', forced: true }
    return evs
  }
}

/** 지금 행동을 골라야 하는 사람(없거나 이미 골랐으면 빈 목록) */
export const waitingOn = (mb) => {
  if (mb.phase !== 'input' || !mb.turn) return []
  const m = mb.members.find((x) => x.id === mb.turn)
  return m && m.status === 'alive' && !m.act ? [m] : []
}
export const ready = (mb) => {
  if (mb.phase !== 'input' || !mb.turn) return false
  const m = mb.members.find((x) => x.id === mb.turn)
  return !!m && !!m.act
}

/** 행동 제출 — 자기 차례인 사람만. 반환 { ok } 또는 { error } */
export function submit(mb, id, act) {
  const m = mb.members.find((x) => x.id === id)
  if (!m || m.status !== 'alive') return { error: 'not-fighting' }
  if (mb.phase !== 'input') return { error: 'wrong-phase' }
  if (mb.turn !== id) return { error: 'not-your-turn' }
  if (m.act) return { error: 'already' }
  const a = act?.action
  if (!['attack', 'guard', 'charm', 'scan', 'psychic'].includes(a)) return { error: 'bad-action' }
  // 효험(모두가 가진 영능력): 일반 공격·부적·생존본능과 함께, 토글로 켜서 같이 제출한다.
  // 부적처럼 의지력이 모자라도(0까지) 쓸 수 있으므로 제출 자체를 막지는 않는다.
  const buffable = a === 'attack' || a === 'charm' || (a === 'psychic' && act.psychic === 'survival')
  const buff = !!act?.buff && buffable
  // 의지력이 모자라면 부적 말고는 쓸 수 없다.
  if (a === 'scan' && m.mp < mpCostOf(m.stats, 1)) return { error: 'no-mp' }
  if (a === 'charm' && m.charms <= 0) return { error: 'no-charm' }
  if (a === 'guard' && m.bound) return { error: 'bound' }
  if (a === 'psychic' && act.psychic !== 'survival') return { error: 'bad-psychic' }
  m.act = { action: a, scanAmount: a === 'scan' ? Math.max(1, Math.min(m.mp, Math.floor(act.scanAmount ?? 1))) : undefined, psychic: act.psychic, buff }
  return { ok: true }
}

/** 시간이 다 되었을 때: 지금 차례인 사람이 고르지 않았으면 막기(막을 수 없으면 일반 공격). */
export function autoFill(mb) {
  for (const m of waitingOn(mb)) m.act = { action: m.bound ? 'attack' : 'guard', auto: true }
}

/** 아이템 효과(전투 중). 반환 { ok, text } 또는 { error } */
export function useItemMB(mb, id, item, targetId) {
  const r = useItemCore(mb, id, item, targetId)
  if (r.ok && mb.enemy.boss) {
    const m = mb.members.find((x) => x.id === id)
    m.bring = { ...m.bring, [item.id]: m.bring[item.id] - 1 }
  }
  return r
}
function useItemCore(mb, id, item, targetId) {
  const m = mb.members.find((x) => x.id === id)
  const t = mb.members.find((x) => x.id === (targetId || id))
  if (!m || !t || m.status !== 'alive' || mb.phase === 'over') return { error: 'not-fighting' }
  const e = item?.effect ?? {}
  if (!item?.battle) return { error: 'not-battle-item' }
  if (mb.enemy.boss) {
    if ((m.bring?.[item.id] || 0) < 1) return { error: 'not-brought' } // 가져오지 않은 아이템은 쓸 수 없다
  }
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

/** 지금 차례인 사람의 행동을 해결하고 다음 사람에게 넘긴다. 모두 마쳤으면 상대가 움직인다. 반환: 이번에 생긴 로그 */
export function resolveTurn(mb, rng = Math.random) {
  const evs = []
  const m = mb.members.find((x) => x.id === mb.turn)
  if (!m || m.status !== 'alive' || mb.phase !== 'input') return evs
  const act = m.act ?? { action: m.bound ? 'attack' : 'guard' }
  const v = viewOfMember(mb, m)
  const aura = aliveOf(mb).reduce((sum, x) => sum + auraOf(x.stats), 0) // 악기: 일행 모두의 공격에 붙는 보정
  let r
  if (act.action === 'psychic') {
    r = psychicTurn(v, act.psychic ?? 'survival', { stats: m.stats, mp: m.mp, boost: m.boost, aura, buff: act.buff }, rng)
    if (r.invalid) r = { state: v, events: [{ kind: 'warn', text: '쓸 수 없는 영능력이다.' }], mpCost: 0 }
  } else {
    r = playerTurn(v, act.action, { stats: m.stats, mp: m.mp, boost: m.boost, scanAmount: act.scanAmount, noRash: true, aura, buff: act.buff }, rng)
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
  m.act = null
  if (r.state.over === 'fled') m.status = 'fled'
  if (mb.ehp <= 0) {
    mb.over = 'win'
    mb.phase = 'over'
    mb.turn = null
    return evs
  }
  evs.push(...nextActor(mb, rng))
  if (mb.turn) return evs // 다음 사람의 차례
  // 일행 차례가 모두 끝났다 → 상대의 차례
  if (!aliveOf(mb).length) {
    finishIfOver(mb)
    return evs
  }
  evs.push(...enemyPhase(mb, rng))
  return evs
}
export const resolveRound = resolveTurn

/** 상대의 차례. 단체 공격이면 일행 전원, 아니면 체력이 가장 많은 한 명. 끝나면 다음 라운드 준비(또는 버티기 대기). 반환: 로그 */
/** 보스 기믹: 체력이 줄면 행동이 바뀐다. { intent, notes[] } */
export function bossGimmick(mb, intent) {
  const notes = []
  if (!mb.enemy.boss) return { intent, notes }
  const ratio = mb.ehp / mb.enemy.hp
  const stage = ratio < 0.25 ? 2 : ratio < 0.5 ? 1 : 0
  if (stage > (mb.rage || 0)) {
    mb.rage = stage
    notes.push(stage === 1 ? `${mb.enemy.name}이(가) 사납게 몸을 뒤튼다! (3라운드마다 반드시 영능력을 쓴다)` : `${mb.enemy.name}이(가) 광분한다! (약공이 모두 단체 공격으로 바뀐다)`)
  }
  let out = intent
  if (stage >= 2 && out === 'jab') out = 'group'
  if (stage >= 1 && mb.round % 3 === 0 && ['jab', 'group', 'guard'].includes(out)) out = 'special'
  return { intent: out, notes }
}

function enemyPhase(mb, rng) {
  const evs = []
  const alive = aliveOf(mb).filter((m) => m.php > 0)
  if (!alive.length) {
    finishIfOver(mb)
    return evs
  }
  mb.turn = null
  const gim = bossGimmick(mb, mb.queue[0])
  const intent = gim.intent
  for (const n of gim.notes) evs.push(...addLog(mb, [{ kind: 'warn', text: n }], 'enemy'))
  if (intent !== mb.queue[0]) mb.queue = [intent, ...mb.queue.slice(1)]
  const sp = intent === 'special' && mb.enemy.special2 ? (rng() < 0.5 ? 2 : 1) : 1
  const group = intent === 'group' || (intent === 'special' && sp === 2)
  const hits = intent === 'jab' || intent === 'smash' || intent === 'special'
  let targets
  if (group) {
    targets = alive
    evs.push(...addLog(mb, [{ kind: 'info', text: intent === 'special' ? `▶ ${mb.enemy.name}이(가) 일행 전원을 향해 《${mb.enemy.special2.label}》!` : `▶ ${mb.enemy.name}의 단체 공격! 일행 전원에게 약공이 들어온다!` }], 'enemy'))
  } else {
    const pick = pickTarget(alive.map((m) => ({ id: m.id, hp: m.php })), rng)
    targets = [mb.members.find((m) => m.id === pick.id)]
    if (hits) evs.push(...addLog(mb, [{ kind: 'info', text: `▶ ${mb.enemy.name}이(가) ${targets[0].name}을(를) 노린다! (체력이 가장 많은 사람)` }], 'enemy'))
  }
  targets.forEach((t, i) => {
    if (mb.ehp <= 0) return
    const last = i === targets.length - 1
    const q = [...mb.queue]
    if (intent === 'group') q[0] = 'jab'
    const v = { ...viewOfMember(mb, t), guard: t.guard, queue: q }
    const r = enemyTurn(v, { stats: t.stats, mp: t.mp, sp }, rng)
    if (last) {
      mb.queue = r.state.queue
      mb.known = r.state.known
      mb.round = r.state.round
    }
    mb.ehp = r.state.ehp // 막기 반격으로 쓰러질 수도 있다
    t.php = r.state.php
    t.curse = r.state.curse
    t.bound = r.state.bound || t.bound
    t.mp = Math.max(0, t.mp - (r.mpDrain || 0))
    let tevs = r.events.map((e) => (e.kind === 'warn' || e.kind === 'end' ? { ...e, kind: e.kind === 'end' ? 'warn' : e.kind, text: `[${t.name}] ${e.text}` } : group && e.kind === 'enemy' ? { ...e, text: `[${t.name}] ${e.text}` } : e))
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
  })
  for (const m of mb.members) m.guard = false
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
    m.survived = r.state.survived
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
  const wasTurn = mb.phase === 'input' && mb.turn === id
  const evs = addLog(mb, [{ kind: 'warn', text: `[${m.name}] 전투에서 이탈했다.` }], m.id)
  if (wasTurn && !finishIfOver(mb)) {
    // 이탈한 사람의 차례였다 → 다음 사람에게 넘기고, 더 없으면 상대의 차례
    evs.push(...nextActor(mb))
    if (!mb.turn) evs.push(...enemyPhase(mb))
  } else if (!pendingSurvivors(mb).length && mb.phase === 'survive') evs.push(...afterEnemy(mb))
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
    boss: !!mb.enemy.boss,
    rage: mb.rage || 0,
    ehp: mb.ehp,
    queue: mb.queue.slice(0, mb.over ? 0 : mb.known),
    known: mb.over ? 0 : mb.known,
    round: mb.round,
    turn: mb.turn,
    order: mb.order,
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
      fx: m.fx,
      boost: m.boost,
      bring: m.bring,
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
