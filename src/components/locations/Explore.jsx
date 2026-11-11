import { useState } from 'react'
import { FLOORS, introOf } from '../../game/explore'
import Scene, { Paras } from '../Scene'
import { GotoInfirmary, LockerSpot, StudentList } from '../ExploreWidgets'

/** 본관 탐사: 층 → 구역 → 선택지 순으로 살핀다. (v-B.07: 구글 시트 [조사내용] 그대로 · 장면 규칙은 game/scene.js) */
export default function Explore({ stats, player, onInvestigate, onEnter, onLockerMove, onLockerOpen, onVisit, onExploreAct }) {
  const [floorId, setFloorId] = useState(null)
  const [areaId, setAreaId] = useState(null)
  const [visit, setVisit] = useState(0) // 같은 구역을 다시 눌러도 처음부터 보이게
  const floor = FLOORS.find((f) => f.id === floorId)
  const area = floor?.areas.find((a) => a.id === areaId)

  const act = (kind, payload) => {
    if (kind === 'goto') return onEnter?.(payload.location)
    return onExploreAct?.(kind, payload) ?? {}
  }
  const ctx = { stats, player, name: player?.name, act }

  const pickFloor = (id) => {
    setFloorId(id)
    setAreaId(null)
  }
  const look = (a) => {
    onVisit?.(`mainHall:${floor.id}:${a.id}`)
    setAreaId(a.id)
    setVisit((v) => v + 1)
  }
  const home = () => {
    setFloorId(null)
    setAreaId(null)
  }
  const renderWidget = (node) => {
    if (node.widget === 'students') return <StudentList grade={node.grade} player={player} />
    if (node.widget === 'locker') return <LockerSpot grade={node.locker} player={player} onMove={onLockerMove} onOpen={onLockerOpen} act={act} />
    if (node.widget === 'gotoInfirmary') return <GotoInfirmary act={act} />
    return null
  }
  const intro = floor ? introOf(floor, Date.now(), stats) : []

  return (
    <section aria-label="본관 탐사">
      <h2 className="font-serif text-2xl text-gold">본관 탐사</h2>
      <p className="mt-1 text-sm text-paper/65">층을 고르고, 살펴볼 구역을 누른다.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="층 선택">
        {FLOORS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === floorId}
            onClick={() => pickFloor(f.id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${f.id === floorId ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {floor && (
        <div className="mt-4">
          {intro.length > 0 && (
            <div className="ink-panel w-full rounded-xl p-5">
              <p className="font-serif text-lg text-paper">{floor.name}</p>
              <div className="mt-2">
                <Paras list={intro} />
              </div>
            </div>
          )}
          <p className="mt-4 text-[11px] tracking-widest text-paper/55">조사 가능 구역</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="조사 구역">
            {floor.areas.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={a.id === areaId}
                onClick={() => look(a)}
                title={a.note}
                data-explore-area={a.id}
                className={`tilt rounded-xl px-4 py-2 text-sm text-paper ${a.id === areaId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
              >
                {a.name}
              </button>
            ))}
          </div>
          {area && (
            <div className="ink-panel mt-4 w-full rounded-xl p-5" aria-live="polite">
              <p className="mb-2 text-[11px] tracking-widest text-gold">{floor.name} · {area.name}</p>
              <Scene
                key={`${area.id}:${visit}`}
                root={area}
                ctx={ctx}
                scope={`mainHall:${floor.id}:${area.id}`}
                onHome={home}
                renderWidget={renderWidget}
                onOpen={(c, depth) => depth === 1 && onVisit?.(`mainHall:${floor.id}:${c.id}`)}
                onShow={(node, paras) => paras.length && onInvestigate?.(floor.name, node.name, paras.join(' ').replace(/\*+|~~/g, ''))}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
