import { useEffect, useRef } from 'react'
import { BookOpen, X } from 'lucide-react'

/** 게임 룰 설명 팝업의 공통 틀. 게임 중에도 열람 가능해야 하므로, 호출부가 무엇을 하고 있든 독립적으로 뜬다. */
export default function RulesModal({ title, onClose, children }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ink-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-serif text-base text-gold">
            <BookOpen size={15} aria-hidden />
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-paper/50 hover:bg-edge/10 hover:text-paper"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
