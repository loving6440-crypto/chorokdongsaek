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
  // v-B.18 조개껍데기: 부채꼴 골이 진 분홍빛 조가비
  shell: { bg: 'blue', art: (
    <>
      <path d="M32 50 l-17 -17 q-1 -16 17 -20 q18 4 17 20 z" fill="#f4c3b0" />
      <path d="M32 50 l-17 -17 q-1 -16 17 -20 q18 4 17 20 z" fill="none" stroke="#d98f78" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M32 50 L21 19 M32 50 L27 14.5 M32 50 V13 M32 50 L37 14.5 M32 50 L43 19" stroke="#d98f78" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M27 50 h10 l-2 4 h-6 z" fill="#e8a48d" />
      <path d="M22 26 q2 -7 7 -9" fill="none" stroke="#fbf6e9" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
    </>
  ) },
  // v-B.18 조개 목걸이: 노끈에 꿴 조개 셋과 구슬
  'shell-necklace': { bg: 'navy', art: (
    <>
      <path d="M14 14 q18 34 36 0" fill="none" stroke="#c9a874" strokeWidth="2.4" strokeLinecap="round" />
      {[[19, 27], [32, 34], [45, 27]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${(i - 1) * 22}) scale(.82)`}>
          <path d="M0 12 l-7 -7 q-.5 -7 7 -8 q7.5 1 7 8 z" fill={i === 1 ? '#f4c3b0' : '#fbe3d6'} stroke="#d98f78" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M0 12 L-3.5 -1.5 M0 12 V-3 M0 12 L3.5 -1.5" stroke="#d98f78" strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="17.5" cy="23" r="2" fill="#f5c84c" />
      <circle cx="46.5" cy="23" r="2" fill="#f5c84c" />
    </>
  ) },
  // v-B.18 누군가의 가방: 이름표가 달린 남의 책가방, 물음표
  'someones-bag': { bg: 'yellow', art: (
    <>
      <path d="M25 19 q0 -8 7 -8 q7 0 7 8" fill="none" stroke="#3b4a6b" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="15" y="18" width="34" height="34" rx="9" fill="#5b6f99" />
      <rect x="20" y="33" width="24" height="15" rx="4" fill="#7387b3" />
      <path d="M19 24 v8 M45 24 v8" stroke="#3b4a6b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28.5 25 q0 -3.5 3.5 -3.5 q3.5 0 3.5 3 q0 2.2 -3.5 3.3 v2" fill="none" stroke="#fbf6e9" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="33.2" r="1.4" fill="#fbf6e9" />
      <path d="M44 40 l6 3 v6 h-8 v-6 z" fill="#fbf6e9" stroke="#c9c2b0" strokeWidth="1" strokeLinejoin="round" />
      <path d="M44.5 46 h4" stroke="#2f3447" strokeWidth="1" strokeLinecap="round" opacity=".5" />
    </>
  ) },
}
