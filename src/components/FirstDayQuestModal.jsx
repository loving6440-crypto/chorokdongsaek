import { useEffect } from 'react'
import { Flag, X } from 'lucide-react'
import { FIRST_DAY_QUESTS } from '../game/firstDayQuest'

/** vC.01 [첫 등교 퀘스트] 팝업. 내용은 FIRST_DAY_QUESTS 에서 읽는다(지금은 비어 있음). */
export default function FirstDayQuestModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-scrim fixed inset-0 z-[95] grid place-items-center p-4" onClick={onClose} data-first-day-modal>
      <div role="dialog" aria-modal="true" aria-label="첫 등교 퀘스트" className="ink-panel flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Flag size={18} aria-hidden />
            첫 등교 퀘스트
          </h2>
          <button type="button" onClick={onClose} aria-label="첫 등교 퀘스트 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {FIRST_DAY_QUESTS.length === 0 ? (
            <p className="py-6 text-center text-sm text-paper/55" data-first-day-empty>아직 적힌 퀘스트가 없다.</p>
          ) : (
            <ul className="space-y-2">
              {FIRST_DAY_QUESTS.map((q) => (
                <li key={q.id} data-first-day-quest={q.id} className="rounded-xl bg-shade/25 p-3">
                  <p className="font-serif text-base text-paper">{q.title}</p>
                  {q.desc && <p className="mt-1 text-xs leading-relaxed text-paper/70">{q.desc}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
