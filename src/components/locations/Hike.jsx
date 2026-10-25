import { useEffect, useState } from 'react'
import { Sprout } from 'lucide-react'
import { HIKE_PATHS, hikeSpotKey, OUTSIDE_BARI_LINES } from '../../game/hike'
import { GATHER_MINUTES } from '../../game/gather'
import Armory from './Armory'
import NpcDialog from '../NpcDialog'

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

/** 텃밭: [채집하기] — 20분을 기다리면 확률표에 따라 무언가를 얻는다. */
function GatherSpot({ player, spotId, onGather }) {
  const [, setTick] = useState(0)
  const gt = player.gathering
  const mine = gt?.spotId === spotId
  useEffect(() => {
    if (!mine) return undefined
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [mine])

  if (gt) {
    const left = gt.startedAt + gt.minutes * 60000 - Date.now()
    return (
      <div className="ink-panel mt-4 w-full rounded-xl p-5" data-gathering={gt.spotId}>
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">
          <Sprout size={12} aria-hidden />
          채집 중
        </p>
        <p className="mt-2 text-sm text-paper/85">{mine ? '이곳에서' : '다른 곳에서'} 채집하는 중이다.</p>
        <p className="mt-2 text-sm text-gold" data-gather-left>
          남은 시간: {left > 0 ? leftText(left) : '거의 다 됐다'}
        </p>
      </div>
    )
  }
  return (
    <div className="ink-panel mt-4 w-full rounded-xl p-5">
      <p className="text-sm leading-relaxed text-paper/80">잘 가꾸어진 텃밭이다. 운이 좋으면 쓸 만한 것을 얻을 수 있을지도 모른다.</p>
      <button type="button" onClick={() => onGather?.(spotId)} className="flat-btn mt-3 text-xs">
        <Sprout size={14} aria-hidden />
        채집하기 ({GATHER_MINUTES}분)
      </button>
    </div>
  )
}

/** 둘레길 · 교외: NPC 바리가 나타나 돌아가라고 말린다. */
function OutsideBari({ onMeet }) {
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
    </div>
  )
}

const Placeholder = ({ name }) => (
  <div className="ink-panel mt-4 w-full rounded-xl p-5">
    <p className="text-sm leading-relaxed text-paper/60">{name}. (아직 둘러볼 것이 준비되지 않았다)</p>
  </div>
)

/** 뒷산 · 산 탐색: 왼길 / 중앙길(산 오르기 · 둘레길) / 오른길. */
export default function Hike({ player, admin, onEnhance, onMeet, onAdminGive, onGather, onVisit }) {
  const [pathId, setPathId] = useState(null)
  const [branchId, setBranchId] = useState(null)
  const [spotId, setSpotId] = useState(null)

  const path = HIKE_PATHS.find((p) => p.id === pathId)
  const branch = path?.branches?.find((b) => b.id === branchId)
  const spots = branch ? branch.spots : path?.spots
  const spot = spots?.find((s) => s.id === spotId)

  const pickPath = (id) => {
    setPathId(id)
    setBranchId(null)
    setSpotId(null)
  }
  const pickBranch = (id) => {
    setBranchId(id)
    setSpotId(null)
  }
  const pickSpot = (s) => {
    setSpotId(s.id)
    onVisit?.(hikeSpotKey(pathId, s.id, branchId))
  }

  return (
    <section aria-label="산 탐색">
      <h2 className="font-serif text-2xl text-gold">산 탐색</h2>
      <p className="mt-1 text-sm text-paper/65">갈림길을 고르고, 둘러볼 곳을 누른다.</p>

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

      {spot && (
        <div className="mt-2">
          {spot.id === 'armory' ? (
            <Armory player={player} onEnhance={onEnhance} onMeet={onMeet} admin={admin} onAdminGive={onAdminGive} />
          ) : spot.id === 'garden' ? (
            <GatherSpot player={player} spotId={spot.id} onGather={onGather} />
          ) : spot.id === 'outside' ? (
            <OutsideBari onMeet={onMeet} />
          ) : (
            <Placeholder name={spot.name} />
          )}
        </div>
      )}
    </section>
  )
}
