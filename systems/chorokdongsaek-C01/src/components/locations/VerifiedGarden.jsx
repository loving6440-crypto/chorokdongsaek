import { useEffect, useState } from 'react'
import { Sprout, Coins } from 'lucide-react'
import { GARDEN_CROPS, GARDEN_EXTRA_SEEDS, GARDEN_GROW_MS, SEED_PRICE } from '../../game/garden'
import { NPC_BUY_PRICES } from '../../game/verifiedEconomyRules'
import { itemOf } from '../../game/items'

const allSeeds = [...GARDEN_CROPS.map((c) => ({ id: c.seedId, name: `${c.name} 씨앗` })), ...GARDEN_EXTRA_SEEDS]
const timeLeft = (n) => {
  const s = Math.max(0, Math.ceil(n / 1000))
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
/** B.12 검증된 별도 비닐하우스. 기존 player.gardenPlots / money / inventory 참조 금지. */
export default function VerifiedGarden({ economy, part }) {
  const [now, setNow] = useState(Date.now)
  const [seedId, setSeedId] = useState(GARDEN_CROPS[0].seedId)
  const wallet = economy.wallet
  const inv = wallet?.inventory ?? {}
  const plots = wallet?.gardenPlots ?? Array(5).fill(null)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const make = (route, data) => economy.transact(route, data)
  const gathering = wallet?.gathering
  const ready = !!gathering && now >= gathering.readyAt
  const shop = part === 'shop'
  return <section aria-label="검증 텃밭" data-verified-garden className="ink-panel mt-4 rounded-xl p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-serif text-lg text-gold"><Sprout size={18}/> {shop ? '검증 씨앗 상점' : '검증 비닐하우스'}</h3>
    <p className="mt-2 text-xs leading-relaxed text-paper/70">서버에서 관리하는 검증 재화만 사용합니다. 기존 캐릭터의 소지금·씨앗·작물·재배 기록은 이전되지 않으며, 검증 재고는 장터에서 거래할 수 있습니다.</p>
    <p className="mt-2 flex items-center gap-1 text-sm text-gold"><Coins size={14}/> 검증 잔액 {Number(wallet?.money ?? 0).toLocaleString()}냥 · 씨앗 {SEED_PRICE}냥/개</p>
    <div className="mt-4 rounded-lg border border-edge/20 p-3">
      <p className="text-sm text-paper">서버 검증 채집 (20분)</p>
      <p className="mt-1 text-xs text-paper/65">채집한 물품을 매입해 씨앗을 살 수 있습니다. 결과와 시간은 서버가 결정합니다.</p>
      <button type="button" className="flat-btn mt-2 text-xs disabled:opacity-40" disabled={economy.busy || (!!gathering && !ready)} onClick={() => make(gathering ? 'gather/claim' : 'gather/start', gathering ? {} : { spotId: 'garden' })}>
        {gathering ? ready ? '채집물 수령' : `채집 대기 ${timeLeft(gathering.readyAt - now)}` : '채집 시작'}
      </button>
      {Object.entries(NPC_BUY_PRICES).filter(([id]) => inv[id] > 0).map(([id, price]) =>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" key={id}>
          <span>{itemOf(id)?.name ?? id} ×{inv[id]} · {price}냥/개</span>
          <button type="button" disabled={economy.busy} className="flat-btn !py-1 text-xs disabled:opacity-40" onClick={() => make('npc/sell', { item: id, qty: Math.min(inv[id], 99) })}>매입</button>
        </div>)}
    </div>
    {shop ? <div className="mt-3 grid gap-2 sm:grid-cols-2" data-verified-seed-shop>
      {allSeeds.map((seed) => <div className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 p-3" key={seed.id}>
        <span className="text-xs text-paper">{seed.name} · {SEED_PRICE}냥 <span className="text-paper/50">(보유 {inv[seed.id] ?? 0})</span></span>
        <button type="button" className="flat-btn !py-1 text-xs disabled:opacity-40" disabled={economy.busy || wallet.money < SEED_PRICE} onClick={() => make('garden/buy', { seedId: seed.id, qty: 1 })}>구매</button>
      </div>)}
    </div> : <>
      <p className="mt-4 text-xs text-paper/65">5칸 · 성장 시간 1시간 · 직접 수확 · 서버 시간 적용</p>
      <fieldset className="mt-2 flex flex-wrap gap-2 text-xs"><legend className="mb-1 text-paper/70">심을 씨앗</legend>
        {GARDEN_CROPS.map((crop) => <button type="button" aria-pressed={seedId === crop.seedId} onClick={() => setSeedId(crop.seedId)} key={crop.seedId} className={`rounded border px-2 py-1 ${seedId === crop.seedId ? 'border-gold text-gold' : 'border-edge/30 text-paper/65'}`}>{crop.name} ×{inv[crop.seedId] ?? 0}</button>)}
      </fieldset>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" data-verified-plots>
        {plots.map((plot, i) => {
          const crop = plot && GARDEN_CROPS.find((c) => c.seedId === plot.seedId)
          const ripe = plot && now >= plot.plantedAt + GARDEN_GROW_MS
          return <div className="flex min-h-36 flex-col items-center gap-2 rounded border border-edge/25 bg-shade/20 p-2 text-center" key={i} data-verified-plot={i}>
            <span className="text-xs text-paper/55">{i + 1}번 밭</span>
            <span className="flex-1 text-sm text-paper">{plot ? `${crop?.name ?? '작물'} 성장 중` : '빈 밭'}</span>
            {plot && <span className="text-xs text-paper/65">{ripe ? '수확 가능' : timeLeft(plot.plantedAt + GARDEN_GROW_MS - now)}</span>}
            <button type="button" className="flat-btn w-full justify-center !px-1 !py-1 text-xs disabled:opacity-40" disabled={economy.busy || (plot ? !ripe : !(inv[seedId] > 0))} onClick={() => make(plot ? 'garden/harvest' : 'garden/plant', plot ? { slot: i } : { slot: i, seedId })}>{plot ? '수확' : '심기'}</button>
          </div>
        })}
      </div>
    </>}
    {economy.message && <p role="status" className="mt-3 text-xs text-gold">{economy.message}</p>}
  </section>
}
