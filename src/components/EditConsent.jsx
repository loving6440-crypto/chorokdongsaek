import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { STAT_META } from '../game/constants'
import { respondEdit, clearEditResult } from '../net/online'

export const describeChanges = (ch = {}) => {
  const out = []
  if (ch.stats) for (const [k, v] of Object.entries(ch.stats)) out.push(`${STAT_META[k]?.label ?? k} → ${v}`)
  if (ch.clearWeak) out.push('[쇠약] 해제')
  if (ch.clearBuffs) out.push('버프 · 디버프 초기화')
  if (ch.refill) out.push('체력 · 의지력 가득 채우기')
  return out
}

/** 관리자의 수정 요청을 받으면 묻는 창. 동의해야만 바뀐다. (60초 안에 답이 없으면 없던 일이 된다) */
export default function EditConsent({ online, onAccept }) {
  const req = online.editReq
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!req) return
    const tick = () => setLeft(Math.max(0, Math.ceil((req.expires - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [req])
  if (!req) return null
  const answer = async (accept) => {
    if (accept) onAccept(req.changes)
    await respondEdit(req.rid, accept)
  }
  return (
    <div className="modal-scrim fixed inset-0 z-[90] grid place-items-center p-4" data-edit-consent>
      <div role="dialog" aria-modal="true" aria-label="관리자 수정 요청" className="ink-panel w-full max-w-sm rounded-xl p-5">
        <p className="flex items-center justify-center gap-2 font-serif text-lg text-gold"><Shield size={18} aria-hidden />관리자 수정 요청</p>
        <p className="mt-2 text-center text-sm text-paper/85"><b className="text-paper">{req.adminName}</b> 님이 내 상태를 아래처럼 바꾸려 합니다.</p>
        <ul className="mt-3 space-y-1 rounded-lg bg-shade/25 p-3 text-sm text-paper" data-edit-changes>
          {describeChanges(req.changes).map((t) => <li key={t}>· {t}</li>)}
        </ul>
        <p className="mt-2 text-center text-[11px] text-paper/55">동의하지 않으면 아무것도 바뀌지 않는다. ({left}초 뒤 자동 취소)</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" data-edit-accept onClick={() => answer(true)} className="rounded border border-gold bg-gold px-6 py-1.5 text-sm font-medium text-ink">동의</button>
          <button type="button" data-edit-decline onClick={() => answer(false)} className="rounded border border-gold/40 px-6 py-1.5 text-sm text-gold hover:bg-gold/10">거절</button>
        </div>
      </div>
    </div>
  )
}

export { clearEditResult }
