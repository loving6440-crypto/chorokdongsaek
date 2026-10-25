import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Music, Volume2 } from 'lucide-react'
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

/** 음악 설정: 버튼 하나를 누르면 효과음 · 배경음악을 한 창에서 각각 따로 끄고 켜고, 볼륨을 조절한다. */
export default function SoundToggle({ className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [open])
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="음악 설정"
        aria-label="음악 설정"
        aria-expanded={open}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
      >
        <Music size={15} />
      </button>
      {open && (
        <div role="dialog" aria-label="음악 설정" className="ink-panel absolute top-full left-0 z-50 mt-1.5 w-52 space-y-3 rounded-xl p-3 shadow-lg">
          <ChannelRow label="효과음" store={sfx} icon={Volume2} />
          <ChannelRow label="배경음악" store={bgm} icon={Music} />
        </div>
      )}
    </div>
  )
}
