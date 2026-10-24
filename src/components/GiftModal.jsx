import { useState } from 'react'
import { Gift, Minus, Plus, X } from 'lucide-react'
import { countOf, enhTotal, giftEnhOf, ownedItems } from '../game/items'
import { MAIL_MAX } from '../net/online'
import ItemIcon from './ItemIcon'

export const GIFT_MAX = 5

/** 선물 주기: 가진 아이템을 합쳐 최대 5개까지 담아 건넨다. 돈은 보낼 수 없다. */
export default function GiftModal({ target, player, onSend, onClose }) {
  const [pick, setPick] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const owned = ownedItems(player)
  const total = Object.values(pick).reduce((a, b) => a + b, 0)

  const change = (id, d) =>
    setPick((p) => {
      const n = (p[id] || 0) + d
      if (n < 0 || n > countOf(player, id)) return p
      if (d > 0 && total >= GIFT_MAX) return p
      const next = { ...p, [id]: n }
      if (!n) delete next[id]
      return next
    })

  const send = async () => {
    if (!total || busy) return
    setBusy(true)
    setErr('')
    const r = await onSend(target, pick, note.trim())
    setBusy(false)
    if (r?.ok) onClose()
    else setErr(r?.message || '선물을 보내지 못했다.')
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[75] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="선물 주기" className="ink-panel flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Gift size={18} aria-hidden />
            {target.name}님에게 선물
          </h2>
          <button type="button" onClick={onClose} aria-label="선물 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <p className="text-[11px] text-paper/55">가진 아이템을 합쳐서 최대 {GIFT_MAX}개까지 담을 수 있다. 돈(냥)은 보낼 수 없다.</p>
          {owned.length === 0 ? (
            <p className="mt-3 rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">건넬 아이템이 없다.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {owned.map((item) => {
                const n = pick[item.id] || 0
                return (
                  <li key={item.id} data-item={item.id} className="flex items-center gap-3 rounded-xl bg-shade/25 px-3 py-2">
                    <ItemIcon item={item} size={32} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-paper">{item.name} <span className="text-[11px] text-paper/50">보유 {countOf(player, item.id)}</span></p>
                      {item.effectText && <p className="truncate text-[11px] text-gold/80">{item.effectText}</p>}
                      {item.slot === 'weapon' && enhTotal(player, item.id) > 0 && (
                        <p className="text-[11px] text-paper/60" data-gift-enh={item.id}>
                          강화 +{enhTotal(player, item.id)}{n > 0 && Object.keys(giftEnhOf(player, { [item.id]: n })).length ? ' — 이 선물에 함께 간다' : n > 0 ? ' — 남는 무구에 그대로 남는다' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" aria-label={`${item.name} 빼기`} disabled={!n} onClick={() => change(item.id, -1)} className="grid size-7 place-items-center rounded border border-gold/30 text-gold disabled:opacity-30">
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-sm tabular-nums text-paper">{n}</span>
                      <button type="button" aria-label={`${item.name} 담기`} disabled={total >= GIFT_MAX || n >= countOf(player, item.id)} onClick={() => change(item.id, 1)} className="grid size-7 place-items-center rounded border border-gold/30 text-gold disabled:opacity-30">
                        <Plus size={13} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-edge/15 px-4 pt-3">
          <label htmlFor="gift-note" className="text-[11px] text-paper/55">쪽지(선택) — 받는 사람의 사물함에 남는다</label>
          <textarea
            id="gift-note"
            data-gift-note
            value={note}
            maxLength={MAIL_MAX}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder="선물과 함께 전할 말"
            className="mt-1 w-full resize-none rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper outline-none focus:border-gold/50"
          />
          <p className="text-right text-[10px] tabular-nums text-paper/45">{note.length} / {MAIL_MAX}</p>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <span className="text-xs text-paper/70" aria-live="polite">담은 아이템 {total} / {GIFT_MAX}{err && <span className="ml-2 text-crimson">{err}</span>}</span>
          <button type="button" disabled={!total || busy} onClick={send} className="flat-btn disabled:cursor-not-allowed disabled:opacity-40">
            <Gift size={14} />
            건네기
          </button>
        </div>
      </div>
    </div>
  )
}
