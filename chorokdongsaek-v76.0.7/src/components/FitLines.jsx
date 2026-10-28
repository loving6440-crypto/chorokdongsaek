import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 줄바꿈 없이 "한 줄 = 한 문장"으로 보여 주는 텍스트 블록.
 * 가장 긴 줄이 컨테이너 폭에 딱 들어가도록 글자 크기를 자동으로 계산한다.
 * (창 크기·폰트 로딩이 바뀌면 다시 계산. 같은 블록 안의 줄은 모두 같은 크기를 쓴다.)
 */
export default function FitLines({ lines, maxSize = 26, className = '', gap = '1.1em' }) {
  const boxRef = useRef(null)
  const measureRef = useRef(null)
  const [size, setSize] = useState(null)

  const fit = useCallback(() => {
    const box = boxRef.current
    const probe = measureRef.current
    if (!box || !probe) return
    const avail = box.clientWidth
    // probe 는 100px 로 그려 둔 보이지 않는 복사본이다. 가장 긴 줄의 폭을 잰다.
    let widest = 0
    for (const el of probe.children) widest = Math.max(widest, el.getBoundingClientRect().width)
    if (!avail || !widest) return
    const next = Math.min(maxSize, Math.floor((avail / widest) * 100 * 0.985 * 10) / 10)
    setSize((prev) => (prev === next ? prev : next))
  }, [maxSize])

  useLayoutEffect(() => {
    fit()
  }, [fit, lines])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    const fonts = document.fonts
    fonts?.ready?.then(fit)
    fonts?.addEventListener?.('loadingdone', fit)
    return () => {
      ro.disconnect()
      fonts?.removeEventListener?.('loadingdone', fit)
    }
  }, [fit])

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        ref={measureRef}
        aria-hidden
        className={`pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap ${className}`}
        style={{ fontSize: 100 }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block w-max whitespace-nowrap">
            {line}
          </span>
        ))}
      </div>

      <div className={className} style={{ fontSize: size ?? 0, visibility: size == null ? 'hidden' : 'visible' }}>
        {lines.map((line, i) => (
          <p key={i} className="whitespace-nowrap" style={{ marginTop: i ? gap : 0 }}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
