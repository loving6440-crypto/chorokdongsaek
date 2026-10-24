import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Avatar from './Avatar'
import { fetchCard } from '../net/online'

/** 접속자·채팅의 닉네임을 눌렀을 때 뜨는 인적사항 카드. */
export default function ProfileCardModal({ target, onClose }) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let alive = true
    setState({ loading: true })
    fetchCard(target.id).then((r) => {
      if (alive) setState(r.ok ? { card: r.card, online: r.online, title: r.title } : { error: r.status === 404 ? '아직 인적사항을 올리지 않은 사람이다.' : '인적사항을 불러오지 못했다.' })
    })
    return () => {
      alive = false
    }
  }, [target.id])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const c = state.card
  return (
    <div className="modal-scrim fixed inset-0 z-[85] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${target.name}의 인적사항`} data-profile-card className="ink-panel w-full max-w-xs rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-xs tracking-[0.2em] text-gold/80">인적 사항</p>
          <button type="button" onClick={onClose} aria-label="인적사항 닫기" className="grid size-7 place-items-center rounded-full bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={14} />
          </button>
        </div>
        {state.loading ? (
          <p className="mt-6 text-center text-sm text-paper/55">불러오는 중…</p>
        ) : state.error ? (
          <div className="mt-4 text-center">
            <p className="font-serif text-lg text-paper">{target.name}</p>
            <p className="mt-2 text-sm text-paper/60">{state.error}</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center text-center">
            <Avatar avatar={c.avatar} size={84} />
            <p className="mt-3 font-serif text-xl text-gold" data-card-name>
              {state.title && <span className="mr-1.5 rounded bg-crimson/80 px-1.5 py-px align-middle font-sans text-[10px] font-medium text-white">[{state.title}]</span>}
              {c.name}
            </p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {c.grade && <span className="rounded-md border border-edge/25 px-2 py-0.5 text-xs text-paper/80">{c.grade}학년</span>}
              {c.age && <span className="rounded-md border border-edge/25 px-2 py-0.5 text-xs text-paper/80">{c.age}세</span>}
              <span className={`rounded-md px-2 py-0.5 text-xs ${state.online ? 'bg-gold-fill/25 text-gold' : 'bg-edge/10 text-paper/55'}`}>{state.online ? '접속 중' : '접속 종료'}</span>
            </div>
            <p className="mt-3 w-full rounded-lg bg-edge/[0.07] px-3 py-2 text-sm leading-relaxed break-keep text-paper/85" data-card-greeting>
              {c.greeting ? `“${c.greeting}”` : <span className="text-paper/40">한 줄 인사가 없다.</span>}
            </p>
            <p className="mt-2 text-[10px] text-paper/35">@{target.id}</p>
          </div>
        )}
      </div>
    </div>
  )
}
