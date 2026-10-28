import { useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { clubOf as clubMetaOf } from '../game/clubs'

const GRADES = [1, 2, 3]

/**
 * 별관의 동아리 부실에서 보이는 활동 셋.
 * [가입 신청서 작성하기] [멤버 확인하기] [동아리 활동하기](아직 비워 둠)
 * 누구나 멤버 목록은 볼 수 있다. 신청서는 지금 어느 동아리에도 속해 있지 않을 때만 제출할 수 있다.
 */
export default function ClubRoomPanel({ clubId, myClub, onApply, onFetchMembers }) {
  const meta = clubMetaOf(clubId)
  const [tab, setTab] = useState(null) // 'apply' | 'members' | 'activity' | null
  const [form, setForm] = useState({ name: '', grade: 1, age: 17, hope: '' })
  const [msg, setMsg] = useState('')
  const [members, setMembers] = useState(null)
  const already = !!myClub
  const sameClub = myClub?.id === clubId

  const openMembers = async () => {
    setTab('members')
    const r = await onFetchMembers(clubId)
    setMembers(r?.ok ? r.members : [])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (already) return
    const name = form.name.trim()
    if (!name) return setMsg('이름을 적어 주세요.')
    const r = await onApply(clubId, name, form.grade, Number(form.age) || 17, form.hope.trim())
    if (r?.ok) {
      setMsg(`${meta?.name ?? '동아리'}에 가입했다.`)
      setTab(null)
    } else if (r?.error === 'already-in-club') setMsg('이미 다른 동아리에 가입되어 있다.')
    else if (r?.error === 'rejoin-wait') setMsg('탈퇴한 뒤 24시간이 지나야 새 동아리에 가입할 수 있다.')
    else setMsg('가입 신청을 넣지 못했다.')
  }

  return (
    <div className="ink-panel mt-4 w-full rounded-xl p-5" data-club-room={clubId}>
      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">
        <Users size={12} aria-hidden />
        {meta?.name ?? '동아리'} 부실
      </p>
      {meta?.desc && (
        <div className="mt-2 space-y-0.5">
          {meta.desc.map((line, i) => (
            <p key={i} className="text-xs leading-relaxed break-keep text-paper/70">{line}</p>
          ))}
        </div>
      )}
      {sameClub && <p className="mt-2 text-xs text-gold">이미 이 동아리의 멤버다.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={already} onClick={() => { setTab('apply'); setMsg('') }} className="flat-btn !py-1 text-xs disabled:opacity-40">
          <UserPlus size={13} aria-hidden />
          가입 신청서 작성하기
        </button>
        <button type="button" onClick={openMembers} className="flat-btn-ghost !py-1 text-xs">
          멤버 확인하기
        </button>
        <button type="button" onClick={() => setTab('activity')} className="flat-btn-ghost !py-1 text-xs">
          동아리 활동하기
        </button>
      </div>

      {tab === 'apply' && !already && (
        <form onSubmit={submit} className="mt-4 space-y-2 rounded-lg bg-shade/25 p-3">
          <p className="text-xs text-paper/70">이름 · 학년 · 나이 · 포부를 적어 제출하면 곧바로 가입된다.</p>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="이름"
            maxLength={20}
            className="h-8 w-full rounded-lg bg-shade/50 px-3 text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
          />
          <div className="flex gap-2">
            <select
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
              className="h-8 rounded-lg bg-shade/50 px-2 text-sm text-paper outline-none ring-1 ring-edge/20"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
            <input
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, '').slice(0, 2) })}
              placeholder="나이"
              inputMode="numeric"
              className="h-8 w-20 rounded-lg bg-shade/50 px-3 text-sm text-paper outline-none ring-1 ring-edge/20"
            />
          </div>
          <input
            value={form.hope}
            onChange={(e) => setForm({ ...form, hope: e.target.value })}
            placeholder="포부 (한 줄)"
            maxLength={200}
            className="h-8 w-full rounded-lg bg-shade/50 px-3 text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
          />
          <button type="submit" className="flat-btn !py-1 text-xs">제출하기</button>
        </form>
      )}

      {tab === 'members' && (
        <div className="mt-4 rounded-lg bg-shade/25 p-3">
          {members == null ? (
            <p className="text-sm text-paper/60">불러오는 중…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-paper/60">아직 가입한 사람이 없다.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-paper/85">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-1.5">
                  <b className="text-paper">{m.name}</b>
                  <span className="text-xs text-paper/60">{m.grade ? `${m.grade}학년` : ''} {m.age ? `${m.age}세` : ''}</span>
                  {m.hope && <span className="text-xs text-paper/50">· {m.hope}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="mt-4 rounded-lg bg-shade/25 p-3">
          <p className="text-sm text-paper/60">(준비 중)</p>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-gold" role="status">{msg}</p>}
    </div>
  )
}
