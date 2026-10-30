/** v79 이동 이벤트: 일반 대사 동등 확률 + 독립적인 5% 아이템 이벤트. */
export const TRAVEL_LINES = [
  '발목을 스치고 지나가는 날카로운 감각. 당신은 내려다보지 않기 위해 노력한다. 무시하고 걷자. 아래를 보거든 그것이 당신을 알아차리고 기어오를 것이다.',
  "도깨비 '이시'가 당신에게 친근하게 팔짱을 끼며 달라붙는다. 어딜 그렇게 바쁘게 가냐고 늘어져서 놀아달라고 요구하고 있다. 귀찮다.",
  '저만치 뒷산의 텃밭을 가꾸는 어른의 뒷모습이 보인다. 당신을 돌아보며 희미한 미소를 보인다.',
  '건물에 도착하기 전까지 긴장을 늦추지 말자.',
]
export const LOST_THINGS = ['lost-hairband', 'lost-slippers', 'lost-phone', 'lost-love-letter']
export function rollTravelEvent(rng=Math.random) {
  const text = TRAVEL_LINES[Math.floor(rng()*TRAVEL_LINES.length)]
  if (rng() >= 0.05) return { text }
  if (rng() < 0.5) return { text: '선생님 중 한 명이 웃으며 손을 내밀라는 시늉을 한다. 손바닥 위에 빨간 포장지의 사탕이 놓인다.', reward: 'ginseng-candy' }
  return { text: '발에 무언가가 채인다. 이게 뭐지? 허리를 숙여 확인해보니 분실물인 것 같다. 학생들이 많이 오가는 매점에 가져다줄까?', reward: LOST_THINGS[Math.floor(rng()*LOST_THINGS.length)] }
}
