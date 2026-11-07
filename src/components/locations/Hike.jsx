import { useState } from 'react'
import { HIKE_PATHS, hikeSpotKey, OUTSIDE_BARI_LINES } from '../../game/hike'
import Armory from './Armory'
import NpcDialog from '../NpcDialog'
import NpcGift from '../NpcGift'
import Garden from './Garden'
import Battle from './Battle'
import { BESTIARY_ENEMIES, REC_STATS } from '../../game/battle'
import { TIER_HANJA } from '../../game/constants'

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

/** 둘레길 · 추가전투 (v-B.05): 전투 데이터 50종과 겨룬다. 단계별로 골라 본다. 보상은 퇴마 실습과 같은 하루 한도를 나눠 쓴다. */
const EXTRA_TIERS = [...new Set(BESTIARY_ENEMIES.map((e) => e.tier))].sort((a, b) => a - b)
function ExtraBattle({ battle }) {
  const [tier, setTier] = useState(EXTRA_TIERS[0])
  const roster = BESTIARY_ENEMIES.filter((e) => e.tier === tier)
  const intro = (
    <div className="mt-3" data-extra-battle>
      <p className="text-[11px] leading-relaxed text-paper/60">
        교외로 이어지는 둘레길 바깥 숲. 떠도는 요괴들이 단계마다 다섯씩 — 혼자 상대할 셋, 일행이 함께 상대할 하나, 보스 하나 — 기다린다.
        이긴 보상은 퇴마 실습과 같은 하루 한도를 나눠 쓴다.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="단계 선택">
        {EXTRA_TIERS.map((t) => (
          <button
            key={t}
            type="button"
            data-extra-tier={t}
            aria-pressed={t === tier}
            title={`${t}단계 · 모든 스탯 ${BESTIARY_ENEMIES.find((e) => e.tier === t)?.rec ?? REC_STATS[t]}`}
            onClick={() => setTier(t)}
            className={`tilt grid size-9 place-items-center rounded-full font-serif text-sm ${t === tier ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {TIER_HANJA[t - 1] ?? t}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gold">{tier}단계 · 적정: 모든 스탯 {roster[0]?.rec ?? REC_STATS[tier]}{tier === 10 ? ' · 무구 강화와 영능력을 모두 갖춘 상태 기준' : ''}</p>
    </div>
  )
  return (
    <div className="mt-4">
      <Battle {...battle} roster={roster} rosterIntro={intro} />
    </div>
  )
}

const Placeholder = ({ name }) => (
  <div className="ink-panel mt-4 w-full rounded-xl p-5">
    <p className="text-sm leading-relaxed text-paper/60">{name}. (아직 둘러볼 것이 준비되지 않았다)</p>
  </div>
)

/** 뒷산 · 산 탐색: 왼길 / 중앙길(산 오르기 · 둘레길) / 오른길. (v-B.01: 개척은 산 탐색 옆 [개척] 버튼으로만 들어간다) */
export default function Hike({ player, admin, onEnhance, onSpecialEnhance, onRemoveSpecial, onTokenExchange, onMeet, onAdminGive, onGardenAction, onVisit, onGiveNpc, battle }) {
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
            <Armory player={player} onEnhance={onEnhance} onSpecialEnhance={onSpecialEnhance} onRemoveSpecial={onRemoveSpecial} onTokenExchange={onTokenExchange} onMeet={onMeet} admin={admin} onAdminGive={onAdminGive} onGiveNpc={onGiveNpc} />
          ) : spot.id === 'garden' ? (
            <Garden player={player} onGardenAction={onGardenAction} onMeet={onMeet} />
          ) : spot.id === 'outside' ? (
            <OutsideBari player={player} onMeet={onMeet} onGiveNpc={onGiveNpc} />
          ) : spot.id === 'extraBattle' && battle ? (
            <ExtraBattle battle={battle} />
          ) : (
            <Placeholder name={spot.name} />
          )}
        </div>
      )}
    </section>
  )
}
