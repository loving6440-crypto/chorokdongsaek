// v-B.17 새 아이템 아이콘 (64x64 플랫 SVG, 원형 배지): 가방
const B = '#a9794f'   // 가방 몸통(낡은 황토색 캔버스)
const B2 = '#8a5f3c'  // 그림자 · 테두리
const F = '#c9955f'   // 앞주머니
const W = '#fbf6e9'
const Y = '#f5c84c'
const K = '#2f3447'

export const B17_ICONS = {
  // 쓰레기: 구겨진 종이 뭉치와 부러진 나무 조각이 담긴 찌그러진 깡통
  trash: { bg: 'sand', art: (
    <>
      <path d="M20 26 h24 l-3 24 q-.4 3 -3.4 3 h-10.2 q-3 0 -3.4 -3 z" fill="#8f97a3" />
      <path d="M20 26 h24 l-.6 5 h-22.8 z" fill="#6f7782" />
      <path d="M27 31 l1 18 M32 31 v18 M37 31 l-1 18" stroke="#6f7782" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33 40 l4 -2" stroke="#5b626c" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M22 25 q2 -8 9 -7 q3 -5 8 -1 q5 1 3 8 z" fill="#fbf6e9" />
      <path d="M27 21 l3 2 l2 -3 M35 19 l1 3 l3 -1" fill="none" stroke="#c9c2b0" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M40 16 l6 -6" stroke="#a9794f" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 11 l2 1" stroke="#8a5f3c" strokeWidth="2" strokeLinecap="round" />
    </>
  ) },
  // 가방: 손잡이 고리와 앞주머니가 달린 학교 책가방, 버클은 황동
  bag: { bg: 'teal', art: (
    <>
      <path d="M25 19 q0 -8 7 -8 q7 0 7 8" fill="none" stroke={B2} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="15" y="18" width="34" height="34" rx="9" fill={B} />
      <path d="M15 27 q17 7 34 0" fill="none" stroke={B2} strokeWidth="1.6" opacity=".55" />
      <rect x="20" y="33" width="24" height="15" rx="4" fill={F} />
      <path d="M20 37.5 h24" stroke={B2} strokeWidth="1.3" opacity=".5" />
      <rect x="29" y="34.5" width="6" height="6" rx="1.4" fill={Y} />
      <rect x="31" y="36.5" width="2" height="2" rx=".5" fill={K} opacity=".55" />
      <path d="M19 24 v8 M45 24 v8" stroke={B2} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37 42.5 h4" stroke={W} strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
      <circle cx="21.5" cy="21.5" r="1.6" fill={W} opacity=".55" />
    </>
  ) },
}
