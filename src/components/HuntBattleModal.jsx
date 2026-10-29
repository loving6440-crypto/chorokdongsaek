import { useEffect, useRef } from 'react'
import Battle from './locations/Battle'

export default function HuntBattleModal(props) {
  const panel = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    panel.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  const trapFocus = event => {
    if (event.key !== 'Tab') return
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
    if (!controls.length) { event.preventDefault(); return }
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus() }
  }
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="수렵 중 산귀신 전투" onKeyDown={trapFocus} className="ink-panel max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-lg p-4 outline-none sm:p-6">
      <Battle {...props} />
    </div>
  </div>
}
