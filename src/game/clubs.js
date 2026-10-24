// 별관의 동아리. 가입은 한 번에 하나만, 탈퇴는 가입 24시간 뒤부터, 탈퇴 뒤엔 24시간 동안 새 동아리에 들어갈 수 없다.
export const CLUBS = [
  { id: 'craft', name: '미술 동아리', room: '공작소', floor: '2층' },
  { id: 'music', name: '음악 동아리', room: '음악실', floor: '2층' },
  { id: 'board', name: '판놀이 동아리', room: '패 놀이터', floor: '2층' },
  { id: 'broadcast', name: '방송 동아리', room: '방송실', floor: '2층' },
  { id: 'cook', name: '요리 동아리', room: '조리실', floor: '2층' },
  { id: 'read', name: '독서 동아리', room: '서적실', floor: '3층' },
  { id: 'tea', name: '차 동아리', room: '다도실', floor: '3층' },
  { id: 'garden', name: '원예 동아리', room: '정원', floor: '옥상' },
]
export const CLUB_IDS = CLUBS.map((c) => c.id)
export const clubOf = (id) => CLUBS.find((c) => c.id === id) ?? null

export const CLUB_JOIN_LOCK_MS = 24 * 3600 * 1000 // 가입 뒤 이 시간이 지나야 탈퇴할 수 있다
export const CLUB_REJOIN_WAIT_MS = 24 * 3600 * 1000 // 탈퇴 뒤 이 시간이 지나야 새 동아리에 들어갈 수 있다

// 이번 주 동아리 활동(주간 임무) 문구. 아직 내용이 정해지지 않아 자리만 비워 둔다 — 매주 월요일 0시(KST)에 바뀌는 건
// 서버의 랭킹 주차 계산(weekStartOf)을 그대로 따른다. 나중에 동아리별 실제 문구가 생기면 여기 채워 넣으면 된다.
export const CLUB_WEEKLY_PLACEHOLDER = '이번 주 활동은 아직 정해지지 않았다. (매주 월요일 0시에 새로 정해질 예정)'
