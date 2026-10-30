import { useEffect, useState } from 'react'
import { Sprout, ShoppingBag, Warehouse, ArrowLeft } from 'lucide-react'
import { GARDEN_CROPS, GARDEN_GROW_MS, SEED_PRICE, gardenPlots, harvestReady } from '../../game/garden'
import { countOf } from '../../game/items'
import { countSlots, INVENTORY_SLOTS } from '../../game/inventoryCapacity'
import NpcDialog from '../NpcDialog'

const CROP_COLORS = ['#b77568', '#b58b65', '#7e9971', '#9f906e', '#91a37b', '#699680', '#9a8362']
const remainingText = ms => {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
function CropSprite({ crop, sprouted = false, size = 40 }) {
  const index = Math.max(0, GARDEN_CROPS.findIndex(c => c.id === crop.id))
  const body = CROP_COLORS[index]
  return <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${crop.name} ${sprouted ? '작물' : '씨앗'} 아이콘`} className="shrink-0" shapeRendering="crispEdges">
    <rect width="48" height="48" rx="4" fill="#e5dfce" />
    <rect x="5" y="32" width="38" height="7" fill="#77644e" />
    <rect x="10" y="39" width="28" height="4" fill="#a38b72" />
    {sprouted ? <>
      <rect x="22" y="16" width="4" height="18" fill="#667e55" />
      <rect x="12" y="14" width="11" height="7" fill="#738d65" />
      <rect x="26" y="9" width="11" height="9" fill="#7d9470" />
      <rect x="16" y="23" width="17" height="10" fill={body} />
      <rect x="20" y="26" width="9" height="5" fill="#d1b89d" opacity=".6" />
    </> : <>
      <rect x="20" y="26" width="8" height="8" fill={body} />
      <rect x="23" y="23" width="3" height="3" fill="#6d7b5b" />
    </>}
    <rect x="2" y="2" width="44" height="44" rx="3" fill="none" stroke="#9a947f" strokeWidth="2" />
  </svg>
}

export default function Garden({ player, onGardenAction, onMeet }) {
  const [mode, setMode] = useState(null) // 텃밭에 들어올 때마다 선택 화면부터
  const [seedId, setSeedId] = useState(GARDEN_CROPS[0].seedId)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (mode === 'shop') onMeet?.('shinyoung')
  }, [mode, onMeet])
  useEffect(() => {
    if (mode !== 'greenhouse') return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [mode])
  const plots = gardenPlots(player)
  const filled = plots.filter(Boolean).length
  const action = (type, data) => {
    const r = onGardenAction?.({ type, ...data })
    setMessage(r?.error ?? r?.message ?? '')
  }

  return <section aria-label="텃밭" className="ink-panel mt-4 rounded-xl p-4 sm:p-5" data-garden>
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 font-serif text-lg text-gold"><Sprout size={18}/>뒷산의 텃밭</h3>
      {mode && <button type="button" onClick={() => {setMode(null); setMessage('')}} className="flat-btn !py-1 text-xs"><ArrowLeft size={13}/> 텃밭 입구</button>}
    </div>
    {!mode && <>
      <p className="mt-2 text-sm text-paper/70">텃밭에서 무엇을 할까?</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" data-garden-shop onClick={() => {setMode('shop');setMessage('')}} className="rounded-lg border border-[#93876d]/60 bg-[#8e8468]/15 px-5 py-5 text-left hover:bg-[#8e8468]/25">
          <ShoppingBag size={22} className="text-gold"/><span className="mt-2 block font-serif text-base text-paper">씨앗 상점</span><span className="mt-1 block text-xs text-paper/60">강신영에게서 씨앗 구매</span>
        </button>
        <button type="button" data-garden-greenhouse onClick={() => {setMode('greenhouse');setMessage('');setNow(Date.now())}} className="rounded-lg border border-[#718775]/60 bg-[#718775]/15 px-5 py-5 text-left hover:bg-[#718775]/25">
          <Warehouse size={22} className="text-gold"/><span className="mt-2 block font-serif text-base text-paper">비닐하우스</span><span className="mt-1 block text-xs text-paper/60">5칸 재배·1시간 성장·직접 수확</span>
        </button>
      </div>
    </>}
    {mode === 'shop' && <>
      <NpcDialog npc="강신영" dataNpc="shinyoung" src="/shinyoung.svg">얘, 뭣하러 이 산속까지 왔니?</NpcDialog>
      <p className="mt-4 text-sm text-paper/70">보유 <b className="text-gold">{Math.floor(player.money ?? 0)}냥</b> · 씨앗 각 {SEED_PRICE}냥</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" data-garden-seed-shop>
        {GARDEN_CROPS.map(crop => <div key={crop.id} className="flex items-center gap-2 rounded-lg border border-edge/15 bg-edge/[0.04] p-3">
          <CropSprite crop={crop} size={44}/>
          <div className="min-w-0 flex-1"><p className="text-sm text-paper">{crop.name} 씨앗</p><p className="text-[11px] text-paper/60">보유 {countOf(player,crop.seedId)}개 · {SEED_PRICE}냥</p></div>
          <button type="button" className="flat-btn shrink-0 !py-1 text-xs disabled:opacity-40" disabled={player.money < SEED_PRICE} onClick={() => action('buy', {seedId:crop.seedId})} data-buy-seed={crop.seedId}>구매</button>
        </div>)}
      </div>
    </>}
    {mode === 'greenhouse' && <>
      <p className="mt-2 text-sm text-paper/70">5칸 중 <b className="text-gold">{filled}</b>칸에서 생명이 자라나고 있다. 성장 시간은 밖으로 나가도 계속 흐르며, 수확은 이곳에 직접 재방문해야 한다.</p>
      <p className="mt-1 text-xs text-paper/55">소지품 {countSlots(player.inventory)}/{INVENTORY_SLOTS}칸</p>
      <fieldset className="mt-3 rounded-lg border border-edge/15 p-3">
        <legend className="px-2 text-xs text-paper/70">심을 씨앗 선택</legend>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" role="group" aria-label="재배할 씨앗 선택">
          {GARDEN_CROPS.map(crop => <button key={crop.seedId} type="button" aria-pressed={seedId === crop.seedId} onClick={() => setSeedId(crop.seedId)} className={`flex flex-col items-center gap-1 rounded-md border p-1 text-[10px] ${seedId === crop.seedId ? 'border-gold bg-gold-fill/15 text-gold' : 'border-edge/20 text-paper/70'}`} data-seed-select={crop.seedId}>
            <CropSprite crop={crop} size={36}/><span>{crop.name}</span><span>×{countOf(player,crop.seedId)}</span>
          </button>)}
        </div>
      </fieldset>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" data-greenhouse-plots>
        {plots.map((plot, i) => {
          const crop = plot && GARDEN_CROPS.find(c => c.seedId === plot.seedId)
          const ready = harvestReady(plot,now)
          const chosen = GARDEN_CROPS.find(c=>c.seedId===seedId)
          return <div key={i} className="flex min-h-48 flex-col items-center rounded-lg border border-[#7a7565]/50 bg-[#81735d]/10 p-2 text-center" data-plot={i+1} data-plot-state={plot ? ready ? 'ready' : 'growing' : 'empty'}>
            <span className="text-xs text-paper/60">{i+1}번 밭</span>
            <div className="my-2 grid h-14 place-items-center"><CropSprite crop={crop??chosen} sprouted={!!plot} size={52}/></div>
            {plot ? <><b className="text-xs text-paper">{crop.name}</b><p className="mt-1 text-[11px] text-paper/65">{ready ? '수확 가능!' : remainingText(plot.plantedAt + GARDEN_GROW_MS - now)}</p><button type="button" disabled={!ready} onClick={() => action('harvest',{slot:i})} className="flat-btn mt-auto w-full justify-center !px-1 !py-1 text-xs disabled:opacity-40" data-harvest={i}>수확</button></>
            : <><span className="text-xs text-paper/60">빈 밭</span><button type="button" disabled={countOf(player,seedId)<1} onClick={() => action('plant',{slot:i,seedId})} className="flat-btn mt-auto w-full justify-center !px-1 !py-1 text-xs disabled:opacity-40" data-plant={i}>심기</button></>}
          </div>
        })}
      </div>
      <p className="mt-2 text-xs text-paper/55">빈 칸이 없으면 새 씨앗을 심을 수 없고, 소지품 30칸이 가득 차면 수확할 수 없다.</p>
    </>}
    {message && <p role="status" className="mt-3 rounded-md border border-edge/20 p-2 text-xs text-gold">{message}</p>}
  </section>
}
