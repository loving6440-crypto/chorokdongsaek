import { useState } from 'react'
import { CookingPot } from 'lucide-react'
import { COOK_RECIPES, KITCHEN, canCook } from '../../game/cooking'
import { countOf, itemOf } from '../../game/items'
import { withMeta } from './recipeMeta'
import { useVerifiedLocationEconomy } from '../../hooks/useVerifiedLocationEconomy'

// v-B.08: 요리법은 적정 레벨순. 분류 탭으로 걸러 본다.
const LISTED = withMeta(COOK_RECIPES)
const TABS = [['all', '전체'], ['can', '만들 수 있음'], ['material', '재료'], ['etc', '요리']]

/** 조리실: 등록된 조리법은 재료가 있으면 바로 조리한다. */
export default function Cooking({ player, admin, onCook, online = false }) {
  const verified = useVerifiedLocationEconomy(online)
  const verifiedOn = verified.mode === 'verified'
  const viewPlayer = verifiedOn ? { ...player, inventory: verified.wallet?.inventory ?? {} } : player
  const free = admin && !verifiedOn
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('all')
  const known = LISTED.filter(({ r, group }) => tab === 'all' || (tab === 'can' ? free || canCook(viewPlayer, r) : group === tab))
  const go = async (r) => {
    if (verified.busy || verified.mode === 'pending' || verified.mode === 'error') return
    const res = verifiedOn ? await verified.transact('craft', { recipeId: r.id, qty: 1 }) : onCook(r.id)
    setMsg(res?.error ? `조리 실패: ${res.error}` : `${itemOf(r.result).name}을(를) ${verifiedOn ? '서버 장부에서 ' : ''}만들었다.`)
  }
  return (
    <section aria-label={KITCHEN.name} data-kitchen>
      <h2 className="font-serif text-2xl text-gold">{KITCHEN.name}</h2>
      {verified.mode !== 'legacy' && <p data-verified-cooking className="mt-2 text-sm text-gold">{verifiedOn ? '서버 검증 조리 · 검증 장부 재료만 사용합니다. 기존 소지품과 별개입니다.' : verified.mode === 'pending' ? '서버 거래 상태 확인 중…' : '서버 장부 연결 실패: 새로고침 후 다시 시도하세요.'}</p>}
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-kitchen-desc>{KITCHEN.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><CookingPot size={12} aria-hidden />조리</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="제작법 분류">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-recipe-tab={id} onClick={() => setTab(id)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${tab === id ? 'border-gold/60 bg-gold/15 text-gold' : 'border-edge/25 text-paper/65 hover:text-paper'}`}>{label}</button>
          ))}
        </div>
        {known.length === 0 ? (
          <p className="mt-3 text-sm text-paper/70" data-kitchen-empty>{tab === 'all' ? '등록된 조리실 제작법이 없다.' : '여기에 해당하는 요리법이 없다.'}</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="요리법 목록">
            {known.map(({ r, lv, depth, missing }) => {
              const out = itemOf(r.result)
              const ok = (verified.mode === 'legacy' || verifiedOn) && (free || canCook(viewPlayer, r))
              return (
                <li key={r.id} data-recipe={r.id} className="rounded-xl bg-shade/25 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-base text-paper">{out.name}</p>
                      <p className="mt-0.5 text-xs text-paper/60">{r.note ?? out.desc}</p>
                      {out.effectText && <p className="mt-1 text-xs leading-relaxed text-gold" data-recipe-effect>효과 · {out.effectText}</p>}
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[10px]" data-recipe-meta>
                        <span className="rounded-full bg-gold/15 px-2 py-px text-gold" data-recipe-lv={lv ?? 'none'} title={lv == null ? '이 재료들은 아직 게임 안에서 얻을 곳이 없다. 다음 업데이트에서 수급처가 추가된다.' : undefined}>{lv == null ? `수급처 준비 중 · ${missing.join(', ')}` : `적정 레벨 ${lv}`}</span>
                        {depth > 1 && <span className="rounded-full bg-shade/40 px-2 py-px text-paper/70" data-recipe-depth={depth}>{depth}단 제작</span>}
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                        {r.inputs.map(([id, n]) => (
                          <span key={id} className={`rounded-full border px-2 py-px ${countOf(viewPlayer, id) >= n ? 'border-edge/30 text-paper/80' : 'border-crimson/50 text-crimson'}`}>
                            {itemOf(id).name} {n} <span className="opacity-60">({countOf(viewPlayer, id)})</span>
                          </span>
                        ))}
                      </p>
                    </div>
                    <button type="button" data-cook={r.id} disabled={!ok || verified.busy} onClick={() => go(r)} className="flat-btn shrink-0 text-xs disabled:opacity-40">만들기</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {msg && <p className="mt-3 text-sm text-gold" role="status" data-kitchen-msg>{msg}</p>}
      </div>
      {free && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-kitchen-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 모든 요리법을 알고 있고, 조리에 재료가 들지 않는다</p>
        </div>
      )}
    </section>
  )
}
