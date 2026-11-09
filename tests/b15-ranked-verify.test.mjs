import test from 'node:test'
import assert from 'node:assert/strict'
import { step } from '../src/game/minigames/logic2048.js'
import { initGame, reducer } from '../src/game/minigames/logicTetris.js'
import { stageConfig } from '../src/game/minigames/hwatu.js'
import { countKeystrokes } from '../src/game/minigames/typingMetrics.js'
import {
  ACTION_CODE_TETRIS, MOVE_CODE_2048, hwatuDecks, runnerScoreRange, seeded2048, seededRandom,
  typingQueue, verify2048, verifyHwatu, verifyRankedRun, verifyRunner, verifyTetris, verifyTyping,
} from '../src/game/minigames/rankedVerify.js'

const DIRS = ['left', 'up', 'right', 'down']

/** 브라우저(Game2048.jsx)와 같은 방식으로 판을 두고 기록을 남긴다. */
function play2048(seed, maxMoves = 400) {
  const { game: first, rand } = seeded2048(seed)
  let game = first
  let moves = ''
  const pick = seededRandom(seed ^ 0xabcdef)
  for (let i = 0; i < maxMoves * 4 && !game.over && moves.length < maxMoves; i++) {
    const dir = DIRS[Math.floor(pick() * 4)]
    const next = step(game, dir, rand)
    if (next === game) continue
    moves += MOVE_CODE_2048[dir]
    game = next
  }
  return { moves, score: game.score }
}

test('B15 2048: 서버 재현 점수 = 실제 판 점수, 조작한 기록은 거절', () => {
  const { moves, score } = play2048(12345)
  assert.ok(score > 0)
  const v = verify2048(12345, { moves }, 60_000)
  assert.equal(v.ok, true)
  assert.equal(v.score, score)
  // 다른 씨앗으로는 같은 기록이 재현되지 않는다(타일 배치가 달라 무효 이동이 생기거나 점수가 다르다).
  const other = verify2048(54321, { moves }, 60_000)
  assert.ok(!other.ok || other.score !== score)
  // 시간보다 빠른 이동
  assert.equal(verify2048(12345, { moves }, 1000).error, 'too-fast')
  assert.equal(verify2048(12345, { moves: 'xyz' }, 60_000).error, 'bad-proof')
  assert.equal(verify2048(12345, {}, 60_000).error, 'bad-proof')
})

test('B15 테트리스: 조작 기록 재현, 중력보다 빠른 기록·불가능한 조작은 거절', () => {
  const seed = 777
  let st = reducer(initGame(seed), { type: 'start' })
  let log = ''
  const pick = seededRandom(99)
  const pool = ['left', 'right', 'rotate', 'tick', 'tick', 'soft', 'hard', 'hold']
  for (let i = 0; i < 3000 && st.status === 'playing'; i++) {
    const type = pool[Math.floor(pick() * pool.length)]
    const next = reducer(st, { type })
    if (next === st) continue
    log += ACTION_CODE_TETRIS[type]
    st = next
  }
  const v = verifyTetris(seed, { actions: log }, 10 * 60_000)
  assert.equal(v.ok, true)
  assert.equal(v.score, st.score)
  assert.equal(verifyTetris(seed, { actions: log }, 500).error, 'too-fast')
  // 첫 조각을 왼쪽 끝 너머로 20번 미는 것은 불가능 → 무효 이동
  assert.equal(verifyTetris(seed, { actions: 'l'.repeat(20) }, 60_000).error, 'replay-mismatch')
})

test('B15 타자: 서버가 정한 문장만 인정, 사람 한계를 넘는 속도와 흐른 시간보다 긴 기록은 거절', () => {
  const seed = 2026
  const queue = typingQueue(seed)
  assert.equal(queue.length, 10)
  assert.deepEqual(typingQueue(seed), queue) // 같은 씨앗 → 같은 문장
  const entries = queue.map((text) => ({ text, ms: Math.round(countKeystrokes(text) / 400 * 60000) }))
  const v = verifyTyping(seed, { entries }, 10 * 60_000)
  assert.equal(v.ok, true)
  assert.ok(Math.abs(v.score - 400) <= 2)
  // 한 문장 오타 → 그 문장은 0타로 계산된다(브라우저와 같은 규칙)
  const typo = entries.map((e, i) => (i === 0 ? { ...e, text: e.text + '!' } : e))
  assert.ok(verifyTyping(seed, { entries: typo }, 10 * 60_000).score < v.score)
  // 다른 문장(자기가 고른 쉬운 문장)으로 바꾸면 인정되지 않는다
  const swapped = entries.map((e, i) => (i === 0 ? { ...e, text: typingQueue(seed + 1)[0] } : e))
  assert.ok(verifyTyping(seed, { entries: swapped }, 10 * 60_000).score < v.score)
  const fast = queue.map((text) => ({ text, ms: 400 }))
  assert.equal(verifyTyping(seed, { entries: fast }, 10 * 60_000).error, 'too-fast')
  assert.equal(verifyTyping(seed, { entries }, 5000).error, 'too-fast')
  assert.equal(verifyTyping(seed, { entries: entries.slice(0, 3) }, 60_000).error, 'bad-proof')
})

test('B15 화투: 판별 패 배치를 재현하고 짝 맞추기·보너스를 서버가 계산', () => {
  const seed = 31337
  const decks = hwatuDecks(seed)
  const stages = []
  for (let stage = 1; stage <= 2; stage++) {
    const deck = decks(stage)
    const byMonth = {}
    for (const c of deck) (byMonth[c.month] ??= []).push(c.id)
    const flips = Object.values(byMonth).flat()
    stages.push({ flips, seconds: stageConfig(stage).months * 2 })
  }
  const v = verifyHwatu(seed, { stages }, 10 * 60_000)
  assert.equal(v.ok, true)
  assert.equal(v.cleared, 2)
  assert.ok(v.score > 0)
  // 시간을 0초로 속여도 판정 지연(짝 6~8개 × 0.42초) 하한 아래로는 보너스가 늘지 않는다
  const cheat = verifyHwatu(seed, { stages: stages.map((s) => ({ ...s, seconds: 0 })) }, 10 * 60_000)
  const floor = verifyHwatu(seed, { stages: stages.map((s) => ({ ...s, seconds: Math.ceil(s.flips.length / 2 * 0.42) })) }, 10 * 60_000)
  assert.equal(cheat.score, floor.score)
  // 흐른 시간보다 긴 플레이 시간 주장
  assert.equal(verifyHwatu(seed, { stages }, 5000).error, 'too-fast')
  // 없는 패를 뒤집은 기록
  assert.equal(verifyHwatu(seed, { stages: [{ flips: ['99-0', '99-1'], seconds: 3 }] }, 60_000).error, 'replay-mismatch')
  // 다른 씨앗의 기록은 다른 배치라 통하지 않는다
  assert.equal(verifyHwatu(seed + 1, { stages }, 10 * 60_000).ok && verifyHwatu(seed + 1, { stages }, 10 * 60_000).cleared === 2, false)
})

test('B15 러너: 서버가 잰 시간으로 낼 수 있는 점수만 인정', () => {
  const { lo, hi } = runnerScoreRange(30)
  assert.ok(hi >= lo && lo > 0)
  assert.equal(verifyRunner(0, { t: 30 }, 31_000, lo).ok, true)
  assert.equal(verifyRunner(0, { t: 30 }, 31_000, hi + 500).error, 'replay-mismatch')
  assert.equal(verifyRunner(0, { t: 300 }, 31_000, runnerScoreRange(300).lo).error, 'too-fast')
  assert.equal(verifyRankedRun('unknown', 1, {}, 1, 1).error, 'unknown-course')
})
