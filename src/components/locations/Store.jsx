import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { STORE_HOURS, STORE_ITEMS, countOf, isStoreOpen } from '../../game/items'
import { STORE_INFO, YUMIN } from '../../game/store'
import { pickNpcLine } from '../../game/npcLines'
import ItemIcon from '../ItemIcon'
import NpcDialog from '../NpcDialog'

/** 기숙사 매점. 아래쪽에서 점원 강유민이 들어올 때마다 대사를 하나씩 한다. */
export default function Store({ player, onBuy, onMeet, onLineSeen, admin = false }) {
  const [now, setNow] = useState(() => Date.now())
  const [{ line, firstOf }] = useState(() => pickNpcLine(YUMIN.id, YUMIN.lines, player, player.lineSeen))
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    onMeet?.('yumin')
  }, [onMeet])
  useEffect(() => {
    if (firstOf) onLineSeen?.('yumin', firstOf)
  }, [firstOf, onLineSeen])
  const open = isStoreOpen(now)

  return (
    <section aria-label="매점">
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
        <ShoppingBag size={22} aria-hidden />
        매점
      </h2>
      <p className="mt-1 text-sm text-paper/70">{STORE_INFO.oneLine}</p>
      <div className="ink-panel mt-3 w-full space-y-3 rounded-xl p-4">
        {STORE_INFO.paragraphs.map((t, i) => (
          <p key={i} className="text-sm leading-[1.9] break-keep text-paper/80">
            {t}
          </p>
        ))}
      </div>

      <p className="mt-4 text-sm text-paper/65">
        소지금 <b className="text-gold">{admin ? '∞' : Math.floor(player.money)}냥</b>
        <span
          data-store-open={open ? '1' : '0'}
          className={`ml-3 rounded-full px-2.5 py-0.5 text-[11px] ${open ? 'bg-gold-fill/25 text-gold' : 'bg-crimson/25 text-crimson'}`}
        >
          {open ? '영업 중' : '영업 종료'}
        </span>
      </p>
      {!open && (
        <p className="mt-2 rounded-lg bg-crimson/15 px-3 py-2 text-xs text-crimson" role="status">
          지금은 문이 닫혀 있다. 오전 {STORE_HOURS.open}시부터 밤 {STORE_HOURS.close - 12}시까지 연다.
        </p>
      )}
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {STORE_ITEMS.map((item) => {
          const can = open && (admin || player.money >= item.price)
          return (
            <li key={item.id} className="ink-panel flex flex-col rounded-xl p-4" data-item={item.id}>
              <div className="flex items-start gap-3">
                <ItemIcon item={item} size={44} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-serif text-lg text-paper">{item.name}</p>
                    <p className="shrink-0 text-sm text-gold">{item.price}냥</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-paper/75">{item.desc}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gold">{item.effectText}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-paper/50">보유 {countOf(player, item.id)}개</span>
                <button type="button" disabled={!can} onClick={() => onBuy(item.id)} className="flat-btn !py-1 text-sm disabled:opacity-40">
                  {!open ? '영업 종료' : can ? '구매' : '냥이 모자라다'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 점원 강유민: 미연시풍 대화창 (이름·대사는 바리와 같이 초상화 위쪽에 놓는다) */}
      <NpcDialog npc={YUMIN.name} src={YUMIN.faces[line.face ?? 'plain']} face={line.face} dataNpc="yumin">
        {line.text}
      </NpcDialog>
    </section>
  )
}
