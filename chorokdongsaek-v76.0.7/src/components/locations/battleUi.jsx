/** hidden: 막대 모양만 보이고 수치는 숨긴다. */
export function Bar({ value, max, tone, label, hidden }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-shade/60"
      role="meter"
      aria-label={label}
      aria-valuenow={hidden ? undefined : Math.max(0, value)}
      aria-valuemin={0}
      aria-valuemax={hidden ? undefined : max}
    >
      <div className={`h-full transition-[width] duration-500 ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const vague = (cur, max) => {
  const r = cur / max
  return r > 0.75 ? '아직 멀쩡해 보인다' : r > 0.4 ? '꽤 상처 입었다' : r > 0.15 ? '휘청거린다' : '거의 다 죽어간다'
}

/**
 * 기믹(페이즈)이 있는 적의 체력바 색: 체력이 50%·25% 밑으로 떨어질 때마다(= 기믹 단계가 바뀔 때마다)
 * 눈에 띄게 바뀐다. 기믹이 없는 적은 평소처럼 crimson 하나만 쓴다. (v71)
 */
export const enemyHpTone = (cur, max, hasGimmicks) => {
  if (!hasGimmicks) return 'bg-crimson'
  const r = max > 0 ? cur / max : 1
  return r > 0.5 ? 'bg-crimson' : r > 0.25 ? 'bg-amber-500' : 'bg-red-700 animate-pulse'
}
