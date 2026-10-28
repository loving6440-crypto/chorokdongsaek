import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { TYPING_SENTENCES } from '../../game/minigames/typingSentences'
import { countKeystrokes, gradeOf } from '../../game/minigames/typingMetrics'
import { COURSE_INFO } from '../../game/courseInfo'
import { sfx } from '../../game/sfx'
import { isTypingTarget, useLesson } from '../../game/lessonContext'

const BEST_KEY = 'chorok-best-typing'
const ROUND_SENTENCES = 10 // 한 판은 10문장

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

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export default function TypingGame() {
  const [phase, setPhase] = useState('ready') // ready | playing | over
  const [queue, setQueue] = useState(() => shuffled(TYPING_SENTENCES).slice(0, ROUND_SENTENCES))
  const [index, setIndex] = useState(0) // 지금 제시된 문장 번호 (= 지금까지 통과한 문장 수)
  const [typed, setTyped] = useState('')
  const [composing, setComposing] = useState(false)
  const [speeds, setSpeeds] = useState([]) // 문장별 타수(분당). 틀린 문장은 0 으로 센다.
  const [misses, setMisses] = useState([]) // 틀린 문장 기록 { target, typed }
  const [result, setResult] = useState(null)
  const [best, setBest] = useState(loadBest)

  const inputRef = useRef(null)
  const startedAt = useRef(null) // 현재 문장의 첫 입력 시각
  const pendingEnter = useRef(false) // 한글 조합 중에 눌린 엔터
  const lastSubmit = useRef(0)
  const run = useLesson()
  const overAt = useRef(0) // 게임이 끝난 시각 (직후에 들어오는 엔터가 바로 재시작하는 것을 막는다)

  const total = queue.length
  const target = queue[index] ?? ''

  const start = useCallback(() => {
    setQueue(shuffled(TYPING_SENTENCES).slice(0, ROUND_SENTENCES))
    setIndex(0)
    setSpeeds([])
    setMisses([])
    setResult(null)
    setTyped('')
    startedAt.current = null
    sfx.play('typeStart')
    run.start()
    setPhase('playing')
  }, [run])

  const finish = useCallback(
    (finalSpeeds, finalMisses) => {
      const score = Math.round(mean(finalSpeeds))
      const prevBest = loadBest()
      if (score > prevBest) {
        saveBest(score)
        setBest(score)
      }
      setResult({
        score,
        count: finalSpeeds.length,
        correct: finalSpeeds.length - finalMisses.length,
        misses: finalMisses,
        newBest: score > prevBest,
      })
      overAt.current = performance.now()
      setPhase('over')
      sfx.play(finalMisses.length ? 'typeBad' : 'typeDone')
      run.finish(score, { dead: score < COURSE_INFO['spell-typing'].minValue })
    },
    [run],
  )

  /** 엔터: 문장을 제출한다. 틀려도 끝나지 않고, 그 문장은 0타로 센다. 10문장을 마치면 끝. */
  const submit = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const now = performance.now()
    if (now - lastSubmit.current < 120) return // 한글 입력기가 엔터를 두 번 보내는 경우 방지
    const value = el.value.normalize('NFC').trim()
    if (!value || startedAt.current == null) return // 아무것도 안 쓰고 엔터만 친 건 무시
    lastSubmit.current = now

    const elapsedMs = Math.max(now - startedAt.current, 300)
    el.value = ''
    startedAt.current = null
    setTyped('')

    const ok = value === target
    const cpm = ok ? countKeystrokes(target) / (elapsedMs / 60000) : 0
    const next = [...speeds, cpm]
    const nextMisses = ok ? misses : [...misses, { target, typed: value }]
    setSpeeds(next)
    setMisses(nextMisses)
    if (index + 1 >= total) {
      finish(next, nextMisses)
    } else {
      sfx.play(ok ? 'typeOk' : 'typeBad')
      setIndex(index + 1)
    }
  }, [target, speeds, misses, index, total, finish])

  // 조합 중(한글 입력 중) 엔터는 글자가 확정된 다음에 제출한다.
  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      pendingEnter.current = true
      return
    }
    submit()
  }
  const onCompositionEnd = () => {
    setComposing(false)
    if (pendingEnter.current) {
      pendingEnter.current = false
      setTimeout(submit, 0) // 확정된 값이 input 에 반영된 뒤에 읽는다
    }
  }
  const onInput = (e) => {
    const v = e.target.value
    setTyped(v)
    if (v && startedAt.current == null) startedAt.current = performance.now() // 첫 글자부터 시간 측정
    sfx.play('key')
  }

  // 시작 / 재시작 단축키, 입력창 포커스 유지
  useEffect(() => {
    if (phase === 'playing') {
      inputRef.current?.focus()
      return
    }
    const onKey = (e) => {
      if (isTypingTarget(e)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (performance.now() - overAt.current < 700) return
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start])

  const avg = Math.round(mean(speeds))
  const last = speeds.length ? Math.round(speeds[speeds.length - 1]) : null

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* 상단 기록 */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Stat label="문장" value={`${phase === 'ready' ? 0 : phase === 'over' ? speeds.length : index + 1} / ${total}`} />
        <Stat label="직전" value={last ? `${last}타` : '-'} />
        <Stat label="평균" value={speeds.length ? `${avg}타` : '-'} />
        <Stat label="최고" value={best ? `${best}타` : '-'} />
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded bg-edge/10">
        <div
          className="h-full bg-gold/70 transition-[width] duration-200"
          style={{ width: `${(speeds.length / total) * 100}%` }}
        />
      </div>

      {phase === 'ready' && (
        <div className="rounded-md border border-gold/25 bg-shade/20 p-5 text-center">
          <p className="font-serif text-lg text-gold">주문을 끊기지 않게 옮겨 적는다</p>
          <ul className="mx-auto mt-3 max-w-md space-y-1 text-left text-xs leading-relaxed text-paper/70">
            <li>· 위인전에서 발췌한 문장 {ROUND_SENTENCES}개가 무작위로 제시된다.</li>
            <li>· 문장을 빠르고 정확하게 따라 쓰고 Enter 를 친다.</li>
            <li>· 오타가 있어도 끊기지 않지만, 틀린 문장은 0타로 계산된다.</li>
            <li>· {ROUND_SENTENCES}문장이 끝나면 수업이 끝나고, 문장별 타수의 평균이 점수가 된다.</li>
            <li>· 속도는 첫 글자를 친 순간부터 Enter 까지로 잰다. (붙여넣기는 막혀 있다)</li>
          </ul>
          <button
            type="button"
            data-sfx="none"
            onClick={start}
            className="mt-4 rounded border border-gold bg-gold px-6 py-2 text-sm font-medium text-ink transition hover:brightness-110"
          >
            시작 (Enter)
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div
          className="rounded-md border border-gold/25 bg-shade/20 p-5"
          onClick={() => inputRef.current?.focus()}
        >
          <p className="mb-2 text-[11px] tracking-widest text-paper/45">
            {index + 1}번째 문장
          </p>
          <p className="min-h-[4.5rem] font-sans text-xl leading-relaxed break-keep sm:text-2xl">
            {[...target].map((ch, i) => {
              const t = [...typed][i]
              let cls = 'text-paper/65'
              if (t !== undefined) {
                const isComposingChar = composing && i === [...typed].length - 1
                if (isComposingChar) cls = 'text-paper'
                else if (t === ch) cls = 'text-emerald-400 light:text-emerald-700'
                else cls = 'rounded-sm bg-red-500/25 text-red-300 underline light:text-red-700'
              }
              return (
                <span key={i} className={cls}>
                  {ch}
                </span>
              )
            })}
          </p>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="문장 입력"
            placeholder="여기에 입력하고 Enter"
            onInput={onInput}
            onKeyDown={onKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={onCompositionEnd}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            className="mt-4 w-full rounded border border-edge/25 bg-shade/20 px-3 py-2.5 text-base text-paper outline-none placeholder:text-paper/35 focus:border-gold"
          />
          <p className="mt-2 text-[11px] text-paper/45">
            틀린 문장은 0타로 계산된다. 정확하게, 그리고 빠르게.
          </p>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="rounded-md border border-gold/25 bg-shade/20 p-5 text-center">
          <p className="font-serif text-lg text-gold">
            {result.misses.length === 0 ? `${ROUND_SENTENCES}문장을 모두 정확히 옮겨 적었다` : `${ROUND_SENTENCES}문장을 옮겨 적었다`}
          </p>

          <div className="my-4">
            <p className="text-[11px] tracking-widest text-paper/50">평균 타수</p>
            <p className="font-serif text-5xl text-gold">
              {result.score}
              <span className="ml-1 text-base text-paper/60">타/분</span>
            </p>
            <p className="mt-1 text-sm text-paper/75">
              {gradeOf(result.score).name} · 정확 {result.correct}/{result.count}문장
              {result.newBest && <span className="ml-2 text-gold">새 최고 기록!</span>}
            </p>
          </div>

          {result.misses.length > 0 && (
            <div className="mx-auto max-w-lg space-y-3 text-left text-sm">
              <p className="text-center text-[11px] text-paper/50">틀린 문장 {result.misses.length}개 (0타로 계산)</p>
              {result.misses.map((m, i) => (
                <div key={i} className="space-y-2 rounded border border-edge/15 bg-shade/20 p-3">
                  <div>
                    <p className="text-[10px] tracking-widest text-paper/45">제시문</p>
                    <p className="break-keep text-paper/90">{m.target}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-widest text-paper/45">입력</p>
                    <p className="break-keep">
                      <DiffText target={m.target} typed={m.typed} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            data-sfx="none"
            onClick={start}
            className="mt-4 inline-flex items-center gap-1.5 rounded border border-gold bg-gold px-5 py-2 text-sm font-medium text-ink transition hover:brightness-110"
          >
            <RotateCcw size={14} />
            다시 하기 (Enter)
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-edge/15 bg-shade/20 px-2 py-1.5 text-center">
      <p className="text-[10px] tracking-widest text-paper/50">{label}</p>
      <p className="font-serif text-base text-gold">{value}</p>
    </div>
  )
}

/** 입력한 문장에서 제시문과 다른 글자를 표시한다. */
function DiffText({ target, typed }) {
  const t = [...target]
  const chars = [...typed]
  return (
    <>
      {chars.map((ch, i) => (
        <span
          key={i}
          className={
            ch === t[i]
              ? 'text-paper/90'
              : 'rounded-sm bg-red-500/25 text-red-300 underline light:text-red-700'
          }
        >
          {ch === ' ' && ch !== t[i] ? '␣' : ch}
        </span>
      ))}
      {chars.length < t.length && <span className="text-red-300 light:text-red-700"> …(모자람)</span>}
    </>
  )
}
