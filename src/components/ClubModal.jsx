import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, LogOut, Send, Users, X } from 'lucide-react'
import { leaveClub, sendClubChat, useOnline } from '../net/online'
import { CLUB_JOIN_LOCK_MS, clubOf as clubMetaOf } from '../game/clubs'
import { CLUB_QUESTS, CLUB_META_QUESTS, ensureWeekly, completedCount, rewardText } from '../game/clubQuests'

const timeOf = (at) => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
const fmtLeft = (ms) => {
  const h = Math.floor(ms / 3600000)
  const m = Math.ceil((ms % 3600000) / 60000)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

/** 왼쪽 하단 [동아리 확인하기] 에서 열리는 팝업: 동아리 채팅 / 멤버 목록 / 이번주 활동 / 탈퇴. */
export default function ClubModal({ player, onClose, onProfile, onFetchMembers }) {
  const net = useOnline()
  const club = net.club
  const meta = club ? clubMetaOf(club.id) : null
  const weekly = ensureWeekly(player ?? {}).weekly
  const doneCount = completedCount(weekly)
  const [text, setText] = useState('')
  const [members, setMembers] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!club) return
    onFetchMembers(club.id).then((r) => setMembers(r?.ok ? r.members : []))
  }, [club?.id, onFetchMembers])

  const toBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }
  useLayoutEffect(() => {
    toBottom()
  }, [club?.log?.length])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    setText('')
    await sendClubChat(v)
  }

  const myEntry = members?.find((m) => m.id === net.me?.id)
  const since = myEntry ? Date.now() - myEntry.joinedAt : club ? Date.now() - club.joinedAt : 0
  const canLeave = since >= CLUB_JOIN_LOCK_MS
  const [leaving, setLeaving] = useState(false)
  const doLeave = async () => {
    setLeaving(true)
    await leaveClub()
    setLeaving(false)
    onClose()
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="동아리"
        className="ink-panel flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <p className="flex items-center gap-1.5 font-serif text-lg text-gold">
            <Users size={16} aria-hidden />
            {meta ? meta.name : '동아리'}
          </p>
          <button type="button" onClick={onClose} aria-label="동아리 팝업 닫기" className="grid size-7 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={14} />
          </button>
        </div>

        {!club ? (
          <p className="px-4 py-8 text-center text-sm text-paper/60">아직 가입한 동아리가 없다. 별관의 동아리 부실을 찾아가 보자.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-3">
            {/* 동아리 채팅 */}
            <p className="text-[11px] tracking-widest text-paper/50">동아리 채팅</p>
            <div ref={listRef} className="mt-1.5 h-40 shrink-0 space-y-1.5 overflow-auto rounded-lg bg-shade/25 p-2.5" aria-live="polite" data-club-chat>
              {(club.log ?? []).length === 0 ? (
                <p className="text-center text-[11px] text-paper/40">아직 대화가 없다.</p>
              ) : (
                club.log.map((m) => (
                  <p key={m.id} className="text-[13px] leading-snug break-words text-paper">
                    <span className="mr-1 text-[10px] text-paper/40">{timeOf(m.at)}</span>
                    <b className={m.from?.id === net.me?.id ? 'text-gold' : 'text-paper/90'}>{m.from?.name}</b>
                    <span className="text-paper/50"> : </span>
                    {m.text}
                  </p>
                ))
              )}
            </div>
            <form onSubmit={submit} className="mt-1.5 flex gap-1.5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                placeholder="동아리 채팅"
                aria-label="동아리 채팅 입력"
                className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2.5 py-1.5 text-sm text-paper outline-none placeholder:text-paper/35 focus:border-gold"
              />
              <button type="submit" disabled={!text.trim()} aria-label="보내기" className="grid size-8 shrink-0 place-items-center rounded border border-gold bg-gold text-ink disabled:cursor-not-allowed disabled:opacity-40">
                <Send size={14} />
              </button>
            </form>

            {/* 멤버 목록 */}
            <p className="mt-4 text-[11px] tracking-widest text-paper/50">동아리 멤버</p>
            <ul className="mt-1.5 space-y-1 rounded-lg bg-shade/25 p-2.5">
              {members == null ? (
                <li className="text-[11px] text-paper/40">불러오는 중…</li>
              ) : members.length === 0 ? (
                <li className="text-[11px] text-paper/40">아직 멤버가 없다.</li>
              ) : (
                members.map((m) => (
                  <li key={m.id} className="text-sm">
                    <button type="button" onClick={() => onProfile?.({ id: m.id, name: m.name })} className="text-paper underline-offset-2 hover:text-gold hover:underline">
                      {m.name}
                    </button>
                    <span className="ml-1.5 text-[10px] text-paper/40">@{m.id}</span>
                  </li>
                ))
              )}
            </ul>

            {/* 이번주 동아리 활동 */}
            <p className="mt-4 flex items-center justify-between text-[11px] tracking-widest text-paper/50">
              <span>이번주 동아리 활동</span>
              <span className="text-paper/40">({doneCount}/{CLUB_QUESTS.length} · 매주 월요일 0시 초기화)</span>
            </p>
            <ul className="mt-1.5 space-y-1 rounded-lg bg-shade/25 p-2.5" data-club-quests>
              {CLUB_QUESTS.map((q) => {
                const done = !!weekly.claimed?.[q.id]
                return (
                  <li key={q.id} data-quest={q.id} data-quest-done={done} className={`flex items-start gap-1.5 text-xs leading-relaxed ${done ? 'text-gold' : 'text-paper/75'}`}>
                    <span className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full ${done ? 'bg-gold text-ink' : 'border border-edge/30'}`}>
                      {done && <Check size={10} aria-hidden />}
                    </span>
                    <span className="flex-1">
                      {q.label}
                      {q.reward && <span className="ml-1 text-[10px] text-paper/45">({rewardText(q.reward)})</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-[11px] tracking-widest text-paper/50">동아리 활동 달성 개수 보상</p>
            <ul className="mt-1.5 space-y-1 rounded-lg bg-shade/25 p-2.5" data-club-meta-quests>
              {CLUB_META_QUESTS.map((q) => {
                const done = !!weekly.claimed?.[q.id]
                return (
                  <li key={q.id} data-quest={q.id} data-quest-done={done} className={`flex items-start gap-1.5 text-xs leading-relaxed ${done ? 'text-gold' : 'text-paper/75'}`}>
                    <span className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full ${done ? 'bg-gold text-ink' : 'border border-edge/30'}`}>
                      {done && <Check size={10} aria-hidden />}
                    </span>
                    <span className="flex-1">
                      {q.label}
                      <span className="ml-1 text-[10px] text-paper/45">({rewardText(q.reward)})</span>
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* 탈퇴 */}
            <button
              type="button"
              disabled={!canLeave || leaving}
              onClick={doLeave}
              title={canLeave ? undefined : `가입 24시간 뒤부터 탈퇴할 수 있다. (${fmtLeft(CLUB_JOIN_LOCK_MS - since)} 남음)`}
              className="mt-4 inline-flex items-center justify-center gap-1.5 self-start rounded border border-crimson/50 px-3 py-1.5 text-xs text-crimson hover:bg-crimson/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogOut size={13} aria-hidden />
              동아리 탈퇴하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
