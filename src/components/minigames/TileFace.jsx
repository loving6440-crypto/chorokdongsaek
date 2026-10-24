import { toHanjaLines } from '../../game/minigames/hanja'
import { skinOf } from '../../game/skins2048'

// 부적 색: 머스타드 바탕에 진빨강 글씨. 수가 커질수록 머스타드가 짙어지다가,
// 1024부터는 진빨강 바탕에 머스타드 글씨로 뒤집힌다.
const TILE_STYLE = {
  2: ['#f4e5a8', '#8a1c1c'],
  4: ['#f0d983', '#8a1c1c'],
  8: ['#ebcc5f', '#861616'],
  16: ['#e5bd44', '#821313'],
  32: ['#dfae30', '#7e1111'],
  64: ['#d6a021', '#7a0f10'],
  128: ['#cc9318', '#6f0d0f'],
  256: ['#c0830f', '#650b0e'],
  512: ['#b0700e', '#fff1c4'],
  1024: ['#9b2024', '#f6d86e'],
  2048: ['#74100f', '#ffd95a'],
}
export const tileStyle = (v, skinId = 'talisman') => {
  const sk = skinOf(skinId)
  const table = sk.tiles ?? TILE_STYLE
  return table[v] ?? sk.over ?? ['#3d0709', '#ffd95a']
}

/** 연분홍 벚꽃 한 송이(꽃잎 다섯 장). 타일 구석의 장식. */
function Blossom({ size = 12, color = 'currentColor', className = '' }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden className={className}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0 0 C-5 -3 -5 -9 0 -9.5 C5 -9 5 -3 0 0Z" fill={color} />
      ))}
      <circle r="1.6" fill="#fff8d8" />
    </svg>
  )
}
export { Blossom }

/**
 * 2048 타일 한 장.
 *  mode 'hanja': 한자가 주인공, 왼쪽 위 구석에 아라비아 숫자를 작게 병기한다.
 *  mode 'number': 같은 디자인에 아라비아 숫자만 크게 보인다.
 * 타일 자신이 컨테이너(cqw)라서, 보드 크기가 어떻게 바뀌어도 글자가 타일 폭 안에 맞게 줄어든다.
 */
export default function TileFace({ value, className = '', mode = 'hanja', skin = 'talisman' }) {
  const [bg, fg] = tileStyle(value, skin)
  const cute = skin === 'changnok'
  const lines = toHanjaLines(value)
  const longest = Math.max(...lines.map((l) => [...l].length))
  const digits = String(value).length
  return (
    <div
      className={`relative grid size-full place-items-center select-none ${cute ? 'rounded-xl' : 'rounded'} ${className}`}
      style={{
        backgroundColor: bg,
        backgroundImage: cute ? 'linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)' : undefined,
        boxShadow: cute ? `0 2px 0 rgba(168, 48, 77, 0.28), inset 0 0 0 1.5px rgba(255,255,255,0.45)` : undefined,
        color: fg,
        containerType: 'inline-size',
      }}
      title={`${value}`}
    >
      {cute && (
        <>
          <Blossom size={value >= 512 ? 15 : 11} color={value >= 32 ? 'rgba(255,255,255,0.8)' : '#f4a3bb'} className="pointer-events-none absolute right-[4px] bottom-[4px]" />
          {value >= 128 && <Blossom size={8} color="rgba(255,255,255,0.65)" className="pointer-events-none absolute right-[18px] bottom-[7px]" />}
        </>
      )}
      {mode === 'hanja' ? (
        <>
          <span aria-hidden className="pointer-events-none absolute top-[5px] left-[7px] font-sans text-[10px] leading-none font-semibold tabular-nums opacity-70">
            {value}
          </span>
          <span
            className="font-serif leading-[1.08] font-bold whitespace-nowrap"
            style={{
              fontSize: `min(2.1rem, ${(88 / longest).toFixed(2)}cqw)`,
              marginTop: lines.length > 1 ? '0.5rem' : '0.35rem',
            }}
            aria-label={`${value}`}
          >
            {lines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </span>
        </>
      ) : (
        <span
          className={`${cute ? 'font-sans' : 'font-serif'} leading-none font-bold tabular-nums`}
          style={{ fontSize: `min(2.2rem, ${(Math.min(52, 150 / Math.max(2, digits))).toFixed(1)}cqw)` }}
          aria-label={`${value}`}
        >
          {value}
        </span>
      )}
    </div>
  )
}
