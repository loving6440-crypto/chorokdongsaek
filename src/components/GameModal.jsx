import { useEffect, useMemo, useRef, useState } from 'react'
import { Hourglass, X } from 'lucide-react'
import SoundToggle from './SoundToggle'
import RankingPanel from './RankingPanel'
import Fortune from './minigames/Fortune'
import Game2048 from './minigames/Game2048'
import Hwatu from './minigames/Hwatu'
import RunnerGame from './minigames/RunnerGame'
import Tetris from './minigames/Tetris'
import TypingGame from './minigames/TypingGame'
import { STAT_ICONS } from './statIcons'
import StatTooltip from './StatTooltip'
import { STAT_KEYS, STAT_MAX, STAT_META } from '../game/constants'
import {
  COURSE_INFO,
  LESSON_WAIT_MINUTES,
  rewardText,
} from '../game/courseInfo'
import { LessonContext, SkinContext } from '../game/lessonContext'
import { SKINS, isSkinOpen } from '../game/skins2048'
import { SKINS_RUNNER, isRunnerSkinOpen } from '../game/skinsRunner'
import { submitScore } from '../net/online'

// 과목 id → 미니게임. 여기에 등록하면 해당 과목에서 바로 플레이할 수 있다.
const MINIGAMES = {
  'talisman-2048': { Component: Game2048, width: 'max-w-lg' },
  'spell-typing': { Component: TypingGame, width: 'max-w-3xl' },
  'ward-tetris': { Component: Tetris, width: 'max-w-lg' },
  'divination-fortune': { Component: Fortune, width: 'max-w-lg' },
  'folklore-spot': { Component: Hwatu, width: 'max-w-2xl' },
  'exorcism-space': { Component: RunnerGame, width: 'max-w-3xl' },
}

const fmtLeft = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`
}

/**
 * @param lesson  오늘의 수업 상태 { used, done, waitUntil, pendingStat }
 * @param actions { spendAttempt(id)->bool, complete(id), wait(id), pickStat(key) }
 */
export default function GameModal({
  course,
  onClose,
  playerKey,
  playerName,
  stats,
  lesson,
  actions,
  player,
  onSkin,
  onSkinRunner,
  admin,
}) {
  // Game 이 1초마다 다시 그려져도 효과가 다시 걸리지 않도록 ref 로 들고 있는다.
  const closeRef = useRef(onClose)
  const live = useRef({})
  live.current = { course, lesson, actions, playerKey, playerName }
  const completed = useRef(false)
  const [active, setActive] = useState(false) // 지금 판이 진행 중인가
  const [result, setResult] = useState(null) // 직전 판의 결과 { score, dead, won }
  const [tab, setTab] = useState('game') // game | rank
  const [rankKey, setRankKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  const courseId = course?.id
  useEffect(() => {
    // 과목이 바뀌면(열릴 때마다) 진행 상태를 비운다.
    completed.current = false
    setActive(false)
    setResult(null)
    setTab('game')
  }, [courseId])

  // ESC·외부 클릭으로 닫지 않는다. X 버튼으로만 닫는다. 채팅 입력은 계속 사용 가능.

  const waiting = !!(lesson?.waitUntil && lesson.waitUntil > now)
  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [waiting])

  // 미니게임이 부르는 통로. 항상 같은 객체를 돌려주어 게임 쪽 effect 가 다시 걸리지 않게 한다.
  const api = useMemo(() => {
    const metric = (v) => {
      const c = live.current
      const info = COURSE_INFO[c.course?.id]
      if (!info || completed.current || c.lesson?.done) return
      if (v >= info.minValue) {
        completed.current = true
        c.actions.complete(c.course.id)
      }
    }
    const submit = (score) => {
      const c = live.current
      const info = COURSE_INFO[c.course?.id]
      if (!info?.ranked || !(score > 0) || !c.playerKey) return
      submitScore(c.course.id, c.playerKey, c.playerName || c.playerKey, Math.round(score)).then(() =>
        setRankKey((k) => k + 1),
      )
    }
    return {
      start: () => {
        const c = live.current
        if (c.course.id === 'divination-fortune') return true
        const ok = c.actions.spendAttempt(c.course.id)
        if (ok) {
          setActive(true)
          setResult(null)
        }
        return ok
      },
      metric,
      submit,
      finish: (score, opts = {}) => {
        if (opts.metric !== null) metric(opts.metric ?? score)
        submit(score)
        setActive(false)
        setResult({ score: Math.round(score), dead: !!opts.dead, won: !!opts.won })
      },
      // 계속할 수 있는 성공(2048 달성): 판은 이어지고 성공 문구만 띄운다.
      won: (score) => {
        submit(score)
        setResult({ score: Math.round(score), dead: false, won: true })
      },
      abandon: () => setActive(false),
    }
  }, [])

  const skinCtx = useMemo(() => {
    if (course?.id === 'exorcism-space') {
      const open = SKINS_RUNNER.filter((k) => isRunnerSkinOpen(k, player, admin)).map((k) => k.id)
      const cur = open.includes(player?.skinRunner) ? player.skinRunner : 'fox'
      return { current: cur, open, set: (id) => onSkinRunner?.(id) }
    }
    const open = SKINS.filter((k) => isSkinOpen(k, player, admin)).map((k) => k.id)
    const cur = open.includes(player?.skin2048) ? player.skin2048 : 'talisman'
    return { current: cur, open, set: (id) => onSkin?.(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, player?.achievements, player?.skin2048, player?.skinRunner, onSkin, onSkinRunner, admin])

  if (!course) return null

  const entry = MINIGAMES[course.id]
  const Playable = entry?.Component
  const info = COURSE_INFO[course.id]
  const isFortune = course.id === 'divination-fortune'
  const blocked = !isFortune && waiting && !active
  const canWait = !isFortune && !lesson.done && !waiting

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[65] flex items-start justify-center p-2 pt-14 sm:p-4 sm:pt-16"

    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`${course.title} · ${course.game}`}
        className={`pointer-events-auto ink-panel max-h-[75vh] w-full overflow-y-auto rounded-lg border border-edge/40 bg-shade/95 p-5 shadow-2xl ${
          entry ? entry.width : 'max-w-md'
        }`}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="font-serif text-lg text-gold">{course.title}</p>
            <p className="text-xs text-paper/55">미니게임 · {course.game}</p>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-paper/50 hover:bg-edge/10 hover:text-paper"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 과목 설명 */}
        <p className="font-serif text-[15px] leading-relaxed break-keep text-paper">{info.short}</p>
        <p className="mt-1.5 text-sm leading-relaxed break-keep text-paper/70">{info.long}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-paper/50">{course.note}</p>

        {/* 오늘의 수업 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-edge/15 bg-shade/20 px-3 py-2 text-xs">
          <span className="text-paper/60">
            최소 조건 <b className="ml-1 font-medium text-paper">{info.minLabel}</b>
          </span>
          <span className="text-paper/60">
            보상 <b className="ml-1 font-medium text-gold">{rewardText(course.id)}</b>
          </span>
          {!isFortune && (
            <span className="text-paper/60">
              오늘 플레이 <b className="ml-1 font-medium text-paper">{lesson.used}회</b>
            </span>
          )}
          {lesson.done && (
            <span className="rounded-full border border-emerald-500/50 px-2 py-px text-emerald-400 light:text-emerald-700">
              오늘 수업 완료
            </span>
          )}
          {waiting && (
            <span className="rounded-full border border-gold/50 px-2 py-px text-gold">
              대기 중 · {fmtLeft(lesson.waitUntil - now)} 남음
            </span>
          )}
          <span className="flex-1" />
          {canWait && (
            <button
              type="button"
              onClick={() => actions.wait(course.id)}
              className="inline-flex items-center gap-1 rounded border border-gold/40 px-2.5 py-1 text-gold hover:bg-gold/10"
              title="게임을 하지 않고 수업을 기다린다. 다른 곳으로 이동하거나 새 동작을 시작하면 끊긴다."
            >
              <Hourglass size={12} />
              {LESSON_WAIT_MINUTES}분 대기
            </button>
          )}
        </div>

        {/* 점복학 보너스: 올릴 스탯 고르기 */}
        {lesson.pendingStat && (
          <div className="mt-3 rounded-md border border-gold/50 bg-gold/10 p-3">
            <p className="text-sm text-gold">운세의 보너스! 올릴 스탯을 하나 고른다.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STAT_KEYS.map((key) => {
                const Icon = STAT_ICONS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => actions.pickStat(key)}
                    disabled={stats[key] >= STAT_MAX}
                    className="tilt flex disabled:cursor-not-allowed disabled:opacity-40 items-center justify-between gap-2 rounded border border-gold/40 bg-shade/30 px-3 py-1.5 text-sm text-paper hover:bg-gold/15"
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon size={13} className="text-gold" />
                      <StatTooltip statKey={key} side="below">
                        {STAT_META[key].label}
                      </StatTooltip>
                    </span>
                    <span className="font-serif text-gold">
                      {stats[key] >= STAT_MAX ? '최대' : `${stats[key]} → ${stats[key] + 1}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {info.ranked && (
          <div className="mt-3 flex gap-1" role="tablist">
            {[
              ['game', '게임'],
              ['rank', '랭킹'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                data-sfx="none"
                disabled={active && id === 'rank'}
                title={active && id === 'rank' ? '게임 중에는 랭킹을 볼 수 없다' : undefined}
                onClick={() => setTab(id)}
                className={`rounded-full px-4 py-1 text-xs ${
                  tab === id ? 'bg-gold/15 text-gold' : 'text-paper/55 hover:text-paper'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {info.ranked && tab === 'rank' ? (
            <RankingPanel
              courseId={course.id}
              playerId={playerKey}
              scoreLabel={info.scoreLabel}
              refreshKey={rankKey}
            />
          ) : blocked ? (
            <div className="rounded-md border border-gold/25 bg-shade/20 p-6 text-center">
              {result && (
                <div className="mb-4">
                  <p className="font-serif text-lg text-gold">
                    {result.won ? info.success : result.dead ? info.death : '수업을 마쳤다.'}
                  </p>
                  <p className="mt-1 text-sm text-paper/70">
                    이번 기록 <b className="text-gold">{result.score.toLocaleString('ko-KR')}</b>
                  </p>
                </div>
              )}
              {waiting ? (
                <p className="text-sm leading-relaxed text-paper/75">
                  수업을 기다리는 중이다. {fmtLeft(lesson.waitUntil - now)} 뒤에 수업이 끝난다.
                  <br />
                  <span className="text-paper/55">
                    창을 닫거나 탭을 내려 두어도 계속 기다린다. 다른 곳으로 이동하거나 새 동작을 시작하면 끊긴다.
                  </span>
                </p>
              ) : null}
              {canWait && (
                <button
                  type="button"
                  onClick={() => actions.wait(course.id)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded border border-gold bg-gold px-5 py-2 text-sm font-medium text-ink hover:brightness-110"
                >
                  <Hourglass size={14} />
                  {LESSON_WAIT_MINUTES}분 대기하기
                </button>
              )}
            </div>
          ) : (
            <SkinContext.Provider value={skinCtx}>
            <LessonContext.Provider value={api}>
              {result && (
                <p
                  className={`mb-3 rounded-md border px-3 py-2 text-center font-serif ${
                    result.won
                      ? 'border-gold/60 bg-gold/10 text-gold'
                      : 'border-crimson/40 bg-crimson/10 text-crimson'
                  }`}
                  role="status"
                >
                  {result.won ? info.success : result.dead ? info.death : '수업을 마쳤다.'}
                </p>
              )}
              {!isFortune && !active && (
                <p className="mb-3 text-center text-[11px] text-paper/50">
                  {lesson.done ? '오늘의 보상은 이미 받았다. 플레이와 랭킹 기록은 계속 쌓인다.' : '플레이 횟수에는 제한이 없다. 보상(영력)은 하루에 한 번만 받는다.'}
                </p>
              )}
              {Playable ? (
                <Playable playerKey={playerKey} />
              ) : (
                <div className="rounded border border-dashed border-gold/25 bg-shade/30 px-4 py-8 text-center text-sm text-paper/45">
                  {course.game} 모듈은 준비 중입니다.
                </div>
              )}
            </LessonContext.Provider>
            </SkinContext.Provider>
          )}
        </div>
      </div>
    </div>
  )
}
