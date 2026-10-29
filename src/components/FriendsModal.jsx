import { useCallback, useEffect, useState } from 'react'
import { Candy, Gift, Mail, UserRoundPlus, UserRoundX, X } from 'lucide-react'
import { changeFriend, fetchFriends, inviteToParty, sendNote, useOnline } from '../net/online'

export default function FriendsModal({ onClose, onGift }) {
  const net = useOnline()
  const [view, setView] = useState('friends')
  const [data, setData] = useState({ friends: [], blocked: [] })
  const [search, setSearch] = useState('')
  const [noteTo, setNoteTo] = useState(null)
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const load = useCallback(async () => { const r = await fetchFriends(); if (r.ok) setData(r) }, [])
  useEffect(() => { load() }, [load])
  const change = async (id, action) => { const r = await changeFriend(id, action); setFeedback(r.ok ? '변경했습니다.' : `실패: ${r.error || '연결 오류'}`); if (r.ok) { setSearch(''); load() } }
  const send = async () => { if (!message.trim()) return; const r = await sendNote(noteTo.id, message.trim()); setFeedback(r.ok ? '쪽지를 보냈습니다.' : `보내지 못했습니다: ${r.error}`); if (r.ok) { setNoteTo(null); setMessage('') } }
  return <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-3" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="친구 목록" className="ink-panel w-full max-w-md rounded-2xl p-4 text-paper" onClick={e => e.stopPropagation()}>
    <header className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-serif text-lg text-gold"><Candy size={18} />친구 목록</h2><button type="button" aria-label="닫기" onClick={onClose}><X size={17}/></button></header>
    <div className="mt-3 flex gap-2">{[['friends', '친구 목록'], ['blocked', '차단 목록']].map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} className={view === id ? 'flat-btn text-xs' : 'flat-btn-ghost text-xs'}>{label}</button>)}</div>
    {view === 'friends' && <div className="mt-3 flex gap-2"><input aria-label="추가할 아이디" value={search} onChange={e => setSearch(e.target.value)} placeholder="친구 아이디 입력" className="min-w-0 flex-1 rounded border border-edge/30 bg-shade px-2 py-1.5 text-sm" /><button type="button" disabled={!search.trim()} className="flat-btn text-xs" onClick={() => change(search.trim(), 'add')}><UserRoundPlus size={13}/> 추가</button></div>}
    <div className="mt-3 max-h-[45vh] space-y-2 overflow-auto">{data[view]?.length ? data[view].map(person => <div key={person.id} className="rounded-xl bg-shade/30 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm"><b>{person.name}</b> <small className="text-paper/55">@{person.id}</small><span className={person.online ? 'ml-2 text-gold' : 'ml-2 text-paper/45'}>{person.online ? '● 접속 중' : '○ 오프라인'}</span></span><button type="button" className="text-xs text-crimson" onClick={() => change(person.id, view === 'friends' ? 'remove' : 'unblock')}>{view === 'friends' ? '삭제' : '차단 해제'}</button></div>
      {view === 'friends' && <div className="mt-2 flex flex-wrap gap-1.5"><button type="button" className="flat-btn-ghost text-xs" onClick={() => setNoteTo(person)}><Mail size={12}/> 쪽지</button><button type="button" className="flat-btn-ghost text-xs" onClick={() => { onGift?.(person); onClose() }}><Gift size={12}/> 선물</button><button type="button" className="flat-btn-ghost text-xs" disabled={!person.online} onClick={async () => { const r = await inviteToParty(person.id); setFeedback(r.ok ? '파티 초대를 보냈습니다.' : `초대 실패: ${r.error}`) }}>파티 초대</button><button type="button" className="flat-btn-ghost text-xs" onClick={() => change(person.id, 'block')}><UserRoundX size={12}/> 차단</button></div>}</div>) : <p className="py-8 text-center text-sm text-paper/50">{view === 'friends' ? '추가한 친구가 없습니다.' : '차단한 사람이 없습니다.'}</p>}</div>
    {noteTo && <div className="mt-3 rounded-lg border border-edge/30 p-3"><label className="text-xs">{noteTo.name}에게 쪽지</label><textarea rows={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} className="mt-1 w-full rounded bg-shade p-2 text-sm"/><div className="mt-2 flex justify-end gap-2"><button type="button" className="flat-btn-ghost text-xs" onClick={() => setNoteTo(null)}>취소</button><button type="button" className="flat-btn text-xs" onClick={send}>보내기</button></div></div>}
    {feedback && <p role="status" className="mt-2 text-xs text-gold">{feedback}</p>}
  </section></div>
}
