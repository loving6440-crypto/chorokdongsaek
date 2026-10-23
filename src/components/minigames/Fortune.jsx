import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { FORTUNE_ONCE_PER_DAY, RANKS, drawFortune, todayKey } from '../../game/minigames/fortune'
import { sfx } from '../../game/sfx'
import { useLesson } from '../../game/lessonContext'

const SHAKE_MS = 1500

const storeKey = (playerKey) => `chorok-fortune:${playerKey || 'guest'}`
const loadDrawn = (playerKey) => {
  try {
    return JSON.parse(localStorage.getItem(storeKey(playerKey)))?.date ?? null
  } catch {
    return null
  }
}
const saveDrawn = (playerKey, date) => {
  try {
    localStorage.setItem(storeKey(playerKey), JSON.stringify({ date }))
  } catch {
    /* 저장 불가 환경이면 새로고침 시 다시 뽑을 수 있을 뿐이다 */
  }
}

/** 같은 계정·같은 날이면 같은 시드 → 같은 운세. (FORTUNE_ONCE_PER_DAY = false 면 매번 새로) */
const makeFortune = (playerKey, date) =>
  drawFortune(FORTUNE_ONCE_PER_DAY ? `${playerKey || 'guest'}|${date}` : `${Math.random()}|${Date.now()}`)

export default function Fortune({ playerKey }) {
  const today = todayKey()
  const [phase, setPhase] = useState(() =>
    FORTUNE_ONCE_PER_DAY && loadDrawn(playerKey) === today ? 'revealed' : 'idle',
  ) // idle | shaking | revealed
  const [fortune, setFortune] = useState(() =>
    FORTUNE_ONCE_PER_DAY && loadDrawn(playerKey) === today ? makeFortune(playerKey, today) : null,
  )
  const timer = useRef(null)
  const run = useLesson()
  // 운세를 뽑은 것만으로 수업 완료. (이미 오늘 뽑았더라도 완료 처리는 한 번만 일어난다.)
  useEffect(() => {
    if (phase === 'revealed') run.metric(1)
  }, [phase, run])
  useEffect(() => () => clearTimeout(timer.current), [])

  const draw = () => {
    if (phase === 'shaking') return
    setPhase('shaking')
    sfx.play('fortuneShake')
    timer.current = setTimeout(() => {
      const result = makeFortune(playerKey, today)
      setFortune(result)
      setPhase('revealed')
      saveDrawn(playerKey, today)
      sfx.play(RANKS.find((r) => r.id === result.rankId).sound)
    }, SHAKE_MS)
  }

  const rank = fortune ? RANKS.find((r) => r.id === fortune.rankId) : null
  const dateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-3 text-center text-xs tracking-widest text-paper/55">{dateLabel}</p>

      {phase !== 'revealed' && (
        <div className="rounded-md border border-gold/25 bg-shade/20 px-5 py-6 text-center">
          <div className={`mx-auto mb-5 w-28 ${phase === 'shaking' ? 'fortune-shake' : ''}`} aria-hidden>
            <div className="relative mx-auto h-36 w-24">
              {/* 산가지 */}
              {[-12, -6, 0, 6, 12].map((deg, i) => (
                <span
                  key={deg}
                  className="absolute bottom-16 h-20 w-1.5 origin-bottom rounded-t bg-[#e8d9a0]"
                  style={{ left: `${24 + i * 11}%`, transform: `rotate(${deg}deg)` }}
                />
              ))}
              {/* 산통 */}
              <div className="absolute inset-x-0 bottom-0 grid h-24 place-items-center rounded-t-md rounded-b-2xl border-2 border-gold/60 bg-gradient-to-b from-[#6b4423] to-[#4d2f17]">
                <span className="font-serif text-4xl text-[#e8d9a0]">卜</span>
              </div>
            </div>
          </div>

          <p className="font-serif text-lg text-gold">오늘의 길흉을 점친다</p>
          <p className="mt-1 text-xs text-paper/60">
            산통을 흔들어 대흉 · 흉 · 평 · 길 · 대길 중 하나를 뽑는다.
          </p>
          <button
            type="button"
            data-sfx="none"
            onClick={draw}
            disabled={phase === 'shaking'}
            className="mt-4 inline-flex items-center gap-1.5 rounded border border-gold bg-gold px-6 py-2 text-sm font-medium text-ink transition enabled:hover:brightness-110 disabled:opacity-60"
          >
            <Sparkles size={14} />
            {phase === 'shaking' ? '흔드는 중…' : '점 치기'}
          </button>
        </div>
      )}

      {phase === 'revealed' && fortune && rank && (
        <div className="fortune-reveal rank-card rounded-md p-5" style={{ '--rk': rank.dark, '--rk-l': rank.light }}>
          <div className="text-center">
            <p className="text-[11px] tracking-[0.3em] text-paper/55">오늘의 운세</p>
            <p className="rank-text mt-1 font-serif text-6xl leading-none">{rank.hanja}</p>
            <p className="rank-text mt-2 font-serif text-xl tracking-[0.3em]">{rank.name}</p>
            <p className="mt-3 text-sm leading-relaxed break-keep text-paper/90">{fortune.summary}</p>
          </div>

          <dl className="mt-5 space-y-2.5">
            {fortune.sections.map((s) => (
              <div key={s.label} className="rounded border border-edge/10 bg-shade/20 px-3 py-2">
                <dt className="text-[10px] tracking-widest text-paper/50">{s.label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed break-keep text-paper/90">{s.text}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
            {fortune.lucky.map((l) => (
              <li
                key={l.label}
                className="rounded-full border border-gold/30 px-2.5 py-1 text-[11px] text-paper/80"
              >
                <span className="text-paper/50">{l.label}</span> {l.text}
              </li>
            ))}
          </ul>

          <div className="mt-4 text-center">
            {FORTUNE_ONCE_PER_DAY ? (
              <p className="text-[11px] text-paper/50">운세는 하루에 한 번. 내일 다시 점을 쳐 보자.</p>
            ) : (
              <button
                type="button"
                data-sfx="none"
                onClick={draw}
                className="rounded border border-gold/40 px-4 py-1.5 text-xs text-gold transition hover:bg-gold/10"
              >
                다시 뽑기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
