import { useState } from 'react'
import { CookingPot } from 'lucide-react'
import { COOK_RECIPES, KITCHEN, canCook } from '../../game/cooking'
import { BENCH_SLOTS, matchRecipe } from '../../game/freeCraft'
import CraftBench from '../CraftBench'
import RecipeBook from '../RecipeBook'
import { itemOf } from '../../game/items'
import { withMeta } from './recipeMeta'
import { useVerifiedLocationEconomy } from '../../hooks/useVerifiedLocationEconomy'

// v-B.18: [제작](제작 칸 10칸) · [제작법 보기](가나다순, 만들 수 있는 것만 보기 토글) 두 화면.
const LISTED = withMeta(COOK_RECIPES)

/** 조리실: 등록된 조리법은 재료가 있으면 바로 조리한다. */
export default function Cooking({ player, admin, onCook, onBench, online = false }) {
  const verified = useVerifiedLocationEconomy(online)
  const verifiedOn = verified.mode === 'verified'
  const viewPlayer = verifiedOn ? { ...player, inventory: verified.wallet?.inventory ?? {} } : player
  const free = admin && !verifiedOn
  const [view, setView] = useState('bench') // v-B.18: 'bench'(제작) | 'book'(제작법 보기)
  const [slots, setSlots] = useState(() => Array(BENCH_SLOTS).fill(null))
  // v-B.18 [제작] 칸: 맞는 요리법이 있으면 그대로, 없으면 숯. 서버 검증 모드는 요리법에 맞는 조합만.
  const benchGo = async (list) => {
    if (verifiedOn) {
      const m = matchRecipe(list, 'kitchen')
      if (!m) return { error: '서버 검증 모드에서는 요리법에 맞는 조합만 만들 수 있다.' }
      const res = await verified.transact('craft', { recipeId: m.recipe.id, qty: m.k })
      return res?.error ? { error: verified.message || res.error } : { item: itemOf(m.recipe.result), qty: m.k, failed: false }
    }
    return onBench?.(list)
  }
  const loadRecipe = (r) => {
    setSlots([...r.inputs.map(([id, n]) => ({ id, n })), ...Array(Math.max(0, BENCH_SLOTS - r.inputs.length)).fill(null)].slice(0, BENCH_SLOTS))
    setView('bench')
  }
  return (
    <section aria-label={KITCHEN.name} data-kitchen>
      <h2 className="font-serif text-2xl text-gold">{KITCHEN.name}</h2>
      {verified.mode !== 'legacy' && <p data-verified-cooking className="mt-2 text-sm text-gold">{verifiedOn ? '서버 검증 조리 · 검증 장부 재료만 사용합니다. 기존 소지품과 별개입니다.' : verified.mode === 'pending' ? '서버 거래 상태 확인 중…' : '서버 장부 연결 실패: 새로고침 후 다시 시도하세요.'}</p>}
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-kitchen-desc>{KITCHEN.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="조리실">
          {[['bench', '제작'], ['book', '제작법 보기']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} data-kitchen-view={id} onClick={() => setView(id)} className={`tilt flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${view === id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}>
              {id === 'bench' && <CookingPot size={13} aria-hidden />}{label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {view === 'bench' ? (
            <CraftBench player={viewPlayer} place="kitchen" slots={slots} setSlots={setSlots} onCraft={benchGo} disabled={verified.busy || verified.mode === 'pending' || verified.mode === 'error' ? '잠시 뒤에 다시 시도해 주세요.' : ''} />
          ) : (
            <RecipeBook listed={LISTED} player={viewPlayer} free={free} canMake={(r) => canCook(viewPlayer, r)} onLoad={loadRecipe} emptyText="등록된 조리실 제작법이 없다." />
          )}
        </div>
      </div>
      {free && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-kitchen-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 요리법대로 만들 때 재료가 들지 않는다</p>
        </div>
      )}
    </section>
  )
}
