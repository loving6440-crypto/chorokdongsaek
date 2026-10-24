import { Mail, Map, PawPrint, ScrollText, Store } from 'lucide-react'

export const MENUS = [
  { id: 'world', label: '학교 구역', icon: Map },
  { id: 'beast', label: '신수', icon: PawPrint },
  { id: 'market', label: '벼룩시장', icon: Store },
  { id: 'mailbox', label: '사물함', icon: Mail },
  { id: 'log', label: '활동 로그', icon: ScrollText }, // 데스크톱에서는 숨김(채팅 옆에 로그가 따로 있다)
]

/** 오른쪽 메뉴. 고른 버튼에 따라 가운데 화면이 바뀐다. */
export default function MenuPanel({ current, onSelect, unreadLog, unreadMail = 0, hideLog = false }) {
  return (
    <nav aria-label="메뉴" className="grid shrink-0 grid-cols-2 gap-2">
      {MENUS.filter((m) => !(hideLog && m.id === 'log')).map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            type="button"
            data-sfx="nav"
            aria-pressed={active}
            onClick={() => onSelect(id)}
            className={`ink-panel tilt relative flex min-w-0 items-center ${id === 'log' ? 'col-span-2' : ''} justify-center gap-1.5 whitespace-nowrap rounded-xl px-1 py-3 text-left text-[13px] sm:px-2 sm:text-sm ${
              active ? '!border-transparent !bg-gold-fill !text-ink light:!text-ink' : 'text-paper/75 hover:text-paper'
            }`}
          >
            <Icon size={16} className={`max-sm:hidden ${active ? 'text-ink light:text-ink' : 'text-paper/55'}`} />
            <span className="font-serif">{label}</span>
            {id === 'log' && unreadLog && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-crimson" aria-label="새 기록" />
            )}
            {id === 'mailbox' && unreadMail > 0 && (
              <span data-mail-badge className="absolute top-1.5 right-2 min-w-4 rounded-full bg-crimson px-1 text-center text-[10px] leading-4 text-[#fbf6e9]" aria-label={`안 읽은 쪽지 ${unreadMail}개`}>
                {unreadMail > 9 ? '9+' : unreadMail}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
