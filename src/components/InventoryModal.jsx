import { useEffect, useState } from 'react'
import { Backpack, X } from 'lucide-react'
import { STAT_META } from '../game/constants'
import { ENH_STATS, EQUIP_SLOTS, canUseItem, countOf, enhLevel, enhTotal, equipOf, isGear, isMaterial, itemOf, ownedItems, specialTitleOf } from '../game/items'
import ItemIcon from './ItemIcon'
import { INVENTORY_SLOTS, countSlots, inventoryStacks, maxStack, capacityFor } from '../game/inventoryCapacity'

/** 소지품 팝업. 위에는 착용 장비(무구/신체/장신구), 아래는 가진 물건 타일. 타일을 누르면 설명과 사용·착용 팝업이 뜬다. X 로 닫는다. */
export default function InventoryModal({ player, inBattle, reviveOn, boostOn, onUse, onDiscard, onEquip, onUnequip, onClaimPending, partyMates = [], partyBattle = false, onClose }) {
  const [sel, setSel] = useState(null) // 아이템 id
  const [slotSel, setSlotSel] = useState(null) // 착용 중인 부위 id
  const [targeting, setTargeting] = useState(false) // 마이쭈: 누구에게 줄까
  const [err, setErr] = useState('')
  const [discardQty, setDiscardQty] = useState(1)
  const [selectedStack, setSelectedStack] = useState(null)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const closeAll = () => {
    setSel(null)
    setSlotSel(null)
    setTargeting(false)
    setErr('')
    setDiscardQty(1)
    setSelectedStack(null)
    setDiscardConfirm(false)
  }
  const popupOpen = !!(sel || slotSel)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (popupOpen) closeAll()
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, popupOpen])
  const owned = ownedItems(player)
  const stacks = owned.flatMap(item => inventoryStacks({ [item.id]: countOf(player, item.id) }).map(stack => ({ item, ...stack })))
  const eq = equipOf(player)
  const picked = sel ? owned.find((i) => i.id === sel) : null
  const ownedCount = picked ? countOf(player, picked.id) : 0
  const pn = picked ? Math.min(ownedCount, selectedStack?.id === picked.id ? selectedStack.quantity : ownedCount) : 0
  const pu = picked ? canUseItem(picked, { inBattle, isParty: partyBattle, countNow: ownedCount, reviveOn, boostOn }) : null
  const slotItem = slotSel && eq[slotSel] ? itemOf(eq[slotSel]) : null
  const shown = picked ?? slotItem
  const displayName = (item) => item ? `${specialTitleOf(player, item.id)}${item.name}` : ''
  // 마이쭈(boost)·쌍쌍바(giveHp): 누구에게 줄지 고르는 아이템.
  const chewyTarget = (picked?.effect?.boost || picked?.effect?.giveHp) && inBattle

  const doEquip = () => {
    const r = onEquip?.(picked.id)
    if (r?.error) setErr(r.error)
    else closeAll()
  }
  const doUnequip = () => {
    const r = onUnequip?.(slotSel)
    if (r?.error) setErr(r.error)
    else closeAll()
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="소지품"
        className="ink-panel relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-20 flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Backpack size={18} aria-hidden />
            소지품
            <span className="font-sans text-xs font-normal text-paper/60" data-inventory-slots>{countSlots(player.inventory)} / {INVENTORY_SLOTS}칸</span>
            <span className="font-sans text-xs font-normal text-paper/60">{Math.floor(player.money)}냥</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="소지품 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <p className="text-[11px] tracking-widest text-paper/55">착용 장비</p>
          <ul className="mt-2 grid grid-cols-3 gap-2" aria-label="착용 장비">
            {EQUIP_SLOTS.map((slot) => {
              const it = eq[slot.id] ? itemOf(eq[slot.id]) : null
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    data-slot={slot.id}
                    disabled={!it}
                    onClick={() => {
                      setErr('')
                      setSlotSel(slot.id)
                    }}
                    aria-label={`${slot.label}: ${it ? displayName(it) : '비어 있음'}`}
                    className="tilt flex w-full flex-col items-center gap-1 rounded-xl border border-edge/20 bg-shade/20 p-2 enabled:hover:bg-gold-fill/15 disabled:opacity-60"
                  >
                    <span className="text-[10px] text-paper/55">{slot.label}</span>
                    {it ? <ItemIcon item={it} size={36} className="shrink-0" /> : <span className="grid size-9 place-items-center rounded-full border-2 border-dashed border-edge/25 text-xs text-paper/30">—</span>}
                    <span className="w-full truncate text-center text-[11px] text-paper">{it ? displayName(it) : '비어 있음'}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 text-[11px] tracking-widest text-paper/55">가진 물건</p>
          {owned.length === 0 && <p className="mt-2 text-xs text-paper/50">가진 물건이 없다. 기숙사 매점에서 살 수 있다.</p>}
          <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="가진 물건">
              {stacks.map(({ item, ...stack }) => (
                <li key={`${item.id}:${stack.index}`}>
                  <button
                    type="button"
                    data-item={item.id}
                    onClick={() => {
                      setErr('')
                      setTargeting(false)
                      setSel(item.id)
                      setSelectedStack(stack)
                      setDiscardQty(1)
                    }}
                    aria-label={item.slot === 'weapon' ? `${displayName(item)}${enhTotal(player, item.id) > 0 ? ` +${enhTotal(player, item.id)}` : ''}` : `${displayName(item)} ×${stack.quantity}`}
                    className="tilt flex w-full flex-col items-center gap-1 rounded-xl bg-edge/[0.07] p-2 hover:bg-gold-fill/15"
                  >
                    <ItemIcon item={item} size={40} className="shrink-0" />
                    <span className="w-full truncate text-center text-[11px] text-paper">{displayName(item)}</span>
                    <span className="text-[11px] text-gold">{item.slot === 'weapon' ? (enhTotal(player, item.id) > 0 ? `+${enhTotal(player, item.id)}` : '') : `×${stack.quantity}`}</span>
                  </button>
                </li>
              ))}
              {Array.from({ length: Math.max(0, INVENTORY_SLOTS - stacks.length) }, (_, i) => (
                <li key={`empty:${i}`} aria-hidden="true" className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-edge/15 bg-shade/10 text-xs text-paper/20">—</li>
              ))}
          </ul>
          {!inBattle && Object.values(player.pendingInventory ?? {}).some(n => n > 0) && (
            <section className="mt-3 rounded-lg border border-gold/40 p-3" aria-label="수령 대기 물품">
              <p className="text-xs font-semibold text-gold">수령 대기 물품 (빈 소지품 칸이 생기면 수령 가능)</p>
              {Object.entries(player.pendingInventory).filter(([, n]) => n > 0).map(([id, n]) => (
                <div key={id} className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-paper">{itemOf(id)?.name ?? id} ×{n}</span>
                  <button type="button" className="flat-btn-ghost text-xs disabled:opacity-40" disabled={!capacityFor(player.inventory, id)} onClick={() => onClaimPending?.(id, Math.min(n, maxStack(id), capacityFor(player.inventory, id)))}>최대 {Math.min(n, maxStack(id), capacityFor(player.inventory, id))}개 수령</button>
                </div>
              ))}
            </section>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-paper/50">
            전투 중에는 전투 사용 가능 아이템만 쓸 수 있다. #턴소모無는 다른 사람 턴에도 사용할 수 있고, #턴소모有는 본인 턴에 사용하면 턴이 종료된다. 장비는 전투 중 교체할 수 없다.
          </p>
        </div>
      {shown && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-auto bg-shade/60 p-4 pt-16" onClick={(e) => { e.stopPropagation(); closeAll() }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={displayName(shown)}
            data-item-popup={shown.id}
            className="ink-panel w-full max-w-xs rounded-xl p-4 shadow-2xl ring-1 ring-edge/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ItemIcon item={shown} size={44} className="shrink-0" />
              <p className="font-serif text-base text-paper">
                {displayName(shown)} {picked && <span className="text-sm text-gold">×{pn}</span>}
                {slotItem && <span className="ml-1 text-xs text-gold">(착용 중)</span>}
              </p>
            </div>
            <p className="mt-2 flex flex-wrap gap-1">
              {(shown.tags ?? []).map((t) => (
                <span key={t} className="rounded-full border border-edge/25 px-1.5 py-px text-[10px] text-paper/60">{t}</span>
              ))}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-paper/75">{shown.desc}</p>
            {shown.effectText && <p className="mt-1 text-xs leading-relaxed text-gold">{shown.effectText}</p>}
            {shown.slot === 'weapon' && enhTotal(player, shown.id) > 0 && (
              <p className="mt-1 text-[11px] leading-relaxed text-paper/70" data-enh-summary>
                강화: {ENH_STATS.filter((s) => enhLevel(player, shown.id, s) > 0).map((s) => `${STAT_META[s].label} +${enhLevel(player, shown.id, s)}`).join(' · ')}
              </p>
            )}
            {picked && !pu.ok && !isMaterial(picked) && !isGear(picked) && <p className="mt-1 text-[11px] text-paper/45">{pu.why}</p>}
            {err && <p className="mt-1 text-[11px] text-crimson" role="alert">{err}</p>}

            {discardConfirm && picked && <div className="mt-3 rounded-lg border border-crimson/40 p-3 text-xs"><p>정말 {displayName(picked)} {discardQty}개를 버리겠습니까? 되돌릴 수 없습니다.</p><div className="mt-2 flex gap-2"><button type="button" className="flat-btn-ghost text-xs" onClick={() => setDiscardConfirm(false)}>취소</button><button type="button" className="flat-btn text-xs" onClick={() => { const r = onDiscard?.(picked.id, discardQty); if (r?.error) setErr(r.error); else closeAll() }}>버리기 확정</button></div></div>}
            {targeting && chewyTarget ? (
              <div className="mt-3" data-chewy-targets>
                <p className="text-xs text-paper/80">누구에게 줄까?</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    data-target="self"
                    onClick={() => {
                      onUse(picked.id, 'self')
                      setTargeting(false)
                    }}
                    className="flat-btn !py-1 text-xs"
                  >
                    나 (자신)
                  </button>
                  {partyMates.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      data-target={m.id}
                      disabled={!partyBattle}
                      title={partyBattle ? undefined : '파티 전투(다인 전투) 중에만 건넬 수 있다'}
                      onClick={() => {
                        onUse(picked.id, m.id)
                        setTargeting(false)
                      }}
                      className="flat-btn !py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                {partyMates.length > 0 && !partyBattle && <p className="mt-1 text-[10px] text-paper/45">파티원에게 건네는 건 다인 전투 중에만 쓸 수 있다.</p>}
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {picked && !isMaterial(picked) && !isGear(picked) && (
                  <button
                    type="button"
                    disabled={!pu.ok}
                    onClick={() => (chewyTarget ? setTargeting(true) : onUse(picked.id))}
                    className="flat-btn !py-1 text-xs disabled:opacity-40"
                  >
                    {chewyTarget ? '건네기' : '사용'}
                  </button>
                )}
                {picked && isGear(picked) && (
                  <button type="button" disabled={inBattle} onClick={doEquip} className="flat-btn !py-1 text-xs disabled:opacity-40" data-equip>
                    착용
                  </button>
                )}
                {slotItem && (
                  <button type="button" disabled={inBattle || slotSel === 'body'} onClick={doUnequip} className="flat-btn !py-1 text-xs disabled:opacity-40" data-unequip>
                    벗기
                  </button>
                )}
                {picked && !inBattle && <><label className="flex items-center gap-1 text-xs text-paper/70">수량 <input aria-label="버릴 수량" type="number" min="1" max={pn} value={discardQty} onChange={e => setDiscardQty(Math.max(1, Math.min(pn, Math.floor(Number(e.target.value) || 1))))} className="w-14 rounded border border-edge/30 bg-shade px-1 py-1 text-paper" /></label><button type="button" onClick={() => setDiscardConfirm(true)} className="flat-btn-ghost !py-1 text-xs">버리기</button></>}
                <button type="button" onClick={closeAll} className="rounded-lg bg-edge/10 px-3 py-1 text-xs text-paper/80 hover:bg-edge/20">
                  닫기
                </button>
              </div>
            )}
            {slotItem && slotSel === 'body' && <p className="mt-2 text-[10px] text-paper/45">신체 장비는 벗을 수 없다. 다른 옷을 착용하면 갈아입는다.</p>}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
