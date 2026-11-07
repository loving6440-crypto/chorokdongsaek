import { PASSIVE_PSYCHICS } from '../game/battle'

/**
 * 전투 전 패시브(상시 발동) 영능력 선택창 (v79.0.7). 현재 패시브는 영력결계뿐이다.
 * 켜 두면 평소처럼 상시 발동하고, 끄면 이번 전투는 그 영능력 없이 싸운다.
 */
export default function PassivePicker({ owned = [], off = [], onChange, onConfirm, onCancel }) {
  const list = PASSIVE_PSYCHICS.filter((p) => owned.includes(p.id))
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label="패시브 영능력 선택">
    <div className="ink-panel w-full max-w-md rounded-2xl p-5">
      <p className="font-serif text-lg text-gold">전투 전 패시브 영능력</p>
      <p className="mt-1 text-xs text-paper/65">이번 전투에서 상시 발동할지 고른다. 끄면 그 영능력이 없는 것처럼 싸운다.</p>
      <ul className="mt-3 space-y-2">
        {list.map((p) => {
          const isOff = off.includes(p.id)
          return <li key={p.id} className="rounded-lg bg-edge/[0.07] p-3" data-passive={p.id}>
            <p className="text-sm text-paper">{p.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-paper/65">{p.detail}</p>
            <div className="mt-2 flex gap-2" role="group" aria-label={`${p.label} 사용 여부`}>
              <button type="button" aria-pressed={!isOff} onClick={() => onChange(off.filter((x) => x !== p.id))} className={`flat-btn justify-center text-xs ${!isOff ? 'bg-gold-fill text-ink' : ''}`}>사용한다</button>
              <button type="button" aria-pressed={isOff} onClick={() => onChange([...new Set([...off, p.id])])} className={`flat-btn justify-center text-xs ${isOff ? 'bg-gold-fill text-ink' : ''}`}>효과 끄기</button>
            </div>
          </li>
        })}
      </ul>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={onConfirm} className="flat-btn flat-btn-fight justify-center">전투 시작</button>
        <button type="button" onClick={onCancel} className="flat-btn justify-center">취소</button>
      </div>
    </div>
  </div>
}
