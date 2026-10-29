import { useLayoutEffect, useRef } from 'react'
import { ScrollText } from 'lucide-react'

/** 활동 로그: 오래된 메시지는 위, 최신 메시지는 아래. 목록을 열 때만 최신 위치로 이동한다. */
export default function LogView({ logs }) {
  const listRef = useRef(null)
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, []) // 새 로그마다 강제로 스크롤하지 않는다. 과거 기록을 읽는 중에도 위치 유지.

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="flex shrink-0 items-center gap-2 font-serif text-base text-gold">
        <ScrollText size={16} aria-hidden />
        활동 로그
        <span className="font-sans text-[11px] font-normal text-paper/55">오래된 기록부터 표시되며 최신 기록은 맨 아래에 추가된다.</span>
      </h2>
      <div ref={listRef} aria-label="활동 로그" className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg bg-shade/30 px-3 py-2 font-mono text-xs leading-relaxed text-paper/80" style={{ overflowAnchor: 'none' }}>
        {logs.length === 0 ? (
          <p className="text-paper/40">아직 기록된 일이 없다.</p>
        ) : (
          logs.map((entry) => (
            <p key={entry.id} className="border-b border-edge/5 py-1 last:border-0">
              <span className="mr-2 text-gold/70">[{entry.time}]</span>
              {entry.message}
            </p>
          ))
        )}
      </div>
    </section>
  )
}
