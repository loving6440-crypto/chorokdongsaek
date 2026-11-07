import { useState } from 'react'
import { CookingPot } from 'lucide-react'
import { COOK_RECIPES, KITCHEN, canCook } from '../../game/cooking'
import { countOf, itemOf } from '../../game/items'

/** 조리실: 등록된 조리법은 재료가 있으면 바로 조리한다. */
export default function Cooking({ player, admin, onCook }) {
  const [msg, setMsg] = useState('')
  const known = COOK_RECIPES
  const go = (r) => {
    const res = onCook(r.id)
    setMsg(res?.error ?? `${itemOf(r.result).name}을(를) 만들었다.`)
  }
  return (
    <section aria-label={KITCHEN.name} data-kitchen>
      <h2 className="font-serif text-2xl text-gold">{KITCHEN.name}</h2>
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-kitchen-desc>{KITCHEN.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><CookingPot size={12} aria-hidden />조리</p>
        {known.length === 0 ? (
          <p className="mt-3 text-sm text-paper/70" data-kitchen-empty>등록된 조리실 제작법이 없다.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="요리법 목록">
            {known.map((r) => {
              const out = itemOf(r.result)
              const ok = admin || canCook(player, r)
              return (
                <li key={r.id} data-recipe={r.id} className="rounded-xl bg-shade/25 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-base text-paper">{out.name}</p>
                      <p className="mt-0.5 text-xs text-paper/60">{r.note ?? out.desc}</p>
                      <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                        {r.inputs.map(([id, n]) => (
                          <span key={id} className={`rounded-full border px-2 py-px ${countOf(player, id) >= n ? 'border-edge/30 text-paper/80' : 'border-crimson/50 text-crimson'}`}>
                            {itemOf(id).name} {n} <span className="opacity-60">({countOf(player, id)})</span>
                          </span>
                        ))}
                      </p>
                    </div>
                    <button type="button" data-cook={r.id} disabled={!ok} onClick={() => go(r)} className="flat-btn shrink-0 text-xs disabled:opacity-40">만들기</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {msg && <p className="mt-3 text-sm text-gold" role="status" data-kitchen-msg>{msg}</p>}
      </div>
      {admin && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-kitchen-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 모든 요리법을 알고 있고, 조리에 재료가 들지 않는다</p>
        </div>
      )}
    </section>
  )
}
