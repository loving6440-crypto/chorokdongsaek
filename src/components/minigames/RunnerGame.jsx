import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Lock, Palette, RotateCcw } from 'lucide-react'
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
import { isTypingTarget, useLesson, useSkin } from '../../game/lessonContext'
import { ACHIEVEMENTS } from '../../game/achievements'
import { SKINS_RUNNER, skinRunnerOf } from '../../game/skinsRunner'

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
  bloom: '#f4adc3',
  bloomDark: '#d6414b',
  bloomCenter: '#fff0f4',
  flame: 'rgba(56,189,248,0.9)',
  flameCore: '#e0f7ff',
  flameDim: 'rgba(56,189,248,0.35)',
  rabbit: '#8a5a3c',
  rabbitDark: '#5c3a24',
  rabbitCream: '#f3e7d6',
  duck: '#191919',
  duckBeak: '#f0a82e',
  duckFeet: '#f0a82e',
  pot: '#b8622f',
  potDark: '#8a451f',
  leaf: '#4c8f52',
  leafDark: '#366338',
  shoe: '#7a5230',
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

/** 캐릭터를 그린다. 기본은 여우이나, 스킨에 따라 완전히 다른 도트로 바뀐다. */
function drawPlayer(ctx, s, dead, time, skinId) {
  switch (skinId) {
    case 'changnok-bloom':
      return drawBloom(ctx, s, dead, time)
    case 'dokkaebi-fire':
      return drawFlameRunner(ctx, s, dead, time)
    case 'wheat-rabbit':
      return drawRabbit(ctx, s, dead)
    case 'ugly-duckling':
      return drawDuckling(ctx, s, dead)
    case 'walking-plant':
      return drawWalkingPlant(ctx, s, dead)
    default:
      return drawFox(ctx, s, dead)
  }
}

function runLegs(ctx, x, legTop, frame, airborne, running, color) {
  if (airborne) {
    rect(ctx, x + 22, legTop - 1, 7, 3, color)
    rect(ctx, x + 4, legTop - 1, 7, 3, color)
  } else if (!running) {
    rect(ctx, x + 9, legTop, 3, 7, color)
    rect(ctx, x + 19, legTop, 3, 7, color)
  } else if (frame) {
    rect(ctx, x + 7, legTop, 3, 7, color)
    rect(ctx, x + 12, legTop, 3, 4, color)
    rect(ctx, x + 19, legTop, 3, 4, color)
    rect(ctx, x + 22, legTop, 3, 7, color)
  } else {
    rect(ctx, x + 7, legTop, 3, 4, color)
    rect(ctx, x + 12, legTop, 3, 7, color)
    rect(ctx, x + 19, legTop, 3, 7, color)
    rect(ctx, x + 22, legTop, 3, 4, color)
  }
}

function drawFox(ctx, s, dead) {
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
  runLegs(ctx, x, y + 19, frame, airborne, s.status === 'running', COLORS.foxDark)
}

/** [창록 교화] 스킨: 눈코입 없이 데굴데굴 굴러가는 벚꽃 한 송이. */
function drawBloom(ctx, s, dead, time) {
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h
  const cx = x + STAND.w / 2 - 2
  const cy = y + STAND.h / 2 + 2
  const r = 11
  const angle = dead ? 0 : (s.dist ?? time * 60) * 0.06
  ctx.save()
  ctx.translate(cx, cy)
  if (!dead) ctx.rotate(angle)
  else ctx.scale(1.15, 0.8) // 쓰러지면 살짝 짜부라진다
  ctx.fillStyle = COLORS.bloom
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  // 다섯 꽃잎 자국
  ctx.fillStyle = COLORS.bloomDark
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 3.2, 1.7, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = COLORS.bloomCenter
  ctx.beginPath()
  ctx.arc(0, 0, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** [도깨비불] 스킨: 얼굴 없이 그저 활활 타오르는 청록빛 불꽃. */
function drawFlameRunner(ctx, s, dead, time) {
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h
  const cx = x + STAND.w / 2 - 1
  const cy = y + STAND.h / 2 + 3
  const flick = dead ? 0 : Math.sin(time * 9 + cx * 0.05) * 1.6
  const sway = dead ? 0 : Math.sin(time * 14) * 2.5
  ctx.fillStyle = dead ? COLORS.flameDim : COLORS.flame
  ctx.beginPath()
  ctx.ellipse(cx - 2, cy + flick, 8.5, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  // 위로 솟는 불꼬리
  ctx.beginPath()
  ctx.moveTo(cx - 4, cy - 10 + flick)
  ctx.quadraticCurveTo(cx + 6 + sway, cy - 16 - flick, cx - 1, cy - 20 - flick)
  ctx.quadraticCurveTo(cx - 6, cy - 14 - flick, cx - 4, cy - 10 + flick)
  ctx.fill()
  if (!dead) {
    ctx.fillStyle = COLORS.flameCore
    ctx.beginPath()
    ctx.ellipse(cx - 3, cy + 3 + flick * 0.6, 3.4, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** [황금빛 밀밭] 스킨: 귀가 축 늘어진 갈색 롭이어 토끼. */
function drawRabbit(ctx, s, dead) {
  const frame = s.status === 'running' && s.onGround ? Math.floor(s.t * 14) % 2 : 0
  const airborne = !s.onGround
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h
  const earDroop = airborne ? -3 : 0
  // 늘어진 귀
  rect(ctx, x + 18, y - 2 + earDroop, 4, 11, COLORS.rabbit)
  rect(ctx, x + 24, y - 2 + earDroop, 4, 11, COLORS.rabbit)
  rect(ctx, x + 19, y - 1 + earDroop, 2, 8, COLORS.rabbitCream)
  rect(ctx, x + 25, y - 1 + earDroop, 2, 8, COLORS.rabbitCream)
  // 꼬리 (동글동글)
  rect(ctx, x + 1, y + 11, 5, 5, COLORS.rabbitCream)
  // 몸통
  rect(ctx, x + 6, y + 9, 17, 10, COLORS.rabbit)
  rect(ctx, x + 10, y + 15, 10, 3, COLORS.rabbitCream)
  // 머리
  rect(ctx, x + 19, y + 7, 10, 9, COLORS.rabbit)
  rect(ctx, x + 26, y + 11, 4, 3, COLORS.rabbit) // 주둥이
  rect(ctx, x + 21, y + 13, 8, 2, COLORS.rabbitCream) // 뺨
  // 눈
  if (dead) drawX(ctx, x + 25, y + 9)
  else rect(ctx, x + 26, y + 9, 2, 2, COLORS.rabbitDark)
  // 다리
  runLegs(ctx, x, y + 19, frame, airborne, s.status === 'running', COLORS.rabbitDark)
}

/** [미운 오리] 스킨: 아장아장 뛰어다니는 새까만 새끼 오리. */
function drawDuckling(ctx, s, dead) {
  const frame = s.status === 'running' && s.onGround ? Math.floor(s.t * 14) % 2 : 0
  const airborne = !s.onGround
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h
  // 몸통
  rect(ctx, x + 6, y + 9, 18, 11, COLORS.duck)
  // 머리
  rect(ctx, x + 20, y + 2, 10, 10, COLORS.duck)
  // 귀여운 꼬리깃
  rect(ctx, x + 2, y + 9, 5, 4, COLORS.duck)
  // 부리
  rect(ctx, x + 28, y + 7, 5, 3, COLORS.duckBeak)
  // 눈
  if (dead) drawX(ctx, x + 27, y + 5)
  else rect(ctx, x + 28, y + 5, 2, 2, '#ffffff')
  // 발
  runLegs(ctx, x, y + 20, frame, airborne, s.status === 'running', COLORS.duckFeet)
}

/** [걷는 식물] 스킨: 화분에 짧고 동그란 발(신발)이 달려 뛰어다닌다. */
function drawWalkingPlant(ctx, s, dead) {
  const frame = s.status === 'running' && s.onGround ? Math.floor(s.t * 14) % 2 : 0
  const airborne = !s.onGround
  const x = PLAYER_X
  const y = GROUND - s.y - STAND.h
  const tilt = dead ? 4 : 0
  // 이파리 (달릴 때 살짝 흔들)
  const sway = airborne ? -2 : frame ? 1 : -1
  rect(ctx, x + 10 + sway + tilt, y, 4, 9, COLORS.leaf)
  rect(ctx, x + 16, y - 2 + tilt, 4, 11, COLORS.leaf)
  rect(ctx, x + 21 - sway + tilt, y + 1, 4, 8, COLORS.leaf)
  rect(ctx, x + 15, y + 2 + tilt, 3, 4, COLORS.leafDark)
  // 화분 (사다리꼴 느낌을 두 단으로)
  rect(ctx, x + 8, y + 9, 18, 4, COLORS.pot)
  rect(ctx, x + 10, y + 13, 14, 6, COLORS.potDark)
  // 짧고 동그란 발(신발)
  if (!airborne) {
    const bob = frame ? 1 : -1
    ctx.fillStyle = COLORS.shoe
    ctx.beginPath()
    ctx.ellipse(x + 13, y + 22 + bob, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 23, y + 22 - bob, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = COLORS.shoe
    ctx.beginPath()
    ctx.ellipse(x + 10, y + 21, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 26, y + 21, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
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

function draw(ctx, s, time, skinId) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  drawBackground(ctx, s)
  for (const o of s.obstacles) drawObstacle(ctx, o, time)
  drawPlayer(ctx, s, s.status === 'over', time, skinId)
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
  const [skinOpen, setSkinOpen] = useState(false)
  const run = useLesson()
  const skinCtx = useSkin()
  const skin = skinRunnerOf(skinCtx.current)

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

  const skinIdRef = useRef(skin.id)
  skinIdRef.current = skin.id

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
      draw(ctx, s, now / 1000, skinIdRef.current)
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
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          data-runner-skin-btn
          onClick={() => setSkinOpen((o) => !o)}
          aria-expanded={skinOpen}
          className="inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10"
        >
          <Palette size={13} />
          스킨
        </button>
      </div>

      {skinOpen && (
        <div className="mb-3 rounded-md border border-gold/25 bg-shade/30 p-3" role="region" aria-label="스킨" data-runner-skins>
          <p className="text-xs tracking-widest text-paper/55">스킨</p>
          <ul className="mt-2 space-y-1.5">
            {SKINS_RUNNER.map((k) => {
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

const ACH_NAME = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.name]))
