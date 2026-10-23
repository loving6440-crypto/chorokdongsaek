import { useEffect, useState } from 'react'
import { Shield, X } from 'lucide-react'
import { STAT_KEYS, STAT_META } from '../game/constants'

const num = (v, lo, hi, dec = false) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, dec ? n : Math.round(n)))
}

function Field({ id, label, value, onChange, min = 0, max = 9999 }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 px-3 py-1.5 text-sm text-paper/85" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-right text-sm tabular-nums text-paper outline-none focus:border-gold/50"
      />
    </label>
  )
}

/** 관리자 도구: 스탯 · 체력 · 영력 · 의지력을 마음대로 고친다. (소지금은 늘 무한) */
export default function AdminPanel({ player, onApply, onClose }) {
  const [v, setV] = useState(() => ({
    ...Object.fromEntries(STAT_KEYS.map((k) => [k, player.stats[k]])),
    hp: Math.floor(player.hp),
    hpMax: player.hpMax,
    mp: Math.floor(player.mp),
    mpMax: player.mpMax,
    spirit: Math.floor(player.spirit),
  }))
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }))

  const apply = () => {
    const hpMax = num(v.hpMax, 1, 9999)
    const mpMax = num(v.mpMax, 1, 9999)
    onApply({
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, num(v[k], 1, 999)])),
      hpMax,
      mpMax,
      hp: num(v.hp, 0, hpMax),
      mp: num(v.mp, 0, mpMax),
      spirit: num(v.spirit, 0, 9999999),
    })
    onClose()
  }
  const fill = () => setV((p) => ({ ...p, hp: num(p.hpMax, 1, 9999), mp: num(p.mpMax, 1, 9999) }))

  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="관리자 도구" className="ink-panel flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Shield size={18} aria-hidden />
            관리자 도구
          </h2>
          <button type="button" onClick={onClose} aria-label="관리자 도구 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <p className="text-[11px] text-paper/55">소지금은 무한이다. 아래 수치는 [적용]을 눌러야 바뀐다. 관리자 계정은 랭킹에 오르지 않는다.</p>
          <section>
            <p className="mb-1.5 text-xs tracking-widest text-paper/55">육조 스탯 (1~999)</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {STAT_KEYS.map((k) => (
                <Field key={k} id={`adm-${k}`} label={STAT_META[k].label} value={v[k]} onChange={set(k)} min={1} max={999} />
              ))}
            </div>
          </section>
          <section>
            <p className="mb-1.5 text-xs tracking-widest text-paper/55">체력 · 영력 · 의지력</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <Field id="adm-hp" label="체력" value={v.hp} onChange={set('hp')} />
              <Field id="adm-hpMax" label="체력 최대" value={v.hpMax} onChange={set('hpMax')} min={1} />
              <Field id="adm-mp" label="의지력" value={v.mp} onChange={set('mp')} />
              <Field id="adm-mpMax" label="의지력 최대" value={v.mpMax} onChange={set('mpMax')} min={1} />
              <Field id="adm-spirit" label="영력" value={v.spirit} onChange={set('spirit')} max={9999999} />
            </div>
            <button type="button" onClick={fill} className="mt-2 rounded border border-edge/25 px-3 py-1 text-xs text-paper/80 hover:bg-edge/10">
              체력·의지력 가득 채우기
            </button>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-edge/15 px-4 py-3">
          <button type="button" onClick={onClose} className="flat-btn-ghost">
            취소
          </button>
          <button type="button" onClick={apply} className="flat-btn">
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
