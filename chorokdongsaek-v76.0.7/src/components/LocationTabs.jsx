import { LOCATIONS } from '../game/constants'

/** 학교 구역 선택. 방위 한자 + 이름 + 한 줄 소개. */
export default function LocationTabs({ currentId, onMove }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="tablist" aria-label="학교 구역">
      {Object.values(LOCATIONS).filter((l) => !l.hidden).map((loc) => {
        const active = currentId === loc.id
        return (
          <button
            key={loc.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-sfx="nav"
            onClick={() => onMove(loc.id)}
            className={`tilt flex flex-col items-start gap-1 rounded-xl px-3 py-2 text-left ${
              active ? 'bg-edge/10 text-paper light:bg-gold/12' : 'bg-edge/[0.04] text-paper/70 hover:bg-edge/8 hover:text-paper'
            }`}
            style={{
              border: 0,
              borderBottom: `3px solid ${active ? loc.accent : 'transparent'}`,
            }}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="font-myeongjo text-base font-bold" style={{ color: loc.accent }}>
                {loc.hanja}
              </span>
              {loc.name}
            </span>
            <span className="text-[10px] leading-snug text-paper/50">{loc.navNote}</span>
          </button>
        )
      })}
    </div>
  )
}
