import { useState } from 'react'
import { Hammer } from 'lucide-react'
import { RECIPES, WORKSHOP, canCraft, knowsRecipe } from '../../game/crafting'
import { countOf, itemOf } from '../../game/items'

/** 지하 1층 비품실 › 공작소. 제작법을 아는 것만 만들 수 있다. */
export default function Workshop({ player, admin, onCraft, onAdminLearn }) {
  const [msg, setMsg] = useState('')
  const known = RECIPES.filter((r) => knowsRecipe(player, r.id, admin))
  const go = (r) => {
    const res = onCraft(r.id)
    setMsg(res?.error ?? `${itemOf(r.result).name}을(를) 만들었다.`)
  }
  return (
    <section aria-label={WORKSHOP.name} data-workshop>
      <h2 className="font-serif text-2xl text-gold">{WORKSHOP.name}</h2>
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-workshop-desc>{WORKSHOP.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><Hammer size={12} aria-hidden />제작</p>
        {known.length === 0 ? (
          <p className="mt-3 text-sm text-paper/70" data-workshop-empty>아는 제작법이 없다. 제작법이 없으면 재료를 섞어도 아무것도 만들 수 없다.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="제작법 목록">
            {known.map((r) => {
              const out = itemOf(r.result)
              const ok = admin || canCraft(player, r)
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
                    <button type="button" data-craft={r.id} disabled={!ok} onClick={() => go(r)} className="flat-btn shrink-0 text-xs disabled:opacity-40">만들기</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {msg && <p className="mt-3 text-sm text-gold" role="status" data-workshop-msg>{msg}</p>}
      </div>
      {admin && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-workshop-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 모든 제작법을 알고 있고, 제작에 재료가 들지 않는다</p>
        </div>
      )}
    </section>
  )
}
