import { useEffect, useState } from 'react'
import { Paras } from './Scene'
import { LOCATIONS } from '../game/constants'
import { itemOf } from '../game/items'
import { EXTRA_QUEST_DAYS, ITEM_UNIT, extraText, goalLine, rewardLine } from '../game/quests'

/**
 * v-B.18 엑스트라의 부탁: 본관 · 별관 · 뒷산 · 사당에 도착했을 때 가끔 뜬다.
 * [받아들인다] / [지나친다]. 그 자리에서 끝나는 부탁(의지력 · 물건)은 바로 보상까지, 나머지는 [의뢰]의 '받은 부탁'에 적힌다.
 */
export default function ExtraQuestModal({ enc, player, onAccept, onClose }) {
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && result && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, onClose])
  const where = LOCATIONS[enc.zone]?.name ?? ''
  const lacking = enc.kind === 'mp' ? (player.mp ?? 0) < enc.cost.mp : enc.kind === 'give' ? (player.inventory?.[enc.cost.item] || 0) < enc.cost.n : false
  const accept = () => {
    setErr('')
    const r = onAccept(enc)
    if (r?.error) return setErr(r.error)
    setResult({ text: r.text ?? extraText(enc, player, 'accept'), kind: r.instant ? 'instant' : 'quest' })
  }
  const decline = () => setResult({ text: extraText(enc, player, 'decline'), kind: 'declined' })
  const what =
    enc.kind === 'mp' ? `그 자리에서 돕는다 · 의지력 ${enc.cost.mp}`
      : enc.kind === 'give' ? `그 자리에서 건넨다 · ${itemOf(enc.cost.item)?.name ?? enc.cost.item} ${enc.cost.n}${ITEM_UNIT[enc.cost.item] ?? '개'}`
        : `${goalLine(enc.goal)} · ${EXTRA_QUEST_DAYS}일 안에 [의뢰]에서 건넨다`
  return (
    <div className="modal-scrim fixed inset-0 z-[90] grid place-items-center p-4" data-extra-quest={enc.tpl}>
      <div role="dialog" aria-modal="true" aria-label={`${where}에서 마주친 ${enc.who}`} className="ink-panel w-full max-w-md rounded-2xl p-5">
        <p className="text-[11px] tracking-widest text-gold">{where} · {enc.who}</p>
        <p className="mt-1 font-serif text-lg text-paper">{enc.title}</p>
        <div className="mt-3">
          <Paras list={[result ? result.text : extraText(enc, player, 'offer')]} />
        </div>
        {!result && (
          <>
            <div className="mt-3 rounded-xl bg-shade/25 px-3 py-2 text-xs leading-relaxed">
              <p className="text-paper/85">{what}</p>
              <p className="mt-0.5 text-paper/60">보상 {rewardLine(enc.reward)}</p>
              <p className="mt-0.5 text-[11px] text-paper/45" data-extra-daily>이런 부탁은 하루에 한 건만 받아들일 수 있다. 받아들이면 오늘은 더 마주치지 않는다.</p>
            </div>
            {err && <p className="mt-2 text-xs text-crimson" role="alert">{err}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="flat-chip" data-extra-decline onClick={decline}>지나친다</button>
              <button type="button" className="flat-btn" data-extra-accept disabled={lacking} onClick={accept}>받아들인다</button>
            </div>
            {lacking && <p className="mt-1 text-right text-[11px] text-paper/50">{enc.kind === 'mp' ? '의지력이 모자란다.' : '건넬 물건이 모자란다.'}</p>}
          </>
        )}
        {result && (
          <>
            {result.kind === 'instant' && <p className="mt-3 text-xs text-gold" data-extra-reward>받은 것: {rewardLine(enc.reward)}</p>}
            {result.kind === 'quest' && <p className="mt-3 text-xs text-gold">[의뢰] → 받은 부탁에 적어 두었다.</p>}
            <div className="mt-4 flex justify-end">
              <button type="button" className="flat-btn" data-extra-close onClick={onClose}>닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
