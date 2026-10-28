import { useCallback, useEffect, useRef, useState } from 'react'
import { Languages, Lock, Palette, RotateCcw } from 'lucide-react'
import { createGame, step } from '../../game/minigames/logic2048'
import TileFace, { Blossom } from './TileFace'
import { ACHIEVEMENTS } from '../../game/achievements'
import { SKINS, skinOf } from '../../game/skins2048'
import { sfx } from '../../game/sfx'
import { isTypingTarget, useLesson, useSkin } from '../../game/lessonContext'

const BEST_KEY = 'chorok-best-2048'
const MODE_KEY = 'chorok-mode-2048' // 'hanja' | 'number'
const loadMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) === 'number' ? 'number' : 'hanja'
  } catch {
    return 'hanja'
  }
}

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

const KEY_DIRS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
}

export default function Game2048() {
  const [game, setGame] = useState(() => createGame(loadBest()))
  const gameRef = useRef(game)
  const touch = useRef(null)
  const run = useLesson()
  const started = useRef(false) // 이번 판에서 첫 수를 뒀는가 (그때 시도 1회를 쓴다)
  const [mode, setMode] = useState(loadMode)
  const [skinOpen, setSkinOpen] = useState(false)
  const skinCtx = useSkin()
  const skin = skinOf(skinCtx.current)
  const cute = skin.id === 'changnok'
  const toggleMode = () =>
    setMode((m) => {
      const next = m === 'hanja' ? 'number' : 'hanja'
      try {
        localStorage.setItem(MODE_KEY, next)
      } catch {
        /* 저장 불가 환경이면 이번만 유지 */
      }
      return next
    })

  const commit = useCallback((next) => {
    gameRef.current = next
    setGame(next)
  }, [])

  const move = useCallback(
    (dir) => {
      const cur = gameRef.current
      const next = step(cur, dir)
      if (next === cur) return
      if (next.best > cur.best) saveBest(next.best)

      if (!started.current) {
        started.current = true
        run.start()
      }
      run.metric(next.score) // 최소 조건: 3000점 넘기기
      if (next.over) {
        started.current = false
        run.finish(next.score, { dead: true, metric: null })
      } else if (next.won && !cur.won) {
        run.won(next.score)
      }

      // 효과음: 끝 > 달성 > 합치기 > 그냥 이동
      const merged = next.tiles.filter((t) => t.isMerged)
      if (next.over) sfx.play('g2048Over')
      else if (next.won && !cur.won) sfx.play('g2048Win')
      else if (merged.length) sfx.play('g2048Merge', Math.max(...merged.map((t) => t.v)))
      else sfx.play('g2048Move')

      commit(next)
    },
    [commit, run],
  )

  const restart = useCallback(() => {
    if (started.current) run.abandon()
    started.current = false
    sfx.play('g2048Start')
    commit(createGame(gameRef.current.best))
  }, [commit, run])
  const keepGoing = () => commit({ ...gameRef.current, keepGoing: true })

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e)) return
      const dir = KEY_DIRS[e.key]
      if (!dir) return
      e.preventDefault()
      move(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  const showWin = game.won && !game.keepGoing

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <ScoreBox label="점수" value={game.score} />
          <ScoreBox label="최고" value={game.best} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            data-2048-mode={mode}
            onClick={toggleMode}
            aria-label={`표시 전환: 지금은 ${mode === 'hanja' ? '한자' : '숫자'} 버전`}
            className="inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10"
          >
            <Languages size={13} />
            {mode === 'hanja' ? '한자' : '숫자'}
          </button>
          <button
            type="button"
            data-2048-skin-btn
            onClick={() => setSkinOpen((o) => !o)}
            aria-expanded={skinOpen}
            className="inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10"
          >
            <Palette size={13} />
            스킨
          </button>
          <button
            type="button"
            data-sfx="none"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10"
          >
            <RotateCcw size={13} />
            새 판
          </button>
        </div>
      </div>

      {skinOpen && (
        <div className="mb-3 rounded-md border border-gold/25 bg-shade/30 p-3" role="region" aria-label="스킨" data-2048-skins>
          <p className="text-xs tracking-widest text-paper/55">스킨</p>
          <ul className="mt-2 space-y-1.5">
            {SKINS.map((k) => {
              const open = skinCtx.open.includes(k.id)
              const on = skin.id === k.id
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    data-skin={k.id}
                    disabled={!open}
                    onClick={() => {
                      skinCtx.set(k.id)
                      setSkinOpen(false)
                    }}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs ${on ? 'bg-gold-fill/20 ring-1 ring-gold/50' : 'bg-edge/[0.07] enabled:hover:bg-gold-fill/10'} disabled:opacity-60`}
                  >
                    <span className="mt-0.5 shrink-0 text-gold">{open ? <Palette size={14} aria-hidden /> : <Lock size={14} aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-sm text-paper">
                        {k.name}
                        {on && <span className="ml-1.5 text-[10px] text-gold">사용 중</span>}
                      </span>
                      <span className="block text-paper/60">{open ? k.desc : `업적 [${ACH_NAME[k.unlock] ?? '???'}]을(를) 달성하면 열린다.`}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div
        className={`relative aspect-square w-full touch-none ${cute ? 'rounded-2xl p-1.5' : 'rounded-md border border-gold/25 bg-shade/30 p-1'}`}
        style={cute ? { backgroundColor: skin.board.frame, boxShadow: '0 0 0 3px #fff0f4, 0 0 0 5px #f4a3bb, 0 8px 20px rgba(214, 62, 76, 0.25)' } : undefined}
        data-2048-board={skin.id}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative size-full">
          {/* 빈 칸 */}
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="absolute size-1/4 p-[3px]"
              style={{ left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }}
            >
              <div className={`size-full ${cute ? 'rounded-xl' : 'rounded bg-edge/8'}`} style={cute ? { backgroundColor: skin.board.cell } : undefined} />
            </div>
          ))}

          {/* 타일: 한자가 주인공, 왼쪽 위 구석에 아라비아 숫자를 작게 병기 (TileFace) */}
          {game.tiles.map((t) => (
            <div
              key={t.id}
              className="absolute size-1/4 p-[3px]"
              style={{
                left: `${t.c * 25}%`,
                top: `${t.r * 25}%`,
                transition: 'left 110ms ease-out, top 110ms ease-out',
              }}
            >
              <TileFace
                value={t.v}
                mode={mode}
                skin={skin.id}
                className={t.isNew ? 'tile-pop' : t.isMerged ? 'tile-merge' : ''}
              />
            </div>
          ))}
        </div>

        {cute && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
            {[8, 27, 46, 65, 84].map((x, i) => (
              <span key={x} className="petal absolute top-0" style={{ left: `${x}%`, animationDelay: `${i * 1.3}s`, animationDuration: `${7 + (i % 3)}s` }}>
                <Blossom size={9 + (i % 2) * 3} color="#f7b8cb" />
              </span>
            ))}
          </div>
        )}
        {(game.over || showWin) && (
          <div className={`absolute inset-0 z-10 grid place-items-center p-4 text-center ${cute ? 'rounded-2xl bg-[#fff0f4]/90' : 'rounded-md bg-ink/80'}`}>
            <div>
              <p className="font-serif text-xl text-gold">
                {game.over ? '부적이 가득 찼다' : '신위가 二千四十八에 닿았다'}
              </p>
              <p className="mt-1 text-sm text-paper/70">점수 {game.score}</p>
              <div className="mt-3 flex justify-center gap-2">
                {showWin && (
                  <button
                    type="button"
                    onClick={keepGoing}
                    className="rounded border border-gold/40 px-4 py-1.5 text-sm text-gold transition hover:bg-gold/10"
                  >
                    계속하기
                  </button>
                )}
                <button
                  type="button"
                  data-sfx="none"
                  onClick={restart}
                  className="rounded border border-gold bg-gold px-4 py-1.5 text-sm font-medium text-ink transition hover:brightness-110"
                >
                  새 판
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-paper/50">
        방향키 / WASD 또는 스와이프로 부적 조각을 민다. 같은 수끼리 합쳐 2048{mode === 'hanja' ? '(二千四十八)' : ''}을 만들자.
      </p>
    </div>
  )
}

const ACH_NAME = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.name]))

function ScoreBox({ label, value }) {
  return (
    <div className="min-w-16 rounded border border-edge/15 bg-shade/20 px-3 py-1 text-center">
      <p className="text-[10px] tracking-widest text-paper/50">{label}</p>
      <p className="font-serif text-base text-gold">{value}</p>
    </div>
  )
}
