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
