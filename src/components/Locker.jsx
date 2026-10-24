import { useEffect, useState } from 'react'
import { Archive } from 'lucide-react'
import { ITEMS, countOf } from '../game/items'
import { LOCKER_SLOTS, lockerOf, maxDeposit, slotsFor, slotsUsed, stackMax } from '../game/locker'
import ItemIcon from './ItemIcon'

function Tile({ item, count, slots, onOpen }) {
  return (
    <li>
      <button
        type="button"
        data-item={item.id}
        onClick={() => onOpen(item.id)}
        aria-label={`${item.name} ×${count}`}
        className="tilt flex w-full flex-col items-center gap-1 rounded-xl bg-shade/25 p-2 hover:bg-gold-fill/15"
      >
        <ItemIcon item={item} size={36} className="shrink-0" />
        <span className="w-full truncate text-center text-[11px] text-paper">{item.name}</span>
        <span className="text-[11px] text-gold">
          ×{count}
          {slots != null && <span className="ml-1 text-paper/45">{slots}칸</span>}
        </span>
      </button>
    </li>
  )
}

/** 누르면 뜨는 팝업: 설명과 개수 입력, 맡기기/꺼내기. */
function Popup({ item, count, max, actionLabel, action, onAct, onClose }) {
  const [n, setN] = useState(1)
  const q = Math.max(1, Math.min(Math.max(1, max), n))
  return (
    <div className="modal-scrim fixed inset-0 z-[75] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={item.name} data-locker-popup={item.id} className="ink-panel w-full max-w-xs rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <ItemIcon item={item} size={40} className="shrink-0" />
          <p className="font-serif text-base text-paper">
            {item.name} <span className="text-sm text-gold">×{count}</span>
          </p>
        </div>
        <p className="mt-1 text-[11px] text-paper/50">{(item.tags ?? []).join(' · ')}</p>
        <p className="mt-2 text-xs leading-relaxed text-paper/75">{item.desc}</p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <input
            aria-label={`${item.name} ${actionLabel} 개수`}
            inputMode="numeric"
            value={q}
            onChange={(e) => setN(Math.max(1, Math.min(Math.max(1, max), parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)))}
            className="h-8 w-12 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
          />
          <button type="button" onClick={() => setN(Math.max(1, max))} disabled={max <= 1} className="rounded-lg bg-edge/10 px-2 py-1.5 text-[11px] text-paper/80 hover:bg-edge/20 disabled:opacity-35">
            최대
          </button>
          <button type="button" disabled={max < 1} onClick={() => onAct(item.id, q)} aria-label={`${item.name} ${actionLabel}`} className="flat-btn !py-1 text-xs disabled:opacity-40" data-action={action}>
            {actionLabel}
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-lg bg-edge/10 py-1 text-xs text-paper/70 hover:bg-edge/20">닫기</button>
      </div>
    </div>
  )
}

/** 물품보관함: 가진 물건을 맡기고 꺼낸다. 칸 수(최대 100)는 물건 종류와 묶음 한도(재료 99 / 아이템 9)로 센다. */
export default function Locker({ player, grade, onMove, onOpen }) {
  useEffect(() => {
    onOpen?.(grade)
  }, [grade]) // eslint-disable-line react-hooks/exhaustive-deps
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(null) // { id, mode: 'in' | 'out' }
  const box = lockerOf(player, grade)
  const used = slotsUsed(box)
  const inBox = ITEMS.filter((i) => (box[i.id] || 0) > 0)
  const mine = ITEMS.filter((i) => countOf(player, i.id) > 0)
  const act = (mode) => (id, n) => {
    const r = onMove(mode, grade, id, n)
    setErr(r?.error || '')
    if (!r?.error) setSel(null)
  }
  const selItem = sel ? ITEMS.find((i) => i.id === sel.id) : null
  return (
    <div className="mt-4" aria-label={`${grade}학년 물품보관함`} role="region">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg text-gold">
          <Archive size={17} aria-hidden />
          {grade}학년 물품보관함
        </h3>
        <span className="text-xs text-paper/70" data-slots>
          {used} / {LOCKER_SLOTS}칸
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-paper/55">
        같은 물건은 한 종류로 치고, 한 칸엔 재료 99개 / 아이템 9개까지 담긴다. 넘치면 여러 칸을 쓴다.
      </p>
      {err && (
        <p className="mt-2 rounded-lg bg-crimson/15 px-3 py-2 text-xs text-crimson" role="alert">
          {err}
        </p>
      )}
      <p className="mt-4 text-[11px] tracking-widest text-paper/55">보관함 안</p>
      {inBox.length === 0 ? (
        <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-4 text-center text-sm text-paper/55">비어 있다.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="보관 중인 물건">
          {inBox.map((item) => (
            <Tile key={item.id} item={item} count={box[item.id]} slots={slotsFor(item.id, box[item.id])} onOpen={(id) => setSel({ id, mode: 'out' })} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] tracking-widest text-paper/55">내 소지품</p>
      {mine.length === 0 ? (
        <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-4 text-center text-sm text-paper/55">맡길 물건이 없다.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="맡길 수 있는 물건">
          {mine.map((item) => (
            <Tile key={item.id} item={item} count={countOf(player, item.id)} onOpen={(id) => setSel({ id, mode: 'in' })} />
          ))}
        </ul>
      )}
      {selItem && sel.mode === 'out' && (box[selItem.id] || 0) > 0 && (
        <Popup key={'o' + selItem.id} item={selItem} count={box[selItem.id]} max={box[selItem.id]} action="out" actionLabel="꺼내기" onAct={act('out')} onClose={() => setSel(null)} />
      )}
      {selItem && sel.mode === 'in' && countOf(player, selItem.id) > 0 && (
        <Popup key={'i' + selItem.id} item={selItem} count={countOf(player, selItem.id)} max={maxDeposit(box, selItem.id, countOf(player, selItem.id))} action="in" actionLabel="맡기기" onAct={act('in')} onClose={() => setSel(null)} />
      )}
    </div>
  )
}
