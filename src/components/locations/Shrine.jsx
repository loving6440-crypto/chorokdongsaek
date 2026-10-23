import { SHRINE_INSIGHT_UNLOCK } from '../../game/constants'
import LocationIntro from '../LocationIntro'

export default function Shrine({ view, insight, onExplore }) {
  const unlocked = insight >= SHRINE_INSIGHT_UNLOCK
  if (view === 'intro') return <LocationIntro id="shrine" />

  return (
    <section>
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">표지판</p>
        {!unlocked ? (
          <p className="mt-3 text-sm leading-relaxed text-paper/80">
            ⚠️ 출입금지 - 표지판 아래 글자가 심하게 훼손되어 읽을 수 없다.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-paper/85">
              📜 [비사 해금] 경고: 이 아래는 이승의 규칙이 미치지 않는 귀문이다.
            </p>
            <button
              type="button"
              onClick={onExplore}
              className="flat-btn mt-4"
            >
              탐사 시작
            </button>
          </>
        )}
        <p className="mt-4 text-[11px] text-paper/40">
          안목 {insight} / 해금 {SHRINE_INSIGHT_UNLOCK}
        </p>
      </div>
    </section>
  )
}
