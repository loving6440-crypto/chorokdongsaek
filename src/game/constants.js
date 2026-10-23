export const STAT_KEYS = [
  'insight',
  'aggression',
  'endurance',
  'control',
  'agility',
  'comprehension',
]

// hint: 스탯 패널에 표시되는 한 줄 설명 / detail: 캐릭터 생성 화면의 자세한 설명
export const STAT_META = {
  insight: {
    label: '안목',
    en: 'Insight',
    hint: '위험 감지 · 희귀(특수) 아이템 발견',
    detail: '위험 감지력과 희귀 아이템(특수 아이템) 발견 가능성이 올라간다.',
    tip: {
      head: '위험 감지력 및 희귀 아이템(특수 아이템) 발견 가능성 UP',
      paras: [
        '눈꺼풀 들어올려 바라봐야만 맺힌 상이 무엇인지 식별 가능하다. 교육자들은 우선 눈을 크게 뜰 것을 1원칙으로 삼는다.',
        '시야에 담는 것 만으로도 사물의 이치를 분별해낼 수 있음이란, 곧 세상의 흐름을 숙지했음을 의미한다.',
      ],
    },
  },
  aggression: {
    label: '호전',
    en: 'Aggression',
    hint: '공격력 · 상대 파악 · 다이스 보정',
    detail:
      '공격력, 상대 파악, 다이스 전투 보정치가 올라간다. 단, 너무 높으면 선택지에서 돌발 행동 확률이 늘어난다.',
    tip: {
      head: '공격력, 상대 파악 및 다이스 전투 보정치 증가. (단, 너무 높으면 선택지에서 돌발 행동 확률 증가)',
      paras: [
        '동작이란 세상의 흐름에 거슬러 육신을 다스리는 것. 공기의 저항감, 바닥의 중력, 피부에 달라붙는 옷가지 따위의 감각.',
        '정해진 방향을 뒤틀어 내 의지가 바라는 방향으로 꺾어두는 것. 원초적이고 폭력적이나 그렇기에 우리가 인간임을 증명할 수 있는 성질.',
      ],
    },
  },
  endurance: {
    label: '인내',
    en: 'Endurance',
    hint: '정신력 · HP 0에서 버틸 확률',
    detail: '정신력. 무언가를 버텨내거나 HP가 0일 때 버텨낼 확률이 높아진다.',
    tip: {
      head: '정신력. 무언가를 버텨내거나 HP가 0일 때 버텨내는 확률이 높아진다.',
      paras: [
        '끈질김과 참을성에 대해 소모적이라고 외치는 이들도 있으나, 멈추지 않으면 지금 여기에 머무를 수도 없는 법이다.',
        '시간 낭비라 성토하는 이들에게 보여라, 버텼기에 살아남았고 살아남았기에 본인을 증명할 수 있는 법이다.',
      ],
    },
  },
  control: {
    label: '절제',
    en: 'Control',
    hint: '체력/영력/의지력의 활용이 효율적으로 변한다.',
    detail: '체력/영력/의지력의 활용이 효율적으로 변한다.',
    tip: {
      head: '체력/영력/의지력의 활용이 효율적으로 변한다.',
      paras: [
        '가시밭길을 걸을 것을 각오하는 게 아닌, 그 통증을 소리 내지 않는 것이 미덕. 자신의 신체를 어디까지 다룰 수 있나?',
        '자기 자신을 다룰 수 있음이란 자연의 일부를 거느린다는 뜻. 세상 만물이 한 개인을 위해 흐를 수 있게끔 끌어온다.',
      ],
    },
  },
  agility: {
    label: '신속',
    en: 'Agility',
    hint: '수련 · 채집 속도',
    detail: '전체적으로 수련과 채집의 속도가 빨라진다.',
    tip: {
      head: '전체적으로 수련 및 채집의 속도가 빨라진다.',
      paras: [
        '빠른 발과 빠른 말. 도도도 튀어나오고 스르륵 흘러가는 것, 우리가 겨우 소리로 구현해내서 묘사하는 속도감.',
        '몸에 익은 박자와 뇌가 시키지 않아도 진행되는 흐름, 몸에 체득될 적 까지 익히는 것. 그것이 반 박자 빠를 수 있는 법칙이다.',
      ],
    },
  },
  comprehension: {
    label: '이해',
    en: 'Comprehension',
    hint: 'NPC 소통 · 호감도 · 돌발 전투 회피',
    detail: 'NPC와의 소통, 호감도 상승량, 길거리 돌발 전투 회피율이 올라간다.',
    tip: {
      head: 'NPC와의 소통, 호감도 상승량 증가 및 길거리 돌발 전투 회피율 증가',
      paras: [
        '세상을 향해 너른 마음을 보이고 팔을 벌려 수용할 것을 선언하는 것. 그것 만으로도 자연은 개인을 환영한다.',
        '그러나 명심할 것. 포용함이란 어리석음이 아니라 너그러움. 받아들일 수 있음이란 그만치 각오가 되어 있단 의미다.',
      ],
    },
  },
}

// ───────── 캐릭터 생성 규칙 ─────────
export const AGE_MIN = 17
export const AGE_MAX = 19
export const GRADES = [1, 2, 3]
export const NAME_MAX_LENGTH = 12
export const STAT_MIN = 1 // 스탯 최소값 (최대값은 없다)
export const STAT_START_POINTS = 10 // 캐릭터 생성 시 자유롭게 투자할 수 있는 포인트

// 영력 게이지의 기본 최대치(영력이 이보다 커지면 100 단위로 늘어난다).
// 모든 캐릭터는 그 중앙값에서 시작한다.
export const SPIRIT_BASELINE_MAX = 200
export const SPIRIT_START = SPIRIT_BASELINE_MAX / 2
export const HP_MAX = 100
export const MP_MAX = 100

export const AVATAR_SIZE = 256 // 업로드한 이미지를 이 크기의 정사각형으로 저장한다.
export const AVATAR_MAX_FILE_MB = 8
// 단색 프로필의 기본 색. 실제 색은 캐릭터 생성 화면에서 #코드로 직접 입력한다.
export const DEFAULT_AVATAR_COLOR = '#1f7a4d'

// accent 는 테마별로 값이 달라지도록 index.css 의 --loc-* 변수를 가리킨다.
export const LOCATIONS = {
  mainHall: {
    id: 'mainHall',
    hanja: '青',
    name: '본관',
    accent: 'var(--loc-mainHall)',
    accentLabel: '청',
    navNote: '동쪽, 파란 술식이 각인된 방벽.',
    subtitle: '수업 및 미니게임',
  },
  annex: {
    id: 'annex',
    hanja: '白',
    name: '별관',
    accent: 'var(--loc-annex)',
    accentLabel: '백',
    navNote: '서쪽, 잡티 없는 하얀 장서각.',
    subtitle: '정보 조회 및 고서적',
  },
  dorm: {
    id: 'dorm',
    hanja: '黑',
    name: '기숙사',
    accent: 'var(--loc-dorm)',
    accentLabel: '흑',
    navNote: '북쪽, 빛을 먹는 까만 보금자리.',
    subtitle: '방치형 수련 / 휴식',
  },
  gym: {
    id: 'gym',
    hanja: '赤',
    name: '뒷산',
    accent: 'var(--loc-gym)',
    accentLabel: '적',
    navNote: '남쪽, 붉은 천이 걸린 실습터이자 산.',
    subtitle: 'TRPG 다이스 전투 실습',
  },
  shrine: {
    id: 'shrine',
    hanja: '黃',
    name: '사당',
    accent: 'var(--loc-shrine)',
    accentLabel: '황',
    navNote: '중앙, 노란 기와가 놓인 사당.',
    subtitle: '출입 금지 구역',
  },
  infirmary: {
    id: 'infirmary',
    hanja: '癒',
    name: '양호실',
    accent: 'var(--loc-infirmary)',
    accentLabel: '유',
    navNote: '2층 끝, 약초 냄새가 가라앉은 방.',
    subtitle: '체력 · 의지력 회복',
    hidden: true, // 구역 목록에는 없다. 본관 탐사(2층 양호실)로만 찾아간다.
  },
}

export const COURSES = [
  {
    id: 'talisman-2048',
    title: '부적학',
    game: '2048',
    note: '부적 조각을 합쳐 신위를 끌어올린다.',
    playable: true,
  },
  {
    id: 'spell-typing',
    title: '주술학',
    game: '타자',
    note: '주문을 끊기지 않게 옮겨 적는다.',
    playable: true,
  },
  {
    id: 'ward-tetris',
    title: '결계학',
    game: '테트리스',
    note: '결계 블록을 쌓아 허점을 메운다.',
    playable: true,
  },
  {
    id: 'folklore-spot',
    title: '민속학',
    game: '화투 신경쇠약',
    note: '펼쳐진 화투패를 외웠다가 같은 월의 짝을 찾는다.',
    playable: true,
  },
  {
    id: 'divination-fortune',
    title: '점복학',
    game: '운세',
    note: '오늘의 길흉을 점친다.',
    playable: true,
  },
  {
    id: 'exorcism-space',
    title: '퇴마실습',
    game: '달리기',
    note: '끝없이 달리는 여우, 장승과 귀화를 뛰어넘는다.',
    playable: true,
  },
]

export const SHRINE_INSIGHT_UNLOCK = 15
export const GYM_DC = 12
// 신속 1당 1분에 영력 +0.1 (= 10분에 1). 실제 반영은 1초마다 /60 씩.
export const SPIRIT_PER_AGILITY = 0.1
export const STAT_UPGRADE_COST_PER_POINT = 10
export const STAT_MAX = 50 // 모든 스탯의 최대치. 이 이상은 오르지 않는다.

// 퇴마 실습의 단계(난이도): 一 ~ 十. 숫자가 클수록 어렵다. 지금 퇴마 실습은 一~三단계를 맡는다.
export const TIER_HANJA = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
export const tierLabel = (n) => `${TIER_HANJA[n - 1] ?? n}단계`
