// v79 텃밭 전용 플랫·도트 SVG 아이콘 (64x64). 톤은 잿빛 녹색·베이지·갈색 계열로 제한.
const soil = '#806b57'
const leaf = '#6d8968'
const light = '#d4c8a9'
const cropNames = ['cherry-tomato', 'carrot', 'lettuce', 'potato', 'cabbage', 'spinach', 'soybean']
const colors = ['#a96e63','#b18a63','#83977a','#a39a7f','#819279','#668879','#98846c']

const cropGlyphs = [
  <><rect x="16" y="28" width="13" height="13" rx="2" fill="#a96e63"/><rect x="34" y="30" width="13" height="13" rx="2" fill="#b27b66"/><rect x="22" y="21" width="4" height="9" fill={leaf}/><path d="M20 23h9M37 25h10" stroke={leaf} strokeWidth="3"/></>,
  <><path d="M23 26L30 51L38 26Z" fill="#b18a63"/><rect x="27" y="16" width="4" height="12" fill={leaf}/><rect x="33" y="19" width="4" height="9" fill={leaf}/><rect x="23" y="19" width="4" height="9" fill={leaf}/></>,
  <><path d="M31 51Q10 40 18 24Q23 19 29 30Q23 11 34 15Q43 17 38 30Q50 18 48 32Q48 43 31 51Z" fill="#83977a"/><path d="M31 50V27" stroke={light} strokeWidth="2"/></>,
  <><rect x="18" y="24" width="28" height="26" rx="8" fill="#a39a7f"/><circle cx="25" cy="31" r="2" fill={soil}/><circle cx="39" cy="37" r="2" fill={soil}/><circle cx="29" cy="43" r="2" fill={soil}/></>,
  <><rect x="18" y="29" width="28" height="21" rx="9" fill="#819279"/><path d="M17 34Q14 19 26 18L32 31Q37 17 44 19Q48 29 47 36" stroke="#83977a" strokeWidth="7" fill="none"/><path d="M30 21v25" stroke={light} strokeWidth="2"/></>,
  <><path d="M31 50V19M31 42Q15 33 18 23Q29 22 31 34M31 37Q48 20 48 27Q49 37 31 43" stroke="#668879" strokeWidth="7" fill="none"/></>,
  <><rect x="17" y="27" width="13" height="12" rx="5" fill="#98846c"/><rect x="33" y="27" width="13" height="12" rx="5" fill="#a39274"/><rect x="24" y="38" width="15" height="12" rx="6" fill="#94856b"/></>,
]
export const GARDEN_ITEM_ICONS = Object.fromEntries(cropNames.flatMap((id, i) => [
  [id, { bg: 'sand', art: cropGlyphs[i] }],
  [`seed-${id}`, { bg: 'sand', art: <>
    <rect x="17" y="13" width="30" height="39" rx="3" fill="#e5dbbe"/>
    <path d="M18 18h28M18 45h28" stroke={soil} strokeWidth="2"/>
    <rect x="20" y="23" width="24" height="20" rx="2" fill="#aaa18a"/>
    <circle cx="32" cy="33" r="6" fill={colors[i]}/>
    <path d="M32 30q-2-6 3-6" fill="none" stroke={leaf} strokeWidth="2.3"/>
  </> }],
]))
// 기존 상추 아이템의 아이콘은 변경하지 않는다.
delete GARDEN_ITEM_ICONS.lettuce
GARDEN_ITEM_ICONS['soybean-oil'] = { bg:'sand', art:<>
  <rect x="26" y="12" width="12" height="7" rx="1" fill={soil}/>
  <rect x="21" y="20" width="22" height="33" rx="4" fill="#ae9a63"/>
  <rect x="23" y="30" width="18" height="13" fill={light}/>
  <circle cx="32" cy="36" r="4" fill="#9e976f"/>
</> }
