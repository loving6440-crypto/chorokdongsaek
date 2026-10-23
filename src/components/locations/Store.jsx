import { ShoppingBag } from 'lucide-react'
import { ITEMS, countOf } from '../../game/items'

/** 기숙사 매점. */
export default function Store({ player, onBuy }) {
  return (
    <section aria-label="매점">
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
        <ShoppingBag size={22} aria-hidden />
        매점
      </h2>
      <p className="mt-1 text-sm text-paper/65">
        소지금 <b className="text-gold">{Math.floor(player.money)}냥</b>
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {ITEMS.map((item) => {
          const can = player.money >= item.price
          return (
            <li key={item.id} className="ink-panel flex flex-col rounded-xl p-4" data-item={item.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-lg text-paper">{item.name}</p>
                <p className="text-sm text-gold">{item.price}냥</p>
              </div>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-paper/75">{item.desc}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gold">{item.effectText}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-paper/50">보유 {countOf(player, item.id)}개</span>
                <button type="button" disabled={!can} onClick={() => onBuy(item.id)} className="flat-btn !py-1 text-sm disabled:opacity-40">
                  {can ? '구매' : '냥이 모자라다'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
