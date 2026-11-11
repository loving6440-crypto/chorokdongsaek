import { useState } from 'react'
import ItemIcon from './ItemIcon'
import { itemOf } from '../game/items'
import { inventoryStacks } from '../game/inventoryCapacity'
import { BENCH_SLOTS, benchPreview, benchTotals, knownMakeable, maxQtyFor } from '../game/freeCraft'
import { josa } from '../game/quests'

/**
 * v-B.18 조리실 · 공작소의 [제작] 칸.
 *  - 위: 제작 칸 10칸. 아래: 내 소지품(칸 단위). 소지품 칸을 제작 칸으로 끌어다 놓는다(휴대폰은 눌러서 올린다).
 *  - v-B.18: 끌어다 놓으면 1개가 올라간다. 제작 칸의 + 로 늘린다(또 끌어다 놓거나 눌러도 1개씩 늘어난다).
 *  - [제작]: 맞는 제작법이 있으면 그대로 만들고, 없으면 실패작(조리실 숯 · 공작소 쓰레기)이 나온다. 누르기 전에 미리 보여 준다.
 * props: player · place('kitchen'|'workshop') · onCraft(slots) → 결과 · slots/setSlots(바깥에서 채워 줄 때) · disabled(이유 글)
 */
export default function CraftBench({ player, place, onCraft, onKnownCraft, slots: outerSlots, setSlots: outerSet, disabled = '' }) {
  const [inner, setInner] = useState(() => Array(BENCH_SLOTS).fill(null))
  const slots = outerSlots ?? inner
  const setSlots = outerSet ?? setInner
  const [msg, setMsg] = useState(null)
  const [over, setOver] = useState(null)
  const [knownOpen, setKnownOpen] = useState(false) // v-B.18 아는 제작법대로 만들기 팝업
  const inv = player?.inventory ?? {}
  const placed = benchTotals(slots)
  const left = (id) => Math.max(0, (inv[id] || 0) - (placed[id] || 0))
  const stacks = inventoryStacks(inv).filter((s) => s.id !== 'bag' && itemOf(s.id))
  const preview = benchPreview(slots, place)

  const put = (id, n, at = null) => {
    const amount = Math.min(n, left(id))
    if (!(amount > 0)) return setMsg({ error: true, text: `${josa(itemOf(id)?.name ?? '', '은')} 더 올릴 게 없다.` })
    setMsg(null)
    setSlots((cur) => {
      const next = [...cur]
      const same = next.findIndex((s) => s?.id === id)
      if (at != null && next[at] && next[at].id !== id) {
        next[at] = { id, n: amount } // 다른 물건 위에 놓으면 바꾼다(원래 것은 소지품으로)
        return next
      }
      const idx = same >= 0 ? same : at != null && !next[at] ? at : next.findIndex((s) => !s)
      if (idx < 0) { setMsg({ error: true, text: `제작 칸은 ${BENCH_SLOTS}칸까지다.` }); return cur }
      next[idx] = { id, n: (next[idx]?.n || 0) + amount }
      return next
    })
  }
  const bump = (i, d) => setSlots((cur) => {
    const next = [...cur]
    const s = next[i]
    if (!s) return cur
    const n = s.n + d
    if (n <= 0) next[i] = null
    else if (d > 0 && left(s.id) <= 0) return cur
    else next[i] = { ...s, n }
    return next
  })
  const clear = () => { setSlots(Array(BENCH_SLOTS).fill(null)); setMsg(null) }
  const go = async () => {
    if (disabled) return
    const r = await onCraft?.(slots.filter(Boolean))
    if (!r || r.error) return setMsg({ error: true, text: r?.error ?? '만들 수 없다.' })
    setMsg({ text: r.failed ? `제작법에 없는 조합이었다⋯⋯. 재료가 엉망이 되어 ${josa(r.item.name, '이')} 남았다.` : r.qty > 1 ? `${r.item.name} ${r.qty}개가 완성되었다!` : `${josa(r.item.name, '이')} 완성되었다!`, failed: r.failed, item: r.item })
    setSlots(Array(BENCH_SLOTS).fill(null))
  }
  const fromDrag = (e) => {
    try { return JSON.parse(e.dataTransfer.getData('application/x-bench') || 'null') } catch { return null }
  }

  return (
    <div data-craft-bench={place}>
      <p className="text-[11px] text-paper/55">소지품을 아래에서 제작 칸으로 끌어다 놓으면 1개씩 올라간다. 제작 칸의 + 로 개수를 늘리자. (휴대폰에서는 눌러서 올린다.) 맞는 제작법이 있으면 그대로 만들어진다.</p>
      <div className="mt-3 grid grid-cols-5 gap-2" role="list" aria-label="제작 칸">
        {slots.map((s, i) => {
          const it = s && itemOf(s.id)
          return (
            <div
              key={i}
              role="listitem"
              data-bench-slot={i}
              data-bench-item={s?.id ?? ''}
              onDragOver={(e) => { e.preventDefault(); setOver(i) }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOver(null); const d = fromDrag(e); if (d) put(d.id, d.n, i) }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border ${over === i ? 'border-gold bg-gold/10' : s ? 'border-edge/30 bg-shade/30' : 'border-dashed border-edge/25'}`}
            >
              {it ? (
                <>
                  <ItemIcon item={it} size={30} />
                  <span className="mt-0.5 max-w-full truncate px-1 text-[10px] text-paper/80">{it.name}</span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <button type="button" aria-label="하나 빼기" data-bench-minus={i} onClick={() => bump(i, -1)} className="px-1 text-paper/60 hover:text-paper">−</button>
                    <b className="text-gold" data-bench-n>{s.n}</b>
                    <button type="button" aria-label="하나 더" data-bench-plus={i} onClick={() => bump(i, 1)} className="px-1 text-paper/60 hover:text-paper">+</button>
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-paper/25">{i + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-xl bg-shade/25 px-3 py-2 text-xs" data-bench-preview={preview.empty ? 'empty' : preview.fail ? 'fail' : preview.recipe.id}>
        {preview.empty ? (
          <span className="text-paper/50">제작 칸이 비어 있다.</span>
        ) : preview.fail ? (
          <span className="text-crimson/90">맞는 제작법이 없다. 이대로 만들면 재료가 모두 사라지고 [{preview.item?.name}]{josa(preview.item?.name ?? '', '이').slice((preview.item?.name ?? '').length)} 나온다.</span>
        ) : (
          <span className="text-gold">제작법과 맞는다 → [{preview.item.name}]{preview.k > 1 ? ` × ${preview.k}` : ''}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="flat-btn text-xs disabled:opacity-40" data-bench-go disabled={!!disabled || preview.empty} onClick={go}>제작</button>
        <button type="button" className="flat-chip" data-bench-clear onClick={clear} disabled={preview.empty}>칸 비우기</button>
        {disabled && <span className="text-[11px] text-paper/50">{disabled}</span>}
      </div>
      {onKnownCraft && (
        <div className="mt-2">
          <button type="button" className="flat-btn text-xs disabled:opacity-40" data-known-open disabled={!!disabled} onClick={() => setKnownOpen(true)}>
            아는 {place === 'kitchen' ? '요리법' : '제작법'}대로 만들기
          </button>
        </div>
      )}
      {knownOpen && (
        <KnownCraftModal
          player={player}
          place={place}
          onClose={() => setKnownOpen(false)}
          onMake={async (id, q) => {
            const r = await onKnownCraft(id, q)
            if (!r || r.error) return r ?? { error: '만들 수 없다.' }
            setMsg({ text: r.qty > 1 ? `${r.item.name} ${r.qty}개가 완성되었다!` : `${josa(r.item.name, '이')} 완성되었다!`, item: r.item })
            setKnownOpen(false)
            return r
          }}
        />
      )}
      {msg && (
        <p className={`mt-2 text-sm ${msg.error ? 'text-crimson' : msg.failed ? 'text-paper/80' : 'text-gold'}`} role="status" data-bench-msg>
          {msg.item && <ItemIcon item={msg.item} size={22} className="mr-1.5 inline-block align-middle" />}
          {msg.text}
        </p>
      )}

      <p className="mt-4 text-[10px] tracking-[0.25em] text-paper/50">내 소지품</p>
      {stacks.length === 0 ? (
        <p className="mt-2 text-sm text-paper/60">소지품이 비어 있다.</p>
      ) : (
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6" role="list" aria-label="소지품">
          {stacks.map((st, i) => {
            const it = itemOf(st.id)
            const can = Math.min(st.quantity, left(st.id))
            return (
              <button
                key={`${st.id}-${i}`}
                type="button"
                role="listitem"
                draggable={can > 0}
                data-bench-src={st.id}
                disabled={can <= 0}
                onDragStart={(e) => { e.dataTransfer.setData('application/x-bench', JSON.stringify({ id: st.id, n: 1 })); e.dataTransfer.effectAllowed = 'copy' }}
                onClick={() => put(st.id, 1)}
                title={`${it.name} — 끌어다 놓거나 누르면 1개씩 올라간다`}
                className="relative flex aspect-square flex-col items-center justify-center rounded-xl border border-edge/20 bg-edge/[0.05] hover:border-gold/50 disabled:opacity-35"
              >
                <ItemIcon item={it} size={28} />
                <span className="mt-0.5 max-w-full truncate px-1 text-[10px] text-paper/75">{it.name}</span>
                <span className="absolute top-1 right-1.5 text-[10px] text-paper/70">{st.quantity}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * v-B.18 [아는 제작법대로 만들기] 팝업: 지금 만들 수 있고 · 이미 한 번 만들어 본 제작법만 가나다순으로.
 * 하나를 고르고 몇 개치 만들지 정해서 만든다.
 */
function KnownCraftModal({ player, place, onClose, onMake }) {
  const list = knownMakeable(player, place)
  const [pick, setPick] = useState(null)
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')
  const r = list.find((x) => x.id === pick)
  const max = r ? maxQtyFor(player, r) : 1
  const q = Math.max(1, Math.min(max, qty))
  const word = place === 'kitchen' ? '요리법' : '제작법'
  return (
    <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4" data-known-modal={place} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`아는 ${word}대로 만들기`} className="ink-panel flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl p-5">
        <p className="font-serif text-lg text-gold">아는 {word}대로 만들기</p>
        <p className="mt-1 text-[11px] text-paper/55">지금 재료로 만들 수 있고, 이미 한 번 만들어 본 {word}만 보인다.</p>
        {list.length === 0 ? (
          <p className="mt-4 text-sm text-paper/70" data-known-empty>지금 만들 수 있는 아는 {word}이 없다. 제작 칸에서 한 번 만들어 보면 여기에 생긴다.</p>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-label={`아는 ${word}`}>
            {list.map((x) => {
              const it = itemOf(x.result)
              const on = x.id === pick
              return (
                <li key={x.id}>
                  <button type="button" data-known-pick={x.id} aria-pressed={on} onClick={() => { setPick(x.id); setQty(1); setErr('') }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${on ? 'bg-gold-fill/25 ring-1 ring-gold/50' : 'bg-shade/25 hover:bg-gold-fill/10'}`}>
                    <ItemIcon item={it} size={30} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-paper">{it.name}</span>
                      <span className="block truncate text-[10px] text-paper/55">{x.inputs.map(([id, n]) => `${itemOf(id)?.name} ${n}`).join(' · ')}</span>
                    </span>
                    <span className="text-[10px] text-paper/50">최대 {maxQtyFor(player, x)}개</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {r && (
          <div className="mt-3 rounded-xl bg-shade/30 p-3" data-known-qty-panel>
            <p className="text-xs text-paper/80">[{itemOf(r.result).name}] 몇 개치 만들까? <span className="text-paper/50">(최대 {max}개)</span></p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="flat-btn !px-2 !py-1 text-xs" onClick={() => setQty((v) => Math.max(1, Math.min(max, v) - 1))}>−</button>
              <input type="number" min="1" max={max} value={q} aria-label="만들 개수" data-known-qty onChange={(e) => setQty(Math.floor(Number(e.target.value) || 1))} className="w-16 rounded border border-edge/30 bg-shade px-2 py-1 text-center text-sm text-paper" />
              <button type="button" className="flat-btn !px-2 !py-1 text-xs" onClick={() => setQty((v) => Math.min(max, Math.min(max, v) + 1))}>+</button>
              <button type="button" className="flat-chip" onClick={() => setQty(max)}>최대</button>
            </div>
            <p className="mt-1.5 text-[10px] text-paper/50">드는 재료: {r.inputs.map(([id, n]) => `${itemOf(id)?.name} ${n * q}`).join(' · ')}</p>
          </div>
        )}
        {err && <p className="mt-2 text-xs text-crimson" role="alert">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="flat-chip" onClick={onClose}>닫기</button>
          <button type="button" className="flat-btn text-xs disabled:opacity-40" data-known-make disabled={!r} onClick={async () => { const res = await onMake(r.id, q); if (res?.error) setErr(res.error) }}>
            {r ? `${q}개 만들기` : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}
