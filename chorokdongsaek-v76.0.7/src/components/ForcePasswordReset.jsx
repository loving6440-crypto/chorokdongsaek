import { useState } from 'react'
import { Lock } from 'lucide-react'
import { setNewPassword } from '../game/auth'

/** 관리자가 임시 비밀번호를 발급해 준 뒤, 본인이 로그인하면 이 창을 먼저 통과해야 게임으로 들어간다. */
export default function ForcePasswordReset({ onDone }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (p1.length < 4) return setErr('비밀번호는 4글자 이상이어야 합니다.')
    if (p1 !== p2) return setErr('비밀번호가 서로 일치하지 않습니다.')
    setBusy(true)
    const r = await setNewPassword(p1)
    setBusy(false)
    if (!r.ok) return setErr(r.error || '비밀번호를 바꾸지 못했습니다.')
    onDone()
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[100] grid place-items-center p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="새 비밀번호 설정" className="ink-panel w-full max-w-sm rounded-2xl p-5" data-force-reset>
        <p className="flex items-center gap-2 font-serif text-lg text-gold"><Lock size={18} aria-hidden />새 비밀번호를 정해 주세요</p>
        <p className="mt-2 text-sm text-paper/75">관리자가 임시 비밀번호를 발급했습니다. 계속하려면 새 비밀번호를 정해야 합니다.</p>
        <label htmlFor="reset-p1" className="mt-4 block text-xs text-paper/60">새 비밀번호</label>
        <input id="reset-p1" type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper outline-none focus:border-gold/50" />
        <label htmlFor="reset-p2" className="mt-3 block text-xs text-paper/60">새 비밀번호 확인</label>
        <input id="reset-p2" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper outline-none focus:border-gold/50" />
        {err && <p role="alert" className="mt-2 text-xs text-crimson" data-force-reset-err>{err}</p>}
        <button type="submit" disabled={busy} className="flat-btn mt-4 w-full justify-center disabled:opacity-50">비밀번호 바꾸고 계속하기</button>
      </form>
    </div>
  )
}
