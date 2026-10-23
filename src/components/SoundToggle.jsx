import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Music, Music2, Volume2, VolumeX } from 'lucide-react'
import { sfx } from '../game/sfx'
import { bgm } from '../game/bgm'

/** 버튼 하나 + 눌렀을 때 뜨는 작은 창(켜기/끄기, 볼륨 슬라이더). */
function Channel({ label, store, icons: [On, Off] }) {
  const { muted, volume } = useSyncExternalStore(store.subscribe, store.getState, store.getState)
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
  const Icon = muted || volume <= 0 ? Off : On
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${label} 설정`}
        aria-label={`${label} 설정`}
        aria-expanded={open}
        className={`grid size-8 shrink-0 place-items-center rounded-lg bg-edge/[0.09] transition hover:bg-edge/15 hover:text-gold ${muted ? 'text-paper/40' : 'text-paper/70'}`}
      >
        <Icon size={15} />
      </button>
      {open && (
        <div role="dialog" aria-label={`${label} 설정`} className="ink-panel absolute top-full right-0 z-50 mt-1.5 w-48 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-paper">{label}</span>
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
          <label className="mt-3 flex items-center gap-2 text-[11px] text-paper/70">
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
      )}
    </div>
  )
}

/** 효과음 / 배경음악 설정 버튼 두 개. 각각 따로 끄고 켜고, 볼륨을 조절한다. */
export default function SoundToggle({ className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Channel label="효과음" store={sfx} icons={[Volume2, VolumeX]} />
      <Channel label="배경음악" store={bgm} icons={[Music, Music2]} />
    </div>
  )
}
