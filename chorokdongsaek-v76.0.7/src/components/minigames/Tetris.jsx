import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCw } from 'lucide-react'
import {
  COLS,
  PIECE_COLORS,
  ROWS,
  SHAPES,
  dropInterval,
  ghostY,
  initGame,
  pieceCells,
  reducer,
} from '../../game/minigames/logicTetris'
import { sfx } from '../../game/sfx'
import { isTypingTarget, useLesson } from '../../game/lessonContext'

const BEST_KEY = 'chorok-best-tetris'

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

const freshSeed = () => (Math.random() * 0xffffffff) >>> 0

const KEY_ACTIONS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'soft',
  ArrowUp: 'rotate',
  x: 'rotate',
  X: 'rotate',
  z: 'rotateCCW',
  Z: 'rotateCCW',
  ' ': 'hard',
  c: 'hold',
  C: 'hold',
  Shift: 'hold',
  p: 'pause',
  P: 'pause',
}

export default function Tetris() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initGame(freshSeed()))
  const best = useMemo(() => Math.max(loadBest(), state.score), [state.score])

  // 마지막으로 누른 조작 (잠글 때 '쿵'과 '살짝'을 구분하는 데 쓴다)
  const lastAction = useRef(null)
  const act = useCallback((type) => {
    lastAction.current = type
    dispatch({ type })
  }, [])

  // 상태 변화를 보고 효과음을 낸다. (순수 reducer 는 건드리지 않는다.)
  const prev = useRef(state)
  useEffect(() => {
    const p = prev.current
    prev.current = state
    if (p === state) return

    if (p.status !== state.status) {
      if (state.status === 'over') sfx.play('tetrisOver')
      else if (state.status === 'playing' && (p.status === 'ready' || p.status === 'over'))
        sfx.play('tetrisStart')
      else sfx.play('pause') // playing <-> paused
      return
    }
    if (state.lines > p.lines) {
      sfx.play('tetrisLines', state.lines - p.lines)
      if (state.level > p.level) sfx.play('levelUp')
      return
    }
    if (state.board !== p.board) {
      sfx.play(lastAction.current === 'hard' ? 'tetrisHard' : 'tetrisLock')
      return
    }
    if (state.hold !== p.hold) {
      sfx.play('tetrisHold')
      return
    }
    if (state.piece.type === p.piece.type) {
      if (state.piece.shape !== p.piece.shape) sfx.play('tetrisRotate')
      else if (state.piece.x !== p.piece.x) sfx.play('tetrisMove')
    }
  }, [state])

  // 중력: 레벨이 오를수록 빨라진다.
  useEffect(() => {
    if (state.status !== 'playing') return
    const t = setInterval(() => {
      lastAction.current = 'tick'
      dispatch({ type: 'tick' })
    }, dropInterval(state.level))
    return () => clearInterval(t)
  }, [state.status, state.level])

  // 수업 시스템에 알린다: 시작 → 시도 1회, 점수 → 최소 조건, 종료 → 랭킹
  const run = useLesson()
  const prevStatus = useRef(state.status)
  useEffect(() => {
    const p = prevStatus.current
    prevStatus.current = state.status
    if (state.status === 'playing' && (p === 'ready' || p === 'over')) run.start()
    if (state.status === 'over' && p !== 'over') run.finish(state.score, { dead: true })
  }, [state.status, state.score, run])
  useEffect(() => {
    if (state.status === 'playing') run.metric(state.score)
  }, [state.score, state.status, run])
  // 도중에 창을 닫거나 다른 곳으로 가도 그때까지의 점수는 랭킹에 올린다.
  const live = useRef(state)
  live.current = state
  useEffect(() => () => {
    if (live.current.status === 'playing' && live.current.score > 0) run.submit(live.current.score)
  }, [run])

  // 게임이 끝나면 최고 기록 저장
  useEffect(() => {
    if (state.status === 'over' && state.score > loadBest()) saveBest(state.score)
  }, [state.status, state.score])

  const restart = useCallback(() => dispatch({ type: 'restart', seed: freshSeed() }), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e)) return
      if (e.key === 'Enter') {
        if (state.status === 'ready') dispatch({ type: 'start' })
        else if (state.status === 'over') restart()
        else return
        e.preventDefault()
        return
      }
      const action = KEY_ACTIONS[e.key]
      if (!action) return
      e.preventDefault()
      if (state.status === 'ready') {
        dispatch({ type: 'start' })
        return
      }
      if (state.status === 'over') return
      act(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.status, restart, act])

  // 보드 + 현재 조각 + 고스트
  const { cells, ghost } = useMemo(() => {
    const grid = state.board.map((row) => [...row])
    const ghostSet = new Set()
    if (state.status !== 'over') {
      const gy = ghostY(state.board, state.piece)
      for (const [r, c] of pieceCells({ ...state.piece, y: gy })) {
        if (r >= 0) ghostSet.add(r * COLS + c)
      }
      for (const [r, c] of pieceCells(state.piece)) {
        if (r >= 0) grid[r][c] = state.piece.type
      }
    }
    return { cells: grid, ghost: ghostSet }
  }, [state.board, state.piece, state.status])

  const ctrl = (type) => ({
    onPointerDown: (e) => e.preventDefault(), // 버튼에 포커스가 남아 Space 와 겹치지 않게
    onClick: () => act(type),
  })

  return (
    <div className="mx-auto w-full max-w-[26rem]">
      <div className="flex gap-3">
        {/* 보드 */}
        <div className="relative shrink-0">
          <div
            className="grid gap-px rounded border border-gold/30 bg-edge/10 p-px"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1.35rem)`,
              gridTemplateRows: `repeat(${ROWS}, 1.35rem)`,
            }}
          >
            {cells.flatMap((row, r) =>
              row.map((type, c) => {
                const isGhost = !type && ghost.has(r * COLS + c)
                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded-[2px]"
                    style={
                      type
                        ? { backgroundColor: PIECE_COLORS[type] }
                        : isGhost
                          ? { border: `1px solid ${PIECE_COLORS[state.piece.type]}88` }
                          : { backgroundColor: 'rgb(0 0 0 / 0.35)' }
                    }
                  />
                )
              }),
            )}
          </div>

          {state.status !== 'playing' && (
            <div className="absolute inset-0 grid place-items-center rounded bg-ink/80 p-3 text-center">
              {state.status === 'ready' && (
                <Overlay
                  title="결계 수업"
                  hint="Enter 또는 버튼으로 시작"
                  action="시작"
                  onAction={() => dispatch({ type: 'start' })}
                />
              )}
              {state.status === 'paused' && (
                <Overlay
                  title="일시정지"
                  hint="P 키로도 재개"
                  action="재개"
                  onAction={() => dispatch({ type: 'pause' })}
                />
              )}
              {state.status === 'over' && (
                <Overlay
                  title="결계가 무너졌다"
                  hint={`점수 ${state.score} · ${state.lines}줄`}
                  action="다시 하기"
                  onAction={restart}
                />
              )}
            </div>
          )}
        </div>

        {/* 사이드 패널 */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Panel label="다음">
            <div className="space-y-1.5">
              {state.queue.slice(0, 3).map((type, i) => (
                <Mini key={i} type={type} />
              ))}
            </div>
          </Panel>
          <Panel label="보관 (C)">
            {state.hold ? <Mini type={state.hold} dim={!state.canHold} /> : <div className="h-8" />}
          </Panel>
          <Stat label="점수" value={state.score} />
          <Stat label="최고" value={best} />
          <Stat label="줄" value={state.lines} />
          <Stat label="레벨" value={state.level} />
        </div>
      </div>

      {/* 터치용 조작 버튼 */}
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        <PadButton label="왼쪽" {...ctrl('left')}>
          <ArrowLeft size={16} />
        </PadButton>
        <PadButton label="오른쪽" {...ctrl('right')}>
          <ArrowRight size={16} />
        </PadButton>
        <PadButton label="회전" {...ctrl('rotate')}>
          <RotateCw size={16} />
        </PadButton>
        <PadButton label="아래로" {...ctrl('soft')}>
          <ArrowDown size={16} />
        </PadButton>
        <PadButton label="즉시 낙하" {...ctrl('hard')}>
          <ChevronsDown size={16} />
        </PadButton>
        <PadButton label="일시정지" {...ctrl('pause')}>
          {state.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
        </PadButton>
      </div>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-paper/50">
        ← → 이동 · ↑/X 회전 · Z 반대 회전 · ↓ 천천히 · Space 즉시 낙하 · C 보관 · P 일시정지
      </p>
    </div>
  )
}

function Overlay({ title, hint, action, onAction }) {
  return (
    <div>
      <p className="font-serif text-lg text-gold">{title}</p>
      <p className="mt-1 text-xs text-paper/65">{hint}</p>
      <button
        type="button"
        data-sfx="none"
        onClick={onAction}
        className="mt-3 rounded border border-gold bg-gold px-4 py-1.5 text-sm font-medium text-ink transition hover:brightness-110"
      >
        {action}
      </button>
    </div>
  )
}

function Panel({ label, children }) {
  return (
    <div className="rounded border border-edge/15 bg-shade/20 px-2.5 py-2">
      <p className="mb-1.5 text-[10px] tracking-widest text-paper/50">{label}</p>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between rounded border border-edge/15 bg-shade/20 px-2.5 py-1.5">
      <span className="text-[10px] tracking-widest text-paper/50">{label}</span>
      <span className="font-serif text-base text-gold">{value}</span>
    </div>
  )
}

function PadButton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-sfx="none"
      className="grid h-9 place-items-center rounded border border-gold/30 text-gold transition hover:bg-gold/10 active:bg-gold/20"
      {...rest}
    >
      {children}
    </button>
  )
}

/** 다음/보관 조각 미리보기 */
function Mini({ type, dim = false }) {
  const shape = SHAPES[type]
  // 빈 줄/칸을 잘라 조각 모양만 보여준다.
  const rows = shape.filter((row) => row.some(Boolean))
  const cols = shape[0].map((_, c) => c).filter((c) => shape.some((row) => row[c]))
  return (
    <div className="flex h-8 items-center" style={{ opacity: dim ? 0.35 : 1 }}>
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${cols.length}, 0.7rem)` }}>
        {rows.flatMap((row, r) =>
          cols.map((c) => (
            <div
              key={`${r}-${c}`}
              className="size-[0.7rem] rounded-[2px]"
              style={{ backgroundColor: row[c] ? PIECE_COLORS[type] : 'transparent' }}
            />
          )),
        )}
      </div>
    </div>
  )
}
