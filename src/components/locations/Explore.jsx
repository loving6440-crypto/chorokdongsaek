import { useState } from 'react'
import { FLOORS, introOf, scriptOfDay } from '../../game/explore'

/** **굵게**(눌러볼 수 있는 단서) / *기울임*(강조) 표기를 꾸밈으로 바꾼다. */
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((t, i) => {
    if (t.startsWith('**')) return <b key={i} className="font-semibold text-paper">{t.slice(2, -2)}</b>
    if (t.startsWith('*') && t.length > 2) return <em key={i} className="text-gold">{t.slice(1, -1)}</em>
    return t
  })
}

const Paras = ({ list }) =>
  list.map((t, i) => (
    <p key={i} className={`text-sm leading-[1.9] break-keep text-paper/90 ${i ? 'mt-3' : ''}`}>
      <Rich text={t} />
    </p>
  ))

/** 본관 탐사: 층 → 구역 → 세부 조사 순으로 살핀다. 누를 때마다 그 자리의 스크립트가 나온다. */
export default function Explore({ stats, onInvestigate, onEnter }) {
  const [floorId, setFloorId] = useState(null)
  const [areaId, setAreaId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [shown, setShown] = useState(null) // { label, paras }
  const floor = FLOORS.find((f) => f.id === floorId)
  const area = floor?.areas.find((a) => a.id === areaId)

  const pickFloor = (id) => {
    setFloorId(id)
    setAreaId(null)
    setDetailId(null)
    setShown(null)
  }
  const show = (label, floorName, id) => {
    const paras = scriptOfDay(floor.id, id, Date.now(), stats)
    setShown({ label, paras })
    onInvestigate?.(floorName, label, paras.join(' ').replace(/\*+/g, ''))
  }
  const look = (a) => {
    if (a.goto) return onEnter?.(a.goto)
    setAreaId(a.id)
    setDetailId(null)
    show(a.name, floor.name, a.id)
  }
  const lookDetail = (d) => {
    setDetailId(d.id)
    show(`${area.name} · ${d.name}`, floor.name, d.id)
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
          <div className="ink-panel w-full rounded-xl p-5">
            <p className="font-serif text-lg text-paper">{floor.name}</p>
            <div className="mt-2">{intro.length ? <Paras list={intro} /> : <p className="text-sm leading-[1.9] text-paper/85">(둘러보기 문구 준비 중)</p>}</div>
          </div>
          <p className="mt-4 text-[11px] tracking-widest text-paper/55">조사 가능 구역</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="조사 구역">
            {floor.areas.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={a.id === areaId}
                onClick={() => look(a)}
                title={a.note}
                className={`tilt rounded-xl px-4 py-2 text-sm text-paper ${a.id === areaId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
              >
                {a.name}
              </button>
            ))}
          </div>
          {area?.details && (
            <>
              <p className="mt-4 text-[11px] tracking-widest text-paper/55">{area.name}에서 더 살펴보기</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="세부 조사">
                {area.details.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={d.id === detailId}
                    onClick={() => lookDetail(d)}
                    className={`tilt rounded-full px-3.5 py-1.5 text-sm text-paper ${d.id === detailId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {shown && (
            <div className="ink-panel mt-4 w-full rounded-xl p-5" aria-live="polite">
              <p className="text-[11px] tracking-widest text-gold">{shown.label}</p>
              <div className="mt-2">
                <Paras list={shown.paras} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
