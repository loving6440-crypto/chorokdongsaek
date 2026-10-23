import { useEffect } from 'react'
import { Backpack, X } from 'lucide-react'
import { ITEMS, canUseItem, countOf } from '../game/items'

/** 소지품 팝업. X 로 닫는다. */
export default function InventoryModal({ player, inBattle, reviveOn, onUse, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const owned = ITEMS.filter((i) => countOf(player, i.id) > 0)
  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="소지품"
        className="ink-panel flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Backpack size={18} aria-hidden />
            소지품
            <span className="font-sans text-xs font-normal text-paper/60">{Math.floor(player.money)}냥</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="소지품 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {owned.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">
              가진 물건이 없다. 기숙사 매점에서 살 수 있다.
            </p>
          ) : (
            <ul className="space-y-2">
              {owned.map((item) => {
                const n = countOf(player, item.id)
                const use = canUseItem(item, { inBattle, countNow: n, reviveOn })
                return (
                  <li key={item.id} className="rounded-xl bg-edge/[0.07] p-3" data-item={item.id}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-serif text-base text-paper">
                        {item.name} <span className="text-sm text-gold">×{n}</span>
                      </p>
                      <button
                        type="button"
                        disabled={!use.ok}
                        onClick={() => onUse(item.id)}
                        className="flat-btn shrink-0 !py-1 text-xs disabled:opacity-40"
                      >
                        사용
                      </button>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-paper/75">{item.desc}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gold">{item.effectText}</p>
                    {!use.ok && <p className="mt-1 text-[11px] text-paper/45">{use.why}</p>}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-paper/50">
            전투 중에는 ‘전투 중 사용 가능’한 아이템만 쓸 수 있고, 턴과 상관없이 언제든 쓸 수 있으며 써도 내 턴이 끝나지 않는다.
          </p>
        </div>
      </div>
    </div>
  )
}
