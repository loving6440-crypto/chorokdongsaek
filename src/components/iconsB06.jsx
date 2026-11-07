// v-B.06 아이템 시트로 새로 들어온 7종의 아이콘 (64x64 플랫 SVG).
const W = '#fbf6e9'
const W2 = '#e7dcc2'
const K = '#2f3447'
const Y = '#f5c84c'
const R = '#d9534f'
const G = '#4f9d6b'
const BR = '#6b4a3a'
const soil = '#806b57'
const leaf = '#6d8968'

// 텃밭 씨앗 봉투와 같은 모양: 가운데 그림만 다르다
const seedPacket = (grain) => (
  <>
    <rect x="17" y="13" width="30" height="39" rx="3" fill="#e5dbbe" />
    <path d="M18 18h28M18 45h28" stroke={soil} strokeWidth="2" />
    <rect x="20" y="23" width="24" height="20" rx="2" fill="#aaa18a" />
    {grain}
  </>
)
// 이삭: 줄기 하나에 낟알이 엇갈려 달린다
const ear = (c, awns) => (
  <>
    <path d="M32 42V25" stroke={leaf} strokeWidth="2" strokeLinecap="round" />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <ellipse cx="29" cy={28 + i * 4.5} rx="2.6" ry="3.6" fill={c} transform={`rotate(-28 29 ${28 + i * 4.5})`} />
        <ellipse cx="35" cy={28 + i * 4.5} rx="2.6" ry="3.6" fill={c} transform={`rotate(28 35 ${28 + i * 4.5})`} />
      </g>
    ))}
    <ellipse cx="32" cy="24" rx="2.4" ry="3.4" fill={c} />
    {awns && <path d="M32 21v-4M28.5 25l-3-4M35.5 25l3-4" stroke={c} strokeWidth="1.3" strokeLinecap="round" />}
  </>
)

export const B06_ICONS = {
  // 볍씨: 껍질째인 벼 낟알 한 줌
  'rice-grain': { bg: 'sand', art: (
    <>
      {[[22, 30, -30], [32, 26, 10], [42, 31, 35], [27, 40, 20], [38, 41, -20], [32, 35, -5]].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="4.4" ry="7.2" fill="#d6b56a" />
          <path d={`M${x} ${y - 6}V${y + 6}`} stroke="#a8843d" strokeWidth="1.2" />
        </g>
      ))}
    </>
  ) },
  'wheat-seed': { bg: 'sand', art: seedPacket(ear('#c9a25a', false)) },
  'barley-seed': { bg: 'sand', art: seedPacket(ear('#b8a46a', true)) },
  // 도깨비 증표: 뿔 달린 도깨비 얼굴을 새긴 둥근 패
  'goblin-token': { bg: 'red', art: (
    <>
      <circle cx="32" cy="34" r="17" fill={Y} />
      <circle cx="32" cy="34" r="13.5" fill="none" stroke={BR} strokeWidth="1.6" />
      <path d="M24 23 L22 15 L28 21Z M40 23 L42 15 L36 21Z" fill={W} />
      <circle cx="27" cy="32" r="2.4" fill={K} />
      <circle cx="37" cy="32" r="2.4" fill={K} />
      <path d="M25 40 q7 6 14 0" fill="none" stroke={K} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 41.5 v2.5 M36 41.5 v2.5" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="29" y="11" width="6" height="5" rx="1.5" fill={BR} />
    </>
  ) },
  // 소형 돌제단: 받침돌 위에 넓적한 상판, 위에 작은 그릇
  'small-altar': { bg: 'navy', art: (
    <>
      <rect x="16" y="45" width="32" height="6" rx="2" fill={W2} />
      <rect x="22" y="33" width="20" height="12" rx="2" fill={W} />
      <rect x="14" y="27" width="36" height="7" rx="2.5" fill={W2} />
      <path d="M26 27 q6 -7 12 0Z" fill="#a8b0c4" />
      <path d="M30 20 q2 -4 0 -7 M34 21 q2 -3 0 -6" fill="none" stroke={W} strokeWidth="1.5" strokeLinecap="round" opacity=".8" />
      <path d="M26 38h12" stroke={K} strokeWidth="1.4" opacity=".35" />
    </>
  ) },
  // 나물무침: 그릇에 담긴 무친 나물
  'herb-salad': { bg: 'green', art: (
    <>
      <path d="M14 34 h36 q-2 15 -18 15 q-16 0 -18 -15Z" fill={W} />
      <path d="M17 34 q5 -9 11 -3 q4 -8 9 -1 q5 -6 10 4Z" fill={G} />
      <path d="M22 31 q3 -4 6 0 M33 29 q3 -3 6 1" fill="none" stroke="#3f7d55" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="26" cy="32" r="1.1" fill={W} />
      <circle cx="36" cy="31" r="1.1" fill={W} />
      <circle cx="31" cy="30" r="1.1" fill={W} />
      <path d="M14 34h36" stroke={W2} strokeWidth="2" />
    </>
  ) },
  // 정체불능의 보약: 마개 덮인 탕약 사발, 수상한 김
  'mystery-tonic': { bg: 'purple', art: (
    <>
      <path d="M16 32 h32 q-1 16 -16 16 q-15 0 -16 -16Z" fill={W} />
      <ellipse cx="32" cy="32" rx="16" ry="3.6" fill="#4a3a33" />
      <ellipse cx="29" cy="31.5" rx="4" ry="1.2" fill={R} opacity=".55" />
      <path d="M24 26 q-3 -4 0 -8 q3 -4 0 -8 M33 25 q3 -4 0 -7 M40 26 q-2 -3 1 -6" fill="none" stroke={W2} strokeWidth="2" strokeLinecap="round" />
      <text x="32" y="45" textAnchor="middle" fontSize="9" fontWeight="700" fill={K} opacity=".55">?</text>
    </>
  ) },
}
