import { useState } from 'react'
import { ITEMS, countOf } from '../game/items'

export const BRING_MAX = 5 // 보스 전투에 1인당 가져갈 수 있는 아이템 수 ('묶음'이 아니라 '개' 단위)

/** 보스 전투 전에, 소지품에서 전투에 쓸 아이템을 최대 5개까지 고른다. */
export default function BringPicker({ player, enemyName, onConfirm, onCancel }) {
  const list = ITEMS.filter((i) => i.battle && countOf(player, i.id) > 0)
  const [sel, setSel] = useState({})
  const total = Object.values(sel).reduce((a, b) => a + b, 0)
  const bump = (id, d) => setSel((s) => {
    const n = Math.max(0, Math.min(countOf(player, id), (s[id] || 0) + d))
    if (d > 0 && total >= BRING_MAX) return s
    const out = { ...s, [id]: n }
    if (!n) delete out[id]
    return out
  })
  return (
    <div className="modal-scrim fixed inset-0 z-[85] grid place-items-center p-4" data-bring-picker>
      <div role="dialog" aria-modal="true" aria-label="가져갈 아이템 고르기" className="ink-panel w-full max-w-sm rounded-xl p-5">
        <p className="font-serif text-lg text-gold">가져갈 아이템 고르기</p>
        <p className="mt-1 text-xs text-paper/70">{enemyName}은(는) 보스다. 한 전투에 1인당 아이템을 <b>{BRING_MAX}개</b>까지만(낱개 기준) 가져갈 수 있다.</p>
        <p className="mt-2 text-sm text-paper" data-bring-total>{total} / {BRING_MAX}</p>
        {list.length === 0 ? (
          <p className="mt-3 text-xs text-paper/60">가져갈 수 있는 전투용 아이템이 없다.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {list.map((i) => (
              <li key={i.id} data-bring-item={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 px-3 py-1.5 text-sm">
                <span className="text-paper/90">{i.name} <span className="text-[10px] text-paper/50">(보유 {countOf(player, i.id)})</span></span>
                <span className="flex items-center gap-1.5">
                  <button type="button" aria-label={`${i.name} 줄이기`} onClick={() => bump(i.id, -1)} className="grid size-7 place-items-center rounded-lg bg-edge/10">−</button>
                  <b className="w-5 text-center tabular-nums" data-bring-n>{sel[i.id] || 0}</b>
                  <button type="button" aria-label={`${i.name} 늘리기`} onClick={() => bump(i.id, 1)} disabled={total >= BRING_MAX || (sel[i.id] || 0) >= countOf(player, i.id)} className="grid size-7 place-items-center rounded-lg bg-edge/10 disabled:opacity-35">+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" data-bring-go onClick={() => onConfirm(sel)} className="rounded border border-gold bg-gold px-6 py-1.5 text-sm font-medium text-ink hover:brightness-110">이대로 간다</button>
          <button type="button" onClick={onCancel} className="rounded border border-gold/40 px-6 py-1.5 text-sm text-gold hover:bg-gold/10">취소</button>
        </div>
      </div>
    </div>
  )
}
