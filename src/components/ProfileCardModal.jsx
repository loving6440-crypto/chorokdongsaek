import { useEffect, useState } from 'react'
import { UserRoundPlus, X } from 'lucide-react'
import Avatar from './Avatar'
import { changeFriend, fetchCard } from '../net/online'
import { STAT_KEYS, STAT_META } from '../game/constants'
import { baseIdOf, itemOf } from '../game/items'

const EQUIP_SLOTS = [
  ['weapon', '무구'],
  ['body', '복장'],
  ['trinket', '장신구'],
]

/** 일행일 때만: 체력·영력·의지력, 육조 스탯, 장비. 서버가 몇 초마다 보내 주는 값을 그대로 보여 준다. */
function PartyStatus({ stats }) {
  if (!stats) return <p className="mt-2 text-xs text-paper/45">아직 상태를 받지 못했다. (잠시 후 다시 열어 보면 보인다)</p>
  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div>
          <p className="text-[10px] text-paper/55">체력</p>
          <p className="font-serif text-sm text-crimson">
            {Math.floor(stats.hp)}/{stats.hpMax}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-paper/55">영력</p>
          <p className="font-serif text-sm text-gold">{Math.floor(stats.spirit)}</p>
        </div>
        <div>
          <p className="text-[10px] text-paper/55">의지력</p>
          <p className="font-serif text-sm text-mana">
            {Math.floor(stats.mp)}/{stats.mpMax}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] sm:grid-cols-6">
        {STAT_KEYS.map((k) => (
          <div key={k} className="rounded-lg bg-edge/[0.07] py-1.5">
            <p className="text-paper/55">{STAT_META[k].label}</p>
            <p className="font-serif text-paper">{stats.stats?.[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {EQUIP_SLOTS.map(([slot, label]) => {
          const id = stats.equip?.[slot]
          const it = id ? itemOf(baseIdOf(id)) : null
          return (
            <span key={slot} className="rounded-md border border-edge/20 px-2 py-0.5 text-[11px] text-paper/75">
              {label} · {it?.name ?? '없음'}
            </span>
          )
        })}
      </div>
    </>
  )
}

/** 접속자·채팅의 닉네임을 눌렀을 때 뜨는 인적사항 카드. */
export default function ProfileCardModal({ target, party, meId, onClose }) {
  const mate = target.id !== meId && party?.members?.some((m) => m.id === target.id) ? party.members.find((m) => m.id === target.id) : null
  const [state, setState] = useState({ loading: true })
  const [friendStatus, setFriendStatus] = useState('')
  const [addingFriend, setAddingFriend] = useState(false)
  const addFriend = async () => {
    if (addingFriend || target.id === meId) return
    setAddingFriend(true)
    const result = await changeFriend(target.id, 'add')
    setFriendStatus(result.ok ? (result.already ? '이미 친구로 추가된 사람이다.' : result.alreadyPending ? '이미 친구 신청을 보냈다.' : '친구 신청을 보냈다. 상대가 수락하면 친구로 추가된다.') : `친구 신청 실패: ${result.error || '연결 오류'}`)
    setAddingFriend(false)
  }
  useEffect(() => {
    let alive = true
    setFriendStatus('')
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
        {target.id !== meId && <div className="mt-3 border-b border-edge/15 pb-3">
          <button type="button" data-profile-add-friend disabled={addingFriend} onClick={addFriend} className="flat-btn mx-auto text-xs disabled:opacity-50"><UserRoundPlus size={13}/> 친구 신청</button>
          {friendStatus && <p className="mt-2 text-center text-xs text-gold" role="status">{friendStatus}</p>}
        </div>}
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
            {mate && (
              <div className="mt-4 w-full border-t border-edge/15 pt-3" data-party-status>
                <p className="text-[11px] tracking-[0.2em] text-gold/70">일행 상태</p>
                <PartyStatus stats={mate.stats} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
