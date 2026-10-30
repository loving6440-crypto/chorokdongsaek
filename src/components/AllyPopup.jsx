/**
 * 아군의 영능력 사용은 적군의 영능력 사용(SpBanner)과 마찬가지로 꾸며진 큰 팝업으로,
 * 아이템 사용·전투불능·부활은 화면 위에 짧게 뜨고 사라지는 작은 토스트로 보여 준다. (v71)
 */
export function AllyPsychicBanner({ sp, className = 'top-10', onEnd }) {
  if (!sp) return null
  return (
    <div
      key={sp.k}
      role="alert"
      className={`absolute inset-x-0 ${className} z-30 mx-auto w-[min(28rem,94%)] rounded-2xl border-2 border-gold bg-ink/95 px-5 py-4 text-center shadow-2xl`}
    >
      <button type="button" onClick={onEnd} aria-label="아군 영능력 팝업 닫기" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-gold/40 text-xl leading-none text-gold hover:bg-gold/15">×</button>
      <p className="text-xs tracking-[0.3em] text-gold">✦ 아군 영능력 발동 ✦</p>
      <p className="mt-1 font-serif text-3xl text-gold">{sp.name}의 《{sp.label}》</p>
      {sp.note && <p className="mt-1 text-sm text-paper/90">{sp.note}</p>}
      {sp.detail && <p className="mt-2 text-xs leading-relaxed text-paper/75">{sp.detail}</p>}
    </div>
  )
}

const TOAST_STYLE = {
  item: 'border-edge/40 text-paper/90',
  downed: 'border-crimson text-crimson',
  revived: 'border-gold text-gold',
}

/** 아이템 사용 · 전투불능 · 부활을 알리는 짧은 토스트 목록. */
export function AllyToastStack({ toasts, className = 'top-10' }) {
  if (!toasts.length) return null
  return (
    <div className={`pointer-events-none absolute inset-x-0 ${className} z-20 mx-auto flex w-[min(22rem,92%)] flex-col items-center gap-1.5`}>
      {toasts.map((t) => (
        <div key={t.k} className={`toast-pop rounded-full border bg-ink/90 px-4 py-1.5 text-center text-xs shadow-lg ${TOAST_STYLE[t.type] ?? TOAST_STYLE.item}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
