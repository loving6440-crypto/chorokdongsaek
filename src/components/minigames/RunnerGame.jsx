import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, RotateCcw } from 'lucide-react'
import {
  GROUND,
  H,
  PLAYER_X,
  STAND,
  W,
  createRun,
  jump,
  startRun,
  step,
} from '../../game/minigames/runnerEngine'
import { sfx } from '../../game/sfx'
import { isTypingTarget, useLesson } from '../../game/lessonContext'

const BEST_KEY = 'chorok-best-runner'
const SCALE = 2 // 캔버스 내부 해상도 배율 (선명하게)

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

// ───────── 그리기 ─────────

const COLORS = {
  skyTop: '#16296a',
  skyBottom: '#0a1434',
  moon: '#f3efe4',
  cloud: '#1f3478',
  ground: '#f4c94a',
  groundFill: '#0a1434',
  tick: '#33498f',
  hud: '#a9b6dd',
  fox: '#ec8a3c',
  foxDark: '#5b3220',
  foxLight: '#fff4e0',
  paper: '#f3e7b0',
  seal: '#d6414b',
}

const STARS = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 97 + 31) % W,
  y: (i * 53 + 11) % 70,
  r: i % 5 === 0 ? 1.4 : 0.8,
}))
const CLOUDS = [
  { x: 40, y: 22, w: 70 },
  { x: 250, y: 42, w: 54 },
  { x: 430, y: 16, w: 86 },
]

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawBackground(ctx, s) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, COLORS.skyTop)
  g.addColorStop(1, COLORS.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffffff'
  for (const st of STARS) {
    ctx.globalAlpha = 0.35
    ctx.fillRect(st.x, st.y, st.r, st.r)
  }
  ctx.globalAlpha = 1

  // 달
  ctx.fillStyle = COLORS.moon
  ctx.beginPath()
  ctx.arc(520, 30, 11, 0, Math.PI * 2)
  ctx.fill()

  // 검은 구름 (느리게 흐른다)
  ctx.fillStyle = COLORS.cloud
  for (const c of CLOUDS) {
    const x = ((c.x - s.dist * 0.12) % (W + 120) + (W + 120)) % (W + 120) - 60
    ctx.beginPath()
    ctx.ellipse(x, c.y, c.w / 2, 9, 0, 0, Math.PI * 2)
    ctx.ellipse(x - c.w / 4, c.y + 3, c.w / 3, 7, 0, 0, Math.PI * 2)
    ctx.ellipse(x + c.w / 4, c.y + 3, c.w / 3, 7, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 땅
  rect(ctx, 0, GROUND, W, H - GROUND, COLORS.groundFill)
  rect(ctx, 0, GROUND, W, 1.5, COLORS.ground)
  ctx.fillStyle = COLORS.tick
  for (let i = 0; i < 26; i++) {
    const x = (((i * 47 + 13) - s.dist) % W + W) % W
    ctx.fillRect(x, GROUND + 6 + (i % 3) * 5, 5 + (i % 4) * 3, 1.5)
  }
}

function drawPlayer(ctx, s, dead) {
  const frame = s.status === 'running' && s.onGround ? Math.floor(s.t * 14) % 2 : 0
  const airborne = !s.onGround
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h // 여우 몸 상단

  // 꼬리 (달릴 때 살랑살랑)
  const wag = airborne ? -2 : frame ? 0 : 2
  rect(ctx, x, y + 9 + wag, 9, 7, COLORS.fox)
  rect(ctx, x, y + 9 + wag, 3, 7, COLORS.foxLight) // 흰 꼬리 끝
  // 몸통 + 흰 배
  rect(ctx, x + 7, y + 10, 16, 9, COLORS.fox)
  rect(ctx, x + 11, y + 16, 10, 3, COLORS.foxLight)
  // 머리
  rect(ctx, x + 19, y + 3, 10, 10, COLORS.fox)
  rect(ctx, x + 27, y + 8, 5, 4, COLORS.fox) // 주둥이
  rect(ctx, x + 21, y + 11, 9, 2, COLORS.foxLight) // 뺨
  rect(ctx, x + 31, y + 8, 2, 2, COLORS.foxDark) // 코
  // 귀
  rect(ctx, x + 20, y, 3, 4, COLORS.fox)
  rect(ctx, x + 26, y, 3, 4, COLORS.fox)
  rect(ctx, x + 20, y, 3, 2, COLORS.foxDark)
  rect(ctx, x + 26, y, 3, 2, COLORS.foxDark)
  // 이마 부적
  rect(ctx, x + 23, y + 2, 3, 5, COLORS.paper)
  rect(ctx, x + 24, y + 3, 1, 3, COLORS.seal)
  // 눈
  if (dead) drawX(ctx, x + 26, y + 6)
  else rect(ctx, x + 27, y + 6, 2, 2, COLORS.foxDark)
  // 다리: 달릴 땐 번갈아, 공중에선 앞뒤로 쭉 뻗는다
  const legTop = y + 19
  if (airborne) {
    rect(ctx, x + 22, legTop - 1, 7, 3, COLORS.foxDark)
    rect(ctx, x + 4, legTop - 1, 7, 3, COLORS.foxDark)
  } else if (s.status !== 'running') {
    rect(ctx, x + 9, legTop, 3, 7, COLORS.foxDark)
    rect(ctx, x + 19, legTop, 3, 7, COLORS.foxDark)
  } else if (frame) {
    rect(ctx, x + 7, legTop, 3, 7, COLORS.foxDark)
    rect(ctx, x + 12, legTop, 3, 4, COLORS.foxDark)
    rect(ctx, x + 19, legTop, 3, 4, COLORS.foxDark)
    rect(ctx, x + 22, legTop, 3, 7, COLORS.foxDark)
  } else {
    rect(ctx, x + 7, legTop, 3, 4, COLORS.foxDark)
    rect(ctx, x + 12, legTop, 3, 7, COLORS.foxDark)
    rect(ctx, x + 19, legTop, 3, 7, COLORS.foxDark)
    rect(ctx, x + 22, legTop, 3, 4, COLORS.foxDark)
  }
}

function drawX(ctx, x, y) {
  ctx.strokeStyle = COLORS.seal
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 4, y + 4)
  ctx.moveTo(x + 4, y)
  ctx.lineTo(x, y + 4)
  ctx.stroke()
}

function drawPost(ctx, x, top, w, h, i) {
  rect(ctx, x, top, w, h, '#6b4423')
  rect(ctx, x + 2, top + 2, 3, h - 4, '#7a5230') // 나뭇결
  rect(ctx, x - 1, top - 3, w + 2, 5, '#4d2f17') // 머리 갓
  rect(ctx, x + 3, top + 8, 3, 3, '#e8d9b8') // 눈
  rect(ctx, x + w - 6, top + 8, 3, 3, '#e8d9b8')
  rect(ctx, x + w / 2 - 2, top + 15, 4, 2, '#b0243a') // 입
  if (i % 2) rect(ctx, x, top + h - 6, w, 2, '#4d2f17')
}

function drawObstacle(ctx, o, time) {
  const bottom = GROUND - o.bottom
  const top = bottom - o.h
  if (o.type === 'post') {
    drawPost(ctx, o.x, top, o.w, o.h, 0)
  } else if (o.type === 'posts') {
    for (let i = 0; i < o.n; i++) {
      const pw = 18
      const trim = (i % 2) * 4
      drawPost(ctx, o.x + i * (pw + 4), top + trim, pw, o.h - trim, i)
    }
  } else if (o.type === 'jar') {
    ctx.fillStyle = '#8a5a3c'
    ctx.beginPath()
    ctx.ellipse(o.x + o.w / 2, top + o.h * 0.62, o.w / 2, o.h * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    rect(ctx, o.x + o.w * 0.3, top, o.w * 0.4, o.h * 0.3, '#8a5a3c') // 목
    rect(ctx, o.x + o.w * 0.24, top - 1, o.w * 0.52, 3, '#5c3a24') // 입술
    rect(ctx, o.x + o.w * 0.2, top + o.h * 0.55, o.w * 0.6, 2, '#c9a227') // 금띠
  } else {
    // 귀화(鬼火): 일렁이는 푸른 불꽃
    const cx = o.x + o.w / 2
    const cy = top + o.h / 2 + Math.sin(time * 9 + o.x * 0.05) * 1.5
    ctx.fillStyle = 'rgba(56,189,248,0.85)'
    ctx.beginPath()
    ctx.ellipse(cx - 2, cy, o.w * 0.34, o.h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath() // 꼬리
    ctx.moveTo(cx + 6, cy - 6)
    ctx.lineTo(cx + 18 + Math.sin(time * 14) * 3, cy)
    ctx.lineTo(cx + 6, cy + 6)
    ctx.fill()
    ctx.fillStyle = '#e0f7ff'
    ctx.beginPath()
    ctx.ellipse(cx - 4, cy + 1, o.w * 0.16, o.h * 0.26, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHud(ctx, s) {
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.hud
  const pad = (n) => String(n).padStart(5, '0')
  const blink = s.flash > 0 && Math.floor(s.flash * 8) % 2 === 0
  ctx.fillText(`HI ${pad(s.best)}   ${blink ? '     ' : pad(s.score)}`, W - 12, 20)
}

function drawCenterText(ctx, title, sub) {
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d8d0c0'
  ctx.font = '600 17px "Noto Serif KR", serif'
  ctx.fillText(title, W / 2, 66)
  ctx.fillStyle = COLORS.hud
  ctx.font = '12px "Noto Sans KR", sans-serif'
  ctx.fillText(sub, W / 2, 88)
}

function draw(ctx, s, time) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  drawBackground(ctx, s)
  for (const o of s.obstacles) drawObstacle(ctx, o, time)
  drawPlayer(ctx, s, s.status === 'over')
  drawHud(ctx, s)
  if (s.status === 'ready') drawCenterText(ctx, '퇴마 실습', 'Space · ↑ · 화면 터치로 시작')
  if (s.status === 'over') drawCenterText(ctx, '퇴마 실패', 'Space · ↑ · 화면 터치로 다시 시작')
}

// ───────── 컴포넌트 ─────────

export default function RunnerGame() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  if (stateRef.current === null) stateRef.current = createRun(loadBest())
  const input = useRef({ jumpHeld: false })
  const overAt = useRef(0)
  const [status, setStatus] = useState('ready')
  const run = useLesson()

  /** 점프 입력: 대기/종료 화면이면 시작·재시작, 달리는 중이면 점프. */
  const press = useCallback(() => {
    input.current.jumpHeld = true
    const s = stateRef.current
    if (s.status === 'ready') {
      run.start()
      startRun(s)
      sfx.play('runStart')
      jump(s)
      setStatus('running')
    } else if (s.status === 'over') {
      if (performance.now() - overAt.current < 450) return // 부딪힌 직후의 연타는 무시
      run.start()
      const fresh = createRun(s.best)
      startRun(fresh)
      stateRef.current = fresh
      sfx.play('runStart')
      setStatus('running')
    } else if (jump(s)) {
      sfx.play('jump')
    }
  }, [run])
  const release = useCallback(() => {
    input.current.jumpHeld = false
  }, [])

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let last = performance.now()
    const frame = (now) => {
      const dt = (now - last) / 1000
      last = now
      const s = stateRef.current
      for (const ev of step(s, dt, input.current)) {
        if (ev === 'point') sfx.play('point')
        if (ev === 'point' || ev === 'die') run.metric(s.score)
        if (ev === 'die') {
          run.finish(s.score, { dead: true })
          sfx.play('crash')
          saveBest(s.best)
          overAt.current = performance.now()
          setStatus('over')
        }
      }
      draw(ctx, s, now / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [run])

  // 키보드
  useEffect(() => {
    const isJump = (k) => k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W'
    const down = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e)) return
      if (isJump(e.key)) {
        e.preventDefault()
        if (!e.repeat) press()
      }
    }
    const up = (e) => {
      if (isJump(e.key)) release()
    }
    const blur = () => {
      release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [press, release])

  const holdProps = (onDown, onUp) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      onDown()
    },
    onPointerUp: onUp,
    onPointerLeave: onUp,
    onPointerCancel: onUp,
  })

  return (
    <div className="mx-auto w-full max-w-2xl">
      <canvas
        ref={canvasRef}
        width={W * SCALE}
        height={H * SCALE}
        role="img"
        aria-label="퇴마 실습 러닝 게임 화면"
        className="block w-full touch-none rounded-md border border-gold/30"
        style={{ aspectRatio: `${W} / ${H}` }}
        {...holdProps(press, release)}
      />

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          data-sfx="none"
          aria-label="점프"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-gold/30 text-sm text-gold transition hover:bg-gold/10 active:bg-gold/20"
          {...holdProps(press, release)}
        >
          <ArrowUp size={15} />
          점프
        </button>
        {status === 'over' && (
          <button
            type="button"
            data-sfx="none"
            onClick={press}
            className="inline-flex h-10 items-center gap-1.5 rounded border border-gold bg-gold px-4 text-sm font-medium text-ink transition hover:brightness-110"
          >
            <RotateCcw size={14} />
            다시
          </button>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-paper/50">
        Space / ↑ 점프(길게 누르면 더 높이) · 장승·항아리·귀화는 모두 점프로 넘을 수 있다. 달릴수록 점점 빨라진다.
      </p>
    </div>
  )
}
