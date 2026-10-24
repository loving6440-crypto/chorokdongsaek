import { useEffect, useState } from 'react'
import { Backpack, X } from 'lucide-react'
import { EQUIP_SLOTS, ITEMS, canUseItem, countOf, equipOf, isGear, isMaterial, itemOf } from '../game/items'
import ItemIcon from './ItemIcon'

/** 소지품 팝업. 위에는 착용 장비(무구/신체/장신구), 아래는 가진 물건 타일. 타일을 누르면 설명과 사용·착용 팝업이 뜬다. X 로 닫는다. */
export default function InventoryModal({ player, inBattle, reviveOn, boostOn, onUse, onEquip, onUnequip, partyMates = [], onClose }) {
  const [sel, setSel] = useState(null) // 아이템 id
  const [slotSel, setSlotSel] = useState(null) // 착용 중인 부위 id
  const [targeting, setTargeting] = useState(false) // 마이쭈: 누구에게 줄까
  const [err, setErr] = useState('')
  const closeAll = () => {
    setSel(null)
    setSlotSel(null)
    setTargeting(false)
    setErr('')
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
  const owned = ITEMS.filter((i) => countOf(player, i.id) > 0)
  const eq = equipOf(player)
  const picked = sel ? owned.find((i) => i.id === sel) : null
  const pn = picked ? countOf(player, picked.id) : 0
  const pu = picked ? canUseItem(picked, { inBattle, countNow: pn, reviveOn, boostOn }) : null
  const slotItem = slotSel && eq[slotSel] ? itemOf(eq[slotSel]) : null
  const shown = picked ?? slotItem
  const chewyTarget = picked?.effect?.boost && inBattle

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
                    aria-label={`${slot.label}: ${it ? it.name : '비어 있음'}`}
                    className="tilt flex w-full flex-col items-center gap-1 rounded-xl border border-edge/20 bg-shade/20 p-2 enabled:hover:bg-gold-fill/15 disabled:opacity-60"
                  >
                    <span className="text-[10px] text-paper/55">{slot.label}</span>
                    {it ? <ItemIcon item={it} size={36} className="shrink-0" /> : <span className="grid size-9 place-items-center rounded-full border-2 border-dashed border-edge/25 text-xs text-paper/30">—</span>}
                    <span className="w-full truncate text-center text-[11px] text-paper">{it ? it.name : '비어 있음'}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 text-[11px] tracking-widest text-paper/55">가진 물건</p>
          {owned.length === 0 ? (
            <p className="mt-2 rounded-xl border-2 border-dashed border-edge/20 p-6 text-center text-sm text-paper/55">
              가진 물건이 없다. 기숙사 매점에서 살 수 있다.
            </p>
          ) : (
            <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="가진 물건">
              {owned.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-item={item.id}
                    onClick={() => {
                      setErr('')
                      setTargeting(false)
                      setSel(item.id)
                    }}
                    aria-label={`${item.name} ×${countOf(player, item.id)}`}
                    className="tilt flex w-full flex-col items-center gap-1 rounded-xl bg-edge/[0.07] p-2 hover:bg-gold-fill/15"
                  >
                    <ItemIcon item={item} size={40} className="shrink-0" />
                    <span className="w-full truncate text-center text-[11px] text-paper">{item.name}</span>
                    <span className="text-[11px] text-gold">×{countOf(player, item.id)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-paper/50">
            전투 중에는 ‘전투 중 사용 가능’한 아이템만 쓸 수 있고, 턴과 상관없이 언제든 쓸 수 있으며 써도 내 턴이 끝나지 않는다. 장비는 전투 중에 바꿀 수 없다.
          </p>
        </div>
      {shown && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-auto bg-shade/60 p-4 pt-16" onClick={(e) => { e.stopPropagation(); closeAll() }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={shown.name}
            data-item-popup={shown.id}
            className="ink-panel w-full max-w-xs rounded-xl p-4 shadow-2xl ring-1 ring-edge/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ItemIcon item={shown} size={44} className="shrink-0" />
              <p className="font-serif text-base text-paper">
                {shown.name} {picked && <span className="text-sm text-gold">×{pn}</span>}
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
            {picked && !pu.ok && !isMaterial(picked) && !isGear(picked) && <p className="mt-1 text-[11px] text-paper/45">{pu.why}</p>}
            {err && <p className="mt-1 text-[11px] text-crimson" role="alert">{err}</p>}

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
                    <button key={m.id} type="button" disabled title="파티 전투는 준비 중이다" className="rounded-lg bg-edge/10 px-2.5 py-1 text-xs text-paper/45 disabled:cursor-not-allowed">
                      {m.name}
                    </button>
                  ))}
                </div>
                {partyMates.length > 0 && <p className="mt-1 text-[10px] text-paper/45">파티원에게 건네는 건 파티 전투가 열리면 쓸 수 있다.</p>}
              </div>
            ) : (
              <div className="mt-3 flex justify-end gap-2">
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
