// v-B.17 새 아이템 정의(다른 모듈을 불러오지 않는다 — items.js 가 바로 가져다 쓴다)
export const BAG_ID = 'bag'
export const BAG_SLOTS = 40
export const BAG_PRICE = 50

export const BAG_ITEM = {
  id: BAG_ID,
  kind: 'tool',
  tags: ['완성품', '가방'],
  name: '가방',
  price: BAG_PRICE,
  desc: '어깨에 메는 천 가방. 교과서보다 다른 것이 더 많이 들어 있는 게 학생 가방의 숙명이다.',
  effectText: `[가방 열기]로 물건을 넣고 꺼낸다. 가방 하나에 ${BAG_SLOTS}칸(소지품과 같은 칸 규칙: 재료 99개 · 그 밖 9개씩). 누구나 하나씩 갖고 시작한다.`,
  effect: {},
  battle: false,
}


// v-B.18 공작소에서 제작법에 없는 조합으로 만들면 나오는 것. 재료로 친다(매점에서 1냥).
export const TRASH_ID = 'trash'
export const TRASH_ITEM = {
  id: TRASH_ID,
  kind: 'material',
  tags: ['재료'],
  name: '쓰레기',
  price: null,
  desc: '무언가를 만들려고 했던 흔적. 무엇이었는지는 만든 사람만 안다. 아마 만든 사람도 모를 것이다.',
  effectText: '제작용 재료.',
  effect: {},
  battle: false,
}

// v-B.18 수달의 채집물(예전엔 잉어였다)
export const SHELL_ITEM = {
  id: 'shell',
  kind: 'material',
  tags: ['재료'],
  name: '조개껍데기',
  price: null,
  desc: '수달이 가지고 있었다. 바다로 갈 방법이 없는 우리들에게 유일하게 밖과 이어진 표식이다.',
  effectText: '제작용 재료',
  effect: {},
  battle: false,
}
// v-B.18 조개 목걸이(공작소: 조개껍데기 3 + 노끈 1)
export const SHELL_NECKLACE_ITEM = {
  id: 'shell-necklace',
  kind: 'gear',
  slot: 'trinket',
  tags: ['완성품', '장신구'],
  name: '조개 목걸이',
  price: null,
  desc: '알로하. …아, 이게 아니야?',
  effectText: '착용 시 신속 +2 · 이해 +1, 개척 성공 확률 +5%p',
  effect: {},
  bonus: { agility: 2, comprehension: 1 },
  hunt: { odds: 5 },
  battle: false,
}
// v-B.18 잃어버린 열쇠로 다른 학년 물품보관소를 열면 나온다. 쓰면 모든 완성품 가운데 하나(쓰레기일 수도 있다).
export const SOMEONES_BAG_ID = 'someones-bag'
export const SOMEONES_BAG_ITEM = {
  id: SOMEONES_BAG_ID,
  kind: 'misc',
  tags: [],
  name: '누군가의 가방',
  price: null,
  desc: '와, 도둑이야.',
  effectText: "사용하면 현존하는 '모든' 완성품 아이템 중 하나를 랜덤으로 하나 얻을 수 있다. 엄청난 게 들어올 수도 있지만, 쓰레기가 들어와도 책임 안 진다.",
  effect: { randomProduct: true },
  battle: false,
}
