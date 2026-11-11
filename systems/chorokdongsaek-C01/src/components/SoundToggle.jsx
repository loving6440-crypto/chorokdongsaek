import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Music, Volume2, X } from 'lucide-react'
import { sfx } from '../game/sfx'
import { bgm } from '../game/bgm'

/** 효과음 / 배경음악 각각의 켜기·끄기 + 볼륨 한 줄. */
function ChannelRow({ label, store, icon: Icon }) {
  const { muted, volume } = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  return (
    <div data-channel={label}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-paper">
          <Icon size={13} aria-hidden />
          {label}
        </span>
        <button
          type="button"
          data-sfx="none"
          onClick={() => store.setMuted(!muted)}
          aria-pressed={muted}
          className={`rounded-full px-3 py-0.5 text-[11px] ${muted ? 'bg-edge/15 text-paper/70' : 'bg-gold-fill text-ink light:text-ink'}`}
        >
          {muted ? '꺼짐' : '켜짐'}
        </button>
      </div>
      <label className="mt-1.5 flex items-center gap-2 text-[11px] text-paper/70">
        <span className="w-7 shrink-0">볼륨</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          onChange={(e) => store.setVolume(Number(e.target.value) / 100)}
          aria-label={`${label} 볼륨`}
          className="min-w-0 flex-1 accent-[var(--c-gold-fill,#ffd426)]"
        />
        <span className="w-8 shrink-0 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </label>
    </div>
  )
}

/**
 * 음악 설정은 프로필 마름모 / 스크롤 가능한 미니게임 창 어디에서 열더라도
 * 원래 버튼 아래로 튀어나오지 않고 화면 중앙의 작은 창으로 표시한다.
 * document.body 포털을 사용하여 부모 transform/overflow/z-index 영향을 피한다.
 */
export default function SoundToggle({ className = '' }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      btnRef.current?.focus()
    }
  }, [open])

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="음악 설정"
        aria-label="음악 설정"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
      >
        <Music size={15} />
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-shade/75 p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="음악 설정"
            className="ink-panel w-full max-w-[320px] max-h-[calc(100dvh-32px)] overflow-y-auto p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-edge/25 pb-2">
              <span className="flex items-center gap-2 font-serif text-sm text-gold">
                <Music size={16} aria-hidden /> 음악 설정
              </span>
              <button
                ref={closeRef}
                type="button"
                data-sfx="none"
                onClick={() => setOpen(false)}
                aria-label="음악 설정 닫기"
                className="grid size-7 place-items-center border border-gold/40 text-paper/80 hover:bg-gold/15"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
            <div className="space-y-4">
              <ChannelRow label="효과음" store={sfx} icon={Volume2} />
              <ChannelRow label="배경음악" store={bgm} icon={Music} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
