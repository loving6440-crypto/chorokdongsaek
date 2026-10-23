import { useEffect, useReducer, useRef } from 'react'
import { Heart, RotateCcw } from 'lucide-react'
import {
  KIND_LABEL,
  MONTHS,
  PAIR_SCORE,
  buildDeck,
  clearBonus,
  comboBonus,
  isMatch,
  stageConfig,
} from '../../game/minigames/hwatu'
import { sfx } from '../../game/sfx'
import { isTypingTarget, useLesson } from '../../game/lessonContext'
import HwatuFace, { HwatuBack } from './HwatuFace'

const BEST_KEY = 'chorok-best-hwatu'
const loadBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
const saveBest = (v) => {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    /* 저장 불가 환경이면 이번 판 기록만 유지 */
  }
}

const MATCH_DELAY = 420
const MISS_DELAY = 950

const initial = () => ({
  phase: 'ready', // ready | peek | play | clear | over
  stage: 1,
  deck: [],
  matched: [],
  open: [],
  chances: 0,
  combo: 0,
  score: 0,
  peek: 0,
  seconds: 0,
  bonus: 0,
  best: loadBest(),
})

function reducer(s, a) {
  switch (a.type) {
    case 'start': {
      const stage = a.stage
      const cfg = stageConfig(stage)
      return {
        ...s,
        phase: 'peek',
        stage,
        score: a.keepScore ? s.score : 0,
        deck: buildDeck(stage),
        matched: [],
        open: [],
        chances: cfg.chances,
        combo: 0,
        peek: cfg.peekSeconds,
        seconds: 0,
        bonus: 0,
      }
    }
    case 'peekTick':
      if (s.phase !== 'peek') return s
      return s.peek <= 1 ? { ...s, peek: 0, phase: 'play' } : { ...s, peek: s.peek - 1 }
    case 'skipPeek':
      return s.phase === 'peek' ? { ...s, peek: 0, phase: 'play' } : s
    case 'secTick':
      return s.phase === 'play' ? { ...s, seconds: s.seconds + 1 } : s
    case 'open': {
      if (s.phase !== 'play' || s.open.length >= 2) return s
      if (s.matched.includes(a.id) || s.open.includes(a.id)) return s
      return { ...s, open: [...s.open, a.id] }
    }
    case 'resolve': {
      if (s.open.length !== 2) return s
      const [ca, cb] = s.open.map((id) => s.deck.find((c) => c.id === id))
      if (isMatch(ca, cb)) {
        const matched = [...s.matched, ca.id, cb.id]
        const combo = s.combo + 1
        let score = s.score + PAIR_SCORE + comboBonus(combo)
        if (matched.length === s.deck.length) {
          const bonus = clearBonus(s.stage, s.chances, s.seconds)
          score += bonus
          const best = Math.max(s.best, score)
          return { ...s, matched, open: [], combo, score, bonus, best, phase: 'clear' }
        }
        return { ...s, matched, open: [], combo, score }
      }
      const chances = s.chances - 1
      if (chances <= 0) {
        return { ...s, open: [], chances: 0, combo: 0, best: Math.max(s.best, s.score), phase: 'over' }
      }
      return { ...s, open: [], chances, combo: 0 }
    }
    default:
      return s
  }
}

const cardLabel = (c) => `${c.month}월 ${MONTHS[c.month - 1].name} ${KIND_LABEL[c.kind]}`

const btnPrimary =
  'mt-4 inline-flex items-center gap-1.5 rounded border border-gold bg-gold px-6 py-2 text-sm font-medium text-ink transition hover:brightness-110'

export default function Hwatu() {
  const [s, dispatch] = useReducer(reducer, undefined, initial)

  // 패를 펼쳐 보여 주는 카운트다운
  useEffect(() => {
    if (s.phase !== 'peek') return
    const t = setInterval(() => dispatch({ type: 'peekTick' }), 1000)
    return () => clearInterval(t)
  }, [s.phase])

  // 경과 시간
  useEffect(() => {
    if (s.phase !== 'play') return
    const t = setInterval(() => dispatch({ type: 'secTick' }), 1000)
    return () => clearInterval(t)
  }, [s.phase])

  // 두 장이 열리면 잠시 뒤 짝 여부를 판정
  useEffect(() => {
    if (s.phase !== 'play' || s.open.length !== 2) return
    const [a, b] = s.open.map((id) => s.deck.find((c) => c.id === id))
    const ok = isMatch(a, b)
    const t = setTimeout(() => {
      sfx.play(ok ? 'hwatuMatch' : 'hwatuMiss')
      dispatch({ type: 'resolve' })
    }, ok ? MATCH_DELAY : MISS_DELAY)
    return () => clearTimeout(t)
  }, [s.phase, s.open, s.deck])

  // 단계 전환 효과음 / 최고점 저장
  const run = useLesson()
  const prevPhase = useRef('ready')
  useEffect(() => {
    if (prevPhase.current === s.phase) return
    prevPhase.current = s.phase
    if (s.phase === 'peek') {
      sfx.play('hwatuStart')
      if (s.stage === 1) run.start() // 새 판 → 시도 1회
    }
    if (s.phase === 'clear') {
      sfx.play('hwatuClear')
      run.metric(s.stage) // 최소 조건: 3판 완료 (깬 판 수)
      run.submit(s.score) // 판을 깰 때마다 기록을 올려 둔다 (최고 기록만 남는다)
    }
    if (s.phase === 'over') {
      sfx.play('hwatuOver')
      run.finish(s.score, { dead: true, metric: null })
    }
    if (s.phase === 'clear' || s.phase === 'over') saveBest(s.best)
  }, [s.phase, s.best, s.stage, s.score, run])

  const startFresh = () => dispatch({ type: 'start', stage: 1, keepScore: false })
  const startNext = () => dispatch({ type: 'start', stage: s.stage + 1, keepScore: true })

  // Enter: 시작 / 다음 판 / 다시
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat || isTypingTarget(e)) return
      if (s.phase === 'ready' || s.phase === 'over') {
        e.preventDefault()
        dispatch({ type: 'start', stage: 1, keepScore: false })
      } else if (s.phase === 'clear') {
        e.preventDefault()
        dispatch({ type: 'start', stage: s.stage + 1, keepScore: true })
      } else if (s.phase === 'peek') {
        e.preventDefault()
        dispatch({ type: 'skipPeek' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.phase, s.stage])

  const flip = (id) => {
    if (s.phase !== 'play' || s.open.length >= 2 || s.matched.includes(id) || s.open.includes(id)) return
    sfx.play('hwatuFlip')
    dispatch({ type: 'open', id })
  }

  const cfg = stageConfig(s.stage)
  const rows = Math.ceil((s.deck.length || cfg.cards) / cfg.cols)
  const showAll = s.phase === 'peek' || s.phase === 'over' || s.phase === 'clear'
  const mm = String(Math.floor(s.seconds / 60)).padStart(2, '0')
  const ss = String(s.seconds % 60).padStart(2, '0')

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="판" value={`${s.stage}`} />
        <Stat label="점수" value={s.score} />
        <div className="rounded border border-edge/15 bg-shade/20 px-2.5 py-2" aria-label="남은 기회">
          <p className="text-[10px] tracking-widest text-paper/50">기회</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 font-serif text-base text-gold" data-testid="chances">
            <Heart size={13} className="text-crimson" />
            {s.phase === 'ready' ? '-' : s.chances}
          </p>
        </div>
        <Stat label="시간" value={`${mm}:${ss}`} />
      </div>

      <div className="relative mt-3 flex justify-center">
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
            width: `min(100%, calc((100vh - 360px) / ${rows} * 0.6667 * ${cfg.cols}))`,
            minWidth: '15rem',
          }}
        >
          {(s.deck.length ? s.deck : Array.from({ length: cfg.cards }, (_, i) => ({ id: `b${i}` }))).map((c) => {
            const done = s.matched.includes(c.id)
            const up = c.month ? showAll || done || s.open.includes(c.id) : false
            return (
              <button
                key={c.id}
                type="button"
                data-sfx="none"
                data-card={c.id}
                data-month={c.month}
                data-up={up}
                aria-label={up && c.month ? cardLabel(c) : '뒤집힌 화투패'}
                disabled={s.phase !== 'play' || done}
                onClick={() => flip(c.id)}
                className={`hwatu-card aspect-[2/3] w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  done ? 'opacity-55' : ''
                }`}
              >
                <span className="hwatu-inner" data-up={up}>
                  <span className="hwatu-back">
                    <HwatuBack />
                  </span>
                  <span className="hwatu-face">{c.month ? <HwatuFace card={c} /> : null}</span>
                </span>
              </button>
            )
          })}
        </div>

        {s.phase === 'ready' && (
          <Overlay>
            <p className="font-serif text-xl text-gold">화투 신경쇠약</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-paper/70">
              패가 잠깐 펼쳐졌다가 모두 뒤집힌다. 두 장씩 열어 <b className="text-gold">같은 월</b>끼리 짝을 맞춰라.
              광·띠·피가 달라도 같은 달이면 짝이다. 틀리면 기회가 줄어든다.
            </p>
            <button type="button" className={btnPrimary} onClick={startFresh}>
              시작 (Enter)
            </button>
          </Overlay>
        )}
        {s.phase === 'clear' && (
          <Overlay>
            <p className="font-serif text-xl text-gold">{s.stage}판 클리어!</p>
            <p className="mt-2 text-xs text-paper/70">
              보너스 +{s.bonus} · 점수 {s.score}
            </p>
            <button type="button" className={btnPrimary} onClick={startNext}>
              다음 판 (Enter)
            </button>
          </Overlay>
        )}
        {s.phase === 'over' && (
          <Overlay>
            <p className="font-serif text-xl text-crimson">기회 소진</p>
            <p className="mt-2 text-xs text-paper/70">
              {s.stage}판에서 끝 · 점수 <b className="text-gold">{s.score}</b> · 최고 {s.best}
            </p>
            <button type="button" className={btnPrimary} onClick={startFresh}>
              <RotateCcw size={14} />
              다시 (Enter)
            </button>
          </Overlay>
        )}
      </div>

      {s.phase === 'peek' && (
        <p className="mt-3 text-center text-sm text-gold" role="status">
          외우세요! {s.peek}초 ·{' '}
          <button type="button" data-sfx="none" onClick={() => dispatch({ type: 'skipPeek' })} className="underline">
            바로 시작
          </button>
        </p>
      )}
      {s.phase === 'play' && (
        <p className="mt-3 text-center text-[11px] text-paper/55">
          {s.matched.length / 2} / {s.deck.length / 2} 짝{s.combo > 1 ? ` · ${s.combo}연속!` : ''} · 최고 {s.best}
        </p>
      )}
      <p className="mt-1 text-center text-[11px] leading-relaxed text-paper/45">
        판이 올라갈수록 월이 늘고(6→8→10→12), 보여 주는 시간은 줄어든다.
      </p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-edge/15 bg-shade/20 px-2.5 py-2">
      <p className="text-[10px] tracking-widest text-paper/50">{label}</p>
      <p className="mt-0.5 font-serif text-base text-gold">{value}</p>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-ink/85 p-3 text-center backdrop-blur-[1px]">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}
