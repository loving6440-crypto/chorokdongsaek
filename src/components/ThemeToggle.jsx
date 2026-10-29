import { Moon, Sun } from 'lucide-react'

// 원형 아이콘 버튼 하나로 다크/화이트 모드를 바로 전환한다. 아이콘은 지금 모드를 나타낸다.
export default function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === 'light'
  const label = isLight ? '다크 모드로 전환' : '화이트 모드로 전환'

  return (
    <button
      type="button"
      aria-pressed={isLight}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
    >
      {isLight ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
    </button>
  )
}
