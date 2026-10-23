import { useEffect, useState } from 'react'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
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
  const [target, setTarget] = useState(null) // 구매 확인 팝업의 아이템
  const [qty, setQty] = useState(1)
  const askBuy = (item) => {
    setQty(1)
    setTarget(item)
  }
  const maxQty = target ? (admin ? 99 : Math.min(99, Math.floor(player.money / target.price))) : 0
  const q = Math.max(1, Math.min(Math.max(1, maxQty), qty))
  useEffect(() => {
    if (!target) return
    const onKey = (e) => e.key === 'Escape' && setTarget(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target])

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
                    <p className="font-serif text-lg text-paper">
                      {item.name}
                      {(item.tags ?? []).map((t) => (
                        <span key={t} className="ml-1.5 rounded-full border border-edge/25 px-1.5 py-px align-middle font-sans text-[10px] text-paper/60">
                          {t}
                        </span>
                      ))}
                    </p>
                    <p className="shrink-0 text-sm text-gold">{item.price}냥</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-paper/75">{item.desc}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gold">{item.effectText}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-paper/50">보유 {countOf(player, item.id)}개</span>
                <button type="button" disabled={!can} onClick={() => askBuy(item)} className="flat-btn !py-1 text-sm disabled:opacity-40">
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
      {target && (
        <div className="modal-scrim fixed inset-0 z-[75] grid place-items-center p-4" onClick={() => setTarget(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="구매 확인" className="ink-panel w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-serif text-lg text-gold">구매하시겠습니까?</p>
              <button type="button" onClick={() => setTarget(null)} aria-label="구매 팝업 닫기" className="grid size-7 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <ItemIcon item={target} size={48} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base text-paper">
                  {target.name}
                  {(target.tags ?? []).map((t) => (
                    <span key={t} className="ml-1.5 rounded-full border border-edge/25 px-1.5 py-px align-middle font-sans text-[10px] text-paper/60">
                      {t}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-paper/75">{target.desc}</p>
                <p className="mt-1 text-xs leading-relaxed text-gold">{target.effectText}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm text-paper/80">몇 개 살까요? <span className="text-[11px] text-paper/50">(개당 {target.price}냥)</span></span>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="하나 줄이기" disabled={q <= 1} onClick={() => setQty(q - 1)} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper hover:bg-edge/20 disabled:opacity-35">
                  <Minus size={14} />
                </button>
                <input
                  aria-label="구매 개수"
                  inputMode="numeric"
                  value={q}
                  onChange={(e) => setQty(Math.max(1, Math.min(Math.max(1, maxQty), parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)))}
                  className="h-8 w-12 rounded-lg bg-shade/50 text-center font-serif text-base text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
                />
                <button type="button" aria-label="하나 늘리기" disabled={q >= maxQty} onClick={() => setQty(q + 1)} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper hover:bg-edge/20 disabled:opacity-35">
                  <Plus size={14} />
                </button>
                <button type="button" onClick={() => setQty(Math.max(1, maxQty))} disabled={maxQty <= 1} className="rounded-lg bg-edge/10 px-2 py-1.5 text-[11px] text-paper/80 hover:bg-edge/20 disabled:opacity-35">
                  최대
                </button>
              </div>
            </div>
            <p className="mt-3 flex items-baseline justify-between text-sm text-paper/80">
              <span>합계</span>
              <b className="font-serif text-lg text-gold" data-total>{admin ? '무료 (관리자)' : `${target.price * q}냥`}</b>
            </p>
            {!admin && <p className="mt-0.5 text-right text-[11px] text-paper/50" data-after>사고 나면 {player.money - target.price * q}냥이 남는다.</p>}
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                disabled={maxQty < 1}
                onClick={() => {
                  onBuy(target.id, q)
                  setTarget(null)
                }}
                className="flat-btn justify-center disabled:opacity-40"
              >
                {q}개 구매
              </button>
              <button type="button" onClick={() => setTarget(null)} className="flat-btn-ghost justify-center">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
