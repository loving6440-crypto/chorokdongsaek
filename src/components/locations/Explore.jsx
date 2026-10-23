import { useState } from 'react'
import { FLOORS, scriptOfDay } from '../../game/explore'

/** 본관 탐사: 층을 고르고, 조사할 구역을 누르면 그날의 스크립트가 나온다. */
export default function Explore({ onInvestigate, onEnter }) {
  const [floorId, setFloorId] = useState(null)
  const [shown, setShown] = useState(null) // { area, text }
  const floor = FLOORS.find((f) => f.id === floorId)

  const pickFloor = (id) => {
    setFloorId(id)
    setShown(null)
  }
  const look = (area) => {
    if (area.goto) return onEnter?.(area.goto)
    const text = scriptOfDay(floor.id, area.id)
    setShown({ area: area.name, text })
    onInvestigate?.(floor.name, area.name, text)
  }

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
            className={`tilt rounded-full px-4 py-1.5 text-sm ${f.id === floorId ? 'bg-gold-fill text-ink light:text-paper' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {floor && (
        <div className="mt-4">
          <div className="ink-panel w-full rounded-xl p-5">
            <p className="font-serif text-lg text-paper">{floor.name}</p>
            <p className="mt-2 text-sm leading-[1.9] break-keep text-paper/85">{floor.intro ? floor.intro.split(/\*([^*]+)\*/).map((t, i) => (i % 2 ? <em key={i} className="text-gold">{t}</em> : t)) : '(둘러보기 문구 준비 중)'}</p>
          </div>
          <p className="mt-4 text-[11px] tracking-widest text-paper/55">조사 가능 구역</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="조사 구역">
            {floor.areas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => look(a)}
                title={a.note}
                className="tilt rounded-xl bg-edge/[0.07] px-4 py-2 text-sm text-paper hover:bg-gold-fill/20"
              >
                {a.name}
              </button>
            ))}
          </div>
          {shown && (
            <div className="ink-panel mt-4 w-full rounded-xl p-5" aria-live="polite">
              <p className="text-[11px] tracking-widest text-gold">{shown.area}</p>
              <p className="mt-2 text-sm leading-[1.9] break-keep text-paper/90">{shown.text}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
