/**
 * 퇴마 실습 전투 (체육관). 순수 로직: 화면과 무관하게 테스트·시뮬레이션할 수 있다.
 *
 * 적 하나의 능력치는 4개: 체력(hp) · 공격력(atk) · 행동력(act) · 영력(spirit).
 *  - 영력은 상대의 '기운'이자 쓰러뜨렸을 때 얻는 전리품(내가 얻는 영력 = 상대의 영력)이다.
 *  - 행동력은 선공 판정의 기준값이다.
 * 전투 중에는 상대의 능력치를 알 수 없고(안목·조우 횟수에 따라 일부 공개), 상대가 다음에 무엇을 할지도 알 수 없다.
 * 간파로 몇 턴 앞의 행동을 미리 본다. 모든 판정은 주사위(rng 는 0 이상 1 미만).
 */

/** 전투 보상 = 상대 영력의 2배 */
export const REWARD_MULT = 2

export const ENEMIES = [
  {
    id: 'scarecrow',
    name: '허수아비 잡귀',
    blurb: '밭에서 떠도는 잡귀. 움직임이 단순하다.',
    hp: 60,
    atk: 6,
    act: 6,
    spirit: 5,
    special: { label: '혼 빨기', note: '의지력을 빨아들인다.' },
  },
  {
    id: 'snake',
    name: '먹구렁이',
    blurb: '묵은 담벼락 밑에서 몸을 부풀려 덮치는 구렁이.',
    hp: 90,
    atk: 10,
    act: 9,
    spirit: 8,
    special: { label: '휘감기', note: '몸을 감아 조이고, 다음 내 턴엔 막기를 할 수 없다.' },
  },
  {
    id: 'wonhon',
    name: '묵은 원귀',
    blurb: '오래 묵어 독이 오른 원귀. 한 방이 무겁다.',
    hp: 130,
    atk: 15,
    act: 14,
    spirit: 13,
    special: { label: '원한의 저주', note: '세 번의 상대 턴 동안 매번 피해가 스며든다.' },
  },
  // ───────── 파티 전투용 하급 요괴 ─────────
  // partySize 명이 함께 상대하는 걸 기준으로 맞췄다. (혼자서는 벅차다.) 이 상대들은 체력이 더 많은 사람을 먼저 노린다. (pickTarget)
  {
    id: 'foxfire',
    name: '여우불',
    blurb: '밤길에 여우 울음 같은 소리를 내며 떠도는 푸른 불꽃 무리. 혼자서는 벅차지만 둘이 함께라면 해볼 만하다.',
    tier: 1,
    partySize: 2,
    hp: 110,
    atk: 6,
    act: 7,
    spirit: 6,
    special: { label: '불똥 흩뿌리기', note: '사방으로 튀는 불똥. 막을 수 없는 피해를 입는다.' },
  },
  {
    id: 'dueoksini',
    name: '두억시니',
    blurb: '어둠 속에서 사람을 짓누르는 사나운 야차. 셋은 모여야 맞설 수 있다.',
    tier: 2,
    partySize: 3,
    hp: 280,
    atk: 11,
    act: 11,
    spirit: 11,
    special: { label: '짓누르는 그림자', note: '막을 수 없는 일격으로 몸을 짓누르고, 의지력을 빨아들이며, 다음 내 턴엔 막기를 할 수 없다.' },
  },
].map((e, i) => ({ ...e, tier: e.tier ?? i + 1, partySize: e.partySize ?? 1, reward: e.spirit * REWARD_MULT }))

/** 단계별 적정 레벨(모든 스탯이 대략 이 정도일 때) */
export const REC_STATS = { 1: '2~3', 2: '5~6', 3: '8~10' }
export const recLabel = (e) => `모든 스탯 ${REC_STATS[e.tier] ?? '?'} 기준`
export const partyLabel = (e) => (e.partySize > 1 ? `적정 ${e.partySize}명` : '적정 1명')

/** 파티 전투에서 상대가 노릴 사람: 체력이 가장 많은 사람. 같으면 무작위. members = [{ id, hp }] (쓰러진 사람 제외) */
export function pickTarget(members, rng = Math.random) {
  const alive = members.filter((m) => m.hp > 0)
  if (!alive.length) return null
  const top = Math.max(...alive.map((m) => m.hp))
  const ties = alive.filter((m) => m.hp === top)
  return ties[Math.floor(rng() * ties.length)]
}

/** 전투 교육 과정용 연습 상대. 쓰러지지 않도록 체력이 넉넉하고 공격은 약하다. */
export const TUTOR_ENEMY = {
  id: 'scarecrow',
  name: '연습용 허수아비',
  blurb: '바리가 준비한 연습 상대.',
  hp: 400,
  atk: 3,
  act: 1,
  spirit: 3,
  reward: 0,
  special: { label: '혼 빨기', note: '의지력을 빨아들인다.' },
}

export const INTENTS = {
  jab: { label: '약공', note: '일반 공격.' },
  smash: { label: '강공', note: '기를 모아 내리치는 일격!' },
  charge: { label: '기 모으기', note: '다음 턴에 강공이 온다.' },
  guard: { label: '방어 태세', note: '이번 턴 내 공격 피해가 절반이 된다.' },
  special: { label: '영능력', note: '상대마다 다른 비기.' },
}

export const ACTIONS = {
  attack: { label: '일반 공격', note: '안목으로 명중, 호전으로 피해. 명중 굴림 1이면 빗나간다.' },
  guard: { label: '막기', note: '약공 절반 · 강공 1/3만 받고, 1d(호전)만큼 더 막는다.' },
  charm: { label: '부적', note: '빗나감 없는 2배 피해, 방어 무시. 한 판 3장 · 의지력 소모.' },
  scan: { label: '간파', note: '의지력 N을 쓰면 상대의 다음 행동을 (2+N)턴 앞서 본다. 안목이 상대 영력보다 높으면 (4+N)턴. 영능력은 ‘영능력’이라고만 보인다.' },
  buff: { label: '효험', note: '의지력 10(모자라면 0까지). 공격을 두 번 굴려 더 나은 쪽을 고른다.' },
  psychic: { label: '영능력', note: '지금까지 익힌 영능력(스킬)을 확인하고 쓴다.' },
}

/**
 * 영능력(= 특수 행동 = 스킬) 도감. 내가 익힐 수 있는 영능력을 여기에 정의한다. (아직 없음)
 * 항목 예: { id: 'dokkaebi-fire', label: '도깨비불', note: '설명', cost: 0 }
 * 익히는 과정을 만들면 progress.js 의 acquirePsychic(player, id) 로 player.psychics 에 넣으면 되고,
 * 전투 '영능력' 탭에는 그 목록이 자동으로 나타난다.
 */
export const PSYCHICS = [
  {
    id: 'survival',
    label: '생존본능',
    note: '불리한 전투라고 판단이 될 때 적을 교란하고 전투에서 도망친다. 후일을 도모하는 것도 결국 살아있는 자들의 특권이 아닌가.',
    detail: '자신의 턴에 사용. (50% + 1d(신속)×2 − 상대의 영력)% 확률로 전투에서 도주한다.',
    cond: '전투 중 최초로 전투불능이 되어본다.',
    use: true,
  },
]

/** 생존본능 도주 확률(%) = 50 + 1d(신속)×2 − 상대의 영력, 0~100 로 자른다. */
export function fleeChance(roll, enemy) {
  return Math.max(0, Math.min(100, 50 + roll * 2 - enemy.spirit))
}

/** 영능력 사용(내 턴). 지금은 생존본능만. 반환: { state, events, mpCost, fled } — 실패하면 내 턴을 쓴 것으로 치고 상대 턴으로 넘어간다. */
export function psychicTurn(state, id, ctx, rng = Math.random) {
  const { stats } = ctx
  const s = { ...state, guard: false }
  if (id !== 'survival') return { state, events: [], mpCost: 0, invalid: true }
  const roll = die(stats.agility, rng)
  const chance = fleeChance(roll, s.enemy)
  const d = Math.floor(rng() * 100) + 1
  if (d <= chance) {
    s.over = 'fled'
    return {
      state: s,
      events: [{ kind: 'end', text: `✦ 생존본능! [신속 d${stats.agility} = ${roll}, 도주 ${chance}%, d100 = ${d}] 적을 교란하고 전투에서 도망쳤다.` }],
      mpCost: 0,
      fled: true,
      boostUsed: !!ctx.boost,
    }
  }
  return {
    state: s,
    events: [{ kind: 'warn', text: `✦ 생존본능… 실패! [신속 d${stats.agility} = ${roll}, 도주 ${chance}%, d100 = ${d}] 도망치지 못했다.` }],
    mpCost: 0,
    fled: false,
    boostUsed: !!ctx.boost,
  }
}

export const CHARMS = 3
export const BASE_HP = 24
export const HP_PER_ENDURANCE = 3
export const BUFF_COST = 10
export const SCAN_COST = 1
export const CHARM_DIE = 50 // 부적 의지력 소모 = 1d(50 - 절제)

const die = (n, rng) => 1 + Math.floor(rng() * Math.max(1, Math.floor(n)))
const d10 = (rng) => die(10, rng)

export const maxHp = (stats) => BASE_HP + HP_PER_ENDURANCE * stats.endurance
/** 돌발 행동 확률(%) = 호전 − 절제 (0 미만이면 0). 호전 30 · 절제 17 이면 13%, 호전 5 · 절제 1 이면 4%. */
export const rashPercent = (stats) => Math.max(0, Math.min(100, Math.floor(stats.aggression - stats.control)))
/**
 * 내 턴이 시작될 때마다 항상 굴리는 돌발 판정(1d100). 굴림이 확률 이하이면 hit — 그 턴엔 어떤 조건이든 상대에게 무조건 일반 공격을 한다.
 */
export function rollRash(stats, rng = Math.random) {
  const percent = rashPercent(stats)
  const roll = die(100, rng)
  return { percent, roll, hit: roll <= percent }
}
export const charmDie = (stats) => Math.max(1, CHARM_DIE - stats.control)
/** 간파: 의지력 1 이면 3턴(안목이 상대 영력보다 높으면 5턴), 1 늘릴 때마다 1턴씩 더 본다. */
export const scanTurns = (stats, enemy, amount = 1) => (stats.insight > enemy.spirit ? 5 : 3) + Math.max(0, Math.floor(amount) - 1)

/** 상대에 대해 무엇을 알 수 있는가. fights = 지금까지 이 상대와 싸운 횟수(이번 전투 제외). */
export function revealOf(enemy, stats, fights) {
  const sharp = stats.insight > enemy.spirit
  const again = fights >= 1
  return {
    hp: again || sharp,
    atk: again && sharp,
    act: again && sharp,
    spirit: again && sharp,
  }
}

/** 상대가 다음에 할 행동을 한 번 굴린다. 기 모으기 다음은 반드시 강공. */
function rollIntent(prev, rng) {
  if (prev === 'charge') return 'smash'
  const r = d10(rng)
  if (r <= 2) return 'charge'
  if (r <= 7) return 'jab' // (7 은 기획에 빠져 있어 약공으로 둔다)
  if (r <= 9) return 'guard'
  return 'special'
}

export function newBattle(enemyId, stats, rng = Math.random, startHp, hpCap) {
  const enemy = typeof enemyId === 'object' ? enemyId : ENEMIES.find((e) => e.id === enemyId)
  const queue = []
  let prev = null
  for (let i = 0; i < 5; i++) {
    prev = rollIntent(prev, rng)
    queue.push(prev)
  }
  const hp = hpCap ?? maxHp(stats)
  const cur = startHp == null ? hp : Math.max(1, Math.min(hp, Math.round(startHp)))
  return {
    enemy,
    ehp: enemy.hp,
    php: cur,
    phpMax: hp,
    round: 1,
    queue, // queue[0] = 이번 라운드에 상대가 실제로 할 행동
    known: 0, // queue 앞쪽 몇 개를 알고 있는가
    guard: false,
    charms: CHARMS,
    bound: false, // 휘감겨서 이번 내 턴엔 막기 불가
    curse: 0, // 남은 저주 턴
    pendingDeath: false,
    survived: false, // 버티기는 한 전투에 한 번만
    over: null, // 'win' | 'lose' | 'fled'
  }
}

/** 선공 판정: 1d10 + 1d(신속) 이 상대의 행동력 이상이면 내가 먼저. 신속이 행동력 이상이면 무조건 선공. */
export function rollInitiative(enemy, stats, rng = Math.random) {
  if (stats.agility >= enemy.act) return { playerFirst: true, auto: true, a: 0, b: 0, total: 0 }
  const a = d10(rng)
  const b = die(stats.agility, rng)
  return { playerFirst: a + b >= enemy.act, auto: false, a, b, total: a + b }
}

/** 일반 공격 한 번의 굴림. noMiss 면 명중 굴림 1도 2로 친다(부적). */
function attackRoll(stats, rng, noMiss = false) {
  let hit = die(stats.insight + 1, rng)
  const raw = hit
  if (noMiss && hit < 2) hit = 2
  if (hit < 2) return { hit: raw, power: 0, dmg: 0, miss: true }
  const power = die(stats.aggression, rng)
  return { hit: raw, power, dmg: power * 2 + hit, miss: false }
}

/**
 * 내 턴. ctx = { stats, mp }. 반환: { state, events, mpCost }
 * 이어서 상대 턴(enemyTurn)을 호출해야 한다. 내 행동으로 상대가 쓰러지면 state.over === 'win'.
 */
export function playerTurn(state, action, ctx, rng = Math.random) {
  const { stats } = ctx
  const mp = Math.floor(ctx.mp)
  const s = { ...state, guard: false }
  const ev = []
  let mpCost = 0
  const act = action

  // 의지력이 0이면 의지력을 쓰는 행동은 할 수 없다. 모자랄 뿐이면 0까지 쓰고 그 행동을 한다.
  if ((act === 'charm' || act === 'scan' || act === 'buff') && mp < 1) {
    ev.push({ kind: 'warn', text: '의지력이 0이라 쓸 수 없다!' })
    return { state: state, events: ev, mpCost: 0, invalid: true }
  }
  const braced = s.queue[0] === 'guard'
  const mult = ctx.boost ? 2 : 1 // 마이쭈: 이번 턴 피해 2배
  const bn = ctx.boost ? ' (마이쭈 ×2)' : ''

  const strike = (r, label = '공격') => {
    if (r.miss) return `${label}이 빗나갔다! [안목 d${stats.insight + 1} = ${r.hit}]`
    return `${label}! [안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}]`
  }

  if (act === 'attack') {
    const r = attackRoll(stats, rng)
    let dmg = r.dmg * mult
    let note = r.miss ? '' : bn
    if (!r.miss && braced) { dmg = Math.ceil(dmg / 2); note += ' (방어에 절반으로 막힘)' }
    s.ehp = Math.max(0, s.ehp - dmg)
    ev.push({ kind: 'player', roll: r.hit, dmg, text: `${strike(r)}${r.miss ? '' : ` ${dmg} 피해${note}`}` })
  } else if (act === 'buff') {
    mpCost = Math.min(BUFF_COST, mp)
    const r1 = attackRoll(stats, rng)
    const r2 = attackRoll(stats, rng)
    const best = r1.dmg >= r2.dmg ? r1 : r2
    let dmg = best.dmg * mult
    let note = dmg > 0 ? bn : ''
    if (dmg > 0 && braced) { dmg = Math.ceil(dmg / 2); note += ' (방어에 절반으로 막힘)' }
    s.ehp = Math.max(0, s.ehp - dmg)
    ev.push({ kind: 'player', text: `효험! 의지력 ${mpCost}을 쏟아 두 번 굴린다. 첫 번째 ${r1.miss ? '빗나감' : `${r1.dmg}`}, 두 번째 ${r2.miss ? '빗나감' : `${r2.dmg}`}` })
    ev.push({ kind: 'player', roll: best.hit, dmg, text: `${dmg > 0 ? `더 나은 쪽을 골랐다. ${dmg} 피해${note}` : '두 번 다 빗나갔다…'}` })
  } else if (act === 'charm') {
    if (s.charms <= 0) {
      ev.push({ kind: 'player', text: '부적이 더는 없다!' })
    } else {
      s.charms -= 1
      const costRoll = die(charmDie(stats), rng)
      mpCost = Math.min(costRoll, mp)
      const r = attackRoll(stats, rng, true)
      const dmg = r.dmg * 2 * mult
      s.ehp = Math.max(0, s.ehp - dmg)
      ev.push({ kind: 'player', roll: r.hit, dmg, text: `부적이 터졌다! [안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}] ×2${ctx.boost ? ' ×2(마이쭈)' : ''} = ${dmg} 피해 (의지력 -${mpCost}, 남은 부적 ${s.charms}장)` })
    }
  } else if (act === 'scan') {
    const amount = Math.max(1, Math.min(mp, Math.floor(ctx.scanAmount ?? 1)))
    mpCost = amount
    const n = scanTurns(stats, s.enemy, amount)
    s.queue = [...s.queue]
    while (s.queue.length < n + 1) s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng))
    s.known = Math.max(s.known, n)
    ev.push({ kind: 'player', text: `간파! 의지력 ${amount}을 쓰고 상대의 다음 ${n}턴을 내다본다.` })
  } else if (act === 'guard') {
    if (s.bound) {
      ev.push({ kind: 'warn', text: '몸이 감겨 있어 막기를 할 수 없다!' })
    } else {
      s.guard = true
      ev.push({ kind: 'player', text: '막기 자세를 취했다.' })
    }
  }
  s.bound = false

  if (s.ehp <= 0) {
    s.over = 'win'
    ev.push({ kind: 'end', text: `${s.enemy.name}이(가) 쓰러졌다.` })
  }
  return { state: s, events: ev, mpCost, boostUsed: !!ctx.boost }
}

/**
 * 상대 턴. ctx = { stats, mp }. 반환: { state, events, mpDrain }
 * 체력이 0 이 되면 의지력이 2 이상일 때 state.pendingDeath(버티기를 묻는다), 아니면 바로 패배.
 */
export function enemyTurn(state, ctx, rng = Math.random) {
  const { stats } = ctx
  const mp = Math.floor(ctx.mp)
  const s = { ...state, queue: [...state.queue] }
  const ev = []
  let mpDrain = 0
  const { enemy } = s
  const intent = s.queue[0]
  const hurt = (raw, label, { blockable = true, kind } = {}) => {
    let dmg = raw
    if (blockable && s.guard) {
      const reduced = Math.ceil(dmg / (kind === 'smash' ? 3 : 2))
      const extra = die(stats.aggression, rng)
      dmg = Math.max(0, reduced - extra)
      const strong = stats.aggression > enemy.atk
      const crit = extra === stats.aggression
      if (strong || crit) {
        const counter = extra * 2
        s.ehp = Math.max(0, s.ehp - counter)
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다! [호전 d${stats.aggression} = ${extra}] ${dmg} 피해만 받고, 반격 ${counter} 피해!${strong ? '' : ' (최대 굴림)'}` })
      } else {
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다. [호전 d${stats.aggression} = ${extra}] ${dmg} 피해만 받았다.` })
      }
    } else {
      ev.push({ kind: 'enemy', dmg, text: `${label}! ${dmg} 피해를 입었다.` })
    }
    s.php -= dmg
  }

  if (intent === 'jab') {
    const r = die(enemy.spirit, rng)
    if (r === 1) {
      ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `[상대 d${enemy.spirit} = ${r}] ${enemy.name}의 약공이 빗나갔다!` })
    } else {
      const a = die(enemy.atk, rng)
      ev.push({ kind: 'enemy', roll: r, text: `[상대 약공 d${enemy.spirit} = ${r}, 공격 d${enemy.atk} = ${a}]` })
      hurt(a + r, `${enemy.name}의 약공`, { kind: 'jab' })
    }
  } else if (intent === 'smash') {
    const r = d10(rng)
    if (r <= 2) {
      ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `[상대 d10 = ${r}] ${enemy.name}의 강공이 빗나갔다!` })
    } else {
      const a = die(enemy.atk, rng)
      ev.push({ kind: 'enemy', roll: r, text: `[상대 강공 d10 = ${r}, 공격 d${enemy.atk} = ${a}]` })
      hurt(a * 2 + enemy.spirit, `${enemy.name}의 강공`, { kind: 'smash' })
    }
  } else if (intent === 'charge') {
    ev.push({ kind: 'enemy', text: `${enemy.name}이(가) 기를 모은다… 다음 턴엔 강공이 온다!` })
  } else if (intent === 'guard') {
    ev.push({ kind: 'enemy', text: `${enemy.name}이(가) 몸을 웅크려 방어했다.` })
  } else if (intent === 'special') {
    ev.push({ kind: 'special', label: enemy.special.label, note: enemy.special.note, enemyId: enemy.id })
    if (enemy.id === 'scarecrow') {
      mpDrain = Math.min(mp, die(enemy.spirit, rng) * 2)
      ev.push({ kind: 'enemy', text: `${enemy.name}의 혼 빨기! 의지력이 ${mpDrain} 빨려 나갔다.` })
    } else if (enemy.id === 'foxfire') {
      const a = die(enemy.atk, rng)
      hurt(a + enemy.spirit, `${enemy.name}의 불똥 흩뿌리기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
    } else if (enemy.id === 'dueoksini') {
      const a = die(enemy.atk, rng)
      hurt(a * 2, `${enemy.name}의 짓누르는 그림자 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
      mpDrain = Math.min(mp, die(enemy.spirit, rng))
      s.bound = true
      ev.push({ kind: 'warn', text: `의지력이 ${mpDrain} 빨려 나갔다! 몸이 짓눌려 다음 내 턴엔 막기를 할 수 없다.` })
    } else if (enemy.id === 'snake') {
      const a = die(enemy.atk, rng)
      hurt(a, `${enemy.name}의 휘감기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
      s.bound = true
      ev.push({ kind: 'warn', text: '몸이 휘감겼다! 다음 내 턴엔 막기를 할 수 없다.' })
    } else {
      s.curse = 3
      ev.push({ kind: 'enemy', text: `${enemy.name}의 원한의 저주! 앞으로 세 번의 상대 턴 동안 피해가 스며든다.` })
    }
  }

  // 저주: 방금 건 턴에는 들어가지 않고, 이후 상대 턴마다 들어간다.
  if (s.curse > 0 && !(intent === 'special' && enemy.id === 'wonhon')) {
    const per = die(Math.max(1, Math.floor(enemy.spirit / 2)), rng)
    s.php -= per
    s.curse -= 1
    ev.push({ kind: 'enemy', dmg: per, text: `저주가 스며든다. ${per} 피해! (남은 ${s.curse}턴)` })
  }

  // 다음 라운드 준비
  s.guard = false
  s.round += 1
  s.queue.shift()
  s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng))
  s.known = Math.max(0, s.known - 1)
  if (intent === 'charge') s.known = Math.max(s.known, 1) // 기 모으기 다음은 강공이라는 건 누구나 안다.

  if (s.php <= 0) {
    s.php = 0
    if (!s.survived && mp - mpDrain >= 2) {
      s.pendingDeath = true
      ev.push({ kind: 'warn', text: '체력이 바닥났다…! 버티기를 쓸 수 있다.' })
    } else {
      s.over = 'lose'
      ev.push({ kind: 'end', text: s.survived ? '이미 한 번 버텼다. 더는 버티지 못하고 그대로 쓰러졌다.' : '더는 버티지 못하고 쓰러졌다.' })
    }
  }
  return { state: s, events: ev, mpDrain }
}

/**
 * 버티기: 한 전투에 한 번만. 체력 1로 일어서고, 의지력은 1만 남기고 모두 쓴다.
 * 단 (인내)% 확률로 의지력을 쓰지 않는다. 거절하면 그대로 패배.
 */
export function resolveSurvive(state, accept, mp, stats = { endurance: 0 }, rng = Math.random) {
  const s = { ...state, pendingDeath: false }
  const have = Math.floor(mp)
  if (accept && have >= 2 && !state.survived) {
    s.php = 1
    s.survived = true
    const pct = Math.max(0, Math.min(100, stats.endurance || 0))
    const d = Math.floor(rng() * 100) + 1
    const free = d <= pct
    return {
      state: s,
      mpCost: free ? 0 : have - 1,
      free,
      events: [
        {
          kind: 'warn',
          text: free
            ? `버티기! [인내 ${pct}%, d100 = ${d}] 의지력을 쓰지 않고 체력 1로 일어섰다!`
            : `버티기! [인내 ${pct}%, d100 = ${d}] 의지력 ${have - 1}을 모두 쏟아 체력 1로 일어섰다. (이번 전투에선 더 못 버틴다)`,
        },
      ],
    }
  }
  s.over = 'lose'
  return { state: s, mpCost: 0, events: [{ kind: 'end', text: '버티지 않았다. 전투에서 패배했다.' }] }
}
