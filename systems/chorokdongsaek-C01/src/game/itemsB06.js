/**
 * v-B.06 — 아이템 시트(초록동색_조사 및 스토리시트 · 아이템 목록)의 효과·설명과 맞춘 것.
 *  B06_ITEMS: 게임에 없던 아이템 (볍씨 · 밀 씨앗 · 보리 씨앗 · 도깨비 증표 · 소형 돌제단 · 나물무침 · 정체불능의 보약)
 *  B06_OVERRIDES: 이미 있던 아이템에서 바뀐 글 (자갈 → 자갈돌, 조리실 요리 설명 6종, 무당방울 효과, 강화 재료 문구)
 * 시트에서 비어 있는 칸(효과·설명)은 게임 쪽 글을 그대로 둔다. 보리 씨앗 설명만 시트가 비어 있어 밀 씨앗과 같은 결로 채웠다.
 */
export const B06_ITEMS = [
  { id: 'rice-grain', kind: 'material', tags: ['재료'], name: '볍씨', price: null, desc: '이 몇 씨앗 가지고 든든한 밥을 만들 수 있긴 할까? 최소 10알 이상은 모여야 뭐라도 할 수 있을 것 같다.', effectText: '제작용 재료', effect: {}, battle: false },
  { id: 'wheat-seed', kind: 'material', tags: ['재료'], name: '밀 씨앗', price: 3, storeOnly: 'garden', desc: '밀가루를 만드는 건 일단 꿈도 못 꿀 것 같은 작은 씨앗. 최소 10알 이상은 모여야 뭐라도 할 수 있을 것 같다.', effectText: '제작용 재료', effect: {}, battle: false },
  { id: 'barley-seed', kind: 'material', tags: ['재료'], name: '보리 씨앗', price: 3, storeOnly: 'garden', desc: '보리차 한 잔 끓이기에도 턱없이 모자란 작은 씨앗. 최소 10알 이상은 모여야 뭐라도 할 수 있을 것 같다.', effectText: '제작용 재료', effect: {}, battle: false },
  { id: 'goblin-token', kind: 'tool', tags: ['완성품', '무구 교환'], name: '도깨비 증표', price: null, desc: '도깨비들이 자신에게 흥미를 갖고 자신이 흥미를 가진 대상에게 나누어주는 특수한 증표.', effectText: '10개를 모을 시 무구보관소에서 무구 중 1개로 교환할 수 있다.', effect: {}, battle: false },
  { id: 'small-altar', kind: 'craft', tags: ['완성품'], name: '소형 돌제단', price: null, desc: '', effectText: '', effect: {}, battle: false },
  { id: 'herb-salad', kind: 'food', tags: ['완성품'], name: '나물무침', price: null, desc: '이런저런 나물을 한데 모아 섞어둔 것. 건강에 좋은 맛이 난다.', effectText: '', effect: {}, battle: false },
  { id: 'mystery-tonic', kind: 'food', tags: ['완성품'], name: '정체불능의 보약', price: null, desc: '', effectText: '', effect: {}, battle: false },
]

export const B06_OVERRIDES = {
  pebble: { name: '자갈돌', desc: '그냥 돌보다는 크고 바위보다는 작은 것. 이런 어중간한 크기라도 다 쓸 데가 있다.', effectText: '제작용 재료' },
  'snakeberry-jam': { desc: '대부분의 과일은 설탕을 넣고 가열하면 맛있어진다는 얘기가 있다. 그래서 과학실에 무단침입한 사람 누구냐?' },
  'mushroom-stew': { desc: '평범한 버섯전골. 너무 평범하다 못해 밋밋한 맛이 난다.' },
  'king-mushroom-stew': { desc: '정체를 알 수 없지만 먹을 수 있다는 사실만 명백한 왕버섯 전골.' },
  'poison-mushroom-stew': { desc: '겉보기로는 버섯 전골과 다름이 없어 보인다. 겉보기로는.' },
  bibimbap: { desc: '여럿이 합의하지 않고 가져온 재료로 만든 비빔밥이 제일 맛있다.' },
  'flower-pancake': { desc: '꽃으로 만들어지는 쫄깃하고 부드러운 전. 달큰하고 화한 맛이 입안 가득 퍼진다.' },
  // 무구 개선 (v-B.06): 무당방울 너프 — 회복 확률 (이해)% → 10%
  'w-bell': { effectText: '버티기를 시도할 수 있는 횟수가 1회 늘어난다. (0이 된 의지력은 자동으로 채워지지 않으며, 의지력이 0이면 두 번째 버티기도 할 수 없다.) 또한 소지자의 매 턴마다 10% 확률로 1d(이해)만큼 같은 파티원 전원(본인 포함)의 체력이 회복된다.' },
  // 강화 개선 (v-B.06): 규칙이 바뀌어 글도 맞춘다
  'polishing-stone': { effectText: '무구 일반 강화에 쓰는 재료. n번째 강화에 n개가 든다 (마지막 15번째는 15개). 공작소에서 숫돌 1개 + 자갈돌 1개로 만든다.' },
  whetstone: { effectText: '무구 일반 강화(1~3번째)와 특수 강화(화투패 1장 + 숫돌 9개)에 쓰는 재료.' },
}
