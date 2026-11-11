import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PSYCHICS, newBattle, psychicTurn } from '../src/game/battle.js'
import { beginRound, createMB, resolveTurn, submit, viewOf } from '../src/game/mbattle.js'

const stats = { insight: 25, aggression: 25, endurance: 25, control: 25, agility: 25, comprehension: 25 }
const rng = () => 0.6
const active = PSYCHICS.filter((skill) => skill.use)
const argumentsFor = (id) => ({
  stats,
  mp: 150,
  baseAggression: 20,
  selfId: 'a',
  target: 'a',
  amount: 10,
  sacrifice: 10,
  rerolls: [0, 1, 2],
})

test('v79.0.4: 단독 영능력 사용 화면이 실제 존재하는 기본 호전 변수를 받아 사용한다', () => {
  const source = readFileSync(new URL('../src/components/locations/Battle.jsx', import.meta.url), 'utf8')
  const game = readFileSync(new URL('../src/Game.jsx', import.meta.url), 'utf8')
  assert.match(source, /export default function Battle\(\{[^}]*\bbaseAggression\b/)
  assert.match(source, /baseAggression: Number\.isFinite\(baseAggression\) \? baseAggression : stats\.aggression/)
  assert.match(game, /<HuntBattleModal[\s\S]*?baseAggression=\{player\.stats\?\.aggression\}/)
  assert.match(source, /catch \(error\)[\s\S]*?영능력 처리 중 오류/)
})

test('v79.0.4: 단독 전투의 사용 가능한 모든 영능력이 예외 없이 처리된다', () => {
  assert.ok(active.length >= 10)
  for (const skill of active) {
    const battle = newBattle('scarecrow', stats, rng, 100, 100)
    let result
    assert.doesNotThrow(() => { result = psychicTurn(battle, skill.id, argumentsFor(skill.id), rng) }, skill.label)
    assert.equal(result.invalid, undefined, skill.label)
    assert.ok(Array.isArray(result.events) && result.events.length, skill.label)
    assert.ok(Number.isFinite(result.mpCost), skill.label)
  }
})

test('v79.0.4: 단체 전투에서도 사용 가능한 영능력 전부 제출·처리된다', () => {
  for (const skill of active) {
    const members = [
      { id: 'a', name: 'A', stats, psychics: [skill.id], baseAggression: 20, hp: 150, hpMax: 150, mp: 150, mpMax: 150 },
      { id: 'b', name: 'B', stats, hp: 150, hpMax: 150, mp: 150, mpMax: 150 },
    ]
    const battle = createMB('foxfire', members, rng)
    beginRound(battle, rng)
    const actor = battle.turn
    const action = { action: 'psychic', psychic: skill.id, target: actor, amount: 10, sacrifice: 10, rerolls: [0, 1, 2] }
    // v79.0.7: 언어장벽은 1단계(간파, 턴 유지) → 2단계(고르기 제출)로 나뉜다.
    if (skill.id === 'language-barrier') assert.deepEqual(submit(battle, actor, { action: 'psychic', psychic: skill.id }), { ok: true, reveal: true }, skill.label)
    assert.deepEqual(submit(battle, actor, action), { ok: true }, skill.label)
    assert.doesNotThrow(() => resolveTurn(battle, rng), skill.label)
    assert.ok(viewOf(battle).members.length >= 2, skill.label)
  }
})

test('v79.0.4: 영력결계는 사용 버튼이 아닌 상시 영능력이다', () => {
  const skill = PSYCHICS.find((s) => s.id === 'spirit-barrier')
  assert.ok(skill)
  assert.equal(skill.use, false)
  const r = psychicTurn(newBattle('scarecrow', stats, rng, 100, 100), skill.id, argumentsFor(skill.id), rng)
  assert.equal(r.invalid, true)
})

test('v79.0.4: 새로운 지신밟기·칠성낙인은 첫 턴과 의지력 조건을 지킨다', () => {
  for (const skill of ['earth-step', 'seven-stars']) {
    const battle = newBattle('scarecrow', stats, rng, 100, 100)
    assert.equal(psychicTurn(battle, skill, argumentsFor(skill), rng).invalid, undefined)
    // v-B.06: 칠성낙인은 '직접 고른 턴'(choseTurns)으로 센다
    assert.equal(psychicTurn({ ...battle, myTurns: 1, choseTurns: 1 }, skill, argumentsFor(skill), rng).invalid, true)
    assert.equal(psychicTurn(battle, skill, { ...argumentsFor(skill), mp: 0 }, rng).invalid, true)
  }
})
