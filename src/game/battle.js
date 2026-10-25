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
    tags: ['다인 전투'],
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
    tags: ['다인 전투'],
    hp: 310,
    atk: 12,
    act: 11,
    spirit: 11,
    special: { label: '짓누르는 그림자', note: '막을 수 없는 일격으로 몸을 짓누르고, 의지력을 빨아들이며, 다음 내 턴엔 막기를 할 수 없다.' },
  },
  // ───────── 보스 (하드 컨텐츠) ─────────
  // 다인 전투 기반. 영능력이 두 종류이고, 체력이 줄면 추가 기믹이 붙는다. (bossGimmick — mbattle.js)
  {
    id: 'bulgasari',
    name: '불가살이',
    blurb: '쇠붙이를 먹고 자란다는 불길한 괴수. 쇠도 불도 가리지 않고 삼키며, 몸이 상할수록 사나워진다. 셋은 모여야 겨우 맞설 수 있다.',
    tier: 3,
    partySize: 3,
    boss: true,
    tags: ['다인 전투', '보스'],
    hp: 620,
    atk: 14,
    act: 13,
    spirit: 14,
    special: { label: '쇠 갉아먹기', note: '한 사람의 살과 의지를 갉아먹는다. 막을 수 없는 피해를 주고 의지력을 빨아들인다.' },
    special2: { label: '불길 내뿜기', note: '일행 전원에게 불길을 뿜는다. 막을 수 없는 피해를 입고, 다음 내 턴엔 막기를 할 수 없다.' },
    gimmicks: [
      '체력 50% 미만: 3라운드마다 반드시 영능력을 쓴다.',
      '체력 25% 미만: 약공이 모두 단체 공격으로 바뀐다.',
      '평소에도 단체 공격이 자주 나온다.',
    ],
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
  group: { label: '단체 공격', note: '약공이 일행 전원에게 들어온다.' },
}

export const ACTIONS = {
  attack: { label: '일반 공격', note: '안목으로 명중, 호전으로 피해. 명중 굴림 1이면 빗나간다.' },
  guard: { label: '막기', note: '약공 절반 · 강공 1/3만 받고, 1d(호전)만큼 더 막는다.' },
  charm: { label: '부적', note: '빗나감 없는 2배 피해, 방어 무시. 한 판 3장 · 의지력 소모.' },
  scan: { label: '간파', note: '의지력 N을 쓰면 상대의 다음 행동을 (2+N)턴 앞서 본다. 안목이 상대 영력보다 높으면 (4+N)턴. 영능력은 ‘영능력’이라고만 보인다.' },
  buff: { label: '효험', note: '의지력 10(모자라면 0까지). 다음 일반 공격을 두 번 굴려 더 나은 쪽을 고른다. (교육용 데모 — 실전에서는 영능력 목록의 토글로 쓴다)' },
  psychic: { label: '영능력', note: '지금까지 익힌 영능력(스킬)을 확인하고 쓴다. 모두가 처음부터 가진 효험도 여기 있다.' },
}

/**
 * 영능력(= 특수 행동 = 스킬) 도감. 내가 익힐 수 있는 영능력을 여기에 정의한다.
 * 항목 예: { id: 'dokkaebi-fire', label: '도깨비불', note: '설명', cost: 0 }
 * 익히는 과정을 만들면 progress.js 의 acquirePsychic(player, id) 로 player.psychics 에 넣으면 되고,
 * 전투 '영능력' 탭에는 그 목록이 자동으로 나타난다. default: true 인 항목은 익히지 않아도 모두가 처음부터 가지고 있다.
 */
export const PSYCHICS = [
  {
    id: 'buff',
    label: '효험',
    note: '모두가 태어날 때부터 가지고 있는 영능력. 자신의 메인 턴에 앞서 켜 두면, 그 다음에 고르는 일반 공격·부적·영능력(생존본능)이 자동으로 두 번 굴러 더 나은 쪽으로 들어간다.',
    detail: '토글을 켜도 턴을 쓰지 않는다. 실제로 공격을 고르는 순간 의지력 10(모자라면 0까지)이 들고, 토글은 그때 꺼진다.',
    cond: '처음부터 가지고 있다.',
    default: true,
    toggle: true,
  },
  {
    id: 'survival',
    label: '생존본능',
    note: '불리한 전투라고 판단이 될 때 적을 교란하고 전투에서 도망친다. 후일을 도모하는 것도 결국 살아있는 자들의 특권이 아닌가.',
    detail: '자신의 턴에 사용. (50+1d(신속)*2-상대의 영력)% 확률로 전투에서 도주한다.',
    cond: '전투 중 최초로 전투불능이 되어본다.',
    use: true,
  },
  // ───────── 아래 영능력들은 실제 전투 로직까지 구현되어 있다(psychicTurn). 다만 정식 취득 경로는 아직 정해지지 않아, 관리자 도구로만 얻을 수 있다. ─────────
  {
    id: 'cotton-mist',
    label: '솜구름 안개',
    note: '적의 다음 턴 행동을 강제로 다시 결정하게 한다.',
    detail: '의지력 20 소모. 적의 다음 턴이 이미 정해져 있었다면(강공·영능력 등) 그걸 무르고 1d10을 다시 굴려 새로 정한다. 다시 굴린 결과가 똑같이 나왔을 경우에는 그냥 그대로 행한다.',
    cond: '(취득 경로 미정)',
    mp: 20,
    use: true,
  },
  {
    id: 'echo-form',
    label: '형상 기억',
    note: '지금까지의 전투에서 이미 사용을 마친 아이템 하나를 재활용해서, 전투 중 다시 쓸 수 있게 한다.',
    detail: '의지력 소모량은 재활용하는 아이템의 가격과 같다. 해당 전투에서 쓰지 않고 넘어가면 전투가 끝나는 순간 사라진다.',
    cond: '(취득 경로 미정)',
    use: true,
  },
  {
    id: 'falling-light',
    label: '내려쬐는 빛',
    note: '상대의 모든 단일 대상 공격이 무조건 이 영능력을 쓴 사람에게 향하게 만든다.',
    detail:
      '의지력 40 소모. 전투의 맨 첫 턴에서만 쓸 수 있다(두 번째로 돌아온 턴부터는 쓸 수 없다). 일행 중 한 명이 이미 사용했다면, 같은 전투에서 다른 일행은 이 영능력을 쓸 수 없다.',
    cond: '(취득 경로 미정)',
    mp: 40,
    use: true,
  },
  {
    id: 'monkey-paw',
    label: '원숭이 손',
    note: '얻는 만큼 잃는다. 영구적이게 얻고자 한다면 영구적이게 잃는다.',
    detail: '즉시 자신의 체력을 원하는 만큼 깎는다(체력은 0 이하로 내려갈 수 없다). 그 두 배만큼의 공격력을 일반 공격력에 더해 공격한다. 의지력은 깎은 체력의 1/2(올림)만큼 소모한다.',
    cond: '(취득 경로 미정 · 박신아가 가지고 있다)',
    owner: 'shinah',
    use: true,
  },
  {
    id: 'karmic-recompense',
    label: '업인과보',
    note: '원하지 않아도 업을 쌓을 수 있는 세계에서 ‘자신의 의지로’ 자신이 어떤 업을 쌓을지를 고를 수 있는 것은 행운이다.',
    detail:
      '의지력 10 소모. 전투 중 첫 턴에만 사용할 수 있으며, 대상을 지정할 수 있다. 사용 후 해당 전투에 나오는 [단체 공격], [2명 이상을 타겟팅하는 영능력]의 공격력이 모두 대상에게 단일로 향하며, 공격력은 인원 수만큼 곱해진다.',
    cond: '(취득 경로 미정 · 강유민이 가지고 있다)',
    owner: 'yumin',
    mp: 10,
    use: true,
  },
]

/** 효험 등 default 인 영능력을 포함해, 지금 쓸 수 있는 영능력 목록. psychics = player.psychics (익힌 id 배열). */
export const ownedPsychics = (psychics = []) => PSYCHICS.filter((p) => p.default || psychics.includes(p.id))

/**
 * 도깨비불 (바리의 영능력): 쓴 턴을 포함해 3턴 동안 아무 행동도 하지 않고 기를 모은 뒤,
 * 그 다음 내 턴에 일반 공격의 6배 피해를 때린다. 강공격은 아니라서 방어 태세에는 절반으로 줄어든다.
 * 쓰고 나면 state.fire 가 남은 자동 턴 수(3)로 세팅되고, 내 턴이 올 때마다 fireTurn 을 불러 진행한다.
 */
export const FIRE_TURNS = 3
export const LENT_FIRE = {
  id: 'dokkaebi-fire',
  label: '도깨비불',
  note: '3턴 동안 아무 행동도 하지 않고 기를 모으는 대신, 일반 공격의 6배 피해를 때린다. 방어 태세에는 절반으로 줄어든다.',
  detail: '쓴 턴부터 3턴 동안 행동 불가 → 이어지는 턴에 자동으로 6배 공격.',
  use: true,
}

/** 생존본능 도주 확률(%) = 50 + 1d(신속)×2 − 상대의 영력, 0~100 로 자른다. */
export function fleeChance(roll, enemy) {
  return Math.max(0, Math.min(100, 50 + roll * 2 - enemy.spirit))
}

/** 영능력 사용(내 턴). 반환: { state, events, mpCost, fled } — 실패하면 내 턴을 쓴 것으로 치고 상대 턴으로 넘어간다. 못 쓰면 invalid: true (턴을 쓰지 않는다). */
export function psychicTurn(state, id, ctx, rng = Math.random) {
  const { stats } = ctx
  const s = { ...state, guard: false, myTurns: (state.myTurns || 0) + 1 }
  const mpNow0 = Math.floor(ctx.mp ?? 0)
  const needMp = (amount) => {
    const need = mpCostOf(stats, amount)
    return need > mpNow0 ? need : 0
  }
  if (id === 'dokkaebi-fire') {
    s.fire = FIRE_TURNS
    return { state: s, events: [{ kind: 'warn', text: `✦ 도깨비불! 푸른 불꽃에 기를 모은다… (1/${FIRE_TURNS}) 앞으로 ${FIRE_TURNS - 1}턴은 아무 행동도 할 수 없다.` }], mpCost: 0, fled: false, boostUsed: false }
  }
  if (id === 'cotton-mist') {
    const shortfall = needMp(20)
    if (shortfall) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${shortfall}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    const mpCost = mpCostOf(stats, 20)
    const prevIntent = s.queue[0]
    const reroll = rollIntent(null, rng, s.party, !!s.enemy.boss)
    s.queue = [reroll, ...s.queue.slice(1)]
    const same = reroll === prevIntent
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 솜구름 안개! 의지력 ${mpCost}을 써서 상대의 다음 행동을 다시 정했다.${same ? ' (다시 굴렸지만 결과가 똑같아 그대로 행해진다)' : ''}` }],
      mpCost,
    }
  }
  if (id === 'monkey-paw') {
    const curPhp = Math.floor(state.php)
    const maxSac = Math.max(0, curPhp - 1)
    const amt = Math.max(0, Math.min(maxSac, Math.floor(ctx.sacrifice ?? 0)))
    if (amt <= 0) return { state, events: [{ kind: 'warn', text: '깎을 체력이 없다! (체력은 0 이하로 내려갈 수 없다)' }], mpCost: 0, invalid: true }
    const mpCost = Math.ceil(amt / 2)
    if (mpCost > mpNow0) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${mpCost}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    s.php = curPhp - amt
    const aura = ctx.aura ?? auraOf(stats)
    const boostMult = typeof ctx.boost === 'number' ? ctx.boost : ctx.boost ? 2 : 1
    const braced = s.queue[0] === 'guard'
    const r = attackRoll(stats, rng)
    const extra = amt * 2
    let dmg = 0, note = ''
    if (!r.miss) {
      const fb = fxBase(r.dmg + extra, stats, s.ehp, s.enemy.hp, aura, rng)
      const cr = fxCrit(fb.base * boostMult, stats, rng)
      dmg = cr.dmg
      note = `${noteOf(fb.notes)}${cr.note}`
      if (braced) { dmg = Math.ceil(dmg / 2); note += ' (방어에 절반으로 막힘)' }
      s.ehp = Math.max(0, s.ehp - dmg)
    }
    const ev = [{
      kind: 'player',
      roll: r.hit,
      dmg,
      text: `✦ 원숭이 손! 체력 ${amt}을 깎아 공격력 +${extra}, 의지력 ${mpCost} 소모. ${r.miss ? `공격이 빗나갔다! [안목 d${stats.insight + 1} = ${r.hit}]` : `[안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}] ${dmg} 피해${note}`}`,
    }]
    if (s.ehp <= 0) {
      s.over = 'win'
      ev.push({ kind: 'end', text: `${s.enemy.name}이(가) 쓰러졌다.` })
    }
    return { state: s, events: ev, mpCost }
  }
  if (id === 'echo-form') {
    const itemId = ctx.recycleItemId
    const price = Math.max(0, Math.floor(ctx.recyclePrice ?? 0))
    if (!itemId) return { state, events: [{ kind: 'warn', text: '재활용할 아이템을 먼저 골라야 한다.' }], mpCost: 0, invalid: true }
    if (price > mpNow0) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${price}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 형상 기억! 의지력 ${price}을 써서, 이미 쓴 아이템 하나를 다시 쓸 수 있게 했다.` }],
      mpCost: price,
      recycleItemId: itemId,
    }
  }
  if (id === 'falling-light') {
    if (state.myTurns) return { state, events: [{ kind: 'warn', text: '전투의 맨 첫 턴에서만 쓸 수 있다.' }], mpCost: 0, invalid: true }
    if (s.fallingLight) return { state, events: [{ kind: 'warn', text: '이번 전투에서는 이미 썼다.' }], mpCost: 0, invalid: true }
    const shortfall = needMp(40)
    if (shortfall) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${shortfall}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    const mpCost = mpCostOf(stats, 40)
    s.fallingLight = true
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 내려쬐는 빛! 의지력 ${mpCost}을 써서, 이번 전투 동안 상대의 모든 단일 대상 공격이 나에게 향하게 했다. (1인 전투에서는 원래도 모든 공격이 나에게 오므로 체감되지는 않는다)` }],
      mpCost,
    }
  }
  if (id === 'karmic-recompense') {
    if (state.myTurns) return { state, events: [{ kind: 'warn', text: '전투의 첫 턴에만 사용할 수 있다.' }], mpCost: 0, invalid: true }
    const shortfall = needMp(10)
    if (shortfall) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${shortfall}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    const mpCost = mpCostOf(stats, 10)
    s.karmicTarget = ctx.target ?? 'self'
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 업인과보! 의지력 ${mpCost}을 써서, 이번 전투에 나오는 단체 공격·다중 타겟 영능력이 모두 지정한 대상에게 쏠리도록 했다. (일행과 함께하는 전투에서만 효과가 나타난다)` }],
      mpCost,
    }
  }
  if (id !== 'survival') return { state, events: [], mpCost: 0, invalid: true }
  const buffed = !!ctx.buff
  const mpNow = Math.floor(ctx.mp ?? 0)
  // 효험은 부적처럼 의지력이 모자라도 있는 만큼만 쓰고(0까지) 그래도 발동한다.
  const buffCost = buffed ? Math.min(mpCostOf(stats, BUFF_COST), mpNow) : 0
  let roll, buffNote = ''
  if (buffed) {
    const roll1 = die(stats.agility, rng)
    const roll2 = die(stats.agility, rng)
    roll = Math.max(roll1, roll2)
    buffNote = ` [효험: 두 번 굴림 — ${roll1}, ${roll2} 중 더 나은 ${roll}]`
  } else {
    roll = die(stats.agility, rng)
  }
  const chance = fleeChance(roll, s.enemy)
  const d = Math.floor(rng() * 100) + 1
  if (d <= chance) {
    s.over = 'fled'
    return {
      state: s,
      events: [{ kind: 'end', text: `✦ 생존본능!${buffed ? ' 효험!' : ''} [신속 d${stats.agility} = ${roll}, 도주 ${chance}%, d100 = ${d}] 적을 교란하고 전투에서 도망쳤다.${buffNote}` }],
      mpCost: buffCost,
      fled: true,
      boostUsed: !!ctx.boost,
    }
  }
  return {
    state: s,
    events: [{ kind: 'warn', text: `✦ 생존본능… 실패!${buffed ? ' 효험!' : ''} [신속 d${stats.agility} = ${roll}, 도주 ${chance}%, d100 = ${d}] 도망치지 못했다.${buffNote}` }],
    mpCost: buffCost,
    fled: false,
    boostUsed: !!ctx.boost,
  }
}

/** 도깨비불 진행 중인 내 턴: 기를 모으거나(자동), 마지막에 6배 공격. 반환: { state, events, done } */
export function fireTurn(state, ctx, rng = Math.random) {
  const { stats } = ctx
  const s = { ...state, guard: false }
  const left = s.fire ?? 0
  if (left > 1) {
    s.fire = left - 1
    return { state: s, events: [{ kind: 'warn', text: `✦ 도깨비불… 기를 모으는 중 (${FIRE_TURNS + 2 - left}/${FIRE_TURNS})` }], done: false }
  }
  s.fire = 0
  const braced = s.queue[0] === 'guard'
  const r = attackRoll(stats, rng)
  const mult = ctx.boost ? 2 : 1
  const fb = r.miss ? { base: 0, notes: [] } : fxBase(r.dmg, stats, s.ehp, s.enemy.hp, ctx.aura ?? auraOf(stats), rng)
  const cr = fxCrit(fb.base * 6 * mult, stats, rng)
  let dmg = cr.dmg
  if (!r.miss && braced) dmg = Math.ceil(dmg / 2)
  s.ehp = Math.max(0, s.ehp - dmg)
  const ev = [
    r.miss
      ? { kind: 'player', roll: r.hit, dmg: 0, text: `✦ 도깨비불 폭발… 하지만 빗나갔다! [안목 d${stats.insight + 1} = ${r.hit}]` }
      : { kind: 'player', roll: r.hit, dmg, text: `✦ 도깨비불 폭발! [안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}] ×6 = ${dmg} 피해${noteOf(fb.notes)}${cr.note}${braced ? ' (방어에 절반으로 막힘)' : ''}` },
  ]
  if (s.ehp <= 0) {
    s.over = 'win'
    ev.push({ kind: 'end', text: `${s.enemy.name}이(가) 쓰러졌다.` })
  }
  return { state: s, events: ev, done: true }
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

/** 영능력 발동 확률(%): 상대 턴 행동 굴림 d10 에서 10 이 나올 때. (기 모으기 바로 다음 턴은 반드시 강공이라 제외) */
export const SPECIAL_PERCENT = 10

/** 상대 영능력의 정확한 효과 목록(스탯 숫자 포함). 팝업·전투 기록·도감이 같이 쓴다. */
export function specialEffects(enemy) {
  const { atk, spirit } = enemy
  const spiritNote = specialSpiritNote(enemy)
  switch (enemy.id) {
    case 'scarecrow':
      return [`내 의지력을 1d${spirit}×2 만큼 빨아들인다. (${2}~${spirit * 2}, 남은 의지력이 한도)`, '체력 피해는 없다.', spiritNote]
    case 'foxfire':
      return [`막을 수 없는 피해 1d${atk} + ${spirit} (${1 + spirit}~${atk + spirit}).`, '막기·방어로 줄일 수 없다.', spiritNote]
    case 'dueoksini':
      return [`막을 수 없는 피해 1d${atk}×2 (${2}~${atk * 2}).`, `내 의지력을 1d${spirit} 만큼 빨아들인다. (남은 의지력이 한도)`, '다음 내 턴엔 막기를 할 수 없다.', spiritNote]
    case 'bulgasari':
      return [
        `《${enemy.special.label}》 한 사람: 막을 수 없는 피해 1d${atk} + ${spirit} (${1 + spirit}~${atk + spirit}), 의지력 1d${spirit}×2 흡수 (남은 의지력이 한도).`,
        `《${enemy.special2.label}》 일행 전원: 막을 수 없는 피해 1d${atk} + ${Math.floor(spirit / 2)} (${1 + Math.floor(spirit / 2)}~${atk + Math.floor(spirit / 2)}), 다음 내 턴엔 막기 불가.`,
        '영능력을 쓸 때 두 가지 중 하나가 나온다.',
        spiritNote,
      ]
    case 'snake':
      return [`막을 수 없는 피해 1d${atk} (1~${atk}).`, '다음 내 턴엔 막기를 할 수 없다.', spiritNote]
    case 'wonhon':
      return [`저주 3턴: 걸린 다음 상대 턴부터 세 번, 매번 1d${Math.max(1, Math.floor(spirit / 2))} 피해 (1~${Math.max(1, Math.floor(spirit / 2))}).`, '막을 수 없고, 저주 중 다시 걸면 3턴으로 갱신된다.', spiritNote]
    default:
      return [enemy.special?.note ?? '상대마다 다른 비기.', spiritNote]
  }
}

/** 팝업/기록에 쓰는 한 덩어리 설명. */
export function specialSummary(ev) {
  const eff = (ev.effects ?? []).join(' ')
  return `✦ 영능력 《${ev.label}》 — 발동 확률 ${ev.chance ?? SPECIAL_PERCENT}% (상대 턴마다 d10 = 10). ${eff}${ev.result ? ` ▶ 이번 결과: ${ev.result}` : ''}`
}

/** 영능력 발동마다 영력을 소모하며, 영력이 다하면 더 이상 쓸 수 없다(대신 약공). */
export const specialSpiritNote = (enemy) => `영능력을 한 번 쓸 때마다 영력 ${specialSpiritCost(enemy)}을 소모한다. 영력이 다하면 영능력 대신 약공을 쓴다.`

/** 상대가 다음에 할 행동을 한 번 굴린다. 기 모으기 다음은 반드시 강공. */
function rollIntent(prev, rng, party = false, boss = false) {
  if (prev === 'charge') return 'smash'
  const r = d10(rng)
  if (r <= 2) return 'charge'
  if (boss && party && (r === 6 || r === 7)) return 'group' // 보스: 단체 공격이 더 잦다
  if (r <= 7) return 'jab' // (7 은 기획에 빠져 있어 약공으로 둔다)
  if (party) return r === 8 ? 'guard' : r === 9 ? 'group' : 'special' // 일행을 상대하는 적: 방어는 8 하나, 9 는 단체 공격
  if (r <= 9) return 'guard'
  return 'special'
}

export function newBattle(enemyId, stats, rng = Math.random, startHp, hpCap, opts = {}) {
  const enemy = typeof enemyId === 'object' ? enemyId : ENEMIES.find((e) => e.id === enemyId)
  const queue = []
  let prev = null
  for (let i = 0; i < 5; i++) {
    prev = rollIntent(prev, rng, !!opts.party, !!enemy.boss)
    queue.push(prev)
  }
  const hp = hpCap ?? maxHp(stats)
  const cur = startHp == null ? hp : Math.max(1, Math.min(hp, Math.round(startHp)))
  return {
    enemy,
    party: !!opts.party, // 일행을 상대하는 판(방어 확률이 줄고 단체 공격이 생긴다)
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
    survived: 0, // 버티기를 쓴 횟수 (한 전투에 한 번. 무당방울이 있으면 두 번)
    over: null, // 'win' | 'lose' | 'fled'
    espirit: enemy.spirit, // 영능력 전용 영력 자원. 상대의 영력(enemy.spirit, 보상·대기시간 계산의 기준)과는 별개로, 영능력을 쓸 때마다 줄어들고 0이 되면 더는 영능력을 쓰지 못한다.
  }
}

/** 영능력 한 번 쓰는 데 드는 영력 자원(적절한 수치로 소모 — 대략 세 번 쓰면 다한다). */
export const specialSpiritCost = (enemy) => Math.max(1, Math.ceil(enemy.spirit / 3))

/** 선공 판정: 1d10 + 1d(신속) 이 상대의 행동력 이상이면 내가 먼저. 신속이 행동력 이상이면 무조건 선공. */
export function rollInitiative(enemy, stats, rng = Math.random) {
  if (stats.fx === 'fan') return { playerFirst: true, auto: true, fan: true, a: 0, b: 0, total: 0 } // 부채: 무조건 선공
  if (stats.agility >= enemy.act) return { playerFirst: true, auto: true, a: 0, b: 0, total: 0 }
  const a = d10(rng)
  const b = die(stats.agility, rng)
  return { playerFirst: a + b >= enemy.act, auto: false, a, b, total: a + b }
}

/** 일반 공격 한 번의 굴림. noMiss 면 명중 굴림 1도 2로 친다(부적). */
function attackRoll(stats, rng, noMiss = false) {
  if (stats.fx === 'bow') noMiss = true // 활: 모든 공격이 반드시 명중
  let hit = die(stats.insight + 1, rng)
  const raw = hit
  if (noMiss && hit < 2) hit = 2
  if (hit < 2) return { hit: raw, power: 0, dmg: 0, miss: true }
  const power = die(stats.aggression, rng)
  return { hit: raw, power, dmg: power * 2 + hit, miss: false }
}

// ───────── 무구 효과(stats.fx) ─────────
/** 석장: 전투 중 의지력 소모가 절반(올림) */
export const mpCostOf = (stats, cost) => (stats.fx === 'staff' ? Math.ceil(cost / 2) : cost)
/** 악기 보정의 한계: 악기를 든 사람의 [이해] */
export const auraOf = (stats) => (stats.fx === 'instrument' ? Math.max(0, Math.floor(stats.comprehension || 0)) : 0)
/** 버티기를 쓸 수 있는 최대 횟수 (무당방울이 있으면 2) */
export const maxSurvives = (stats) => (stats.fx === 'bell' ? 2 : 1)

/** 굴림으로 나온 기본 공격력(base)에 악기 · 단검 · 철퇴가 얹힌다. 반환 { base, notes[] } */
function fxBase(base, stats, ehp, enemyHp, aura, rng) {
  const notes = []
  if (aura > 0) {
    const a = die(aura, rng)
    base += a
    notes.push(`악기 +${a}`)
  }
  if (stats.fx === 'dagger' && ehp < enemyHp * 0.35) {
    base = Math.floor(base * 1.5)
    notes.push('단검 ×1.5')
  }
  if (stats.fx === 'mace') {
    base = Math.floor(base * 1.5)
    notes.push('철퇴 ×1.5')
  }
  return { base, notes }
}
/** 창: (10 + ⌊호전/2⌋)% 확률로 치명타 — 그 공격이 2배 */
function fxCrit(dmg, stats, rng) {
  if (stats.fx !== 'spear' || dmg <= 0) return { dmg, note: '' }
  const chance = 10 + Math.floor(stats.aggression / 2)
  const roll = die(100, rng)
  if (roll <= chance) return { dmg: dmg * 2, note: ` 치명타! (창 ${chance}%, d100 = ${roll}) ×2` }
  return { dmg, note: '' }
}
const noteOf = (notes) => (notes.length ? ` (${notes.join(', ')})` : '')

/**
 * 내 턴. ctx = { stats, mp }. 반환: { state, events, mpCost }
 * 이어서 상대 턴(enemyTurn)을 호출해야 한다. 내 행동으로 상대가 쓰러지면 state.over === 'win'.
 */
export function playerTurn(state, action, ctx, rng = Math.random) {
  const { stats } = ctx
  const mp = Math.floor(ctx.mp)
  const s = { ...state, guard: false, myTurns: (state.myTurns || 0) + 1 }
  const ev = []
  let mpCost = 0
  const act = action
  // 효험: 메인 턴에 앞서 켜 둔 토글이 있으면, 일반 공격·부적에서 두 번 굴려 더 나은 쪽을 쓴다. (ctx.buff)
  // 의지력 10이 기본이지만, 부적처럼 모자라면 있는 만큼만 쓰고(0까지) 그래도 발동한다.
  const buffed = !!ctx.buff && (act === 'attack' || act === 'charm')
  const buffCost = buffed ? Math.min(mpCostOf(stats, BUFF_COST), mp) : 0

  // 의지력이 모자라면 그 행동은 할 수 없다. 단 부적·효험만은 모자라도 쓸 수 있다(있는 만큼만 쓰고 터진다).
  const needMp = act === 'scan' ? mpCostOf(stats, 1) : 0
  if (needMp > mp) {
    ev.push({ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${needMp}, 지금 ${mp})` })
    return { state: state, events: ev, mpCost: 0, invalid: true }
  }
  const aura = ctx.aura ?? auraOf(stats)
  const braced = s.queue[0] === 'guard'
  const boostMult = typeof ctx.boost === 'number' ? ctx.boost : ctx.boost ? 2 : 1
  const mult = boostMult // 마이쭈: 이번 턴 피해 2배, 폭죽: 3배
  const bn = ctx.boost ? ` (×${boostMult})` : ''

  const strike = (r, label = '공격') => {
    if (r.miss) return `${label}이 빗나갔다! [안목 d${stats.insight + 1} = ${r.hit}]`
    return `${label}! [안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}]`
  }

  if (act === 'attack') {
    let r, buffNote = ''
    if (buffed) {
      mpCost += buffCost
      const r1 = attackRoll(stats, rng)
      const r2 = attackRoll(stats, rng)
      r = r1.dmg >= r2.dmg ? r1 : r2
      buffNote = ` (효험: 두 번 굴림 — 첫 번째 ${r1.miss ? '빗나감' : r1.dmg}, 두 번째 ${r2.miss ? '빗나감' : r2.dmg} 중 더 나은 쪽)`
    } else {
      r = attackRoll(stats, rng)
    }
    const fb = r.miss ? { base: 0, notes: [] } : fxBase(r.dmg, stats, s.ehp, s.enemy.hp, aura, rng)
    const cr = fxCrit(fb.base * mult, stats, rng)
    let dmg = cr.dmg
    let note = r.miss ? '' : `${bn}${noteOf(fb.notes)}${cr.note}`
    if (!r.miss && braced) { dmg = Math.ceil(dmg / 2); note += ' (방어에 절반으로 막힘)' }
    s.ehp = Math.max(0, s.ehp - dmg)
    ev.push({ kind: 'player', roll: r.hit, dmg, text: `${buffed ? '효험! ' : ''}${strike(r)}${r.miss ? '' : ` ${dmg} 피해${note}`}${buffNote}` })
  } else if (act === 'charm') {
    if (s.charms <= 0) {
      ev.push({ kind: 'player', text: '부적이 더는 없다!' })
    } else {
      s.charms -= 1
      const costRoll = die(charmDie(stats), rng)
      const avail = Math.max(0, mp - buffCost)
      const charmCost = Math.min(mpCostOf(stats, costRoll), avail)
      mpCost = charmCost + buffCost
      let r, buffNote = ''
      if (buffed) {
        const r1 = attackRoll(stats, rng, true)
        const r2 = attackRoll(stats, rng, true)
        r = r1.dmg >= r2.dmg ? r1 : r2
        buffNote = ` (효험: 두 번 굴림 — 첫 번째 ${r1.dmg}, 두 번째 ${r2.dmg} 중 더 나은 쪽)`
      } else {
        r = attackRoll(stats, rng, true)
      }
      const fb = fxBase(r.dmg, stats, s.ehp, s.enemy.hp, aura, rng)
      const cr = fxCrit(fb.base * 2 * mult, stats, rng)
      const dmg = cr.dmg
      s.ehp = Math.max(0, s.ehp - dmg)
      ev.push({ kind: 'player', roll: r.hit, dmg, text: `${buffed ? '효험! ' : ''}부적이 터졌다! [안목 d${stats.insight + 1} = ${r.hit}, 호전 d${stats.aggression} = ${r.power}] ×2${bn} = ${dmg} 피해${noteOf(fb.notes)}${cr.note} (의지력 -${mpCost}, 남은 부적 ${s.charms}장)${buffNote}` })
    }
  } else if (act === 'scan') {
    const amount = Math.max(1, Math.min(mp, Math.floor(ctx.scanAmount ?? 1)))
    mpCost = mpCostOf(stats, amount)
    const n = scanTurns(stats, s.enemy, amount)
    s.queue = [...s.queue]
    while (s.queue.length < n + 1) s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!s.enemy.boss))
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
  const intent0 = s.queue[0]
  const intent = intent0 === 'group' ? 'jab' : intent0 // 단체 공격은 다인 전투에서 일행 한 명씩 약공으로 풀어낸다
  const hurt = (raw, label, { blockable = true, kind } = {}) => {
    // 부채: 적의 모든 공격 명중률이 (10 + 1d이해)% 만큼 줄어든다 — 막기 여부와 상관없이 아예 빗나간다.
    if (stats.fx === 'fan') {
      const chance = 10 + die(stats.comprehension, rng)
      const roll = die(100, rng)
      if (roll <= chance) {
        ev.push({ kind: 'enemy', dmg: 0, text: `${label}이 부채 바람에 휩쓸려 빗나갔다! (회피 ${chance}%, d100 = ${roll})` })
        return
      }
    }
    let dmg = stats.fx === 'mace' ? Math.ceil(raw * 1.5) : raw // 철퇴: 받는 피해 ×1.5
    if (blockable && s.guard) {
      const reduced = Math.ceil(dmg / (kind === 'smash' ? 3 : 2))
      const extra = die(stats.aggression, rng)
      dmg = Math.max(0, reduced - extra)
      const strong = stats.aggression > enemy.atk
      const crit = extra === stats.aggression
      const sword = stats.fx === 'sword' // 칼: 모든 방어에 반격
      if (strong || crit || sword) {
        const counter = extra * 2
        s.ehp = Math.max(0, s.ehp - counter)
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다! [호전 d${stats.aggression} = ${extra}] ${dmg} 피해만 받고, 반격 ${counter} 피해!${strong ? '' : sword && !crit ? ' (칼의 반격)' : ' (최대 굴림)'}` })
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
  } else if (intent === 'special' && !ctx.noSpiritGate && (s.espirit ?? enemy.spirit) <= 0) {
    // 영력을 모두 소모해 영능력을 쓸 수 없다 — 약공으로 대신한다.
    const r = die(enemy.spirit, rng)
    if (r === 1) {
      ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `${enemy.name}은(는) 영력이 다해 영능력을 쓰지 못한다! 대신 약공을 노리지만 [상대 d${enemy.spirit} = ${r}] 빗나갔다.` })
    } else {
      const a = die(enemy.atk, rng)
      ev.push({ kind: 'enemy', roll: r, text: `${enemy.name}은(는) 영력이 다해 영능력을 쓰지 못한다! 대신 약공으로. [상대 d${enemy.spirit} = ${r}, 공격 d${enemy.atk} = ${a}]` })
      hurt(a + r, `${enemy.name}의 약공`, { kind: 'jab' })
    }
  } else if (intent === 'special') {
    const spCost = specialSpiritCost(enemy)
    if (!ctx.noSpiritGate) s.espirit = Math.max(0, (s.espirit ?? enemy.spirit) - spCost)
    const sp2 = !!enemy.special2 && ctx.sp === 2
    const spDef = sp2 ? enemy.special2 : enemy.special
    const spEv = { kind: 'special', label: spDef.label, note: spDef.note, enemyId: sp2 ? `${enemy.id}-2` : enemy.id, chance: SPECIAL_PERCENT, effects: specialEffects(enemy), result: '', spiritCost: spCost, spiritLeft: s.espirit }
    ev.push(spEv)
    if (enemy.id === 'bulgasari') {
      if (sp2) {
        const a = die(enemy.atk, rng)
        const add = Math.floor(enemy.spirit / 2)
        hurt(a + add, `${enemy.name}의 불길 내뿜기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
        spEv.result = `[공격 d${enemy.atk} = ${a}] + ${add} = ${a + add} 피해 (막기 불가), 다음 내 턴 막기 불가`
        s.bound = true
        ev.push({ kind: 'warn', text: '불길에 휩싸였다! 다음 내 턴엔 막기를 할 수 없다.' })
      } else {
        const a = die(enemy.atk, rng)
        hurt(a + enemy.spirit, `${enemy.name}의 쇠 갉아먹기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
        const rr = die(enemy.spirit, rng)
        mpDrain = Math.min(mp, rr * 2)
        spEv.result = `[공격 d${enemy.atk} = ${a}] + ${enemy.spirit} = ${a + enemy.spirit} 피해 (막기 불가), [1d${enemy.spirit} = ${rr}]×2 → 의지력 ${mpDrain} 흡수`
        ev.push({ kind: 'warn', text: `의지력이 ${mpDrain} 빨려 나갔다!` })
      }
    } else if (enemy.id === 'scarecrow') {
      const rr = die(enemy.spirit, rng)
      mpDrain = Math.min(mp, rr * 2)
      spEv.result = `[1d${enemy.spirit} = ${rr}] ×2 = ${rr * 2}${mpDrain < rr * 2 ? ` (남은 의지력이 적어 ${mpDrain})` : ''} → 의지력 ${mpDrain} 흡수`
      ev.push({ kind: 'enemy', text: `${enemy.name}의 혼 빨기! 의지력이 ${mpDrain} 빨려 나갔다.` })
    } else if (enemy.id === 'foxfire') {
      const a = die(enemy.atk, rng)
      hurt(a + enemy.spirit, `${enemy.name}의 불똥 흩뿌리기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
      spEv.result = `[공격 d${enemy.atk} = ${a}] + ${enemy.spirit} = ${a + enemy.spirit} 피해 (막기 불가)`
    } else if (enemy.id === 'dueoksini') {
      const a = die(enemy.atk, rng)
      hurt(a * 2, `${enemy.name}의 짓누르는 그림자 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
      const rr = die(enemy.spirit, rng)
      mpDrain = Math.min(mp, rr)
      spEv.result = `[공격 d${enemy.atk} = ${a}] ×2 = ${a * 2} 피해 (막기 불가), [1d${enemy.spirit} = ${rr}] → 의지력 ${mpDrain} 흡수, 다음 내 턴 막기 불가`
      s.bound = true
      ev.push({ kind: 'warn', text: `의지력이 ${mpDrain} 빨려 나갔다! 몸이 짓눌려 다음 내 턴엔 막기를 할 수 없다.` })
    } else if (enemy.id === 'snake') {
      const a = die(enemy.atk, rng)
      hurt(a, `${enemy.name}의 휘감기 [공격 d${enemy.atk} = ${a}]`, { blockable: false })
      spEv.result = `[공격 d${enemy.atk} = ${a}] = ${a} 피해 (막기 불가), 다음 내 턴 막기 불가`
      s.bound = true
      ev.push({ kind: 'warn', text: '몸이 휘감겼다! 다음 내 턴엔 막기를 할 수 없다.' })
    } else {
      s.curse = 3
      spEv.result = `저주 3턴 시작 (매 턴 1d${Math.max(1, Math.floor(enemy.spirit / 2))} 피해)`
      ev.push({ kind: 'enemy', text: `${enemy.name}의 원한의 저주! 앞으로 세 번의 상대 턴 동안 피해가 스며든다.` })
    }
    if (!ctx.noSpiritGate) spEv.result += ` (영능력에 영력 ${spCost} 소모, 남은 영력 ${s.espirit}/${enemy.spirit})`
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
  s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!enemy.boss))
  s.known = Math.max(0, s.known - 1)
  if (intent0 === 'charge') s.known = Math.max(s.known, 1) // 기 모으기 다음은 강공이라는 건 누구나 안다.

  if (s.php <= 0) {
    s.php = 0
    if ((s.survived | 0) < maxSurvives(stats) && mp - mpDrain >= 2) {
      s.pendingDeath = true
      ev.push({ kind: 'warn', text: '체력이 바닥났다…! 버티기를 쓸 수 있다.' })
    } else {
      s.over = 'lose'
      ev.push({ kind: 'end', text: (s.survived | 0) >= maxSurvives(stats) ? '이미 버틸 만큼 버텼다. 더는 버티지 못하고 그대로 쓰러졌다.' : mp - mpDrain < 2 ? '의지력이 바닥나 버티지 못하고 쓰러졌다.' : '더는 버티지 못하고 쓰러졌다.' })
    }
  }
  return { state: s, events: ev, mpDrain }
}

/**
 * 버티기: 한 전투에 한 번만. 체력 1로 일어서고, 의지력은 1만 남기고 모두 쓴다.
 * 단 (인내×2)%(최대 100%) 확률로 의지력을 쓰지 않는다. 거절하면 그대로 패배.
 */
export function resolveSurvive(state, accept, mp, stats = { endurance: 0 }, rng = Math.random) {
  const s = { ...state, pendingDeath: false }
  const have = Math.floor(mp)
  if (accept && have >= 2 && (state.survived | 0) < maxSurvives(stats)) {
    s.php = 1
    s.survived = (state.survived | 0) + 1
    const pct = Math.max(0, Math.min(100, (stats.endurance || 0) * 2))
    const d = Math.floor(rng() * 100) + 1
    const free = d <= pct
    const cost = free ? 0 : mpCostOf(stats, have - 1)
    const more = s.survived < maxSurvives(stats)
    return {
      state: s,
      mpCost: cost,
      free,
      events: [
        {
          kind: 'warn',
          text: free
            ? `버티기! [인내 ${pct}%, d100 = ${d}] 의지력을 쓰지 않고 체력 1로 일어섰다!`
            : `버티기! [인내 ${pct}%, d100 = ${d}] 의지력 ${cost}을 쏟아 체력 1로 일어섰다. (${more ? '무당방울 덕에 한 번 더 버틸 수 있지만, 의지력이 2 이상 남아 있어야 한다' : '이번 전투에선 더 못 버틴다'})`,
        },
      ],
    }
  }
  s.over = 'lose'
  return { state: s, mpCost: 0, events: [{ kind: 'end', text: '버티지 않았다. 전투에서 패배했다.' }] }
}
