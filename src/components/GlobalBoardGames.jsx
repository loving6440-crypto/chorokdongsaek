import { useOnline } from '../net/online'
import OmokGame from './locations/OmokGame'
import YutGame from './locations/YutGame'
import RummikubGame from './locations/RummikubGame'
import YachtGame from './locations/YachtGame'

/**
 * 오목 · 윷놀이 · 루미큐브 · 요트 다이스: 신청을 "보내는" 쪽은 여전히 별관(패 놀이터)의 [놀이하기]
 * 화면에 있어야 하지만, 신청을 받은 쪽은 어디에 있든 — 심지어 게임이 이미 시작된 뒤에도 — 이 화면을
 * 통해 수락하고 그대로 이어서 둘 수 있다. 별관 [놀이하기] 화면에 있을 때는 거기서 이미 보여 주므로
 * 여기서는 중복으로 띄우지 않는다.
 */
export default function GlobalBoardGames({ active }) {
  const net = useOnline()
  if (active) return null
  const has = net.omokInvite || net.omok || net.yutInvite || net.yut || net.rummiInvite || net.rummi || net.yachtInvite || net.yacht
  if (!has) return null
  return (
    <div className="absolute inset-0 z-[35] flex min-h-0 items-start justify-center overflow-auto rounded-2xl bg-ink/95 p-3" data-global-board-game>
      <div className="w-full max-w-lg overflow-visible">
        {(net.omokInvite || net.omok) && <OmokGame />}
        {(net.yutInvite || net.yut) && <YutGame />}
        {(net.rummiInvite || net.rummi) && <RummikubGame />}
        {(net.yachtInvite || net.yacht) && <YachtGame />}
      </div>
    </div>
  )
}
