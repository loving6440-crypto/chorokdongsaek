import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { fetchRanking } from '../net/online'

export default function RankingPanel({ courseId, playerId, scoreLabel, refreshKey }) {
  const [data, setData] = useState(undefined) // undefined: 불러오는 중, null: 서버 없음

  useEffect(() => {
    let alive = true
    fetchRanking(courseId, playerId).then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [courseId, playerId, refreshKey])

  if (data === undefined) return <p className="py-8 text-center text-sm text-paper/50">랭킹을 불러오는 중…</p>
  if (data === null)
    return (
      <p className="rounded border border-dashed border-edge/25 px-4 py-8 text-center text-sm leading-relaxed text-paper/55">
        서버에 연결되지 않아 랭킹을 볼 수 없다.
        <br />
        서버가 켜져 있으면 기록이 자동으로 올라간다.
      </p>
    )

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-paper/60">
        <Trophy size={13} className="text-gold" />
        {scoreLabel} 순위 · 참가 {data.total}명 · 각자의 최고 기록만 남는다
      </p>
      {data.top.length === 0 ? (
        <p className="rounded border border-dashed border-edge/25 px-4 py-8 text-center text-sm text-paper/55">
          아직 기록이 없다. 첫 기록의 주인이 되어 보자.
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
      {data.me && data.me.rank > data.top.length && (
        <p className="mt-2 rounded border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm text-paper">
          내 기록 · {data.me.rank}위 · <b className="text-gold">{data.me.score.toLocaleString('ko-KR')}</b>
        </p>
      )}
      {!data.me && <p className="mt-2 text-xs text-paper/45">아직 내 기록이 없다.</p>}
    </div>
  )
}
