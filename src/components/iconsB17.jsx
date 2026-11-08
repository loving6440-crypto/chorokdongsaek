// v-B.17 새 아이템 아이콘 (64x64 플랫 SVG, 원형 배지): 가방
const B = '#a9794f'   // 가방 몸통(낡은 황토색 캔버스)
const B2 = '#8a5f3c'  // 그림자 · 테두리
const F = '#c9955f'   // 앞주머니
const W = '#fbf6e9'
const Y = '#f5c84c'
const K = '#2f3447'

export const B17_ICONS = {
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
