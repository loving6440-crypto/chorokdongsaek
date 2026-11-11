// v-B.07 새 아이템 아이콘 (64x64 플랫 SVG): 누군가가 잃어버린 열쇠
const Y = '#f5c84c'
const Y2 = '#d9a92f'
const K = '#2f3447'
const W = '#fbf6e9'

export const B07_ICONS = {
  // 누군가가 잃어버린 열쇠: 둥근 손잡이에 낡은 이름표가 매달린 황동 열쇠
  'lost-key': { bg: 'navy', art: (
    <>
      <path d="M30 31 L46 47" stroke={Y} strokeWidth="5" strokeLinecap="round" />
      <path d="M40 41 l4 -4 M44 45 l3 -3" stroke={Y} strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="25" r="10" fill={Y} />
      <circle cx="24" cy="25" r="4" fill="#3b4a6b" />
      <circle cx="24" cy="25" r="10" fill="none" stroke={Y2} strokeWidth="1.5" />
      <path d="M17 33 q-3 6 1 10" fill="none" stroke={W} strokeWidth="1.4" />
      <rect x="13" y="42" width="12" height="8" rx="1.5" fill={W} transform="rotate(-12 19 46)" />
      <path d="M15 46 h7" stroke={K} strokeWidth="1.2" opacity=".35" transform="rotate(-12 19 46)" />
    </>
  ) },
}
