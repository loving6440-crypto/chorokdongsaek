import test from 'node:test'
import assert from 'node:assert/strict'
import { newBattle, playerTurn, enemyTurn, psychicTurn } from '../src/game/battle.js'
import { beginRound, createMB, resolveTurn, submit, pendingSurvivors, survive } from '../src/game/mbattle.js'
import { inCornerZone, SPIRIT_CORNER_SIZE } from '../src/game/huntField.js'

const stats = { insight: 19, aggression: 19, endurance: 19, control: 19, agility: 19, comprehension: 19 }

test('v-B.03: 영물이 멈추는 구역은 네 모서리의 2×2 사각형', () => {
  assert.equal(SPIRIT_CORNER_SIZE, 2)
  const zone = []
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (inCornerZone({ x, y })) zone.push(`${String.fromCharCode(65 + x)}${y + 1}`)
  assert.deepEqual(zone.sort(), ['A1', 'A10', 'A2', 'A9', 'B1', 'B10', 'B2', 'B9', 'I1', 'I10', 'I2', 'I9', 'J1', 'J10', 'J2', 'J9'].sort())
})

test('v-B.03: 언어장벽(단독) — 몇 번째 턴이든 쓸 수 있고, 확정하면 턴이 끝난다', () => {
  let s = { ...newBattle('wonhon', stats, () => 0.5, 100, 100), ehp: 99999 }
  for (let turn = 1; turn <= 6; turn++) {
    if (turn % 2 === 0) {
      const reveal = psychicTurn(s, 'language-barrier', { stats, mp: 100 }, () => 0.5)
      assert.ok(!reveal.invalid, `${turn}번째 턴 간파`)
      assert.equal(reveal.keepTurn, true)
      const pick = psychicTurn(reveal.state, 'language-barrier', { stats, mp: 80, rerolls: [0] }, () => 0.5)
      assert.ok(!pick.invalid && !pick.keepTurn, `${turn}번째 턴 확정 → 턴 종료`)
      s = pick.state
    } else {
      s = playerTurn(s, 'guard', { stats, mp: 100, noRash: true }, () => 0.5).state
    }
    s = enemyTurn({ ...s, php: 100 }, { stats, mp: 100 }, () => 0.5).state
  }
})

test('v-B.03: 언어장벽(다인) — 몇 번째 라운드든, 일행 중 몇 번째 순서든 자기 차례면 쓸 수 있다', () => {
  const members = ['first', 'second', 'third'].map((id, i) => ({ id, name: id, stats: { ...stats, agility: 30 - i * 5 }, hp: 100, hpMax: 100, mp: 999, mpMax: 999, psychics: ['language-barrier'] }))
  const mb = createMB('dueoksini', members, () => 0.5)
  mb.ehp = 99999
  beginRound(mb, () => 0.99)
  const used = {}
  for (let k = 0; k < 60 && !mb.over && mb.round <= 4; k++) {
    if (mb.phase === 'survive') { for (const m of pendingSurvivors(mb)) survive(mb, m.id, true, () => 0.5); continue }
    for (const m of mb.members) m.php = m.phpMax // 쓰러지지 않게
    const who = mb.turn
    const r1 = submit(mb, who, { action: 'psychic', psychic: 'language-barrier' })
    assert.deepEqual(r1, { ok: true, reveal: true }, `R${mb.round} ${who} 간파`)
    assert.equal(mb.turn, who, '간파만으로는 차례가 넘어가지 않는다')
    assert.deepEqual(submit(mb, who, { action: 'psychic', psychic: 'language-barrier', rerolls: [0] }), { ok: true })
    resolveTurn(mb, () => 0.99)
    used[`${mb.round}:${who}`] = true
  }
  for (const who of ['first', 'second', 'third']) assert.ok(Object.keys(used).some((k) => k.endsWith(':' + who) && !k.startsWith('1:')), `${who}가 2라운드 이후에도 사용`)
})
