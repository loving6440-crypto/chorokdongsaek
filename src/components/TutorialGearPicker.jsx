import { WEAPONS } from '../game/items'

/** 전투 교육(튜토리얼)을 마친 기념으로, 무구 하나를 공짜로 골라 받는다. 딱 한 번만 뜬다. */
export default function TutorialGearPicker({ onPick }) {
  return (
    <div className="modal-scrim fixed inset-0 z-[85] grid place-items-center p-4" data-tutorial-gear-picker>
      <div role="dialog" aria-modal="true" aria-label="무구 하나 고르기" className="ink-panel w-full max-w-sm rounded-xl p-5">
        <p className="font-serif text-lg text-gold">전투 교육 수료 기념</p>
        <p className="mt-1 text-xs text-paper/70">바리가 무구 하나를 공짜로 준다고 한다. 하나만 고를 수 있고, 나머지는 전부 정식 경로(제작·구매·보상 등)로 얻어야 한다.</p>
        <ul className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto">
          {WEAPONS.map((w) => (
            <li key={w.id} data-tutorial-gear-item={w.id} className="rounded-lg bg-shade/25 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-paper">{w.name}</span>
                <button
                  type="button"
                  data-tutorial-gear-pick={w.id}
                  onClick={() => onPick(w.id)}
                  className="rounded border border-gold bg-gold px-3 py-1 text-xs font-medium text-ink hover:brightness-110"
                >
                  이걸로
                </button>
              </div>
              <p className="mt-1 text-[11px] text-paper/60">{w.effectText}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
