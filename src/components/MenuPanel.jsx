import { Map, PawPrint, ScrollText, Store } from 'lucide-react'

export const MENUS = [
  { id: 'world', label: '학교 구역', icon: Map },
  { id: 'log', label: '활동 로그', icon: ScrollText },
  { id: 'beast', label: '신수', icon: PawPrint },
  { id: 'market', label: '벼룩시장', icon: Store },
]

/** 오른쪽 메뉴. 고른 버튼에 따라 가운데 화면이 바뀐다. */
export default function MenuPanel({ current, onSelect, unreadLog, hideLog = false }) {
  return (
    <nav aria-label="메뉴" className="flex shrink-0 flex-row gap-2">
      {MENUS.filter((m) => !(hideLog && m.id === 'log')).map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            type="button"
            data-sfx="nav"
            aria-pressed={active}
            onClick={() => onSelect(id)}
            className={`ink-panel tilt relative flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-3 text-left text-[13px] sm:px-2 sm:text-sm ${
              active ? '!border-transparent !bg-gold-fill !text-ink light:!text-ink' : 'text-paper/75 hover:text-paper'
            }`}
          >
            <Icon size={16} className={`max-sm:hidden ${active ? 'text-ink light:text-ink' : 'text-paper/55'}`} />
            <span className="font-serif">{label}</span>
            {id === 'log' && unreadLog && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-crimson" aria-label="새 기록" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
