import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'
import { ARMORY, SHINAH } from '../../game/armory'
import { STAT_META } from '../../game/constants'
import { ENH_ITEMS, ENH_MAX, ENH_STATS, WEAPONS, countOf, enhLevel, enhTotal, equipOf, itemOf, ownedWeapons } from '../../game/items'
import NpcDialog from '../NpcDialog'

/** 산 탐색 › 무구보관소: 무구의 육조 스탯을 하나씩 +1 (스탯당 최대 +5). 재료는 현재 수치에 맞는 완성품. */
export default function Armory({ player, onEnhance, onMeet, admin, onAdminGive }) {
  const owned = ownedWeapons(player)
  // 같은 종류가 여럿이면 ①②… 로 구분한다.
  const nameOf = (w) => {
    const same = owned.filter((x) => x.baseId === w.baseId)
    return same.length > 1 ? `${w.name} ${'①②③④⑤⑥⑦⑧⑨⑩'[same.indexOf(w)] ?? same.indexOf(w) + 1}` : w.name
  }
  const [sel, setSel] = useState(null)
  const [msg, setMsg] = useState('')
  const cur = owned.find((w) => w.id === sel) ?? owned[0] ?? null
  const line = SHINAH.lines[0].text
  useEffect(() => { onMeet?.(SHINAH.id) }, [onMeet])

  const go = (stat) => {
    const r = onEnhance(cur.id, stat)
    setMsg(r?.error ? r.error : `${cur.name}의 ${STAT_META[stat].label}이(가) +${r.to}가 되었다.`)
  }

  return (
    <section aria-label={ARMORY.label} data-armory>
      <h2 className="font-serif text-2xl text-gold">{ARMORY.label}</h2>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-armory-desc>{ARMORY.desc}</p>
      </div>
      <NpcDialog npc={SHINAH.name} src={SHINAH.portrait} dataNpc="shinah">{line}</NpcDialog>

      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><Hammer size={12} aria-hidden />무구 강화</p>
        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-paper/70" data-armory-empty>강화할 무구가 없다. 무구를 갖고 있어야 한다.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="강화할 무구">
              {owned.map((w) => (
                <button key={w.id} type="button" role="tab" aria-selected={cur?.id === w.id} data-weapon={w.id}
                  onClick={() => { setSel(w.id); setMsg('') }}
                  className={`rounded-full px-3 py-1 text-xs ${cur?.id === w.id ? 'bg-gold-fill text-ink' : 'bg-shade/30 text-paper/80'}`}>
                  {nameOf(w)}{equipOf(player).weapon === w.id && ' (착용)'}{enhTotal(player, w.id) > 0 && ` +${enhTotal(player, w.id)}`}
                </button>
              ))}
            </div>
            {cur && (
              <>
                <p className="mt-3 text-xs leading-relaxed text-paper/65">{cur.effectText}</p>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {ENH_STATS.map((s) => {
                    const lv = enhLevel(player, cur.id, s)
                    const max = lv >= ENH_MAX
                    const mat = max ? null : itemOf(ENH_ITEMS[lv])
                    const have = mat ? countOf(player, mat.id) : 0
                    return (
                      <li key={s} data-enh-stat={s} className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 px-3 py-2 text-sm">
                        <span className="text-paper/90">{STAT_META[s].label} <b className="text-gold" data-enh-lv>+{lv}</b>
                          <span className="block text-[10px] text-paper/50">{max ? '최대 강화' : `필요: ${mat.name} (${have}개 보유)`}</span>
                        </span>
                        <button type="button" disabled={max || (!admin && !have)} onClick={() => go(s)} className="flat-btn text-xs disabled:opacity-40">
                          {max ? 'MAX' : `+${lv + 1}`}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </>
        )}
        {msg && <p className="mt-3 text-sm text-gold" role="status" data-armory-msg>{msg}</p>}
      </div>

      {admin && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-armory-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 무구와 재료 받기</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...WEAPONS, ...ENH_ITEMS.map(itemOf)].map((it) => (
              <button key={it.id} type="button" data-give={it.id} onClick={() => onAdminGive(it.id)} className="rounded-full bg-shade/30 px-2.5 py-1 text-xs text-paper/85">{it.name} +1</button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
