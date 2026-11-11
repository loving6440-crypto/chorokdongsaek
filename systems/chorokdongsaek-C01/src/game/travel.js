// 구역 간 이동 시간. 본관 · 별관 · 기숙사 · 뒷산은 정마름모의 네 꼭짓점, 사당은 그 중앙에 있다고 본다.
// 건물이 아예 바뀔 때만 시간이 걸리고, 건물 안에서의 이동(예: 본관 → 양호실)은 걸리지 않는다. 가고 오는 시간은 같다.
const PAIR_MINUTES = {
  'annex-mainHall': 15, // 본관 ↔ 별관
  'dorm-mainHall': 10, // 본관 ↔ 기숙사
  'gym-mainHall': 10, // 본관 ↔ 뒷산
  'annex-dorm': 10, // 별관 ↔ 기숙사
  'annex-gym': 10, // 별관 ↔ 뒷산
  'dorm-gym': 15, // 기숙사 ↔ 뒷산
}
const SHRINE_MINUTES = 7 // 본관/별관/기숙사/뒷산 ↔ 사당

// 건물 내부로 취급해 이동 시간이 들지 않는 구역(예: 양호실은 본관 소속).
const INSIDE_OF = { infirmary: 'mainHall' }

const buildingOf = (id) => INSIDE_OF[id] ?? id

/** from → to 이동에 걸리는 시간(분). 같은 건물 안이면 0. */
export function travelMinutes(fromId, toId) {
  const a = buildingOf(fromId)
  const b = buildingOf(toId)
  if (a === b) return 0
  if (a === 'shrine' || b === 'shrine') return SHRINE_MINUTES
  const key = [a, b].sort().join('-')
  return PAIR_MINUTES[key] ?? 0
}
