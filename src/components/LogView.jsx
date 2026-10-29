import { ScrollText } from 'lucide-react'

/** 활동 로그. 위쪽 칸 안에 들어가는 작은 목록. */
export default function LogView({ logs }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-serif text-base text-gold">
        <ScrollText size={16} aria-hidden />
        활동 로그
        <span className="font-sans text-[11px] font-normal text-paper/55">교내에서 있었던 일이 최근 순으로 기록된다.</span>
      </h2>
      <div className="mt-2 rounded-lg bg-shade/30 px-3 py-2 font-mono text-xs leading-relaxed text-paper/80">
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
