/**
 * v-B.08 — 아이템 시트(초록동색_조사 및 스토리시트 · 아이템 목록)에 맞춘 것.
 *  B08_SHEET_ITEMS: 게임에 없던 아이템 (까치 깃)
 *  B08_SHEET_OVERRIDES: 이름 · 설명 · 효과가 바뀐 아이템, 그리고 효과를 실제로 쓸 수 있게 만든 아이템
 *   - 기합의 띠: 장신구형 에너자이저(소모) — 착용하고 있으면 전투불능이 될 때 한 번 체력 1로 일어서고, 띠는 끊어진다.
 *   - 뱀딸기 귀걸이: 장신구, 호전 +1 (시트: '효과 미미… 호전 +1 정도')
 *   - 도깨비 탈: 장신구, 모든 공격력 +200% · 돌발 확률 +50% · 단체 전투에서 (호전/3)% 확률로 아군을 일반 공격
 *   - 금관: 장신구(효과 없음 — 시트 효과 칸이 비어 있다)
 *   - 일기장: 사용하면 의지력을 (인내 + 절제)만큼 회복
 * 시트에서 비어 있는 칸은 게임 쪽 글을 그대로 둔다.
 * v-B.06 이후 규칙이 바뀌었는데 시트에 아직 예전 글이 남은 것(무당방울 회복 확률, 연마석 · 숫돌 쓰임새)은 지금 규칙의 글을 둔다.
 */
const MAT = '제작용 재료'
export const B08_SHEET_ITEMS = [
  { id: 'magpie-plain-feather', kind: 'material', tags: ['재료'], name: '까치 깃', price: null, desc: '날쌔서 까치를 향해 손을 뻗으면 새는 도망치고 없고 깃만 조롱하듯 남겨져 있다.', effectText: MAT, effect: {}, battle: false },
]

export const B08_SHEET_OVERRIDES = {
  // ── 효과 구현 ──
  headband: { kind: 'gear', slot: 'trinket', tags: ['완성품', '장신구'], bonus: {}, trinketFx: 'headband', effectText: '장신구형 에너자이저(소모품). 착용한 채 전투불능이 되면 한 번, 전투를 끝내지 않고 체력 1로 다시 일어선다. 효과가 나면 띠는 끊어져 사라진다.' },
  'berry-earring': { kind: 'gear', slot: 'trinket', tags: ['완성품', '장신구'], bonus: { aggression: 1 }, effectText: '착용 시 호전 +1 보정.' },
  'goblin-mask': { kind: 'gear', slot: 'trinket', tags: ['완성품', '장신구'], bonus: {}, trinketFx: 'goblin-mask', effectText: '착용 시 모든 공격력에 +200% 보정. 단, 돌발 확률이 50% 늘어나고, 아군을 일반 공격으로 공격할 확률이 (호전/3)% 생긴다.' },
  'gold-crown': { kind: 'gear', slot: 'trinket', tags: ['완성품', '장신구'], bonus: {} },
  diary: { effect: { mpStats: ['endurance', 'control'] }, effectText: '의지를 (인내+절제)만큼 회복한다.', desc: '오늘 있던 일을 정리하자. 멘탈관리에 도움을 주곤 한다. 평소에 일기를 자주 쓰는 만큼 익숙해진다.' },
  // ── 글만 바뀐 것 ──
  inkstick: { price: 10 }, // 시트 취득: 매점에서 구매 (값은 시트에 없어 붓 12 · 조각칼 10 사이로 정했다)
  'king-mushroom': { desc: '한 아름 되는 거대한 버섯. 맛보다는 보통 생김새에 압도당한다.' },
  'barley-seed': { desc: '이 작은 씨앗은 미래에 자신이 보리차가 되리라곤 꿈도 못 꿀 것이다. 최소 10알 이상은 모여야 뭐라도 할 수 있을 것 같다.' },
  ginseng: { desc: '산속 깊은 곳에서 발견한 오래 묵은 산삼. 왠지 말하게 생겼다고? 기분 탓이다.' },
  acorn: { desc: '도토리 키 재기라는 말을 들어봤는가? 실제 도토리들은 은근히 크기 편차가 심하다.', effectText: MAT },
  chestnut: { effectText: MAT },
  'pheasant-feather': { desc: '장끼 꽁지에서 빠진 긴 깃털. 무늬가 눈을 사로잡는다.', effectText: MAT },
  arrowroot: { name: '칡 뿌리', desc: '씹을수록 단맛이 우러난다. 파느라 고생한 만큼 먹어주겠다는 의지가 피어오른다.', effectText: MAT },
  deodeok: { effectText: MAT },
  doraji: { effectText: MAT },
  dangwi: { effectText: MAT },
  'badger-fur': { effectText: MAT },
  'wild-grape': { desc: '작고 새콤한 보랏빛 과일. 포도와는 다르다. 포도와는!', effectText: MAT },
  omija: { desc: '오미자는 보통 맛보다는 효능으로 유명하다. 열매로 본 사람이 몇이나 될까?', effectText: MAT },
  'lightning-jujube': { desc: '벼락 맞은 대추나무 조각. 잡귀가 가장 꺼리는 나무라고 한다. 우리에게 있어서는 가장 반가운 나무다.', effectText: MAT },
  'pine-nut': { desc: '고소하고 담백한 견과류. 송이를 하나하나 털어 먹어야 하지만, 그만큼 귀하다.', effectText: MAT },
  'marten-fur': { desc: '누가 이 불쌍한 담비에게 털을 뽑아야 살아남을 수 있다고 겁이라도 준 거야?', effectText: MAT },
  songi: { desc: '솔숲에서만 난다. 향이 그윽한 것이 아주 맛있어보인다.', effectText: MAT },
  'hawk-feather': { desc: '이 깃털은 알았을까? 하늘을 가르는 매의 자랑스러운 꼬리깃이었던 자신이 땅에 선 두발짐승의 손에 초라하게 들리게 되리라고⋯⋯.', effectText: MAT },
  'wolf-fang': { desc: '골짜기에 울리던 울음의 주인이 남긴 것. 이갈이를 하는 건 포식자나 피식자나 똑같다.', effectText: MAT },
  'bear-fur': { desc: '가슴께의 반달 무늬 털. 고작 한 줌인데도 왠지 묵직한 기분이 든다.', effectText: MAT },
  'frost-flower': { desc: '얼능선 바위에 핀 서리 꽃. 손에 닿으면 금세 녹아내려 옮길 때에도 얼음팩을 지참해야 한다.', effectText: MAT },
  'goral-horn': { desc: '절벽을 타는 산양의 부러진 뿔. 대체 이 산에는 뭐 얼마나 많은 동물들이 사는 걸까?', effectText: MAT },
  somdari: { effectText: MAT },
  'magpie-feather': { name: '흰까치 깃', desc: '좋은 소식을 물어 온다는 흰 까치의 깃. 들여다보고 있으면 기분 좋은 색이다.', effectText: MAT },
  'gold-toad-skin': { desc: '금빛으로 반짝이는 얇은 허물. 금을 닮아 복을 부른다고 한다.', effectText: MAT },
  'weasel-fur': { name: '흰족제비 털', desc: '눈처럼 새하얀 색의 털. 붓을 매면 글씨가 살아난다고 하는데, 그렇다고 부족한 서예 실력을 살릴 수는 없다.', effectText: MAT },
  'owl-feather': { desc: '소리 없이 나는 수리부엉이의 깃털. 밤이 되면 그들은 인간이 볼 수 없는 영역을 보게 된다. 혼, 백, 그 외의 것들도.', effectText: MAT },
  'crane-feather': { desc: '끝이 까만 하얀 깃. 고고한 빛깔을 들여다보고 있으면 왠지 오래 살고 싶어진다나.', effectText: MAT },
  lingzhi: { effectText: MAT },
  'dragon-mane': { desc: '구름 속을 달리던 용마의 갈기 한 가닥. 용마는 지금쯤 등이 억울하게 휑해졌을 것이다.', effectText: MAT },
  'turtle-shell': { name: '천년거북 등딱지', effectText: MAT },
  'white-squirrel-tail': { desc: '이젠 하다하다 꼬리털까지 뽑기 시작한 거야?', effectText: MAT },
  'golden-serpent-scale': { desc: '집과 곳간을 지킨다는 업구렁이의 금빛 비늘. 비늘 하나가 손바닥보다 크다.', effectText: MAT },
  'fortune-bat-wing': { effectText: MAT },
  'haedongcheong-feather': { desc: '임금도 탐냈다는 송골매의 깃. 깃이라도 뽑아온 게 대단하다.', effectText: MAT },
  'spirit-disposable': { desc: '보기엔 흉물스러운 경우가 많다. 진품과 가품 구분도 모호하기에 직접 만들어서 쓰는 걸 추천한다.' },
  'small-altar': { desc: '소원을 비는 제단으로 기능한다. 그리 효과가 좋진 않지만 없는 것보다는 낫다.' },
  charcoal: { effectText: '10 미만인 스탯에만 사용 가능. 스탯 하나를 1올리는 대신 체력 30 상실' },
  'mystery-tonic': { desc: '산에서 자란 이런저런 것들을 넣어서 만든 보약. 먹어도 되는 거냐는 말은 금지. 이래보여도 손이 꽤 많이 간다.' },
}

/** 장신구가 가진 특수 효과(전투 엔진은 stats.trinket 을 본다) */
export const TRINKET_FX = ['headband', 'goblin-mask']
