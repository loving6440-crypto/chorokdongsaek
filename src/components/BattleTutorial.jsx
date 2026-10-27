import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Swords, X } from 'lucide-react'
import { BATTLE_TUTORIAL_NODES } from '../game/battleTutorial'

const FACE_SRC = { bari: '/bari.png', 'bari-smile': '/bari-smile.png', 'bari-surprise': '/bari-surprise.png' }

/**
 * 전투 안내: 바리가 대사를 한 줄씩 이어가며 현재(v71) 전투 규칙을 설명해 주는 튜토리얼.
 * NODES(BATTLE_TUTORIAL_NODES) 배열을 순서대로 넘겨 보며, 기분(mood)에 따라 초상화가 바뀐다.
 */
export default function BattleTutorial({ open, onClose }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (open) setI(0)
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((p) => Math.min(BATTLE_TUTORIAL_NODES.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setI((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null

  const node = BATTLE_TUTORIAL_NODES[i]
  const lines = Array.isArray(node.text) ? node.text : [node.text]
  const last = i === BATTLE_TUTORIAL_NODES.length - 1

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="전투 안내">
      <div className="ink-panel flex max-h-[88vh] w-[min(34rem,94vw)] flex-col overflow-hidden rounded-2xl border-2 border-gold/70 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-edge/20 px-4 py-2.5">
          <p className="flex items-center gap-1.5 font-serif text-base font-bold text-gold">
            <Swords size={16} aria-hidden />
            전투 안내 ({i + 1}/{BATTLE_TUTORIAL_NODES.length})
          </p>
          <button type="button" onClick={onClose} aria-label="전투 안내 닫기" className="grid size-7 place-items-center rounded-lg text-paper/70 hover:bg-edge/10">
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <img
              key={node.face}
              src={FACE_SRC[node.face] ?? FACE_SRC.bari}
              alt="바리"
              className="size-24 shrink-0 rounded-2xl bg-edge/10 object-cover object-top sm:size-32"
              draggable={false}
            />
            <div className="min-w-0 flex-1">
              <p className="inline-block rounded-full bg-gold-fill px-3 py-0.5 text-xs font-medium text-ink light:text-ink">바리</p>
              <div className="mt-2 space-y-2 text-sm leading-[1.85] break-keep text-paper/95">
                {lines.map((l, k) => (
                  <p key={k}>{l}</p>
                ))}
              </div>
            </div>
          </div>
          {node.note && (
            <p className="mt-3 rounded-lg border border-gold/30 bg-gold-fill/10 px-3 py-2 text-xs leading-relaxed text-gold">{node.note}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge/20 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setI((p) => Math.max(0, p - 1))}
            disabled={i === 0}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper/80 disabled:opacity-30 hover:bg-edge/10"
          >
            <ChevronLeft size={14} /> 이전
          </button>
          <div className="flex gap-1" aria-hidden>
            {BATTLE_TUTORIAL_NODES.map((_, k) => (
              <span key={k} className={`size-1.5 rounded-full ${k === i ? 'bg-gold' : 'bg-edge/25'}`} />
            ))}
          </div>
          {last ? (
            <button type="button" onClick={onClose} className="rounded-lg bg-gold-fill px-3 py-1.5 text-xs font-bold text-ink light:text-ink">
              닫기
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setI((p) => Math.min(BATTLE_TUTORIAL_NODES.length - 1, p + 1))}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper/80 hover:bg-edge/10"
            >
              다음 <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
