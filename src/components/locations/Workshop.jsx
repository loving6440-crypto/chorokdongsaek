import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'
import { RECIPES, WORKSHOP, canCraft, recipeOf } from '../../game/crafting'
import { BENCH_SLOTS, matchRecipe } from '../../game/freeCraft'
import CraftBench from '../CraftBench'
import RecipeBook from '../RecipeBook'
import { itemOf } from '../../game/items'
import { withMeta } from './recipeMeta'
import { useVerifiedLocationEconomy } from '../../hooks/useVerifiedLocationEconomy'

// v-B.18: [제작](제작 칸 10칸) · [제작법 보기](가나다순, 만들 수 있는 것만 보기 토글) 두 화면.
const LISTED = withMeta(RECIPES)

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

/** 공작소: 제작 칸에 재료를 올려 만든다. 제작법에 없는 조합이면 쓰레기. 이전 버전 제작 대기 상태만 호환 표시. */
export default function Workshop({ player, admin, onCraft, onBench, onStopCraft, onAdminLearn, online = false }) {
  const verified = useVerifiedLocationEconomy(online)
  const verifiedOn = verified.mode === 'verified'
  const viewPlayer = verifiedOn ? { ...player, inventory: verified.wallet?.inventory ?? {}, crafting: null } : player
  const free = admin && !verifiedOn
  const [, setTick] = useState(0)
  const [view, setView] = useState('bench') // v-B.18: 'bench'(제작) | 'book'(제작법 보기)
  const [slots, setSlots] = useState(() => Array(BENCH_SLOTS).fill(null))
  const cf = verifiedOn ? null : player.crafting

  useEffect(() => {
    if (!cf) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [cf])

  // v-B.18 [제작] 칸: 맞는 제작법이 있으면 그대로, 없으면 쓰레기. 서버 검증 모드는 제작법에 맞는 조합만.
  const benchGo = async (list) => {
    if (verifiedOn) {
      const m = matchRecipe(list, 'workshop')
      if (!m) return { error: '서버 검증 모드에서는 제작법에 맞는 조합만 만들 수 있다.' }
      const res = await verified.transact('craft', { recipeId: m.recipe.id, qty: m.k })
      return res?.error ? { error: verified.message || res.error } : { item: itemOf(m.recipe.result), qty: m.k, failed: false }
    }
    return onBench?.(list)
  }
  // [제작법 보기] → [칸에 올리기]: 재료를 제작 칸에 올리고 [제작] 탭으로
  const loadRecipe = (r) => {
    setSlots([...r.inputs.map(([id, n]) => ({ id, n })), ...Array(Math.max(0, BENCH_SLOTS - r.inputs.length)).fill(null)].slice(0, BENCH_SLOTS))
    setView('bench')
  }

  if (cf && verified.mode === 'legacy') {
    const r = recipeOf(cf.recipeId)
    const out = itemOf(r.result)
    const left = cf.startedAt + cf.minutes * 60000 - Date.now()
    return (
      <section aria-label={WORKSHOP.name} data-workshop>
        <h2 className="font-serif text-2xl text-gold">{WORKSHOP.name}</h2>
        <div className="ink-panel mt-4 w-full rounded-xl p-5" data-crafting={cf.recipeId}>
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700"><Hammer size={12} aria-hidden />제작 중</p>
          <p className="mt-2 font-serif text-base text-paper">{out.name} × {cf.qty}개를 만들고 있다.</p>
          <p className="mt-1 text-xs text-paper/60">끝까지 기다려야 완성품이 나온다. 중간에 나가면 재료도 완성품도 돌아오지 않는다.</p>
          <p className="mt-2 text-sm text-gold" data-craft-left>남은 시간: {left > 0 ? leftText(left) : '거의 다 됐다'}</p>
          <button type="button" onClick={() => onStopCraft?.()} className="flat-btn mt-3 text-xs">제작 그만두기</button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={WORKSHOP.name} data-workshop>
      <h2 className="font-serif text-2xl text-gold">{WORKSHOP.name}</h2>
      {verified.mode !== 'legacy' && <p data-verified-workshop className="mt-2 text-sm text-gold">{verifiedOn ? '서버 검증 제작 · 검증 장부 재료만 사용합니다. 기존 소지품과 별개입니다.' : verified.mode === 'pending' ? '서버 거래 상태 확인 중…' : '서버 장부 연결 실패: 새로고침 후 다시 시도하세요.'}</p>}
      <div className="ink-panel mt-3 w-full rounded-xl p-5">
        <p className="text-sm leading-[1.9] break-keep text-paper/85" data-workshop-desc>{WORKSHOP.desc}</p>
      </div>
      <div className="ink-panel mt-4 w-full rounded-xl p-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="공작소">
          {[['bench', '제작'], ['book', '제작법 보기']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} data-workshop-view={id} onClick={() => setView(id)} className={`tilt flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${view === id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}>
              {id === 'bench' && <Hammer size={13} aria-hidden />}{label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {view === 'bench' ? (
            <CraftBench player={viewPlayer} place="workshop" slots={slots} setSlots={setSlots} onCraft={benchGo} disabled={verified.busy || verified.mode === 'pending' || verified.mode === 'error' ? '잠시 뒤에 다시 시도해 주세요.' : ''} />
          ) : (
            <RecipeBook listed={LISTED} player={viewPlayer} free={free} canMake={(r) => canCraft(viewPlayer, r)} onLoad={loadRecipe} emptyText="등록된 공작소 제작법이 없다." />
          )}
        </div>
      </div>
      {free && (
        <div className="ink-panel mt-4 w-full rounded-xl p-4" data-workshop-admin>
          <p className="text-[10px] tracking-[0.25em] text-crimson">관리자 · 제작법대로 만들 때 재료가 소모되지 않는다</p>
        </div>
      )}
    </section>
  )
}
