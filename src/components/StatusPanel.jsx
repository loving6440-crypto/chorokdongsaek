import { Sparkles } from 'lucide-react'
import { STAT_KEYS, STAT_MAX, STAT_META, STAT_UPGRADE_COST_PER_POINT } from '../game/constants'
import { STAT_ICONS } from './statIcons'
import { isWeak, weakLeftText } from '../game/progress'
import StatTooltip from './StatTooltip'

/** 육조 스탯: 화면 맨 아래에 따로 떨어진 칸. 이름에 마우스를 올리면 기질 설명이 뜬다. */
export default function StatusPanel({ player, eff, onUpgrade }) {
  const weak = isWeak(player)
  const shown = eff ?? player.stats
  return (
    <section className="ink-panel shrink-0 rounded-2xl p-3 sm:p-4" aria-label="육조 스탯">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg text-gold">육조 스탯</h2>
        <p className="text-[11px] text-paper/55">
          영력으로 스탯을 1씩 강화 (비용 = 현재 수치 × {STAT_UPGRADE_COST_PER_POINT} · 최대 {STAT_MAX})
        </p>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-edge/[0.08] px-3 py-1 text-xs text-paper/80">
          <Sparkles size={12} className="text-gold-fill" />
          보유 영력 <b className="font-serif text-sm text-gold">{Math.floor(player.spirit)}</b>
        </p>
      </div>
      {weak && (
        <p data-weak className="mb-2 rounded-lg bg-crimson/20 px-3 py-1.5 text-xs text-crimson">
          [쇠약] 모든 육조 스탯이 5할 · 남은 시간 {weakLeftText(player)} · 기숙사에서 6시간 취침하면 회복
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STAT_KEYS.map((key) => {
          const meta = STAT_META[key]
          const value = player.stats[key]
          const cost = value * STAT_UPGRADE_COST_PER_POINT
          const maxed = value >= STAT_MAX
          const canAfford = !maxed && player.spirit >= cost
          const Icon = STAT_ICONS[key]
          return (
            <div key={key} className="rounded-xl bg-[var(--c-ink-muted)] p-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-paper">
                  <Icon size={14} className="shrink-0 text-gold" aria-hidden />
                  <StatTooltip statKey={key} side="above">
                    {meta.label}
                  </StatTooltip>
                </p>
                <span className="font-serif text-xl leading-none text-gold" data-stat-value={shown[key]}>
                  {shown[key]}
                  {!weak && shown[key] > value && <sup className="ml-0.5 text-[10px] text-mana">+{shown[key] - value}</sup>}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpgrade(key)}
                disabled={!canAfford}
                className="mt-2 w-full rounded-lg bg-edge/[0.09] py-1.5 text-[11px] text-gold transition enabled:hover:bg-gold-fill/25 disabled:cursor-not-allowed disabled:text-paper/30"
              >
                {maxed ? '최대치' : `강화 · 영력 ${cost}`}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
