import { MONTHS } from '../../game/minigames/hwatu'

// 화투패 앞면 (60×90 좌표계의 단순화한 삽화). 실제 화투 도안을 베끼지 않은 자체 그림이다.
const BAND = { hong: '#d6414b', cho: '#3a9360', cheong: '#3f86ff' }

const petals = (cx, cy, n, dist, r, fill, stroke) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return <circle key={i} cx={cx + Math.cos(a) * dist} cy={cy + Math.sin(a) * dist} r={r} fill={fill} stroke={stroke} strokeWidth="0.6" />
  })

function Motif({ month }) {
  switch (month) {
    case 1: // 솔
      return (
        <g>
          <circle cx="46" cy="25" r="6" fill="#d6414b" />
          <rect x="28" y="46" width="4" height="20" fill="#6b4423" />
          <polygon points="30,20 18,36 42,36" fill="#2e7d4f" />
          <polygon points="30,29 15,47 45,47" fill="#3a9360" />
          <polygon points="30,38 12,58 48,58" fill="#2e7d4f" />
        </g>
      )
    case 2: // 매화
      return (
        <g>
          <path d="M8 66 Q26 52 48 24" stroke="#6b4423" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[[22, 50], [36, 36], [44, 26]].map(([x, y], i) => (
            <g key={i}>
              {petals(x, y, 5, 4.2, 3.4, '#f08aa0', '#c9566f')}
              <circle cx={x} cy={y} r="1.6" fill="#f4c94a" />
            </g>
          ))}
        </g>
      )
    case 3: // 벚꽃
      return (
        <g>
          <path d="M10 66 Q28 56 50 34" stroke="#7a5a44" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {[[22, 44, 1], [38, 34, 1], [30, 56, 1.15], [46, 46, 0.85]].map(([x, y, k], i) => (
            <g key={i}>
              {petals(x, y, 5, 4.6 * k, 3.8 * k, '#fbd0dc', '#e58aa5')}
              <circle cx={x} cy={y} r={1.4 * k} fill="#e0657f" />
            </g>
          ))}
        </g>
      )
    case 4: // 흑싸리
      return (
        <g>
          <path d="M8 68 Q30 50 50 22" stroke="#2b2b3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {[[16, 60, -30], [26, 54, 20], [30, 46, -40], [38, 38, 25], [42, 30, -35], [46, 24, 20]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="6" ry="2.6" transform={`rotate(${r} ${x} ${y})`} fill="#2d2d4a" />
          ))}
          {[[22, 46], [34, 36], [44, 28]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#d6a526" />
          ))}
        </g>
      )
    case 5: // 난초
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M30 68 Q22 42 8 24" stroke="#2f8f5b" strokeWidth="3.2" />
          <path d="M30 68 Q32 44 30 20" stroke="#3aa56b" strokeWidth="3.2" />
          <path d="M30 68 Q40 46 52 30" stroke="#2f8f5b" strokeWidth="3.2" />
          {[[30, 24], [24, 32], [38, 30]].map(([x, y], i) => (
            <g key={i}>{petals(x, y, 5, 3.2, 2.6, '#8a5ad8', '#5a37a8')}</g>
          ))}
        </g>
      )
    case 6: // 모란
      return (
        <g>
          <ellipse cx="16" cy="54" rx="11" ry="5" transform="rotate(-20 16 54)" fill="#3a9360" />
          <ellipse cx="44" cy="54" rx="11" ry="5" transform="rotate(20 44 54)" fill="#2e7d4f" />
          <circle cx="30" cy="40" r="16" fill="#d6414b" />
          <circle cx="30" cy="40" r="11" fill="#ea6a73" />
          <circle cx="30" cy="40" r="6" fill="#f6a0a6" />
          <circle cx="30" cy="40" r="2" fill="#f4c94a" />
        </g>
      )
    case 7: // 홍싸리
      return (
        <g>
          <path d="M8 64 Q28 28 52 38" stroke="#7a4a2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {[[14, 54, 20], [22, 42, -30], [32, 36, 25]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="6" ry="2.6" transform={`rotate(${r} ${x} ${y})`} fill="#4a9d6b" />
          ))}
          {[[26, 42], [34, 40], [40, 42], [45, 45], [30, 50], [38, 50], [44, 54]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="2.4" ry="4" fill="#c0392b" />
          ))}
        </g>
      )
    case 8: // 공산
      return (
        <g>
          <circle cx="30" cy="30" r="14" fill="#f6e7a1" stroke="#e0c75a" strokeWidth="0.8" />
          <path d="M6 70 Q20 48 34 58 T54 52 L54 70 Z" fill="#2b2b3a" />
          {[12, 20, 28, 36, 44].map((x, i) => (
            <path key={i} d={`M${x} 68 Q${x + 2} 58 ${x + 5} 54`} stroke="#4a9d6b" strokeWidth="1.4" fill="none" />
          ))}
        </g>
      )
    case 9: // 국화
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="30" cy="30" rx="3" ry="9" transform={`rotate(${i * 30} 30 42)`} fill="#f4c94a" stroke="#d9972a" strokeWidth="0.6" />
          ))}
          <circle cx="30" cy="42" r="5.5" fill="#e07b1c" />
          <path d="M30 56 L30 68" stroke="#3a9360" strokeWidth="2" />
        </g>
      )
    case 10: // 단풍
      return (
        <g>
          <path
            d="M30 20 L34 32 L46 28 L40 40 L52 46 L38 48 L40 62 L30 54 L20 62 L22 48 L8 46 L20 40 L14 28 L26 32 Z"
            fill="#e0502a"
            stroke="#a8321a"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path d="M30 54 L30 70" stroke="#7a4a2a" strokeWidth="2" />
        </g>
      )
    case 11: // 오동
      return (
        <g>
          <path d="M30 70 L30 30" stroke="#6b4423" strokeWidth="2.2" />
          <ellipse cx="20" cy="54" rx="13" ry="9" transform="rotate(-15 20 54)" fill="#3a9360" />
          <ellipse cx="41" cy="50" rx="13" ry="9" transform="rotate(15 41 50)" fill="#2e7d4f" />
          {[[24, 28], [34, 24], [30, 36], [40, 34], [20, 36]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="3.2" ry="4.6" fill="#8a5ad8" />
          ))}
        </g>
      )
    default: // 12 비
      return (
        <g>
          <path d="M6 24 Q30 18 54 24" stroke="#6b4423" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {[12, 20, 28, 36, 44].map((x, i) => (
            <path key={i} d={`M${x} 22 Q${x + (i % 2 ? 4 : -4)} 42 ${x} ${58 - (i % 3) * 3}`} stroke="#3a9360" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          ))}
          {[[8, 46], [20, 62], [34, 66], [48, 50], [52, 64]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} q-2 4 0 5 q2 -1 0 -5`} fill="#4a90ff" stroke="#2b66c9" strokeWidth="0.6" />
          ))}
        </g>
      )
  }
}

function Marker({ card }) {
  if (card.kind === 'gwang')
    return (
      <g>
        <circle cx="30" cy="78" r="7.5" fill="#f4c94a" stroke="#b08f2c" strokeWidth="0.8" />
        <text x="30" y="81.4" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7a1f1f">光</text>
      </g>
    )
  if (card.kind === 'tti')
    return (
      <g>
        <rect x="14" y="72" width="32" height="10" rx="2" fill={BAND[card.band] ?? '#d6414b'} />
        <path d="M20 75 h20 M20 79 h20" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.9" />
      </g>
    )
  const label = card.kind === 'yeol' ? '열끗' : card.kind === 'ssang' ? '쌍피' : '피'
  return (
    <g>
      <circle cx="30" cy="78" r="6.2" fill="none" stroke="#4a3b2c" strokeWidth="0.8" strokeOpacity={card.kind === 'pi' ? 0.45 : 1} />
      <text x="30" y="80.6" textAnchor="middle" fontSize={card.kind === 'pi' ? 7 : 5.4} fontWeight="700" fill="#4a3b2c" fillOpacity={card.kind === 'pi' ? 0.6 : 1}>
        {label}
      </text>
    </g>
  )
}

export default function HwatuFace({ card }) {
  const m = MONTHS[card.month - 1]
  return (
    <svg viewBox="0 0 60 90" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="58" height="88" rx="6" fill="#fbf6e6" stroke="#3a2a1a" strokeWidth="1.6" />
      <rect x="4" y="4" width="52" height="82" rx="4" fill="none" stroke="#c9b98f" strokeWidth="0.7" />
      <text x="8" y="14" fontSize="9" fontWeight="700" fill="#b0243a">{card.month}월</text>
      <text x="52" y="14" textAnchor="end" fontSize="7" fill="#4a3b2c">{m.name}</text>
      <Motif month={card.month} />
      <Marker card={card} />
    </svg>
  )
}

/** 화투패 뒷면: 적(赤) 바탕에 단청풍 무늬. */
export function HwatuBack() {
  return (
    <svg viewBox="0 0 60 90" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="58" height="88" rx="6" fill="#b3262e" stroke="#4a1014" strokeWidth="1.6" />
      <rect x="5" y="5" width="50" height="80" rx="4" fill="none" stroke="#f4c94a" strokeWidth="0.8" strokeOpacity="0.8" />
      <circle cx="30" cy="45" r="14" fill="none" stroke="#f4c94a" strokeWidth="0.9" strokeOpacity="0.9" />
      <circle cx="30" cy="45" r="6" fill="#f4c94a" fillOpacity="0.9" />
      {[[16, 20], [44, 20], [16, 70], [44, 70]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={['#3f86ff', '#f3efe4', '#f4c94a', '#1b1b2a'][i]} />
      ))}
    </svg>
  )
}
