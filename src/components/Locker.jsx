import { useState } from 'react'
import { Archive } from 'lucide-react'
import { ITEMS, countOf } from '../game/items'
import { LOCKER_SLOTS, lockerOf, maxDeposit, slotsFor, slotsUsed, stackMax } from '../game/locker'
import ItemIcon from './ItemIcon'

function Row({ item, count, label, action, actionLabel, max, onAct, slots }) {
  const [n, setN] = useState(1)
  const q = Math.max(1, Math.min(Math.max(1, max), n))
  return (
    <li data-item={item.id} className="flex items-center gap-3 rounded-xl bg-shade/25 px-3 py-2">
      <ItemIcon item={item} size={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">
          {item.name} <span className="text-gold">×{count}</span>
          {slots != null && <span className="ml-1.5 text-[11px] text-paper/50">{slots}칸</span>}
        </p>
        <p className="truncate text-[11px] text-paper/50">{(item.tags ?? []).join(' · ')}</p>
      </div>
      <input
        aria-label={`${item.name} ${actionLabel} 개수`}
        inputMode="numeric"
        value={q}
        onChange={(e) => setN(Math.max(1, Math.min(Math.max(1, max), parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)))}
        className="h-8 w-11 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
      />
      <button type="button" onClick={() => setN(Math.max(1, max))} disabled={max <= 1} className="rounded-lg bg-edge/10 px-2 py-1.5 text-[11px] text-paper/80 hover:bg-edge/20 disabled:opacity-35">
        최대
      </button>
      <button type="button" disabled={max < 1} onClick={() => onAct(item.id, q)} aria-label={`${item.name} ${actionLabel}`} className="flat-btn !py-1 text-xs disabled:opacity-40" data-action={action}>
        {actionLabel}
      </button>
    </li>
  )
}

/** 물품보관함: 가진 물건을 맡기고 꺼낸다. 칸 수(최대 100)는 물건 종류와 묶음 한도(재료 99 / 아이템 9)로 센다. */
export default function Locker({ player, grade, onMove }) {
  const [err, setErr] = useState('')
  const box = lockerOf(player, grade)
  const used = slotsUsed(box)
  const inBox = ITEMS.filter((i) => (box[i.id] || 0) > 0)
  const mine = ITEMS.filter((i) => countOf(player, i.id) > 0)
  const act = (mode) => (id, n) => {
    const r = onMove(mode, grade, id, n)
    setErr(r?.error || '')
  }
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
        <ul className="mt-2 space-y-2" aria-label="보관 중인 물건">
          {inBox.map((item) => (
            <Row key={item.id} item={item} count={box[item.id]} slots={slotsFor(item.id, box[item.id])} action="out" actionLabel="꺼내기" max={box[item.id]} onAct={act('out')} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] tracking-widest text-paper/55">내 소지품</p>
      {mine.length === 0 ? (
        <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-4 text-center text-sm text-paper/55">맡길 물건이 없다.</p>
      ) : (
        <ul className="mt-2 space-y-2" aria-label="맡길 수 있는 물건">
          {mine.map((item) => (
            <Row key={item.id} item={item} count={countOf(player, item.id)} action="in" actionLabel="맡기기" max={maxDeposit(box, item.id, countOf(player, item.id))} onAct={act('in')} />
          ))}
        </ul>
      )}
    </div>
  )
}
