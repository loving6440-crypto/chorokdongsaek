import { useEffect, useRef, useState } from 'react'
import { Gift, MessageCircle, Send, UserPlus, Users, X } from 'lucide-react'
import {
  dismissNotice,
  inviteToParty,
  leaveParty,
  respondInvite,
  sendChat,
  setActiveChannel,
  useOnline,
} from '../net/online'

// 연락: RP 용 공개 탭 / 담화: 일반 공개 탭 / 일행: 일행(파티) 사람들끼리만 보이는 비공개 탭
const TABS = [
  { id: 'rp', label: '연락', hint: 'RP용 · 접속자 모두가 본다' },
  { id: 'talk', label: '담화', hint: '일반 대화 · 접속자 모두가 본다' },
  { id: 'party', label: '일행', hint: '일행끼리만 보이는 대화' },
]

const timeOf = (at) =>
  new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function ChatPanel({ docked = false, logs = null, onGift = null }) {
  const net = useOnline()
  const [openState, setOpen] = useState(false)
  const open = docked || openState
  const [tab, setTab] = useState('talk')
  const [text, setText] = useState('')
  const [showWho, setShowWho] = useState(false)
  const [seenLog, setSeenLog] = useState(null)
  const isLog = tab === 'log'
  const latestLogId = logs?.[0]?.id ?? null
  useEffect(() => {
    if (isLog) setSeenLog(latestLogId)
  }, [isLog, latestLogId])
  const logUnread = !!logs && !isLog && latestLogId !== null && latestLogId !== seenLog
  const listRef = useRef(null)

  // 열려 있는 탭은 읽은 것으로 친다.
  useEffect(() => {
    setActiveChannel(open && tab !== 'log' ? tab : null)
    return () => setActiveChannel(null)
  }, [open, tab])

  const msgs = net.history[tab] || []
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, open, tab])

  const totalUnread = net.unread.rp + net.unread.talk + net.unread.party
  const connected = net.status === 'online'
  const inParty = !!net.party

  const submit = async (e) => {
    e.preventDefault()
    const v = text.trim()
    if (!v || !connected || (tab === 'party' && !inParty)) return
    setText('')
    await sendChat(tab, v)
  }

  return (
    <>
      {/* 알림(초대 거절 등) */}
      <div className="pointer-events-none fixed right-4 top-24 z-[45] flex w-72 flex-col gap-2">
        {net.notices.map((n) => (
          <div
            key={n.id}
            className="ink-panel pointer-events-auto flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-paper"
            role="status"
          >
            <span className="flex-1">{n.text}</span>
            <button type="button" data-sfx="none" onClick={() => dismissNotice(n.id)} aria-label="알림 닫기" className="text-paper/50 hover:text-paper">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* 일행 초대 */}
      {net.invite && (
        <div className="modal-scrim fixed inset-0 z-[60] grid place-items-center p-4">
          <div role="dialog" aria-modal="true" aria-label="일행 초대" className="ink-panel w-full max-w-sm rounded-xl p-5 text-center">
            <p className="font-serif text-lg text-gold">일행 초대</p>
            <p className="mt-2 text-sm text-paper/80">
              <b className="text-paper">{net.invite.from.name}</b>님이 일행으로 초대했습니다.
            </p>
            <p className="mt-1 text-sm text-paper">일행으로 참여하시겠습니까?</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => respondInvite(true)}
                className="rounded border border-gold bg-gold px-6 py-1.5 text-sm font-medium text-ink hover:brightness-110"
              >
                네
              </button>
              <button
                type="button"
                onClick={() => respondInvite(false)}
                className="rounded border border-gold/40 px-6 py-1.5 text-sm text-gold hover:bg-gold/10"
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 우측 하단 채팅 */}
      <div className={docked ? 'flex min-h-0 flex-1 flex-col' : 'fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2'}>
        {open && (
          <section
            aria-label="채팅"
            className={`ink-panel flex flex-col overflow-hidden rounded-xl ${docked ? 'min-h-[16rem] flex-1' : 'h-[26rem] max-h-[70vh] w-[22rem] max-w-[calc(100vw-2rem)]'}`}
          >
            <div className="flex items-center gap-1 border-b border-edge/15 px-2 pt-2">
              {[...TABS, ...(logs ? [{ id: 'log', label: '활동 로그', hint: '교내에서 있었던 일이 최근 순으로 기록된다.' }] : [])].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-sfx="none"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  title={t.hint}
                  className={`relative rounded-t-lg px-3 py-1.5 text-xs transition ${
                    tab === t.id ? 'bg-gold/15 text-gold' : 'text-paper/60 hover:text-paper'
                  }`}
                >
                  {t.label}
                  {(t.id === 'log' ? logUnread : net.unread[t.id] > 0) && (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-crimson" aria-label="안 읽은 메시지" />
                  )}
                </button>
              ))}
              <span className="flex-1" />
              {!isLog && <button
                type="button"
                data-sfx="none"
                onClick={() => setShowWho((v) => !v)}
                aria-label="접속자 목록"
                aria-pressed={showWho}
                className={`mb-1 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${showWho ? 'bg-gold/15 text-gold' : 'text-paper/60 hover:text-paper'}`}
              >
                <Users size={12} />
                {net.online.length}
              </button>}
              {!docked && (
                <button type="button" data-sfx="none" onClick={() => setOpen(false)} aria-label="채팅 닫기" className="mb-1 rounded p-1 text-paper/50 hover:text-paper">
                  <X size={14} />
                </button>
              )}
            </div>

            <p className="px-3 pt-1.5 text-[10px] text-paper/45">
              {isLog ? '교내에서 있었던 일이 최근 순으로 기록된다.' : TABS.find((t) => t.id === tab).hint}
              {!isLog && tab === 'party' && inParty && ` · ${net.party.members.map((m) => (m.title ? `[${m.title}] ${m.name}` : m.name)).join(', ')}`}
            </p>

            {isLog ? (
              <div className="flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed text-paper/80" aria-label="활동 로그">
                {logs.length === 0 ? (
                  <p className="text-paper/40">아직 기록된 일이 없다.</p>
                ) : (
                  logs.map((e) => (
                    <p key={e.id} className="border-b border-edge/5 py-1 last:border-0">
                      <span className="mr-2 text-gold/70">[{e.time}]</span>
                      {e.message}
                    </p>
                  ))
                )}
              </div>
            ) : showWho ? (
              <div className="flex-1 overflow-auto px-3 py-2" aria-label="접속자">
                {inParty && (
                  <button
                    type="button"
                    onClick={() => leaveParty()}
                    className="mb-2 w-full rounded border border-crimson/40 py-1 text-[11px] text-crimson hover:bg-crimson/10"
                  >
                    일행에서 나가기
                  </button>
                )}
                <ul className="space-y-1">
                  {net.online.map((p) => {
                    const mine = p.id === net.me?.id
                    const mate = net.party?.members.some((m) => m.id === p.id)
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded bg-shade/20 px-2 py-1.5 text-xs">
                        <span className="truncate text-paper">
                          {p.title && <span className="mr-1 rounded bg-crimson/80 px-1 py-px text-[10px] font-medium text-white" data-title>[{p.title}]</span>}
                          {p.name}
                          <span className="ml-1 text-[10px] text-paper/40">@{p.id}</span>
                          {mine && <span className="ml-1 text-[10px] text-gold">나</span>}
                          {mate && !mine && <span className="ml-1 text-[10px] text-gold">일행</span>}
                        </span>
                        {!mine && onGift && (
                          <button
                            type="button"
                            onClick={() => onGift({ id: p.id, name: p.name })}
                            aria-label={`${p.name}에게 선물`}
                            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-gold/40 px-2 py-0.5 text-[11px] text-gold hover:bg-gold/10"
                          >
                            <Gift size={11} />
                            선물
                          </button>
                        )}
                        {!mine && !mate && !p.partyId && (
                          <button
                            type="button"
                            onClick={() => inviteToParty(p.id)}
                            className="inline-flex shrink-0 items-center gap-1 rounded border border-gold/40 px-2 py-0.5 text-[11px] text-gold hover:bg-gold/10"
                          >
                            <UserPlus size={11} />
                            초대
                          </button>
                        )}
                        {!mine && !mate && p.partyId && <span className="text-[10px] text-paper/40">다른 일행</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <div ref={listRef} className="flex-1 space-y-1.5 overflow-auto px-3 py-2" aria-live="polite">
                {!connected && (
                  <p className="rounded border border-dashed border-edge/25 p-3 text-center text-[11px] leading-relaxed text-paper/55">
                    {net.status === 'connecting'
                      ? '서버에 연결하는 중…'
                      : '서버에 연결되지 않았다. 채팅과 랭킹은 서버가 켜져 있어야 쓸 수 있다.'}
                  </p>
                )}
                {tab === 'party' && connected && !inParty && (
                  <p className="rounded border border-dashed border-edge/25 p-3 text-center text-[11px] leading-relaxed text-paper/55">
                    아직 일행이 없다. 상단의 접속자 목록에서 초대해 보자.
                  </p>
                )}
                {msgs.map((m) =>
                  m.system ? (
                    <p key={m.id} className="text-center text-[11px] text-paper/45">
                      {m.text}
                    </p>
                  ) : (
                    <p key={m.id} className="text-[13px] leading-snug break-words text-paper">
                      <span className="mr-1 text-[10px] text-paper/40">{timeOf(m.at)}</span>
                      {m.from?.title && <span className="mr-1 rounded bg-crimson/80 px-1 py-px align-middle text-[10px] font-medium text-white" data-title>[{m.from.title}]</span>}
                      <b className={m.from?.id === net.me?.id ? 'text-gold' : 'text-paper/90'}>{m.from?.name}</b>
                      <span className="text-paper/50"> : </span>
                      {m.text}
                    </p>
                  ),
                )}
              </div>
            )}

            {!isLog && <form onSubmit={submit} className="flex gap-1.5 border-t border-edge/15 p-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                disabled={!connected || (tab === 'party' && !inParty)}
                placeholder={tab === 'party' && !inParty ? '일행이 없습니다' : `${TABS.find((t) => t.id === tab).label} 입력`}
                aria-label="메시지 입력"
                className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2.5 py-1.5 text-sm text-paper outline-none placeholder:text-paper/35 focus:border-gold disabled:opacity-50"
              />
              <button
                type="submit"
                data-sfx="none"
                disabled={!text.trim() || !connected || (tab === 'party' && !inParty)}
                aria-label="보내기"
                className="grid size-8 place-items-center rounded border border-gold bg-gold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>}
          </section>
        )}

        {!docked && <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '채팅 접기' : '채팅 열기'}
          className="ink-panel relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-gold"
        >
          <MessageCircle size={14} />
          채팅
          {inParty && <span className="rounded-full bg-gold/20 px-1.5 text-[10px]">일행 {net.party.members.length}</span>}
          {totalUnread > 0 && !open && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-crimson" aria-label="안 읽은 메시지" />}
        </button>}
      </div>
    </>
  )
}
