import test from 'node:test'
import assert from 'node:assert/strict'
import { walk, resumeWalk, branchOptions, START } from '../src/game/yut.js'

const at = (pos, steps) => walk(pos, steps)
const chosen = (corner, steps, way) => resumeWalk(corner, steps, way)

test('5번 꼭짓점을 지나치는 말은 정지하거나 지름길 선택을 요구하지 않고 직진한다', () => {
  assert.deepEqual(at(4, 1), { done: true, pos: 5 })
  assert.deepEqual(at(4, 2), { done: true, pos: 6 })
  assert.deepEqual(at(3, 4), { done: true, pos: 7 })
})

test('10번 꼭짓점을 통과할 때도 자동 직진한다', () => {
  assert.deepEqual(at(9, 1), { done: true, pos: 10 })
  assert.deepEqual(at(9, 3), { done: true, pos: 12 })
})

test('5·10·중앙에 정확히 멈춘 말만 다음 던지기의 출발에서 방향을 선택한다', () => {
  for (const [corner, choices] of [[5, ['straight', 'short']], [10, ['straight', 'short']], [22, ['to15', 'to0']]]) {
    assert.deepEqual(at(corner, 2), { pending: true, at: corner, remaining: 2 })
    assert.deepEqual(branchOptions(corner).map(v => v.id), choices)
  }
  assert.deepEqual(at(15, 2), { done: true, pos: 17 })
})

test('지름길을 선택한 후 이번 이동 중 중앙을 지나쳐도 멈추지 않는다', () => {
  assert.deepEqual(chosen(5, 1, 'short'), { done: true, pos: 20 })
  assert.deepEqual(chosen(5, 3, 'short'), { done: true, pos: 22 })
  assert.deepEqual(chosen(5, 4, 'short'), { done: true, pos: 23 })
  assert.deepEqual(chosen(10, 3, 'short'), { done: true, pos: 22 })
  assert.deepEqual(chosen(10, 4, 'short'), { done: true, pos: 27 })
})

test('중앙은 들어온 대각선 방향대로 통과한다', () => {
  assert.deepEqual(at(21, 2), { done: true, pos: 23 })
  assert.deepEqual(at(26, 2), { done: true, pos: 27 })
  assert.deepEqual(at(20, 5), { done: true, pos: 15 })
  assert.deepEqual(at(25, 4), { done: true, pos: 28 })
})

test('중앙에 정확히 선 말만 두 출구 중 선택할 수 있다', () => {
  assert.deepEqual(chosen(22, 2, 'to15'), { done: true, pos: 24 })
  assert.deepEqual(chosen(22, 2, 'to0'), { done: true, pos: 28 })
  assert.deepEqual(chosen(22, 3, 'to0'), { done: true, finished: true })
})

test('일반 길/지름길 완주 및 잘못된 선택 방어', () => {
  assert.deepEqual(at(19, 1), { done: true, finished: true })
  assert.deepEqual(at(28, 1), { done: true, finished: true })
  assert.deepEqual(chosen(10, 6, 'short'), { done: true, finished: true })
  assert.deepEqual(chosen(5, 2, 'oops'), { error: 'bad-choice' })
  assert.deepEqual(at(4, 0), { error: 'bad-steps' })
  assert.deepEqual(at(2, -1), { done: true, pos: 1 })
})


test('대기 중인 말은 완주 자리(0)가 아니라 첫 칸(1)부터 출발한다', () => {
  for (let steps = 1; steps <= 5; steps++) {
    assert.deepEqual(at(START, steps), { done: true, pos: steps })
  }
  assert.deepEqual(at(START, 5), { done: true, pos: 5 })
  // 모를 사용해 5번에 정확히 멈췄으므로 다음 이동에서만 방향을 고른다.
  assert.deepEqual(at(5, 1), { pending: true, at: 5, remaining: 1 })
})

test('출발 보정은 판 위의 말 및 완주 판정을 바꾸지 않는다', () => {
  assert.deepEqual(at(1, 5), { done: true, pos: 6 })
  assert.deepEqual(at(19, 1), { done: true, finished: true })
  assert.deepEqual(at(18, 2), { done: true, finished: true })
  assert.deepEqual(at(10, 2), { pending: true, at: 10, remaining: 2 })
})
