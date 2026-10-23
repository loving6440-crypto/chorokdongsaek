import { toHanjaLines } from '../../game/minigames/hanja'

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
const tileStyle = (v) => TILE_STYLE[v] ?? ['#3d0709', '#ffd95a']

/**
 * 2048 타일 한 장. 한자가 주인공이고, 왼쪽 위 구석에 아라비아 숫자를 작게 병기한다.
 * 타일 자신이 컨테이너(cqw)라서, 보드 크기가 어떻게 바뀌어도 글자가 타일 폭 안에 맞게 줄어든다.
 */
export default function TileFace({ value, className = '' }) {
  const [bg, fg] = tileStyle(value)
  const lines = toHanjaLines(value)
  const longest = Math.max(...lines.map((l) => [...l].length))
  return (
    <div
      className={`relative grid size-full place-items-center rounded select-none ${className}`}
      style={{ backgroundColor: bg, color: fg, containerType: 'inline-size' }}
      title={`${value}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-[5px] left-[7px] font-sans text-[10px] leading-none font-semibold tabular-nums opacity-70"
      >
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
    </div>
  )
}
