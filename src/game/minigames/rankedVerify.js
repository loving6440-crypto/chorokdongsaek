// v-B.15 랭킹 검증 (서버 · 브라우저 공용 순수 로직)
//
// 랭킹 점수는 더 이상 "브라우저가 보낸 숫자"를 믿지 않는다.
//  1) 판을 시작할 때 서버가 세션(sid)과 난수 씨앗(seed)을 발급한다.
//  2) 브라우저는 그 씨앗으로 판을 만들고, 판 진행 기록(proof)을 남긴다.
//  3) 제출하면 서버가 같은 씨앗과 기록으로 판을 처음부터 다시 돌려(재현) 점수를 직접 계산한다.
//     재현이 불가능한 실시간 게임(퇴마실습 러너)은 서버가 잰 경과 시간으로 낼 수 있는 점수의 상한을 건다.
//
// 이 파일은 외부 의존성이 없어 서버(node)와 브라우저(vite)가 똑같이 불러 쓴다.
// 한계: 자동 입력 프로그램(봇)이 실제로 판을 플레이하는 것까지는 막지 못한다. 막는 것은
// "해당 씨앗으로 실제로 도달할 수 없는 점수"와 "흐른 시간보다 빠른 기록"이다.

import { createGame, step as step2048 } from './logic2048.js'
import { initGame, reducer as tetrisReducer, dropInterval } from './logicTetris.js'
import { buildDeck, clearBonus, comboBonus, isMatch, PAIR_SCORE, stageConfig } from './hwatu.js'
import { TYPING_SENTENCES } from './typingSentences.js'
import { countKeystrokes } from './typingMetrics.js'
import { ACCEL, MAX_SPEED, SCORE_PER_PX, START_SPEED } from './runnerEngine.js'

export const RANKED_COURSES = ['talisman-2048', 'spell-typing', 'ward-tetris', 'folklore-spot', 'exorcism-space']

/** mulberry32 — 씨앗이 같으면 서버와 브라우저에서 같은 수열이 나온다. */
export function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fail = (error) => ({ ok: false, error })
const ok = (score, extra = {}) => ({ ok: true, score: Math.max(0, Math.floor(score)), ...extra })

// ───────── 부적학 2048: 이동 기록 완전 재현 ─────────
export const MOVE_CODE_2048 = { left: 'l', right: 'r', up: 'u', down: 'd' }
const CODE_MOVE_2048 = { l: 'left', r: 'right', u: 'up', d: 'down' }
export const MAX_2048_MOVES = 60_000
/** 2048 판의 첫 상태. 브라우저와 서버가 이 함수로 같은 판을 만든다. */
export const seeded2048 = (seed, best = 0) => {
  const rand = seededRandom(seed)
  return { game: createGame(best, rand), rand }
}
export function verify2048(seed, proof, elapsedMs) {
  const moves = typeof proof?.moves === 'string' ? proof.moves : ''
  if (!moves || moves.length > MAX_2048_MOVES || !/^[lrudk]+$/.test(moves)) return fail('bad-proof')
  const realMoves = moves.replace(/k/g, '').length
  if (realMoves > Math.max(0, elapsedMs) / 1000 * 20 + 20) return fail('too-fast')
  const { game: first, rand } = seeded2048(seed)
  let game = first
  for (const ch of moves) {
    if (ch === 'k') {
      if (!game.won || game.keepGoing) return fail('bad-proof')
      game = { ...game, keepGoing: true }
      continue
    }
    const next = step2048(game, CODE_MOVE_2048[ch], rand)
    if (next === game) return fail('replay-mismatch') // 브라우저는 실제로 바뀐 수만 기록한다
    game = next
  }
  return ok(game.score, { over: game.over })
}

// ───────── 결계학 테트리스: 조작 기록 완전 재현 ─────────
export const ACTION_CODE_TETRIS = { left: 'l', right: 'r', rotate: 'o', rotateCCW: 'c', tick: 't', soft: 's', hard: 'h', hold: 'g' }
const CODE_ACTION_TETRIS = Object.fromEntries(Object.entries(ACTION_CODE_TETRIS).map(([k, v]) => [v, k]))
export const MAX_TETRIS_ACTIONS = 150_000
export function verifyTetris(seed, proof, elapsedMs) {
  const actions = typeof proof?.actions === 'string' ? proof.actions : ''
  if (!actions || actions.length > MAX_TETRIS_ACTIONS || !/^[lroctshg]+$/.test(actions)) return fail('bad-proof')
  if (actions.length > Math.max(0, elapsedMs) / 1000 * 30 + 60) return fail('too-fast')
  let state = tetrisReducer(initGame(seed >>> 0), { type: 'start' })
  let minGravityMs = 0
  for (const ch of actions) {
    const type = CODE_ACTION_TETRIS[ch]
    if (!type) return fail('bad-proof')
    if (state.status !== 'playing') return fail('replay-mismatch')
    if (type === 'tick') minGravityMs += dropInterval(state.level)
    const next = tetrisReducer(state, { type })
    if (next === state) return fail('replay-mismatch')
    state = next
  }
  // 중력(tick)은 레벨별 간격보다 빨리 올 수 없다. 30% 여유를 두고 서버가 잰 시간과 비교한다.
  if (minGravityMs * 0.7 > elapsedMs + 2000) return fail('too-fast')
  return ok(state.score, { over: state.status === 'over' })
}

// ───────── 주술학 타자: 서버가 정한 문장 순서 + 문장별 시간 ─────────
export const TYPING_ROUND = 10
export const TYPING_CPM_CAP = 1000 // 사람이 낼 수 있는 한국어 타수의 넉넉한 상한(분당)
export function typingQueue(seed) {
  const rand = seededRandom(seed)
  const a = [...TYPING_SENTENCES]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, TYPING_ROUND)
}
export const typingCpm = (target, typed, ms) =>
  typed === target ? countKeystrokes(target) / (Math.max(ms, 300) / 60000) : 0
export function verifyTyping(seed, proof, elapsedMs) {
  const entries = Array.isArray(proof?.entries) ? proof.entries : null
  if (!entries || entries.length !== TYPING_ROUND) return fail('bad-proof')
  const queue = typingQueue(seed)
  let totalMs = 0
  const speeds = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const typed = typeof e?.text === 'string' ? e.text.normalize('NFC').trim().slice(0, 300) : null
    const ms = Number(e?.ms)
    if (typed === null || !Number.isFinite(ms) || ms < 0 || ms > 600_000) return fail('bad-proof')
    const cpm = typingCpm(queue[i], typed, ms)
    if (cpm > TYPING_CPM_CAP) return fail('too-fast')
    totalMs += Math.max(ms, 300)
    speeds.push(cpm)
  }
  if (totalMs > elapsedMs + 3000) return fail('too-fast')
  return ok(Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length))
}

// ───────── 민속학 화투: 판별 패 배치 재현 + 뒤집기 기록 ─────────
const HWATU_MATCH_MS = 420
const HWATU_MISS_MS = 950
export const MAX_HWATU_STAGES = 60
/** 같은 씨앗에서 판(stage)마다 차례로 덱을 뽑는 생성기. */
export function hwatuDecks(seed) {
  const rand = seededRandom(seed)
  return (stage) => buildDeck(stage, rand)
}
export function verifyHwatu(seed, proof, elapsedMs) {
  const stages = Array.isArray(proof?.stages) ? proof.stages : null
  if (!stages || !stages.length || stages.length > MAX_HWATU_STAGES) return fail('bad-proof')
  const next = hwatuDecks(seed)
  let score = 0
  let totalSeconds = 0
  let cleared = 0
  for (let si = 0; si < stages.length; si++) {
    const stage = si + 1
    const deck = next(stage)
    const cfg = stageConfig(stage)
    const flips = Array.isArray(stages[si]?.flips) ? stages[si].flips : null
    const seconds = Math.floor(Number(stages[si]?.seconds))
    if (!flips || flips.length > deck.length * 4 || !(seconds >= 0) || seconds > 3600) return fail('bad-proof')
    let chances = cfg.chances
    let combo = 0
    let waitMs = 0
    let done = null
    const matched = new Set()
    for (let i = 0; i + 1 < flips.length; i += 2) {
      if (done) return fail('replay-mismatch')
      const a = deck.find((c) => c.id === flips[i])
      const b = deck.find((c) => c.id === flips[i + 1])
      if (!a || !b || a.id === b.id || matched.has(a.id) || matched.has(b.id)) return fail('replay-mismatch')
      if (isMatch(a, b)) {
        matched.add(a.id)
        matched.add(b.id)
        combo++
        waitMs += HWATU_MATCH_MS
        score += PAIR_SCORE + comboBonus(combo)
        if (matched.size === deck.length) {
          // 판정 지연(맞음 0.42초 · 틀림 0.95초)보다 짧게 끝낼 수는 없으므로, 보너스 시간은 그 하한 아래로 내려가지 않는다.
          score += clearBonus(stage, chances, Math.max(seconds, Math.ceil(waitMs / 1000)))
          done = 'clear'
        }
      } else {
        waitMs += HWATU_MISS_MS
        combo = 0
        chances--
        if (chances <= 0) done = 'over'
      }
    }
    if (flips.length % 2) return fail('bad-proof')
    totalSeconds += seconds
    if (done === 'clear') cleared++
    const last = si === stages.length - 1
    if (!last && done !== 'clear') return fail('replay-mismatch') // 다음 판은 이번 판을 깨야만 열린다
  }
  if (totalSeconds > elapsedMs / 1000 + 5) return fail('too-fast')
  return ok(score, { cleared })
}

// ───────── 퇴마실습 러너: 서버 경과 시간 기반 점수 상한 ─────────
const RUNNER_MAX_T = (MAX_SPEED - START_SPEED) / ACCEL
const runnerIntegral = (t) => {
  if (t <= 0) return 0
  if (t <= RUNNER_MAX_T) return START_SPEED * t + (ACCEL * t * t) / 2
  return START_SPEED * RUNNER_MAX_T + (ACCEL * RUNNER_MAX_T * RUNNER_MAX_T) / 2 + MAX_SPEED * (t - RUNNER_MAX_T)
}
const RUNNER_STEP = 1 / 30 // runnerEngine.step 이 한 번에 진행하는 최대 시간
/** 달린 시간 t 초 동안 낼 수 있는 점수 범위(프레임 간격 차이 포함). */
export function runnerScoreRange(t) {
  const lo = Math.floor(runnerIntegral(t) * SCORE_PER_PX)
  const hi = Math.floor((runnerIntegral(t + RUNNER_STEP) - runnerIntegral(RUNNER_STEP)) * SCORE_PER_PX)
  return { lo, hi }
}
export function verifyRunner(_seed, proof, elapsedMs, claimed) {
  const t = Number(proof?.t)
  const score = Math.floor(Number(claimed))
  if (!Number.isFinite(t) || t < 0 || t > 6 * 3600 || !Number.isFinite(score) || score < 0) return fail('bad-proof')
  if (t > elapsedMs / 1000 + 1.5) return fail('too-fast')
  const { lo, hi } = runnerScoreRange(t)
  if (score > hi + 1 || score < lo - 2) return fail('replay-mismatch')
  return ok(score)
}

const VERIFIERS = {
  'talisman-2048': verify2048,
  'ward-tetris': verifyTetris,
  'spell-typing': verifyTyping,
  'folklore-spot': verifyHwatu,
  'exorcism-space': verifyRunner,
}
/** 과목별 검증. 반환 { ok:true, score } 또는 { ok:false, error } */
export function verifyRankedRun(course, seed, proof, elapsedMs, claimedScore) {
  const fn = VERIFIERS[course]
  if (!fn) return fail('unknown-course')
  try {
    return fn(seed >>> 0, proof, Math.max(0, Number(elapsedMs) || 0), claimedScore)
  } catch {
    return fail('bad-proof')
  }
}
