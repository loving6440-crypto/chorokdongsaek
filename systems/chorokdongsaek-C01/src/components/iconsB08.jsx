// v-B.08 새 제작품 100종 + 까치 깃 아이콘 (64x64 원형 배지용 플랫 SVG)
// 모양은 B08_ICON_SPECS[id] = [모양, 배경, 주색, 보조색] 으로 정하고, 같은 모양끼리도 id 마다 곁들임이 달라진다.
import { B08_ICON_SPECS } from '../game/recipesB08'

const K = '#2f3447'
const W = '#fbf6e9'
const R = '#c0392b'
const G = '#4f9d6b'
const Y = '#f5c84c'

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// 그릇 위 곁들임(같은 그릇 모양끼리 구분되게)
const garnish = (v, c2, y = 30) => [
  <path key="g" d={`M24 ${y - 8} q3 -5 0 -10 M32 ${y - 9} q3 -5 0 -10 M40 ${y - 8} q3 -5 0 -10`} fill="none" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".8" />,
  <g key="g">{[24, 31, 38].map((x, i) => <circle key={x} cx={x} cy={y - 1 - (i % 2) * 2} r="2.6" fill={i === 1 ? R : G} />)}</g>,
  <path key="g" d={`M34 ${y - 2} q8 -10 14 -6 q-4 8 -14 6Z`} fill={G} />,
  <g key="g"><ellipse cx="27" cy={y - 1} rx="5" ry="2.5" fill={c2} /><ellipse cx="38" cy={y} rx="4" ry="2" fill={W} opacity=".8" /></g>,
][v]

const SHAPES = {
  cord: (a, b) => <><ellipse cx="32" cy="36" rx="17" ry="12" fill="none" stroke={a} strokeWidth="6" /><ellipse cx="32" cy="36" rx="8" ry="5" fill="none" stroke={a} strokeWidth="5" /><path d="M46 30 Q54 20 48 13" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round" /><ellipse cx="32" cy="36" rx="17" ry="12" fill="none" stroke={b} strokeWidth="1.4" strokeDasharray="3 4" /></>,
  yarn: (a, b) => <><circle cx="31" cy="34" r="16" fill={a} /><path d="M17 30 Q31 22 45 34 M18 39 Q32 30 46 41 M24 20 Q36 32 34 50" fill="none" stroke={b} strokeWidth="2.2" /><path d="M44 46 Q52 50 50 56" fill="none" stroke={a} strokeWidth="2.5" strokeLinecap="round" /><path d="M40 12 L50 30" stroke={K} strokeWidth="2.4" strokeLinecap="round" /></>,
  inkstick: (a, b) => <><ellipse cx="32" cy="47" rx="19" ry="7" fill="#5b5f6e" /><ellipse cx="32" cy="46" rx="13" ry="4" fill={K} /><rect x="24" y="10" width="13" height="32" rx="2" fill={a} transform="rotate(18 30 26)" /><rect x="25" y="18" width="11" height="9" fill={b} transform="rotate(18 30 26)" /></>,
  dish: (a, b) => <><ellipse cx="32" cy="40" rx="21" ry="11" fill={b} /><ellipse cx="32" cy="37" rx="16" ry="7" fill={W} opacity=".55" /><path d="M22 37 Q28 30 36 34 Q44 36 41 40 Q32 44 24 41Z" fill={a} /><path d="M40 16 L30 34" stroke={K} strokeWidth="3" strokeLinecap="round" /><path d="M28 32 L31 36" stroke={a} strokeWidth="4" strokeLinecap="round" /></>,
  orb: (a, b) => <><path d="M12 22 Q32 52 52 22" fill="none" stroke={b} strokeWidth="2" />{[[18, 31], [32, 38], [46, 31]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="8" fill={a} /><circle cx={x - 3} cy={y - 3} r="2.4" fill={W} /></g>)}</>,
  plaque: (a, b) => <><path d="M32 8 L22 20 M32 8 L42 20" stroke={K} strokeWidth="1.8" /><rect x="17" y="19" width="30" height="34" rx="4" fill={a} /><rect x="21" y="23" width="22" height="26" rx="2" fill="none" stroke={b} strokeWidth="1.6" /><path d="M32 27 V45 M26 32 H38 M27 40 L37 40" stroke={b} strokeWidth="2.4" strokeLinecap="round" /></>,
  feathers: (a, b) => <>{[-22, 0, 22].map((d) => <g key={d} transform={`rotate(${d} 32 50)`}><path d="M32 50 C24 36 25 20 32 9 C39 20 40 36 32 50Z" fill={a} /><path d="M32 50 V12" stroke={b} strokeWidth="1.4" /></g>)}<rect x="26" y="44" width="12" height="6" rx="2" fill={R} /></>,
  powder: (a, b) => <><path d="M10 46 L32 20 L54 46Z" fill={b} /><path d="M18 46 Q32 26 46 46Z" fill={a} /><circle cx="27" cy="38" r="1.6" fill={W} /><circle cx="35" cy="34" r="1.3" fill={W} /><circle cx="38" cy="41" r="1.5" fill={W} /></>,
  ink: (a, b) => <><path d="M18 30 H46 L42 50 H22Z" fill={b} /><ellipse cx="32" cy="30" rx="14" ry="4" fill={a} /><path d="M40 8 L34 30" stroke="#8a5a3c" strokeWidth="3" strokeLinecap="round" /><path d="M34 26 L32 33 L36 31Z" fill={K} /><circle cx="26" cy="40" r="3" fill={a} opacity=".5" /></>,
  pouch: (a, b) => <><path d="M20 26 Q12 50 32 52 Q52 50 44 26Z" fill={a} /><path d="M20 26 Q32 18 44 26 Q32 31 20 26Z" fill={b} /><path d="M24 25 Q32 30 40 25" fill="none" stroke={K} strokeWidth="1.6" /><path d="M40 25 Q48 18 46 12" fill="none" stroke={R} strokeWidth="2" strokeLinecap="round" /><circle cx="32" cy="40" r="4" fill={b} /></>,
  cairn: (a, b) => <><ellipse cx="32" cy="49" rx="18" ry="6" fill={b} /><ellipse cx="32" cy="38" rx="14" ry="6" fill={a} /><ellipse cx="32" cy="28" rx="10" ry="5" fill={b} /><ellipse cx="32" cy="19" rx="6" ry="4" fill={a} /><circle cx="44" cy="16" r="2" fill={W} /></>,
  talisman: (a, b, v) => <><rect x="21" y="9" width="22" height="46" rx="1.5" fill={a} transform={`rotate(${v * 3 - 4} 32 32)`} /><g transform={`rotate(${v * 3 - 4} 32 32)`} stroke={b} strokeWidth="2.4" strokeLinecap="round" fill="none">{[<path key="0" d="M32 15 V49 M25 22 H39 M26 32 Q32 27 38 32 M27 41 L37 45" />, <path key="1" d="M26 16 L38 22 L26 28 L38 34 M32 38 V50 M27 44 H37" />, <path key="2" d="M32 14 V24 M25 19 H39 M32 30 a5 5 0 1 0 0.1 0 M28 44 L32 50 L36 44" />, <path key="3" d="M27 15 V49 M37 15 V49 M27 27 H37 M27 39 H37" />][v]}</g></>,
  bookmark: (a, b) => <><path d="M24 8 H40 V46 L32 40 L24 46Z" fill={a} /><path d="M28 14 H36 M28 20 H36" stroke={b} strokeWidth="2" /><path d="M32 40 V50" stroke={R} strokeWidth="2" /><path d="M29 50 h6 l-1 8 h-4z" fill={R} /></>,
  incense: (a, b) => <><path d="M28 10 q6 6 0 10 q-6 4 0 10" fill="none" stroke={W} strokeWidth="2" opacity=".8" /><path d="M31 30 V44 M25 32 L28 44 M37 32 L34 44" stroke={a} strokeWidth="2.4" /><path d="M16 42 H48 L44 54 H20Z" fill={b} /><ellipse cx="32" cy="42" rx="16" ry="4" fill={b} /><circle cx="31" cy="30" r="1.8" fill={R} /></>,
  pot: (a, b, v) => <><path d="M20 22 C12 30 14 48 22 52 H42 C50 48 52 30 44 22Z" fill={a} /><ellipse cx="32" cy="22" rx="12" ry="4" fill={b} /><path d="M18 36 Q32 41 46 36" fill="none" stroke={b} strokeWidth="2" />{v % 2 ? <path d="M26 15 q3 -5 0 -9 M38 15 q3 -5 0 -9" fill="none" stroke={W} strokeWidth="2" opacity=".8" /> : <circle cx="32" cy="45" r="3" fill={b} />}</>,
  doll: (a, b) => <><circle cx="32" cy="17" r="8" fill={a} /><path d="M32 25 L22 50 H42Z" fill={a} /><path d="M18 31 H46" stroke={a} strokeWidth="5" strokeLinecap="round" /><path d="M24 40 H40 M23 46 H41" stroke={b} strokeWidth="1.8" /><path d="M24 30 H40" stroke={R} strokeWidth="3" /><circle cx="29" cy="16" r="1.4" fill={K} /><circle cx="35" cy="16" r="1.4" fill={K} /></>,
  brush: (a, b) => <><path d="M20 50 L42 12" stroke={a} strokeWidth="5" strokeLinecap="round" /><path d="M22 46 L16 56 L12 52 L18 44Z" fill={b} /><path d="M24 42 L18 46" stroke={K} strokeWidth="3" /><circle cx="42" cy="12" r="2.4" fill={R} /><path d="M40 46 q6 -2 8 4" fill="none" stroke={K} strokeWidth="2.4" strokeLinecap="round" /></>,
  seal: (a, b) => <><rect x="22" y="12" width="20" height="26" rx="3" fill={a} /><path d="M26 12 Q32 4 38 12" fill={a} /><rect x="16" y="42" width="32" height="12" rx="2" fill={W} /><rect x="24" y="44" width="16" height="8" fill={b} /><path d="M28 46 H36 M32 46 V50" stroke={W} strokeWidth="1.4" /></>,
  lantern: (a, b) => <><path d="M32 6 V12" stroke={K} strokeWidth="2" /><rect x="22" y="12" width="20" height="4" rx="1" fill={b} /><path d="M20 16 H44 L42 46 H22Z" fill={a} /><path d="M22 26 H42 M22 36 H42" stroke={b} strokeWidth="1.6" opacity=".7" /><ellipse cx="32" cy="31" rx="5" ry="7" fill={Y} opacity=".85" /><rect x="22" y="46" width="20" height="4" rx="1" fill={b} /><path d="M32 50 V58" stroke={R} strokeWidth="2.4" /></>,
  tag: (a, b) => <><path d="M32 8 Q24 12 26 20" fill="none" stroke={R} strokeWidth="2" /><path d="M20 20 H44 V50 L32 56 L20 50Z" fill={a} /><circle cx="32" cy="25" r="2.5" fill={K} /><path d="M27 34 H37 M27 41 H37 M30 47 H34" stroke={b} strokeWidth="2.2" strokeLinecap="round" /></>,
  fang: (a, b) => <><path d="M12 18 Q32 34 52 18" fill="none" stroke={b} strokeWidth="2.2" /><path d="M26 27 Q32 56 38 27Z" fill={a} /><path d="M30 30 Q32 44 34 30" fill="none" stroke={b} strokeWidth="1.2" /><circle cx="18" cy="22" r="2.6" fill={R} /><circle cx="46" cy="22" r="2.6" fill={R} /></>,
  quill: (a, b) => <><path d="M18 52 C22 32 34 16 50 10 C46 28 34 42 18 52Z" fill={a} /><path d="M18 52 L46 14" stroke={b} strokeWidth="1.6" /><path d="M18 52 L13 58" stroke={K} strokeWidth="2.6" strokeLinecap="round" /><path d="M28 38 L22 34 M34 30 L28 26" stroke={b} strokeWidth="1.2" /></>,
  chest: (a, b) => <><rect x="13" y="26" width="38" height="26" rx="2" fill={a} /><path d="M13 26 Q32 12 51 26Z" fill={a} /><path d="M13 26 H51" stroke={b} strokeWidth="2.4" /><rect x="28" y="28" width="8" height="9" rx="1" fill={b} /><path d="M13 36 H28 M36 36 H51" stroke={b} strokeWidth="1.4" /></>,
  board: (a, b) => <><rect x="12" y="14" width="40" height="36" rx="3" fill={a} transform="rotate(-6 32 32)" /><g transform="rotate(-6 32 32)" stroke={b} strokeWidth="1.4"><path d="M18 20 H46 V44 H18Z M18 32 H46 M32 20 V44 M18 20 L46 44 M46 20 L18 44" fill="none" /></g><circle cx="22" cy="48" r="4" fill={R} /><circle cx="44" cy="50" r="4" fill={K} /></>,
  cape: (a, b) => <><path d="M24 12 H40 L52 52 Q32 58 12 52Z" fill={a} /><path d="M24 12 Q32 20 40 12" fill={b} /><path d="M22 24 L18 50 M42 24 L46 50 M32 20 V54" stroke={b} strokeWidth="1.4" opacity=".7" /><circle cx="32" cy="16" r="2.6" fill={R} /></>,
  robe: (a, b, v) => <><path d="M24 10 L10 22 L16 30 L20 27 L19 54 H45 L44 27 L48 30 L54 22 L40 10Z" fill={a} /><path d="M24 10 L32 26 L40 10" fill="none" stroke={b} strokeWidth="3" /><path d="M32 26 L26 54" stroke={b} strokeWidth="1.6" /><path d="M10 22 L16 30 M54 22 L48 30" stroke={b} strokeWidth="3" />{v % 2 ? <path d="M32 27 L40 34 M32 27 L38 38" stroke={R} strokeWidth="2.4" strokeLinecap="round" /> : <rect x="19" y="36" width="26" height="4" fill={b} />}</>,
  vest: (a, b) => <><path d="M22 10 L14 18 L16 54 H48 L50 18 L42 10 L32 30Z" fill={a} /><path d="M22 10 L32 30 L42 10" fill="none" stroke={b} strokeWidth="2.4" /><path d="M32 30 V54" stroke={b} strokeWidth="2" />{[36, 43].map((y) => <circle key={y} cx="35" cy={y} r="1.8" fill={b} />)}</>,
  wreath: (a, b) => <><circle cx="32" cy="34" r="15" fill="none" stroke={b} strokeWidth="3" />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <g key={d} transform={`rotate(${d} 32 34)`}><circle cx="29" cy="18" r="3.6" fill={a} /><circle cx="35" cy="18" r="3.6" fill={a} /><circle cx="32" cy="15" r="3.6" fill={a} /></g>)}<circle cx="32" cy="19" r="2" fill={W} /></>,
  ribbon: (a, b) => <><path d="M32 30 L12 18 L14 42Z M32 30 L52 18 L50 42Z" fill={a} /><path d="M30 32 L22 56 L28 52 L32 58 Z M34 32 L42 56 L36 52 L32 58Z" fill={a} opacity=".85" /><circle cx="32" cy="30" r="5" fill={b} /><circle cx="18" cy="26" r="2" fill={R} /><circle cx="46" cy="26" r="2" fill={R} /></>,
  necklace: (a, b) => <><path d="M14 14 Q32 50 50 14" fill="none" stroke={b} strokeWidth="2" />{[[20, 26], [26, 34], [38, 34], [44, 26]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.6" fill={b} />)}<path d="M32 38 L26 52 Q32 56 38 52Z" fill={a} /></>,
  norigae: (a, b) => <><path d="M32 6 V16" stroke={b} strokeWidth="2" /><path d="M32 16 l8 8 l-8 8 l-8 -8z" fill={a} /><circle cx="32" cy="24" r="3" fill={b} /><path d="M26 32 Q32 36 38 32 L40 56 H24Z" fill={b} /><path d="M28 38 V54 M32 38 V56 M36 38 V54" stroke={a} strokeWidth="1.2" opacity=".7" /></>,
  bracelet: (a, b) => <><ellipse cx="32" cy="34" rx="18" ry="12" fill="none" stroke={b} strokeWidth="1.4" />{Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * Math.PI * 2; return <circle key={i} cx={32 + 18 * Math.cos(t)} cy={34 + 12 * Math.sin(t)} r={i % 3 ? 3.4 : 4.4} fill={i % 3 ? a : b} /> })}</>,
  hairpin: (a, b) => <><path d="M14 52 L44 18" stroke={a} strokeWidth="4" strokeLinecap="round" /><circle cx="46" cy="16" r="7" fill={b} /><circle cx="46" cy="16" r="3" fill={a} /><path d="M36 14 q-6 -6 -2 -10 M54 20 q6 4 4 10" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" /></>,
  hairpiece: (a, b) => <><path d="M12 38 Q32 20 52 38" fill="none" stroke={b} strokeWidth="4" strokeLinecap="round" /><path d="M32 30 L20 14 L30 18Z M32 30 L44 14 L34 18Z" fill={a} /><circle cx="32" cy="30" r="6" fill={a} /><circle cx="32" cy="30" r="2.4" fill={W} /><path d="M32 36 V50 M28 40 V48 M36 40 V48" stroke={R} strokeWidth="1.6" /></>,
  ring: (a, b) => <><circle cx="32" cy="38" r="13" fill="none" stroke={b} strokeWidth="5" /><path d="M24 24 L32 14 L40 24 L32 30Z" fill={a} /><circle cx="30" cy="21" r="1.8" fill={W} /></>,
  hatstring: (a, b) => <><path d="M10 12 Q14 44 32 52 Q50 44 54 12" fill="none" stroke={b} strokeWidth="1.4" />{Array.from({ length: 9 }, (_, i) => { const t = i / 8; const x = 10 + 44 * t; const y = 12 + 40 * Math.sin(Math.PI * t) - (t * (1 - t)) * 10; return <ellipse key={i} cx={x} cy={y} rx="3.2" ry="4.2" fill={i % 2 ? a : b} /> })}</>,
  bowl: (a, b, v) => <><path d="M12 32 H52 Q50 52 32 52 Q14 52 12 32Z" fill={b} /><ellipse cx="32" cy="32" rx="20" ry="5" fill={a} /><path d="M24 52 H40 L38 56 H26Z" fill={b} />{garnish(v, b, 32)}</>,
  jar: (a, b, v) => <><rect x="25" y="9" width="14" height="7" rx="2" fill={b} /><path d="M24 16 H40 Q50 22 48 40 Q46 54 32 54 Q18 54 16 40 Q14 22 24 16Z" fill={W} opacity=".85" /><path d="M17 32 Q32 36 47 32 Q46 52 32 52 Q18 52 17 32Z" fill={a} />{v % 2 ? <rect x="24" y="36" width="16" height="9" rx="1" fill={W} opacity=".9" /> : <circle cx="26" cy="42" r="3" fill={W} opacity=".55" />}</>,
  cup: (a, b, v) => <><path d="M18 24 H42 L40 50 H20Z" fill={b} /><ellipse cx="30" cy="24" rx="12" ry="3.5" fill={a} /><path d="M42 30 Q52 30 50 38 Q48 44 41 43" fill="none" stroke={b} strokeWidth="3" /><ellipse cx="30" cy="52" rx="16" ry="3.5" fill={b} opacity=".7" />{v % 2 ? <path d="M25 18 q3 -5 0 -9 M33 18 q3 -5 0 -9" fill="none" stroke={W} strokeWidth="2" opacity=".8" /> : <path d="M38 22 q6 -10 12 -8 q-4 8 -12 8Z" fill={G} />}</>,
  plate: (a, b, v) => <><ellipse cx="32" cy="42" rx="22" ry="10" fill={b} /><ellipse cx="32" cy="40" rx="17" ry="7" fill={W} opacity=".6" />{[<path key="p" d="M18 38 Q24 28 32 34 Q40 26 46 38 Q32 46 18 38Z" fill={a} />, <g key="p">{[22, 32, 42].map((x) => <ellipse key={x} cx={x} cy="37" rx="6" ry="4" fill={a} />)}</g>, <path key="p" d="M20 39 L30 30 L44 33 L40 42Z" fill={a} />, <g key="p"><circle cx="27" cy="36" r="6" fill={a} /><circle cx="38" cy="37" r="6" fill={a} /></g>][v]}<circle cx="44" cy="30" r="2" fill={G} /></>,
  skewer: (a, b) => <><path d="M12 54 L52 12" stroke="#c9a46a" strokeWidth="2.4" strokeLinecap="round" />{[[22, 44], [32, 33], [42, 22]].map(([x, y], i) => <ellipse key={x} cx={x} cy={y} rx="7" ry="5" transform={`rotate(-45 ${x} ${y})`} fill={i % 2 ? b : a} />)}</>,
  pancake: (a, b) => <><ellipse cx="32" cy="42" rx="22" ry="9" fill={W} opacity=".6" /><ellipse cx="32" cy="38" rx="19" ry="9" fill={a} /><path d="M20 36 L26 40 M30 34 L36 41 M40 35 L44 40" stroke={b} strokeWidth="2.4" strokeLinecap="round" /><circle cx="28" cy="38" r="1.8" fill={R} /></>,
  fish: (a, b) => <><ellipse cx="32" cy="44" rx="22" ry="8" fill={W} opacity=".6" /><path d="M14 36 Q28 22 44 36 Q28 48 14 36Z" fill={a} /><path d="M44 36 L54 28 L52 36 L54 44Z" fill={a} /><circle cx="21" cy="34" r="1.8" fill={K} /><path d="M28 30 Q32 36 28 42 M34 30 Q38 36 34 42" fill="none" stroke={b} strokeWidth="1.6" /></>,
  jelly: (a, b) => <><ellipse cx="32" cy="48" rx="20" ry="6" fill={W} opacity=".6" /><path d="M16 46 L20 22 H44 L48 46Z" fill={a} /><path d="M20 22 H44" stroke={b} strokeWidth="2" /><path d="M22 30 H42 M21 38 H43" stroke={b} strokeWidth="1.4" opacity=".6" /><rect x="22" y="24" width="5" height="12" rx="2" fill={W} opacity=".45" /></>,
  candy: (a, b) => <>{[[22, 30], [40, 26], [31, 42]].map(([x, y], i) => <g key={x}><circle cx={x} cy={y} r="8" fill={i === 1 ? b : a} /><circle cx={x - 3} cy={y - 3} r="2" fill={W} opacity=".8" /></g>)}</>,
  dumpling: (a, b) => <><ellipse cx="32" cy="46" rx="22" ry="7" fill={b} opacity=".7" /><path d="M14 42 Q16 22 32 20 Q48 22 50 42Z" fill={a} /><path d="M20 30 Q24 26 26 31 Q30 25 33 31 Q36 25 39 31 Q42 26 45 31" fill="none" stroke={b} strokeWidth="1.8" /></>,
  pill: (a, b) => <><path d="M20 20 H44 V28 H20Z" fill={b} /><path d="M18 28 H46 L44 50 H20Z" fill={W} opacity=".8" />{[[26, 38], [34, 36], [38, 44], [28, 45]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={a} />)}<rect x="26" y="22" width="12" height="4" fill={R} /></>,
}

export const B08_ICONS = Object.fromEntries(
  Object.entries(B08_ICON_SPECS).map(([id, [shape, bg, c1, c2]]) => {
    const draw = SHAPES[shape] ?? SHAPES.pouch
    return [id, { bg, art: draw(c1, c2, hash(id) % 4) }]
  }),
)

// 까치 깃: 흑청색 바탕에 흰 줄이 든 짧은 깃
B08_ICONS['magpie-plain-feather'] = { bg: 'sky', art: (
  <>
    <path d="M20 52 C16 34 26 16 46 10 C48 30 38 46 20 52Z" fill={K} />
    <path d="M22 48 C24 36 32 24 42 16 C42 26 36 36 26 44Z" fill="#3e6aa8" />
    <path d="M24 46 C28 38 34 30 40 24" stroke={W} strokeWidth="3" strokeLinecap="round" />
    <path d="M20 52 L14 58" stroke={K} strokeWidth="2.6" strokeLinecap="round" />
  </>
) }
