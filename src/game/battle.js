/**
 * 퇴마 실습 전투 (체육관). 순수 로직: 화면과 무관하게 테스트·시뮬레이션할 수 있다.
 *
 * 적 하나의 능력치는 4개: 체력(hp) · 공격력(atk) · 행동력(act) · 영력(spirit).
 *  - 영력은 상대의 '기운'이자 쓰러뜨렸을 때 얻는 전리품(내가 얻는 영력 = 상대의 영력)이다.
 *  - 행동력은 선공 판정의 기준값이다.
 * 전투 중에는 상대의 능력치를 알 수 없고(안목·조우 횟수에 따라 일부 공개), 상대가 다음에 무엇을 할지도 알 수 없다.
 * 간파로 몇 턴 앞의 행동을 미리 본다. 모든 판정은 주사위(rng 는 0 이상 1 미만).
 */
import { BESTIARY } from './bestiary.js'

/** 전투 보상 = 상대 영력의 2배 */
export const REWARD_MULT = 2
/** 그슨대 [내리누르기]의 영능력 봉인 라운드 수 (v-B.02) */
export const PSY_SEAL_ROUNDS = 3
/** 그슨대 [어둠 드리우기]의 의지력 흡수 주사위 면 수: 영력의 3/4 */
export const darkDrainDie = (enemy) => Math.max(1, Math.floor(enemy.spirit * 0.75))

// v-B.17: 아래 체력 · 공격력은 제작품(v-B.16)을 반영해 다시 맞춘 값이다. (bestiary.js 머리말 · VB_17_PATCH.md)
export const ENEMIES = [
  {
    id: 'scarecrow',
    name: '허수아비 잡귀',
    blurb: '밭에서 떠도는 잡귀. 움직임이 단순하다.',
    hp: 64,
    atk: 6,
    act: 6,
    spirit: 5,
    special: { label: '혼 빨기', note: '의지력을 빨아들인다.' },
  },
  {
    id: 'snake',
    name: '먹구렁이',
    blurb: '묵은 담벼락 밑에서 몸을 부풀려 덮치는 구렁이.',
    hp: 99,
    atk: 11,
    act: 9,
    spirit: 8,
    special: { label: '휘감기', note: '몸을 감아 조이고, 다음 내 턴엔 막기를 할 수 없다.' },
  },
  {
    id: 'wonhon',
    name: '묵은 원귀',
    blurb: '오래 묵어 독이 오른 원귀. 한 방이 무겁다.',
    hp: 147,
    atk: 16,
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
    hp: 163,
    atk: 7,
    act: 7,
    spirit: 6,
    special: { label: '불똥 흩뿌리기', note: '사방으로 튀는 불똥. 막을 수 없는 피해를 입는다.' },
  },
  {
    id: 'dueoksini',
    name: '두억시니',
    blurb: '어둠 속에서 사람을 짓누르는 사나운 야차. 둘은 모여야 맞설 수 있다.',
    tier: 2,
    partySize: 2,
    tags: ['다인 전투'],
    hp: 294,
    atk: 13,
    act: 10,
    spirit: 10,
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
    hp: 1155,
    atk: 21,
    act: 14,
    spirit: 16,
    special: { label: '쇠 갉아먹기', note: '한 사람의 살과 의지를 갉아먹는다. 막을 수 없는 피해를 주고 의지력을 빨아들인다.' },
    special2: { label: '불길 내뿜기', note: '일행 전원에게 불길을 뿜는다. 막을 수 없는 피해를 입고, 다음 내 턴엔 막기를 할 수 없다.' },
    gimmicks: [
      '체력 50% 미만: 3라운드마다 반드시 영능력을 쓴다.',
      '체력 25% 미만: 약공이 모두 단체 공격으로 바뀐다.',
      '평소에도 단체 공격이 자주 나온다.',
    ],
  },
  {
    id: 'geuseundae',
    name: '그슨대',
    blurb: '어둠 속에서 사람 앞을 가로막는 그림자 거인. 올려다볼수록 끝없이 커진다고 한다. 셋은 모여야 맞설 수 있다.',
    tier: 5,
    partySize: 3,
    boss: true,
    tags: ['다인 전투', '보스'],
    // 밸런스(v-B.02 몬테카를로 3000판, 3인·전원 스탯 18~20, 아이템 없이):
    //   숙련 플레이(도깨비불·효험·간파·막기 사용) 승률 약 23~24%, 평균 16라운드 — 불가살이(적정 스탯 8~10, 같은 방식 28%)보다 조금 어렵게 의도.
    //   단순 공격 위주 약 27%. 스탯 15~17이면 약 5%, 21~23이면 약 44%.
    hp: 2226,
    atk: 30,
    act: 18,
    spirit: 24,
    // 간파로 올려다볼 때마다(그리고 체력 25% 미만이면 매 라운드) 커진다: 1단계마다 공격력 +2, 최대 5단계. (mbattle.js growBoss)
    grows: { atkPerStage: 2, max: 5 },
    rage: {
      stage1: '그슨대의 그림자가 짙어진다! (3라운드마다 반드시 영능력을 쓴다)',
      stage2: '그슨대가 끝없이 솟아오른다! (이제 매 라운드 끝마다 더 커진다)',
      jabToGroup: false,
      growEachRound: true,
    },
    special: { label: '내리누르기', note: '한 사람을 거대한 손바닥으로 내리누른다. 막을 수 없는 피해를 주고, 다음 3라운드 동안 영능력을 봉인한다.' },
    special2: { label: '어둠 드리우기', note: '일행 전원 위로 그림자를 드리운다. 막을 수 있는 피해를 주는 대신 의지력을 더 많이 빨아들인다.' },
    gimmicks: [
      '간파로 그슨대를 올려다볼 때마다 그슨대가 커진다. (1단계마다 공격력 +2, 최대 5단계)',
      '체력 50% 미만: 3라운드마다 반드시 영능력을 쓴다.',
      '체력 25% 미만: 매 라운드 끝마다 스스로 한 단계씩 커진다.',
      '평소에도 단체 공격이 자주 나온다.',
    ],
  },
].map((e, i) => ({ ...e, tier: e.tier ?? i + 1, partySize: e.partySize ?? 1, reward: e.spirit * REWARD_MULT }))

/**
 * v-B.04: 전투 데이터 50종(bestiary.js). 아직 등장 위치가 없어 체육관 목록(ENEMIES)·도감에는 나오지 않는다.
 * 다인·보스 전투, 느린 싸움, 개척 요괴 등 '적 id로 찾는' 곳은 모두 enemyById 로 찾으므로, 어디에 배치하든 그대로 싸울 수 있다.
 */
export const BESTIARY_ENEMIES = BESTIARY.map((e) => ({ ...e, partySize: e.partySize ?? 1, reward: e.spirit * REWARD_MULT }))
/** 기존 적 + 전투 데이터 50종 */
export const ALL_ENEMIES = [...ENEMIES, ...BESTIARY_ENEMIES]
/** 적 id → 적 데이터 (없으면 null) */
export const enemyById = (id) => ALL_ENEMIES.find((e) => e.id === id) ?? null

/** 단계별 적정 레벨(모든 스탯이 대략 이 정도일 때). 전투 데이터 50종은 각자 rec 를 갖고 있어 그 값을 먼저 쓴다. */
export const REC_STATS = { 1: '2~3', 2: '5~6', 3: '8~10', 4: '15~17', 5: '18~20', 6: '29~30', 7: '39~40', 8: '45~47', 9: '50', 10: '60' }
export const recLabel = (e) => `모든 스탯 ${e.rec ?? REC_STATS[e.tier] ?? '?'} 기준`
export const partyLabel = (e) => (e.partySize > 1 ? `적정 ${e.partySize}명` : '적정 1명')

/** 파티 전투에서 상대가 노릴 사람: 체력이 가장 많은 사람. 같으면 무작위. members = [{ id, hp }] (쓰러진 사람 제외) */
export function pickTarget(members, rng = Math.random) {
  const alive = members.filter((m) => m.hp > 0)
  if (!alive.length) return null
  const top = Math.max(...alive.map((m) => m.hp))
  const ties = alive.filter((m) => m.hp === top)
  return ties[Math.floor(rng() * ties.length)]
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
    note: '모두가 태어날 때부터 가지고 있는 영능력. 자신의 메인 턴에 앞서 켜 두면, 그 다음에 고르는 일반 공격·부적·영능력(생존본능·원숭이 손·도깨비불)이 자동으로 두 번 굴러 더 나은 쪽으로 들어간다.',
    detail:
      '토글을 켜도 턴을 쓰지 않는다. 실제로 공격을 고르는 순간 의지력 10(모자라면 0까지)이 들고, 토글은 그때 꺼진다. 도깨비불처럼 효과가 몇 턴 뒤에 터지는 영능력은, 걸어 둔 효험이 터지는 순간까지 그대로 유지된다.',
    cond: '처음부터 가지고 있다.',
    default: true,
    toggle: true,
  },
  {
    id: 'survival',
    label: '생존본능',
    note: '불리한 전투라고 판단이 될 때 적을 교란하고 전투에서 도망친다. 후일을 도모하는 것도 결국 살아있는 자들의 특권이 아닌가.',
    detail: '자신의 턴에 사용. (50+(신속*2)-상대의 영력)% 확률로 전투에서 도주한다.',
    cond: '전투 중 최초로 전투불능이 되어본다.',
    use: true,
  },
  // ───────── 아래 영능력들은 실제 전투 로직까지 구현되어 있다(psychicTurn). 다만 정식 취득 경로는 아직 정해지지 않아, 관리자 도구로만 얻을 수 있다. ─────────
  {
    id: 'cotton-mist',
    label: '솜구름 안개',
    note: '마치 구름처럼 희게 퍼지는 안개. 손끝으로부터 피어오른 안개는 적의 눈을 가리고 감정과 상태를 주무른다.',
    detail: '의지력 20 소모. 적의 다음 턴이 이미 정해져 있었다면(강공·영능력 등) 그걸 무르고 1d10을 다시 굴려 새로 정한다. 다시 굴린 결과가 똑같이 나왔을 경우에는 그냥 그대로 행한다.',
    cond: '(취득 경로 미정)',
    mp: 20,
    use: true,
  },
  {
    id: 'echo-form',
    label: '형상 기억',
    note: '가장 안전하고 평화로웠던 기억을 떠올려 구현화시킨다. 돌아가고 싶어도 돌아갈 수 없다면 지금을 지켜!',
    detail: '의지력을 50만큼 소모한다. 자신 또는 일행 중 한 명의 체력을 무조건 100으로 회복시킨다.',
    cond: '(취득 경로 미정)',
    use: true,
  },
  {
    id: 'falling-light',
    label: '내려쬐는 빛',
    note: '스스로가 내뿜은 빛에 앞이 보이지 않는다. 이제 할 수 있는 것은 웅크리는 것뿐이다. 그러나 그것만으로도 충분하다.',
    detail:
      '쓸 때마다 의지력 10을 소모한다. 턴 제한 없이 아무 때나, 몇 번이든 다시 걸 수 있다. 단체 공격을 대신 맞으면 원래 맞았을 인원 수만큼 피해가 곱해진다. 사용한 직후 들어오는 그 공격은 무조건 \'막기\'로 처리된다(피해 감소 및 반격 포함).',
    cond: '(취득 경로 미정)',
    mp: 10,
    use: true,
  },
  {
    id: 'monkey-paw',
    label: '원숭이 손',
    note: '얻는 만큼 잃는다. 영구적이게 얻고자 한다면 영구적이게 잃는다.',
    detail: '즉시 자신의 체력을 원하는 만큼 깎는다(체력은 0 이하로 내려갈 수 없다). 그 두 배만큼의 공격력을 일반 공격력에 더하고, 거기에 부적 1회치 피해를 더해 공격한다. 영능력 공격이라 안목 판정 없이 무조건 명중한다. 의지력은 깎은 체력에 10을 더한 만큼 소모한다. (석장 등 의지력 소비 감소 효과는 적용된다.) 사용 후 ((호전−인내)+(호전−절제))%의 확률로 즉시 행동불능이 되어 3턴 동안 아무 행동도 할 수 없다.',
    cond: '(취득 경로 미정 · 박신아가 가지고 있다)',
    owner: 'shinah',
    use: true,
  },
  {
    id: 'dokkaebi-fire',
    label: '도깨비불',
    note: '어딘가에 홀연히 나타나는, 혼을 먹고 자라난다는 푸른 빛의 불꽃.',
    detail: '쓰는 즉시 의지력 20을 소모하고, 그 턴부터 3턴 동안 행동 불가 → 이어지는 턴에 자동으로 5배 공격. 영능력 공격이라 안목 판정 없이 무조건 명중한다. 전투·단체전투 모두에서 쓸 수 있다.',
    cond: '(취득 경로 미정)',
    mp: 20,
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
  { id: 'earth-step', label: '지신밟기', mp: '인내+50 (최대 99)', use: true, note: '이곳은 절대적으로 안전하다. 거대한 무언가가 모두를 지켜주고 있다.', detail: '의지력 (인내+50, 최대 99) 소모. 첫 턴에만 사용할 수 있다. 전투가 끝날 때까지 아군 전원의 받는 피해가 인내/2% 감소한다.', cond: '(취득 경로 미정)' },
  { id: 'warding-scripture', label: '벽사진경', mp: '선택한 의지력', use: true, note: '사악한 것은 쫓아내고 복된 것은 맞이한다. 전투를 축제처럼 벌여 보자.', detail: '원하는 만큼 의지력을 사용해 지정한 일행 한 사람의 의지력을 그만큼 회복한다.', cond: '(취득 경로 미정)' },
  { id: 'spirit-barrier', label: '영력결계', mp: 0, use: false, note: '볼 수 없다는 것은 축복이요, 볼 수 있다는 것은 저주라. 앎은 영혼을 얽매고 무지는 목을 조른다.', detail: '별도의 선언 없이 상시 발동. 일반 전투에서는 습득 시 적용되며, 보스 전투에서는 가져갈 영능력으로 선택했을 때만 적용된다. 적의 단일 영능력이 자신을 대상으로 하면 약공으로 대체된다. 단체 영능력은 그대로 발동하지만 자신에게만 효과가 없다. 대신 적 대상 영능력과 효험은 사용할 수 없으며, 자신·아군 대상 영능력은 사용할 수 있다.', cond: '(취득 경로 미정)' },
  { id: 'seven-stars', label: '칠성낙인', mp: 99, use: true, note: '북두칠성의 기운을 새겨낸다. 그것은 마치 은하수처럼 흐르고, 폭포수처럼 쏟아진다.', detail: '의지력 99를 소모한다. 내가 직접 행동을 고르는 첫 번째 턴에만 쓸 수 있고(신속이 느려 상대가 먼저 움직였거나, 돌발 행동으로 몸이 먼저 나간 턴은 세지 않는다), 쓰면 전투 종료까지 장비 보정을 제외한 원래 호전 수치가 두 배가 된다.', cond: '(취득 경로 미정)' },
  { id: 'language-barrier', label: '언어장벽', mp: 20, use: true, note: '인간도 짐승도 혼도 결국 태어나기 전 살았던 세계는 하나. 뜻이 통한다면 읽을 수 있으리.', detail: '의지력 20을 소모해 적의 앞으로 20턴을 먼저 간파한다. 드러난 20턴의 내용을 확인한 뒤, 바꿀 턴을 최대 세 개 골라 다시 굴린다. 몇 번째 라운드든, 일행 중 몇 번째 순서든 내 차례라면 언제든 쓸 수 있다. (간파는 턴을 쓰지 않고, 고른 턴을 확정할 때 내 턴이 끝난다.)', cond: '(취득 경로 미정)' },
]

/** 상시 발동(패시브) 영능력: 전투 전에 켜고 끌 수 있다. (v79.0.7) */
export const PASSIVE_PSYCHICS = PSYCHICS.filter((p) => p.use === false && !p.default && !p.toggle)
/** 지금 갖고 있는 패시브 영능력 id 목록 */
export const ownedPassives = (psychics = []) => PASSIVE_PSYCHICS.filter((p) => psychics.includes(p.id)).map((p) => p.id)

/** 효험 등 default 인 영능력을 포함해, 지금 쓸 수 있는 영능력 목록. psychics = player.psychics (익힌 id 배열). */
export const ownedPsychics = (psychics = []) => PSYCHICS.filter((p) => p.default || psychics.includes(p.id))

/**
 * 도깨비불 (바리의 영능력): 쓴 턴을 포함해 3턴 동안 아무 행동도 하지 않고 기를 모은 뒤,
 * 그 다음 내 턴에 일반 공격의 5배 피해를 때린다. 강공격은 아니라서 방어 태세에는 절반으로 줄어든다.
 * 쓰고 나면 state.fire 가 남은 자동 턴 수(3)로 세팅되고, 내 턴이 올 때마다 fireTurn 을 불러 진행한다.
 */
export const FIRE_TURNS = 3
/** 도깨비불 폭발 배율 (v79.0.7: 4 → 5) */
export const FIRE_MULT = 5
/** 생존본능 도주 확률(%) = 50 + 1d(신속)×2 − 상대의 영력, 0~100 로 자른다. */
export function fleeChance(roll, enemy) {
  return Math.max(0, Math.min(100, 50 + roll * 2 - enemy.spirit))
}

/** 원숭이 손의 대가로 행동불능이 되는 턴 수 (v79.0.7) */
export const MONKEY_PAW_STUN_TURNS = 3

/** 원숭이 손 행동불능 확률(%) = (호전−인내)+(호전−절제), 0~100 */
export function monkeyPawStunChance(stats) {
  const a = Number(stats?.aggression) || 0
  const raw = (a - (Number(stats?.endurance) || 0)) + (a - (Number(stats?.control) || 0))
  return Math.max(0, Math.min(100, Math.floor(raw)))
}

/** 언어장벽 1단계: 의지력을 내고 적의 행동 20턴을 드러낸다. 턴은 끝나지 않는다(keepTurn). */
export function languageReveal(state, mpCost, rng = Math.random) {
  const s = { ...state }
  const expanded = [...(s.queue ?? [])]
  while (expanded.length < 20) expanded.push(rollIntent(expanded[expanded.length - 1] ?? null, rng, s.party, !!s.enemy?.boss))
  s.queue = expanded
  s.known = Math.max(s.known || 0, 20)
  s.lbPick = true
  return { state: s, mpCost, keepTurn: true, events: [{ kind: 'player', text: `✦ 언어장벽! 의지력 ${mpCost}을 써서 적의 행동 20턴을 간파했다. 바꿀 턴을 최대 세 개 골라 확정하자.` }] }
}

/** 언어장벽 2단계: 고른 턴(0부터 센 번호, 최대 3개)을 다시 굴린다. 이 행동으로 내 턴이 끝난다. */
export function languagePick(state, rerolls, rng = Math.random) {
  const s = { ...state, guard: false, myTurns: (state.myTurns || 0) + 1, choseTurns: (state.choseTurns || 0) + 1, lbPick: false }
  const queue = [...(s.queue ?? [])]
  const indices = Array.isArray(rerolls) ? [...new Set(rerolls.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < Math.min(20, queue.length)))].slice(0, 3) : []
  const changes = []
  for (const i of indices) {
    const before = queue[i]
    queue[i] = rollIntent(i > 0 ? queue[i - 1] : null, rng, s.party, !!s.enemy?.boss)
    changes.push(`${i + 1}번째 ${INTENTS[before]?.label ?? before} → ${INTENTS[queue[i]]?.label ?? queue[i]}`)
  }
  s.queue = queue
  return { state: s, mpCost: 0, events: [{ kind: 'player', text: indices.length ? `✦ 언어장벽: ${indices.length}턴을 다시 정했다. (${changes.join(', ')})` : '✦ 언어장벽: 바꾸지 않고 그대로 두었다.' }] }
}

/** 영능력 사용(내 턴). 반환: { state, events, mpCost, fled } — 실패하면 내 턴을 쓴 것으로 치고 상대 턴으로 넘어간다. 못 쓰면 invalid: true (턴을 쓰지 않는다). */
export function psychicTurn(state, id, ctx, rng = Math.random) {
  const stats = afflictStats(ctx.stats, state.ps)
  const s = { ...state, guard: false, myTurns: (state.myTurns || 0) + 1, choseTurns: (state.choseTurns || 0) + 1 }
  const mpNow0 = Math.floor(ctx.mp ?? 0)
  const needMp = (amount) => {
    const need = mpCostOf(stats, amount)
    return need > mpNow0 ? need : 0
  }
  // 언어장벽 2단계: 이미 20턴을 간파한 상태에서 바꿀 턴(최대 3개)을 확정한다. 의지력은 1단계에서 이미 냈다.
  if (id === 'language-barrier' && state.lbPick) return languagePick(state, ctx.rerolls, rng)
  if (id === 'earth-step' || id === 'seven-stars' || id === 'warding-scripture' || id === 'language-barrier') {
    // v-B.06: 칠성낙인은 '내가 직접 행동을 고르는 첫 번째 턴'에만 — 돌발·연모처럼 억지로 움직인 턴, 시간 초과로 넘어간 턴은 세지 않는다.
    if (id === 'seven-stars' && (state.choseTurns || 0) > 0)
      return { state, events: [{ kind: 'warn', text: '칠성낙인은 내가 직접 고르는 첫 번째 턴에만 사용할 수 있다.' }], mpCost: 0, invalid: true }
    if (id === 'earth-step' && state.myTurns > 0)
      return { state, events: [{ kind: 'warn', text: '첫 번째 턴에만 사용할 수 있다.' }], mpCost: 0, invalid: true }
    const rawCost = id === 'earth-step' ? Math.min(99, 50 + stats.endurance) : id === 'seven-stars' ? 99 : id === 'language-barrier' ? 20 : Math.max(1, Math.floor(ctx.amount ?? 10))
    const mpCost = mpCostOf(stats, rawCost)
    if (mpCost > mpNow0) return { state, events: [{ kind: 'warn', text: `의지력이 부족하다. (${mpCost} 필요)` }], mpCost: 0, invalid: true }
    if (id === 'earth-step') {
      s.earthReduction = Math.min(1, Math.max(0, stats.endurance / 200))
      return { state: s, mpCost, earthReduction: s.earthReduction, events: [{ kind: 'player', text: `✦ 지신밟기! 아군이 받는 피해 ${Math.round(s.earthReduction * 100)}% 감소.` }] }
    }
    if (id === 'seven-stars') {
      s.starBonus = Math.max(1, ctx.baseAggression ?? stats.aggression)
      return { state: s, mpCost, starBonus: s.starBonus, events: [{ kind: 'player', text: `✦ 칠성낙인! 이번 전투에서 본래 호전 ${s.starBonus}만큼 추가.` }] }
    }
    if (id === 'warding-scripture') {
      return { state: s, mpCost, healMpTarget: ctx.target ?? ctx.selfId, healMpAmount: rawCost, events: [{ kind: 'player', text: `✦ 벽사진경! 의지력 ${rawCost}을 회복시켰다.` }] }
    }
    return languageReveal(state, mpCost, rng)
  }
  if (id === 'spirit-barrier') return { state, events: [{kind:'warn',text:'영력결계는 자동으로 발동하는 영능력이다.'}], mpCost: 0, invalid: true }
  if (id === 'dokkaebi-fire') {
    // 효험은 의지력 10을 정확히 다 낼 수 있어야만 발동한다 — 모자라면 효험 없이 도깨비불만 쓴다. (v70)
    const buffed = !!ctx.buff && mpNow0 >= mpCostOf(stats, BUFF_COST)
    const buffCost = buffed ? mpCostOf(stats, BUFF_COST) : 0
    const fireCost = mpCostOf(stats, 20)
    const mpCost = fireCost + buffCost
    if (mpCost > mpNow0) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${mpCost}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    s.fire = FIRE_TURNS
    // 효험은 지금 거는 것이지만, 실제로 공격력을 산출하는 건 몇 턴 뒤의 폭발(fireTurn) 시점이라 그때까지 들고 있는다.
    s.fireBuffed = buffed
    return {
      state: s,
      events: [{ kind: 'warn', text: `✦ 도깨비불!${buffed ? ' 효험!' : ''} 의지력 ${mpCost}을 써서 푸른 불꽃에 기를 모은다…${buffed ? ' (터질 때 효험이 적용된다)' : ''} (1/${FIRE_TURNS}) 앞으로 ${FIRE_TURNS - 1}턴은 아무 행동도 할 수 없다.` }],
      mpCost,
      fled: false,
      boostUsed: false,
    }
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
    // 효험은 의지력 10을 정확히 다 낼 수 있어야만 발동한다 — 모자라면 효험 없이 쓴다. (v70)
    const buffed = !!ctx.buff && mpNow0 >= mpCostOf(stats, BUFF_COST)
    const buffCost = buffed ? mpCostOf(stats, BUFF_COST) : 0
    const mpCost = mpCostOf(stats, amt + 10) + buffCost
    if (mpCost > mpNow0) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${mpCost}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    s.php = curPhp - amt
    const aura = ctx.aura ?? auraSelfOf(stats)
    const boostMult = typeof ctx.boost === 'number' ? ctx.boost : ctx.boost ? 2 : 1
    const braced = s.queue[0] === 'guard'
    // 영능력 공격은 안목 판정(빗나감) 없이 무조건 명중한다. (v70)
    let r, buffNote = ''
    if (buffed) {
      const r1 = attackRoll(stats, rng, true)
      const r2 = attackRoll(stats, rng, true)
      r = r1.dmg >= r2.dmg ? r1 : r2
      buffNote = ` (효험: 두 번 굴림 — 첫 번째 ${r1.dmg}, 두 번째 ${r2.dmg} 중 더 나은 쪽)`
    } else {
      r = attackRoll(stats, rng, true)
    }
    const extra = amt * 2
    let dmg = 0, note = ''
    if (!r.miss) {
      const fb = fxBase(r.dmg + extra, stats, s.ehp, s.enemy.hp, aura, rng)
      const cr = fxCrit(Math.ceil(fb.base * boostMult * atkMult(stats)), stats, rng)
      dmg = cr.dmg
      note = `${noteOf(fb.notes)}${cr.note}`
    }
    // 부적 1회치 피해를 추가로 더한다 — 실제 부적을 소모하지는 않고, 그만큼의 피해를 따로 한 번 굴려서 더하는 것.
    // (부적은 빗나감이 없으므로, 위 일반 공격이 빗나가도 이 몫만큼은 반드시 들어간다)
    const cpr = attackRoll(stats, rng, true)
    const cfb = fxBase(cpr.dmg, stats, s.ehp, s.enemy.hp, aura, rng)
    const ccr = fxCrit(Math.ceil(cfb.base * 2 * atkMult(stats)), stats, rng)
    const charmDmg = ccr.dmg
    dmg += charmDmg
    if (braced) { dmg = Math.ceil(dmg / 2); note += ' (방어에 절반으로 막힘)' }
    s.ehp = Math.max(0, s.ehp - dmg)
    const ev = [{
      kind: 'player',
      roll: r.hit,
      dmg,
      text: `✦ 원숭이 손!${buffed ? ' 효험!' : ''} 체력 ${amt}을 깎아 공격력 +${extra}에 부적 1회치(${charmDmg}) 피해를 더함, 의지력 ${mpCost} 소모. ${dmg} 피해${note}${buffNote}`,
    }]
    let selfStun = 0
    if (s.ehp <= 0) {
      s.over = 'win'
      ev.push({ kind: 'end', text: `${s.enemy.name}이(가) 쓰러졌다.` })
    } else {
      // v79.0.7: 사용 후 ((호전−인내)+(호전−절제))% 확률로 즉시 행동불능(내 턴 3번 동안 행동 불가).
      const stunChance = monkeyPawStunChance(stats)
      if (stunChance > 0) {
        const d = Math.floor(rng() * 100) + 1
        if (d <= stunChance) {
          selfStun = MONKEY_PAW_STUN_TURNS
          s.pstun = Math.max(s.pstun || 0, MONKEY_PAW_STUN_TURNS)
          ev.push({ kind: 'warn', text: `원숭이 손의 대가! [확률 ${stunChance}%, d100 = ${d}] 몸이 굳어 즉시 행동불능이 되었다. (${MONKEY_PAW_STUN_TURNS}턴 동안 행동 불가)` })
        } else {
          ev.push({ kind: 'info', text: `원숭이 손의 대가를 피했다. [확률 ${stunChance}%, d100 = ${d}]` })
        }
      }
    }
    return { state: s, events: ev, mpCost, boostUsed: !!ctx.boost, selfStun }
  }
  if (id === 'echo-form') {
    // 의지력 소모 = 50 - 인내 - 절제 + 호전 (최소 20, 최대 99, 지팡이 할인 등 기존 보정은 그대로 적용). (v71)
    const rawCost = 50
    const shortfall = needMp(rawCost)
    if (shortfall) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${shortfall}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    const cost = mpCostOf(stats, rawCost)
    // target 이 없거나(1인 전투) 자기 자신이면 그대로 자기 체력을 100으로; 일행 중 다른 사람이면
    // 그 사람의 체력을 바꾸는 건 이 함수가 알 수 없는 영역이라(파티원 상태는 mbattle.js 쪽에 있다),
    // healTarget 을 반환해서 mbattle.js가 그 대상의 체력을 직접 100으로 맞추게 한다.
    const healSelf = !ctx.target || ctx.target === ctx.selfId
    if (healSelf) s.php = 100
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 형상 기억! 가장 안전하고 평화로웠던 기억을 떠올려, 의지력 ${cost}을 써서 ${healSelf ? '자신의' : '일행의'} 체력을 100으로 되돌렸다.` }],
      mpCost: cost,
      healTarget: ctx.target ?? ctx.selfId,
    }
  }
  if (id === 'falling-light') {
    const shortfall = needMp(10)
    if (shortfall) return { state, events: [{ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${shortfall}, 지금 ${mpNow0})` }], mpCost: 0, invalid: true }
    const mpCost = mpCostOf(stats, 10)
    s.fallingLight = true
    return {
      state: s,
      events: [{ kind: 'player', text: `✦ 내려쬐는 빛! 의지력 ${mpCost}을 써서, 다음에 적이 하는 공격(단일·단체 모두)을 무조건 내가 맞아낸다. (1인 전투에서는 원래도 모든 공격이 나에게 오므로 체감되지는 않는다)` }],
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
  const mpNow = Math.floor(ctx.mp ?? 0)
  // 효험은 의지력 10을 정확히 다 낼 수 있어야만 발동한다 — 모자라면 효험 없이 쓴다. (v70)
  const buffed = !!ctx.buff && mpNow >= mpCostOf(stats, BUFF_COST)
  const buffCost = buffed ? mpCostOf(stats, BUFF_COST) : 0
  let roll, buffNote = ''
  if (buffed) {
    const roll1 = stats.agility
    const roll2 = stats.agility
    roll = Math.max(roll1, roll2)
    buffNote = ` [효험: 두 번 굴림 — ${roll1}, ${roll2} 중 더 나은 ${roll}]`
  } else {
    roll = stats.agility
  }
  const chance = fleeChance(roll, s.enemy)
  const d = Math.floor(rng() * 100) + 1
  if (d <= chance) {
    s.over = 'fled'
    return {
      state: s,
      events: [{ kind: 'end', text: `✦ 생존본능!${buffed ? ' 효험!' : ''} 적을 교란하고 전투에서 도망쳤다.${buffNote}` }],
      mpCost: buffCost,
      fled: true,
      boostUsed: !!ctx.boost,
    }
  }
  return {
    state: s,
    events: [{ kind: 'warn', text: `✦ 생존본능… 실패!${buffed ? ' 효험!' : ''} 도망치지 못했다.${buffNote}` }],
    mpCost: buffCost,
    fled: false,
    boostUsed: !!ctx.boost,
  }
}

/** 도깨비불 진행 중인 내 턴: 기를 모으거나(자동), 마지막에 5배 공격. 반환: { state, events, done } */
export function fireTurn(state, ctx, rng = Math.random) {
  const stats = afflictStats(ctx.stats, state.ps)
  const s = { ...state, guard: false }
  const left = s.fire ?? 0
  if (left > 1) {
    s.fire = left - 1
    return { state: s, events: [{ kind: 'warn', text: `✦ 도깨비불… 기를 모으는 중 (${FIRE_TURNS + 2 - left}/${FIRE_TURNS})` }], done: false }
  }
  s.fire = 0
  const braced = s.queue[0] === 'guard'
  // 효험: 쓸 때 걸어 둔 버프가 터지는 이 순간까지 들고 있다가, 여기서 두 번 굴려 더 나은 쪽을 쓴다.
  const buffed = !!s.fireBuffed
  s.fireBuffed = false
  // 영능력 공격은 안목 판정(빗나감) 없이 무조건 명중한다. (v70)
  let r, buffNote = ''
  if (buffed) {
    const r1 = attackRoll(stats, rng, true)
    const r2 = attackRoll(stats, rng, true)
    r = r1.dmg >= r2.dmg ? r1 : r2
    buffNote = ` (효험: 두 번 굴림 — 첫 번째 ${r1.dmg}, 두 번째 ${r2.dmg} 중 더 나은 쪽)`
  } else {
    r = attackRoll(stats, rng, true)
  }
  const mult = typeof ctx.boost === 'number' ? ctx.boost : ctx.boost ? 2 : 1
  const fb = fxBase(r.dmg, stats, s.ehp, s.enemy.hp, ctx.aura ?? auraSelfOf(stats), rng)
  const cr = fxCrit(Math.ceil(fb.base * FIRE_MULT * mult * atkMult(stats)), stats, rng)
  let dmg = cr.dmg
  if (braced) dmg = Math.ceil(dmg / 2)
  s.ehp = Math.max(0, s.ehp - dmg)
  const ev = [
    { kind: 'player', roll: r.hit, dmg, text: `✦ 도깨비불 폭발!${buffed ? ' 효험!' : ''} ×${FIRE_MULT} = ${dmg} 피해${noteOf(fb.notes)}${cr.note}${braced ? ' (방어에 절반으로 막힘)' : ''}${buffNote}` },
  ]
  if (s.ehp <= 0) {
    s.over = 'win'
    ev.push({ kind: 'end', text: `${s.enemy.name}이(가) 쓰러졌다.` })
  }
  return { state: s, events: ev, done: true, boostUsed: !!ctx.boost }
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
// v-B.08 도깨비 탈(장신구): 돌발 확률 +50%
export const rashPercent = (stats) => Math.max(0, Math.min(100, Math.floor(stats.aggression - stats.control) + (stats.trinket === 'goblin-mask' ? 50 : 0)))
/** 공격력 배율: 단풍 패 +10%, 도깨비 탈(장신구) +200% (v-B.08) */
export const atkMult = (stats) => (stats.special === 'maple' ? 1.1 : 1) * (stats.trinket === 'goblin-mask' ? 3 : 1)
/** 도깨비 탈: 단체 전투에서 일반 공격이 아군에게 갈 확률(%) = ⌊호전/3⌋ */
export const maskFriendlyFirePercent = (stats) => (stats.trinket === 'goblin-mask' ? Math.max(0, Math.floor((stats.aggression || 0) / 3)) : 0)
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

// ───────── 데이터형 영능력 (v-B.04 · v-B.05) ─────────
// special.effect 를 적어 두면 enemyTurn 이 적 id 분기 없이 그대로 해석한다. 쓸 수 있는 칸:
//   target    'one' | 'all'   다인 전투에서 한 사람 / 일행 전원 (special 기본 'one', special2 기본 'all')
//   dmg       { mult, add, hits }  한 번에 1d공격력×mult + add 피해, hits 번 (add: 숫자 또는 'spirit', 'spirit/2', 'atk*3', 'round*2' …)
//   blockable true 면 약공처럼 막기·방어로 줄어든다 (기본: 막을 수 없음)
//   lifesteal 준 피해의 이 비율만큼 적 체력 회복 (0.5 = 50%)
//   drain     { die, mult }  의지력 1d(die)×mult 흡수 (die: 숫자 또는 'spirit' 등)
//   bind      true  다음 내 턴 막기 불가
//   curse     N     저주 N턴 (걸린 다음 상대 턴부터 매번 1d(영력/2) 피해)
//   seal      N     N턴(다인은 N라운드) 동안 영능력·효험 봉인
//   stun      N     N턴 행동불능
//   heal      비율  적 체력 최대치의 이 비율만큼 회복 (다인 단체 영능력이라도 한 번만)
//   charge    true  곧바로 기를 모아 다음 행동이 강공이 된다
// v-B.05 — 적 60개의 영능력이 서로 겹치지 않도록 새로 생긴 칸들. 내게 걸리는 것은 state.ps, 적에게 걸리는 것은 state.es 에 남는다.
//   즉시     pctCurrent N(지금 체력의 1/N) · splitDamage N(공격력×N 을 인원수로 나눔) · mpBurn 비율 · sacrifice { pct, mult } · execute · escalate N
//            wipeIntel · extraAction · equalize · charmEat 비율 · maxHpCut 비율 · surviveSteal · buffSteal { rounds } · barrierBreak
//   내 상태  itemSeal · thorns { turns, die } · scramble · statDown { stat, turns } · poison { die } · guardTrap { turns, die } · vulnerable
//            costUp · forceRash · sleep · confuse · healBlock · blind · burn { turns, pct } · weaponSeal · mpTax · fear · paralyze { turns, chance }
//            statSwap · plague { rounds, die }
//   적 상태  falseIntel N · summon { rounds, die } · chargeMult N · evade N · rewind { turns, cap } · revive 비율 · shield 비율 · reflect 비율
//            delayed { turns, mult, add, cancel } · rageStack N · statCopy N · rampage N · field { die, until }
//   일행     swapAllyHp · mark N · link N · targetLowest · chain · banish { rounds, need } · release { pct, rounds } · friendlyFire

const STAT_KO = { insight: '안목', aggression: '호전', endurance: '인내', control: '절제', agility: '신속', comprehension: '이해' }
export const STAT6 = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension']

/** 효과 칸의 값: 숫자 그대로, 또는 'spirit' · 'atk' · 'hp' · 'round' 와 '/N' (내림) · '*N' */
export function effectExpr(x, enemy, state) {
  if (typeof x === 'number') return x
  const m = /^(atk|spirit|hp|round)(?:([/*])(\d+))?$/.exec(String(x ?? ''))
  if (!m) return 0
  const v = m[1] === 'round' ? Math.max(1, Number(state?.round) || 1) : Number(enemy?.[m[1]]) || 0
  if (!m[2]) return v
  return m[2] === '/' ? Math.floor(v / Number(m[3])) : v * Number(m[3])
}
/** 영력결계를 꿰뚫는 영능력인가 (v-B.05: 결계를 통째로 삼키는 영능력만) */
export const effectPierces = (def) => !!def?.effect?.barrierBreak
/** 이 영능력이 다인 전투에서 일행 전원을 노리는가 */
export const effectHitsAll = (def, second = false) => (def?.effect?.target ?? (second ? 'all' : 'one')) === 'all'
/**
 * 다인 전투에서 영능력이 사람을 고르는 방식. mbattle 이 쓴다.
 * 'all' 일행 전원 · 'one' 체력이 가장 많은 사람 · 'lowest' 가장 적은 사람 · 'chain' 차례로 줄어드는 피해
 * 'mark' · 'link' · 'swap' · 'banish' · 'ff' 일행 단위로 따로 처리
 */
export function effectTargeting(def, second = false) {
  const e = def?.effect
  if (!e) return effectHitsAll(def, second) ? 'all' : 'one'
  if (e.swapAllyHp) return 'swap'
  if (e.mark) return 'mark'
  if (e.link) return 'link'
  if (e.banish) return 'banish'
  if (e.friendlyFire) return 'ff'
  if (e.chain) return 'chain'
  if (e.targetLowest) return 'lowest'
  return effectHitsAll(def, second) ? 'all' : 'one'
}

/** 적 자신에게만 걸리거나 판 전체에 걸리는 칸(누구를 노리는지 적지 않는다) */
const SELF_ONLY_KEYS = ['heal', 'rageStack', 'evade', 'shield', 'reflect', 'rewind', 'statCopy', 'rampage', 'chargeMult', 'wipeIntel', 'falseIntel', 'extraAction', 'summon', 'field', 'delayed', 'charge']
/** 데이터형 영능력 한 줄 설명 (팝업·도감용) */
export function effectLine(enemy, def, second = false) {
  const e = def?.effect
  if (!e) return def?.note ?? ''
  const bits = []
  const X = (v) => effectExpr(v, enemy)
  const party = enemy.partySize > 1
  const T = (n) => `${n}${party ? '라운드' : '턴'}`
  if (e.dmg) {
    const mult = Math.max(1, e.dmg.mult || 1)
    const roundAdd = /^round/.test(String(e.dmg.add ?? ''))
    const add = roundAdd ? 0 : X(e.dmg.add)
    const hits = Math.max(1, e.dmg.hits || 1)
    const addText = roundAdd ? ` + (지금까지의 라운드 수 × ${Number(String(e.dmg.add).split('*')[1]) || 1})` : add ? ` + ${add}` : ''
    const range = roundAdd ? '' : ` (${mult + add}~${enemy.atk * mult + add})`
    bits.push(`${e.blockable ? '막을 수 있는' : '막을 수 없는'} 피해 1d${enemy.atk}${mult > 1 ? `×${mult}` : ''}${addText}${range}${hits > 1 ? ` × ${hits}번` : ''}${e.blockable ? ', 막기·방어로 줄어든다' : ''}`)
    if (e.execute) bits.push('맞는 사람 체력이 절반 이하면 피해 2배')
    if (e.escalate) bits.push(`쓸 때마다 다음 피해가 ${e.escalate}배씩 커진다 (1배 → ${e.escalate}배 → ${e.escalate ** 2}배 …)`)
    if (e.chain) bits.push('첫 사람은 그대로, 다음 사람은 절반, 그다음 사람은 또 절반 (각자 막기로 줄일 수 없다)')
  }
  if (e.pctCurrent) bits.push(`지금 체력의 1/${e.pctCurrent}만큼 피해 (막기·인내 저항 무시)`)
  if (e.splitDamage) bits.push(`공격력×${e.splitDamage} = ${enemy.atk * e.splitDamage} 피해를 살아 있는 인원 수로 나눠 각자 맞는다 (막기로 줄어든다, 사람이 많을수록 덜 아프다)`)
  if (e.mpBurn) bits.push(`남은 의지력의 ${Math.round(e.mpBurn * 100)}%를 태워 그만큼 막을 수 없는 피해`)
  if (e.sacrifice) {
    const c = Math.ceil(enemy.hp * e.sacrifice.pct)
    bits.push(`자기 체력 ${c}(${Math.round(e.sacrifice.pct * 100)}%)를 깎아 그 ${e.sacrifice.mult}배(${c * e.sacrifice.mult}) 막을 수 없는 피해`)
  }
  if (e.lifesteal) bits.push(`준 피해의 ${Math.round(e.lifesteal * 100)}%만큼 체력 회복`)
  if (e.drain) {
    const d = Math.max(1, X(e.drain.die ?? 'spirit'))
    const m = Math.max(1, e.drain.mult || 1)
    bits.push(`의지력 1d${d}${m > 1 ? `×${m}` : ''} 흡수 (남은 의지력이 한도)`)
  }
  if (e.bind) bits.push('다음 내 턴엔 막기 불가')
  if (e.curse) bits.push(`저주 ${e.curse}턴 (걸린 다음 상대 턴부터 매번 1d${Math.max(1, Math.floor(enemy.spirit / 2))} 피해, 막을 수 없음)`)
  if (e.seal) bits.push(`${T(e.seal)} 동안 영능력(효험 포함) 봉인`)
  if (e.stun) bits.push(`${e.stun}턴 행동불능`)
  if (e.heal) bits.push(`자기 체력 최대치의 ${Math.round(e.heal * 100)}%(${Math.ceil(enemy.hp * e.heal)}) 회복`)
  if (e.charge) bits.push('곧바로 기를 모아 다음 행동은 반드시 강공')
  if (e.wipeIntel) bits.push('간파해 둔 행동을 모두 지우고(간파 0턴) 앞으로의 행동 다섯을 새로 굴린다')
  if (e.itemSeal) bits.push(`${T(e.itemSeal)} 동안 아이템을 쓸 수 없다`)
  if (e.summon) bits.push(`${e.summon.rounds}라운드 동안 라운드가 끝날 때마다 쥐 떼가 ${party ? '무작위 한 사람을 ' : ''}문다: 1d${X(e.summon.die)} (막기 중이면 절반)`)
  if (e.thorns) bits.push(`${T(e.thorns.turns)} 동안 일반 공격·부적을 쓸 때마다 내 체력 1d${X(e.thorns.die)} 감소 (이걸로는 쓰러지지 않는다)`)
  if (e.extraAction) bits.push('곧바로 한 번 더 움직인다 (다음 행동을 이번 턴에 당겨 쓴다)')
  if (e.swapAllyHp) bits.push('체력 비율이 가장 높은 사람과 가장 낮은 사람의 체력 비율을 맞바꾼다')
  if (e.scramble) bits.push('다음 턴에 고른 행동이 일반 공격·막기·간파 중 무작위로 바뀐다')
  if (e.mark) bits.push(`무작위 한 사람에게 냄새를 묻힌다. ${e.mark}라운드 동안 한 사람을 노리는 공격은 모두 그 사람에게 간다`)
  if (e.falseIntel) bits.push(`앞으로 ${e.falseIntel}번의 행동이 간파에 거짓으로 보인다`)
  if (e.statDown) bits.push(`${T(e.statDown.turns)} 동안 내 ${STAT_KO[e.statDown.stat] ?? e.statDown.stat} 수치가 절반`)
  if (e.link) bits.push(`두 사람을 잇는다. ${e.link}라운드 동안 한쪽이 피해를 받으면 다른 쪽도 그 절반을 받는다`)
  if (e.poison) bits.push(`독 1겹 (겹은 쌓이고 전투 끝까지 남는다). 상대가 움직일 때마다 겹 수 × 1d${X(e.poison.die)} 피해 (막을 수 없음)`)
  if (e.guardTrap) bits.push(`${T(e.guardTrap.turns)} 동안 막기를 하면 독을 들이마셔 1d${X(e.guardTrap.die)} 피해`)
  if (e.maxHpCut) bits.push(`최대 체력 −${Math.round(e.maxHpCut * 100)}% (이번 전투 끝까지, 겹쳐 쌓인다)`)
  if (e.vulnerable) bits.push(`${T(e.vulnerable)} 동안 받는 피해 +25%, 인내 저항이 발동하지 않는다`)
  if (e.targetLowest) bits.push('체력이 가장 적은 사람을 노린다')
  if (e.chargeMult) bits.push(`다음 행동이 강공으로 바뀌고, 그 강공은 1d${enemy.atk}×${e.chargeMult} + ${enemy.spirit}`)
  if (e.costUp) bits.push(`${T(e.costUp)} 동안 의지력이 드는 행동(간파·부적·효험·영능력)의 비용이 두 배 (남은 의지력이 한도)`)
  if (e.evade) bits.push(`내 다음 일반 공격 ${e.evade}번을 피한다 (부적·영능력은 맞는다)`)
  if (e.forceRash) bits.push(`${T(e.forceRash)} 동안 반드시 일반 공격만 한다`)
  if (e.sleep) bits.push(`잠든다: 최대 ${e.sleep}턴 행동불능, 피해를 받으면 바로 깬다`)
  if (e.surviveSteal) bits.push('남은 버티기 1회를 빼앗는다 (이번 전투)')
  if (e.buffSteal) bits.push(`칠성낙인 공격 보너스와 도깨비불 충전을 빼앗아 없앤다. 빼앗은 칠성낙인 보너스만큼 ${T(e.buffSteal.rounds)} 동안 공격력이 오른다`)
  if (e.confuse) bits.push(`홀린다: 내 다음 일반 공격·부적이 나 자신을 친다 (피해의 절반, ${e.confuse}턴 안에 쓰지 않으면 풀린다)`)
  if (e.rewind) bits.push(`자기 체력을 ${e.rewind.turns}턴 전으로 되돌린다 (한 번에 최대 체력의 ${Math.round(e.rewind.cap * 100)}%까지)`)
  if (e.revive) bits.push(`걸어 두는 영능력: 이번 전투에서 한 번, 쓰러지면 체력 ${Math.round(e.revive * 100)}%(${Math.ceil(enemy.hp * e.revive)})로 다시 일어선다. 이미 걸어 두었으면 대신 뼈마디로 친다 (막을 수 없는 피해 1d${enemy.atk} + ${Math.floor(enemy.spirit / 3)})`)
  if (e.plague) bits.push(`역병 ${e.plague.rounds}라운드: 라운드 끝마다 1d${X(e.plague.die)} 피해${party ? ', 아직 안 걸린 다른 한 사람에게 옮는다' : ''}`)
  if (e.healBlock) bits.push(`${T(e.healBlock)} 동안 모든 회복(무당방울·아이템·벚꽃·형상 기억)이 막힌다`)
  if (e.blind) bits.push(`${T(e.blind)} 동안 내 안목이 절반 (일반 공격이 자주 빗나간다)`)
  if (e.burn) bits.push(`화상 ${e.burn.turns}턴: 내 턴이 시작될 때마다 최대 체력의 ${Math.round(e.burn.pct * 100)}% 피해 (막기를 하면 불이 꺼진다, 이걸로는 쓰러지지 않는다)`)
  if (e.weaponSeal) bits.push(`${T(e.weaponSeal)} 동안 무구 효과와 무구 특수 강화가 꺼진다`)
  if (e.mpTax) bits.push(`${T(e.mpTax)} 동안 의지력을 쓸 때마다 같은 양만큼 체력도 깎인다`)
  if (e.field) bits.push(`땡볕: 라운드 끝마다 ${party ? '일행 전원 ' : ''}1d${X(e.field.die)} (막을 수 없음). 그 뒤로 ${X(e.field.until)} 이상 피해를 주면 비가 내려 그친다`)
  if (e.fear) bits.push('공포: 다음 턴 일반 공격·부적을 할 수 없다 (고르면 그 자리에서 웅크린다)')
  if (e.shield) bits.push(`최대 체력의 ${Math.round(e.shield * 100)}%(${Math.ceil(enemy.hp * e.shield)})짜리 껍질을 두른다. 다 깨질 때까지 피해를 대신 받는다`)
  if (e.banish) bits.push(`${e.banish.rounds}라운드 동안 행렬에 끌려가 행동도 못 하고 공격도 받지 않는다. 그 사이 남은 일행이 ${X(e.banish.need)} 이상 피해를 주면 바로 돌아온다 (혼자 남았으면 1턴 행동불능)`)
  if (e.release) bits.push(`최근 ${e.release.rounds}라운드 동안 받은 피해의 ${Math.round(e.release.pct * 100)}%를 모아 일행 전원에게 똑같이 나눠 되돌린다 (막을 수 없음)`)
  if (e.reflect) bits.push(`내 다음 공격 한 번의 피해 ${Math.round(e.reflect * 100)}%가 나에게도 되돌아온다`)
  if (e.paralyze) bits.push(`${T(e.paralyze.turns)} 동안 매 턴 ${e.paralyze.chance}% 확률로 몸이 저려 고른 행동이 실패한다`)
  if (e.delayed) bits.push(`${e.delayed.turns}턴 뒤 짓밟는다: 1d${enemy.atk}×${e.delayed.mult} + ${X(e.delayed.add)} (막으면 절반). 그 사이 ${X(e.delayed.cancel)} 이상 피해를 주면 넘어져 취소된다`)
  if (e.friendlyFire) bits.push('무작위 두 사람이 서로를 한 번씩 일반 공격한다 (막을 수 없음, 혼자면 제 몸을 친다)')
  if (e.rageStack) bits.push(`이번 전투 동안 공격력 +${e.rageStack} (쓸 때마다 쌓인다)`)
  if (e.statCopy) bits.push(`${T(e.statCopy)} 동안 내 육조 중 가장 높은 값의 절반만큼 공격력이 오른다`)
  if (e.rampage) bits.push(`다음 ${e.rampage}번의 행동이 모두 강공 (기 모으기 없이, 방어 태세 없이)`)
  if (e.equalize) bits.push('나와 자기의 체력 비율을 둘의 평균으로 맞춘다')
  if (e.statSwap) bits.push(`${T(e.statSwap)} 동안 각자 육조 두 개가 무작위로 맞바뀐다`)
  if (e.barrierBreak) bits.push('영력결계를 이번 전투 동안 없앤다 (영력결계로 막을 수 없다)')
  if (e.charmEat) bits.push(`남은 부적을 모두 먹어 치우고, 먹은 장 수마다 체력 ${Math.round(e.charmEat * 100)}%를 되찾는다`)
  const tg = effectTargeting(def, second)
  const selfOnly = Object.keys(e).filter((k) => k !== 'target').every((k) => SELF_ONLY_KEYS.includes(k))
  const who = party && !selfOnly ? ({ all: '일행 전원: ', one: '한 사람: ', banish: '한 사람: ' }[tg] ?? '') : ''
  return `《${def.label}》 ${who}${bits.join(', ')}.`
}

// ───────── 상태 이상 (v-B.05) ─────────
/** 내게 걸리는 상태(state.ps). 값은 남은 턴 수(독은 겹 수). 상대 턴이 시작될 때마다 1씩 준다(병만 상대 턴이 끝날 때). */
export const PS_INFO = {
  itemSeal: { label: '아이템 봉인', desc: '아이템을 쓸 수 없다.' },
  thorns: { label: '들러붙음', desc: '일반 공격·부적을 쓸 때마다 체력이 빠진다.' },
  scramble: { label: '홀린 귀', desc: '다음에 고른 행동이 무작위로 바뀐다.' },
  statDown: { label: '서러움', desc: '스탯 하나가 절반.' },
  poison: { label: '독', unit: '겹', desc: '상대가 움직일 때마다 겹 수만큼 피해.' },
  guardTrap: { label: '독안개', desc: '막기를 하면 피해를 입는다.' },
  vulnerable: { label: '병', desc: '받는 피해 +25%, 인내 저항 없음.' },
  costUp: { label: '금빛 울림', desc: '의지력 비용 두 배.' },
  forceRash: { label: '연모', desc: '일반 공격만 할 수 있다.' },
  sleep: { label: '가위눌림', desc: '잠들어 움직이지 못한다. 피해를 받으면 깬다.' },
  confuse: { label: '홀림', desc: '다음 일반 공격·부적이 나를 친다(절반).' },
  healBlock: { label: '돌림병', desc: '모든 회복이 막힌다.' },
  blind: { label: '날개 그늘', desc: '안목이 절반.' },
  burn: { label: '화상', desc: '내 턴이 시작될 때마다 피해. 막기로 끈다.' },
  weaponSeal: { label: '무구 봉인', desc: '무구 효과·특수 강화가 꺼진다.' },
  mpTax: { label: '목마름', desc: '의지력을 쓴 만큼 체력도 깎인다.' },
  fear: { label: '공포', desc: '일반 공격·부적을 할 수 없다.' },
  paralyze: { label: '저림', desc: '매 턴 확률로 행동이 실패한다.' },
  statSwap: { label: '뒤섞임', desc: '스탯 두 개가 맞바뀌었다.' },
  plague: { label: '역병', desc: '라운드 끝마다 피해, 옆 사람에게 옮는다.' },
}
const PS_DATA = { thorns: ['thornsDie'], poison: ['poisonDie'], guardTrap: ['guardTrapDie'], burn: ['burnPct'], statSwap: ['swap'], plague: ['plagueDie'], paralyze: ['paralyzeChance'], statDown: ['downStat'] }
const PS_NOTICK = ['poison', 'sleep']
const PS_END = ['vulnerable']
const dropPs = (ps, k) => {
  delete ps[k]
  for (const d of PS_DATA[k] ?? []) delete ps[d]
}
/** 상대 턴 시작(start)·끝(end)에 내 상태를 1씩 줄인다. fresh: 이번 상대 턴에 새로 걸린 칸(끝에서 세지 않는다). 반환 { ps, events } */
export function tickStatus(ps, when = 'start', fresh = []) {
  if (!ps || !Object.keys(ps).length) return { ps, events: [] }
  const out = { ...ps }
  const events = []
  for (const k of Object.keys(PS_INFO)) {
    if (!(out[k] > 0) || PS_NOTICK.includes(k) || PS_END.includes(k) !== (when === 'end') || fresh.includes(k)) continue
    out[k] -= 1
    if (out[k] <= 0) {
      dropPs(out, k)
      events.push({ kind: 'info', text: `${PS_INFO[k].label}이(가) 풀렸다.` })
    }
  }
  return { ps: out, events }
}
/** 적에게 걸린 상태(state.es)를 센다. start: 쥐 떼 · end: 공격력 오름·거울·냄새·이음 (fresh 는 건너뛴다) */
export function tickEnemyStatus(es, when = 'start', fresh = []) {
  if (!es || !Object.keys(es).length) return { es, events: [] }
  const out = { ...es }
  const events = []
  const down = (k, text) => {
    if (fresh.includes(k)) return
    const v = out[k]
    const n = typeof v === 'object' ? v.rounds : v
    if (!(n > 0)) return
    if (n - 1 <= 0) {
      delete out[k]
      if (k === 'summon') delete out.summonDie
      if (text) events.push({ kind: 'info', text })
    } else out[k] = typeof v === 'object' ? { ...v, rounds: n - 1 } : n - 1
  }
  if (when === 'start') down('summon', '쥐 떼가 흩어졌다.')
  else {
    down('atkUp', '빼앗긴 기운이 흩어졌다.')
    down('statCopy', '거울에 비친 기운이 흐려졌다.')
    down('mark', '묻은 냄새가 옅어졌다.')
    down('link', '이어진 기운이 끊어졌다.')
  }
  return { es: out, events }
}
/** 상태 이상이 반영된 스탯(서러움·날개 그늘·무구 봉인·뒤섞임). 걸린 게 없으면 원래 객체 그대로. */
export function afflictStats(stats, ps) {
  if (!stats || !ps || !(ps.statDown > 0 || ps.blind > 0 || ps.weaponSeal > 0 || ps.statSwap > 0)) return stats
  const out = { ...stats }
  out.fx = ps.weaponSeal > 0 ? null : stats.fx
  out.special = ps.weaponSeal > 0 ? null : stats.special
  if (stats.trinket) Object.defineProperty(out, 'trinket', { value: stats.trinket, enumerable: false }) // v-B.08 장신구 효과는 무구 봉인과 상관없다
  if (ps.statSwap > 0 && Array.isArray(ps.swap)) {
    const [a, b] = ps.swap
    out[a] = stats[b]
    out[b] = stats[a]
  }
  if (ps.statDown > 0) {
    const k = ps.downStat || 'aggression'
    out[k] = Math.floor((out[k] || 0) / 2)
  }
  if (ps.blind > 0) out.insight = Math.max(1, Math.floor((out.insight || 0) / 2))
  return out
}
/** 화면에 붙일 상태 칩: [{ key, label, n, unit, desc }] */
export function statusChips(ps) {
  if (!ps) return []
  return Object.keys(PS_INFO).filter((k) => ps[k] > 0).map((k) => ({ key: k, label: PS_INFO[k].label, n: ps[k], unit: PS_INFO[k].unit ?? '턴', desc: PS_INFO[k].desc }))
}
/** 적에게 걸린 상태 칩 */
export function enemyChips(es) {
  if (!es) return []
  const out = []
  if (es.shield > 0) out.push({ key: 'shield', label: `껍질 ${es.shield}`, desc: '피해를 대신 받는다.' })
  if (es.evade > 0) out.push({ key: 'evade', label: `둔갑 ${es.evade}`, desc: '일반 공격을 피한다.' })
  if (es.reflect > 0) out.push({ key: 'reflect', label: '방패 진형', desc: '다음 공격 피해의 일부가 되돌아온다.' })
  if (typeof es.revive === 'number') out.push({ key: 'revive', label: '뼈 맞추기', desc: '쓰러지면 한 번 다시 일어선다.' })
  if (es.delayed) out.push({ key: 'delayed', label: `발 들어 올림 ${es.delayed.turns}턴`, desc: `${es.delayed.need - (es.delayed.taken || 0)} 더 때리면 넘어진다.` })
  if (es.summon > 0) out.push({ key: 'summon', label: `쥐 떼 ${es.summon}`, desc: '라운드 끝마다 문다.' })
  if (es.field) out.push({ key: 'field', label: '땡볕', desc: `${es.field.need - (es.field.dealt || 0)} 더 때리면 비가 내린다.` })
  if (es.atkBonus > 0) out.push({ key: 'atkBonus', label: `공격력 +${es.atkBonus}`, desc: '쌓인 기세.' })
  if (es.atkUp) out.push({ key: 'atkUp', label: `빼앗은 기운 +${es.atkUp.amt}`, desc: `${es.atkUp.rounds}턴 남음.` })
  if (es.statCopy > 0) out.push({ key: 'statCopy', label: `마왕의 거울 ${es.statCopy}`, desc: '내 가장 강한 스탯을 빌려 쓴다.' })
  if (es.escalate > 0) out.push({ key: 'escalate', label: `아흔아홉째 ×${2 ** es.escalate}`, desc: '다음 영능력 피해 배수.' })
  if (es.smashMult) out.push({ key: 'smashMult', label: `엄니 ×${es.smashMult}`, desc: '다음 강공이 세다.' })
  return out
}
/** 거짓 간파(헛것 보이기): 화면에 보일 행동 목록 */
export const shownQueue = (queue = [], lies) => (Array.isArray(lies) && lies.length ? queue.map((q, i) => lies[i] ?? q) : queue)

/** 상대 영능력의 정확한 효과 목록(스탯 숫자 포함). 팝업·전투 기록·도감이 같이 쓴다. */
export function specialEffects(enemy) {
  const { atk, spirit } = enemy
  const spiritNote = specialSpiritNote(enemy)
  if (enemy.special?.effect) {
    const lines = [effectLine(enemy, enemy.special)]
    if (enemy.special2) lines.push(effectLine(enemy, enemy.special2, true), '영능력을 쓸 때 두 가지 중 하나가 나온다.')
    return [...lines, spiritNote]
  }
  // 개척 요괴(목신·물귀신·어둑시니·앙괭이 등)는 curse: true 로 원한의 저주를 쓴다.
  switch (enemy.curse && enemy.id !== 'wonhon' && enemy.id !== 'mountain-ghost' ? '__curse__' : enemy.id) {
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
    case 'geuseundae':
      return [
        `《${enemy.special.label}》 한 사람: 막을 수 없는 피해 1d${atk} + ${spirit} (${1 + spirit}~${atk + spirit}), 다음 ${PSY_SEAL_ROUNDS}라운드 동안 영능력(효험 포함) 봉인.`,
        `《${enemy.special2.label}》 일행 전원: 막을 수 있는 피해 1d${atk} + ${Math.floor(spirit / 3)} (${1 + Math.floor(spirit / 3)}~${atk + Math.floor(spirit / 3)}, 막기·방어로 줄어든다), 의지력 1d${darkDrainDie(enemy)} 흡수 (남은 의지력이 한도).`,
        '영능력을 쓸 때 두 가지 중 하나가 나온다. 커질수록 공격력(위 피해의 d값)이 오른다.',
        spiritNote,
      ]
    case 'snake':
      return [`막을 수 없는 피해 1d${atk} (1~${atk}).`, '다음 내 턴엔 막기를 할 수 없다.', spiritNote]
    case 'wonhon':
    case 'mountain-ghost':
    case '__curse__':
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
export function rollIntent(prev, rng, party = false, boss = false) {
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
  const enemy = typeof enemyId === 'object' ? enemyId : enemyById(enemyId)
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
/** 석장: 기본 의지력 소모에서 20% 할인(소수점 내림). */
export const mpCostOf = (stats, cost) => (stats.fx === 'staff' ? Math.floor(cost * 0.8) : cost)
/** 인내 수동 피해 저항: (인내 / 2)% 확률로 1d인내 감소. */
export function enduranceMitigation(endurance, damage, rng = Math.random) {
  const e = Math.max(0, Math.floor(endurance || 0))
  if (!e || damage <= 0 || rng() * 100 >= Math.min(100, e / 2)) return { damage: Math.max(0, damage), reduced: 0 }
  const reduced = die(e, rng)
  return { damage: Math.max(0, damage - reduced), reduced: Math.min(damage, reduced) }
}
/** 악기 보정값: 악기를 든 사람의 [이해] 값으로 고정 (더 이상 주사위를 굴리지 않는다). (v71) */
export const auraOf = (stats) => (stats.fx === 'instrument' ? Math.max(0, Math.floor(stats.comprehension || 0)) : 0)
/** 악기를 든 사람 자신에게 적용될 때는 75%만 적용된다. (v71) */
export const auraSelfOf = (stats) => Math.floor(auraOf(stats) * 0.75)
/** 버티기를 쓸 수 있는 최대 횟수 (무당방울이 있으면 2) */
export const maxSurvives = (stats) => (stats.fx === 'bell' ? 2 : 1)

/**
 * 무당방울: 소지자가 유효한 행동을 할 때마다(매 턴) 10% 확률로 1d(이해)만큼 파티원 전원의 체력을 회복시킨다.
 * (v-B.06 너프: 예전에는 (이해)% 확률이었다)
 * 무당방울이 없거나 발동하지 않으면 null. 반환 { chance, roll, heal, label, basis }
 */
export const BELL_CHANCE = 10
export function bellTick(stats, rng = Math.random) {
  if (stats.fx !== 'bell') return null
  const chance = BELL_CHANCE
  if (!(stats.comprehension > 0)) return null // 1d0 은 회복할 게 없다
  const roll = die(100, rng)
  if (roll > chance) return null
  const heal = die(stats.comprehension, rng)
  return { chance, roll, heal, label: '무당방울', basis: `${chance}%` }
}

/** 굴림으로 나온 기본 공격력(base)에 악기 · 단검 · 철퇴가 얹힌다. 반환 { base, notes[] } */
function fxBase(base, stats, ehp, enemyHp, aura, rng) {
  const notes = []
  if (aura > 0) {
    base += aura
    notes.push(`악기 +${aura}`)
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
/** 창: (10 + ⌊호전/2⌋)% 확률로 치명타 — 그 공격이 1.5배 */
function fxCrit(dmg, stats, rng) {
  if (stats.fx !== 'spear' || dmg <= 0) return { dmg, note: '' }
  const chance = 10 + Math.floor(stats.aggression / 2)
  const roll = die(100, rng)
  if (roll <= chance) return { dmg: Math.floor(dmg * 1.5), note: ' 치명타! ×1.5' }
  return { dmg, note: '' }
}
const noteOf = (notes) => (notes.length ? ` (${notes.join(', ')})` : '')

/**
 * 내 턴. ctx = { stats, mp }. 반환: { state, events, mpCost }
 * 이어서 상대 턴(enemyTurn)을 호출해야 한다. 내 행동으로 상대가 쓰러지면 state.over === 'win'.
 */
export function playerTurn(state, action, ctx, rng = Math.random) {
  const stats = afflictStats(ctx.stats, state.ps)
  const mp = Math.floor(ctx.mp)
  // choseTurns: 내가 직접 고른 턴 수(돌발·연모·시간 초과처럼 억지로 움직인 턴은 ctx.forced) — 칠성낙인 판정용 (v-B.06)
  const s = { ...state, guard: false, myTurns: (state.myTurns || 0) + 1, choseTurns: (state.choseTurns || 0) + (ctx.forced ? 0 : 1) }
  const ev = []
  let mpCost = 0
  const act = action
  if (act === 'attack' && stats.special === 'red-wisteria') return { state, events: [{ kind: 'warn', text: '홍싸리나무의 특수 강화로 일반 공격을 직접 선택할 수 없다.' }], mpCost: 0, invalid: true }
  // 효험: 메인 턴에 앞서 켜 둔 토글이 있으면, 일반 공격·부적에서 두 번 굴려 더 나은 쪽을 쓴다. (ctx.buff)
  // 의지력 10을 정확히 다 낼 수 있어야만 발동한다 — 모자라면(있는 만큼만 내고) 발동하는 식이 아니다. (v70)
  const buffFullCost = mpCostOf(stats, BUFF_COST)
  const buffed = !!ctx.buff && (act === 'attack' || act === 'charm') && mp >= buffFullCost
  const buffCost = buffed ? buffFullCost : 0

  // 의지력이 모자라면 그 행동은 할 수 없다. 단 부적만은 모자라도 쓸 수 있다(있는 만큼만 쓰고 터진다) — 다만 1 미만(0)이면 그마저도 쓸 수 없다.
  const needMp = act === 'scan' ? mpCostOf(stats, 1) : act === 'charm' ? 1 : 0
  if (needMp > mp) {
    ev.push({ kind: 'warn', text: `의지력이 모자라 쓸 수 없다! (필요 ${needMp}, 지금 ${mp})` })
    return { state: state, events: ev, mpCost: 0, invalid: true }
  }
  const aura = ctx.aura ?? auraSelfOf(stats)
  const braced = s.queue[0] === 'guard'
  // 활: 내가 직접 들지 않아도, 일행 중 누구 하나라도 활을 들고 있으면(ctx.archerBow) 전원이 효과를 받는다.
  // 효과 1) 모든 공격이 반드시 명중한다. 효과 2) (호전)% 확률로 상대의 방어 태세를 무시한다(절반으로 막히지 않는다).
  const bowActive = stats.fx === 'bow' || !!ctx.archerBow
  const boostMult = typeof ctx.boost === 'number' ? ctx.boost : ctx.boost ? 2 : 1
  const mult = boostMult * atkMult(stats) // 단풍의 공격력 +10%
  const bn = ctx.boost ? ` (×${boostMult})` : ''

  // 로그에는 다이스가 어떻게 굴러갔는지는 빼고 공격력(피해)만 보인다. (v71)
  const strike = (r, label = '공격') => {
    if (r.miss) return `${label}이 빗나갔다!`
    return `${label}!`
  }

  if (act === 'attack') {
    let r, buffNote = ''
    if (buffed) {
      mpCost += buffCost
      const r1 = attackRoll(stats, rng, bowActive)
      const r2 = attackRoll(stats, rng, bowActive)
      r = r1.dmg >= r2.dmg ? r1 : r2
      buffNote = ` (효험: 두 번 굴림 — 첫 번째 ${r1.miss ? '빗나감' : r1.dmg}, 두 번째 ${r2.miss ? '빗나감' : r2.dmg} 중 더 나은 쪽)`
    } else {
      r = attackRoll(stats, rng, bowActive)
    }
    const fb = r.miss ? { base: 0, notes: [] } : fxBase(r.dmg, stats, s.ehp, s.enemy.hp, aura, rng)
    const cr = fxCrit(Math.ceil(fb.base * mult), stats, rng)
    let dmg = cr.dmg
    let note = r.miss ? '' : `${bn}${noteOf(fb.notes)}${cr.note}`
    if (!r.miss && braced) {
      const ignoreChance = bowActive ? Math.max(0, Math.min(100, stats.aggression)) : 0
      const ignoreRoll = ignoreChance > 0 ? die(100, rng) : 101
      if (ignoreChance > 0 && ignoreRoll <= ignoreChance) {
        note += ` (활이 방어 태세를 무시했다! 호전 ${ignoreChance}%, d100 = ${ignoreRoll})`
      } else {
        dmg = Math.ceil(dmg / 2)
        note += ' (방어에 절반으로 막힘)'
      }
    }
    s.ehp = Math.max(0, s.ehp - dmg)
    ev.push({ kind: 'player', roll: r.hit, dmg, text: `${buffed ? '효험! ' : ''}${strike(r)}${r.miss ? '' : ` ${dmg} 피해${note}`}${buffNote}` })
    if (!r.miss && stats.special === 'black-wisteria') {
      while (s.queue.length < s.known + 3) s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!s.enemy.boss))
      s.known = Math.min(s.queue.length - 1, s.known + 2)
      ev.push({ kind: 'info', text: '흑등나무의 효과! 상대의 행동을 추가로 2턴 더 확인한다.' })
    }
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
      const cr = fxCrit(Math.ceil(fb.base * 2 * mult), stats, rng)
      const dmg = cr.dmg
      s.ehp = Math.max(0, s.ehp - dmg)
      ev.push({ kind: 'player', roll: r.hit, dmg, text: `${buffed ? '효험! ' : ''}부적이 터졌다!${bn} ${dmg} 피해${noteOf(fb.notes)}${cr.note} (의지력 -${mpCost}, 남은 부적 ${s.charms}장)${buffNote}` })
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

/** 거짓 간파에 보일 가짜 행동 */
const FAKE_INTENTS = ['jab', 'smash', 'guard', 'charge', 'special']
function fakeIntent(real, rng) {
  const opts = FAKE_INTENTS.filter((x) => x !== real)
  return opts[Math.floor(rng() * opts.length)]
}
/** 이번 상대 턴에 새로 걸리거나 바뀐 칸(끝에서 세지 않는다) */
const freshKeys = (before, after) => Object.keys(after || {}).filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after[k]))

/**
 * 상대 턴. ctx = { stats, mp }. 반환: { state, events, mpDrain }
 * 체력이 0 이 되면 의지력이 2 이상일 때 state.pendingDeath(버티기를 묻는다), 아니면 바로 패배.
 * 다인 전투(state.party)는 mbattle 이 한 사람씩 부른다 — 상태 세기·라운드 끝 피해는 mbattle 이 맡는다.
 * 다인 전용 ctx: firstTarget · partyN(인원) · dmgScale(차례로 줄어드는 피해) · ffRaw/ffFrom(싸움 붙이기) · releaseShare · partyNote
 */
export function enemyTurn(state, ctx, rng = Math.random) {
  const stats = afflictStats(ctx.stats, state.ps)
  const mp = Math.floor(ctx.mp)
  const aura = ctx.aura ?? auraSelfOf(stats) // 악기: 반격에도 똑같이 붙는다
  const s = { ...state, queue: [...state.queue], ps: { ...(state.ps || {}) }, es: { ...(state.es || {}) } }
  const ev = []
  let mpDrain = 0
  let curseCast = false // 이번 턴에 데이터형 영능력으로 저주를 걸었다(이번 턴엔 저주 피해가 들어가지 않는다)
  let sealed = false // 이번 턴에 영능력 봉인을 새로 걸었다(단독 전투에서 봉인 턴을 셀 때 쓴다)
  let chargeNow = false // 데이터형 영능력의 '곧바로 기 모으기'
  let liesN = 0 // 헛것 보이기: 앞으로 몇 번의 행동을 거짓으로 보일까
  let extra = false // 외발 뛰기: 곧바로 한 번 더
  const solo = !s.party
  // 단독: 상대 턴이 시작될 때 상태를 센다 (다인은 mbattle 이 라운드마다 센다)
  if (solo) {
    const t = tickStatus(s.ps, 'start')
    s.ps = t.ps
    ev.push(...t.events)
    const te = tickEnemyStatus(s.es, 'start')
    s.es = te.es
    ev.push(...te.events)
  }
  const psSnap = { ...s.ps }
  const esSnap = { ...s.es }
  // 쌓인 기세·빼앗은 기운·마왕의 거울이 공격력에 얹힌다 (원래 적 데이터는 그대로 둔다)
  const base = s.enemy
  const atkNow = base.atk + (s.es.atkBonus || 0) + (s.es.atkUp ? s.es.atkUp.amt : 0) + (s.es.statCopy > 0 ? Math.floor(Math.max(...STAT6.map((k) => Number(ctx.stats?.[k]) || 0)) / 2) : 0)
  const enemy = atkNow !== base.atk ? { ...base, atk: atkNow } : base
  let intent0 = s.queue[0]
  if (intent0 === 'special' && stats.special === 'willow' && !ctx.willowHandled && die(100, rng) <= Math.floor(stats.comprehension / 2)) {
    const old = intent0
    intent0 = rollIntent(s.queue[0], rng, s.party, !!s.enemy.boss)
    s.queue[0] = intent0
    ev.push({ kind: 'warn', text: `버드나무의 효과! 적의 영능력 행동이 재굴림되었다. (${old} → ${intent0})` })
  }
  let intent = intent0 === 'group' ? 'jab' : intent0
  if (intent === 'special' && stats.special === 'orchid' && !s.specialSeen) {
    s.specialSeen = true
    intent = 'none'
    s.queue[0] = 'none'
    ev.push({ kind: 'warn', text: '난초의 효과! 처음 목격한 영능력을 무효화했다.' })
  } // 단체 공격은 다인 전투에서 일행 한 명씩 약공으로 풀어낸다
  const wake = (dmg) => {
    if (dmg > 0 && s.ps.sleep && s.pstun > 0) {
      s.pstun = 0
      delete s.ps.sleep
      ev.push({ kind: 'warn', text: '아픔에 번쩍 정신이 들었다! 가위눌림에서 깨어났다.' })
    }
  }
  const hurt = (raw, label, { blockable = true, kind } = {}) => {
    // 내려쬐는 빛: 사용한 직후 들어오는 공격은 무조건 '막기'한 것으로 취급한다(1회 소모). (v71)
    if (s.fallingLight) {
      s.fallingLight = false
      s.guard = true
    }
    // 부채: 적의 모든 공격 명중률이 (10 + 1d이해)% 만큼 줄어든다 — 막기 여부와 상관없이 아예 빗나간다.
    if (stats.fx === 'fan') {
      const chance = 10 + die(stats.comprehension, rng)
      const roll = die(100, rng)
      if (roll <= chance) {
        ev.push({ kind: 'enemy', dmg: 0, text: `${label}이 부채 바람에 휩쓸려 빗나갔다!` })
        return
      }
    }
    let dmg = stats.fx === 'mace' ? Math.ceil(raw * 1.5) : raw // 철퇴: 받는 피해 ×1.5
    if (stats.special === 'paulownia') dmg = Math.max(0, dmg - Math.ceil(dmg * 0.1))
    // 병 옮기기(v-B.05): 받는 피해 +25%, 인내 저항이 발동하지 않는다.
    const sick = (s.ps.vulnerable || 0) > 0
    if (sick) dmg = Math.ceil(dmg * 1.25)
    const resisted = sick ? { damage: dmg, reduced: 0 } : enduranceMitigation(stats.endurance, dmg, rng)
    dmg = resisted.damage
    if (resisted.reduced) ev.push({ kind: 'warn', text: `인내로 피해 ${resisted.reduced} 감소!` })
    // 칼: 막기 성공 여부와 상관없이, 공격 대상이 될 때마다(실제로 공격이 들어올 때마다) 반격한다. (v70)
    // 완전 방어(최대 굴림)나 호전이 더 높은 경우 등 기존 반격-강화 조건을 함께 만족하면 1d호전×3으로 올라간다. (v71)
    const sword = stats.fx === 'sword'
    const swordCounterOf = (mult) => {
      const se = die(stats.aggression, rng)
      let counter = se * mult * (stats.special === 'red-wisteria' ? 2 : 1)
      let auraNote = ''
      if (aura > 0) {
        counter += aura
        auraNote = ` (악기 +${aura})`
      }
      s.ehp = Math.max(0, s.ehp - counter)
      return { counter, auraNote }
    }
    let countered = false
    if (blockable && s.guard) {
      const reduced = Math.ceil(dmg / (kind === 'smash' ? 3 : 2))
      const extraD = die(stats.aggression, rng)
      dmg = Math.max(0, reduced - extraD)
      const strong = stats.aggression > enemy.atk
      const crit = extraD === stats.aggression
      if (sword) {
        const upgraded = strong || crit
        const { counter, auraNote } = swordCounterOf(upgraded ? 3 : 2)
        countered = true
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다! ${dmg} 피해만 받고, 칼의 반격 ${counter} 피해!${upgraded ? ' (최대 굴림)' : ''}${auraNote}` })
      } else if (strong || crit) {
        let counter = extraD * 2 * (stats.special === 'red-wisteria' ? 2 : 1)
        let auraNote = ''
        if (aura > 0) {
          counter += aura
          auraNote = ` (악기 +${aura})`
        }
        s.ehp = Math.max(0, s.ehp - counter)
        countered = true
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다! ${dmg} 피해만 받고, 반격 ${counter} 피해! (최대 굴림)${auraNote}` })
      } else {
        ev.push({ kind: 'enemy', dmg, text: `${label}을 막았다. ${dmg} 피해만 받았다.` })
      }
      if (kind === 'smash' && stats.special === 'gwangsan' && countered) {
        let changed = 0
        for (let i = 1; i < Math.min(s.queue.length, 6); i++) if (s.queue[i] === 'guard') { s.queue[i] = 'none'; changed++ }
        ev.push({ kind: 'warn', text: `공산의 효과! 적의 이후 5턴 방어 태세 ${changed}개가 행동 없음으로 바뀌었다.` })
      }
    } else if (sword) {
      const { counter, auraNote } = swordCounterOf(2)
      ev.push({ kind: 'enemy', dmg, text: `${label}! ${dmg} 피해를 입었다. (칼의 반격 ${counter} 피해${auraNote})` })
    } else {
      ev.push({ kind: 'enemy', dmg, text: `${label}! ${dmg} 피해를 입었다.` })
    }
    // 지신밟기: 받는 피해를 줄인다. (v-B.04: 예전엔 체력이 0으로 잘린 '뒤'에 깎인 양의 일부를 되돌려 줘서, 어떤 큰 피해에도 쓰러지지 않는 문제가 있었다)
    if (ctx.reduction > 0 && dmg > 0) dmg -= Math.floor(dmg * Math.min(1, ctx.reduction))
    if (s.php - dmg <= 0 && stats.special === 'chrysanthemum' && !s.specialSaved) {
      s.specialSaved = true
      ev.push({ kind: 'warn', text: '국화의 효과! 전투당 최초로 전투불능이 될 피해를 무효화했다.' })
      return
    }
    s.php -= dmg
    wake(dmg)
  }
  /** 상태 이상이 주는 피해(독·쥐 떼·땡볕·역병): 막을 수 없고 인내도 듣지 않는다. 병·지신밟기는 반영. */
  const tickHurt = (raw, text) => {
    let d = Math.max(0, Math.floor(raw))
    if ((s.ps.vulnerable || 0) > 0) d = Math.ceil(d * 1.25)
    if (ctx.reduction > 0 && d > 0) d -= Math.floor(d * Math.min(1, ctx.reduction))
    s.php -= d
    ev.push({ kind: 'enemy', dmg: d, text: `${text} ${d} 피해!` })
    wake(d)
  }

  // 로그에는 다이스가 어떻게 굴러갔는지는 빼고, 적이 얼마를 때렸는지(피해)만 보인다. 영력 소모·잔여는 그대로 보여 준다. (v71)
  /** 영능력이 아닌 행동 하나 (외발 뛰기의 '한 번 더'도 이걸 쓴다) */
  const basic = (it) => {
    if (it === 'none') {
      ev.push({ kind: 'enemy', text: `${enemy.name}의 행동이 무효화되어 아무 일도 일어나지 않았다.` })
    } else if (it === 'jab') {
      const r = die(enemy.spirit, rng)
      if (r === 1) {
        ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `${enemy.name}의 약공이 빗나갔다!` })
      } else {
        const a = die(enemy.atk, rng)
        hurt(a + r, `${enemy.name}의 약공`, { kind: 'jab' })
      }
    } else if (it === 'smash') {
      const mult = s.es.smashMult || 2 // 엄니 갈기(v-B.05): 그다음 강공이 더 세다
      delete s.es.smashMult
      const r = d10(rng)
      if (r <= 2) {
        ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `${enemy.name}의 강공이 빗나갔다!` })
      } else {
        const a = die(enemy.atk, rng)
        hurt(a * mult + enemy.spirit, `${enemy.name}의 강공${mult > 2 ? ` (×${mult})` : ''}`, { kind: 'smash' })
      }
    } else if (it === 'charge') {
      ev.push({ kind: 'enemy', text: `${enemy.name}이(가) 기를 모은다… 다음 턴엔 강공이 온다!` })
    } else if (it === 'guard') {
      ev.push({ kind: 'enemy', text: `${enemy.name}이(가) 몸을 웅크려 방어했다.` })
    }
  }

  // 대인의 발 들어 올리기(v-B.05): 세 턴 뒤 짓밟는다.
  if (solo && s.es.delayed) {
    const d = { ...s.es.delayed, turns: s.es.delayed.turns - 1 }
    if (d.turns <= 0) {
      delete s.es.delayed
      ev.push({ kind: 'warn', text: `${enemy.name}이(가) 들어 올렸던 발을 내리찍는다!` })
      hurt(die(enemy.atk, rng) * d.mult + d.add, `${enemy.name}의 짓밟기`, { kind: 'jab' })
    } else {
      s.es.delayed = d
      ev.push({ kind: 'warn', text: `${enemy.name}이(가) 발을 든 채 버틴다… (${d.turns}턴 뒤 짓밟기, ${Math.max(0, d.need - (d.taken || 0))} 더 때리면 넘어진다)` })
    }
  }

  if (intent === 'none' || intent === 'jab' || intent === 'smash' || intent === 'charge' || intent === 'guard') {
    basic(intent)
  } else if (intent === 'special' && !ctx.noSpiritGate && (s.espirit ?? enemy.spirit) <= 0) {
    // 영력을 모두 소모해 영능력을 쓸 수 없다 — 약공으로 대신한다.
    const r = die(enemy.spirit, rng)
    if (r === 1) {
      ev.push({ kind: 'enemy', roll: r, dmg: 0, text: `${enemy.name}은(는) 영력이 다해 영능력을 쓰지 못한다! 대신 약공을 노리지만 빗나갔다.` })
    } else {
      const a = die(enemy.atk, rng)
      ev.push({ kind: 'enemy', roll: r, text: `${enemy.name}은(는) 영력이 다해 영능력을 쓰지 못한다! 대신 약공으로.` })
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
        hurt(a + add, `${enemy.name}의 불길 내뿜기`, { blockable: false })
        spEv.result = `${a + add} 피해 (막기 불가), 다음 내 턴 막기 불가`
        s.bound = true
        ev.push({ kind: 'warn', text: '불길에 휩싸였다! 다음 내 턴엔 막기를 할 수 없다.' })
      } else {
        const a = die(enemy.atk, rng)
        hurt(a + enemy.spirit, `${enemy.name}의 쇠 갉아먹기`, { blockable: false })
        const rr = die(enemy.spirit, rng)
        mpDrain = Math.min(mp, rr * 2)
        spEv.result = `${a + enemy.spirit} 피해 (막기 불가), 의지력 ${mpDrain} 흡수`
        ev.push({ kind: 'warn', text: `의지력이 ${mpDrain} 빨려 나갔다!` })
      }
    } else if (enemy.id === 'geuseundae') {
      if (sp2) {
        // 어둠 드리우기: 막을 수 있는 피해(약공처럼 막기로 줄어든다) + 의지력을 더 많이 흡수.
        const a = die(enemy.atk, rng)
        const add = Math.floor(enemy.spirit / 3)
        hurt(a + add, `${enemy.name}의 어둠 드리우기`, { kind: 'jab' })
        const rr = die(darkDrainDie(enemy), rng)
        mpDrain = Math.min(mp, rr)
        spEv.result = `${a + add} 피해 (막을 수 있음), 의지력 ${mpDrain} 흡수`
        ev.push({ kind: 'warn', text: `그림자에 덮였다! 의지력이 ${mpDrain} 빨려 나갔다.` })
      } else {
        // 내리누르기: 막을 수 없는 피해 + 다음 3라운드 동안 영능력 봉인.
        const a = die(enemy.atk, rng)
        hurt(a + enemy.spirit, `${enemy.name}의 내리누르기`, { blockable: false })
        spEv.result = `${a + enemy.spirit} 피해 (막기 불가), ${PSY_SEAL_ROUNDS}라운드 동안 영능력 봉인`
        s.psySeal = PSY_SEAL_ROUNDS
        sealed = true
        ev.push({ kind: 'warn', text: `거대한 손에 짓눌렸다! 다음 ${PSY_SEAL_ROUNDS}라운드 동안 영능력을 쓸 수 없다.` })
      }
    } else if (enemy.id === 'scarecrow') {
      const rr = die(enemy.spirit, rng)
      mpDrain = Math.min(mp, rr * 2)
      spEv.result = `의지력 ${mpDrain} 흡수`
      ev.push({ kind: 'enemy', text: `${enemy.name}의 혼 빨기! 의지력이 ${mpDrain} 빨려 나갔다.` })
    } else if (enemy.id === 'foxfire') {
      const a = die(enemy.atk, rng)
      hurt(a + enemy.spirit, `${enemy.name}의 불똥 흩뿌리기`, { blockable: false })
      spEv.result = `${a + enemy.spirit} 피해 (막기 불가)`
    } else if (enemy.id === 'dueoksini') {
      const a = die(enemy.atk, rng)
      hurt(a * 2, `${enemy.name}의 짓누르는 그림자`, { blockable: false })
      const rr = die(enemy.spirit, rng)
      mpDrain = Math.min(mp, rr)
      spEv.result = `${a * 2} 피해 (막기 불가), 의지력 ${mpDrain} 흡수, 다음 내 턴 막기 불가`
      s.bound = true
      ev.push({ kind: 'warn', text: `의지력이 ${mpDrain} 빨려 나갔다! 몸이 짓눌려 다음 내 턴엔 막기를 할 수 없다.` })
    } else if (enemy.id === 'snake') {
      const a = die(enemy.atk, rng)
      hurt(a, `${enemy.name}의 휘감기`, { blockable: false })
      spEv.result = `${a} 피해 (막기 불가), 다음 내 턴 막기 불가`
      s.bound = true
      ev.push({ kind: 'warn', text: '몸이 휘감겼다! 다음 내 턴엔 막기를 할 수 없다.' })
    } else if (spDef.effect) {
      // 데이터형 영능력: 적 id 분기 없이 effect 칸을 그대로 해석한다. (v-B.04 · v-B.05)
      const eff = spDef.effect
      const parts = []
      const first = ctx.firstTarget !== false // 다인 단체 영능력: 적 자신에게 걸리는 효과는 첫 대상에서 한 번만
      const X = (v) => effectExpr(v, enemy, s)
      const label = `${enemy.name}의 ${spDef.label}`
      const unb = { blockable: false }
      const blk = { kind: 'jab' }
      const hitOnce = (raw, opt, lbl = label) => {
        const p0 = s.php
        hurt(Math.max(0, Math.floor(raw)), lbl, opt)
        return Math.max(0, p0 - s.php)
      }
      const warn = (text) => ev.push({ kind: 'warn', text })
      let total = 0
      if (eff.dmg) {
        const hits = Math.max(1, Math.floor(eff.dmg.hits || 1))
        const mult = Math.max(1, eff.dmg.mult || 1)
        const add = X(eff.dmg.add)
        const esc = eff.escalate ? eff.escalate ** (s.es.escalate || 0) : 1
        const scale = ctx.dmgScale ?? 1
        let doubled = false
        for (let h = 0; h < hits; h++) {
          let raw = die(enemy.atk, rng) * mult + add
          if (eff.execute && s.php <= s.phpMax / 2) {
            raw *= 2
            doubled = true
          }
          raw = Math.floor(raw * esc * scale)
          total += hitOnce(raw, eff.blockable ? blk : unb, `${label}${hits > 1 ? ` (${h + 1}/${hits})` : ''}`)
          if (s.php <= 0) break
        }
        parts.push(`${total} 피해${eff.blockable ? '' : ' (막기 불가)'}${hits > 1 ? ` · ${hits}번` : ''}${doubled ? ' · 약해진 틈을 노려 2배' : ''}${esc > 1 ? ` · ×${esc}` : ''}${scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}`)
        if (eff.escalate && first) {
          s.es.escalate = (s.es.escalate || 0) + 1
          warn(`${enemy.name}의 허기가 커진다… 다음엔 피해가 ${eff.escalate ** s.es.escalate}배다.`)
        }
      }
      if (eff.pctCurrent) {
        const d = Math.max(1, Math.floor(s.php / eff.pctCurrent))
        s.php -= d
        total += d
        ev.push({ kind: 'enemy', dmg: d, text: `${label}! 번쩍 들려 메쳐졌다. ${d} 피해를 입었다. (막기·인내 무시)` })
        parts.push(`${d} 피해 (지금 체력의 1/${eff.pctCurrent})`)
        wake(d)
      }
      if (eff.splitDamage) {
        const n = Math.max(1, ctx.partyN || 1)
        const d = hitOnce((enemy.atk * eff.splitDamage) / n, blk)
        total += d
        parts.push(`${d} 피해 (공격력×${eff.splitDamage}를 ${n}명이 나눠 맞음)`)
      }
      if (eff.mpBurn) {
        const burned = Math.floor(Math.max(0, mp - mpDrain) * eff.mpBurn)
        mpDrain += burned
        if (burned > 0) {
          warn(`마른 바람이 의지력 ${burned}을(를) 태워 버렸다!`)
          const d = hitOnce(burned, unb)
          total += d
          parts.push(`의지력 ${burned} 태움 → ${d} 피해`)
        } else parts.push('태울 의지력이 없었다')
      }
      if (eff.sacrifice) {
        const c = Math.ceil(enemy.hp * eff.sacrifice.pct)
        if (first) s.ehp = Math.max(1, s.ehp - c)
        warn(`${enemy.name}이(가) 머리 하나를 떼어 던진다! (자기 체력 -${c})`)
        const d = hitOnce(c * eff.sacrifice.mult, unb)
        total += d
        parts.push(`자기 체력 ${c}을 깎아 ${d} 피해`)
      }
      if (eff.friendlyFire) {
        if (ctx.ffRaw != null) {
          const d = hitOnce(ctx.ffRaw, unb, `${ctx.ffFrom ?? '일행'}의 홀린 공격`)
          total += d
          parts.push(`${ctx.ffFrom ?? '일행'}에게 ${d} 피해`)
        } else {
          const d = hitOnce(Math.floor(attackRoll(stats, rng).dmg / 2), unb, '홀린 손의 공격')
          total += d
          parts.push(`싸울 상대가 없어 제 몸을 쳐 ${d} 피해`)
        }
      }
      if (eff.release) {
        const pool = (s.es.takenNow || 0) + (s.es.takenLog || []).slice(-(Math.max(1, eff.release.rounds) - 1)).reduce((a, b) => a + b, 0)
        const share = ctx.releaseShare ?? Math.ceil(pool * eff.release.pct)
        const d = share > 0 ? hitOnce(share, unb) : 0
        total += d
        parts.push(share > 0 ? `감아 둔 원한 ${share} → ${d} 피해` : '감아 둔 원한이 없었다')
      }
      if (eff.lifesteal && total > 0) {
        const before = s.ehp
        s.ehp = Math.min(enemy.hp, s.ehp + Math.floor(total * eff.lifesteal))
        if (s.ehp > before) {
          parts.push(`체력 ${s.ehp - before} 흡수`)
          ev.push({ kind: 'warn', text: `${enemy.name}이(가) 빼앗은 기운으로 체력 ${s.ehp - before}을 되찾았다.` })
        }
      }
      if (eff.drain) {
        const rr = die(Math.max(1, X(eff.drain.die ?? 'spirit')), rng) * Math.max(1, eff.drain.mult || 1)
        const took = Math.max(0, Math.min(mp - mpDrain, rr))
        mpDrain += took
        parts.push(`의지력 ${took} 흡수`)
        warn(`의지력이 ${took} 빨려 나갔다!`)
      }
      if (eff.bind) {
        s.bound = true
        parts.push('다음 내 턴 막기 불가')
        warn('몸이 묶였다! 다음 내 턴엔 막기를 할 수 없다.')
      }
      if (eff.curse) {
        s.curse = Math.max(s.curse || 0, eff.curse)
        curseCast = true
        parts.push(`저주 ${eff.curse}턴`)
        ev.push({ kind: 'enemy', text: `${enemy.name}의 ${spDef.label}! 앞으로 ${eff.curse}번의 상대 턴 동안 피해가 스며든다.` })
      }
      if (eff.seal) {
        s.psySeal = Math.max(s.psySeal || 0, eff.seal)
        sealed = true
        parts.push(`영능력 봉인 ${eff.seal}${s.party ? '라운드' : '턴'}`)
        warn(`기운이 묶였다! 다음 ${eff.seal}${s.party ? '라운드' : '턴'} 동안 영능력(효험 포함)을 쓸 수 없다.`)
      }
      if (eff.stun) {
        s.pstun = Math.max(s.pstun || 0, eff.stun)
        parts.push(`행동불능 ${eff.stun}턴`)
        warn(`몸이 굳었다! ${eff.stun}턴 동안 움직일 수 없다.`)
      }
      if (eff.heal && first) {
        const before = s.ehp
        s.ehp = Math.min(enemy.hp, s.ehp + Math.ceil(enemy.hp * eff.heal))
        parts.push(`체력 ${s.ehp - before} 회복`)
        if (s.ehp > before) warn(`${enemy.name}이(가) 체력을 ${s.ehp - before} 되찾았다.`)
      }
      if (eff.charge) {
        if (s.queue.length > 1) s.queue[1] = 'smash'
        chargeNow = true
        parts.push('다음 행동 강공')
        warn(`${enemy.name}이(가) 곧바로 기를 끌어모은다… 다음엔 강공이 온다!`)
      }
      // ── v-B.05 새 칸 ──
      if (eff.wipeIntel) {
        s.queue = s.queue.slice(0, 6)
        for (let i = 1; i <= 5; i++) s.queue[i] = rollIntent(s.queue[i - 1], rng, s.party, !!enemy.boss)
        s.known = 0
        s.lies = null
        parts.push('간파해 둔 앞날을 지움')
        warn('빗자루가 앞날을 싹 쓸어 갔다! 간파해 둔 행동이 모두 지워지고 새로 굴러간다.')
      }
      if (eff.itemSeal) {
        s.ps.itemSeal = Math.max(s.ps.itemSeal || 0, eff.itemSeal)
        parts.push(`아이템 봉인 ${eff.itemSeal}턴`)
        warn(`신과 함께 주머니를 채 갔다! ${eff.itemSeal}턴 동안 아이템을 쓸 수 없다.`)
      }
      if (eff.summon && first) {
        s.es.summon = eff.summon.rounds
        s.es.summonDie = Math.max(1, X(eff.summon.die))
        parts.push(`쥐 떼 ${eff.summon.rounds}라운드`)
        warn(`찍찍찍… 쥐 떼가 몰려든다! ${eff.summon.rounds}라운드 동안 라운드가 끝날 때마다 문다.`)
      }
      if (eff.thorns) {
        s.ps.thorns = eff.thorns.turns
        s.ps.thornsDie = Math.max(1, X(eff.thorns.die))
        parts.push(`들러붙음 ${eff.thorns.turns}턴`)
        warn(`서러운 한이 들러붙었다! ${eff.thorns.turns}턴 동안 공격·부적을 쓸 때마다 체력이 빠진다.`)
      }
      if (eff.extraAction && first) {
        extra = true
        parts.push('곧바로 한 번 더')
      }
      if (eff.swapAllyHp) parts.push(ctx.partyNote ?? '혼자라 뒤바꿀 넋이 없었다')
      if (eff.scramble) {
        s.ps.scramble = eff.scramble
        parts.push('다음 행동이 뒤섞임')
        warn('익숙한 목소리가 귓가에 맴돈다… 다음 턴에 고른 행동이 멋대로 바뀐다.')
      }
      if (eff.mark) parts.push(ctx.partyNote ?? '혼자라 냄새를 묻힐 까닭이 없었다')
      if (eff.link) parts.push(ctx.partyNote ?? '이을 짝이 없었다')
      if (eff.falseIntel) {
        liesN = eff.falseIntel
        parts.push(`앞으로 ${eff.falseIntel}번의 행동이 거짓으로 보임`)
        warn('눈앞이 아른거린다… 앞으로 보이는 상대의 행동 몇 개는 헛것이다.')
      }
      if (eff.statDown) {
        s.ps.statDown = eff.statDown.turns
        s.ps.downStat = eff.statDown.stat
        parts.push(`${STAT_KO[eff.statDown.stat] ?? eff.statDown.stat} 절반 ${eff.statDown.turns}턴`)
        warn(`서러운 울음에 기운이 빠진다… ${eff.statDown.turns}턴 동안 ${STAT_KO[eff.statDown.stat] ?? eff.statDown.stat} 수치가 절반.`)
      }
      if (eff.poison) {
        s.ps.poison = (s.ps.poison || 0) + 1
        s.ps.poisonDie = Math.max(1, X(eff.poison.die))
        parts.push(`독 ${s.ps.poison}겹`)
        warn(`독니에 물렸다! 독이 ${s.ps.poison}겹 쌓였다. (전투 끝까지 남는다)`)
      }
      if (eff.guardTrap) {
        s.ps.guardTrap = eff.guardTrap.turns
        s.ps.guardTrapDie = Math.max(1, X(eff.guardTrap.die))
        parts.push(`독안개 ${eff.guardTrap.turns}턴`)
        warn(`독안개가 깔렸다! ${eff.guardTrap.turns}턴 동안 막기를 하면 독을 들이마신다.`)
      }
      if (eff.maxHpCut) {
        const cut = Math.max(1, Math.floor(s.phpMax * eff.maxHpCut))
        s.phpMax = Math.max(1, s.phpMax - cut)
        s.php = Math.min(s.php, s.phpMax)
        parts.push(`최대 체력 -${cut}`)
        warn(`할퀸 상처가 깊다! 이번 전투 동안 최대 체력이 ${cut} 줄었다. (최대 ${s.phpMax})`)
      }
      if (eff.vulnerable) {
        s.ps.vulnerable = eff.vulnerable
        parts.push(`병 ${eff.vulnerable}턴`)
        warn(`병이 옮았다! ${eff.vulnerable}턴 동안 받는 피해가 25% 늘고 인내로 버티지 못한다.`)
      }
      if (eff.chargeMult) {
        if (s.queue.length > 1) s.queue[1] = 'smash'
        s.es.smashMult = eff.chargeMult
        chargeNow = true
        parts.push(`다음 행동 강공 ×${eff.chargeMult}`)
        warn(`${enemy.name}이(가) 엄니를 간다… 다음 강공은 ${eff.chargeMult}배다!`)
      }
      if (eff.costUp) {
        s.ps.costUp = eff.costUp
        parts.push(`의지력 비용 두 배 ${eff.costUp}${s.party ? '라운드' : '턴'}`)
        warn(`금빛 울림이 귀를 때린다! ${eff.costUp}${s.party ? '라운드' : '턴'} 동안 의지력이 두 배로 든다.`)
      }
      if (eff.evade) {
        s.es.evade = eff.evade
        parts.push(`둔갑 ${eff.evade}번`)
        warn(`${enemy.name}이(가) 여우로 둔갑했다! 다음 일반 공격 ${eff.evade}번을 피한다.`)
      }
      if (eff.forceRash) {
        s.ps.forceRash = eff.forceRash
        parts.push(`연모 ${eff.forceRash}턴`)
        warn(`연모의 불길이 옮겨붙었다! ${eff.forceRash}턴 동안 일반 공격밖에 할 수 없다.`)
      }
      if (eff.sleep) {
        s.pstun = Math.max(s.pstun || 0, eff.sleep)
        s.ps.sleep = 1
        parts.push(`잠 ${eff.sleep}턴`)
        warn(`가위에 눌려 잠이 들었다… 최대 ${eff.sleep}턴 동안 움직일 수 없다. (피해를 받으면 깬다)`)
      }
      if (eff.surviveSteal) {
        if ((s.survived | 0) < maxSurvives(stats)) {
          s.survived = (s.survived | 0) + 1
          parts.push('버티기 1회 빼앗김')
          warn('명부의 쇠사슬이 넋을 옭아맨다! 이번 전투에서 버틸 기회를 하나 빼앗겼다.')
        } else parts.push('빼앗을 버티기가 없었다')
      }
      if (eff.buffSteal) {
        const star = s.starBonus || 0
        const hadFire = (s.fire || 0) > 0
        s.starBonus = 0
        s.fire = 0
        s.fireBuffed = false
        if (star > 0) s.es.atkUp = { amt: Math.max(star, s.es.atkUp?.amt || 0), rounds: eff.buffSteal.rounds }
        parts.push(star || hadFire ? [star ? `칠성낙인 +${star} 빼앗음` : '', hadFire ? '도깨비불 꺼짐' : ''].filter(Boolean).join(', ') : '빼앗을 기운이 없었다')
        if (star || hadFire) warn(`여우구슬이 기운을 빨아들인다!${star ? ` 칠성낙인의 힘(+${star})이 ${enemy.name}에게 넘어갔다.` : ''}${hadFire ? ' 모으던 도깨비불이 꺼졌다.' : ''}`)
      }
      if (eff.confuse) {
        s.ps.confuse = eff.confuse
        parts.push('홀림')
        warn('누이의 얼굴에 홀렸다… 다음 일반 공격·부적이 나를 향한다.')
      }
      if (eff.rewind && first) {
        const hist = s.es.ehpHist || []
        const target = hist.length >= eff.rewind.turns ? hist[hist.length - eff.rewind.turns] : hist[0] ?? s.ehp
        const gain = Math.max(0, Math.min(Math.ceil(enemy.hp * eff.rewind.cap), target - s.ehp))
        s.ehp = Math.min(enemy.hp, s.ehp + gain)
        parts.push(gain > 0 ? `체력 ${gain} 되돌림` : '되돌릴 상처가 없었다')
        if (gain > 0) warn(`경을 거꾸로 외자 상처가 거꾸로 아문다! ${enemy.name}의 체력 +${gain}.`)
      }
      if (eff.revive && first) {
        if (s.es.revive == null) {
          s.es.revive = eff.revive
          parts.push('쓰러지면 한 번 다시 일어선다')
          warn(`${enemy.name}이(가) 뼈마디를 맞춰 둔다… 쓰러져도 한 번은 다시 일어선다.`)
        } else {
          const d = hitOnce(die(enemy.atk, rng) + Math.floor(enemy.spirit / 3), unb, `${enemy.name}의 뼈 부딪기`)
          total += d
          parts.push(`이미 뼈를 맞춰 두어 대신 ${d} 피해`)
        }
      }
      if (eff.plague) {
        s.ps.plague = Math.max(s.ps.plague || 0, eff.plague.rounds)
        s.ps.plagueDie = Math.max(1, X(eff.plague.die))
        parts.push(`역병 ${eff.plague.rounds}라운드`)
        warn(`역병이 옮았다! ${eff.plague.rounds}라운드 동안 라운드가 끝날 때마다 몸이 상한다.`)
      }
      if (eff.healBlock) {
        s.ps.healBlock = eff.healBlock
        parts.push(`회복 봉쇄 ${eff.healBlock}${s.party ? '라운드' : '턴'}`)
        warn(`돌림병이 돈다! ${eff.healBlock}${s.party ? '라운드' : '턴'} 동안 어떤 회복도 듣지 않는다.`)
      }
      if (eff.blind) {
        s.ps.blind = eff.blind
        parts.push(`안목 절반 ${eff.blind}턴`)
        warn(`날개가 하늘을 덮었다! ${eff.blind}턴 동안 앞이 잘 보이지 않는다.`)
      }
      if (eff.burn) {
        s.ps.burn = eff.burn.turns
        s.ps.burnPct = eff.burn.pct
        parts.push(`화상 ${eff.burn.turns}턴`)
        warn(`불길이 옮겨붙었다! ${eff.burn.turns}턴 동안 내 턴마다 화상을 입는다. (막기로 끈다)`)
      }
      if (eff.weaponSeal) {
        s.ps.weaponSeal = eff.weaponSeal
        parts.push(`무구 봉인 ${eff.weaponSeal}${s.party ? '라운드' : '턴'}`)
        warn(`무구를 쳐냈다! ${eff.weaponSeal}${s.party ? '라운드' : '턴'} 동안 무구 효과와 특수 강화가 꺼진다.`)
      }
      if (eff.mpTax) {
        s.ps.mpTax = eff.mpTax
        parts.push(`목마름 ${eff.mpTax}${s.party ? '라운드' : '턴'}`)
        warn(`목이 바싹 탄다! ${eff.mpTax}${s.party ? '라운드' : '턴'} 동안 의지력을 쓴 만큼 체력도 깎인다.`)
      }
      if (eff.field && first) {
        s.es.field = { die: Math.max(1, X(eff.field.die)), need: Math.max(1, X(eff.field.until)), dealt: 0 }
        parts.push('땡볕')
        warn(`땡볕이 내리쬔다! 라운드가 끝날 때마다 몸이 탄다. (${s.es.field.need} 이상 때리면 비가 온다)`)
      }
      if (eff.fear) {
        s.ps.fear = eff.fear
        parts.push('공포')
        warn('머리 없는 몸이 머리를 더듬는다… 공포에 질려 다음 턴엔 공격하지 못한다.')
      }
      if (eff.shield && first) {
        const add = Math.ceil(enemy.hp * eff.shield)
        s.es.shield = (s.es.shield || 0) + add
        parts.push(`껍질 ${add}`)
        warn(`${enemy.name}이(가) 두꺼운 껍질을 두른다! (껍질 ${s.es.shield})`)
      }
      if (eff.banish) {
        if (ctx.partyNote) parts.push(ctx.partyNote)
        else {
          s.pstun = Math.max(s.pstun || 0, 1)
          parts.push('홀로 버텨 끌려가진 않았지만 1턴 행동불능')
          warn('행렬에 휩쓸릴 뻔했다! 겨우 버텼지만 한 턴 동안 움직이지 못한다.')
        }
      }
      if (eff.reflect && first) {
        s.es.reflect = eff.reflect
        parts.push('방패 진형')
        warn(`${enemy.name}이(가) 방패를 겹겹이 세운다! 다음 공격의 피해 ${Math.round(eff.reflect * 100)}%가 되돌아온다.`)
      }
      if (eff.paralyze) {
        s.ps.paralyze = eff.paralyze.turns
        s.ps.paralyzeChance = eff.paralyze.chance
        parts.push(`저림 ${eff.paralyze.turns}턴`)
        warn(`저린 꽃가루를 마셨다! ${eff.paralyze.turns}턴 동안 ${eff.paralyze.chance}% 확률로 몸이 말을 듣지 않는다.`)
      }
      if (eff.delayed && first) {
        if (!s.es.delayed) {
          s.es.delayed = { turns: eff.delayed.turns, mult: eff.delayed.mult, add: X(eff.delayed.add), need: Math.max(1, X(eff.delayed.cancel)), taken: 0 }
          parts.push(`${eff.delayed.turns}턴 뒤 짓밟기`)
          warn(`${enemy.name}이(가) 산만 한 발을 들어 올린다! ${eff.delayed.turns}턴 뒤 내리찍는다. (${s.es.delayed.need} 이상 때리면 넘어진다)`)
        } else parts.push('이미 발을 들어 올린 채다')
      }
      if (eff.rageStack && first) {
        s.es.atkBonus = (s.es.atkBonus || 0) + eff.rageStack
        parts.push(`공격력 +${eff.rageStack} (누적 +${s.es.atkBonus})`)
        warn(`잠든 머리가 하나 더 깨어난다! ${enemy.name}의 공격력이 ${eff.rageStack} 오른다. (누적 +${s.es.atkBonus})`)
      }
      if (eff.statCopy && first) {
        s.es.statCopy = eff.statCopy
        const top = Math.max(...STAT6.map((k) => Number(ctx.stats?.[k]) || 0))
        parts.push(`거울 ${eff.statCopy}턴 (공격력 +${Math.floor(top / 2)})`)
        warn(`마왕의 거울에 내 모습이 비친다… ${eff.statCopy}턴 동안 내 가장 강한 힘을 빌려 쓴다. (공격력 +${Math.floor(top / 2)})`)
      }
      if (eff.rampage) {
        while (s.queue.length < eff.rampage + 1) s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!enemy.boss))
        for (let i = 1; i <= eff.rampage; i++) s.queue[i] = 'smash'
        parts.push(`다음 ${eff.rampage}번 강공`)
        warn(`${enemy.name}이(가) 미쳐 날뛴다! 다음 ${eff.rampage}번의 행동이 모두 강공이다.`)
      }
      if (eff.equalize) {
        const pr = s.php / s.phpMax
        const er = s.ehp / enemy.hp
        const avg = (pr + er) / 2
        const p0 = s.php
        const e0 = s.ehp
        s.php = Math.max(1, Math.round(avg * s.phpMax))
        if (first) s.ehp = Math.max(1, Math.round(avg * enemy.hp))
        parts.push(`체력 ${p0} → ${s.php}, ${enemy.name} ${e0} → ${s.ehp}`)
        warn(`거울이 둘을 되비춘다! 나와 ${enemy.name}의 체력 비율이 ${Math.round(avg * 100)}%로 맞춰졌다.`)
      }
      if (eff.statSwap) {
        const a = STAT6[Math.floor(rng() * 6)]
        let b = STAT6[Math.floor(rng() * 5)]
        if (b === a) b = STAT6[5]
        s.ps.statSwap = eff.statSwap
        s.ps.swap = [a, b]
        parts.push(`${STAT_KO[a]}↔${STAT_KO[b]}`)
        warn(`일곱 구멍이 뒤섞인다! ${eff.statSwap}${s.party ? '라운드' : '턴'} 동안 ${STAT_KO[a]}과(와) ${STAT_KO[b]}이(가) 맞바뀐다.`)
      }
      if (eff.barrierBreak) {
        if (!s.barrierBroken) warn('영력결계째 삼켜졌다! 이번 전투에선 결계가 다시 서지 않는다.')
        s.barrierBroken = true
        parts.push('영력결계 파괴')
      }
      if (eff.charmEat) {
        const eaten = s.charms || 0
        s.charms = 0
        const heal = Math.ceil(enemy.hp * eff.charmEat * eaten)
        const before = s.ehp
        if (heal > 0) s.ehp = Math.min(enemy.hp, s.ehp + heal)
        parts.push(eaten ? `부적 ${eaten}장 먹힘, 체력 +${s.ehp - before}` : '먹을 부적이 없었다')
        if (eaten) warn(`남은 부적 ${eaten}장을 먹어 치웠다! ${enemy.name}의 체력 +${s.ehp - before}.`)
      }
      spEv.result = parts.join(', ') || (first ? '효과 없음' : '앞사람과 같은 효과')
    } else {
      s.curse = 3
      spEv.result = '저주 3턴 시작'
      ev.push({ kind: 'enemy', text: `${enemy.name}의 원한의 저주! 앞으로 세 번의 상대 턴 동안 피해가 스며든다.` })
    }
    if (!ctx.noSpiritGate) spEv.result += ` (영능력에 영력 ${spCost} 소모, 남은 영력 ${s.espirit}/${enemy.spirit})`
  }

  // 외발 뛰기: 다음 행동을 이번 턴에 당겨 쓴다.
  if (extra && s.php > 0) {
    const nx0 = s.queue[1]
    const nx = nx0 === 'special' || nx0 === 'group' || nx0 == null ? 'jab' : nx0
    ev.push({ kind: 'warn', text: `${enemy.name}이(가) 외발로 껑충 뛰어 곧바로 한 번 더 움직인다!` })
    basic(nx)
    s.queue.splice(1, 1)
    s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!enemy.boss))
    if (nx === 'charge') chargeNow = true
    s.known = Math.max(0, s.known - 1)
  }

  // 저주: 방금 건 턴에는 들어가지 않고, 이후 상대 턴마다 들어간다.
  if (s.curse > 0 && !curseCast && !(intent === 'special' && !enemy.special?.effect && (enemy.id === 'wonhon' || enemy.id === 'mountain-ghost' || enemy.curse))) {
    const per0 = die(Math.max(1, Math.floor(enemy.spirit / 2)), rng)
    const per = ctx.reduction > 0 ? per0 - Math.floor(per0 * Math.min(1, ctx.reduction)) : per0 // 지신밟기
    const resisted = enduranceMitigation(stats.endurance, per, rng)
    s.php -= resisted.damage
    s.curse -= 1
    if (resisted.reduced) ev.push({ kind: 'warn', text: `인내로 저주 피해 ${resisted.reduced} 감소!` })
    ev.push({ kind: 'enemy', dmg: resisted.damage, text: `저주가 스며든다. ${resisted.damage} 피해! (남은 ${s.curse}턴)` })
    wake(resisted.damage)
  }

  // 단독: 라운드가 끝날 때 상태 이상 피해 (다인은 mbattle 이 라운드 끝에 한 번에 처리한다)
  if (solo) {
    if (s.ps.poison > 0 && s.php > 0) tickHurt(s.ps.poison * die(s.ps.poisonDie || 1, rng), `독이 퍼진다 (${s.ps.poison}겹).`)
    if (s.es.summon > 0 && s.php > 0) {
      let d = die(s.es.summonDie || 1, rng)
      if (s.guard) d = Math.ceil(d / 2)
      tickHurt(d, `쥐 떼가 발목을 문다${s.guard ? ' (막기로 절반)' : ''}.`)
    }
    if (s.es.field && s.php > 0) tickHurt(die(s.es.field.die, rng), '땡볕이 내리쬔다.')
    if (s.ps.plague > 0 && s.php > 0) tickHurt(die(s.ps.plagueDie || 1, rng), '역병이 몸을 갉는다.')
    s.es.ehpHist = [...(s.es.ehpHist || []), s.ehp].slice(-4)
    s.es.takenLog = [...(s.es.takenLog || []), s.es.takenNow || 0].slice(-4)
    s.es.takenNow = 0
    const pt = tickStatus(s.ps, 'end', freshKeys(psSnap, s.ps))
    s.ps = pt.ps
    ev.push(...pt.events)
    const et = tickEnemyStatus(s.es, 'end', freshKeys(esSnap, s.es))
    s.es = et.es
    ev.push(...et.events)
  }
  reviveCheck(s, ev) // 반격에 쓰러졌어도 뼈 맞추기는 한 번 일어선다

  // 다음 라운드 준비
  s.guard = false
  s.round += 1
  s.queue.shift()
  s.queue.push(rollIntent(s.queue[s.queue.length - 1], rng, s.party, !!enemy.boss))
  s.known = Math.max(0, s.known - 1)
  if (intent0 === 'charge' || chargeNow) s.known = Math.max(s.known, 1) // 기 모으기 다음은 강공이라는 건 누구나 안다.
  if (Array.isArray(s.lies)) {
    s.lies = s.lies.slice(1)
    if (!s.lies.some(Boolean)) s.lies = null
  }
  if (liesN) s.lies = Array.from({ length: liesN }, (_, i) => fakeIntent(s.queue[i], rng))

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
  return { state: s, events: ev, mpDrain, sealed }
}

// ───────── 상태 이상: 내 턴 앞뒤 (v-B.05) ─────────
// 단독(Battle.jsx)·다인(mbattle.js)·시뮬레이션이 같은 순서로 부른다:
//   playerTurnStart → (beforePlayer → playerTurn | psychicTurn) → afterPlayer, 도깨비불 자동 턴은 playerTurnStart → fireTurn → afterPlayer
const ACT_KO = { attack: '일반 공격', guard: '막기', scan: '간파', charm: '부적', psychic: '영능력' }
/** 자기 턴의 대가(들러붙음·독안개·목마름·화상·홀림·되받아침)로는 쓰러지지 않는다: 체력 1에서 멈춘다. */
function selfHurt(s, n, ev, text) {
  const d = Math.min(Math.max(0, s.php - 1), Math.max(0, Math.floor(n)))
  s.php -= d
  ev.push({ kind: 'warn', text: text(d) })
  return d
}

/** 내 턴이 시작될 때: 화상 피해, 가위눌림(잠). 반환 { state, events, skip } — skip 이면 이번 내 턴은 그대로 넘어간다. */
export function playerTurnStart(state, rng = Math.random) {
  const ps0 = state.ps
  if (!ps0 || !Object.keys(ps0).length) return { state, events: [], skip: false }
  const s = { ...state, ps: { ...ps0 } }
  const ev = []
  if (s.ps.burn > 0) selfHurt(s, Math.ceil(s.phpMax * (s.ps.burnPct || 0.06)), ev, (d) => `화상! 불길이 번져 체력 ${d}을(를) 잃었다. (막기를 하면 꺼진다)`)
  if (s.ps.sleep && !(s.pstun > 0)) delete s.ps.sleep
  return { state: s, events: ev, skip: false }
}

/** 고른 행동을 상태 이상에 맞게 바꾼다(홀린 귀·연모·공포), 저림이면 실패. 반환 { state, action, events, failed } */
export function beforePlayer(state, action, ctx = {}, rng = Math.random) {
  const ps0 = state.ps
  if (!ps0 || !Object.keys(ps0).length) return { state, action, events: [], failed: false }
  const s = { ...state, ps: { ...ps0 } }
  const ev = []
  let a = action
  const mp = Math.floor(ctx.mp ?? 0)
  if (s.ps.scramble > 0) {
    const opts = ['attack', 'guard', 'scan'].filter((x) => x !== 'scan' || mp >= 1)
    const pick = opts[Math.floor(rng() * opts.length)]
    delete s.ps.scramble
    ev.push({ kind: 'warn', text: `익숙한 목소리에 홀려 몸이 멋대로 움직인다! (${ACT_KO[a] ?? a} → ${ACT_KO[pick]})` })
    a = pick
  }
  if (s.ps.forceRash > 0 && a !== 'attack') {
    ev.push({ kind: 'warn', text: `연모의 불길에 사로잡혀 일반 공격밖에 할 수 없다! (${ACT_KO[a] ?? a} → 일반 공격)` })
    a = 'attack'
  }
  if (s.ps.fear > 0 && (a === 'attack' || a === 'charm')) {
    ev.push({ kind: 'warn', text: '공포에 질려 손을 뻗지 못하고 그 자리에 웅크렸다!' })
    a = 'guard'
  }
  if (s.ps.paralyze > 0 && rng() * 100 < (s.ps.paralyzeChance ?? 30)) {
    ev.push({ kind: 'warn', text: `몸이 저려 ${ACT_KO[a] ?? '행동'}에 실패했다!` })
    return { state: { ...s, guard: false, bound: false, myTurns: (s.myTurns || 0) + 1, choseTurns: (s.choseTurns || 0) + 1 }, action: a, events: ev, failed: true }
  }
  return { state: s, action: a, events: ev, failed: false }
}

/**
 * 내 행동이 끝난 뒤: 의지력 비용(금빛 울림·목마름), 자기 피해(들러붙음·독안개), 화상 끄기,
 * 상대에게 준 피해의 처리(둔갑·홀림·껍질·방패 진형·대인·땡볕·뼈 맞추기). r 을 고쳐서 돌려준다.
 * ctx = { action, mp } (action: 'attack' | 'charm' | 'guard' | 'scan' | 'psychic' | 'fire')
 */
export function afterPlayer(prev, r, ctx = {}, rng = Math.random) {
  if (!r || r.invalid || r.keepTurn) return r
  const s = { ...r.state }
  const ps = { ...(s.ps || {}) }
  const es = { ...(s.es || {}) }
  const ev = [...(r.events || [])]
  const act = ctx.action
  const mp = Math.floor(ctx.mp ?? 0)
  let mpCost = r.mpCost || 0
  if (ps.costUp > 0 && mpCost > 0) {
    const more = Math.min(Math.max(0, mp - mpCost), mpCost)
    if (more > 0) {
      mpCost += more
      ev.push({ kind: 'warn', text: `금빛 울림! 의지력이 ${more} 더 들었다.` })
    }
  }
  if (ps.mpTax > 0 && mpCost > 0) selfHurt(s, mpCost, ev, (d) => `목이 탄다! 쓴 의지력만큼 체력 ${d}이(가) 깎였다.`)
  if (ps.thorns > 0 && (act === 'attack' || act === 'charm')) selfHurt(s, die(ps.thornsDie || 1, rng), ev, (d) => `들러붙은 한이 기운을 갉는다. 체력 ${d} 감소.`)
  if (act === 'guard' && s.guard) {
    if (ps.guardTrap > 0) selfHurt(s, die(ps.guardTrapDie || 1, rng), ev, (d) => `웅크리다 독안개를 들이마셨다! 체력 ${d} 감소.`)
    if (ps.burn > 0) {
      dropPs(ps, 'burn')
      ev.push({ kind: 'info', text: '웅크려 몸에 붙은 불을 껐다.' })
    }
  }
  let dealt = Math.max(0, (prev.ehp ?? s.ehp) - s.ehp)
  const restore = (n) => {
    s.ehp += n
    dealt -= n
  }
  if (act === 'attack' && es.evade > 0) {
    es.evade -= 1
    if (dealt > 0) restore(dealt)
    ev.push({ kind: 'warn', text: `${s.enemy?.name ?? '상대'}이(가) 여우로 둔갑해 공격을 흘려 냈다! (남은 둔갑 ${es.evade}번)` })
    if (!es.evade) delete es.evade
  }
  if (dealt > 0 && ps.confuse > 0 && (act === 'attack' || act === 'charm')) {
    const hit = dealt
    restore(hit)
    delete ps.confuse
    selfHurt(s, hit / 2, ev, (d) => `홀린 손이 나를 쳤다! 체력 ${d} 감소.`)
  }
  if (dealt > 0 && es.shield > 0) {
    const a = Math.min(es.shield, dealt)
    restore(a)
    es.shield -= a
    ev.push({ kind: 'warn', text: es.shield > 0 ? `껍질이 피해 ${a}을(를) 대신 받았다. (남은 껍질 ${es.shield})` : `껍질이 피해 ${a}을(를) 받고 깨져 나갔다!` })
    if (!es.shield) delete es.shield
  }
  if (dealt > 0 && es.reflect > 0) {
    selfHurt(s, dealt * es.reflect, ev, (d) => `방패 진형에 막혀 피해 ${d}이(가) 되돌아왔다!`)
    delete es.reflect
  }
  if (dealt > 0) {
    es.takenNow = (es.takenNow || 0) + dealt
    if (es.delayed) {
      es.delayed = { ...es.delayed, taken: (es.delayed.taken || 0) + dealt }
      if (es.delayed.taken >= es.delayed.need) {
        delete es.delayed
        ev.push({ kind: 'warn', text: `${s.enemy?.name ?? '상대'}이(가) 들어 올린 발을 버티지 못하고 넘어졌다! 짓밟기가 취소됐다.` })
      }
    }
    if (es.field) {
      es.field = { ...es.field, dealt: (es.field.dealt || 0) + dealt }
      if (es.field.dealt >= es.field.need) {
        delete es.field
        ev.push({ kind: 'warn', text: '하늘이 흐려지더니 비가 쏟아진다. 땡볕이 그쳤다!' })
      }
    }
  }
  s.ps = ps
  s.es = es
  reviveCheck(s, ev)
  if (s.over === 'win' && s.ehp > 0) {
    s.over = null
    for (let i = ev.length - 1; i >= 0; i--) if (ev[i].kind === 'end') ev.splice(i, 1)
  }
  return { ...r, state: s, events: ev, mpCost }
}

/** 뼈 맞추기: 걸어 둔 채 쓰러지면 한 번 다시 일어선다. state 를 직접 고친다. */
export function reviveCheck(s, ev) {
  if (s.ehp > 0 || typeof s.es?.revive !== 'number') return false
  s.ehp = Math.max(1, Math.ceil((s.enemy?.hp ?? 1) * s.es.revive))
  s.es = { ...s.es, revive: 'used' }
  ev.push({ kind: 'warn', text: `${s.enemy?.name ?? '상대'}의 흩어진 뼈가 다시 맞춰진다! 체력 ${s.ehp}로 일어섰다.` })
  return true
}

/** 일반 공격 한 번의 피해(싸움 붙이기용) */
export function strikeOf(stats, rng = Math.random) {
  return attackRoll(stats, rng).dmg
}
/** 아이템을 못 쓰는가 / 회복이 막혔는가 */
export const itemSealed = (state) => (state?.ps?.itemSeal || 0) > 0
export const healBlocked = (state) => (state?.ps?.healBlock || 0) > 0
/** 고를 수 없는 행동(공포) */
export const blockedActions = (state) => [...((state?.ps?.fear || 0) > 0 ? ['attack', 'charm'] : []), ...((state?.ps?.forceRash || 0) > 0 ? ['guard', 'charm', 'scan', 'psychic'] : [])]

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
            ? '버티기! 의지력을 쓰지 않고 체력 1로 일어섰다!'
            : `버티기! 의지력 ${cost}을 쏟아 체력 1로 일어섰다. (${more ? '무당방울 덕에 한 번 더 버틸 수 있지만, 의지력이 2 이상 남아 있어야 한다' : '이번 전투에선 더 못 버틴다'})`,
        },
      ],
    }
  }
  s.over = 'lose'
  return { state: s, mpCost: 0, events: [{ kind: 'end', text: '버티지 않았다. 전투에서 패배했다.' }] }
}
