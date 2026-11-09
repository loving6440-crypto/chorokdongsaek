/**
 * 다인 전투(여럿이 함께 상대 한 명을 치는 전투)의 순수 로직. 서버가 이 모듈로 판을 진행하고, 클라이언트는 결과(view)만 받는다.
 *
 * 한 라운드: 살아 있는 모두가 행동을 고른다 → 신속이 빠른 순서대로 한 명씩 해결 → 상대가 한 번 움직인다(체력이 가장 많은 사람을 노린다).
 * 개인 판정(명중·피해·돌발·버티기…)은 기존 단독 전투의 함수(playerTurn · enemyTurn · resolveSurvive)를 그대로 쓴다.
 */
import { cleansed, rollItemHit } from './battleItems.js'
import { enemyById, effectHitsAll, effectPierces, effectTargeting, effectExpr, afflictStats, tickStatus, tickEnemyStatus, playerTurnStart, beforePlayer, afterPlayer, reviveCheck, strikeOf, shownQueue, auraOf, auraSelfOf, bellTick, enemyTurn, fireTurn, maxSurvives, mpCostOf, newBattle, pickTarget, playerTurn, psychicTurn, resolveSurvive, rollInitiative, rollRash, maxHp, specialSpiritCost, specialEffects, SPECIAL_PERCENT, rollIntent, languageReveal, maskFriendlyFirePercent } from './battle.js'
import { itemTurnFree } from './items.js'

/** 일행 전체의 악기 보정을 공격자 기준으로 합산한다 — 악기를 든 사람 자신이 공격자면 그만큼은 75%만 적용된다. (v71) */
const auraFor = (mb, attackerId) => aliveOf(mb).reduce((sum, x) => { const st = afflictStats(x.stats, x.ps); return sum + (x.id === attackerId ? auraSelfOf(st) : auraOf(st)) }, 0) // 무구 봉인(v-B.05)이면 악기도 꺼진다

export const MULTI_TAG = '다인 전투'
export const isMulti = (e) => !!e?.tags?.includes(MULTI_TAG)
export const MB_INPUT_MS = 60_000 // v-B.17: 한 사람의 차례는 1분. 시간이 지나면 자동으로 처리된다(autoFill).
export const MB_SURVIVE_MS = 20_000
export const MB_LOG_MAX = 80

const STAT_KEYS = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension']
// 다인 전투에서 쓸 수 있는 영능력 id 전체(기존엔 생존본능뿐이었으나, 솔로 전투에서 구현된 6종도 모두 받아들인다).
const PSYCHIC_IDS = ['earth-step','warding-scripture','spirit-barrier','seven-stars','language-barrier','survival', 'cotton-mist', 'monkey-paw', 'echo-form', 'falling-light', 'karmic-recompense', 'dokkaebi-fire']
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : lo))

/** 영력결계: 일반 다인 전투는 습득만 하면 상시 적용. 보스전에서는 가져간 경우에만 적용한다. */
export const hasActiveSpiritBarrier = (member, enemy) =>
  !!member?.psychics?.includes('spirit-barrier') &&
  !member?.passiveOff?.includes('spirit-barrier') && // v79.0.7: 전투 전에 효과를 끄기로 고른 경우
  !member?.barrierBroken && // v-B.05: 도철의 결계째 삼키기로 이번 전투 동안 없어졌다

  (!enemy?.boss || (Array.isArray(member.psychicBring) && member.psychicBring.includes('spirit-barrier')))

/** 영력결계 상태에서도 스스로 또는 아군을 대상으로 쓰는 영능력은 사용할 수 있다. */
export const BARRIER_ALLY_SKILLS = ['survival', 'echo-form', 'falling-light', 'karmic-recompense', 'warding-scripture', 'earth-step', 'seven-stars']

/** 클라이언트가 보낸 스탯을 안전한 정수로 고친다. */
export function cleanStats(raw = {}) {
  const out = {}
  for (const k of Object.keys(raw)) if (typeof raw[k] === 'number') out[k] = clampNum(Math.round(raw[k]), 1, 999)
  for (const k of ['insight', 'aggression', 'endurance', 'control', 'agility']) if (!out[k]) out[k] = 1
  return out
}

export const FX_IDS = ['fan', 'spear', 'dagger', 'sword', 'bow', 'bell', 'instrument', 'sickle', 'staff', 'mace']

export const TRINKET_FX_IDS = ['headband', 'goblin-mask'] // v-B.08 장신구 특수 효과
export function makeMember({ id, name, stats, fx, trinket, special, hp, hpMax, mp, mpMax, revive, boost, bring, psychicBring, psychics = [], baseAggression, curseUntil = 0, passiveOff = [] }) {
  const st = cleanStats(stats)
  // 무구의 특수 효과 id 는 스탯 목록에 나타나지 않게(열거되지 않게) 붙인다. (엔진은 stats.fx 를 본다)
  const fxId = FX_IDS.includes(fx) ? fx : null
  if (fxId) Object.defineProperty(st, 'fx', { value: fxId, enumerable: false })
  if (typeof special === 'string') Object.defineProperty(st, 'special', { value: special, enumerable: false })
  if (TRINKET_FX_IDS.includes(trinket)) Object.defineProperty(st, 'trinket', { value: trinket, enumerable: false })
  const phpMax = Math.round(clampNum(hpMax ?? maxHp(st), 1, 9999))
  return {
    id,
    name,
    stats: st,
    baseAggression: baseAggression ?? st.aggression,
    curseUntil: Math.max(0, Number(curseUntil) || 0),
    psychics: Array.isArray(psychics) ? psychics : [],
    php: Math.round(clampNum(hp ?? phpMax, 1, phpMax)),
    phpMax,
    mp: special === 'plum' ? 150 : Math.floor(clampNum(mp ?? 0, 0, 9999)),
    mpMax: special === 'plum' ? 150 : Math.floor(clampNum(mpMax ?? mp ?? 0, 0, 9999)),
    charms: 3,
    guard: false,
    bound: false,
    stun: 0, // 남은 행동불능 턴 수(0이면 정상). 폭죽 등으로 걸린다.
    specialSaved: false,
    earthReduction: 0,
    starBonus: 0,
  specialSeen: false,
  fire: 0, // 도깨비불: 기를 모으는 중 남은 자동 턴 수(0이면 정상). 쓰고 나면 다음 턴들은 입력 없이 자동으로 진행된다.
    fireBuffed: false, // 도깨비불을 효험과 함께 썼는지 — 터지는 순간(fireTurn)까지 들고 있다가 그때 적용하고 꺼진다.
    curse: 0,
    survived: 0,
    myTurns: 0, // 지금까지 실제로 행동(일반 공격·부적·영능력 등)한 횟수 — '맨 첫 턴' 제한이 있는 영능력(업인과보)에 쓴다.
    usedItems: [], // 이번 전투에서 쓴 아이템 id 목록(형상 기억 재활용용). 중복 없이 쌓인다.
    fx: fxId,
    status: 'alive', // alive | down | fled
    pendingDeath: false,
    revive: !!revive,
    headband: trinket === 'headband', // v-B.08 기합의 띠: 에너지드링크가 없을 때 한 번 체력 1로 일어선다(띠는 끊어진다)
    boost: !!boost,
    bring: bring ?? null, // 보스 전투: 가져온 아이템 { id: 개수 } (null 이면 제한 없음)
    psychicBring: psychicBring ?? null, // 보스 전투: 가져온 영능력 id 목록(최대 2개, null 이면 제한 없음) (v71)
    passiveOff: Array.isArray(passiveOff) ? passiveOff.filter((x) => x === 'spirit-barrier') : [], // 이번 전투에서 끈 패시브 영능력 (v79.0.7)
    lbPick: false, // 언어장벽으로 20턴을 간파한 뒤, 바꿀 턴을 고르는 중 (v79.0.7)
    act: null, // 이번 라운드에 고른 행동 { action, scanAmount?, psychic?, forced? }
    ps: {}, // v-B.05 상태 이상(battle.js PS_INFO): 남은 턴 수
    banished: 0, // 백귀행렬에 끌려가 빠져 있는 남은 라운드
    barrierBroken: false,
  }
}

let logSeq = 1
const tag = (events, by) => events.map((e) => ({ ...e, by, id: logSeq++ }))

export function createMB(enemyId, rawMembers, rng = Math.random) {
  const enemy = typeof enemyId === 'object' && enemyId ? enemyId : enemyById(enemyId) // (밸런스 시뮬레이터는 능력치를 바꾼 적 객체를 넘긴다)
  const members = rawMembers.map(makeMember)
  const base = newBattle(enemy, members[0].stats, rng, undefined, undefined, { party: true }) // 상대의 행동 큐(여럿이 함께 본다) — 일행을 상대하는 판
  const mb = {
    // 보스가 전투 중 커지는 등 능력치가 바뀔 수 있어, 원본(적 데이터)을 건드리지 않도록 복사해 둔다.
    enemy: { ...enemy, baseAtk: enemy.atk },
    grow: 0, // 커지는 보스(그슨대)의 현재 단계
    ehp: enemy.hp,
    espirit: enemy.spirit, // 영능력 전용 영력 자원(다인 전투는 일행 수와 무관하게 한 번 쓸 때마다 한 번만 깎인다)
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
    fallingLight: null, // 내려쬐는 빛을 쓴 일행의 id. 다음 적의 공격(단일·단체 모두)이 그 사람에게 쏠리고, 쓰일 때마다 소모된다(또 쓰면 다시 걸 수 있다).
    karmicTarget: null, // 업인과보로 지정한 대상의 id(쓰면 단체 공격·다중 타겟 영능력이 모두 이 사람에게, 인원수만큼 곱해져서 쏠린다).
    enemyVulnerabilityRounds: 0,
    es: {}, // v-B.05 적에게 걸린 상태(껍질·둔갑·쥐 떼·냄새·이음·땡볕 …)
    lies: null, // 헛것 보이기: 화면에 보일 가짜 행동
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
  lbPick: !!m.lbPick,
  guard: m.guard,
  charms: m.charms,
  bound: m.bound,
  curse: m.curse,
  pendingDeath: false,
  survived: m.survived,
  myTurns: m.myTurns,
  choseTurns: m.choseTurns || 0,
  fallingLight: !!mb.fallingLight,
  usedItems: m.usedItems,
  party: true,
  over: null,
  fire: m.fire || 0,
  specialSaved: !!m.specialSaved,
  specialSeen: !!m.specialSeen,
  fireBuffed: !!m.fireBuffed,
  ps: m.ps || {},
  es: mb.es || {},
  lies: mb.lies,
  starBonus: m.starBonus || 0,
  pstun: m.stun || 0,
  barrierBroken: !!m.barrierBroken,
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
  if (aliveOf(mb).length && aliveOf(mb).every((m) => m.banished > 0)) for (const m of aliveOf(mb)) m.banished = 0 // 남은 사람이 모두 끌려갔으면 행렬이 흩어진다
  mb.order = [...aliveOf(mb)].filter((m) => !(m.banished > 0)).sort((a, b) => b.stats.agility - a.stats.agility || (a.id < b.id ? -1 : 1)).map((m) => m.id)
  for (const m of aliveOf(mb)) if (m.banished > 0) evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] 백귀행렬에 끌려가 이번 라운드엔 싸울 수 없다. (남은 ${m.banished}라운드)` }], m.id))
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
    // v-B.05: 내 턴이 시작될 때의 상태 이상(화상)
    const ts = playerTurnStart(viewOfMember(mb, m), rng)
    if (ts.events.length) {
      m.php = ts.state.php
      m.ps = ts.state.ps
      evs.push(...addLog(mb, ts.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
    }
    if ((m.ps?.forceRash || 0) > 0 && !(m.stun > 0) && !(m.fire > 0)) {
      evs.push(...addLog(mb, [{ kind: 'rash', text: `[${m.name}] 연모의 불길에 사로잡혀 이번 턴엔 일반 공격만 한다.` }], m.id))
      m.act = { action: 'attack', forced: true }
      return evs
    }
    const rr = rollRash(m.stats, rng)
    if (rr.percent > 0) {
      evs.push(...addLog(mb, [{ kind: rr.hit ? 'rash' : 'info', text: `[${m.name}] 돌발 판정 d100 = ${rr.roll} (확률 ${rr.percent}%) → ${rr.hit ? '돌발 행동 발생! 이번 턴엔 무조건 일반 공격.' : '이상 없음'}` }], m.id))
    }
    if (rr.hit) m.act = { action: 'attack', forced: true }
    return evs
  }
}

/** 지금 행동을 골라야 하는 사람(없거나 이미 골랐으면 빈 목록) — 도깨비불로 기를 모으는 중이면 입력을 기다리지 않는다. */
export const waitingOn = (mb) => {
  if (mb.phase !== 'input' || !mb.turn) return []
  const m = mb.members.find((x) => x.id === mb.turn)
  return m && m.status === 'alive' && !m.act && !(m.fire > 0) ? [m] : []
}
export const ready = (mb) => {
  if (mb.phase !== 'input' || !mb.turn) return false
  const m = mb.members.find((x) => x.id === mb.turn)
  if (m && m.fire > 0) return true // 도깨비불: 입력 없이 자동으로 진행된다
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
  if (a === 'attack' && m.stats.special === 'red-wisteria') return { error: '홍싸리나무의 특수 강화로 일반 공격을 직접 선택할 수 없다.' }
  // 효험(모두가 가진 영능력): 일반 공격·부적·생존본능과 함께, 토글로 켜서 같이 제출한다.
  // 부적처럼 의지력이 모자라도(0까지) 쓸 수 있으므로 제출 자체를 막지는 않는다.
  // 원숭이 손·도깨비불처럼 영능력 자체가 공격력을 산출하는 경우에도 효험이 적용된다.
  const buffable = a === 'attack' || a === 'charm' || (a === 'psychic' && ['survival', 'monkey-paw', 'dokkaebi-fire'].includes(act.psychic))
  const buff = !!act?.buff && buffable
  // 의지력이 모자라면 부적 말고는 쓸 수 없다.
  if (a === 'scan' && m.mp < mpCostOf(m.stats, 1)) return { error: 'no-mp' }
  if (a === 'charm' && m.charms <= 0) return { error: 'no-charm' }
  if (a === 'guard' && m.bound) return { error: 'bound' }
  const barrierActive = hasActiveSpiritBarrier(m, mb.enemy)
  if (barrierActive && act?.buff) return { error: '영력결계가 발동 중이면 효험을 사용할 수 없다.' }
  if (a === 'psychic' && barrierActive && !BARRIER_ALLY_SKILLS.includes(act.psychic)) return { error: '영력결계가 발동 중이면 적 대상 영능력을 사용할 수 없다.' }
  if (a === 'psychic' && !PSYCHIC_IDS.includes(act.psychic)) return { error: 'bad-psychic' }
  // 그슨대 [내리누르기]: 봉인된 동안은 영능력(효험 포함)을 쓸 수 없다.
  if ((m.psySeal || 0) > 0 && (a === 'psychic' || act?.buff)) return { error: `영능력이 봉인되어 있다. (남은 ${m.psySeal}라운드)` }
  // 보스 전투: 미리 가져가기로 고른 영능력(최대 2개)만 쓸 수 있다. (v71)
  if (a === 'psychic' && mb.enemy.boss && Array.isArray(m.psychicBring) && !m.psychicBring.includes(act.psychic)) return { error: 'not-brought' }
  // 언어장벽 (v79.0.7): 1단계 간파는 턴을 쓰지 않는다. 20턴을 드러낸 뒤 같은 턴에 바꿀 턴을 골라 다시 제출한다(이때 턴이 끝난다).
  // 몇 번째 라운드든, 일행 중 몇 번째 순서든 자기 차례면 언제든 쓸 수 있다.
  if (m.lbPick && !(a === 'psychic' && act.psychic === 'language-barrier')) return { error: '언어장벽: 먼저 바꿀 턴을 골라 확정해야 한다.' }
  if (a === 'psychic' && act.psychic === 'language-barrier' && !m.lbPick) {
    const cost = mpCostOf(m.stats, 20)
    if (m.mp < cost) return { error: 'no-mp' }
    const r = languageReveal({ queue: mb.queue, known: mb.known, party: true, enemy: mb.enemy }, cost)
    mb.queue = r.state.queue
    mb.known = r.state.known
    m.mp = Math.max(0, m.mp - cost)
    m.lbPick = true
    addLog(mb, r.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id)
    return { ok: true, reveal: true }
  }
  m.act = {
    action: a,
    scanAmount: a === 'scan' ? Math.max(1, Math.min(m.mp, Math.floor(act.scanAmount ?? 1))) : undefined,
    psychic: act.psychic,
    buff,
    // 원숭이 손: 깎을 체력. 업인과보·형상 기억: 지정한 대상(형상 기억은 자신 또는 치유할 일행).
    amount: a === 'psychic' && act.psychic === 'warding-scripture' ? Math.max(1, Math.floor(act.amount ?? 10)) : undefined,
    rerolls: a === 'psychic' && act.psychic === 'language-barrier' ? (Array.isArray(act.rerolls) ? act.rerolls.slice(0,3) : []) : undefined,
    sacrifice: a === 'psychic' && act.psychic === 'monkey-paw' ? Math.max(0, Math.floor(act.sacrifice ?? 0)) : undefined,
    target: a === 'psychic' && ['karmic-recompense', 'echo-form', 'warding-scripture'].includes(act.psychic) && typeof act.target === 'string' ? act.target : undefined,
  }
  return { ok: true }
}

/** 시간이 다 되었을 때: 지금 차례인 사람이 고르지 않았으면 막기(막을 수 없으면 일반 공격). */
export function autoFill(mb) {
  for (const m of waitingOn(mb)) m.act = { action: m.bound ? 'attack' : 'guard', auto: true }
}

/**
 * 아이템 효과(전투 중). 자기 차례에만 쓸 수 있다.
 * '일행'(나 말고 다른 사람)에게도 쓸 수 있는 아이템(#턴소모有)은 쓰면 그 즉시 턴이 넘어가고,
 * 나를 포함한 '개인'에게만 쓸 수 있는 아이템(#턴소모無)은 턴을 소모하지 않아 같은 턴에 다른 행동도 이어서 할 수 있다. (v71)
 * 반환 { ok, text } 또는 { error }
 */
export function useItemMB(mb, id, item, targetId) {
  const r = useItemCore(mb, id, item, targetId)
  if (r.ok) {
    const m = mb.members.find((x) => x.id === id)
    if (m && item?.id && !m.usedItems.includes(item.id)) m.usedItems = [...m.usedItems, item.id] // 형상 기억이 나중에 재활용할 수 있도록 기록
    if (mb.enemy.boss) m.bring = { ...m.bring, [item.id]: m.bring[item.id] - 1 }
    if (m && !itemTurnFree(item)) m.act = { action: 'item' } // #턴소모有 아이템만 턴을 끝낸다 — resolveTurn 이 다음 사람에게 넘긴다.
  }
  return r
}
function useItemCore(mb, id, item, targetId) {
  const m = mb.members.find((x) => x.id === id)
  const t = mb.members.find((x) => x.id === (targetId || id))
  if (!m || !t || m.status !== 'alive' || mb.phase !== 'input') return { error: 'not-fighting' }
  if (!itemTurnFree(item) && mb.turn !== id) return { error: 'not-your-turn' } // #턴소모無는 다른 사람 턴에도 사용 가능.
  if (!itemTurnFree(item) && m.act) return { error: 'already' }
  if (m.stun > 0 || m.fire > 0) return { error: 'busy' } // 행동불능·도깨비불 충전 중엔 아이템도 쓸 수 없다.
  if ((m.ps?.itemSeal || 0) > 0) return { error: 'item-seal' } // v-B.05: 야광귀의 신 훔치기
  const e = item?.effect ?? {}
  // v-B.05: 돌림병 — 회복 아이템이 듣지 않는다(받는 사람 기준)
  // (v-B.16: 해제·스탯 등 다른 효과가 함께 있는 아이템은 회복만 빼고 나머지가 듣는다)
  const healOnly = Object.keys(e).every((k) => ['hp', 'mp', 'giveHp', 'giveMp'].includes(k))
  if (healOnly && (e.hp || e.giveHp) && (t.ps?.healBlock || 0) > 0) return { error: 'heal-block' }
  if (!item?.battle) return { error: 'not-battle-item' }
  if (mb.enemy.boss) {
    if ((m.bring?.[item.id] || 0) < 1) return { error: 'not-brought' } // 가져오지 않은 아이템은 쓸 수 없다
  }
  // 초보용 고독: 앞으로 3라운드 적이 받는 피해 +20% (보스 포함).
  if (e.enemyVulnerability) {
    mb.enemyVulnerabilityRounds = Math.max(mb.enemyVulnerabilityRounds || 0, e.enemyVulnerability)
    addLog(mb, [{kind:'warn',text:`${m.name}의 초보용 고독! 적이 ${e.enemyVulnerability}라운드 동안 피해를 20% 더 받는다.`}],m.id)
    return {ok:true}
  }
  // 고독: 보스 포함 즉시 처치, 전투 참여자 모두 3일간 현실 시간 기준 저주.
  if (e.instantKill) {
    const until = Date.now() + 3 * 24 * 60 * 60 * 1000
    for (const member of mb.members) member.curseUntil = Math.max(member.curseUntil || 0, until)
    mb.ehp = 0
    mb.phase = 'over'
    mb.over = 'win'
    mb.turn = null
    addLog(mb, [{kind:'end',text:`${m.name}의 고독! ${mb.enemy.name}이(가) 즉시 쓰러졌다. 참가자 전원이 3일간 [저주]를 받았다.`}],m.id)
    return {ok:true}
  }
  // v-B.16: 한 전투에 1번만 쓰는 아이템(적 피해·부적·간파 등)
  if (e.oncePerBattle && m.usedItems.includes(item.id)) return { error: 'already' }
  const STAT = { insight: '안목', aggression: '호전', endurance: '인내', control: '절제', agility: '신속', comprehension: '이해' }
  const statLine = (map) => Object.entries(map).map(([k, v]) => `${STAT[k] ?? k} +${v}`).join(' · ')
  const addStats = (x, map) => { for (const [k, v] of Object.entries(map)) x.stats[k] = (x.stats[k] || 0) + v }
  // ── 건네는 아이템: 마이쮸(boost) · 쌍쌍바(giveHp) · v-B.16 giveMp · giveCleanse — 일행 한 명(또는 나)에게
  if (e.boost || e.giveHp || e.giveMp || e.giveCleanse) {
    if (t.status !== 'alive') return { error: 'bad-target' }
    const onlyBoost = e.boost && !e.giveHp && !e.giveMp && !e.giveCleanse
    if (onlyBoost && t.boost) return { error: 'already' }
    if (e.giveHp && !e.giveMp && !e.giveCleanse && !e.boost && (t.ps?.healBlock || 0) > 0) return { error: 'heal-block' }
    const mine = t.id === m.id
    const parts = []
    if (e.giveCleanse) { Object.assign(t, cleansed()); parts.push('나쁜 상태 해제') }
    if (e.giveHp && !((t.ps?.healBlock || 0) > 0)) {
      const amount = mine ? e.giveHp.self : e.giveHp.party
      t.php = Math.min(t.phpMax, t.php + amount)
      parts.push(`체력 +${amount}`)
    }
    if (e.giveMp) {
      const amount = mine ? e.giveMp.self : e.giveMp.party
      t.mp = Math.min(t.mpMax, t.mp + amount)
      parts.push(`의지력 +${amount}`)
    }
    if (e.boost && !t.boost) { t.boost = true; parts.push('다음 행동 피해 2배') }
    const who = mine ? '자신' : t.name
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) ${who}에게 건넸다. ${parts.join(' · ') || '(이미 걸린 효과뿐이라 달라진 것이 없다)'}.`, popup: { type: 'item', name: m.name, item: item.name, target: who } }], m.id)
    return { ok: true }
  }
  // ── 일행 전원: 봉지 과자 · 조각 케이크 · v-B.16 partyStat · partyCleanse · partyCharms
  if (e.partyHp || e.partyMp || e.partyStat || e.partyCleanse || e.partyCharms) {
    const alive = mb.members.filter((x) => x.status === 'alive')
    for (const x of alive) {
      if (e.partyCleanse) Object.assign(x, cleansed())
      if (e.partyHp && !((x.ps?.healBlock || 0) > 0)) x.php = Math.min(x.phpMax, x.php + e.partyHp)
      if (e.partyMp) x.mp = Math.min(x.mpMax, x.mp + e.partyMp)
      if (e.partyStat) addStats(x, e.partyStat)
      if (e.partyCharms) x.charms = (x.charms || 0) + e.partyCharms
    }
    const parts = [e.partyCleanse ? '나쁜 상태 해제' : '', e.partyHp ? `체력 +${e.partyHp}` : '', e.partyMp ? `의지력 +${e.partyMp}` : '', e.partyStat ? statLine(e.partyStat) : '', e.partyCharms ? `부적 +${e.partyCharms}` : ''].filter(Boolean)
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 꺼냈다! 일행 전원 ${parts.join(' · ')}.`, popup: { type: 'item', name: m.name, item: item.name, target: '일행 전원' } }], m.id)
    return { ok: true }
  }
  // 폭죽: 자신을 제외한 일행 전원 다음 공격력 ×2, 사용한 자신은 2턴 행동불능(자신에게는 ×2가 적용되지 않는다).
  // 사람에게 건네는 공격력 버프(마이쮸·폭죽)는 한 번에 하나만 걸릴 수 있어서, 이미 걸려 있는 사람은 건너뛴다.
  if (e.partyBoost) {
    const alive = mb.members.filter((x) => x.status === 'alive')
    let skipped = 0
    for (const x of alive) {
      if (x.id === m.id) continue
      if (x.boost) { skipped += 1; continue }
      x.boost = e.partyBoost
    }
    if (e.selfStun) m.stun = Math.max(m.stun || 0, e.selfStun)
    addLog(
      mb,
      [{
        kind: 'info',
        text: `${m.name}이(가) ${item.name}을(를) 터뜨렸다! 자신을 제외한 일행 전원의 다음 공격력이 ×${e.partyBoost}가 된다. ${m.name}은 ${e.selfStun}턴 동안 움직일 수 없다.${skipped ? ' (이미 다른 공격력 버프가 걸려 있던 일행은 제외됐다)' : ''}`,
        popup: { type: 'item', name: m.name, item: item.name, target: '일행 전원(자신 제외)' },
      }],
      m.id,
    )
    return { ok: true }
  }
  if (t.id !== m.id) return { error: 'self-only' }
  // ── 나에게만: 에너지드링크(revive) · 회복 · v-B.16 부적 · 해제 · 전투 스탯 · 적 피해 · 영력 감소 · 간파
  if (e.revive && (m.energyUsed || m.revive)) return { error: 'already' } // 한 전투에 부활 아이템은 1번 (v71)
  const parts = []
  if (e.revive) {
    m.revive = true
    m.energyUsed = true
    parts.push('전투불능 시 1회 부활 대기, 이 전투에서는 부활 아이템을 다시 쓸 수 없다')
  }
  if (e.cleanse) { Object.assign(m, cleansed()); parts.push('나쁜 상태 해제') }
  if (e.hp && !((m.ps?.healBlock || 0) > 0)) { m.php = Math.min(m.phpMax, m.php + e.hp); parts.push(`체력 +${e.hp}`) }
  if (e.mp) { m.mp = Math.min(m.mpMax, m.mp + e.mp); parts.push(`의지력 +${e.mp}`) }
  if (e.charms) { m.charms = (m.charms || 0) + e.charms; parts.push(`부적 +${e.charms}`) }
  if (e.battleStat) { addStats(m, e.battleStat); parts.push(`이 전투 동안 ${statLine(e.battleStat)}`) }
  if (e.enemyHit) {
    const before = mb.ehp
    mb.ehp = Math.max(1, mb.ehp - rollItemHit(e.enemyHit, mb.enemy.hp, Math.random))
    parts.push(`${mb.enemy.name}에게 피해 ${before - mb.ehp}`)
  }
  if (e.drainSpirit) {
    const before = mb.espirit ?? 0
    mb.espirit = Math.max(0, before - e.drainSpirit)
    parts.push(`적의 영력 -${before - mb.espirit}`)
  }
  if (e.reveal) {
    const n = Math.min(e.reveal, mb.queue?.length ?? 0)
    if (n > (mb.known || 0)) mb.known = n
    parts.push(`적의 행동 ${n}개 간파`)
  }
  addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 사용했다.${parts.length ? ` ${parts.join(' · ')}.` : ''}`, popup: { type: 'item', name: m.name, item: item.name, target: '자신' } }], m.id)
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
  // 도깨비불을 쓴 상태라면 내 턴은 자동으로 기를 모으거나(마지막엔) 터뜨린다 — 입력을 기다리지 않는다.
  if (m.fire > 0) {
    const v0 = viewOfMember(mb, m)
    // 악기(무구 버프): 일행 전원의 공격·반격에 붙는 보정이라, 터지는 순간에도 똑같이 더해 줘야 한다.
    const fireAura = auraFor(mb, m.id)
    const f = afterPlayer(v0, fireTurn(v0, { stats: m.stats, mp: m.mp, boost: m.boost, aura: fireAura }, rng), { action: 'fire', mp: m.mp }, rng)
    m.ps = f.state.ps || {}
    mb.es = f.state.es || {}
    banishCheck(mb, m, Math.max(0, mb.ehp - f.state.ehp))
    m.fire = f.state.fire || 0
    m.fireBuffed = !!f.state.fireBuffed
    if (f.boostUsed) m.boost = false // 터지는 순간 공격력 버프(마이쮸·폭죽)를 다 썼으니 끈다 — 이후 행동에 또 적용되지 않게.
    m.guard = false
    m.bound = false // 자동 충전/발동 턴도 내 턴을 사용했으므로 막기 불가가 만료된다.
    mb.ehp = f.state.ehp
    m.php = Math.max(0, Math.min(m.phpMax, f.state.php))
    m.act = null
    evs.push(...addLog(mb, f.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
    if (mb.ehp <= 0) {
      mb.over = 'win'
      mb.phase = 'over'
      mb.turn = null
      return evs
    }
    // 무당방울: 유효한 행동을 한 소지자는 매 턴 확률적으로 일행 전원의 체력을 회복시킨다. (기 모으는 턴도 '유효한 행동'으로 친다)
    const bell = bellTick(afflictStats(m.stats, m.ps), rng)
    if (bell) {
      const healedNames = []
      for (const x of aliveOf(mb)) {
        if ((x.ps?.healBlock || 0) > 0) continue // 돌림병
        const before = x.php
        x.php = Math.min(x.phpMax, x.php + bell.heal)
        if (x.php > before) healedNames.push(x.name)
      }
      if (healedNames.length) {
        evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] ✦ ${bell.label}! [${bell.basis}, d100 = ${bell.roll}] 일행 전원 체력 +${bell.heal}. (${healedNames.join(', ')})` }], m.id))
      }
    }
    evs.push(...nextActor(mb, rng))
    if (mb.turn) return evs // 다음 사람의 차례
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
    evs.push(...enemyPhase(mb, rng))
    return evs
  }
  // 아이템 사용: 효과는 useItemMB 에서 이미 적용됐다. 이번 턴은 그걸로 끝 — 그대로 다음 사람에게 넘긴다.
  if (m.act?.action === 'item') {
    m.act = null
    m.bound = false // 턴 소모 아이템으로 넘긴 턴에서도 '다음 내 턴 막기 불가'는 해제한다.
    evs.push(...nextActor(mb, rng))
    if (mb.turn) return evs // 다음 사람의 차례
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
    evs.push(...enemyPhase(mb, rng))
    return evs
  }
  // 폭죽 등으로 행동불능인 턴: 아무것도 하지 못하고 그대로 넘어간다.
  if (m.stun > 0) {
    m.stun -= 1
    if (!m.stun && m.ps?.sleep) { m.ps = { ...m.ps }; delete m.ps.sleep }
    m.act = null
    m.bound = false // 행동불능으로 지나간 내 턴에도 막기 불가가 영구 유지되지 않는다.
    evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] 행동불능 상태라 움직이지 못했다. (남은 ${m.stun}턴)` }], m.id))
    evs.push(...nextActor(mb, rng))
    if (mb.turn) return evs // 다음 사람의 차례
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
    evs.push(...enemyPhase(mb, rng))
    return evs
  }
  let act = m.act ?? { action: m.bound ? 'attack' : 'guard', forced: true } // 시간 초과로 넘어간 턴은 '직접 고른 턴'이 아니다
  // 고독의 저주: 실제 시간 3일 동안 10% 확률로 내 턴을 자해 행동으로 대체한다.
  if (m.curseUntil > Date.now() && rng() < 0.1) {
    const selfDamage = Math.max(1, Math.ceil(rng() * Math.max(1, m.stats.aggression)))
    m.php = Math.max(0, m.php - selfDamage)
    m.act = null
    evs.push(...addLog(mb, [{kind:'warn',text:`[${m.name}] [저주] 돌발행동으로 자신을 공격해 체력 ${selfDamage}을 잃었다.`}],m.id))
    if (m.php <= 0) { m.status='down'; evs.push(...addLog(mb,[{kind:'warn',text:`[${m.name}] 저주에 쓰러졌다.`}],m.id)) }
    evs.push(...nextActor(mb, rng))
    if (!mb.turn) { if (!finishIfOver(mb)) evs.push(...enemyPhase(mb,rng)) }
    return evs
  }
  let v = viewOfMember(mb, m)
  // v-B.05: 상태 이상이 고른 행동을 바꾸거나(홀린 귀·연모·공포) 실패시킨다(저림).
  const pre = beforePlayer(v, act.action, { mp: m.mp }, rng)
  if (pre.events.length) evs.push(...addLog(mb, pre.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
  m.ps = pre.state.ps || {}
  if (pre.failed) {
    m.act = null
    m.guard = false
    m.bound = false
    m.myTurns = (m.myTurns || 0) + 1
    m.choseTurns = (m.choseTurns || 0) + 1
    m.lbPick = false
    evs.push(...nextActor(mb, rng))
    if (mb.turn) return evs
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
    evs.push(...enemyPhase(mb, rng))
    return evs
  }
  if (pre.action !== act.action) act = { action: pre.action, scanAmount: 1, forced: act.forced }
  v = pre.state
  const aura = auraFor(mb, m.id) // 악기: 일행 모두의 공격·반격에 붙는 보정(자기 자신에게는 75%만)
  let r
  let targetId = null
  if (act.action === 'psychic') {
    // 업인과보·형상 기억의 대상: 지정했고 아직 살아 있으면 그 사람, 아니면 자기 자신.
    targetId = act.target && mb.members.some((x) => x.id === act.target && x.status === 'alive') ? act.target : m.id
    r = psychicTurn(
      v,
      act.psychic ?? 'survival',
      { stats: m.stats, mp: m.mp, boost: m.boost, aura, buff: act.buff, sacrifice: act.sacrifice, target: targetId, selfId: m.id, amount: act.amount, rerolls: act.rerolls, baseAggression: m.baseAggression },
      rng,
    )
  } else {
    // 활: 일행 중 누구 하나라도 활을 들고 있으면, 활을 들지 않은 사람도 모든 공격이 반드시 명중하고 (호전)% 확률로 방어 태세를 무시한다.
    const archerBow = aliveOf(mb).some((x) => x.fx === 'bow' && !((x.ps?.weaponSeal || 0) > 0))
    r = playerTurn(v, act.action, { stats: m.stats, mp: m.mp, boost: m.boost, scanAmount: act.scanAmount, noRash: true, aura, buff: act.buff, archerBow, forced: !!act.forced }, rng)
  }
  if (r.invalid) {
    // 의지력 부족 등으로 행동이 무효면 턴을 쓰지 않는다 — 아무것도 바꾸지 않고, 같은 사람이 다시 고를 수 있도록 그대로 둔다.
    m.act = null
    const fallback = act.action === 'psychic' ? '쓸 수 없는 영능력이다.' : `의지력이 모자라 행동하지 못했다.`
    evs.push(...addLog(mb, (r.events?.length ? r.events : [{ kind: 'warn', text: fallback }]).map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
    return evs
  }
  // v-B.05: 돌림병이면 형상 기억 등의 회복이 듣지 않는다.
  if ((m.ps?.healBlock || 0) > 0 && r.state.php > v.php) {
    r.state = { ...r.state, php: v.php }
    r.events = [...r.events, { kind: 'warn', text: '돌림병 탓에 회복이 듣지 않았다.' }]
  }
  if ((m.ps?.healBlock || 0) > 0 || r.healTarget) {
    const ht = mb.members.find((x) => x.id === r.healTarget)
    if (ht && (ht.ps?.healBlock || 0) > 0) r.healTarget = null
  }
  // v-B.05: 의지력 비용·자기 피해·적의 껍질/둔갑/방패 진형 등
  r = afterPlayer(v, r, { action: act.action, mp: m.mp }, rng)
  // v-B.08 도깨비 탈: 일반 공격이 (호전/3)% 확률로 아군에게 간다 — 상대가 받을 피해를 대신 아군이 받는다(아군은 체력 1 아래로 내려가지 않는다).
  const ffPercent = act.action === 'attack' ? maskFriendlyFirePercent(m.stats) : 0
  if (ffPercent > 0) {
    const others = aliveOf(mb).filter((x) => x.id !== m.id)
    const roll = 1 + Math.floor(rng() * 100)
    const dealt = Math.max(0, v.ehp - r.state.ehp)
    if (others.length && roll <= ffPercent && dealt > 0) {
      const victim = others[Math.floor(rng() * others.length)]
      const hurt = Math.min(dealt, Math.max(0, victim.php - 1))
      victim.php -= hurt
      // 상대에게 들어갈 뻔한 일격은 없던 일로(쓰러졌다 알림도 지운다) — 그 피해는 아군이 받는다.
      const evs0 = (r.events ?? []).filter((e) => e.kind !== 'end').map((e) => (e.kind === 'player' ? { ...e, text: `(홀림) ${e.text}` } : e))
      r = { ...r, state: { ...r.state, ehp: v.ehp, over: r.state.over === 'win' ? null : r.state.over }, events: [...evs0, { kind: 'warn', text: `도깨비 탈에 홀려 ${victim.name}을(를) 공격했다! 상대 대신 ${victim.name}이(가) 맞았다. (${victim.name} 체력 -${hurt}, 확률 ${ffPercent}% · 굴림 ${roll})` }] }
    }
  }
  m.ps = r.state.ps || {}
  mb.es = r.state.es || {}
  banishCheck(mb, m, Math.max(0, mb.ehp - r.state.ehp))
  if (act.action === 'psychic') {
    // r.state.fallingLight 는 '일행 중 누군가 내려쬐는 빛을 걸어 뒀다'를 가리키는 공유 신호라(viewOfMember 가 매번
    // 그렇게 내려준다), 실제로 지금 쓴 영능력이 falling-light 일 때만 표적을 갱신한다(과거 버그 재발 방지).
    // 다음 적 공격 한 번에 소모되며, enemyPhase 가 쓰고 나면 mb.fallingLight 를 지운다 — 몇 번이든 다시 걸 수 있다.
    if (act.psychic === 'falling-light' && r.state.fallingLight) mb.fallingLight = m.id
    if (r.state.karmicTarget) mb.karmicTarget = targetId
    // 형상 기억: 자기 자신이면 r.state.php 가 이미 100으로 반영되어 아래에서 그대로 적용되지만,
    // 다른 일행을 대상으로 골랐으면 그 사람의 체력은 이 함수가 알지 못하므로 여기서 직접 100으로 맞춘다.
    if (r.earthReduction != null) mb.earthReduction = Math.max(mb.earthReduction || 0, r.earthReduction)
    if (r.starBonus) { m.starBonus = r.starBonus; m.stats.aggression += r.starBonus }
    if (r.healMpTarget) {
      const target = mb.members.find(x => x.id === r.healMpTarget && x.status === 'alive')
      if (target) target.mp = Math.min(target.mpMax, target.mp + (r.healMpAmount || 0))
    }
    if (r.healTarget && r.healTarget !== m.id) {
      const healed = mb.members.find((x) => x.id === r.healTarget && x.status === 'alive')
      if (healed) healed.php = Math.min(healed.phpMax, 100)
    }
  }
  if (r.boostUsed) m.boost = false
  // 벽사진경은 의지력을 실제로 지불한 다음 회복시킨다. 자기에게 쓴 경우에도 유효하다.
  if (r.healMpTarget === m.id) r.selfMpRestoration = r.healMpAmount
  m.mp = Math.max(0, m.mp - (r.mpCost || 0))
  if (r.selfMpRestoration) m.mp = Math.min(m.mpMax, m.mp + r.selfMpRestoration)
  // 초보용 고독 효과는 공격으로 실제 감소한 적 체력에 적용한다.
  const hit = Math.max(0, mb.ehp - r.state.ehp)
  if (hit && mb.enemyVulnerabilityRounds > 0) r.state.ehp = Math.max(0, r.state.ehp - Math.ceil(hit * .2))
  mb.ehp = r.state.ehp
  mb.queue = r.state.queue
  mb.known = r.state.known
  m.guard = r.state.guard
  m.charms = r.state.charms
  m.bound = r.state.bound
  m.fire = r.state.fire || 0 // 도깨비불을 썼다면 여기서 세팅되어, 다음 턴부터 자동으로 진행된다
  m.fireBuffed = !!r.state.fireBuffed // 도깨비불을 효험과 함께 썼다면, 터지는 순간까지 들고 있는다
  m.php = Math.max(0, Math.min(m.phpMax, r.state.php)) // 원숭이 손처럼 자기 체력을 깎는 영능력도 있으니 반영한다(기존 행동들은 자기 체력을 바꾸지 않아 그대로다)
  m.myTurns = r.state.myTurns ?? m.myTurns // 유효한 행동을 했을 때만 늘어난다(무효 처리는 여기까지 오지 않는다)
  m.choseTurns = r.state.choseTurns ?? m.choseTurns // 직접 고른 턴 수(칠성낙인 판정, v-B.06)
  m.lbPick = false // 언어장벽 고르기는 이 턴의 행동으로 끝난다(시간 초과로 다른 행동이 들어가도 해제)
  // 그슨대: 간파로 올려다보면 커진다.
  // v-B.04: 커지는 계기를 보스마다 고를 수 있다(grows.trigger: 'scan' 기본 · 'charm' · 'psychic' · 'guard' · 'attack', 여럿이면 배열).
  if (mb.enemy.grows && growTriggers(mb.enemy).includes(act.action)) evs.push(...growBoss(mb, 1, growReason(mb, m, act.action)))
  if (r.selfStun) m.stun = Math.max(m.stun || 0, r.selfStun) // 원숭이 손의 대가: 즉시 행동불능 (v79.0.7)
  const forced = act.forced ? ' (돌발)' : act.auto ? ' (시간 초과로 막기)' : ''
  // 아군이 영능력을 썼을 때는 팝업으로 바로 보여 줄 수 있도록 표시를 달아 둔다(적 영능력과 같은 꾸며진 팝업). (v71)
  evs.push(
    ...addLog(
      mb,
      r.events.map((e, i) => ({
        ...e,
        text: `[${m.name}${forced}] ${e.text}`,
        ...(i === 0 && act.action === 'psychic' ? { popup: { type: 'psychic', name: m.name, psychic: act.psychic } } : {}),
      })),
      m.id,
    ),
  )
  m.act = null
  if (r.state.over === 'fled') m.status = 'fled'
  const cherryBearer = aliveOf(mb).find(x => x.stats.special === 'cherry' && !((x.ps?.weaponSeal || 0) > 0))
  if (cherryBearer) {
    const heal = Math.max(0, Math.floor(cherryBearer.stats.comprehension / 3))
    if (heal) for (const ally of aliveOf(mb)) if (ally.php < ally.phpMax * 0.3 && !((ally.ps?.healBlock || 0) > 0)) ally.php = Math.min(ally.phpMax, ally.php + heal)
  }
  if (mb.ehp <= 0) {
    mb.over = 'win'
    mb.phase = 'over'
    mb.turn = null
    return evs
  }
  // 무당방울: 유효한 행동을 한 소지자는 매 턴 확률적으로 일행 전원의 체력을 회복시킨다.
  const bell = bellTick(afflictStats(m.stats, m.ps), rng)
  if (bell) {
    const healedNames = []
    for (const x of aliveOf(mb)) {
      if ((x.ps?.healBlock || 0) > 0) continue // 돌림병
      const before = x.php
      x.php = Math.min(x.phpMax, x.php + bell.heal)
      if (x.php > before) healedNames.push(x.name)
    }
    if (healedNames.length) {
      evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] ✦ ${bell.label}! [${bell.basis}, d100 = ${bell.roll}] 일행 전원 체력 +${bell.heal}. (${healedNames.join(', ')})` }], m.id))
    }
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
  // 보스마다 광분 단계 문구·효과가 다를 수 있다(없으면 불가살이 방식).
  const rage = mb.enemy.rage ?? {}
  if (stage > (mb.rage || 0)) {
    mb.rage = stage
    notes.push(stage === 1
      ? rage.stage1 ?? `${mb.enemy.name}이(가) 사납게 몸을 뒤튼다! (3라운드마다 반드시 영능력을 쓴다)`
      : rage.stage2 ?? `${mb.enemy.name}이(가) 광분한다! (약공이 모두 단체 공격으로 바뀐다)`)
  }
  let out = intent
  if (stage >= 2 && rage.jabToGroup !== false && out === 'jab') out = 'group'
  const every = Math.max(1, rage.specialEvery ?? 3) // v-B.04: 보스마다 '몇 라운드마다 반드시 영능력'을 정할 수 있다(기본 3)
  if (stage >= 1 && mb.round % every === 0 && ['jab', 'group', 'guard'].includes(out)) out = 'special'
  return { intent: out, notes }
}

/** v-B.05 백귀행렬: 끌려간 사람이 있는 동안 남은 일행이 준 피해를 모은다. 충분하면 바로 돌아온다. */
function banishCheck(mb, by, dealt) {
  if (!(dealt > 0)) return
  for (const x of mb.members) {
    if (!(x.banished > 0) || x.id === by.id) continue
    x.banishDealt = (x.banishDealt || 0) + dealt
    if (x.banishDealt >= (x.banishNeed || 0)) {
      x.banished = 0
      x.banishDealt = 0
      addLog(mb, [{ kind: 'warn', text: `[${x.name}] 일행의 기세에 행렬이 흐트러졌다! 끌려갔던 ${x.name}이(가) 돌아왔다.` }], x.id)
    }
  }
}

/** v-B.08: 쓰러지는 순간 다시 일어설 수 있는지 — 에너지드링크가 먼저, 없으면 기합의 띠. 쓰면 그 문구를 돌려준다. */
function spendRevive(m) {
  if (m.revive) { m.revive = false; m.reviveUsed = true; return `[${m.name}] 에너지드링크의 힘으로 체력 1로 다시 일어섰다!` }
  if (m.headband) { m.headband = false; m.headbandUsed = true; return `[${m.name}] 기합의 띠가 끊어지며 체력 1로 다시 일어섰다!` }
  return null
}
/** 쓰러질 때의 처리(에너지드링크 · 기합의 띠 → 버티기 대기 → 전투불능). lines 에 로그를 덧붙인다. */
function downOrPending(mb, m, lines) {
  if (m.revive || m.headband) {
    const text = spendRevive(m)
    m.php = 1
    lines.push({ kind: 'warn', text, popup: { type: 'revived', name: m.name } })
  } else if ((m.survived | 0) < maxSurvives(m.stats) && m.mp >= 2) {
    m.pendingDeath = true
    m.php = 0
    lines.push({ kind: 'warn', text: `[${m.name}] 전투불능 상태가 되었다.`, popup: { type: 'downed', name: m.name } })
  } else {
    m.status = 'down'
    m.php = 0
    lines.push({ kind: 'warn', text: `[${m.name}] 전투불능 상태가 되었다.`, popup: { type: 'downed', name: m.name } })
  }
}

/** 라운드 끝 상태 이상 피해(독·쥐 떼·땡볕·역병·이음): 막을 수 없고 인내도 듣지 않는다. 병·지신밟기는 반영. */
function roundHurt(mb, m, raw, text, evs, blockHalf = false) {
  if (!m || m.status !== 'alive' || m.php <= 0 || m.pendingDeath) return 0
  let d = Math.max(0, Math.floor(raw))
  if (blockHalf && m.guard) d = Math.ceil(d / 2)
  if ((m.ps?.vulnerable || 0) > 0) d = Math.ceil(d * 1.25)
  if (mb.earthReduction > 0 && d > 0) d -= Math.floor(d * Math.min(1, mb.earthReduction))
  m.php = Math.max(0, m.php - d)
  const lines = [{ kind: 'enemy', dmg: d, text: `[${m.name}] ${text} ${d} 피해!` }]
  if (d > 0 && m.ps?.sleep && m.stun > 0) {
    m.stun = 0
    m.ps = { ...m.ps }
    delete m.ps.sleep
    lines.push({ kind: 'warn', text: `[${m.name}] 아픔에 번쩍 정신이 들었다! 가위눌림에서 깨어났다.` })
  }
  if (m.php <= 0) downOrPending(mb, m, lines)
  evs.push(...addLog(mb, lines, 'enemy'))
  return d
}

const rngPick = (arr, rng) => arr[Math.floor(rng() * arr.length)]
const freshOf = (before, after) => Object.keys(after || {}).filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after[k]))

function enemyPhase(mb, rng) {
  const evs = []
  // v-B.05: 상대 차례가 시작될 때 상태를 센다(내 상태는 매 라운드 1씩, 적의 쥐 떼도).
  for (const m of aliveOf(mb)) {
    const t = tickStatus(m.ps, 'start')
    m.ps = t.ps || {}
    if (t.events.length) evs.push(...addLog(mb, t.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
  }
  const te = tickEnemyStatus(mb.es, 'start')
  mb.es = te.es || {}
  if (te.events.length) evs.push(...addLog(mb, te.events, 'enemy'))
  const psSnap = Object.fromEntries(mb.members.map((m) => [m.id, { ...(m.ps || {}) }]))
  const esSnap = { ...mb.es }
  // 백귀행렬에 끌려간 사람은 공격받지 않는다.
  const alive = aliveOf(mb).filter((m) => m.php > 0 && !(m.banished > 0))
  if (!alive.length) {
    if (!aliveOf(mb).length) {
      finishIfOver(mb)
      return evs
    }
  }
  mb.turn = null
  const gim = bossGimmick(mb, mb.queue[0])
  let intent = gim.intent
  for (const n of gim.notes) evs.push(...addLog(mb, [{ kind: 'warn', text: n }], 'enemy'))
  const willowBearer = aliveOf(mb).find(m => m.stats.special === 'willow' && !((m.ps?.weaponSeal || 0) > 0))
  if (intent === 'special' && willowBearer && Math.floor(willowBearer.stats.comprehension / 2) >= Math.ceil(rng() * 100)) {
    const rerolled = rollIntent(mb.queue[0], rng, true, !!mb.enemy.boss)
    intent = rerolled
    evs.push(...addLog(mb, [{ kind: 'warn', text: `[${willowBearer.name}] 버드나무의 효과! 적의 아군 대상 영능력 행동을 재굴림했다.` }], willowBearer.id))
  }
  if (intent === 'special') {
    const orchidBearer = aliveOf(mb).find(m => m.stats.special === 'orchid' && !m.specialSeen && !((m.ps?.weaponSeal || 0) > 0))
    if (orchidBearer) {
      orchidBearer.specialSeen = true
      intent = 'none'
      evs.push(...addLog(mb, [{ kind: 'warn', text: `[${orchidBearer.name}] 난초의 효과! 처음 목격한 영능력을 완전히 무효화했다.` }], orchidBearer.id))
    }
  }
  // 영능력 전용 영력이 다하면 영능력 대신 약공으로 대신한다(다인 전투에서는 일행 수와 무관하게 한 번만 깎인다).
  if (intent === 'special' && (mb.espirit ?? mb.enemy.spirit) <= 0) {
    intent = 'jab'
    evs.push(...addLog(mb, [{ kind: 'warn', text: `${mb.enemy.name}은(는) 영력이 다해 영능력을 쓰지 못한다! 대신 약공으로.` }], 'enemy'))
  } else if (intent === 'special') {
    const spCost = specialSpiritCost(mb.enemy)
    mb.espirit = Math.max(0, (mb.espirit ?? mb.enemy.spirit) - spCost)
    evs.push(...addLog(mb, [{ kind: 'info', text: `(영능력에 영력 ${spCost} 소모, 남은 영력 ${mb.espirit}/${mb.enemy.spirit})` }], 'enemy'))
  }
  // 모두 끌려가고 아무도 남지 않았다(혼자 남은 사람이 끌려가는 일은 없지만, 대비): 상대는 그냥 숨을 고른다.
  if (!alive.length) intent = 'none'
  if (intent !== mb.queue[0]) mb.queue = [intent, ...mb.queue.slice(1)]
  const sp = intent === 'special' && mb.enemy.special2 ? (rng() < 0.5 ? 2 : 1) : 1
  const spDef = sp === 2 ? mb.enemy.special2 : mb.enemy.special
  // special2 는 일행 전원(기본), special 은 한 사람(기본). 데이터형 영능력은 effect.target 으로 바꿀 수 있다. (v-B.04)
  // v-B.05: 사람을 고르는 방식이 영능력마다 다르다(effectTargeting).
  const tg = intent === 'special' ? effectTargeting(spDef, sp === 2) : intent === 'group' ? 'all' : 'one'
  const eff = intent === 'special' ? spDef?.effect ?? {} : {}
  const group = tg === 'all'
  const hits = intent === 'jab' || intent === 'smash' || intent === 'special'
  let targets
  let karmicMult = 1
  const ctxOf = {} // 대상별 추가 ctx (차례로 줄어드는 피해, 싸움 붙이기 등)
  let partyNote = null
  // 내려쬐는 빛: 다음 적의 공격(단일·단체 모두, 영능력 포함)을 무조건 자신에게 맞게 한다 — 실제로 공격이 들어오는 턴에만 소모된다.
  const flTarget = mb.fallingLight && mb.members.find((x) => x.id === mb.fallingLight && x.status === 'alive' && x.php > 0 && !(x.banished > 0))
  const markT = mb.es?.mark && alive.find((x) => x.id === mb.es.mark.id)
  const unshielded = alive.filter((x) => !hasActiveSpiritBarrier(x, mb.enemy))
  const pickOne = () => {
    if (flTarget) return flTarget
    if (markT) return markT
    const pick = pickTarget(alive.map((m) => ({ id: m.id, hp: m.php })), rng)
    return mb.members.find((m) => m.id === pick.id)
  }
  if (!alive.length) {
    targets = []
  } else if (group) {
    if (flTarget) {
      targets = [flTarget]
      karmicMult = alive.length
      mb.fallingLight = null
      evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 내려쬐는 빛! ${mb.enemy.name}의 단체 공격이 ${flTarget.name}에게 쏠린다. (인원 ${karmicMult}명치)` }], 'enemy'))
    } else {
      // 업인과보: 단체 공격·다중 타겟 영능력을 지정한 한 사람에게만, 인원수만큼 곱해서 쏠리게 한다.
      const krTarget = mb.karmicTarget && mb.members.find((x) => x.id === mb.karmicTarget && x.status === 'alive' && x.php > 0 && !(x.banished > 0))
      if (krTarget) {
        targets = [krTarget]
        karmicMult = alive.length
        evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 업인과보! ${mb.enemy.name}의 단체 공격이 ${krTarget.name}에게 단일로 쏠린다. (인원 ${karmicMult}명치)` }], 'enemy'))
      } else {
        targets = alive
        evs.push(...addLog(mb, [{ kind: 'info', text: intent === 'special' ? `▶ ${mb.enemy.name}이(가) 일행 전원을 향해 《${spDef.label}》!` : `▶ ${mb.enemy.name}의 단체 공격! 일행 전원에게 약공이 들어온다!` }], 'enemy'))
      }
    }
    if (eff.release) {
      const pool = (mb.es.takenNow || 0) + (mb.es.takenLog || []).slice(-(Math.max(1, eff.release.rounds) - 1)).reduce((a, b) => a + b, 0)
      const share = Math.ceil((pool * eff.release.pct) / Math.max(1, targets.length)) * (karmicMult > 1 ? 1 : 1)
      for (const t of targets) ctxOf[t.id] = { releaseShare: share }
    }
  } else if (tg === 'lowest') {
    const t = flTarget || [...alive].sort((a, b) => a.php - b.php)[0]
    targets = [t]
    if (flTarget) mb.fallingLight = null
    evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ ${mb.enemy.name}이(가) 가장 약한 ${t.name}에게 몰려든다!` }], 'enemy'))
  } else if (tg === 'chain') {
    const first = pickOne()
    if (flTarget) mb.fallingLight = null
    const rest = alive.filter((x) => x.id !== first.id).sort(() => rng() - 0.5)
    targets = [first, ...rest]
    targets.forEach((t, i) => { ctxOf[t.id] = { dmgScale: 0.5 ** i } })
    evs.push(...addLog(mb, [{ kind: 'info', text: `▶ ${mb.enemy.name}이(가) ${targets.map((t) => t.name).join(' → ')} 차례로 문다!` }], 'enemy'))
  } else if (tg === 'ff') {
    const pool = unshielded.length ? unshielded : alive
    if (pool.length >= 2) {
      const a = rngPick(pool, rng)
      const b = rngPick(pool.filter((x) => x.id !== a.id), rng)
      targets = [b, a]
      ctxOf[b.id] = { ffRaw: strikeOf(afflictStats(a.stats, a.ps), rng), ffFrom: a.name }
      ctxOf[a.id] = { ffRaw: strikeOf(afflictStats(b.stats, b.ps), rng), ffFrom: b.name }
      evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ ${mb.enemy.name}이(가) ${a.name}와(과) ${b.name} 사이에 싸움을 붙인다!` }], 'enemy'))
    } else targets = [pool[0]]
  } else if (tg === 'swap') {
    const pool = unshielded.length ? unshielded : alive
    const byRatio = [...pool].sort((a, b) => b.php / b.phpMax - a.php / a.phpMax)
    const hi = byRatio[0]
    const lo = byRatio[byRatio.length - 1]
    targets = [hi]
    const hr = hi.php / hi.phpMax
    const lr = lo.php / lo.phpMax
    if (pool.length >= 2 && hi.id !== lo.id && Math.abs(hr - lr) < 0.01) partyNote = '넋을 뒤바꿨지만 모두 몸 상태가 같아 달라진 게 없다'
    else if (pool.length >= 2 && hi.id !== lo.id && !hasActiveSpiritBarrier(hi, mb.enemy)) {
      hi.php = Math.max(1, Math.round(lr * hi.phpMax))
      lo.php = Math.max(1, Math.round(hr * lo.phpMax))
      partyNote = `${hi.name}(${Math.round(hr * 100)}%)와 ${lo.name}(${Math.round(lr * 100)}%)의 넋이 뒤바뀌었다`
      evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 넋이 뒤바뀐다! ${hi.name}의 체력은 ${Math.round(lr * 100)}%, ${lo.name}의 체력은 ${Math.round(hr * 100)}%가 되었다.` }], 'enemy'))
    }
  } else if (tg === 'mark' || tg === 'link' || tg === 'banish') {
    const pool = unshielded.length ? unshielded : alive
    const t = tg === 'banish' ? (() => { const p = pickTarget(pool.map((m) => ({ id: m.id, hp: m.php })), rng); return mb.members.find((m) => m.id === p.id) })() : rngPick(pool, rng)
    targets = [t]
    if (!hasActiveSpiritBarrier(t, mb.enemy)) {
      if (tg === 'mark') {
        mb.es = { ...mb.es, mark: { id: t.id, rounds: eff.mark } }
        partyNote = `${t.name}에게 흰 털 냄새가 묻었다 (${eff.mark}라운드)`
        evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ ${t.name}에게 흰 털 냄새가 묻었다! ${eff.mark}라운드 동안 한 사람을 노리는 공격은 모두 ${t.name}에게 간다.` }], 'enemy'))
      } else if (tg === 'link' && pool.length >= 2) {
        const u = rngPick(pool.filter((x) => x.id !== t.id), rng)
        mb.es = { ...mb.es, link: { ids: [t.id, u.id], rounds: eff.link } }
        partyNote = `${t.name}와(과) ${u.name}이(가) 이어졌다 (${eff.link}라운드)`
        evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 산과 물이 ${t.name}와(과) ${u.name}을(를) 잇는다! ${eff.link}라운드 동안 한쪽이 다치면 다른 쪽도 절반만큼 다친다.` }], 'enemy'))
      } else if (tg === 'banish' && pool.length >= 2) {
        t.banished = eff.banish.rounds
        t.banishNeed = Math.max(1, effectExpr(eff.banish.need, mb.enemy))
        t.banishDealt = 0
        t.banishFresh = true
        partyNote = `${t.name}이(가) 행렬에 끌려갔다 (${eff.banish.rounds}라운드)`
        evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 백귀행렬이 ${t.name}을(를) 끌고 간다! ${eff.banish.rounds}라운드 동안 싸움에서 빠진다. (남은 일행이 ${t.banishNeed} 이상 때리면 돌아온다)` }], 'enemy'))
      }
    }
  } else {
    // 내려쬐는 빛: 단일 대상 공격도 무조건 그걸 쓴 사람에게 향한다. 흰 털 냄새가 묻은 사람이 있으면 그쪽으로.
    targets = [pickOne()]
    if (hits) {
      if (flTarget) mb.fallingLight = null
      evs.push(
        ...addLog(
          mb,
          [{
            kind: flTarget || markT ? 'warn' : 'info',
            text: flTarget
              ? `▶ 내려쬐는 빛! ${mb.enemy.name}이(가) ${targets[0].name}을(를) 향한다.`
              : markT
                ? `▶ 흰 털 냄새를 따라 ${mb.enemy.name}이(가) ${targets[0].name}을(를) 노린다!`
                : `▶ ${mb.enemy.name}이(가) ${targets[0].name}을(를) 노린다! (체력이 가장 많은 사람)`,
          }],
          'enemy',
        ),
      )
    }
  }
  // 대상 전원이 결계로 보호되더라도 적의 영능력 시전은 사라지지 않는다.
  // 영력 소모, 시전 팝업, 후속 행동은 그대로 유지한다. (단일 시전은 약공으로 대체.)
  const pierce = intent === 'special' && effectPierces(spDef) // 영력결계를 꿰뚫는 영능력(결계째 삼키기)
  if (intent === 'special' && !pierce && targets.length && targets.every(t => hasActiveSpiritBarrier(t, mb.enemy))) {
    const psychic = spDef
    evs.push(...addLog(mb, [{
      kind: 'special', label: psychic?.label, note: psychic?.note,
      enemyId: sp === 2 ? `${mb.enemy.id}-2` : mb.enemy.id,
      chance: SPECIAL_PERCENT, effects: specialEffects(mb.enemy),
      result: group
        ? '정상 시전되었으나 모든 대상이 영력결계로 효과를 받지 않았다.'
        : '단일 대상이 영력결계를 지녀 약공으로 대체되었다.',
    }], 'enemy'))
  }
  const linkOf = (t) => {
    const l = mb.es?.link
    if (!l || !l.ids.includes(t.id)) return null
    return mb.members.find((x) => x.id === l.ids.find((id) => id !== t.id) && x.status === 'alive' && !(x.banished > 0)) ?? null
  }
  const linkHits = []
  if (!targets.length) {
    // 아무도 칠 수 없다: 라운드만 넘긴다.
    mb.queue = [...mb.queue.slice(1), rollIntent(mb.queue[mb.queue.length - 1], rng, true, !!mb.enemy.boss)]
    mb.known = Math.max(0, mb.known - 1)
    mb.round += 1
    evs.push(...addLog(mb, [{ kind: 'info', text: `${mb.enemy.name}이(가) 숨을 고른다.` }], 'enemy'))
  }
  targets.forEach((t, i) => {
    if (mb.ehp <= 0) return
    const barrierActive = hasActiveSpiritBarrier(t, mb.enemy) && !pierce
    const blocksGroupSpecial = intent === 'special' && group && barrierActive
    const downgradesSingleSpecial = intent === 'special' && !group && barrierActive
    if (blocksGroupSpecial) {
      // 적의 '단체 영능력' 행동을 삭제하지 않는다. 해당 대상에게만 피해/부가 효과가 없다.
      // 이 대상이 마지막 순서라도 enemyTurn('none')으로 라운드/행동 큐는 반드시 한 번 진행한다.
      evs.push(...addLog(mb, [{ kind:'warn', text:`[${t.name}] 영력결계! 단체 영능력의 효과를 받지 않았다.` }], t.id))
    } else if (downgradesSingleSpecial) {
      evs.push(...addLog(mb, [{ kind:'warn', text:`[${t.name}] 영력결계! 자신을 향한 단일 영능력이 약공으로 바뀌었다.` }], t.id))
    }
    const last = i === targets.length - 1
    const q = [...mb.queue]
    if (blocksGroupSpecial) q[0] = 'none' // 이 대상에게만 무효: 다른 파티원에게는 원래 영능력을 적용
    else if (intent === 'group' || downgradesSingleSpecial) q[0] = 'jab'
    // 내려쬐는 빛으로 대신 맞는 공격은 무조건 '막기'로 처리된다. (v71)
    const v = { ...viewOfMember(mb, t), guard: flTarget && t.id === flTarget.id ? true : t.guard, queue: q }
    const prevPhp = t.php
    const r = enemyTurn(v, { stats: t.stats, mp: t.mp, sp, noSpiritGate: true, aura: auraFor(mb, t.id), willowHandled: true, firstTarget: i === 0, reduction: mb.earthReduction || 0, partyN: alive.length, partyNote, ...(ctxOf[t.id] || {}) }, rng) // 악기: 반격자 본인이면 75%만 · 적 체력 회복은 첫 대상에서 한 번만
    // 지신밟기는 enemyTurn 안에서 받는 피해에 바로 적용된다(reduction). (v-B.04)
    if (karmicMult > 1) {
      const dealt = Math.max(0, prevPhp - r.state.php)
      const extra = dealt * (karmicMult - 1)
      if (extra > 0) {
        r.state.php = Math.max(0, r.state.php - extra)
        r.events = [...r.events, { kind: 'warn', text: `업인과보로 피해가 ${karmicMult}배가 되어 추가로 ${extra} 피해를 입었다.` }]
        // 기본 피해로는 쓰러지지 않았는데 곱해진 추가 피해로 체력이 0이 된 경우: enemyTurn 내부에선 보지 못했으므로 여기서 같은 판정을 한다.
        if (r.state.php <= 0 && !r.state.pendingDeath && r.state.over !== 'lose') {
          const mpLeft = Math.floor(t.mp) - (r.mpDrain || 0)
          if ((t.survived | 0) < maxSurvives(t.stats) && mpLeft >= 2) {
            r.state.pendingDeath = true
            r.events = [...r.events, { kind: 'warn', text: '체력이 바닥났다…! 버티기를 쓸 수 있다.' }]
          } else {
            r.state.over = 'lose'
            r.events = [...r.events, { kind: 'end', text: '더는 버티지 못하고 쓰러졌다.' }]
          }
        }
      }
    }
    if (last) {
      mb.queue = r.state.queue
      mb.known = r.state.known
      mb.round = r.state.round
      mb.lies = r.state.lies ?? null
    }
    mb.ehp = r.state.ehp // 막기 반격으로 쓰러질 수도 있다
    mb.es = r.state.es || {}
    t.php = r.state.php
    t.phpMax = r.state.phpMax ?? t.phpMax // 할퀸 상처
    t.charms = r.state.charms ?? t.charms // 끝없는 허기
    t.survived = r.state.survived ?? t.survived // 명부 쇠사슬
    t.ps = r.state.ps || {}
    if (r.state.barrierBroken) t.barrierBroken = true
    if ((t.starBonus || 0) > 0 && !(r.state.starBonus > 0)) { t.stats.aggression -= t.starBonus; t.starBonus = 0 } // 여우구슬
    if ((t.fire || 0) > 0 && !(r.state.fire > 0)) { t.fire = 0; t.fireBuffed = false }
    t.specialSaved = !!r.state.specialSaved
    t.specialSeen = !!r.state.specialSeen
    t.curse = r.state.curse
    t.bound = r.state.bound || t.bound
    if (r.sealed || (r.state.psySeal || 0) > (t.psySeal || 0)) { t.psySeal = Math.max(t.psySeal || 0, r.state.psySeal || 0); t.psySealFresh = true } // 이번 라운드에 걸린 봉인은 다음 라운드부터 센다
    t.stun = r.state.pstun || 0 // 데이터형 영능력의 행동불능·가위눌림(깨어나면 0) (v-B.04 · v-B.05)
    t.mp = Math.max(0, t.mp - (r.mpDrain || 0))
    // 대상 면역일 때 생긴 내부 '행동이 무효화' 안내는 적 전체가 공격을 취소한 것으로 오해될 수 있으므로 숨긴다.
    let tevs = (blocksGroupSpecial ? r.events.filter(e => !/행동이 무효화/.test(e.text || '')) : r.events)
      .map((e) => (e.kind === 'warn' || e.kind === 'end' ? { ...e, kind: e.kind === 'end' ? 'warn' : e.kind, text: `[${t.name}] ${e.text}` } : (group || targets.length > 1) && e.kind === 'enemy' ? { ...e, text: `[${t.name}] ${e.text}` } : e))
    const downed = r.state.pendingDeath || r.state.over === 'lose'
    if (downed && (t.revive || t.headband)) {
      const text = spendRevive(t)
      t.php = 1
      tevs = [
        ...tevs.filter((e) => !/버티기를 쓸 수 있다|쓰러졌다|버티지 못/.test(e.text || '')),
        { kind: 'warn', text, popup: { type: 'revived', name: t.name } },
      ]
    } else if (r.state.pendingDeath) {
      t.pendingDeath = true
      t.php = 0
      tevs = [...tevs, { kind: 'warn', text: `[${t.name}] 전투불능 상태가 되었다.`, popup: { type: 'downed', name: t.name } }]
    } else if (r.state.over === 'lose') {
      t.status = 'down'
      t.php = 0
      tevs = [...tevs, { kind: 'warn', text: `[${t.name}] 전투불능 상태가 되었다.`, popup: { type: 'downed', name: t.name } }]
    }
    evs.push(...addLog(mb, tevs, 'enemy'))
    // 산과 물 잇기: 이어진 사람도 절반만큼 다친다(라운드 끝에 한꺼번에).
    const hurtNow = Math.max(0, prevPhp - (t.pendingDeath || t.status === 'down' ? 0 : t.php))
    const other = hurtNow > 0 ? linkOf(t) : null
    if (other) linkHits.push([other, Math.floor(hurtNow / 2), t.name])
  })
  for (const [o, d, from] of linkHits) if (d > 0) roundHurt(mb, o, d, `${from}와(과) 이어진 기운으로 아픔이 번진다.`, evs)
  // v-B.05: 라운드 끝 상태 이상 피해 — 쥐 떼·땡볕·독·역병 (막기 상태가 풀리기 전에)
  if (mb.ehp > 0) {
    const live = () => aliveOf(mb).filter((x) => x.php > 0 && !x.pendingDeath && !(x.banished > 0))
    if (mb.es.summon > 0 && live().length) {
      const v = rngPick(live(), rng)
      roundHurt(mb, v, 1 + Math.floor(rng() * Math.max(1, mb.es.summonDie || 1)), `쥐 떼가 발목을 문다${v.guard ? ' (막기로 절반)' : ''}.`, evs, true)
    }
    if (mb.es.field) for (const x of live()) roundHurt(mb, x, 1 + Math.floor(rng() * Math.max(1, mb.es.field.die)), '땡볕이 내리쬔다.', evs)
    for (const x of live()) if ((x.ps?.poison || 0) > 0) roundHurt(mb, x, x.ps.poison * (1 + Math.floor(rng() * Math.max(1, x.ps.poisonDie || 1))), `독이 퍼진다 (${x.ps.poison}겹).`, evs)
    const sick = live().filter((x) => (x.ps?.plague || 0) > 0)
    for (const x of sick) roundHurt(mb, x, 1 + Math.floor(rng() * Math.max(1, x.ps.plagueDie || 1)), '역병이 몸을 갉는다.', evs)
    if (sick.length) {
      const clean = live().filter((x) => !((x.ps?.plague || 0) > 0) && !hasActiveSpiritBarrier(x, mb.enemy))
      if (clean.length) {
        const n = rngPick(clean, rng)
        n.ps = { ...(n.ps || {}), plague: 3, plagueDie: sick[0].ps.plagueDie }
        evs.push(...addLog(mb, [{ kind: 'warn', text: `[${n.name}] 역병이 옮아왔다! (3라운드)` }], n.id))
      }
    }
  }
  for (const m of mb.members) m.guard = false
  // 뼈 맞추기: 쓰러져도 한 번은 일어선다.
  if (mb.ehp <= 0) {
    const sv = { ehp: mb.ehp, enemy: mb.enemy, es: mb.es }
    const rl = []
    if (reviveCheck(sv, rl)) {
      mb.ehp = sv.ehp
      mb.es = sv.es
      evs.push(...addLog(mb, rl, 'enemy'))
    }
  }
  if (mb.ehp <= 0) {
    mb.over = 'win'
    mb.phase = 'over'
    evs.push(...addLog(mb, [{ kind: 'end', text: `${mb.enemy.name}이(가) 쓰러졌다.` }]))
    return evs
  }
  // v-B.05: 라운드 끝 기록(되감기·원한)과 상태 세기
  mb.es = { ...mb.es, ehpHist: [...(mb.es.ehpHist || []), mb.ehp].slice(-4), takenLog: [...(mb.es.takenLog || []), mb.es.takenNow || 0].slice(-4), takenNow: 0 }
  for (const m of aliveOf(mb)) {
    const t = tickStatus(m.ps, 'end', freshOf(psSnap[m.id], m.ps))
    m.ps = t.ps || {}
    if (t.events.length) evs.push(...addLog(mb, t.events.map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
    if (m.banished > 0) {
      if (m.banishFresh) m.banishFresh = false
      else {
        m.banished -= 1
        if (!m.banished) evs.push(...addLog(mb, [{ kind: 'info', text: `[${m.name}] 행렬에서 빠져나와 일행에게 돌아왔다.` }], m.id))
      }
    }
  }
  const et = tickEnemyStatus(mb.es, 'end', freshOf(esSnap, mb.es))
  mb.es = et.es || {}
  if (et.events.length) evs.push(...addLog(mb, et.events, 'enemy'))
  // 영능력 봉인: 걸린 라운드 다음부터 한 라운드가 끝날 때마다 1씩 줄어든다(= 다음 3라운드 동안 봉인).
  for (const m of mb.members) {
    if (m.psySealFresh) m.psySealFresh = false
    else if ((m.psySeal || 0) > 0) {
      m.psySeal -= 1
      if (!m.psySeal) evs.push(...addLog(mb, [{ kind: 'info', text: `[${m.name}] 영능력 봉인이 풀렸다.` }], m.id))
    }
  }
  // 그슨대: 체력 25% 미만이면 매 라운드 끝마다 스스로 커진다. (문구는 rage.growText 로 바꿀 수 있다)
  if (mb.enemy.rage?.growEachRound && (mb.rage || 0) >= 2) evs.push(...growBoss(mb, 1, mb.enemy.rage.growText ?? '그림자가 하늘까지 솟는다.'))
  // v-B.04: 저주에 걸린 사람이 있으면 라운드 끝마다 커진다(grows.onCursed). v-B.05: 역병도 친다.
  if (mb.enemy.grows?.onCursed && aliveOf(mb).some((x) => (x.curse || 0) > 0 || (x.ps?.plague || 0) > 0)) evs.push(...growBoss(mb, 1, mb.enemy.grows.cursedText ?? `저주가 번진다.`))
  // v-B.04: 재생(regen: { pct, from }) — 광분 단계가 from 이상이면 라운드 끝마다 체력 최대치의 pct 만큼 회복한다.
  const regen = mb.enemy.regen
  if (regen && mb.ehp > 0 && mb.ehp < mb.enemy.hp && (mb.rage || 0) >= (regen.from ?? 0)) {
    const before = mb.ehp
    mb.ehp = Math.min(mb.enemy.hp, mb.ehp + Math.ceil(mb.enemy.hp * regen.pct))
    evs.push(...addLog(mb, [{ kind: 'warn', text: `${regen.text ?? `${mb.enemy.name}이(가) 숨을 고른다.`} (체력 +${mb.ehp - before})` }], 'enemy'))
  }
  return evs.concat(afterEnemy(mb, rng))
}

/** 보스가 커지는 계기 목록 (grows.trigger, 기본 'scan'. 빈 배열이면 행동으로는 커지지 않는다) */
export const growTriggers = (enemy) => (enemy?.grows ? [].concat(enemy.grows.trigger ?? 'scan') : [])
const GROW_TEXT = {
  scan: '{who}이(가) {boss}을(를) 올려다보았다.',
  charm: '{who}의 부적이 {boss}을(를) 자극했다.',
  psychic: '{who}의 영능력을 {boss}이(가) 받아먹었다.',
  guard: '{who}이(가) 웅크리자 {boss}의 기세가 올랐다.',
  attack: '{who}의 공격에 {boss}이(가) 더 사나워졌다.',
}
function growReason(mb, m, action) {
  const t = (typeof mb.enemy.grows?.msg === 'object' ? mb.enemy.grows.msg[action] : mb.enemy.grows?.msg) ?? GROW_TEXT[action] ?? GROW_TEXT.scan
  return t.replaceAll('{who}', m.name).replaceAll('{boss}', mb.enemy.name)
}

/**
 * 커지는 보스(그슨대 등): 단계를 올리고 공격력을 다시 계산한다. 최대 단계면 그대로.
 * 반환: 로그 이벤트 목록
 */
export function growBoss(mb, amount, reason) {
  const g = mb.enemy.grows
  if (!g || amount <= 0) return []
  const base = mb.enemy.baseAtk ?? enemyById(mb.enemy.id)?.atk ?? mb.enemy.atk
  const before = mb.grow || 0
  mb.grow = Math.min(g.max, before + amount)
  mb.enemy.atk = base + g.atkPerStage * mb.grow
  if (mb.grow === before) return addLog(mb, [{ kind: 'info', text: `${reason} 그러나 ${mb.enemy.name}은(는) 이미 끝까지 커졌다. (${mb.grow}/${g.max}단계)` }], 'enemy')
  return addLog(mb, [{ kind: 'warn', text: `${reason} ${mb.enemy.name}이(가) 더 커졌다! (${mb.grow}/${g.max}단계 · 공격력 ${mb.enemy.atk})` }], 'enemy')
}

/** 버티기 대기자가 있으면 그 단계로, 없으면 다음 라운드로 */
export function afterEnemy(mb, rng = Math.random) {
  if (mb.enemyVulnerabilityRounds > 0) mb.enemyVulnerabilityRounds -= 1
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
  const evs = addLog(
    mb,
    r.events.map((e, i) => ({
      ...e,
      kind: e.kind === 'end' ? 'warn' : e.kind,
      text: `[${m.name}] ${e.text}`,
      ...(i === r.events.length - 1
        ? r.state.over === 'lose'
          ? { popup: { type: 'downed', name: m.name } }
          : r.state.survived
            ? { popup: { type: 'revived', name: m.name } }
            : {}
        : {}),
    })),
    m.id,
  )
  if (!pendingSurvivors(mb).length) evs.push(...afterEnemy(mb, rng))
  return { ok: true, events: evs }
}

/** v-B.17: 판 기록에 안내 한 줄(접속 끊김 등)을 남긴다. */
export function noteMB(mb, text) {
  return addLog(mb, [{ kind: 'info', text }], null)
}

/** 전투에서 뺀다 — v-B.17부터는 본인이 [전투 이탈]을 눌렀을 때만 쓴다(접속이 끊겨도 빠지지 않는다). */
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
    grow: mb.grow || 0, // 커지는 보스(그슨대)의 현재 단계
    enemyAtk: mb.enemy.atk, // 전투 중 바뀐 현재 공격력
    ehp: mb.ehp,
    queue: shownQueue(mb.queue, mb.lies).slice(0, mb.over ? 0 : mb.known), // 헛것 보이기(v-B.05)면 몇 개는 거짓으로 보인다
    es: Object.fromEntries(Object.entries(mb.es || {}).filter(([k]) => !['ehpHist', 'takenLog', 'takenNow'].includes(k))),
    known: mb.over ? 0 : mb.known,
    round: mb.round,
    turn: mb.turn,
    order: mb.order,
    phase: mb.phase,
    over: mb.over,
    members: mb.members.map((m) => ({
      id: m.id,
      name: m.name,
      agility: m.stats.agility,
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
      headbandUsed: !!m.headbandUsed, // v-B.08 기합의 띠가 끊어졌다 → 내 쪽에서 장신구를 없앤다
      energyUsed: !!m.energyUsed, // 이 전투에서 에너지드링크를 이미 마셨다 (v-B.06: 소지품 창에서 바로 알린다)
      psychicBring: m.psychicBring,
      passiveOff: m.passiveOff || [],
      lbPick: !!m.lbPick,
      psySeal: m.psySeal || 0, // 영능력 봉인 남은 라운드 (그슨대)
      ps: m.ps || {}, // v-B.05 상태 이상
      stun: m.stun || 0,
      banished: m.banished || 0,
      barrierBroken: !!m.barrierBroken,
      starBonus: m.starBonus || 0,
      curseUntil: m.curseUntil || 0,
      fire: m.fire || 0,
  specialSaved: !!m.specialSaved,
  specialSeen: !!m.specialSeen,
      acted: !!m.act,
      result: resultOf(mb, m.id),
    })),
    log: mb.log.slice(-40),
    ...extra,
  }
}

export { STAT_KEYS }
