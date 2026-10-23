import { LogOut } from 'lucide-react'
import { ACTIVITIES } from '../game/activities'
import { LOCATIONS } from '../game/constants'
import LocationTabs from './LocationTabs'
import LogView from './LogView'

// 구역 안에서 바로 나갈 수 있는 곳: 구역 id → 나가서 도착할 구역 id
const EXITS = { infirmary: 'mainHall' }

// 위쪽 칸은 높이를 고정한다. 안의 내용만 메뉴에 따라 바뀌고, 넘치면 칸 안에서 스크롤된다.
const BOX = 'ink-panel shrink-0 overflow-auto rounded-2xl p-3 sm:p-4 max-lg:max-h-[24rem] lg:h-[17rem] xl:h-[9.75rem]'

/** 위쪽 칸: 구역을 옮기고, 지금 구역에서 할 활동을 고른다. 고른 활동은 아래 칸에 나온다. */
export default function ActivityBar({ panel, locationId, onMove, activity, onSelect, logs }) {
  if (panel === 'log') {
    return (
      <header className={BOX} aria-label="활동 선택">
        <LogView logs={logs} />
      </header>
    )
  }
  if (panel === 'beast') {
    return (
      <header className={BOX} aria-label="활동 선택">
        <h2 className="font-serif text-base text-gold">신수</h2>
        <p className="mt-2 text-sm text-paper/70">신수는 아직 준비 중이다.</p>
      </header>
    )
  }
  const list = ACTIVITIES[locationId]
  return (
    <header className={`${BOX} space-y-3`} aria-label="활동 선택">
      <LocationTabs currentId={locationId} onMove={onMove} />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${LOCATIONS[locationId].name} 활동`}>
        <span className="mr-1 text-[11px] tracking-widest text-paper/50">활동</span>
        {list.map(({ id, label, icon: Icon, action }) => {
          const active = !action && activity === id
          return (
            <button
              key={id}
              type="button"
              data-sfx="nav"
              aria-pressed={active}
              onClick={() => onSelect(id, action)}
              className={`tilt inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${
                active
                  ? 'bg-gold-fill text-ink light:text-ink'
                  : 'bg-edge/[0.07] text-paper/85 hover:bg-edge/[0.14]'
              }`}
            >
              <Icon size={15} aria-hidden />
              {label}
            </button>
          )
        })}
        {EXITS[locationId] && (
          <button
            type="button"
            data-sfx="nav"
            onClick={() => onMove(EXITS[locationId])}
            className="tilt ml-auto inline-flex items-center gap-1.5 rounded-lg border border-edge/25 px-4 py-2 text-sm text-paper/85 hover:bg-edge/[0.1]"
          >
            <LogOut size={15} aria-hidden />
            나가기
          </button>
        )}
      </div>
    </header>
  )
}
