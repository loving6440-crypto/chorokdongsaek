import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { SHRINE_INSIGHT_UNLOCK } from '../../game/constants'
import { pickNpcLine } from '../../game/npcLines'
import { ISHI } from '../../game/shrine'
import LocationIntro from '../LocationIntro'
import NpcDialog from '../NpcDialog'

/** 사당 문지기 이시와의 대화. 말을 걸 때마다 대사가 하나씩 나온다. */
function Guard({ player, onMeet, onLineSeen }) {
  const [talk, setTalk] = useState(null) // { line, firstOf }
  const speak = () => {
    const r = pickNpcLine(ISHI.id, ISHI.lines, player, player.lineSeen)
    setTalk(r)
    onMeet?.(ISHI.id)
    if (r.firstOf) onLineSeen?.(ISHI.id, r.firstOf)
  }
  return (
    <section aria-label="문지기와 대화">
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">문지기와 대화</p>
        <p className="mt-3 text-sm leading-[1.9] break-keep text-paper/85" data-ishi-intro>
          {ISHI.intro}
        </p>
        <button type="button" onClick={speak} className="flat-btn mt-4">
          <MessageCircle size={15} aria-hidden />
          {talk ? '다시 말을 건다' : ISHI.button}
        </button>
      </div>
      {talk && (
        <>
          <p className="mt-4 text-xs leading-relaxed text-paper/60 italic" data-ishi-appear>
            {ISHI.appear}
          </p>
          <NpcDialog npc={ISHI.name} src={ISHI.portrait} dataNpc="ishi">
            {talk.line.text}
          </NpcDialog>
        </>
      )}
    </section>
  )
}

export default function Shrine({ view, player, onExplore, onMeet, onLineSeen }) {
  const insight = player.stats.insight
  const unlocked = insight >= SHRINE_INSIGHT_UNLOCK
  if (view === 'intro') return <LocationIntro id="shrine" />
  if (view === 'guard') return <Guard key="guard" player={player} onMeet={onMeet} onLineSeen={onLineSeen} />

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
