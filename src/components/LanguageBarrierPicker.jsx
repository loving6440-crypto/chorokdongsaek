import { useEffect, useState } from 'react'
import { INTENTS } from '../game/battle'

/**
 * 언어장벽 (v79.0.7): 1) 먼저 [간파하기]로 적의 행동 20턴을 드러내고
 * 2) 드러난 20턴의 내용을 보고 바꿀 턴을 최대 3개 골라 [확정]한다. (확정하면 내 턴이 끝난다)
 * 단독·다인 전투가 함께 쓴다.
 */
export default function LanguageBarrierPicker({ picking, queue = [], cost, disabled, onReveal, onConfirm }) {
  const [picked, setPicked] = useState([])
  useEffect(() => { if (!picking) setPicked([]) }, [picking])
  if (!picking) {
    return <button type="button" data-psychic-use="language-barrier" disabled={disabled} onClick={onReveal} className="flat-btn mt-2 justify-center disabled:opacity-40">
      간파하기 (의지력 {cost}) — 20턴을 본 뒤 바꿀 턴을 고른다
    </button>
  }
  const toggle = (i) => setPicked((list) => (list.includes(i) ? list.filter((x) => x !== i) : list.length >= 3 ? list : [...list, i]))
  return <div className="mt-2" data-language-pick>
    <p className="text-[11px] text-gold">간파한 적의 다음 행동 20턴 — 바꿀 턴을 최대 3개 고르세요. ({picked.length}/3)</p>
    <ol className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="간파한 적의 행동 20턴">
      {queue.slice(0, 20).map((intent, i) => {
        const on = picked.includes(i)
        return <li key={i}>
          <button type="button" aria-pressed={on} disabled={disabled || (!on && picked.length >= 3)} onClick={() => toggle(i)}
            className={`w-full rounded-md px-2 py-1 text-left text-[11px] disabled:opacity-40 ${on ? 'bg-gold-fill text-ink' : 'bg-edge/10 text-paper/85'}`}>
            <span className="tabular-nums opacity-70">{i + 1}.</span> {INTENTS[intent]?.label ?? intent}
          </button>
        </li>
      })}
    </ol>
    <button type="button" data-language-confirm disabled={disabled} onClick={() => onConfirm(picked)} className="flat-btn mt-2 justify-center disabled:opacity-40">
      {picked.length ? `${picked.length}턴 다시 굴리기 (턴 종료)` : '바꾸지 않고 확정 (턴 종료)'}
    </button>
  </div>
}
