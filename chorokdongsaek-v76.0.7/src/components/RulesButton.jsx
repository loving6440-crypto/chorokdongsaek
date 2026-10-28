import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import RulesModal from './RulesModal'

/** "[규칙 읽기]" 버튼 + 눌렀을 때 뜨는 팝업. 게임 시작 전/중 어디서든 쓸 수 있다. */
export default function RulesButton({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flat-btn-ghost !py-0.5 text-[11px]"
        data-rules-open={title}
      >
        <BookOpen size={11} aria-hidden />
        규칙 읽기
      </button>
      {open && (
        <RulesModal title={title} onClose={() => setOpen(false)}>
          {children}
        </RulesModal>
      )}
    </>
  )
}
