import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
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

const POPUP_WIDTH = 208 // w-52
const EDGE_MARGIN = 8

/** 음악 설정: 버튼 하나를 누르면 효과음 · 배경음악을 한 창에서 각각 따로 끄고 켜고, 볼륨을 조절한다. */
export default function SoundToggle({ className = '' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null) // {top, left} — 뷰포트 기준(position: fixed)
  const btnRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [open])

  // 버튼이 모달처럼 잘리는(overflow:hidden) 창 안에 있어도 갇히지 않도록, 드롭다운을 뷰포트 기준
  // position:fixed 로 띄우고 버튼 위치를 직접 계산해 화면 가장자리를 넘지 않게 자리를 잡는다.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return undefined
    const place = () => {
      const r = btnRef.current.getBoundingClientRect()
      const left = Math.min(Math.max(EDGE_MARGIN, r.left), window.innerWidth - POPUP_WIDTH - EDGE_MARGIN)
      const top = Math.min(r.bottom + 6, window.innerHeight - EDGE_MARGIN)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="음악 설정"
        aria-label="음악 설정"
        aria-expanded={open}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
      >
        <Music size={15} />
      </button>
      {open && pos && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="음악 설정"
          style={{ top: pos.top, left: pos.left, width: POPUP_WIDTH }}
          className="ink-panel fixed z-[100] space-y-3 rounded-xl p-3 shadow-lg"
        >
          <ChannelRow label="효과음" store={sfx} icon={Volume2} />
          <ChannelRow label="배경음악" store={bgm} icon={Music} />
        </div>
      )}
    </div>
  )
}
