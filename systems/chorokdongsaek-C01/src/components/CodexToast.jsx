import { useEffect } from 'react'
import { BookMarked } from 'lucide-react'

/** 도감이 새로 채워졌을 때 위쪽에 뜨는 알림. 전투를 가리지 않도록 스크림 없이(버튼 외엔 클릭이 그대로 통과) 띄우고, 잠시 뒤 저절로 닫힌다. */
export default function CodexToast({ entries, onOpen, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000)
    return () => clearTimeout(t)
  }, [entries, onClose])
  const shown = entries.slice(0, 5)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[95] flex justify-center px-3">
      <div role="status" aria-label="도감 갱신" data-codex-toast className="ink-panel pointer-events-none w-full max-w-sm rounded-2xl p-4 shadow-2xl ring-2 ring-gold/60">
        <p className="flex items-center gap-2 font-serif text-base text-gold">
          <BookMarked size={17} aria-hidden />
          도감이 갱신되었다!
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-paper">
          {shown.map((e) => (
            <li key={e.key}>
              <span className="mr-1.5 rounded-full border border-edge/25 px-1.5 py-px text-[10px] text-paper/60">{e.chapter}</span>
              {e.name}
            </li>
          ))}
          {entries.length > shown.length && <li className="text-xs text-paper/55">… 외 {entries.length - shown.length}개</li>}
        </ul>
        <div className="pointer-events-auto mt-3 flex justify-end gap-2">
          <button type="button" onClick={onOpen} className="flat-btn !py-1 text-xs">도감 보기</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-edge/10 px-3 py-1 text-xs text-paper/80 hover:bg-edge/20">확인</button>
        </div>
      </div>
    </div>
  )
}
