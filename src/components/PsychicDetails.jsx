import { mpCostOf } from '../game/battle'

const AFFECTS = {
  buff: ['안목', '호전'], survival: ['인내', '절제'], 'monkey-paw': ['체력', '호전', '안목'], 'dokkaebi-fire': ['호전', '안목'],
  'echo-form': ['인내', '절제', '호전', '체력'], 'karmic-recompense': ['공격 대상'], 'falling-light': ['방어 태세'], 'cotton-mist': ['상대 행동'],
}
const costBase = (s, stats, opts) => {
  if (s.id === 'monkey-paw') return Math.ceil(Math.max(0, opts?.sacrifice || 1) / 2)
  if (s.id === 'echo-form') return stats ? Math.max(20, Math.min(99, 50 - stats.endurance - stats.control + stats.aggression)) : null
  return Number.isFinite(s.mp) ? s.mp : null
}
/** 영능력 설명을 한곳에서 출력한다. stats가 있으면 실제 장비 적용 의지력 소모도 함께 표시한다. */
export default function PsychicDetails({ psychic, stats, options, condensed = false }) {
  if (!psychic) return null
  const base = costBase(psychic, stats, options)
  const effective = base != null && stats ? mpCostOf(stats, base) : null
  const modifiers = effective !== null && effective !== base ? ' (장비 할인 적용)' : ''
  return <div className={`space-y-1 text-xs leading-relaxed ${condensed ? 'mt-1' : 'mt-2'}`}>
    <p><b className="text-gold">의지력 소모</b> <span className="text-paper/80">{base == null ? '행동에 따라 변동' : `${base}${effective != null ? ` → 실제 ${effective}` : ''}${modifiers}`}</span></p>
    <p><b className="text-gold">상세 설명</b> <span className="text-paper/75">{psychic.detail || psychic.note || '추가 설명 없음'}</span></p>
    <p><b className="text-gold">영향받는 스탯</b> <span className="text-paper/70">{(AFFECTS[psychic.id] || []).join(' · ') || '직접 참조 없음'}</span></p>
  </div>
}
