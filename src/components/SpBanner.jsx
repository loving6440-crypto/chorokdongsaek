import { SPECIAL_PERCENT } from '../game/battle'

/** 상대의 영능력이 발동된 순간의 큰 알림. 확률 · 효과 · 이번에 실제로 들어온 수치까지 보여 준다. */
export default function SpBanner({ sp, className = 'top-10', onEnd }) {
  if (!sp) return null
  return (
    <div
      key={sp.k}
      role="alert"
      data-sp-banner
      className={`sp-banner pointer-events-none absolute inset-x-0 ${className} z-30 mx-auto w-[min(28rem,94%)] rounded-2xl border-2 border-crimson bg-ink/95 px-5 py-4 text-center shadow-2xl`}
      onAnimationEnd={onEnd}
    >
      <p className="text-xs tracking-[0.3em] text-crimson">✦ 영능력 발동 ✦</p>
      <p className="mt-1 font-serif text-3xl text-gold">《{sp.label}》</p>
      <p className="mt-1 text-sm text-paper/90">{sp.note}</p>
      <div className="mt-2 space-y-1 rounded-lg bg-shade/40 px-3 py-2 text-left text-xs leading-relaxed text-paper/85">
        <p data-sp-chance>
          <b className="text-gold">발동 확률 {sp.chance ?? SPECIAL_PERCENT}%</b> · 상대 턴마다 d10 을 굴려 10 이 나오면 (기 모은 직후 턴 제외)
        </p>
        {(sp.effects ?? []).map((l, i) => (
          <p key={i}>· {l}</p>
        ))}
        {sp.result && (
          <p data-sp-result className="border-t border-edge/20 pt-1 text-crimson">
            ▶ 이번 결과: {sp.result}
          </p>
        )}
      </div>
    </div>
  )
}
