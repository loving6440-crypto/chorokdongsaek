import { useCallback, useEffect, useRef, useState } from 'react'
import { INTRO_AUTO_ADVANCE_MS, INTRO_PARAGRAPHS, splitAtCommas } from '../game/intro'
import { sfx } from '../game/sfx'
import FitLines from './FitLines'
import SoundToggle from './SoundToggle'

// 연출 타이밍(ms)
const TITLE_MS = 3400 // 어둠 속에서 제호가 떠오르고 머무는 시간
const FADE_MS = 1500 // 제호가 흐려지며 사라지는 시간 (이 도중에 첫 문단이 떠오른다)
const BLOOM_MS = 1700 // 마지막에 빛이 번지며 귀여운 화면으로 넘어가는 시간

/** 제호. still 이면 떠오르는 애니메이션 없이 그 자리에 있다. */
function Title({ still = false }) {
  return (
    <div className="text-center">
      <p
        className={`font-myeongjo font-bold text-[#f7dc88] ${still ? '' : 'intro-title-rise'}`}
        style={{
          fontSize: 'clamp(3.2rem, 11vw, 8.5rem)',
          letterSpacing: '0.32em',
          paddingLeft: '0.32em',
          textShadow: '0 0 28px rgba(247,220,136,0.45), 0 0 90px rgba(247,220,136,0.25)',
        }}
      >
        草綠同色
      </p>
      <p
        className={`mt-3 font-myeongjo text-[#f4efdc]/65 ${still ? '' : 'intro-title-sub'}`}
        style={{ fontSize: 'clamp(0.9rem, 2.2vw, 1.5rem)', letterSpacing: '1em', paddingLeft: '1em' }}
      >
        초록동색
      </p>
    </div>
  )
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// 문단 스타일별 최대 글자 크기(px)와 글꼴 클래스. 실제 크기는 화면 폭에 맞춰 더 줄어든다.
const STYLE = {
  // 인트로는 귀여운 둥근 글꼴이 아니라 정통 명조(Noto Serif KR)로 쓴다.
  normal: { max: 26, cls: 'font-myeongjo tracking-[0.02em] leading-[1.9]' },
  big: { max: 46, cls: 'font-myeongjo font-semibold tracking-[0.14em]' },
  italic: { max: 34, cls: 'font-myeongjo italic tracking-wide' },
}

export default function Intro({ onDone, onLeaveStart }) {
  const instant = useRef(reducedMotion()).current
  const fadeMs = instant ? 1 : FADE_MS
  const titleMs = instant ? 0 : TITLE_MS

  const [titleOut, setTitleOut] = useState(false) // 제호가 흐려지는 중
  const [ready, setReady] = useState(false) // 제호가 충분히 흐려져 스크립트를 보여줄 수 있는 상태
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const finishedRef = useRef(false)
  const indexRef = useRef(0)
  const onDoneRef = useRef(onDone)
  const onLeaveStartRef = useRef(onLeaveStart)
  useEffect(() => {
    onDoneRef.current = onDone
    onLeaveStartRef.current = onLeaveStart
  }, [onDone, onLeaveStart])

  // 연출: 어둠 속 제호(징 소리) → 흐려짐 → 바로 스크립트 시작
  useEffect(() => {
    if (!instant) setTimeout(() => sfx.play('introGong'), 350)
    const tFade = 60 + titleMs
    const timers = [
      setTimeout(() => setTitleOut(true), tFade),
      setTimeout(() => setReady(true), tFade + fadeMs * 0.6),
    ]
    return () => timers.forEach(clearTimeout)
  }, [fadeMs, instant, titleMs])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    sfx.play('introEnd')
    setLeaving(true)
    onLeaveStartRef.current?.() // 뒤에서 캐릭터 생성 화면이 미리 깔리고, 빛이 번지며 드러난다
    setTimeout(() => onDoneRef.current?.(), instant ? 0 : BLOOM_MS)
  }, [instant])

  const next = useCallback(() => {
    if (finishedRef.current) return
    if (indexRef.current >= INTRO_PARAGRAPHS.length - 1) {
      finish()
      return
    }
    indexRef.current += 1
    sfx.play('introNext')
    setIndex(indexRef.current)
  }, [finish])

  // 10초마다 자동으로 다음 문단 (클릭/키 입력으로 넘기면 타이머가 다시 시작된다)
  useEffect(() => {
    if (!ready || leaving) return
    const t = setTimeout(next, INTRO_AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [ready, leaving, index, next])

  // 키보드: Space / Enter / → 로 다음, Esc 로 건너뛰기
  useEffect(() => {
    const onKey = (e) => {
      if (!ready) return
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'Escape') {
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, next, finish])

  const paragraph = INTRO_PARAGRAPHS[index]
  const isLast = index === INTRO_PARAGRAPHS.length - 1
  const style = STYLE[paragraph.style] ?? STYLE.normal

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden text-[#f4efdc] select-none"
      style={{
        // 떠날 때: 어두운 남색 → 테마 배경색으로 물들고, 그 뒤에 투명해진다.
        backgroundColor: leaving ? 'var(--c-ink)' : '#050a1a',
        opacity: leaving ? 0 : 1,
        transition: instant
          ? 'none'
          : `background-color ${BLOOM_MS * 0.45}ms ease, opacity ${BLOOM_MS * 0.5}ms ease ${BLOOM_MS * 0.5}ms`,
        cursor: ready ? 'pointer' : 'default',
      }}
      onClick={() => ready && next()}
      role="presentation"
    >
      {/* 스크립트 무대. 한 문장은 항상 한 줄이며, 가장 긴 줄이 폭에 맞도록 글자 크기가 자동 조절된다. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(247,220,136,0.16), transparent 70%)',
          opacity: ready && !leaving ? 1 : 0,
          transition: `opacity ${instant ? 1 : 2400}ms ease`,
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: leaving ? 0 : 1, transition: `opacity ${instant ? 1 : 500}ms ease` }}
      >
        {ready && (
          <div key={index} className="intro-paragraph w-[96vw] text-center">
            <FitLines lines={splitAtCommas(paragraph.lines)} maxSize={style.max} className={style.cls} />
          </div>
        )}
      </div>

      {/* 어둠 속에서 천천히 떠오르다가, 흐려지며 사라지는 제호 */}
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center"
        style={{
          opacity: titleOut ? 0 : 1,
          filter: titleOut ? 'blur(10px)' : 'blur(0)',
          transition: instant ? 'none' : `opacity ${fadeMs}ms ease, filter ${fadeMs}ms ease`,
        }}
      >
        <Title />
      </div>

      {/* 마지막: 빛이 번지며 다음 화면으로 */}
      {leaving && !instant && (
        <div
          aria-hidden
          className="intro-bloom pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,244,205,0.95) 0%, rgba(247,220,136,0.55) 35%, rgba(247,220,136,0) 70%)',
            animationDuration: `${BLOOM_MS}ms`,
          }}
        />
      )}

      <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
        <SoundToggle />
      </div>

      {ready && !leaving && (
        <>
          <button
            type="button"
            data-sfx="none"
            onClick={(e) => {
              e.stopPropagation()
              finish()
            }}
            className="absolute top-4 right-4 rounded border border-[#f7dc88]/30 px-3 py-1.5 text-xs text-[#f7dc88]/80 transition hover:bg-[#f7dc88]/10"
          >
            건너뛰기
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3">
            <p className="text-[11px] tracking-widest text-[#f4efdc]/40">
              {isLast ? '클릭하면 신입생 등록으로' : '클릭하면 다음으로'}
              <span className="mx-2">·</span>
              {index + 1} / {INTRO_PARAGRAPHS.length}
            </p>
            {/* 좁은 세로 화면에서는 한 줄 규칙 때문에 글자가 작아진다. 가로 보기를 권한다. */}
            <p className="hidden text-[11px] text-[#f7dc88]/70 max-sm:portrait:block">
              가로로 돌리면 글자가 더 커져요
            </p>
            {/* 다음 문단까지 남은 시간 */}
            <div className="h-px w-40 overflow-hidden bg-[#f4efdc]/10">
              <div
                key={index}
                className="intro-countdown h-full bg-[#f7dc88]/60"
                style={{ animationDuration: `${INTRO_AUTO_ADVANCE_MS}ms` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
