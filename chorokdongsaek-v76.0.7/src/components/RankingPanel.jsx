import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { fetchRanking } from '../net/online'

const WEEKS = [
  { id: 'this', label: '금주의 기록' },
  { id: 'last', label: '지난주의 기록' },
]
const dd = (s) => (s ? s.slice(5).replace('-', '/') : '')

export default function RankingPanel({ courseId, playerId, scoreLabel, refreshKey }) {
  const [week, setWeek] = useState('this')
  const [data, setData] = useState(undefined) // undefined: 불러오는 중, null: 서버 없음

  useEffect(() => {
    let alive = true
    setData(undefined)
    fetchRanking(courseId, playerId, week).then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [courseId, playerId, refreshKey, week])

  const tabs = (
    <div role="tablist" aria-label="랭킹 기간" className="mb-2 flex gap-1.5">
      {WEEKS.map((w) => (
        <button key={w.id} type="button" role="tab" aria-selected={week === w.id} data-rank-week={w.id} onClick={() => setWeek(w.id)} className={`rounded-full px-3 py-1 text-xs ${week === w.id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/75'}`}>
          {w.label}
        </button>
      ))}
    </div>
  )

  if (data === undefined) return <div>{tabs}<p className="py-8 text-center text-sm text-paper/50">랭킹을 불러오는 중…</p></div>
  if (data === null)
    return (
      <div>
        {tabs}
        <p className="rounded border border-dashed border-edge/25 px-4 py-8 text-center text-sm leading-relaxed text-paper/55">
          서버에 연결되지 않아 랭킹을 볼 수 없다.
          <br />
          서버가 켜져 있으면 기록이 자동으로 올라간다.
        </p>
      </div>
    )

  const last = week === 'last'
  return (
    <div>
      {tabs}
      <p className="mb-2 flex items-center gap-1.5 text-xs text-paper/60" data-rank-head>
        <Trophy size={13} className="text-gold" />
        {last
          ? `${scoreLabel} · 지난주(${dd(data.lastLabel)} ~ ${dd(data.lastEndLabel)}) 5위까지`
          : `${scoreLabel} 순위 · 참가 ${data.total}명 · 이번 주(${dd(data.weekLabel)}~) 각자의 최고 기록 · 매주 월요일 0시에 리셋`}
      </p>
      {data.top.length === 0 ? (
        <p className="rounded border border-dashed border-edge/25 px-4 py-8 text-center text-sm text-paper/55">
          {last ? '지난주에는 기록이 없다.' : '아직 기록이 없다. 첫 기록의 주인이 되어 보자.'}
        </p>
      ) : (
        <ol className="space-y-1">
          {data.top.map((r, i) => {
            const mine = r.id === playerId
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded px-3 py-1.5 text-sm ${
                  mine ? 'border border-gold/50 bg-gold/10' : 'bg-shade/20'
                }`}
              >
                <span className={`w-6 text-center font-serif ${i < 3 ? 'text-gold' : 'text-paper/50'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-paper">
                  {r.name}
                  <span className="ml-1 text-[10px] text-paper/40">@{r.id}</span>
                </span>
                <span className="font-serif text-gold">{r.score.toLocaleString('ko-KR')}</span>
              </li>
            )
          })}
        </ol>
      )}
      {!last && data.me && data.me.rank > data.top.length && (
        <p className="mt-2 rounded border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm text-paper">
          내 기록 · {data.me.rank}위 · <b className="text-gold">{data.me.score.toLocaleString('ko-KR')}</b>
        </p>
      )}
      {!last && !data.me && <p className="mt-2 text-xs text-paper/45">아직 내 기록이 없다.</p>}
    </div>
  )
}
