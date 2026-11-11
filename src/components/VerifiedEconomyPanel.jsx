import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Store, Sprout, Hammer, Gift, Coins } from 'lucide-react'
import { ITEMS, itemOf } from '../game/items'
import { RECIPES } from '../game/crafting'
import { COOK_RECIPES } from '../game/cooking'
import { getVerifiedWallet, getVerifiedMarket, verifiedEconomyAction } from '../net/online'
import { NPC_BUY_PRICES } from '../game/verifiedEconomyRules'

const fmt = (n) => Number(n ?? 0).toLocaleString('ko-KR')
const itemName = (id) => itemOf(id)?.name ?? id
const ERROR_TEXT = {
  'not-connected': '온라인 서버에 다시 연결한 뒤 시도해 주세요.',
  'insufficient-items': '서버 보관 재고가 부족합니다.',
  'insufficient-money': '검증된 거래 잔액이 부족합니다.',
  'inventory-full': '서버 소지품 30칸이 가득 찼습니다.',
  'gather-already-active': '이미 검증 채집을 진행하고 있습니다.',
  'gather-not-ready': '아직 채집이 끝나지 않았습니다.',
  'gather-not-active': '수령할 채집이 없습니다.',
  'unknown-recipe': '존재하지 않는 제작법입니다.',
  'npc-not-buying': '매입하지 않는 물품입니다.',
  'no-target': '가입된 수신 계정이 없습니다.',
  'gift-gone': '이미 수령했거나 존재하지 않는 선물입니다.',
  'gone': '해당 매물이 더는 존재하지 않습니다.',
  'request-id-conflict': '이전에 사용한 요청 식별자와 내용이 다릅니다.',
  'verified-economy-not-activated': '거래 기능은 현재 점검 중입니다.',
  'network': '네트워크 연결이 불안정합니다. 상태를 새로 확인해 주세요.',
}

const MAX_PRICE = 99999
const clamp = (s, cap) => Math.min(cap, Math.max(1, Number.parseInt(s, 10) || 1))

/** 검증 장부와 레거시 게임 인벤토리를 섞지 않는 독립 거래 화면. */
export default function VerifiedEconomyPanel() {
  const [wallet, setWallet] = useState(null)
  const [listings, setListings] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState('gather')
  const [now, setNow] = useState(Date.now)
  const [sellItem, setSellItem] = useState('')
  const [sellQty, setSellQty] = useState('1')
  const [sellPrice, setSellPrice] = useState('1')
  const [npcItem, setNpcItem] = useState('')
  const [npcQty, setNpcQty] = useState('1')
  const [craftId, setCraftId] = useState('')
  const [craftQty, setCraftQty] = useState('1')
  const [recipient, setRecipient] = useState('')
  const [giftItem, setGiftItem] = useState('')
  const [giftQty, setGiftQty] = useState('1')
  const [giftNote, setGiftNote] = useState('')
  const pending = useRef(null)

  const refresh = useCallback(async () => {
    const [w, m] = await Promise.all([getVerifiedWallet(), getVerifiedMarket()])
    if (w.ok) setWallet(w.wallet)
    if (m.ok) setListings(m.listings ?? [])
    if (!w.ok || !m.ok) setNotice('서버 장부 정보를 일부 불러오지 못했습니다.')
  }, [])
  useEffect(() => {
    refresh()
    const handle = setInterval(refresh, 20000)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(handle); clearInterval(clock) }
  }, [refresh])

  const run = async (route, payload = {}) => {
    if (busy) return
    setBusy(true)
    const identity = JSON.stringify([route, payload])
    if (pending.current?.identity !== identity) pending.current = { identity, requestId: crypto.randomUUID() }
    const response = await verifiedEconomyAction(route, { ...payload, requestId: pending.current.requestId })
    // 네트워크가 끊긴 경우 같은 키로 안전하게 재시도한다.
    if (response.status !== 0) pending.current = null
    setBusy(false)
    setNotice(response.ok ? (response.text || '서버 장부에 반영했습니다.') : (ERROR_TEXT[response.error] || `처리하지 못했습니다. (${response.error ?? response.status})`))
    await refresh()
  }

  if (!wallet) return <section aria-label="검증 장터"><h2 className="font-serif text-2xl text-gold">검증 장터</h2><p className="mt-3 text-sm text-paper/70">서버 거래 장부를 불러오는 중입니다.</p>{notice && <p role="status" className="text-crimson">{notice}</p>}</section>

  const owned = ITEMS.filter((it) => (wallet.inventory?.[it.id] ?? 0) > 0 && !it.id.includes('#'))
  const listedItem = owned.find((it) => it.id === sellItem) ?? owned[0]
  const npcItems = Object.keys(NPC_BUY_PRICES).filter((id) => (wallet.inventory?.[id] ?? 0) > 0)
  const npcSelected = npcItems.includes(npcItem) ? npcItem : npcItems[0]
  const recipes = [...RECIPES, ...COOK_RECIPES]
    .filter((r) => r.inputs.every(([id, qty]) => (wallet.inventory?.[id] ?? 0) >= qty))
  const recipe = recipes.find((r) => r.id === craftId) ?? recipes[0]
  const giftSelected = owned.some((it) => it.id === giftItem) ? giftItem : owned[0]?.id
  const gather = wallet.gathering
  const seconds = gather ? Math.max(0, Math.ceil((gather.readyAt - now) / 1000)) : 0
  const gatherTime = `${Math.floor(seconds / 3600)}시간 ${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}분 ${String(seconds % 60).padStart(2, '0')}초`

  return <section aria-label="검증 장터" data-verified-economy>
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold"><Store size={22}/> 검증 장터</h2>
      <button type="button" className="flat-btn text-xs" onClick={refresh} aria-label="거래 장부 새로고침"><RefreshCw size={14}/> 새로고침</button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-paper/65">이 장터에서는 <strong>서버가 직접 검증한 재화와 물품만</strong> 거래합니다. 이전 버전의 캐릭터 소지품·냥과 별도이며 자동 이전되지 않습니다. 기존 게임 제작·채집과 이곳의 검증 활동은 구분됩니다.</p>
    <div className="mt-3 flex flex-wrap gap-3 rounded-xl border border-edge/20 bg-edge/[0.06] p-3 text-sm">
      <span><Coins size={14} className="mr-1 inline text-gold"/> 검증 소지금 <b className="text-gold">{fmt(wallet.money)}냥</b></span>
      <span>정산 대기 <b className="text-gold">{fmt(wallet.pendingMoney)}냥</b></span>
      <span>서버 재고 <b>{owned.length}종</b></span>
      <button type="button" disabled={busy || !wallet.pendingMoney} className="flat-btn !py-1 text-xs disabled:opacity-40" onClick={() => run('market/claim')}>판매대금 받기</button>
    </div>
    {notice && <p role="status" className="mt-3 rounded-lg bg-gold-fill/15 p-3 text-sm text-gold">{notice}</p>}
    <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="거래 장부 메뉴">
      {[['gather', '채집·매입'], ['craft', '제작·조리'], ['market', '벼룩시장'], ['gift', '선물·수령']].map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-lg border px-3 py-1.5 text-xs ${tab === id ? 'border-gold/60 bg-gold/15 text-gold' : 'border-edge/25 text-paper/65'}`}>{label}</button>)}
    </div>
    {tab === 'gather' && <div className="mt-4 space-y-4" role="tabpanel">
      <div className="ink-panel rounded-xl p-4">
        <h3 className="flex items-center gap-2 font-serif text-lg text-gold"><Sprout size={17}/> 텃밭 검증 채집</h3>
        <p className="mt-1 text-xs text-paper/60">서버 시각으로 20분이 지나야 수령할 수 있습니다. 진행 상태는 재로그인해도 유지됩니다.</p>
        {gather ? <><p className="mt-3 text-sm text-paper">{seconds ? `남은 시간 ${gatherTime}` : '채집이 끝났습니다. 물품을 수령하세요.'}</p>
          <button type="button" disabled={busy || !!seconds} className="flat-btn mt-2 text-xs disabled:opacity-40" onClick={() => run('gather/claim')}>채집물 수령</button></>
          : <button type="button" disabled={busy} className="flat-btn mt-3 text-xs" onClick={() => run('gather/start', { spotId: 'garden' })}>20분 채집 시작</button>}
      </div>
      <div className="ink-panel rounded-xl p-4">
        <h3 className="font-serif text-lg text-gold">교내 매입</h3>
        <p className="mt-1 text-xs text-paper/60">서버에서 고정한 가격으로만 매입합니다. 클라이언트는 매입 금액을 지정할 수 없습니다.</p>
        {npcItems.length ? <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="매입 물품" value={npcSelected} onChange={(e) => setNpcItem(e.target.value)} className="rounded bg-shade/50 p-2 text-sm text-paper">{npcItems.map((id) => <option value={id} key={id}>{itemName(id)} · {NPC_BUY_PRICES[id]}냥/개 · 보유 {wallet.inventory[id]}</option>)}</select>
          <input aria-label="매입 수량" inputMode="numeric" className="w-20 rounded bg-shade/50 p-2 text-sm text-paper" value={npcQty} onChange={(e) => setNpcQty(e.target.value.replace(/\D/g, '').slice(0, 2))}/>
          <button disabled={busy} type="button" className="flat-btn text-xs" onClick={() => run('npc/sell', { item: npcSelected, qty: clamp(npcQty, Math.min(99, wallet.inventory[npcSelected])) })}>매입하기</button>
        </div> : <p className="mt-3 text-sm text-paper/60">매입할 검증 물품이 없습니다.</p>}
      </div>
    </div>}
    {tab === 'craft' && <div className="ink-panel mt-4 rounded-xl p-4" role="tabpanel">
      <h3 className="flex items-center gap-2 font-serif text-lg text-gold"><Hammer size={17}/> 서버 검증 제작·조리</h3>
      <p className="mt-1 text-xs text-paper/60">서버 재고에서 재료를 소비하고 즉시 완성합니다. 만들 수 있는 제작법만 표시합니다.</p>
      {recipes.length ? <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="검증 제작법" value={recipe.id} onChange={(e) => setCraftId(e.target.value)} className="max-w-full rounded bg-shade/50 p-2 text-sm text-paper">
          {recipes.map((r) => <option value={r.id} key={r.id}>{itemName(r.result)} ({r.inputs.map(([id, qty]) => `${itemName(id)} ${qty}`).join(' + ')})</option>)}
        </select>
        <input aria-label="제작 수량" className="w-20 rounded bg-shade/50 p-2 text-sm text-paper" inputMode="numeric" value={craftQty} onChange={(e) => setCraftQty(e.target.value.replace(/\D/g, '').slice(0, 2))}/>
        <button type="button" className="flat-btn text-xs" disabled={busy} onClick={() => run('craft', { recipeId: recipe.id, qty: clamp(craftQty, 99) })}>제작/조리</button>
      </div> : <p className="mt-3 text-sm text-paper/60">아직 만들 수 있는 제작법이 없습니다.</p>}
    </div>}
    {tab === 'market' && <div className="mt-4 space-y-4" role="tabpanel">
      <div className="ink-panel rounded-xl p-4"><h3 className="font-serif text-lg text-gold">검증 매물</h3>
        {listings.length === 0 ? <p className="mt-2 text-sm text-paper/60">등록된 매물이 없습니다.</p> : <ul className="mt-3 space-y-2">{listings.map((l) =>
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-shade/25 px-3 py-2 text-sm"><span className="flex-1">{itemName(l.item)} ×{l.qty} · <b>{fmt(l.total)}냥</b>{l.mine ? ' (내 매물)' : ''}</span>
            <button type="button" disabled={busy || (!l.mine && wallet.money < l.total)} className="flat-btn !py-1 text-xs disabled:opacity-40" onClick={() => run(l.mine ? 'market/cancel' : 'market/buy', { listing: l.id })}>{l.mine ? '등록 취소' : '구매'}</button></li>)}</ul>}
      </div>
      <div className="ink-panel rounded-xl p-4"><h3 className="font-serif text-lg text-gold">검증 물품 등록</h3>
        {owned.length ? <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="등록할 물품" value={listedItem.id} onChange={(e) => setSellItem(e.target.value)} className="rounded bg-shade/50 p-2 text-sm text-paper">{owned.map((it) => <option key={it.id} value={it.id}>{it.name} ({wallet.inventory[it.id]}개)</option>)}</select>
          <input aria-label="판매 수량" className="w-20 rounded bg-shade/50 p-2 text-sm text-paper" inputMode="numeric" value={sellQty} onChange={(e) => setSellQty(e.target.value.replace(/\D/g, '').slice(0, 2))}/>
          <input aria-label="개당 가격" className="w-24 rounded bg-shade/50 p-2 text-sm text-paper" inputMode="numeric" value={sellPrice} onChange={(e) => setSellPrice(e.target.value.replace(/\D/g, '').slice(0, 5))}/>
          <button type="button" disabled={busy} className="flat-btn text-xs" onClick={() => run('market/list', { item: listedItem.id, qty: clamp(sellQty, Math.min(99, wallet.inventory[listedItem.id])), price: clamp(sellPrice, MAX_PRICE) })}>매물 등록</button>
        </div> : <p className="mt-2 text-sm text-paper/60">등록할 검증 재고가 없습니다.</p>}
      </div>
    </div>}
    {tab === 'gift' && <div className="mt-4 space-y-4" role="tabpanel">
      <div className="ink-panel rounded-xl p-4"><h3 className="flex items-center gap-2 font-serif text-lg text-gold"><Gift size={17}/> 검증 선물 보내기</h3>
        <p className="mt-1 text-xs text-paper/60">상대 계정 ID를 입력합니다. 서버 보관함에 물품이 전달되며 기존 캐릭터 소지품에서 차감되지 않습니다.</p>
        {owned.length ? <div className="mt-3 flex flex-wrap gap-2">
          <input aria-label="받는 계정 ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="계정 ID" className="w-40 rounded bg-shade/50 p-2 text-sm text-paper"/>
          <select aria-label="선물할 물품" value={giftSelected} onChange={(e) => setGiftItem(e.target.value)} className="rounded bg-shade/50 p-2 text-sm text-paper">{owned.map((it) => <option key={it.id} value={it.id}>{it.name} ({wallet.inventory[it.id]})</option>)}</select>
          <input aria-label="선물 수량" inputMode="numeric" value={giftQty} onChange={(e) => setGiftQty(e.target.value.replace(/\D/g, '').slice(0, 1))} className="w-16 rounded bg-shade/50 p-2 text-sm text-paper"/>
          <input aria-label="선물 쪽지" value={giftNote} onChange={(e) => setGiftNote(e.target.value.slice(0, 1000))} placeholder="쪽지 (선택)" className="w-36 rounded bg-shade/50 p-2 text-sm text-paper"/>
          <button type="button" disabled={busy || !recipient.trim()} className="flat-btn text-xs" onClick={() => run('gift', { to: recipient.trim(), items: { [giftSelected]: clamp(giftQty, Math.min(5, wallet.inventory[giftSelected])) }, note: giftNote.trim() })}>보내기</button>
        </div> : <p className="mt-2 text-sm text-paper/60">선물할 검증 물품이 없습니다.</p>}
      </div>
      <div className="ink-panel rounded-xl p-4"><h3 className="font-serif text-lg text-gold">검증 선물 보관함</h3>
        {wallet.inbox?.length ? <ul className="mt-3 space-y-2">{wallet.inbox.map((gift) => <li key={gift.id} className="flex flex-wrap items-center gap-2 rounded bg-shade/25 p-2 text-sm"><span className="flex-1">{gift.from}님: {Object.entries(gift.items).map(([id, qty]) => `${itemName(id)} ×${qty}`).join(', ')} {gift.note ? `· ${gift.note}` : ''}</span>
          <button type="button" disabled={busy} className="flat-btn !py-1 text-xs" onClick={() => run('gift/claim', { giftId: gift.id })}>수령</button></li>)}</ul> : <p className="mt-2 text-sm text-paper/60">도착한 검증 선물이 없습니다.</p>}
      </div>
    </div>}
    <div className="ink-panel mt-4 rounded-xl p-4">
      <h3 className="font-serif text-base text-gold">검증 소지품</h3>
      {owned.length ? <ul className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{owned.map((it) => <li key={it.id} className="rounded bg-shade/25 p-2">{it.name} ×{fmt(wallet.inventory[it.id])}</li>)}</ul> : <p className="mt-2 text-sm text-paper/60">아직 검증 재고가 없습니다.</p>}
    </div>
  </section>
}
