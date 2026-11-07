import { useCallback, useEffect, useState } from 'react'
import { Gift, Mail, Send } from 'lucide-react'
import { MAIL_MAX, fetchMailPeople, fetchMailbox, markMailRead, respondFriendRequest, sendNote } from '../net/online'
import { itemOf } from '../game/items'

const fmtAt = (t) => {
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export const itemsText = (items = {}) =>
  Object.entries(items)
    .map(([id, n]) => `${itemOf(id)?.name ?? id}${n > 1 ? ` ×${n}` : ''}`)
    .join(', ')

const TABS = [
  { id: 'notes', label: '받은 쪽지' },
  { id: 'gifts', label: '선물 내역' },
  { id: 'post', label: '우체통' },
]

/** 사물함: 받은 쪽지 · 선물 내역을 보고, 우체통에서 아이템 없이 쪽지만 보낼 수도 있다. */
export default function MailboxPanel({ online, meId }) {
  const [tab, setTab] = useState('notes')
  const [box, setBox] = useState({ received: [], sent: [], loading: true })
  const [friendFeedback, setFriendFeedback] = useState('')
  const [respondingId, setRespondingId] = useState(null)
  const isOn = online.status === 'online'

  const load = useCallback(async () => {
    if (!isOn) return setBox({ received: [], sent: [], loading: false })
    const r = await fetchMailbox()
    setBox(r?.ok ? { received: r.received, sent: r.sent, loading: false } : { received: [], sent: [], loading: false, error: true })
    if (r?.ok) markMailRead()
  }, [isOn])
  useEffect(() => {
    load()
  }, [load, online.mailTick])

  const respond = async (m, accept) => {
    if (respondingId) return
    setRespondingId(m.id)
    const result = await respondFriendRequest(m.id, accept)
    setRespondingId(null)
    setFriendFeedback(result.ok ? (accept ? `${m.from.name}님과 친구로 추가했다.` : '친구 신청을 거절했다.') : result.error === 'already-answered' ? '이미 처리된 친구 신청이다.' : `친구 신청 처리 실패: ${result.error || '연결 오류'}`)
    await load()
  }
  const notes = box.received.filter((m) => m.kind === 'note' || m.kind === 'friend' || m.kind === 'friend-request' || (m.kind === 'gift' && m.text))
  const gifts = box.received.filter((m) => m.kind === 'gift')
  const sentGifts = box.sent.filter((m) => m.kind === 'gift')

  return (
    <section data-mailbox aria-label="사물함">
      <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
        <Mail size={18} aria-hidden />
        사물함
      </h2>
      {!isOn && <p className="mt-3 rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">서버에 접속해야 사물함을 열 수 있다.</p>}
      {isOn && (
        <>
          <div role="tablist" className="mt-3 flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                data-mail-tab={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? 'bg-gold-fill text-ink' : 'bg-edge/10 text-paper/75 hover:bg-edge/20'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {box.loading && <p className="mt-3 text-xs text-paper/55">불러오는 중…</p>}
          {friendFeedback && <p role="status" className="mt-2 text-xs text-gold">{friendFeedback}</p>}
          {tab === 'notes' && (
            <ul className="mt-3 space-y-2" aria-label="받은 쪽지">
              {notes.map((m) => (
                <li key={m.id} data-mail={m.id} className="rounded-xl bg-shade/25 px-3 py-2.5">
                  <p className="flex items-center justify-between gap-2 text-xs text-paper/60">
                    <span><b className="font-serif text-sm text-paper">{m.from.name}</b>님의 {m.kind === 'friend-request' ? '친구 신청' : m.kind === 'friend' ? '친구 추가 알림' : '쪽지'}{m.kind === 'gift' && <Gift size={12} className="ml-1 inline text-gold" aria-label="선물과 함께" />}</span>
                    <span>{fmtAt(m.at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-paper/90">{m.text}</p>
                  {m.kind === 'gift' && <p className="mt-1 text-[11px] text-gold/80">함께 온 선물: {itemsText(m.items)}</p>}
                  {m.kind === 'friend-request' && (m.status === 'pending' ? <div className="mt-2 flex gap-2" data-friend-request={m.id}>
                    <button type="button" disabled={respondingId === m.id} className="flat-btn text-xs disabled:opacity-50" onClick={() => respond(m, true)}>수락</button>
                    <button type="button" disabled={respondingId === m.id} className="flat-btn-ghost text-xs disabled:opacity-50" onClick={() => respond(m, false)}>거절</button>
                  </div> : <p className="mt-1 text-xs text-paper/55">{m.status === 'accepted' ? '수락한 친구 신청' : m.status === 'declined' ? '거절한 친구 신청' : '종료된 친구 신청'}</p>)}
                </li>
              ))}
              {!box.loading && notes.length === 0 && <li className="rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">받은 쪽지가 없다.</li>}
            </ul>
          )}
          {tab === 'gifts' && (
            <div className="mt-3 space-y-4">
              <ul className="space-y-2" aria-label="받은 선물">
                {gifts.map((m) => (
                  <li key={m.id} data-gift-log={m.id} className="rounded-xl bg-shade/25 px-3 py-2.5 text-sm">
                    <p className="flex items-center justify-between gap-2 text-xs text-paper/60">
                      <span><b className="font-serif text-sm text-paper">{m.from.name}</b>님에게 받음</span>
                      <span>{fmtAt(m.at)}</span>
                    </p>
                    <p className="mt-1 text-paper/90">{itemsText(m.items)}{m.enh ? ' (무구 강화 포함)' : ''}</p>
                  </li>
                ))}
                {!box.loading && gifts.length === 0 && <li className="rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">받은 선물이 없다.</li>}
              </ul>
              {sentGifts.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs tracking-widest text-paper/55">보낸 선물</p>
                  <ul className="space-y-1.5">
                    {sentGifts.map((m) => (
                      <li key={m.id} className="rounded-lg bg-shade/15 px-3 py-1.5 text-xs text-paper/75">
                        {fmtAt(m.at)} · {m.to.name}님에게: {itemsText(m.items)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tab === 'post' && <PostBox sent={box.sent.filter((m) => m.kind === 'note')} onSent={load} meId={meId} />}
        </>
      )}
    </section>
  )
}

/** 우체통: 받는 사람을 골라 쪽지만 보낸다. (최대 1000자) */
function PostBox({ sent, onSent }) {
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ ok: true, text: '' })
  useEffect(() => {
    fetchMailPeople().then((r) => setPeople(r?.ok ? r.people : []))
  }, [])
  const shown = (people ?? []).filter((p) => !q.trim() || `${p.name} ${p.id}`.toLowerCase().includes(q.trim().toLowerCase()))
  const target = (people ?? []).find((p) => p.id === to)
  const submit = async () => {
    if (!target || !text.trim() || busy) return
    setBusy(true)
    const r = await sendNote(target.id, text)
    setBusy(false)
    if (r?.ok) {
      setText('')
      setMsg({ ok: true, text: `${target.name}님에게 쪽지를 보냈다.` })
      onSent?.()
    } else setMsg({ ok: false, text: r?.error === 'slow-down' ? '너무 빨리 보내고 있다.' : r?.error === 'too-long' ? `${MAIL_MAX}자까지 보낼 수 있다.` : '쪽지를 보내지 못했다.' })
  }
  return (
    <div className="mt-3 space-y-3" data-postbox>
      <p className="text-[11px] text-paper/55">아이템 없이 쪽지만 보낼 수 있다. 상대가 접속 중이 아니어도 사물함에 남는다.</p>
      <div>
        <label htmlFor="mail-q" className="text-xs text-paper/60">받는 사람</label>
        <input id="mail-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·아이디 검색" className="mt-1 w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-gold/50" />
        <ul className="mt-1.5 max-h-36 space-y-1 overflow-auto" aria-label="받는 사람 목록">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-mail-to={p.id}
                aria-pressed={to === p.id}
                onClick={() => setTo(p.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm ${to === p.id ? 'bg-gold-fill text-ink' : 'bg-shade/25 text-paper/85 hover:bg-shade/40'}`}
              >
                <span>{p.name} <span className="text-[11px] opacity-60">@{p.id}</span></span>
                {p.online && <span className="text-[10px] opacity-70">접속 중</span>}
              </button>
            </li>
          ))}
          {people && shown.length === 0 && <li className="text-xs text-paper/55">보낼 수 있는 사람이 없다.</li>}
        </ul>
      </div>
      <div>
        <label htmlFor="mail-text" className="text-xs text-paper/60">{target ? `${target.name}님에게` : '내용'}</label>
        <textarea id="mail-text" data-mail-text value={text} maxLength={MAIL_MAX} rows={5} onChange={(e) => setText(e.target.value)} placeholder="전하고 싶은 말을 적는다" className="mt-1 w-full resize-y rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper outline-none focus:border-gold/50" />
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs ${msg.ok ? 'text-gold/80' : 'text-crimson'}`} aria-live="polite" data-mail-msg>{msg.text}</span>
          <span className="text-[10px] tabular-nums text-paper/45">{text.length} / {MAIL_MAX}</span>
        </div>
      </div>
      <button type="button" data-mail-send disabled={!target || !text.trim() || busy} onClick={submit} className="flat-btn disabled:cursor-not-allowed disabled:opacity-40">
        <Send size={14} />
        쪽지 보내기
      </button>
      {sent.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs tracking-widest text-paper/55">보낸 쪽지</p>
          <ul className="space-y-1.5">
            {sent.map((m) => (
              <li key={m.id} className="rounded-lg bg-shade/15 px-3 py-1.5 text-xs text-paper/75">
                <span className="text-paper/55">{fmtAt(m.at)} · {m.to.name}님에게</span>
                <p className="whitespace-pre-wrap break-words text-paper/85">{m.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
