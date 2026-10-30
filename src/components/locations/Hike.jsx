import { useEffect, useRef, useState } from 'react'
import { Footprints } from 'lucide-react'
import { HIKE_PATHS, hikeSpotKey, OUTSIDE_BARI_LINES } from '../../game/hike'
import HuntField from './HuntField'
import Armory from './Armory'
import NpcDialog from '../NpcDialog'
import NpcGift from '../NpcGift'
import Garden from './Garden'

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

/** 둘레길 · 교외: NPC 바리가 나타나 돌아가라고 말린다. */
function OutsideBari({ player, onMeet, onGiveNpc }) {
  const [line, setLine] = useState(null)
  const speak = () => {
    const l = OUTSIDE_BARI_LINES[Math.floor(Math.random() * OUTSIDE_BARI_LINES.length)]
    setLine(l)
    onMeet?.('bari')
  }
  return (
    <div className="mt-4">
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-sm leading-relaxed text-paper/80">교문 밖으로 나가려 하자, 어디선가 바리가 나타나 앞을 막아선다.</p>
        <button type="button" onClick={speak} className="flat-btn mt-3 text-xs">
          {line ? '다시 말을 건다' : '말을 걸어본다'}
        </button>
      </div>
      {line && (
        <NpcDialog npc="바리" src="/bari.png" dataNpc="bari">
          {line}
        </NpcDialog>
      )}
      {line && <NpcGift npcId="bari" player={player} onGive={onGiveNpc} />}
    </div>
  )
}

const Placeholder = ({ name }) => (
  <div className="ink-panel mt-4 w-full rounded-xl p-5">
    <p className="text-sm leading-relaxed text-paper/60">{name}. (아직 둘러볼 것이 준비되지 않았다)</p>
  </div>
)

/** 뒷산 · 산 탐색: 왼길 / 중앙길(산 오르기 · 둘레길) / 오른길. */
export default function Hike({ player, admin, onEnhance, onSpecialEnhance, onRemoveSpecial, onMeet, onAdminGive, onGardenAction, onHuntAction, stats, onVisit, onGiveNpc }) {
  const [pathId, setPathId] = useState(null)
  const [branchId, setBranchId] = useState(null)
  const [spotId, setSpotId] = useState(null)
  const [huntOn, setHuntOn] = useState(() => player.huntExpedition?.status === 'active')
  const [turnExhausted, setTurnExhausted] = useState(false)
  const previousHuntStatus = useRef(player.huntExpedition?.status)
  useEffect(() => {
    const status = player.huntExpedition?.status
    if (previousHuntStatus.current === 'active' && status === 'finished') {
      const session = player.huntExpedition
      if (session?.turn >= session?.maxTurns) {
        // 행동을 모두 쓴 경우 먼저 안내를 보여 주고, 확인할 때까지 수렵 화면을 유지한다.
        setTurnExhausted(true)
      }
    }
    previousHuntStatus.current = status
  }, [player.huntExpedition?.status, player.huntExpedition?.turn, player.huntExpedition?.maxTurns])
  const acknowledgeTurnExhausted = () => {
    setTurnExhausted(false)
    setHuntOn(true)
  }

  const path = HIKE_PATHS.find((p) => p.id === pathId)
  const branch = path?.branches?.find((b) => b.id === branchId)
  const spots = branch ? branch.spots : path?.spots
  const spot = spots?.find((s) => s.id === spotId)

  const pickPath = (id) => {
    setPathId(id)
    setBranchId(null)
    setSpotId(null)
    setHuntOn(false)
  }
  const pickBranch = (id) => {
    setBranchId(id)
    setSpotId(null)
    setHuntOn(false)
  }
  const pickSpot = (s) => {
    setSpotId(s.id)
    setHuntOn(false)
    onVisit?.(hikeSpotKey(pathId, s.id, branchId))
  }
  const pickHunt = () => {
    setPathId(null)
    setBranchId(null)
    setSpotId(null)
    setHuntOn(true)
  }

  return (
    <section aria-label="산 탐색">
      <h2 className="font-serif text-2xl text-gold">산 탐색</h2>
      <p className="mt-1 text-sm text-paper/65">자유롭게 산을 돌아다닐 수 있다. 단, 어딘가에서 예기치 못한 존재와 조우하게 될지도 모른다.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="갈림길 선택">
        {HIKE_PATHS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === pathId}
            onClick={() => pickPath(p.id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${p.id === pathId ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {p.name}
          </button>
        ))}
        <button type="button" aria-pressed={huntOn} onClick={pickHunt}
          className={`tilt flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${huntOn ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}>
          <Footprints size={13} aria-hidden />개척
        </button>
      </div>


      {path?.branches && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="중앙길 갈래 선택">
          {path.branches.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.id === branchId}
              onClick={() => pickBranch(b.id)}
              className={`tilt rounded-full px-4 py-1.5 text-sm ${b.id === branchId ? 'bg-gold-fill/60 text-ink' : 'bg-edge/[0.05] text-paper/75 hover:bg-gold-fill/15'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {spots && (
        <>
          <p className="mt-4 text-[11px] tracking-widest text-paper/55">둘러볼 곳</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="장소 선택">
            {spots.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === spotId}
                onClick={() => pickSpot(s)}
                className={`tilt rounded-xl px-4 py-2 text-sm text-paper ${s.id === spotId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}

      {huntOn && (
        <div className="mt-2">
          <HuntField player={player} stats={stats} onAction={onHuntAction} />
        </div>
      )}

      {turnExhausted && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4" data-hunt-turn-exhausted-overlay>
          <div className="ink-panel w-full max-w-sm rounded-xl p-5 text-center" role="alertdialog" aria-modal="true" aria-label="채집 종료 안내" aria-describedby="hunt-turn-exhausted-message" data-hunt-turn-exhausted>
            <p id="hunt-turn-exhausted-message" className="text-sm leading-relaxed text-paper">행동 가능한 턴을 소진했습니다. 채집을 종료합니다.</p>
            <button type="button" className="flat-btn mt-5 justify-center" onClick={acknowledgeTurnExhausted} autoFocus data-hunt-end-confirm>확인</button>
          </div>
        </div>
      )}

      {spot && (
        <div className="mt-2">
          {spot.id === 'armory' ? (
            <Armory player={player} onEnhance={onEnhance} onSpecialEnhance={onSpecialEnhance} onRemoveSpecial={onRemoveSpecial} onMeet={onMeet} admin={admin} onAdminGive={onAdminGive} onGiveNpc={onGiveNpc} />
          ) : spot.id === 'garden' ? (
            <Garden player={player} onGardenAction={onGardenAction} onMeet={onMeet} />
          ) : spot.id === 'outside' ? (
            <OutsideBari player={player} onMeet={onMeet} onGiveNpc={onGiveNpc} />
          ) : (
            <Placeholder name={spot.name} />
          )}
        </div>
      )}
    </section>
  )
}
