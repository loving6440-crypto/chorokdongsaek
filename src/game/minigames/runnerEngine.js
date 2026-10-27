// 퇴마실습: 끝없이 달리는 러너의 규칙 (UI 와 분리한 순수 로직)
// 좌표계: 가로 x(오른쪽으로 +), 세로는 "땅에서 위로 올라간 높이"(bottom)로 다룬다.

export const W = 600 // 논리 화면 크기
export const H = 160
export const GROUND = 132 // 캔버스에서 땅의 y 좌표

export const PLAYER_X = 48
export const STAND = { w: 32, h: 26 } // 여우

const GRAVITY = 2100
const JUMP_V = -640 // 위로 향하는 속도(음수)
const MIN_JUMP_V = -260 // 점프 키를 일찍 떼면 이 속도로 잘려 낮게 뛴다
const START_SPEED = 260 // v71: 살짝 낮췄다 (이전 290)
const MAX_SPEED = 1300 // v71: 살짝 낮췄다 (이전 1440)
const ACCEL = 10 // 초당 가속 — v71: 살짝 낮췄다 (이전 12)
const SCORE_PER_PX = 1 / 12

export function createRun(best = 0) {
  return {
    status: 'ready', // ready | running | over
    t: 0,
    dist: 0,
    speed: START_SPEED,
    y: 0, // 플레이어 발 높이
    vy: 0,
    onGround: true,
    obstacles: [],
    nextGap: 260,
    sinceSpawn: 0,
    lastW: 0,
    score: 0,
    best,
    flash: 0, // 100점마다 깜빡이는 시간(초)
  }
}

export const scoreOf = (s) => Math.floor(s.dist * SCORE_PER_PX)

export function startRun(s) {
  s.status = 'running'
}

export function jump(s) {
  if (s.status === 'running' && s.onGround) {
    s.vy = JUMP_V
    s.onGround = false
    return true
  }
  return false
}

function makeObstacle(s, rand) {
  const score = scoreOf(s)
  const r = rand()
  // 150점 이후부터 낮게 떠다니는 귀화(鬼火)가 섞인다. 전부 점프 한 번으로 넘을 수 있다.
  if (score > 150 && r < 0.3) {
    const lane = [6, 20][Math.floor(rand() * 2)]
    return { type: 'fire', x: W + 10, w: 26, h: 18, bottom: lane }
  }
  if (r < 0.55) {
    return { type: 'post', x: W + 10, w: 16 + Math.floor(rand() * 8), h: 30 + Math.floor(rand() * 16), bottom: 0 }
  }
  if (r < 0.75) {
    return { type: 'jar', x: W + 10, w: 28, h: 24, bottom: 0 }
  }
  const n = rand() < 0.65 ? 2 : 3 // 장승 무리
  return { type: 'posts', x: W + 10, w: 18 * n + 4 * (n - 1), h: 28 + Math.floor(rand() * 10), bottom: 0, n }
}

export function playerBox(s) {
  const w = STAND.w
  const h = STAND.h
  const bottom = GROUND - s.y
  // 몸통보다 조금 작게 잡아 억울한 충돌을 줄인다.
  return { l: PLAYER_X + 3, r: PLAYER_X + w - 3, t: bottom - h + 4, b: bottom - 2 }
}

export function obstacleBox(o) {
  const bottom = GROUND - o.bottom
  return { l: o.x + 3, r: o.x + o.w - 3, t: bottom - o.h + 3, b: bottom - 2 }
}

const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t

/**
 * 시간을 dt 만큼 진행한다. s 를 직접 바꾸고, 이번 프레임에 일어난 일('point' | 'die')의 목록을 돌려준다.
 * input: { jumpHeld }
 */
export function step(s, dt, input, rand = Math.random) {
  const events = []
  if (s.status !== 'running') return events
  dt = Math.min(dt, 1 / 30)

  s.t += dt
  s.speed = Math.min(MAX_SPEED, s.speed + ACCEL * dt)
  s.dist += s.speed * dt
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt)

  // 플레이어
  if (!s.onGround) {
    if (!input.jumpHeld && s.vy < MIN_JUMP_V) s.vy = MIN_JUMP_V
    s.vy += GRAVITY * dt
    s.y -= s.vy * dt
    if (s.y <= 0) {
      s.y = 0
      s.vy = 0
      s.onGround = true
    }
  }

  // 장애물
  for (const o of s.obstacles) o.x -= s.speed * dt
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10)

  // 속도가 빨라지면 장애물 사이 거리가 화면 폭보다 커지므로, 화면 위치가 아니라 "달린 거리"로 간격을 잰다.
  s.sinceSpawn += s.speed * dt
  if (s.lastW === 0 || s.sinceSpawn >= s.nextGap + s.lastW) {
    const o = makeObstacle(s, rand)
    s.obstacles.push(o)
    s.sinceSpawn = 0
    s.lastW = o.w
    // 간격: 점프 한 번의 체공 시간(약 0.61초)보다 항상 넉넉한 시간차(0.95초 이상)를 둔다.
    s.nextGap = s.speed * (0.95 + rand() * 0.55) + 90 + o.w * 0.5
  }

  // 점수 / 충돌
  const before = s.score
  s.score = scoreOf(s)
  if (Math.floor(s.score / 100) > Math.floor(before / 100)) {
    s.flash = 0.7
    events.push('point')
  }
  const pb = playerBox(s)
  if (s.obstacles.some((o) => hit(pb, obstacleBox(o)))) {
    s.status = 'over'
    s.best = Math.max(s.best, s.score)
    events.push('die')
  }
  return events
}
