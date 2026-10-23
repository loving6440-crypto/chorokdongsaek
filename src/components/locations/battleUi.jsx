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
