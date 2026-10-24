import { Dices, Users } from 'lucide-react'
import { useOnline } from '../../net/online'
import HoljjakGame from './HoljjakGame'

// 루미큐브 · 윷놀이 · 요트 다이스 · 오목: 아직 구현되지 않았다. 각자 판 전체를 새로 설계해야 하는 큰 작업이라
// 어떤 걸 먼저 만들지, 어느 정도 깊이로 만들지 따로 상의가 필요하다. (오목이 가장 단순해 보여 시작하기 좋을 것이다.)
const PENDING = [
  { id: 'rummikub', name: '루미큐브', players: '2~4인' },
  { id: 'yut', name: '윷놀이', players: '2~4인' },
  { id: 'yacht', name: '요트 다이스', players: '2~4인' },
  { id: 'omok', name: '오목', players: '2인' },
]

/** 패 놀이터 [놀이하기]. 여럿이 즐기는 게임 목록. 홀/짝만 지금 바로 할 수 있다. */
export default function BoardGames({ player, admin, onHoljjak }) {
  const net = useOnline()
  const inParty = !!net.party

  return (
    <section aria-label="패 놀이터 · 놀이하기">
      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">
        <Dices size={12} aria-hidden />
        놀이하기
      </p>
      {!inParty && (
        <p className="mt-2 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">
          루미큐브 · 윷놀이 · 요트 다이스 · 오목은 일행(파티) 상태일 때만 할 수 있다. (홀/짝은 혼자서도 할 수 있다)
        </p>
      )}
      <HoljjakGame player={player} admin={admin} onPlay={onHoljjak} />
      <ul className="mt-3 space-y-2">
        {PENDING.map((g) => (
          <li key={g.id} className="ink-panel flex items-center justify-between gap-3 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-paper/50" aria-hidden />
              <div>
                <p className="font-serif text-sm text-paper">{g.name}</p>
                <p className="text-[11px] text-paper/50">{g.players} · 파티 상태에서만 가능</p>
              </div>
            </div>
            <span className="rounded-full border border-edge/25 px-2.5 py-1 text-[11px] text-paper/55">구현 보류 · 별도 논의 필요</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
