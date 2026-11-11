import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Moon, Settings2, Sun, Type, X } from 'lucide-react'
import { UI_FONTS, useFont } from '../hooks/useFont'
import { FONT_SIZE_DEFAULT, FONT_SIZE_MAX, FONT_SIZE_MIN, FONT_SIZE_STEP, useFontSize } from '../hooks/useFontSize'

/**
 * 테마 버튼은 토글이 아니라 화면 설정 대화상자를 연다.
 * 프로필/로그인/캐릭터 생성 화면에서 동일한 팝업을 사용한다.
 */
export default function ThemeToggle({ theme, onSelect }) {
  const [open, setOpen] = useState(false)
  const { font, selectFont } = useFont()
  const { fontSize, selectFontSize } = useFontSize()
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]'))
      if (!focusable.length) return
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
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="화면 설정 (테마·글씨체·글씨 크기)"
        aria-label="화면 설정"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
      >
        <Settings2 size={15} aria-hidden />
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-shade/75 p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="display-settings-heading"
            className="ink-panel w-full max-w-[380px] max-h-[calc(100dvh-32px)] overflow-y-auto p-4 sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-edge/25 pb-2">
              <h2 id="display-settings-heading" className="flex items-center gap-2 text-sm font-bold text-gold">
                <Settings2 size={16} aria-hidden /> 화면 설정
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="화면 설정 닫기"
                className="grid size-7 place-items-center border border-gold/40 text-paper/80 hover:bg-gold/15"
              >
                <X size={15} aria-hidden />
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold tracking-wide text-paper/85">화면 테마</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'light', label: '라이트모드', Icon: Sun },
                  { id: 'dark', label: '다크모드', Icon: Moon },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-pressed={theme === id}
                    className={`flex min-h-11 items-center justify-center gap-1.5 border px-2 py-2 text-xs transition ${theme === id ? 'border-gold bg-gold/15 text-gold' : 'border-edge/25 bg-ink-muted/50 text-paper/70 hover:border-gold/50'}`}
                  >
                    <Icon size={15} aria-hidden />
                    {label}
                    {theme === id && <Check size={13} aria-hidden />}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5 border-t border-edge/20 pt-4">
              <legend className="sr-only">글씨체 변경</legend>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-paper/85">
                <Type size={15} aria-hidden /> 글씨체 변경
              </p>
              <div className="space-y-1.5" role="radiogroup" aria-label="글씨체 변경">
                {UI_FONTS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-2 border px-3 py-2 transition ${font === option.id ? 'border-gold bg-gold/10 text-gold' : 'border-edge/20 bg-ink-muted/30 text-paper/80 hover:border-gold/50'}`}
                  >
                    <input
                      type="radio"
                      name="ui-font-choice"
                      value={option.id}
                      checked={font === option.id}
                      onChange={() => selectFont(option.id)}
                      className="shrink-0 accent-[var(--c-gold-fill)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">{option.label}{option.detail ? <span className="ml-1.5 text-[10px] font-normal text-paper/55">{option.detail}</span> : null}</span>
                      <span className="mt-1 block truncate text-sm" style={{ fontFamily: `'${option.family}', 'NeoDunggeunmo', sans-serif` }}>초록동색 가나다 123</span>
                    </span>
                    {font === option.id && <Check size={14} className="shrink-0" aria-hidden />}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5 border-t border-edge/20 pt-4">
              <legend className="mb-2 flex w-full items-center gap-1.5 text-xs font-bold tracking-wide text-paper/85">
                <Type size={15} aria-hidden /> 글씨 크기 조절
              </legend>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs text-paper/60">글자만 크기 조절</span>
                <output htmlFor="ui-font-size" className="text-sm font-bold text-gold tabular-nums">{fontSize}%</output>
              </div>
              <input
                id="ui-font-size"
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                value={fontSize}
                onChange={(event) => selectFontSize(event.target.value)}
                aria-label="글씨 크기"
                aria-valuetext={`${fontSize}%`}
                className="w-full cursor-pointer accent-[var(--c-gold-fill)]"
              />
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-paper/55">
                <span>{FONT_SIZE_MIN}% · 작게</span>
                <button
                  type="button"
                  onClick={() => selectFontSize(FONT_SIZE_DEFAULT)}
                  disabled={fontSize === FONT_SIZE_DEFAULT}
                  className="border border-edge/25 px-2 py-1 text-paper/80 enabled:hover:border-gold/50 disabled:opacity-40"
                >
                  기본 크기 (100%)
                </button>
                <span>{FONT_SIZE_MAX}% · 크게</span>
              </div>
            </fieldset>
            <p className="mt-3 text-[11px] leading-relaxed text-paper/50">글씨체와 크기는 즉시 적용되며 이 브라우저에 저장됩니다. 버튼과 창 크기는 유지되지만 큰 글씨는 줄바꿈될 수 있습니다.</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
