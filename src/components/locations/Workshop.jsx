import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'
import { RECIPES, WORKSHOP, canCraft, maxCraftQty, recipeOf } from '../../game/crafting'
import { countOf, itemOf } from '../../game/items'

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

/** 공작소: 등록된 제작법이 있으면 재료만으로 즉시 제작. 이전 버전 제작 대기 상태만 호환 표시. */
export default function Workshop({ player, admin, onCraft, onStopCraft, onAdminLearn }) {
  const [msg, setMsg] = useState('')
  const [pickId, setPickId] = useState(null) // 개수를 고르는 중인 제작법 id
  const [qty, setQty] = useState(1)
  const [, setTick] = useState(0)
  const known = RECIPES
  const cf = player.crafting

  useEffect(() => {
    if (!cf) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [cf])

  const openPick = (r) => {
    setPickId(r.id)
    setQty(1)
  }
  const go = () => {
    const r = recipeOf(pickId)
    const res = onCraft(pickId, qty)
    setMsg(res?.error ?? `${itemOf(r.result).name} ${qty}개를 제작했다.`)
    setPickId(null)
  }

  if (cf) {
    const r = recipeOf(cf.recipeId)
    const out = itemOf(r.result)
    const left = cf.startedAt + cf.minutes * 60000 - Date.now()
    return (
      <section aria-label={WORKSHOP.name} data-workshop>
        <h2 className="font-serif text-2xl text-gold">{WORKSHOP.name}</h2>
        <div className="ink-panel mt-4 w-full rounded-xl p-5" data-crafting={cf.recipeId}>
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><Hammer size={12} aria-hidden />제작 중</p>
          <p className="mt-2 font-serif text-base text-paper">{out.name} × {cf.qty}개를 만들고 있다.</p>
          <p className="mt-1 text-xs text-paper/60">끝까지 기다려야 완성품이 나온다. 중간에 나가면 재료도 완성품도 돌아오지 않는다.</p>
          <p className="mt-2 text-sm text-gold" data-craft-left>남은 시간: {left > 0 ? leftText(left) : '거의 다 됐다'}</p>
          <button type="button" onClick={() => onStopCraft?.()} className="flat-btn mt-3 text-xs">제작 그만두기</button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={WORKSHOP.name} data-workshop>
      <h2 className="font-serif text-2xl text-gold">{WORKSHOP.name}</h2>
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-workshop-desc>{WORKSHOP.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><Hammer size={12} aria-hidden />제작</p>
        <p className="mt-1 text-[11px] text-paper/50">재료가 있다면 제작법을 별도로 배우지 않아도 즉시 제작할 수 있다.</p>
        {known.length === 0 ? (
          <p className="mt-3 text-sm text-paper/70" data-workshop-empty>등록된 공작소 제작법이 없다.</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="제작법 목록">
            {known.map((r) => {
              const out = itemOf(r.result)
              const ok = admin || canCraft(player, r)
              const picking = pickId === r.id
              const maxQ = maxCraftQty(player, r, admin)
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
                    <button type="button" data-craft={r.id} disabled={!ok} onClick={() => openPick(r)} className="flat-btn shrink-0 text-xs disabled:opacity-40">만들기</button>
                  </div>
                  {picking && (
                    <div className="mt-2 rounded-lg bg-shade/30 p-2.5" data-craft-qty-panel>
                      <p className="text-xs text-paper/80">몇 개 만들까요? <span className="text-[11px] text-paper/50">(최대 {admin ? 99 : maxQ}개)</span></p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flat-btn !px-2 !py-1 text-xs">−</button>
                        <b className="font-serif text-base text-gold" data-craft-qty>{qty}</b>
                        <button
                          type="button"
                          onClick={() => setQty((q) => Math.min(admin ? 99 : Math.max(1, maxQ), q + 1))}
                          className="flat-btn !px-2 !py-1 text-xs"
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-paper/60" data-craft-time>재료가 충분하면 즉시 제작된다.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={go} className="flat-btn text-xs">바로 제작</button>
                        <button type="button" onClick={() => setPickId(null)} className="flat-btn text-xs">취소</button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {msg && <p className="mt-3 text-sm text-gold" role="status" data-workshop-msg>{msg}</p>}
      </div>
      {admin && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-workshop-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 제작 시 재료가 소모되지 않는다</p>
        </div>
      )}
    </section>
  )
}
