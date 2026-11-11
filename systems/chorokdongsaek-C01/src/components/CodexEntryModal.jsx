import { X } from 'lucide-react'
import { codexEntries } from '../game/codex'
import { Entry } from './CodexModal'

/**
 * 도감 갱신 알림([도감 보기])을 눌렀을 때, 전체 도감 화면으로 들어가지 않고
 * 방금 새로 알게 된 그 항목(적·NPC·아이템·영능력)의 설명을 바로 팝업으로 보여준다.
 */
export default function CodexEntryModal({ chapterId, id, player, admin, onGet, onClose, onOpenFull }) {
  const list = codexEntries(chapterId, player, admin)
  const e = list.find((x) => x.id === id)
  if (!e) return null
  return (
    <div className="modal-scrim fixed inset-0 z-[85] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={e.name} data-codex-entry-modal={e.id} className="ink-panel w-full max-w-sm rounded-2xl p-4" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] tracking-widest text-gold">도감</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-7 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={14} aria-hidden />
          </button>
        </div>
        <ul className="mt-2">
          <Entry e={e} admin={admin} onGet={onGet} have={player.inventory} />
        </ul>
        <button type="button" onClick={onOpenFull} className="flat-btn mt-3 w-full justify-center text-xs">전체 도감 보기</button>
      </div>
    </div>
  )
}
