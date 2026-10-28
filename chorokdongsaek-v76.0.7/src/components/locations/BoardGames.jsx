import { Dices } from 'lucide-react'
import { useOnline } from '../../net/online'
import HoljjakGame from './HoljjakGame'
import OmokGame from './OmokGame'
import YutGame from './YutGame'
import RummikubGame from './RummikubGame'
import YachtGame from './YachtGame'

/** 패 놀이터 [놀이하기]. 여럿이 즐기는 게임 목록 — 오목·윷놀이·루미큐브·요트 다이스 네 가지 모두 구현 완료. */
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
      <OmokGame />
      <YutGame />
      <RummikubGame />
      <YachtGame />
    </section>
  )
}
