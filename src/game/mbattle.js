/**
 * 다인 전투(여럿이 함께 상대 한 명을 치는 전투)의 순수 로직. 서버가 이 모듈로 판을 진행하고, 클라이언트는 결과(view)만 받는다.
 *
 * 한 라운드: 살아 있는 모두가 행동을 고른다 → 신속이 빠른 순서대로 한 명씩 해결 → 상대가 한 번 움직인다(체력이 가장 많은 사람을 노린다).
 * 개인 판정(명중·피해·돌발·버티기…)은 기존 단독 전투의 함수(playerTurn · enemyTurn · resolveSurvive)를 그대로 쓴다.
 */
import { ENEMIES, auraOf, auraSelfOf, bellTick, enemyTurn, fireTurn, maxSurvives, mpCostOf, newBattle, pickTarget, playerTurn, psychicTurn, resolveSurvive, rollInitiative, rollRash, maxHp, specialSpiritCost, rollIntent } from './battle.js'
import { itemTurnFree } from './items.js'

/** 일행 전체의 악기 보정을 공격자 기준으로 합산한다 — 악기를 든 사람 자신이 공격자면 그만큼은 75%만 적용된다. (v71) */
const auraFor = (mb, attackerId) => aliveOf(mb).reduce((sum, x) => sum + (x.id === attackerId ? auraSelfOf(x.stats) : auraOf(x.stats)), 0)

export const MULTI_TAG = '다인 전투'
export const isMulti = (e) => !!e?.tags?.includes(MULTI_TAG)
export const MB_INPUT_MS = 45_000
export const MB_SURVIVE_MS = 20_000
export const MB_LOG_MAX = 80

const STAT_KEYS = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension']
// 다인 전투에서 쓸 수 있는 영능력 id 전체(기존엔 생존본능뿐이었으나, 솔로 전투에서 구현된 6종도 모두 받아들인다).
const PSYCHIC_IDS = ['survival', 'cotton-mist', 'monkey-paw', 'echo-form', 'falling-light', 'karmic-recompense', 'dokkaebi-fire']
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : lo))

/** 클라이언트가 보낸 스탯을 안전한 정수로 고친다. */
export function cleanStats(raw = {}) {
  const out = {}
  for (const k of Object.keys(raw)) if (typeof raw[k] === 'number') out[k] = clampNum(Math.round(raw[k]), 1, 999)
  for (const k of ['insight', 'aggression', 'endurance', 'control', 'agility']) if (!out[k]) out[k] = 1
  return out
}

export const FX_IDS = ['fan', 'spear', 'dagger', 'sword', 'bow', 'bell', 'instrument', 'sickle', 'staff', 'mace']

export function makeMember({ id, name, stats, fx, special, hp, hpMax, mp, mpMax, revive, boost, bring, psychicBring }) {
  const st = cleanStats(stats)
  // 무구의 특수 효과 id 는 스탯 목록에 나타나지 않게(열거되지 않게) 붙인다. (엔진은 stats.fx 를 본다)
  const fxId = FX_IDS.includes(fx) ? fx : null
  if (fxId) Object.defineProperty(st, 'fx', { value: fxId, enumerable: false })
  if (typeof special === 'string') Object.defineProperty(st, 'special', { value: special, enumerable: false })
  const phpMax = Math.round(clampNum(hpMax ?? maxHp(st), 1, 9999))
  return {
    id,
    name,
    stats: st,
    php: Math.round(clampNum(hp ?? phpMax, 1, phpMax)),
    phpMax,
    mp: special === 'plum' ? 150 : Math.floor(clampNum(mp ?? 0, 0, 9999)),
    mpMax: special === 'plum' ? 150 : Math.floor(clampNum(mpMax ?? mp ?? 0, 0, 9999)),
    charms: 3,
    guard: false,
    bound: false,
    stun: 0, // 남은 행동불능 턴 수(0이면 정상). 폭죽 등으로 걸린다.
    specialSaved: false,
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
    boost: !!boost,
    bring: bring ?? null, // 보스 전투: 가져온 아이템 { id: 개수 } (null 이면 제한 없음)
    psychicBring: psychicBring ?? null, // 보스 전투: 가져온 영능력 id 목록(최대 2개, null 이면 제한 없음) (v71)
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
  myTurns: m.myTurns,
  fallingLight: !!mb.fallingLight,
  usedItems: m.usedItems,
  party: true,
  over: null,
  fire: m.fire || 0,
  specialSaved: !!m.specialSaved,
  specialSeen: !!m.specialSeen,
  fireBuffed: !!m.fireBuffed,
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
  if (a === 'psychic' && !PSYCHIC_IDS.includes(act.psychic)) return { error: 'bad-psychic' }
  // 보스 전투: 미리 가져가기로 고른 영능력(최대 2개)만 쓸 수 있다. (v71)
  if (a === 'psychic' && mb.enemy.boss && Array.isArray(m.psychicBring) && !m.psychicBring.includes(act.psychic)) return { error: 'not-brought' }
  m.act = {
    action: a,
    scanAmount: a === 'scan' ? Math.max(1, Math.min(m.mp, Math.floor(act.scanAmount ?? 1))) : undefined,
    psychic: act.psychic,
    buff,
    // 원숭이 손: 깎을 체력. 업인과보·형상 기억: 지정한 대상(형상 기억은 자신 또는 치유할 일행).
    sacrifice: a === 'psychic' && act.psychic === 'monkey-paw' ? Math.max(0, Math.floor(act.sacrifice ?? 0)) : undefined,
    target: a === 'psychic' && (act.psychic === 'karmic-recompense' || act.psychic === 'echo-form') && typeof act.target === 'string' ? act.target : undefined,
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
  if (mb.turn !== id) return { error: 'not-your-turn' } // 아이템도 자기 차례에만 쓸 수 있다.
  if (m.act) return { error: 'already' }
  if (m.stun > 0 || m.fire > 0) return { error: 'busy' } // 행동불능·도깨비불 충전 중엔 아이템도 쓸 수 없다.
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
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) ${who}에게 건넸다. ${t.name}의 다음 행동 피해가 2배가 된다.`, popup: { type: 'item', name: m.name, item: item.name, target: who } }], m.id)
    return { ok: true }
  }
  // 봉지 과자 / 조각 케이크: 파티(살아있는 전원) 체력·의지력 회복.
  if (e.partyHp || e.partyMp) {
    const alive = mb.members.filter((x) => x.status === 'alive')
    for (const x of alive) {
      if (e.partyHp) x.php = Math.min(x.phpMax, x.php + e.partyHp)
      if (e.partyMp) x.mp = Math.min(x.mpMax, x.mp + e.partyMp)
    }
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 꺼냈다! 일행 전원의 ${e.partyHp ? `체력 +${e.partyHp}` : `의지력 +${e.partyMp}`}.`, popup: { type: 'item', name: m.name, item: item.name, target: '일행 전원' } }], m.id)
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
  // 쌍쌍바: 파티원에게 주면 더 크게, 자기 자신이면 조금 회복.
  if (e.giveHp) {
    if (t.status !== 'alive') return { error: 'bad-target' }
    const amount = t.id === m.id ? e.giveHp.self : e.giveHp.party
    t.php = Math.min(t.phpMax, t.php + amount)
    const who = t.id === m.id ? '자신' : t.name
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) ${who}에게 건넸다. 체력 +${amount}.`, popup: { type: 'item', name: m.name, item: item.name, target: who } }], m.id)
    return { ok: true }
  }
  if (t.id !== m.id) return { error: 'self-only' }
  if (e.revive) {
    // 에너지드링크: 한 전투에 1회만 쓸 수 있다 — 효과가 소비된 뒤(부활 뒤)에도 다시 쓸 수 없다. (v71)
    if (m.energyUsed) return { error: 'already' }
    if (m.revive) return { error: 'already' }
    m.revive = true
    m.energyUsed = true
    addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 마셨다. (전투불능 시 1회 부활 대기, 이 전투에서는 다시 쓸 수 없다)`, popup: { type: 'item', name: m.name, item: item.name, target: '자신' } }], m.id)
    return { ok: true }
  }
  if (e.hp) m.php = Math.min(m.phpMax, m.php + e.hp)
  if (e.mp) m.mp = Math.min(m.mpMax, m.mp + e.mp)
  addLog(mb, [{ kind: 'info', text: `${m.name}이(가) ${item.name}을(를) 사용했다.`, popup: { type: 'item', name: m.name, item: item.name, target: '자신' } }], m.id)
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
    const f = fireTurn(v0, { stats: m.stats, mp: m.mp, boost: m.boost, aura: fireAura }, rng)
    m.fire = f.state.fire || 0
    m.fireBuffed = !!f.state.fireBuffed
    if (f.boostUsed) m.boost = false // 터지는 순간 공격력 버프(마이쮸·폭죽)를 다 썼으니 끈다 — 이후 행동에 또 적용되지 않게.
    m.guard = false
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
    const bell = bellTick(m.stats, rng)
    if (bell) {
      const healedNames = []
      for (const x of aliveOf(mb)) {
        const before = x.php
        x.php = Math.min(x.phpMax, x.php + bell.heal)
        if (x.php > before) healedNames.push(x.name)
      }
      if (healedNames.length) {
        evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] ✦ 무당방울! [이해 ${bell.chance}%, d100 = ${bell.roll}] 일행 전원 체력 +${bell.heal}. (${healedNames.join(', ')})` }], m.id))
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
    m.act = null
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
  const act = m.act ?? { action: m.bound ? 'attack' : 'guard' }
  const v = viewOfMember(mb, m)
  const aura = auraFor(mb, m.id) // 악기: 일행 모두의 공격·반격에 붙는 보정(자기 자신에게는 75%만)
  let r
  let targetId = null
  if (act.action === 'psychic') {
    // 업인과보·형상 기억의 대상: 지정했고 아직 살아 있으면 그 사람, 아니면 자기 자신.
    targetId = act.target && mb.members.some((x) => x.id === act.target && x.status === 'alive') ? act.target : m.id
    r = psychicTurn(
      v,
      act.psychic ?? 'survival',
      { stats: m.stats, mp: m.mp, boost: m.boost, aura, buff: act.buff, sacrifice: act.sacrifice, target: targetId, selfId: m.id },
      rng,
    )
  } else {
    // 활: 일행 중 누구 하나라도 활을 들고 있으면, 활을 들지 않은 사람도 모든 공격이 반드시 명중하고 (호전)% 확률로 방어 태세를 무시한다.
    const archerBow = aliveOf(mb).some((x) => x.fx === 'bow')
    r = playerTurn(v, act.action, { stats: m.stats, mp: m.mp, boost: m.boost, scanAmount: act.scanAmount, noRash: true, aura, buff: act.buff, archerBow }, rng)
  }
  if (r.invalid) {
    // 의지력 부족 등으로 행동이 무효면 턴을 쓰지 않는다 — 아무것도 바꾸지 않고, 같은 사람이 다시 고를 수 있도록 그대로 둔다.
    m.act = null
    const fallback = act.action === 'psychic' ? '쓸 수 없는 영능력이다.' : `의지력이 모자라 행동하지 못했다.`
    evs.push(...addLog(mb, (r.events?.length ? r.events : [{ kind: 'warn', text: fallback }]).map((e) => ({ ...e, text: `[${m.name}] ${e.text}` })), m.id))
    return evs
  }
  if (act.action === 'psychic') {
    // r.state.fallingLight 는 '일행 중 누군가 내려쬐는 빛을 걸어 뒀다'를 가리키는 공유 신호라(viewOfMember 가 매번
    // 그렇게 내려준다), 실제로 지금 쓴 영능력이 falling-light 일 때만 표적을 갱신한다(과거 버그 재발 방지).
    // 다음 적 공격 한 번에 소모되며, enemyPhase 가 쓰고 나면 mb.fallingLight 를 지운다 — 몇 번이든 다시 걸 수 있다.
    if (act.psychic === 'falling-light' && r.state.fallingLight) mb.fallingLight = m.id
    if (r.state.karmicTarget) mb.karmicTarget = targetId
    // 형상 기억: 자기 자신이면 r.state.php 가 이미 100으로 반영되어 아래에서 그대로 적용되지만,
    // 다른 일행을 대상으로 골랐으면 그 사람의 체력은 이 함수가 알지 못하므로 여기서 직접 100으로 맞춘다.
    if (r.healTarget && r.healTarget !== m.id) {
      const healed = mb.members.find((x) => x.id === r.healTarget && x.status === 'alive')
      if (healed) healed.php = Math.min(healed.phpMax, 100)
    }
  }
  if (r.boostUsed) m.boost = false
  m.mp = Math.max(0, m.mp - (r.mpCost || 0))
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
  const cherryBearer = aliveOf(mb).find(x => x.stats.special === 'cherry')
  if (cherryBearer) {
    const heal = Math.max(0, Math.floor(cherryBearer.stats.comprehension / 3))
    if (heal) for (const ally of aliveOf(mb)) if (ally.php < ally.phpMax * 0.3) ally.php = Math.min(ally.phpMax, ally.php + heal)
  }
  if (mb.ehp <= 0) {
    mb.over = 'win'
    mb.phase = 'over'
    mb.turn = null
    return evs
  }
  // 무당방울: 유효한 행동을 한 소지자는 매 턴 확률적으로 일행 전원의 체력을 회복시킨다.
  const bell = bellTick(m.stats, rng)
  if (bell) {
    const healedNames = []
    for (const x of aliveOf(mb)) {
      const before = x.php
      x.php = Math.min(x.phpMax, x.php + bell.heal)
      if (x.php > before) healedNames.push(x.name)
    }
    if (healedNames.length) {
      evs.push(...addLog(mb, [{ kind: 'warn', text: `[${m.name}] ✦ 무당방울! [이해 ${bell.chance}%, d100 = ${bell.roll}] 일행 전원 체력 +${bell.heal}. (${healedNames.join(', ')})` }], m.id))
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
  let intent = gim.intent
  for (const n of gim.notes) evs.push(...addLog(mb, [{ kind: 'warn', text: n }], 'enemy'))
  const willowBearer = aliveOf(mb).find(m => m.stats.special === 'willow')
  if (intent === 'special' && willowBearer && Math.floor(willowBearer.stats.comprehension / 2) >= Math.ceil(rng() * 100)) {
    const rerolled = rollIntent(mb.queue[0], rng, true, !!mb.enemy.boss)
    intent = rerolled
    evs.push(...addLog(mb, [{ kind: 'warn', text: `[${willowBearer.name}] 버드나무의 효과! 적의 아군 대상 영능력 행동을 재굴림했다.` }], willowBearer.id))
  }
  if (intent === 'special') {
    const orchidBearer = aliveOf(mb).find(m => m.stats.special === 'orchid' && !m.specialSeen)
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
  if (intent !== mb.queue[0]) mb.queue = [intent, ...mb.queue.slice(1)]
  const sp = intent === 'special' && mb.enemy.special2 ? (rng() < 0.5 ? 2 : 1) : 1
  const group = intent === 'group' || (intent === 'special' && sp === 2)
  const hits = intent === 'jab' || intent === 'smash' || intent === 'special'
  let targets
  let karmicMult = 1
  // 내려쬐는 빛: 다음 적의 공격(단일·단체 모두, 영능력 포함)을 무조건 자신에게 맞게 한다 — 실제로 공격이 들어오는 턴에만 소모된다.
  const flTarget = mb.fallingLight && mb.members.find((x) => x.id === mb.fallingLight && x.status === 'alive' && x.php > 0)
  if (group) {
    if (flTarget) {
      targets = [flTarget]
      karmicMult = alive.length
      mb.fallingLight = null
      evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 내려쬐는 빛! ${mb.enemy.name}의 단체 공격이 ${flTarget.name}에게 쏠린다. (인원 ${karmicMult}명치)` }], 'enemy'))
    } else {
      // 업인과보: 단체 공격·다중 타겟 영능력을 지정한 한 사람에게만, 인원수만큼 곱해서 쏠리게 한다.
      const krTarget = mb.karmicTarget && mb.members.find((x) => x.id === mb.karmicTarget && x.status === 'alive' && x.php > 0)
      if (krTarget) {
        targets = [krTarget]
        karmicMult = alive.length
        evs.push(...addLog(mb, [{ kind: 'warn', text: `▶ 업인과보! ${mb.enemy.name}의 단체 공격이 ${krTarget.name}에게 단일로 쏠린다. (인원 ${karmicMult}명치)` }], 'enemy'))
      } else {
        targets = alive
        evs.push(...addLog(mb, [{ kind: 'info', text: intent === 'special' ? `▶ ${mb.enemy.name}이(가) 일행 전원을 향해 《${mb.enemy.special2.label}》!` : `▶ ${mb.enemy.name}의 단체 공격! 일행 전원에게 약공이 들어온다!` }], 'enemy'))
      }
    }
  } else {
    // 내려쬐는 빛: 단일 대상 공격도 무조건 그걸 쓴 사람에게 향한다.
    const pick = flTarget ? { id: flTarget.id } : pickTarget(alive.map((m) => ({ id: m.id, hp: m.php })), rng)
    targets = [mb.members.find((m) => m.id === pick.id)]
    if (hits) {
      if (flTarget) mb.fallingLight = null
      evs.push(
        ...addLog(
          mb,
          [{
            kind: flTarget ? 'warn' : 'info',
            text: flTarget
              ? `▶ 내려쬐는 빛! ${mb.enemy.name}이(가) ${targets[0].name}을(를) 향한다.`
              : `▶ ${mb.enemy.name}이(가) ${targets[0].name}을(를) 노린다! (체력이 가장 많은 사람)`,
          }],
          'enemy',
        ),
      )
    }
  }
  targets.forEach((t, i) => {
    if (mb.ehp <= 0) return
    const last = i === targets.length - 1
    const q = [...mb.queue]
    if (intent === 'group') q[0] = 'jab'
    // 내려쬐는 빛으로 대신 맞는 공격은 무조건 '막기'로 처리된다. (v71)
    const v = { ...viewOfMember(mb, t), guard: flTarget && t.id === flTarget.id ? true : t.guard, queue: q }
    const prevPhp = t.php
    const r = enemyTurn(v, { stats: t.stats, mp: t.mp, sp, noSpiritGate: true, aura: auraFor(mb, t.id), willowHandled: true }, rng) // 악기: 반격자 본인이면 75%만
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
    }
    mb.ehp = r.state.ehp // 막기 반격으로 쓰러질 수도 있다
    t.php = r.state.php
    t.specialSaved = !!r.state.specialSaved
    t.specialSeen = !!r.state.specialSeen
    t.curse = r.state.curse
    t.bound = r.state.bound || t.bound
    t.mp = Math.max(0, t.mp - (r.mpDrain || 0))
    let tevs = r.events.map((e) => (e.kind === 'warn' || e.kind === 'end' ? { ...e, kind: e.kind === 'end' ? 'warn' : e.kind, text: `[${t.name}] ${e.text}` } : group && e.kind === 'enemy' ? { ...e, text: `[${t.name}] ${e.text}` } : e))
    const downed = r.state.pendingDeath || r.state.over === 'lose'
    if (downed && t.revive) {
      t.revive = false
      t.php = 1
      tevs = [
        ...tevs.filter((e) => !/버티기를 쓸 수 있다|쓰러졌다|버티지 못/.test(e.text || '')),
        { kind: 'warn', text: `[${t.name}] 에너지드링크의 힘으로 체력 1로 다시 일어섰다!`, popup: { type: 'revived', name: t.name } },
      ]
      t.reviveUsed = true
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
      psychicBring: m.psychicBring,
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
