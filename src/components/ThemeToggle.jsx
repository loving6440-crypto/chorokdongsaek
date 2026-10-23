import { Moon, Sun } from 'lucide-react'

// 왼쪽 = 다크(달), 오른쪽 = 화이트(해). 손잡이에는 현재 모드의 아이콘이 표시된다.
export default function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === 'light'
  const label = isLight ? '다크 모드로 전환' : '화이트 모드로 전환'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="화이트 모드"
      title={label}
      onClick={onToggle}
      className="flat-switch shrink-0 self-center"
    >
      <span className="flat-switch-knob">
        {isLight ? <Sun size={13} aria-hidden /> : <Moon size={13} aria-hidden />}
      </span>
    </button>
  )
}
