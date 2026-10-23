import { useId, useRef, useState } from 'react'
import { STAT_META } from '../game/constants'

/** 기질 이름에 마우스를 올리거나 포커스하면 설명(머리줄 + 두 문단)을 띄운다. */
export default function StatTooltip({ statKey, side = 'left', children }) {
  const tip = STAT_META[statKey]?.tip
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const id = useId()
  if (!tip) return children

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const W = Math.min(320, window.innerWidth - 16)
    let left = side === 'left' ? r.left - W - 10 : r.right + 10
    if (side === 'below' || side === 'above') left = r.left
    left = Math.max(8, Math.min(left, window.innerWidth - W - 8))
    const top = side === 'below' ? r.bottom + 8 : Math.max(8, Math.min(r.top - 6, window.innerHeight - 300))
    setPos(side === 'above' ? { left, bottom: window.innerHeight - r.top + 8, W } : { left, top, W })
  }
  const hide = () => setPos(null)

  return (
    <span
      ref={ref}
      tabIndex={0}
      aria-describedby={pos ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="cursor-help rounded-sm underline decoration-gold/40 decoration-dotted underline-offset-4 outline-none focus-visible:ring-1 focus-visible:ring-gold"
    >
      {children}
      {pos && (
        <span
          id={id}
          role="tooltip"
          className="ink-panel pointer-events-none fixed z-[70] block rounded-lg p-3 text-left font-sans text-xs leading-relaxed font-normal text-paper"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.W }}
        >
          <b className="block text-[13px] leading-snug text-gold">{tip.head}</b>
          {tip.paras.map((p, i) => (
            <span key={i} className="mt-2 block break-keep text-paper/80">
              {p}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
