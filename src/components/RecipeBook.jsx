import { useState } from 'react'
import { countOf, itemOf } from '../game/items'

/**
 * v-B.18 [제작법 보기]: 그 곳의 제작법 전부. 가나다순, 위쪽 토글로 '만들 수 있는 제작만 보기'.
 * [칸에 올리기]를 누르면 그 재료를 [제작] 칸에 올려 두고 [제작] 탭으로 넘어간다(누르기 전까진 만들어지지 않는다).
 * props: listed(withMeta 결과) · player · canMake(r) · onLoad(r) · free(관리자)
 */
export default function RecipeBook({ listed, player, canMake, onLoad, free = false, emptyText = '등록된 제작법이 없다.' }) {
  const [onlyCan, setOnlyCan] = useState(() => {
    try { return localStorage.getItem('recipeOnlyCan') === '1' } catch { return false }
  })
  const toggle = () => setOnlyCan((v) => { try { localStorage.setItem('recipeOnlyCan', v ? '0' : '1') } catch { /* 무시 */ } return !v })
  const rows = listed
    .filter(({ r }) => !onlyCan || free || canMake(r))
    .sort((a, b) => (itemOf(a.r.result)?.name ?? '').localeCompare(itemOf(b.r.result)?.name ?? '', 'ko'))
  return (
    <div data-recipe-book>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-paper/80" data-recipe-only-can>
        <button type="button" role="switch" aria-checked={onlyCan} onClick={toggle} className={`relative h-5 w-9 rounded-full transition-colors ${onlyCan ? 'bg-gold-fill' : 'bg-edge/25'}`}>
          <span className={`absolute top-0.5 size-4 rounded-full bg-paper transition-all ${onlyCan ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
        만들 수 있는 제작만 보기
        <span className="text-paper/45">({rows.length}개)</span>
      </label>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-paper/70" data-recipe-empty>{onlyCan ? '지금 가진 재료로 만들 수 있는 게 없다.' : emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2" aria-label="제작법 목록">
          {rows.map(({ r, lv, depth, missing }) => {
            const out = itemOf(r.result)
            const ok = free || canMake(r)
            return (
              <li key={r.id} data-recipe={r.id} className="rounded-xl bg-shade/25 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-serif text-base text-paper">{out.name}</p>
                    <p className="mt-0.5 text-xs text-paper/60">{r.note ?? out.desc}</p>
                    {out.effectText && <p className="mt-1 text-xs leading-relaxed text-gold" data-recipe-effect>효과 · {out.effectText}</p>}
                    <p className="mt-1 flex flex-wrap gap-1.5 text-[10px]" data-recipe-meta>
                      <span className="rounded-full bg-gold/15 px-2 py-px text-gold" data-recipe-lv={lv ?? 'none'}>{lv == null ? `수급처 준비 중 · ${missing.join(', ')}` : `적정 레벨 ${lv}`}</span>
                      {depth > 1 && <span className="rounded-full bg-shade/40 px-2 py-px text-paper/70" data-recipe-depth={depth}>{depth}단 제작</span>}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                      {r.inputs.map(([id, n]) => (
                        <span key={id} className={`rounded-full border px-2 py-px ${countOf(player, id) >= n ? 'border-edge/30 text-paper/80' : 'border-crimson/50 text-crimson'}`}>
                          {itemOf(id).name} {n} <span className="opacity-60">({countOf(player, id)})</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  <button type="button" data-recipe-load={r.id} disabled={!ok} onClick={() => onLoad(r)} className="flat-btn shrink-0 text-xs disabled:opacity-40" title="재료를 [제작] 칸에 올린다">칸에 올리기</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
