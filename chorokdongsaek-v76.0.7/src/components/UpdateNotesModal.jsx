import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { UPDATE_NOTES } from '../game/updateNotes'

/** 업데이트 노트: 누구나 볼 수 있는, 버전별로 간단히 추린 변경 내역. */
export default function UpdateNotesModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="업데이트 노트" className="ink-panel flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Sparkles size={18} aria-hidden />
            업데이트 노트
          </h2>
          <button type="button" onClick={onClose} aria-label="업데이트 노트 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          {UPDATE_NOTES.map((n) => (
            <section key={n.version} data-update-note={n.version}>
              <p className="font-serif text-base text-gold">{n.version}</p>
              <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-paper/85">
                {n.items.map((t, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-paper/40">·</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {UPDATE_NOTES.length === 0 && <p className="text-sm text-paper/55">아직 적힌 노트가 없다.</p>}
        </div>
      </div>
    </div>
  )
}
