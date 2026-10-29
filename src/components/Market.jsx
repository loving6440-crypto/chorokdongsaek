import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Store } from 'lucide-react'
import { ITEMS, countOf, itemOf } from '../game/items'
import { marketFetch } from '../net/online'
import ItemIcon from './ItemIcon'
import { canAddInventory } from '../game/inventoryCapacity'

export const MARKET_QTY_MAX = 99
export const MARKET_PRICE_MAX = 99999

/**
 * 벼룩시장: 사람들이 값을 정해 올린 물건을 사고판다. 올린 사람은 보이지 않고, 물건 종류별로 싼 것부터 나온다.
 * onSell(itemId, qty, price) / onBuy(listing) / onCancel(listing) 은 Promise<{ ok, message }> 를 돌려준다.
 */
export default function Market({ player, admin = false, online, onSell, onBuy, onCancel, onOpen }) {
  const [listings, setListings] = useState(null) // null = 불러오는 중
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // 사려는 매물
  const [sellId, setSellId] = useState('')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(1)

  const refresh = useCallback(async () => {
    const r = await marketFetch()
    if (r.ok) {
      setListings(r.listings)
      setFailed(false)
    } else {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    if (!online) return undefined
    onOpen?.()
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [online, refresh, onOpen])

  const owned = ITEMS.filter((i) => countOf(player, i.id) > 0)
  const sellItem = owned.find((i) => i.id === sellId) ?? owned[0]
  const have = sellItem ? countOf(player, sellItem.id) : 0
  const q = Math.max(1, Math.min(Math.max(1, Math.min(have, MARKET_QTY_MAX)), qty))
  const p = Math.max(1, Math.min(MARKET_PRICE_MAX, price))

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    const r = await fn()
    setBusy(false)
    setNotice(r?.message || '')
    await refresh()
  }

  if (!online) {
    return (
      <section aria-label="벼룩시장">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
          <Store size={22} aria-hidden />
          벼룩시장
        </h2>
        <p className="mt-3 text-sm text-paper/70">서버에 연결되어 있지 않아 지금은 열 수 없다. 연결되면 다시 열어 보자.</p>
      </section>
    )
  }

  return (
    <section aria-label="벼룩시장">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
          <Store size={22} aria-hidden />
          벼룩시장
        </h2>
        <button type="button" onClick={refresh} aria-label="새로고침" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="mt-1 text-sm text-paper/65">사람들이 값을 매겨 올린 물건을 사고팔 수 있다. 누가 올렸는지는 알 수 없다. 물건 종류별로 싼 것부터 보인다.</p>
      <p className="mt-2 text-sm text-paper/65">
        소지금 <b className="text-gold" data-money-market>{admin ? '∞' : Math.floor(player.money)}냥</b>
      </p>
      {notice && (
        <p className="mt-2 rounded-lg bg-gold-fill/15 px-3 py-2 text-xs text-gold" role="status" data-market-notice>
          {notice}
        </p>
      )}

      <p className="mt-5 text-[11px] tracking-widest text-paper/55">올라온 매물</p>
      {failed && <p className="mt-2 text-xs text-crimson">매물을 불러오지 못했다.</p>}
      {listings && listings.length === 0 && <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-5 text-center text-sm text-paper/55">올라온 매물이 없다.</p>}
      <ul className="mt-2 space-y-2" aria-label="매물 목록">
        {(listings ?? []).map((l) => {
          const item = itemOf(l.item)
          if (!item) return null
          const hasSpace = canAddInventory(player.inventory, { [l.item]: l.qty })
          const can = hasSpace && (admin || player.money >= l.total)
          return (
            <li key={l.id} data-listing={l.id} data-item={l.item} data-total={l.total} className="flex items-center gap-3 rounded-xl bg-edge/[0.07] px-3 py-2.5">
              <ItemIcon item={item} size={36} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base text-paper">
                  {item.name} <span className="text-gold">×{l.qty}</span>
                  {l.mine && <span className="ml-2 rounded-full border border-gold/40 px-1.5 py-px align-middle font-sans text-[10px] text-gold">내 매물</span>}
                </p>
                <p className="text-xs text-paper/65">
                  개당 {l.price}냥 · <b className="text-paper">합계 {l.total}냥</b>
                </p>
              </div>
              {l.mine ? (
                <button type="button" disabled={busy} onClick={() => run(() => onCancel(l))} className="flat-btn-ghost !py-1 text-xs">
                  내리기
                </button>
              ) : (
                <button type="button" title={!hasSpace ? '소지품이 30칸을 넘어 구매할 수 없다' : undefined} disabled={!can || busy} onClick={() => setConfirm(l)} className="flat-btn !py-1 text-xs disabled:opacity-40">
                  {can ? '구매' : '냥이 모자라다'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-[11px] tracking-widest text-paper/55">내 물건 올리기</p>
      {owned.length === 0 ? (
        <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-4 text-center text-sm text-paper/55">올릴 물건이 없다.</p>
      ) : (
        <div className="ink-panel mt-2 space-y-3 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="mk-item" className="text-xs text-paper/70">물건</label>
            <select id="mk-item" value={sellItem.id} onChange={(e) => setSellId(e.target.value)} className="rounded-lg bg-shade/50 px-2 py-1.5 text-sm text-paper ring-1 ring-edge/20">
              {owned.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (보유 {countOf(player, i.id)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-paper/70">
              개수
              <input aria-label="올릴 개수" inputMode="numeric" value={q} onChange={(e) => setQty(parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)} className="h-8 w-14 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-paper/70">
              개당 가격
              <input aria-label="개당 가격" inputMode="numeric" value={p} onChange={(e) => setPrice(parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)} className="h-8 w-20 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50" />
              냥
            </label>
          </div>
          <p className="text-xs text-paper/70" data-sell-total>
            {sellItem.name} ×{q} · 개당 {p}냥 → <b className="text-gold">합계 {p * q}냥</b>
          </p>
          <button
            type="button"
            disabled={busy || have < 1}
            onClick={() => run(() => onSell(sellItem.id, q, p))}
            className="flat-btn justify-center disabled:opacity-40"
          >
            벼룩시장에 올리기
          </button>
          <p className="text-[11px] text-paper/45">올린 물건은 소지품에서 빠지고, 팔리면 대금이 들어온다. 팔리기 전엔 ‘내리기’로 되돌릴 수 있다. (한 사람이 최대 10개까지 올릴 수 있다.)</p>
        </div>
      )}

      {confirm && (
        <div className="modal-scrim fixed inset-0 z-[75] grid place-items-center p-4" onClick={() => setConfirm(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="벼룩시장 구매 확인" className="ink-panel w-full max-w-sm rounded-2xl p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-lg text-gold">구매하시겠습니까?</p>
            <p className="mt-2 text-sm text-paper/85">
              {itemOf(confirm.item)?.name} ×{confirm.qty}
            </p>
            <p className="mt-1 text-xs text-paper/60">개당 {confirm.price}냥 · 합계 {admin ? '무료 (관리자)' : `${confirm.total}냥`}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const l = confirm
                  setConfirm(null)
                  run(() => onBuy(l))
                }}
                className="flat-btn justify-center"
              >
                구매한다
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="flat-btn-ghost justify-center">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
