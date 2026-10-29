/**
 * 아이템 정의. 재화 단위는 '냥'.
 *
 * ★ 아이템을 새로 추가할 때:
 *   1) 아래 ITEMS 에 항목만 넣으면 된다. (id · name · desc · kind 는 꼭)
 *   2) 아이콘은 자동으로 붙는다. 플랫 디자인 원형 아이콘이 kind 에 맞춰 만들어진다.
 *      마음에 드는 그림으로 바꾸고 싶으면 src/components/ItemIcon.jsx 의 CUSTOM_ICONS 에 같은 id 로 그려 넣는다.
 *   3) 도감(src/game/codex.js)에는 ITEMS 가 그대로 올라간다. 설명(desc)이 도감 설명이다.
 *
 * price: 숫자이면 기숙사 매점에서 판다. 없으면(null) 아직 파는 곳이 정해지지 않은 아이템.
 * kind: 'food' 먹는 것 · 'drink' 마시는 것 · 'material' 재료 · 'tool' 도구
 * tags: 화면에 칩으로 붙는 분류. ('재료', '완성품', '선물' ...) 재료/완성품은 아래 ITEMS 에서 자동으로 붙는다.
 * battle: 전투 중 사용 가능하다고 명시된 것만 true. (tags 에 '전투 중 사용 가능' 칩도 함께 붙인다.)
 * only: 'battle' 이면 전투 중에만 쓸 수 있다.  party: 일행(파티) 상태에서만 쓸 수 있다.
 * 다인 전투에서 #턴소모無 아이템은 타인의 턴에도 쓸 수 있다. 그중 '일행'(나 말고 다른 사람)에게도 쓸 수 있는 아이템은 쓰는 순간 그 턴이 끝나고(#턴소모有),
 * 나를 포함한 '개인'에게만 쓸 수 있는 아이템은 턴을 소모하지 않아 같은 턴에 다른 행동도 이어서 할 수 있다(#턴소모無). (v71)
 */
/** 턴소모有/無 판정: 일행 전원(또는 나를 제외한 전원)을 대상으로 하는 효과(partyHp·partyMp·partyBoost·giveHp)가 있으면 턴을 소모한다.
 *  boost(마이쮸: 한 명에게만 건네는 공격력 버프)는 대상이 한 명뿐이라 턴을 소모하지 않는다. */
export const itemTurnFree = (item) => {
  const e = item?.effect ?? {}
  return item?.battle && !(e.partyHp || e.partyMp || e.partyBoost || e.giveHp)
}
export const START_MONEY = 50

const RAW_ITEMS = [
  {
    id: 'picnic',
    kind: 'drink',
    name: '사과맛 피크닉',
    price: 5,
    desc: '평범한 사과맛 피크닉, 독은 들어있지 않다. 전투중에 마셔도 목에 걸리지 않는다.',
    tags: ['전투 중 사용 가능', '#턴소모無'],
    effectText: '의지력 +15',
    effect: { mp: 15 },
    battle: true,
  },
  {
    id: 'chocolate',
    kind: 'food',
    name: '가나다 초콜릿',
    price: 8,
    desc: '탈지분유 맛이 난다. 크래커 과자에 껴먹는게 요즘의 소소한 유행이다.',
    effectText: '의지력 +30',
    effect: { mp: 30 },
    battle: false,
  },
  {
    id: 'ramen',
    kind: 'food',
    name: '컵라면',
    price: 8,
    desc: '급식이 맛없을 때면 금방 재고가 떨어진다. 미리미리 사두는 사람들도 있으니 참고할 것.',
    tags: ['전투 중 사용 가능', '#턴소모無'],
    effectText: '체력 +20',
    effect: { hp: 20 },
    battle: true,
  },
  {
    id: 'dumpling',
    kind: 'food',
    name: '만두',
    price: 12,
    desc: '고기만두로 통일됐다. 김치만두를 원한다면 매점 주인에게 문의해보자.',
    effectText: '체력 +30',
    effect: { hp: 30 },
    battle: false,
  },
  {
    id: 'chewy',
    kind: 'food',
    name: '마이쮸',
    price: 5,
    desc: '친해지고 싶은 상대에게 나눠주자. 전투 중에는 같이 싸우는 파티원에게도(물론 혼자 먹어도) 건넬 수 있다.',
    tags: ['전투 중 사용 가능', '#턴소모無'],
    effectText: '전투 중: 파티원(나 자신 포함) 한 명에게 건네면 그 사람의 다음 행동 피해가 1턴 동안 2배가 된다. 전투가 아닐 때: NPC에게 주면 호감도가 오른다.',
    effect: { boost: true },
    battle: true,
    giftNpc: true,
  },
  {
    id: 'energy',
    kind: 'drink',
    name: '에너지드링크',
    price: 20,
    desc: '날개를 달아줘요. 어쩐지 죽어도 죽지 않을 것 같다.',
    tags: ['전투 중 사용 가능', '#턴소모無'],
    effectText:
      '1회에 한하여 전투불능 패널티 없이, 또한 전투를 종료하지 않고 HP1로 부활시킨다. 의지력은 회복되지 않는다. 전투불능이 되기 전 미리 먹어둬야 효과가 바로 발휘되며, 전투불능 이후에는 사용할 수 없다. 한 전투에 1회만 쓸 수 있다 (부활에 쓰고 나서도 같은 전투에서는 다시 마실 수 없다).',
    effect: { revive: true },
    battle: true,
    only: 'battle',
  },
  {
    id: 'cone-icecream',
    kind: 'food',
    name: '콘 아이스크림',
    price: 15,
    desc: '콘 아이스크림, 와플이 바삭바삭하고 조금 비싸다. 끄트머리에 초콜릿이 들어있다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'bag-snack',
    kind: 'food',
    name: '봉지 과자',
    price: 12,
    desc: '까서 먹고 있으면 주변 사람들이 몰려와서 한 입씩 뺏어먹는다.',
    tags: ['전투 중 사용 가능', '#턴소모有'],
    effectText: '전투 중: 파티 전원의 체력이 15 회복된다. (일행 전투에서만 쓸 수 있다)',
    effect: { partyHp: 15 },
    battle: true,
    party: true,
  },
  {
    id: 'slice-cake',
    kind: 'food',
    name: '조각 케이크',
    price: 15,
    desc: '깜짝 파티를 하기에 나쁘지 않다. 설령 전투중이라 하더라도 기념일은 잊지 말도록 해.',
    tags: ['전투 중 사용 가능', '#턴소모有'],
    effectText: '전투 중: 파티 전원의 의지력이 15 회복된다. (일행 전투에서만 쓸 수 있다)',
    effect: { partyMp: 15 },
    battle: true,
    party: true,
  },
  {
    id: 'firecracker',
    kind: 'food',
    name: '폭죽',
    price: 30,
    desc: '깜짝 파티를 하기에 나쁘지 않다. 하지만 미리 예고하지 않으면 친구들이 너를 노려볼지도 모른다.',
    tags: ['전투 중 사용 가능', '#턴소모有'],
    effectText:
      '사용 시 자신을 제외한 일행 전원의 다음 1회 공격력이 2배가 된다. 단, 사용한 자신은 그 즉시부터 1턴 동안 행동불능이 되며, 자신에게는 2배 효과가 적용되지 않는다. (일행 전투에서만 쓸 수 있다)',
    effect: { partyBoost: 2, selfStun: 1 },
    battle: true,
    party: true,
  },
  {
    id: 'twin-pop',
    kind: 'food',
    name: '쌍쌍바',
    price: 10,
    desc: '더 큰 쪽을 누가 가져가느냐에 따라 우정이 갈라진다는 이야기가 있다. 나는 이 이야기를 참 좋아한다.',
    tags: ['전투 중 사용 가능', '#턴소모有'],
    effectText: '체력 회복. 파티원에게 건네면 +20, 자기 자신이 사용하면 +5.',
    effect: { giveHp: { party: 20, self: 5 } },
    battle: true,
  },
  {
    id: 'hotbar',
    kind: 'food',
    name: '핫바',
    price: 10,
    desc: '이거 돌린다고 밤중에 매점 문 따고 들어와 전자렌지를 돌리는 너구리들이 존재한다는 풍문이 있다.',
    effectText: '현재 지속 중인 [쇠약]의 남은 유효시간을 1시간으로 대폭 줄인다.',
    effect: { weakCap: 3600 * 1000 },
    battle: false,
  },
  // ───────── 제작 재료 (매점에서 판다) ─────────
  {
    id: 'brush',
    kind: 'material',
    tags: ['재료'],
    name: '붓',
    price: 12,
    desc: '털끝이 가지런한 평범한 붓. 부적이든 서예든, 일단 이게 있어야 시작이다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'hanji',
    kind: 'material',
    tags: ['재료'],
    name: '한지',
    price: 6,
    desc: '매끈하고 질긴 새 한지. 번지지 않아서 글씨 쓰기 좋다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  // ───────── 타일 수렵·채집 재료 ─────────
  ...[
    ['mushroom', '버섯', '산길에서 채집한 버섯.'],
    ['poison-mushroom', '독버섯', '함부로 먹을 수 없는 독버섯.'],
    ['rock', '바위', '산길의 돌무더기에서 얻은 단단한 바위.'],
    ['raspberry', '산딸기', '덤불 사이에서 따낸 산딸기.'],
    ['trap-scrap', '덫 찌꺼기', '동물을 쫓다가 발견한 덫의 잔해.'],
  ].map(([id, name, desc]) => ({ id, name, desc, kind: 'material', tags: ['재료'], price: null, effectText: '', effect: {}, battle: false })),
  // ───────── 재료 · 먹을거리 (아직 어디서 나오는지는 정해지지 않았다) ─────────
  {
    id: 'dove-feather',
    kind: 'material',
    tags: ['재료'],
    name: '멧비둘기 깃털',
    price: null,
    desc: '고개를 둘러보니 빈 둥지가 있었다. 새들이 떠난 걸까?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'raccoon-claw',
    kind: 'material',
    tags: ['재료'],
    name: '너구리 발톱',
    price: null,
    desc: '나무에 박혀있었다. 발톱을 갈다가 빠진 거면 다행일 텐데.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'deer-tooth',
    kind: 'material',
    tags: ['재료'],
    name: '고라니 이빨',
    price: null,
    desc: '이갈이라도 한 건가?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'snake-skin',
    kind: 'material',
    tags: ['재료'],
    name: '뱀 허물',
    price: null,
    desc: '뒷산에 뱀이 나와 새알을 죄다 먹어치웠다고 애들이 떠들고 다녔다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'fox-fur',
    kind: 'material',
    tags: ['재료'],
    name: '여우 꼬리털',
    price: null,
    desc: '부드럽고 폭신하다. 뒷산에 여우도 나온다고?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'mugwort',
    kind: 'food',
    tags: ['재료', '완성품'],
    name: '쑥',
    price: null,
    desc: '요리에 쓰면 좋은 풍미가 되지만 그냥 씹어먹으면 끔찍한 맛이 되는 향이 흘러나온다.',
    effectText: '사용하면 24시간 동안 인내 +1. (제작 재료로도 쓰인다.)',
    effect: { buff: { stat: 'endurance', amount: 1, hours: 24 } },
    battle: false,
  },
  {
    id: 'snake-berry',
    kind: 'food',
    tags: [],
    name: '뱀딸기',
    price: null,
    desc: '먹어도 죽지는 않지만 맛은 없다. 진짜 먹게?',
    effectText: '의지력 +1',
    effect: { mp: 1 },
    battle: false,
  },
  {
    id: 'ginseng-candy',
    kind: 'food',
    tags: [],
    name: '홍삼사탕',
    price: null,
    desc: '가끔 선생님들이 나눠주신다. 시판용과는 묘하게 다른 느낌이 든다. 왜일까?',
    effectText: '의지력 +20',
    effect: { mp: 20 },
    battle: false,
  },
  {
    id: 'charm-scrap',
    kind: 'material',
    tags: ['재료'],
    name: '부적 조각',
    price: null,
    desc: '정체불명의 부적 조각, 오래되어 바스라지기 일보 직전이다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'crumpled-hanji',
    kind: 'material',
    tags: ['재료'],
    name: '구겨진 한지',
    price: null,
    desc: '오래됐고, 낡았고, 누리끼리하지만 튼튼하다. 뭐라도 적어보는 건 어때?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'broken-inkstick',
    kind: 'material',
    tags: ['재료', '선물'],
    name: '부러진 먹',
    price: null,
    desc: '손은 더러워질 것 같지만 아직 쓸 수 있다. 이 학교 다니면서 먹 하나 못 가는 건 아니지?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'split-brush',
    kind: 'material',
    tags: ['재료'],
    name: '갈라진 붓',
    price: null,
    desc: '관리가 엉망으로 된 건지 갈라졌다. 사용 자체는 가능해보인다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'jangseung-piece',
    kind: 'material',
    tags: ['재료'],
    name: '장승 조각',
    price: null,
    desc: '옛날에는 영험했을지도 모른다. 지금은 나무토막일 뿐이지만.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'five-color-thread',
    kind: 'material',
    tags: ['재료'],
    name: '오색실',
    price: null,
    desc: '결계를 만드는 데 사용되는 재료. 삐끗하면 엉켜버린다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'fine-woodchip',
    kind: 'material',
    tags: ['재료'],
    name: '절묘한 나무조각',
    price: null,
    desc: '무언가를 조각하기에 괜찮은 크기의 나무조각. 가끔 개미가 나오니 조심하자.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'creek-orchid',
    kind: 'material',
    tags: ['재료'],
    name: '개울가 난초',
    price: null,
    desc: '향이 좋다고 기숙사에서 키우는 사람들이 가끔 나온다. 사감한테 걸리면 혼난다. 대체 왜?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'clover-leaf',
    kind: 'material',
    tags: ['재료'],
    name: '토끼풀',
    price: null,
    desc: '가끔 이파리가 네 개인 걸 찾을 수 있다. 이건 아닌 것 같지만.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'pencil',
    kind: 'material',
    tags: ['재료', '선물'],
    name: '연필',
    price: null,
    desc: '요즘은 다들 샤프 쓰지 않냐고도 하지만 연필이 아니라면 집중할 수 없는 슬픈 사람들이 존재한다.',
    effectText: 'NPC에게 건넬 시 호감도 +2',
    effect: {},
    giftNpc: true,
    giftAffinity: 2,
    battle: false,
  },
  {
    id: 'friendship-letter',
    kind: 'material',
    tags: ['재료'],
    name: '우정편지',
    price: null,
    desc: '누군가들이 주고받은 편지. 다른 사람의 인연이 담겨있다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'sewer-rat',
    kind: 'material',
    tags: ['재료'],
    name: '시궁쥐',
    price: null,
    desc: '쥐덫에 걸려있었다. 이걸 어쩌지?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'nutrient',
    kind: 'drink',
    tags: [],
    name: '영양제',
    price: null,
    desc: '피곤하고 기력이 빠지는 하루라도 이것 하나만 먹으면 바로 건강해질 수 있다. 밥 먹기가 귀찮아진다는 부작용이 있다.',
    effectText: '[쇠약] 즉시 회복',
    effect: { cureWeak: true },
    battle: false,
  },
  // ───────── 장비 (착용 부위: 무구 / 신체 / 장신구) ─────────
  // ───────── 제작 재료 (공작소 제작법용) ─────────
  {
    id: 'carving-knife',
    kind: 'material',
    tags: ['재료'],
    name: '조각칼',
    price: 10,
    desc: '결계 생성에 주로 사용한다. 손을 찍어버리지 않도록 조심하도록.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'pouch',
    kind: 'material',
    tags: ['재료'],
    name: '주머니',
    price: 8,
    desc: '손가락 두 마디 크기의 주머니, 작은 거라면 넣을 수 있다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'clover',
    kind: 'material',
    tags: ['재료'],
    name: '네잎클로버',
    price: null,
    desc: '뒷산 풀숲에서 용케 찾아낸 네잎클로버. 눌러 말리면 오래간다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'inkstick',
    kind: 'material',
    tags: ['재료'],
    name: '먹',
    price: null,
    desc: '곱게 갈면 짙은 먹물이 나오는 새 먹. 부러지지 않았다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  // ───────── 공작소에서 만드는 완성품 (사용 효과는 아직 정해지지 않았다) ─────────
  {
    id: 'feather-deco',
    kind: 'craft',
    tags: ['완성품'],
    name: '깃털 장식',
    price: null,
    desc: '언제까지나 차있는 둥지는 없다. 새들은 어디로 갔을까?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'jangseung-keyring',
    kind: 'craft',
    tags: ['완성품'],
    name: '장승 키링',
    price: null,
    desc: '옛날에는 영험했던 것인지, 가지고 있으면 안전한 기분이 든다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'green-charm',
    kind: 'craft',
    tags: ['완성품'],
    name: '녹색 부적',
    price: null,
    desc: '태우면 마음이 안정된다. 뒤에 산이 있는 만큼 화기를 사용할 때는 주의할 것.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'clover-bookmark',
    kind: 'craft',
    tags: ['완성품'],
    name: '네잎클로버 책갈피',
    price: null,
    desc: '가지고 있는 것만으로 행운을 가져다 줄 것 같은 책갈피.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'jaeaek-charm',
    kind: 'craft',
    tags: ['완성품'],
    name: '재액부',
    price: null,
    desc: '사람 같은 비명 소리가 난다. 사용시에는 귀를 막을 것. 귀를 막지 않았다면 양호실로 뛰어가자.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'exorcism-gate',
    kind: 'craft',
    tags: ['완성품'],
    name: '축귀문',
    price: null,
    desc: '끔찍한 냄새가 난다. 이쪽으로 가까이 다가오기 싫을 정도로!',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'red-fox-charm',
    kind: 'craft',
    tags: ['완성품'],
    name: '붉은여우 부적',
    price: null,
    desc: '여우 꼬리털을 넣은 임시 부적. \'다른 것\'이 되는 기분을 느낄 수 있다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'spirit-disposable',
    kind: 'craft',
    tags: ['완성품'],
    name: '일회용 수호령',
    price: null,
    desc: '보기엔 흉물스러운 경우가 많다. 진품과 가품 구분도 모호하기에 직접 만들어서 쓰는 걸 추천한다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'uniform',
    kind: 'gear',
    slot: 'body',
    tags: ['완성품', '신체'],
    name: '교복',
    price: null,
    desc: '국립 창록고등학교에서 지어주는 교복. 부드러운 전통 옷감은 겨울엔 따뜻하고, 여름엔 시원한 느낌을 내준다.',
    effectText: '착용에 의한 효과는 없다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'gymwear',
    kind: 'gear',
    slot: 'body',
    tags: ['완성품', '신체'],
    name: '무복',
    price: null,
    desc: '국립 창록고등학교에서 지어주는 체육복. 현대식으로 재해석한 무복에 활동성 좋은 각종 소재를 덧대어 만들었다.',
    effectText: '착용 시 호전, 절제 각각 +1 보정.',
    effect: {},
    bonus: { aggression: 1, control: 1 },
    battle: false,
  },
  // ───────── 무구 (처음엔 육조 스탯 보정이 없다. 대신 특수 효과 · 무구보관소에서 강화) ─────────
  {
    id: 'w-fan',
    kind: 'gear',
    slot: 'weapon',
    fx: 'fan',
    tags: ['완성품', '무구'],
    name: '부채',
    price: null,
    desc: '옛 선조들의 바람 같은 성정을 그대로 담은, 한지로 만든 줄부채. 학생에 따라 다른 그림이 그려져 있다. 부적처럼 한자를 적는 사람도 적지 않다.',
    effectText: '전투에 돌입할 때 무조건 나 또는 나의 일행이 선공을 가져온다. 또한, 적의 모든 공격 명중률이 (10 + 1d이해)%만큼 줄어든다(아예 빗나간다).',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-spear',
    kind: 'gear',
    slot: 'weapon',
    fx: 'spear',
    tags: ['완성품', '무구'],
    name: '창',
    price: null,
    desc: '삼지창 등 기다란 봉 끝에 날이 달려 앞으로 쭉 내지를 수 있는 무기. 장창의 관통력은 타의 추종을 불허한다.',
    effectText: '매 공격마다 (10 + 호전/2, 내림)% 확률로 치명타. 공격력이 적용되는 영능력·일반 공격·부적·효험에 적용되며, 치명타가 나면 그 공격이 1.5배로 들어간다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-dagger',
    kind: 'gear',
    slot: 'weapon',
    fx: 'dagger',
    tags: ['완성품', '무구'],
    name: '단검',
    price: null,
    desc: '호신도, 은장도 등 손에 붙는 짧은 날붙이. 비록 길이는 짧지만 그 존재를 무시해서는 순식간에 목숨이 끊기고 말 것이다.',
    effectText: '상대의 체력이 35% 미만으로 떨어지면 기본 공격력이 1.5배(내림)가 된다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-sword',
    kind: 'gear',
    slot: 'weapon',
    fx: 'sword',
    tags: ['완성품', '무구'],
    name: '칼',
    price: null,
    desc: '기본형은 허리춤에 차는 환도가 권장되나 언월도, 망나니칼 등 날이 크고 기다란 것을 위험천만하게 다루는 담력 있는 이들도 적지 않다.',
    effectText: '막기에 성공했는지와 상관없이, 적의 공격 대상이 될 때마다 반격한다. (1d호전×2 피해) 이때 막기 중이면서 기존 반격 강화 조건(완전 방어 또는 호전이 상대보다 높음)도 함께 달성하면, 반격 피해가 1d호전×3으로 올라간다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-bow',
    kind: 'gear',
    slot: 'weapon',
    fx: 'bow',
    tags: ['완성품', '무구'],
    name: '활',
    price: null,
    desc: '한민족의 영혼을 내려받은 국궁용 활. 자유롭게 다룰 수 있도록 탄력이 좋은 소재로 다루어져 있는 것이 기본이나, 다루는 사람에 따라 자유롭게 꾸미기도 한다.',
    effectText: '모든 공격이 반드시 명중한다. (호전)% 확률로 상대의 방어 태세를 무시한다. 단체 전투일 경우 전원에게 적용된다 — 활을 든 사람이 한 명만 있어도 일행 전원이 이 효과를 받는다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-bell',
    kind: 'gear',
    slot: 'weapon',
    fx: 'bell',
    tags: ['완성품', '무구'],
    name: '무당방울',
    price: null,
    desc: '무당들이 굿을 할 때 쓰는 방울. 방울은 신을 부르기도 쫓기도 다루기도 하며 인간과 삶의 다리를 잇는 무당들의 삶을 그대로 드러내었다.',
    effectText: '버티기를 시도할 수 있는 횟수가 1회 늘어난다. (0이 된 의지력은 자동으로 채워지지 않으며, 의지력이 0이면 두 번째 버티기도 할 수 없다.) 또한 소지자의 매 턴마다 (이해)% 확률로 1d(이해)만큼 같은 파티원 전원(본인 포함)의 체력이 회복된다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-instrument',
    kind: 'gear',
    slot: 'weapon',
    fx: 'instrument',
    tags: ['완성품', '무구'],
    name: '악기',
    price: null,
    desc: '예나 지금이나 사람의 마음을 움직일 수 있는 가장 좋은 무구. 꽹과리나 가야금, 장구, 단소 등 그 종류는 다양하다.',
    effectText: '같은 파티원(본인 포함)의 모든 공격 행동 및 막기 반격에 [이해] 값만큼 공격력 보정이 고정으로 붙는다. (더 이상 주사위를 굴리지 않는다) 단, 악기를 든 사람 자신에게 적용될 때는 그 보정의 75%만 적용된다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-sickle',
    kind: 'gear',
    slot: 'weapon',
    fx: 'sickle',
    tags: ['완성품', '무구'],
    name: '낫',
    price: null,
    desc: '원래는 풀을 베는 도구였다. 식물의 목숨이나 뺏어야 했을 날붙이가 사람을 향하게 된 역사는 생각 이상으로 복잡하고 길다고 한다.',
    effectText: '전투를 마치고 받는 보상이 1.5배(올림)로 늘어난다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-staff',
    kind: 'gear',
    slot: 'weapon',
    fx: 'staff',
    tags: ['완성품', '무구'],
    name: '석장',
    price: null,
    desc: '불교에서 수행자들이 사용하는 의식 도구. 깊은 불심을 가진 사람이 주술을 시전하는 데에 도움을 주거나 영능력을 보조하는 데에 쓰인다.',
    effectText: '전투 중 모든 의지력 소모가 20% 줄어든다. (소수점 내림)',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'w-mace',
    kind: 'gear',
    slot: 'weapon',
    fx: 'mace',
    tags: ['완성품', '무구'],
    name: '철퇴',
    price: null,
    desc: '막대 끝에 무게추가 달린 형태의 무기. 다양한 형태가 하나같이 뛰어난 파괴력을 가졌으나, 그 파괴력을 제어하지 못하면 스스로가 크게 다칠 수 있다.',
    effectText: '모든 기본 공격력이 1.5배(내림)가 된다. 단, 적에게서 받는 모든 공격도 1.5배가 된다.',
    effect: {},
    bonus: {},
    battle: false,
  },
  {
    id: 'polishing-stone', kind: 'tool', tags: ['완성품', '무구 강화'], name: '연마석',
    price: null, desc: '무구를 다듬을 때 쓰는 단단한 연마석.', effectText: '무구 일반 강화와 특수 강화에 쓰이는 재료.', effect: {}, battle: false,
  },
  {
    id: 'plain-cloth', kind: 'tool', tags: ['완성품', '특수 강화 해제'], name: '무명천',
    price: null, desc: '아무 문양도 없는 고운 무명천. 무구에 깃든 특수한 기운을 씻어 낸다.',
    effectText: '무구보관소에서 특수 강화를 제거하고 사용했던 화투패를 돌려받는다. 일반 강화는 유지된다.', effect: {}, battle: false,
  },
  // ───────── 무구 강화 재료(완성품): 스탯 0→1 숫돌 · 1→2 기름 먹인 천 · 2→3 오색 매듭 · 3→4 주사 호신부 · 4→5 은입사 장식 ─────────
  {
    id: 'whetstone',
    kind: 'tool',
    tags: ['완성품', '무구 강화'],
    name: '숫돌',
    price: null,
    desc: '날을 세우는 데 쓰는 곱게 갈린 숫돌. 무구에 처음 손을 대는 사람이 가장 먼저 찾는다.',
    effectText: '무구보관소에서 무구를 강화할 때 쓴다.',
    effect: {},
    battle: false,
  },
  {
    id: 'oil-cloth',
    kind: 'tool',
    tags: ['완성품', '무구 강화'],
    name: '기름 먹인 천',
    price: null,
    desc: '무구의 날과 자루를 닦아 윤을 내는 천. 손에 쥐는 맛이 달라진다.',
    effectText: '무구보관소에서 무구를 일반 강화할 때 쓰는 재료다.',
    effect: {},
    battle: false,
  },
  {
    id: 'five-knot',
    kind: 'tool',
    tags: ['완성품', '무구 강화'],
    name: '오색 매듭',
    price: null,
    desc: '무구의 자루에 다는 오방색 매듭. 눈에 익은 장식이 쥔 사람의 마음가짐까지 가다듬는다.',
    effectText: '무구보관소에서 무구를 일반 강화할 때 쓰는 재료다.',
    effect: {},
    battle: false,
  },
  {
    id: 'cinnabar-charm',
    kind: 'tool',
    tags: ['완성품', '무구 강화'],
    name: '주사 호신부',
    price: null,
    desc: '붉은 주사로 한 획 한 획 써 내린 작은 부적. 무구에 붙여 두면 쓰는 이의 기운이 한결 안정된다.',
    effectText: '무구보관소에서 무구를 일반 강화할 때 쓰는 재료다.',
    effect: {},
    battle: false,
  },
  {
    id: 'silver-inlay',
    kind: 'tool',
    tags: ['완성품', '무구 강화'],
    name: '은입사 장식',
    price: null,
    desc: '무구에 은실을 박아 넣는 장인의 장식. 이 단계까지 오른 무구는 더 손댈 곳이 없다고들 한다.',
    effectText: '무구보관소에서 무구를 일반 강화할 때 쓰는 재료다.',
    effect: {},
    battle: false,
  },
  ...[
    ['pine', '소나무 패', '1월 소나무', '전투불능이 되지 않고 승리하면 전투 직전의 체력과 의지력으로 복구된다.'],
    ['plum', '매화 패', '2월 매화', '전투 중 사용할 수 있는 의지력이 150이 된다.'],
    ['cherry', '벚꽃 패', '3월 벚꽃', '전투 중 매 턴, 체력이 30% 미만인 아군은 장착자의 이해/3만큼 회복한다.'],
    ['black-wisteria', '흑싸리 패', '4월 흑싸리', '공격 명중 시 간파를 쓰지 않아도 상대의 행동을 2턴 더 확인한다. 간파와 중첩된다.'],
    ['orchid', '난초 패', '5월 난초', '전투 중 장착자가 직접 목격한 영능력 1회를 턴 소모 없이 무효화한다.'],
    ['peony', '모란 패', '6월 모란', '간파를 한 번도 쓰지 않고 승리하면 승리 보상이 2배가 된다.'],
    ['red-wisteria', '홍싸리 패', '7월 홍싸리', '직접 일반 공격을 선택할 수 없는 대신 반격 피해가 항상 2배가 된다. 돌발 행동 공격은 유지된다.'],
    ['gwangsan', '공산 패', '8월 공산', '강공을 막아 반격에 성공하면 적의 향후 5턴 방어 태세가 행동 없음으로 바뀐다.'],
    ['chrysanthemum', '국화 패', '9월 국화', '전투당 최초로 체력이 0이 되는 피해를 대가 없이 무효화한다.'],
    ['maple', '단풍 패', '10월 단풍', '모든 공격력에 +10%(올림) 보정이 붙는다.'],
    ['paulownia', '오동 패', '11월 오동', '장착자가 주고받는 모든 종류의 피해가 10%(올림) 감소한다.'],
    ['willow', '버드나무 패', '12월 버드나무', '전투 중 적이 아군을 대상으로 영능력을 쓰려 할 때 이해/2% 확률로 행동을 다시 굴린다.'],
  ].map(([id, name, month, effectText]) => ({ id: `hwatu-${id}`, kind: 'tool', tags: ['완성품', '특수 강화 패'], name, price: null, desc: `${month}에 대응하는 무구 특수 강화용 화투패.`, effectText, effect: {}, battle: false })),
]

/**
 * 분류 태그: [완성품] 바로 사용할 수 있는 아이템 / [재료] 다른 것의 재료로 쓰이는 것. 둘 다 붙을 수도 있다.
 * tags 에 둘 중 하나라도 직접 적어 두면 그대로 따르고, 안 적으면 kind 로 정한다. (재료 kind → [재료], 그 밖 → [완성품])
 */
export const CAT_ITEM = '완성품'
export const CAT_MATERIAL = '재료'
export const MATERIAL_TEXT = '제작 재료로 쓰인다.'
export const ITEMS = RAW_ITEMS.map((it) => {
  const tags = it.tags ?? []
  if (tags.includes(CAT_ITEM) || tags.includes(CAT_MATERIAL)) {
    // [재료] 태그가 붙은 아이템은 효과 문구를 '제작 재료로 쓰인다.'로 통일한다.
    return tags.includes(CAT_MATERIAL) && !it.effectText ? { ...it, effectText: MATERIAL_TEXT } : it
  }
  return { ...it, tags: [it.kind === 'material' ? CAT_MATERIAL : CAT_ITEM, ...tags], ...(it.kind === 'material' && !it.effectText ? { effectText: MATERIAL_TEXT } : {}) }
})

// ───────── 무구는 한 벌마다 따로 ─────────
// 무구 한 벌 = 소지품의 고유 id `기본id#꼬리` (예: 'w-sword#k3f9a1') 1개. 강화(player.enh)와 착용(equip.weapon)도 이 id 로 붙는다.
// 그래서 같은 칼이 두 자루여도 서로 다르게 강화할 수 있고, 선물 · 착용 · 소지품이 모두 기존 방식 그대로 돈다.
const BASE = new Map(ITEMS.map((i) => [i.id, i]))
const INST = new Map()
export const isInstance = (id) => typeof id === 'string' && id.includes('#')
export const baseIdOf = (id) => (isInstance(id) ? id.split('#')[0] : id)
export function itemOf(id) {
  if (!id) return undefined
  const b = BASE.get(id)
  if (b) return b
  if (!isInstance(id)) return undefined
  let v = INST.get(id)
  if (!v) {
    const base = BASE.get(id.split('#')[0])
    if (!base || base.slot !== 'weapon' || !/^[a-z0-9]{4,12}$/.test(id.split('#')[1] ?? '')) return undefined
    v = { ...base, id, baseId: base.id, inst: true }
    INST.set(id, v)
  }
  return v
}
const newTail = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0')
/** 매점에서 파는 아이템 (price 가 있는 것) */
export const STORE_ITEMS = ITEMS.filter((i) => i.price != null)
export const isMaterial = (item) => item.kind === 'material'
export const isGear = (item) => item.kind === 'gear'

// ───────── 장비 ─────────
export const EQUIP_SLOTS = [
  { id: 'weapon', label: '무구' },
  { id: 'body', label: '신체' },
  { id: 'trinket', label: '장신구' },
]
/** 기본 착용: 무구·장신구는 비어 있고, 신체엔 교복. */
export const DEFAULT_EQUIP = { weapon: null, body: 'uniform', trinket: null }
export const equipOf = (player) => ({ ...DEFAULT_EQUIP, ...(player.equip ?? {}) })
/** 착용한 장비들의 스탯 보정 합계 */
export function gearBonus(player) {
  const out = {}
  for (const id of Object.values(equipOf(player))) {
    const it = id && itemOf(id)
    for (const [k, v] of Object.entries(it?.bonus ?? {})) out[k] = (out[k] || 0) + v
    for (const [k, v] of Object.entries(player.enh?.[id] ?? {})) out[k] = (out[k] || 0) + v // 강화로 얻은 보정
  }
  return out
}
/** 지금 든 무구의 특수 효과 id (없으면 null) */
export const weaponFx = (player) => itemOf(equipOf(player).weapon)?.fx ?? null

// ───────── 무구 강화 v74 ─────────
// 강화 1회당 선택 스탯 +1, 무구당 총 15포인트. 매회 연마석 1개와 의지력 20 소모.
export const ENH_MAX = 15
export const ENH_TIER_SIZE = 1
export const ENH_ITEMS = ['polishing-stone', 'whetstone', 'oil-cloth', 'five-knot', 'cinnabar-charm', 'silver-inlay', 'plain-cloth']
/** 강화 단계에 따라 연마석, 보조 재료, 영력 비용이 올라간다. */
export function enhCostFor(level) {
  const lv = Math.max(0, Math.floor(level))
  if (lv >= ENH_MAX) return null
  const tier = Math.floor(lv / 3)
  return {
    polishing: tier + 1,
    material: ['whetstone', 'oil-cloth', 'five-knot', 'cinnabar-charm', 'silver-inlay'][tier],
    quantity: lv % 3 + 1,
    spirit: (tier + 1) * 10,
  }
}
export const enhMaterialFor = (level = 0) => enhCostFor(level)?.material ?? null
export const SPECIAL_ENHANCEMENTS = [
  { id: 'pine', card: 'hwatu-pine', title: '솔의', displayTitle: '솔의', effect: '전투불능 없이 승리하면 전투 직전 체력·의지력 복구' },
  { id: 'plum', card: 'hwatu-plum', title: '매화의', displayTitle: '매화의', effect: '전투 중 의지력 150' },
  { id: 'cherry', card: 'hwatu-cherry', title: '벚꽃의', displayTitle: '벚꽃의', effect: '매 턴 체력 30% 미만 아군을 이해/3 회복' },
  { id: 'black-wisteria', card: 'hwatu-black-wisteria', title: '흑등나무의', displayTitle: '흑등나무의', effect: '공격 명중 시 상대 행동 확인 +2턴' },
  { id: 'orchid', card: 'hwatu-orchid', title: '난초의', displayTitle: '난초의', effect: '목격한 영능력 최초 1회 무효화' },
  { id: 'peony', card: 'hwatu-peony', title: '모란의', displayTitle: '모란의', effect: '간파 미사용 승리 보상 2배' },
  { id: 'red-wisteria', card: 'hwatu-red-wisteria', title: '홍싸리나무의', displayTitle: '홍싸리나무의', effect: '직접 일반 공격 불가, 반격 피해 2배' },
  { id: 'gwangsan', card: 'hwatu-gwangsan', title: '공산의', displayTitle: '공산의', effect: '강공 막기 반격 성공 시 적 방어 태세 5턴 무효화' },
  { id: 'chrysanthemum', card: 'hwatu-chrysanthemum', title: '국화의', displayTitle: '국화의', effect: '전투당 최초 치명 피해 무효화' },
  { id: 'maple', card: 'hwatu-maple', title: '단풍의', displayTitle: '단풍의', effect: '공격력 +10%(올림)' },
  { id: 'paulownia', card: 'hwatu-paulownia', title: '오동의', displayTitle: '오동의', effect: '주는/받는 피해 -10%(올림)' },
  { id: 'willow', card: 'hwatu-willow', title: '버드나무의', displayTitle: '버드나무의', effect: '적의 아군 대상 영능력 이해/2%로 재굴림' },
]
export const specialEnhOf = (player, weaponId) => player.weaponSpecial?.[weaponId] ?? null
export const specialTitleOf = (player, weaponId) => SPECIAL_ENHANCEMENTS.find(x => x.id === specialEnhOf(player, weaponId))?.title ?? ''
export const ENH_STATS = ['insight', 'comprehension', 'control', 'endurance', 'aggression', 'agility']
export const WEAPONS = ITEMS.filter((i) => i.kind === 'gear' && i.slot === 'weapon') // 무구 종류(기본형)
/** 새 무구 한 벌을 소지품에 넣는다. 반환 { player, id } */
export function giveWeapon(player, baseId, enh) {
  let id
  do id = `${baseId}#${newTail()}`
  while (player.inventory?.[id] || equipOf(player).weapon === id)
  const next = { ...player, inventory: { ...(player.inventory ?? {}), [id]: 1 } }
  if (enh && Object.keys(enh).length) next.enh = { ...(player.enh ?? {}), [id]: { ...enh } }
  return { player: next, id }
}
/** 소지품에 있는 모든 것(무구는 한 벌씩) 을 아이템 객체로. ITEMS 순서대로. */
export function ownedItems(player) {
  const order = new Map(ITEMS.map((it, i) => [it.id, i]))
  return Object.keys(player.inventory ?? {})
    .filter((id) => player.inventory[id] > 0)
    .map((id) => itemOf(id))
    .filter(Boolean)
    .sort((a, b) => (order.get(baseIdOf(a.id)) ?? 99) - (order.get(baseIdOf(b.id)) ?? 99) || (a.id < b.id ? -1 : 1))
}
/** 내 무구들(끼고 있는 것 먼저, 그다음 소지품의 것들) */
export function ownedWeapons(player) {
  const eq = equipOf(player).weapon
  const list = ownedItems(player).filter((i) => i.slot === 'weapon')
  return eq && itemOf(eq) ? [itemOf(eq), ...list] : list
}
/** 예전 저장분 정리: 종류 단위로 들고 있던 무구('w-sword' ×n, 종류별 강화, 착용)를 한 벌씩 따로 나눈다. 바뀐 게 없으면 같은 player. */
export function migrateWeapons(player) {
  const inv = player.inventory ?? {}
  const bare = Object.keys(inv).filter((id) => inv[id] > 0 && !isInstance(id) && BASE.get(id)?.slot === 'weapon')
  const eqW = equipOf(player).weapon
  const eqBare = eqW && !isInstance(eqW) && BASE.get(eqW)?.slot === 'weapon' ? eqW : null
  if (!bare.length && !eqBare) return player
  let p = { ...player, inventory: { ...inv } }
  const oldEnh = { ...(player.enh ?? {}) }
  const enhLeft = { ...oldEnh }
  const claim = (base) => {
    const e = enhLeft[base]
    delete enhLeft[base]
    return e
  }
  if (eqBare) {
    const e = claim(eqBare)
    const r = giveWeapon(p, eqBare, e)
    p = { ...r.player, inventory: { ...r.player.inventory }, equip: { ...(p.equip ?? {}), weapon: r.id } }
    delete p.inventory[r.id] // 끼고 있는 건 소지품이 아니라 착용 칸에
  }
  for (const base of bare) {
    for (let i = 0; i < inv[base]; i++) {
      const r = giveWeapon(p, base, i === 0 ? claim(base) : undefined)
      p = r.player
    }
    delete p.inventory[base]
  }
  // 아직 주인을 못 찾은 강화는 버린다(종류만 남고 갖고 있지 않던 경우).
  const enh = Object.fromEntries(Object.entries(p.enh ?? {}).filter(([id]) => isInstance(id)))
  return { ...p, enh }
}
export const enhLevel = (player, weaponId, stat) => player.enh?.[weaponId]?.[stat] || 0
export const enhTotal = (player, weaponId) => Object.values(player.enh?.[weaponId] ?? {}).reduce((a, b) => a + b, 0)
/** 이 무구를 지금 갖고(들고) 있는가 */
export const ownsWeapon = (player, id) => countOf(player, id) > 0 || equipOf(player).weapon === id
/**
 * 강화 한 번: 무구의 육조 스탯 하나를 +1. 재료는 그 스탯의 현재 수치에 맞는 완성품 1개. (관리자는 재료를 쓰지 않는다)
 * 반환 { player, from, to, material } 또는 { error }
 */
export function enhanceWeapon(player, weaponId, stat, admin = false) {
  const w = itemOf(weaponId)
  if (!w || w.slot !== 'weapon') return { error: '무구가 아니다.' }
  if (!ownsWeapon(player, weaponId)) return { error: '그 무구를 갖고 있지 않다.' }
  if (!ENH_STATS.includes(stat)) return { error: '올릴 수 없는 스탯이다.' }
  const total = enhTotal(player, weaponId)
  if (total >= ENH_MAX) return { error: '이 무구는 일반 강화 15포인트를 모두 사용했다.' }
  const cost = enhCostFor(total)
  const material = cost.material
  let inventory = { ...(player.inventory ?? {}) }
  if (!admin) {
    if ((player.spirit ?? 0) < cost.spirit) return { error: `영력이 ${cost.spirit} 필요하다.` }
    if (countOf(player, 'polishing-stone') < cost.polishing) return { error: `연마석이 ${cost.polishing}개 필요하다.` }
    if (countOf(player, material) < cost.quantity) return { error: `${itemOf(material)?.name}이(가) ${cost.quantity}개 필요하다.` }
    for (const [id, qty] of [['polishing-stone', cost.polishing], [material, cost.quantity]]) {
      inventory[id] -= qty
      if (inventory[id] <= 0) delete inventory[id]
    }
  }
  const from = enhLevel(player, weaponId, stat)
  const enh = { ...(player.enh ?? {}), [weaponId]: { ...(player.enh?.[weaponId] ?? {}), [stat]: from + 1 } }
  return { player: { ...player, inventory, spirit: admin ? player.spirit : player.spirit - cost.spirit, enh }, from, to: from + 1, total: total + 1, material, cost }
}

/** 화투패로 특수 강화. 무구당 1종, 같은 특수 강화 중복 불가. */
export function specialEnhanceWeapon(player, weaponId, specialId, admin = false) {
  const w = itemOf(weaponId)
  if (!w || w.slot !== 'weapon' || !ownsWeapon(player, weaponId)) return { error: '강화할 무구를 소지하고 있지 않다.' }
  if (specialEnhOf(player, weaponId)) return { error: '이 무구에는 이미 특수 강화가 붙어 있다.' }
  const sp = SPECIAL_ENHANCEMENTS.find(x => x.id === specialId)
  if (!sp) return { error: '존재하지 않는 특수 강화다.' }
  if (Object.values(player.weaponSpecial ?? {}).includes(specialId)) return { error: '동일한 특수 강화는 중복해서 붙일 수 없다.' }
  if (!admin) {
    if ((player.mp ?? 0) < 50) return { error: '의지력이 50 필요하다.' }
    if ((player.spirit ?? 0) < 50) return { error: '영력이 50 필요하다.' }
    if ((player.money ?? 0) < 500) return { error: '500냥이 필요하다.' }
    if (countOf(player, sp.card) < 1) return { error: `${itemOf(sp.card)?.name ?? '해당 화투패'}가 필요하다.` }
    if (countOf(player, 'whetstone') < 1) return { error: '숫돌 1개가 필요하다.' }
  }
  const inventory = { ...(player.inventory ?? {}) }
  if (!admin) {
    for (const id of [sp.card, 'whetstone']) { inventory[id] = (inventory[id] ?? 0) - 1; if (inventory[id] <= 0) delete inventory[id] }
  }
  return { player: { ...player, inventory, mp: admin ? player.mp : player.mp - 50, spirit: admin ? player.spirit : player.spirit - 50, money: admin ? player.money : player.money - 500, weaponSpecial: { ...(player.weaponSpecial ?? {}), [weaponId]: specialId } }, special: sp }
}
/** 무명천으로 무구의 특수 강화만 떼고 화투패를 되돌려준다. */
export function removeWeaponSpecial(player, weaponId, admin = false) {
  if (!ownsWeapon(player, weaponId)) return { error: '소지한 무구가 아니다.' }
  const id = specialEnhOf(player, weaponId)
  const special = SPECIAL_ENHANCEMENTS.find((s) => s.id === id)
  if (!special) return { error: '특수 강화가 붙어 있지 않다.' }
  if (!admin && countOf(player, 'plain-cloth') < 1) return { error: '무명천이 1개 필요하다.' }
  const inventory = { ...(player.inventory ?? {}) }
  if (!admin) {
    inventory['plain-cloth'] -= 1
    if (inventory['plain-cloth'] <= 0) delete inventory['plain-cloth']
  }
  inventory[special.card] = (inventory[special.card] || 0) + 1
  const weaponSpecial = { ...(player.weaponSpecial ?? {}) }
  delete weaponSpecial[weaponId]
  return { player: { ...player, inventory, weaponSpecial }, special }
}
/** 본인 소지품에서 아이템을 버린다. 장착 장비는 먼저 해제해야 한다. */
export function discardInventoryItem(player, itemId, amount) {
  const qty = Number(amount)
  const it = itemOf(itemId)
  if (!it || !Number.isSafeInteger(qty) || qty < 1 || qty > (player.inventory?.[itemId] || 0)) return { error: '버릴 수량이나 소지품이 올바르지 않다.' }
  if (it.id === 'uniform' || it.tags?.includes('버릴 수 없음')) return { error: '버릴 수 없는 물건이다.' }
  if (it.slot === 'weapon' && qty !== 1) return { error: '무구는 한 벌씩 버려야 한다.' }
  const inventory = { ...(player.inventory ?? {}) }
  inventory[itemId] -= qty
  if (!inventory[itemId]) delete inventory[itemId]
  const enh = { ...(player.enh ?? {}) }, weaponSpecial = { ...(player.weaponSpecial ?? {}) }
  if (it.slot === 'weapon') { delete enh[itemId]; delete weaponSpecial[itemId] }
  return { player: { ...player, inventory, enh, weaponSpecial }, name: it.name, amount: qty }
}
/**
 * 선물로 무구를 보낼 때 함께 가는 강화: 보낸 뒤에 그 무구를 더는 갖고(끼고) 있지 않을 때만 강화가 따라간다.
 * (한 벌을 남겨 두고 하나만 보내면 강화는 남은 쪽에 그대로 있다. 복사되지 않는다.)
 * 반환 { [무구 id]: { 스탯: 수치 } }
 */
export function giftEnhOf(player, items) {
  const out = {}
  for (const [id, n] of Object.entries(items ?? {})) {
    const it = itemOf(id)
    if (!it || it.slot !== 'weapon' || !player.enh?.[id]) continue
    const keeps = countOf(player, id) - n > 0 || equipOf(player).weapon === id
    if (!keeps) out[id] = { ...player.enh[id] }
  }
  return out
}
/** 받은 강화를 합친다: 스탯마다 더 높은 쪽. */
export function mergeEnh(player, incoming) {
  const enh = { ...(player.enh ?? {}) }
  for (const [id, stats] of Object.entries(incoming ?? {})) {
    if (itemOf(id)?.slot !== 'weapon') continue
    const cur = { ...(enh[id] ?? {}) }
    for (const [s, v] of Object.entries(stats ?? {})) {
      if (!ENH_STATS.includes(s)) continue
      const lv = Math.max(0, Math.min(ENH_MAX, Math.floor(Number(v) || 0)))
      if (lv > (cur[s] || 0)) cur[s] = lv
    }
    if (Object.keys(cur).length) enh[id] = cur
  }
  return { ...player, enh }
}
/** 보낸 쪽: 강화가 따라간 무구의 강화 기록을 지운다. */
export function dropEnh(player, ids) {
  if (!ids.length || !player.enh) return player
  const enh = { ...player.enh }
  for (const id of ids) delete enh[id]
  return { ...player, enh }
}
/** 착용. 같은 부위에 입고 있던 건 소지품으로 돌아온다. { player } 또는 { error } */
export function equipItem(player, id) {
  const it = itemOf(id)
  if (!it || !isGear(it)) return { error: '장비가 아니다.' }
  if (!countOf(player, id)) return { error: '갖고 있지 않다.' }
  const eq = equipOf(player)
  const old = eq[it.slot]
  const inv = { ...player.inventory, [id]: countOf(player, id) - 1 }
  if (inv[id] <= 0) delete inv[id]
  if (old) inv[old] = (inv[old] || 0) + 1
  return { player: { ...player, inventory: inv, equip: { ...eq, [it.slot]: id } } }
}
/** 벗기. 신체는 다른 옷으로 갈아입어야 한다. */
export function unequipSlot(player, slot) {
  const eq = equipOf(player)
  if (slot === 'body') return { error: '신체 장비는 벗을 수 없다. 다른 옷으로 갈아입자.' }
  const old = eq[slot]
  if (!old) return { error: '비어 있다.' }
  return { player: { ...player, inventory: { ...player.inventory, [old]: (player.inventory?.[old] || 0) + 1 }, equip: { ...eq, [slot]: null } } }
}

/** 매점 영업시간: 오전 8시 ~ 밤 10시 (기기의 현재 시각 기준). 지금은 enforce:false 라 늘 열려 있다. true 로 바꾸면 영업시간에만 연다. */
export const STORE_HOURS = { enforce: false, open: 8, close: 22 }
export const isStoreOpen = (now = Date.now()) => {
  if (!STORE_HOURS.enforce) return true
  const h = new Date(now).getHours()
  return h >= STORE_HOURS.open && h < STORE_HOURS.close
}

export const countOf = (player, id) => player.inventory?.[id] || 0

/** 지금 이 아이템을 쓸 수 있는가. { ok, why } */
export function canUseItem(item, { inBattle, isParty, countNow, reviveOn, boostOn, usedThisBattle }) {
  if (!countNow) return { ok: false, why: '갖고 있지 않다' }
  if (isMaterial(item)) return { ok: false, why: '재료 아이템이다. 직접 쓰는 물건이 아니다' }
  if (isGear(item)) return { ok: false, why: '착용하는 장비다' }
  if (item.kind === 'craft') return { ok: false, why: '아직 쓸 수 있는 효과가 없다' }
  if (item.kind === 'tool') return { ok: false, why: '무구보관소에서 무구를 강화할 때 쓴다' }
  if (item.giftNpc && !inBattle) return { ok: false, why: '전투 중이 아닐 땐 NPC에게 건네면 호감도가 오른다. (NPC와 대화하는 곳에서)' }
  if (item.party && !isParty) return { ok: false, why: '일행(파티) 상태에서만 쓸 수 있다' }
  if (inBattle && !item.battle) return { ok: false, why: '전투 중에는 쓸 수 없다' }
  if (item.only === 'battle' && !inBattle) return { ok: false, why: '전투 중에만 쓸 수 있다' }
  if (item.effect.revive && inBattle && usedThisBattle) return { ok: false, why: '이 전투에서 이미 사용했다 (1회 한정)' }
  if (item.effect.revive && reviveOn) return { ok: false, why: '이미 효과가 걸려 있다' }
  if (item.effect.boost && boostOn) return { ok: false, why: '이미 효과가 걸려 있다' }
  return { ok: true }
}
