/** v79 이동 이벤트: 일반 대사 동등 확률 + 독립적인 5% 아이템 이벤트. */
export const TRAVEL_LINES = [
  '발목을 스치고 지나가는 날카로운 감각. 당신은 내려다보지 않기 위해 노력한다. 무시하고 걷자. 아래를 보거든 그것이 당신을 알아차리고 기어오를 것이다.',
  "도깨비 '이시'가 당신에게 친근하게 팔짱을 끼며 달라붙는다. 어딜 그렇게 바쁘게 가냐고 늘어져서 놀아달라고 요구하고 있다. 귀찮다.",
  '저만치 뒷산의 텃밭을 가꾸는 어른의 뒷모습이 보인다. 당신을 돌아보며 희미한 미소를 보인다.',
  '건물에 도착하기 전까지 긴장을 늦추지 말자.',
]
// v-B.07: 누군가가 잃어버린 열쇠(본관 3층 다른 학년 보관함을 몰래 열어보는 데 쓴다)도 함께 줍는다.
export const LOST_THINGS = ['lost-hairband', 'lost-slippers', 'lost-phone', 'lost-love-letter', 'lost-key']
// v-B.17: 이동 중 [누군가가 잃어버린~] 분실물을 주울 확률은 5%. 그 5% 안에서 열쇠 8%, 나머지 네 개가 92%를 똑같이(23%씩) 나눈다.
export const LOST_CHANCE = 0.05
export const LOST_KEY_SHARE = 0.08
export const LOST_WEIGHTS = { 'lost-key': LOST_KEY_SHARE, ...Object.fromEntries(LOST_THINGS.filter((id) => id !== 'lost-key').map((id) => [id, (1 - LOST_KEY_SHARE) / 4])) }
// 선생님 사탕은 분실물과 겹치지 않는 별도 2.5%(예전과 같은 전체 확률)다.
export const CANDY_CHANCE = 0.025
export function pickLostThing(r) {
  let acc = 0
  for (const id of LOST_THINGS) {
    acc += LOST_WEIGHTS[id]
    if (r < acc) return id
  }
  return LOST_THINGS[LOST_THINGS.length - 2]
}
export function rollTravelEvent(rng=Math.random) {
  const text = TRAVEL_LINES[Math.floor(rng()*TRAVEL_LINES.length)]
  if (rng() < LOST_CHANCE) return { text: '발에 무언가가 채인다. 이게 뭐지? 허리를 숙여 확인해보니 분실물인 것 같다. 학생들이 많이 오가는 매점에 가져다줄까?', reward: pickLostThing(rng()) }
  if (rng() < CANDY_CHANCE / (1 - LOST_CHANCE)) return { text: '선생님 중 한 명이 웃으며 손을 내밀라는 시늉을 한다. 손바닥 위에 빨간 포장지의 사탕이 놓인다.', reward: 'ginseng-candy' }
  return { text }
}
