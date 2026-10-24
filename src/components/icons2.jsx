// 무구 · 재료 · 제작 완성품 아이콘 (64×64). 모두 바탕색 + 포인트색이 서로 다르다.
const W = '#fbf6e9'
const W2 = '#e7dcc2'
const K = '#2f3447'
const Y = '#f5c84c'
const R = '#d9534f'
const BR = '#6b4a3a'
const ST = '#cfd6df' // 쇠
const ST2 = '#98a3b3'

export const EXTRA_BG = {
  indigo: '#5b6bb5', paper: '#cdbf9b', brown: '#a9794f', rose: '#d96f8a', lime: '#9cc74f', slate: '#5f6b7a',
  sky: '#6fb7e6', olive: '#8a9a4a', mint: '#6cc9a0', violet: '#7a5fb0', crimson: '#b83a4b', plum: '#8c4f7a',
  coral: '#e87f6a', teal2: '#3f9aa3', pink2: '#e6a0b4', blue2: '#4f7aa8', rust: '#a8473d', steel: '#7d8da3',
  forest: '#4f8a5b', gold: '#d8a53a', orange2: '#e0894a', sage: '#6d8f7a', lav: '#b08fcf', iron: '#5e5e6e',
  stone: '#a3a79c', amber: '#e3b866', knot: '#d65a5a', yellow2: '#f0c75e', night: '#3d4a63',
}

export const EXTRA_ICONS = {
  // ── 재료 ──
  brush: { bg: 'indigo', art: (<>
    <path d="M46 9 L53 16 L31 38 L24 31Z" fill="#d9b779" />
    <path d="M46 9 L50 13 L28 35 L24 31Z" fill="#c29f60" />
    <path d="M26 28 L35 37 L32.5 39.5 L23.5 30.5Z" fill={R} />
    <path d="M24 33 L30 39 C27 46 21 50 12 53 C14 47 13 43 16 39.5 C19 37 22 35 24 33Z" fill={K} />
  </>) },
  hanji: { bg: 'paper', art: (<>
    <rect x="16" y="13" width="32" height="38" rx="2" fill={W} />
    <path d="M20 19 H44 M20 25 H40" stroke={W2} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M22 40 q3 -6 7 -2 q4 -5 7 1 q4 -2 6 3" fill="none" stroke="#e7c9d0" strokeWidth="2" strokeLinecap="round" />
    <circle cx="40" cy="33" r="3.2" fill="#f0b3c0" /><circle cx="40" cy="33" r="1.2" fill={Y} />
  </>) },
  'carving-knife': { bg: 'brown', art: (<>
    <path d="M12 44 L34 22 L40 28 L18 50Z" fill="#e9c58f" />
    <path d="M12 44 L16 40 L22 46 L18 50Z" fill={BR} />
    <path d="M34 22 L51 12 L46 26 L40 28Z" fill={ST} />
    <path d="M34 22 L51 12 L45 21Z" fill="#fff" opacity=".5" />
    <path d="M44 44 q5 -3 4 -8 q-5 0 -6 4 q-2 3 2 4z" fill={W} />
  </>) },
  pouch: { bg: 'rose', art: (<>
    <path d="M24 19 C20 28 14 34 15 43 C16 51 25 53 32 53 C39 53 48 51 49 43 C50 34 44 28 40 19Z" fill="#f4d9a4" />
    <path d="M24 19 H40 L38 25 H26Z" fill="#e6c07e" />
    <path d="M25 22 C20 20 17 16 22 14 M39 22 C44 20 47 16 42 14" fill="none" stroke={Y} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="32" cy="40" r="4" fill={R} /><circle cx="32" cy="40" r="1.5" fill={Y} />
    <path d="M32 36 V31 M28 40 H23 M36 40 H41" stroke="#4f9d6b" strokeWidth="1.8" strokeLinecap="round" />
  </>) },
  clover: { bg: 'lime', art: (<>
    {[0, 90, 180, 270].map((a) => <path key={a} transform={`translate(32 30) rotate(${a})`} d="M0 -1 C-9 -6 -9 -16 -3 -16 C-1 -16 0 -14 0 -12 C0 -14 1 -16 3 -16 C9 -16 9 -6 0 -1Z" fill="#2f8f4e" />)}
    <circle cx="32" cy="30" r="2" fill="#a7e3b0" />
    <path d="M32 33 C32 42 36 47 42 51" fill="none" stroke="#2f8f4e" strokeWidth="2.6" strokeLinecap="round" />
  </>) },
  inkstick: { bg: 'slate', art: (<g transform="rotate(-30 32 32)">
    <rect x="22" y="9" width="20" height="46" rx="2.5" fill={K} />
    <rect x="22" y="9" width="20" height="6" rx="2" fill="#4a5066" />
    <path d="M27 24 H37 M27 31 H37 M27 38 H37 M32 22 V44" stroke={R} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M25 12 V52" stroke="#fff" strokeWidth="1.4" opacity=".25" />
  </g>) },
  // ── 제작 완성품 ──
  'feather-deco': { bg: 'sky', art: (<>
    <circle cx="32" cy="14" r="4.5" fill="none" stroke={W} strokeWidth="2.2" />
    <path d="M32 19 V25" stroke={W} strokeWidth="1.8" />
    <path d="M32 24 C22 28 20 42 28 51 C36 46 42 34 32 24Z" fill={W} />
    <path d="M32 24 C40 36 34 46 28 51 C29 42 31 34 32 24Z" fill={W2} />
    <path d="M32 26 L28 51" stroke="#8da5c0" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="23" cy="22" r="2.4" fill={R} /><circle cx="41" cy="22" r="2.4" fill={Y} />
    <path d="M32 19 L23 22 M32 19 L41 22" stroke={W} strokeWidth="1.2" />
  </>) },
  'jangseung-keyring': { bg: 'olive', art: (<>
    <circle cx="32" cy="13" r="4.5" fill="none" stroke={ST} strokeWidth="2.4" />
    <path d="M22 22 L26 18 L32 22 L38 18 L42 22 V48 H22Z" fill="#c98b55" />
    <path d="M24.5 28 Q28 25 31 29 Q28 31 24.5 28Z M33 29 Q36 25 39.5 28 Q36 31 33 29Z" fill={W} />
    <circle cx="28" cy="28.3" r="1.2" fill={K} /><circle cx="36" cy="28.3" r="1.2" fill={K} />
    <path d="M30 33 H34 L33 38 H31Z" fill="#a86a3a" />
    <path d="M32 48 V56 M29 48 L27 55 M35 48 L37 55" stroke={R} strokeWidth="2.2" strokeLinecap="round" />
  </>) },
  'green-charm': { bg: 'mint', art: (<>
    <path d="M21 10 H43 V50 L38 46 L32 52 L26 46 L21 50Z" fill="#cde8bf" />
    <path d="M24 13 V44 M40 13 V44" stroke="#9fcb8f" strokeWidth="1.2" />
    <circle cx="32" cy="19" r="3" fill="none" stroke="#2f8f4e" strokeWidth="1.8" />
    <path d="M32 24 V39 M26 29 H38 M27 34 H37" stroke="#2f8f4e" strokeWidth="2" strokeLinecap="round" />
    <path d="M44 24 q6 -2 6 -8 q-6 0 -6 8z" fill="#2f8f4e" />
  </>) },
  'clover-bookmark': { bg: 'violet', art: (<>
    <path d="M23 9 H41 V54 L32 47 L23 54Z" fill={W} />
    <path d="M23 9 H41 V15 H23Z" fill={W2} />
    {[0, 90, 180, 270].map((a) => <path key={a} transform={`translate(32 29) rotate(${a}) scale(.68)`} d="M0 -1 C-9 -6 -9 -16 -3 -16 C-1 -16 0 -14 0 -12 C0 -14 1 -16 3 -16 C9 -16 9 -6 0 -1Z" fill="#2f8f4e" />)}
    <path d="M32 40 V45" stroke="#2f8f4e" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 9 V4 M32 4 q5 -3 8 1" fill="none" stroke={Y} strokeWidth="2" strokeLinecap="round" />
  </>) },
  'jaeaek-charm': { bg: 'crimson', art: (<>
    <path d="M19 10 H45 L43 17 L46 24 L43 31 L46 38 L42 45 L36 42 L32 53 L28 42 L22 46 L19 38 L22 31 L19 24 L22 17Z" fill="#f3dfa0" />
    <path d="M32 15 V42 M24 22 H40 M25 30 H39" stroke="#7a1f2b" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="32" cy="35" rx="4.2" ry="3" fill="#7a1f2b" /><ellipse cx="32" cy="35" rx="2.2" ry="1" fill={R} />
    <path d="M23 16 L26 20 M41 16 L38 20" stroke={K} strokeWidth="1.6" strokeLinecap="round" />
  </>) },
  'exorcism-gate': { bg: 'plum', art: (<>
    <rect x="17" y="22" width="5" height="30" fill={R} /><rect x="42" y="22" width="5" height="30" fill={R} />
    <rect x="13" y="16" width="38" height="6" rx="1.5" fill={K} />
    <rect x="17" y="26" width="30" height="4" fill={R} />
    <path d="M26 50 q-4 -5 0 -9 q4 -4 0 -8 M32 50 q-4 -5 0 -9 q4 -4 0 -8 M38 50 q-4 -5 0 -9 q4 -4 0 -8" fill="none" stroke="#9be58a" strokeWidth="2" strokeLinecap="round" />
  </>) },
  'red-fox-charm': { bg: 'coral', art: (<>
    <path d="M21 10 H43 V46 L38 43 L32 50 L26 43 L21 46Z" fill="#f6e3b8" />
    <path d="M32 15 V35 M26 22 H38 M27 28 H37" stroke={R} strokeWidth="2" strokeLinecap="round" />
    <path d="M34 54 C26 52 24 44 30 40 C34 38 42 40 46 36 C50 44 44 54 34 54Z" fill="#f0a35a" />
    <path d="M46 36 C48 40 47 46 44 50 C46 46 46 40 46 36Z" fill={W} />
    <path d="M30 40 C34 42 38 46 38 52" fill="none" stroke="#d98a43" strokeWidth="1.5" strokeLinecap="round" />
  </>) },
  'spirit-disposable': { bg: 'teal2', art: (<>
    <path d="M32 11 C21 11 17 21 18 32 C19 42 15 47 12 52 C20 50 24 54 28 50 C30 54 34 54 36 50 C40 54 44 50 52 52 C49 47 45 42 46 32 C47 21 43 11 32 11Z" fill={W} opacity=".95" />
    <ellipse cx="26" cy="28" rx="3.2" ry="4.2" fill={K} /><ellipse cx="38" cy="28" rx="3.2" ry="4.2" fill={K} />
    <circle cx="26.8" cy="27" r="1.1" fill="#9be58a" /><circle cx="38.8" cy="27" r="1.1" fill="#9be58a" />
    <path d="M27 38 Q32 42 37 38" fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" />
    <path d="M44 14 L50 8 M19 14 L13 8" stroke="#9be58a" strokeWidth="2" strokeLinecap="round" />
  </>) },
  // ── 무구 ──
  'w-fan': { bg: 'pink2', art: (<>
    <path d="M32 50 L10 26 C20 14 44 14 54 26Z" fill={W} />
    <path d="M32 50 L10 26 M32 50 L17 21 M32 50 L25 17 M32 50 L39 17 M32 50 L47 21 M32 50 L54 26" stroke="#c9a46a" strokeWidth="1.8" />
    <path d="M12 27 C22 17 42 17 52 27 C42 22 22 22 12 27Z" fill="#e08aa0" />
    <circle cx="32" cy="32" r="3" fill={R} />
    <rect x="29.5" y="48" width="5" height="8" rx="2" fill="#a9794f" />
  </>) },
  'w-spear': { bg: 'blue2', art: (<>
    <path d="M14 52 L44 22" stroke="#c29f60" strokeWidth="3.4" strokeLinecap="round" />
    <path d="M44 22 L50 16 M44 22 L53 25 M44 22 L41 13" stroke={ST} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M50 16 L55 10 L47 12Z M53 25 L58 27 L52 20Z M41 13 L40 7 L46 12Z" fill={ST} />
    <path d="M38 28 L33 33" stroke={R} strokeWidth="4" strokeLinecap="round" />
  </>) },
  'w-dagger': { bg: 'rust', art: (<g transform="rotate(-40 32 32)">
    <path d="M32 6 L38 14 V36 H26 V14Z" fill={ST} />
    <path d="M32 6 L38 14 V36 H32Z" fill={ST2} />
    <rect x="22" y="36" width="20" height="4" rx="1.5" fill={Y} />
    <rect x="28" y="40" width="8" height="12" rx="2" fill={K} />
    <circle cx="32" cy="55" r="2.4" fill={R} />
  </g>) },
  'w-sword': { bg: 'steel', art: (<g transform="rotate(45 32 32)">
    <path d="M32 4 C37 14 37 30 35 38 H29 C27 30 27 14 32 4Z" fill={W} />
    <path d="M32 4 C37 14 37 30 35 38 H32Z" fill={ST} />
    <rect x="23" y="38" width="18" height="3.5" rx="1.5" fill={BR} />
    <rect x="29" y="41.5" width="6" height="13" rx="2" fill={R} />
    <path d="M29 45 H35 M29 49 H35" stroke={W} strokeWidth="1" />
  </g>) },
  'w-bow': { bg: 'forest', art: (<>
    <path d="M22 9 C46 14 46 50 22 55" fill="none" stroke="#e9c58f" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 9 L22 55" stroke={W} strokeWidth="1.3" />
    <path d="M14 32 H38" stroke={BR} strokeWidth="2" strokeLinecap="round" />
    <path d="M38 32 L31 28.5 V35.5Z" fill={ST} />
    <path d="M14 32 L10 28 M14 32 L10 36" stroke={R} strokeWidth="2" strokeLinecap="round" />
  </>) },
  'w-bell': { bg: 'gold', art: (<>
    <circle cx="32" cy="14" r="4" fill="none" stroke={W} strokeWidth="2.2" />
    <path d="M32 18 C22 18 17 28 16 38 H48 C47 28 42 18 32 18Z" fill="#fbe7a3" />
    <path d="M32 18 C42 18 47 28 48 38 H34Z" fill="#e9c860" />
    <rect x="14" y="38" width="36" height="4" rx="2" fill="#c8982c" />
    <circle cx="32" cy="46" r="3.6" fill="#7a5a1a" />
    <path d="M22 24 C20 28 19 31 19 34" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
    <path d="M10 22 q-3 6 0 12 M54 22 q3 6 0 12" fill="none" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
  </>) },
  'w-instrument': { bg: 'orange2', art: (<>
    <path d="M10 38 C10 28 24 24 32 24 C40 24 54 28 54 38 C54 46 40 50 32 50 C24 50 10 46 10 38Z" fill="#7a4a2a" />
    <ellipse cx="32" cy="35" rx="18" ry="7.5" fill="#f4d9a4" />
    <ellipse cx="32" cy="35" rx="12" ry="4.5" fill="#e6c07e" />
    <path d="M18 29 L24 23 M46 29 L40 23" stroke={R} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M49 12 L38 24" stroke="#c29f60" strokeWidth="3" strokeLinecap="round" /><circle cx="49.5" cy="11.5" r="3" fill={W} />
  </>) },
  'w-sickle': { bg: 'sage', art: (<>
    <path d="M17 54 L33 25" stroke="#c29f60" strokeWidth="4" strokeLinecap="round" />
    <path d="M33 25 C34 12 46 10 54 16 C46 14 41 19 42 28 C40 31 36 31 33 25Z" fill={ST} />
    <path d="M33 25 C34 12 46 10 54 16 C48 14 40 17 36 24Z" fill="#fff" opacity=".45" />
    <path d="M26 36 L21 45" stroke={Y} strokeWidth="4.4" strokeLinecap="round" />
  </>) },
  'w-staff': { bg: 'lav', art: (<>
    <path d="M32 56 V26" stroke="#c29f60" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="32" cy="19" r="9" fill="none" stroke={Y} strokeWidth="3" />
    <circle cx="32" cy="19" r="3.2" fill={W} />
    <path d="M20 21 a3 3 0 1 0 0.1 0 M44 21 a3 3 0 1 0 0.1 0" fill="none" stroke={Y} strokeWidth="2" />
    <path d="M26 36 H38 M27 42 H37" stroke={Y} strokeWidth="2.2" strokeLinecap="round" />
  </>) },
  'w-mace': { bg: 'iron', art: (<>
    <path d="M16 52 L36 32" stroke="#c29f60" strokeWidth="4.4" strokeLinecap="round" />
    <circle cx="42" cy="26" r="12" fill={ST2} />
    <circle cx="42" cy="26" r="12" fill="none" stroke={ST} strokeWidth="2" />
    {[[42, 12], [54, 26], [42, 40], [30, 26], [51, 17], [33, 17], [51, 35], [33, 35]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y} l${x > 42 ? 3 : x < 42 ? -3 : 0} ${y > 26 ? 3 : y < 26 ? -3 : 0}`} stroke={ST} strokeWidth="3" strokeLinecap="round" />)}
    <path d="M38 22 q3 -4 7 -2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".6" />
  </>) },
  // ── 강화 재료 ──
  whetstone: { bg: 'stone', art: (<>
    <path d="M10 38 L18 26 H54 L46 38Z" fill="#8f8a7d" />
    <path d="M10 38 H46 V46 H10Z" fill="#6e6a5f" />
    <path d="M46 38 L54 26 V34 L46 46Z" fill="#7d7a6e" />
    <path d="M24 29 H48" stroke="#b8b4a6" strokeWidth="1.5" opacity=".7" />
    <path d="M16 18 L38 28" stroke={ST} strokeWidth="4" strokeLinecap="round" />
    <path d="M44 14 l2 4 M48 16 l-2 3 M40 12 l1 4" stroke={Y} strokeWidth="1.8" strokeLinecap="round" />
  </>) },
  'oil-cloth': { bg: 'amber', art: (<>
    <path d="M12 20 C22 14 30 24 40 18 C46 15 50 17 52 20 L48 46 C42 42 36 50 28 46 C22 43 16 48 11 46Z" fill={W} />
    <path d="M12 20 C22 14 30 24 40 18 C46 15 50 17 52 20 L50 30 C42 26 34 34 26 30 C20 27 15 30 11 29Z" fill="#c78a2c" opacity=".7" />
    <path d="M30 40 q-3 5 0 8 q3 -3 0 -8z" fill="#8a5a1a" />
    <path d="M16 38 H26 M34 38 H44" stroke={W2} strokeWidth="1.6" strokeLinecap="round" />
  </>) },
  'five-knot': { bg: 'knot', art: (<>
    <path d="M32 10 V20" stroke={Y} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M32 20 C22 20 22 32 32 32 C42 32 42 20 32 20Z M32 32 C22 32 22 44 32 44 C42 44 42 32 32 32Z" fill="none" stroke={W} strokeWidth="3" />
    <circle cx="32" cy="26" r="3.2" fill="#4a90d9" />
    <circle cx="32" cy="38" r="3.2" fill="#3f9d5f" />
    {['#4a90d9', Y, W, K, '#3f9d5f'].map((c, i) => <path key={c} d={`M${25 + i * 3.5} 44 L${23 + i * 4.5} 56`} stroke={c} strokeWidth="2.4" strokeLinecap="round" />)}
  </>) },
  'cinnabar-charm': { bg: 'yellow2', art: (<>
    <rect x="20" y="10" width="24" height="42" rx="2" fill="#c8402f" />
    <rect x="23" y="13" width="18" height="36" fill="none" stroke="#f3dfa0" strokeWidth="1.4" />
    <circle cx="32" cy="20" r="3.4" fill="none" stroke="#f3dfa0" strokeWidth="2" />
    <path d="M32 26 V42 M25 31 H39 M26 37 H38" stroke="#f3dfa0" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M32 52 V58 M32 58 l-3 3 M32 58 l3 3" stroke="#8a2a1f" strokeWidth="1.6" strokeLinecap="round" />
  </>) },
  'silver-inlay': { bg: 'night', art: (<>
    <path d="M14 46 L38 18 L46 24 L22 52Z" fill="#6b4a3a" />
    <path d="M14 46 L38 18 L42 21 L18 49Z" fill="#8a6450" />
    <path d="M22 41 C28 38 30 34 34 30 M26 46 C31 43 34 40 38 35" fill="none" stroke="#e8eef6" strokeWidth="2" strokeLinecap="round" />
    <circle cx="33" cy="26" r="1.8" fill="#e8eef6" /><circle cx="25" cy="45" r="1.8" fill="#e8eef6" />
    <path d="M48 11 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z" fill="#e8eef6" />
  </>) },
}
