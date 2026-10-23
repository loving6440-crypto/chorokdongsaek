import LocationIntro from '../LocationIntro'

function Meter({ label, value, max, tone }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-paper/75">
        <span>{label}</span>
        <span className="tabular-nums">{Math.floor(value)} / {max}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-shade/60" role="meter" aria-label={label} aria-valuenow={Math.floor(value)} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full transition-[width] duration-500 ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  )
}

export default function Infirmary({ view, player }) {
  if (view === 'intro') return <LocationIntro id="infirmary" />
  const full = player.hp >= player.hpMax && player.mp >= player.mpMax
  return (
    <section aria-label="양호실">
      <h2 className="font-serif text-2xl text-gold">누워 쉬기</h2>
      <p className="mt-1 text-sm text-paper/65">
        양호실에 머무는 동안 체력과 의지력이 1분에 1씩 찬다. 다른 곳에 가 있으면 차지 않는다.
      </p>
      <div className="ink-panel mt-4 w-full space-y-4 rounded-xl p-5">
        <Meter label="체력" value={player.hp} max={player.hpMax} tone="bg-crimson" />
        <Meter label="의지력" value={player.mp} max={player.mpMax} tone="bg-mana" />
        <p className="text-[11px] text-paper/55">{full ? '몸과 마음이 가뿐하다.' : '이불을 끌어당기고 가만히 누워 있다…'}</p>
      </div>
    </section>
  )
}
