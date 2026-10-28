import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STAT_META } from '../game/constants'
import { tooltipPosition } from './statTooltipPosition.mjs'

/**
 * 스탯 설명은 마우스 좌표에 붙여 표시한다.
 * 스크롤/transform/overflow가 있는 부모 안에서 fixed가 어긋나지 않도록
 * 툴팁만 document.body 포털에 그린다.
 */
export default function StatTooltip({ statKey, side = 'left', children }) {
  const tip = STAT_META[statKey]?.tip
  const [cursor, setCursor] = useState(null)
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const id = useId()

  useLayoutEffect(() => {
    const node = tooltipRef.current
    if (!cursor || !node) return

    // 실제 설명창 크기를 측정해 화면 바깥으로 잘리지 않게 배치한다.
    const bounds = node.getBoundingClientRect()
    const { left, top } = tooltipPosition({
      x: cursor.x,
      y: cursor.y,
      width: bounds.width,
      height: bounds.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      above: side === 'above',
    })
    node.style.left = `${left}px`
    node.style.top = `${top}px`
  }, [cursor, side])

  if (!tip) return children

  const showAtPointer = (event) => setCursor({ x: event.clientX, y: event.clientY })
  const showAtFocus = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setCursor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }
  const hide = () => setCursor(null)

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={cursor ? id : undefined}
      onMouseEnter={showAtPointer}
      onMouseMove={showAtPointer}
      onMouseLeave={hide}
      onFocus={showAtFocus}
      onBlur={hide}
      className="cursor-help rounded-sm underline decoration-gold/40 decoration-dotted underline-offset-4 outline-none focus-visible:ring-1 focus-visible:ring-gold"
    >
      {children}
      {cursor && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="ink-panel pointer-events-none fixed z-[9999] block overflow-y-auto rounded-lg p-3 text-left font-sans text-xs leading-relaxed font-normal text-paper"
          style={{ left: -9999, top: -9999, width: 'min(320px, calc(100vw - 16px))', maxHeight: 'calc(100vh - 16px)' }}
        >
          <b className="block text-[13px] leading-snug text-gold">{tip.head}</b>
          {tip.paras.map((p, i) => (
            <span key={i} className="mt-2 block break-keep text-paper/80">
              {p}
            </span>
          ))}
        </span>,
        document.body,
      )}
    </span>
  )
}
