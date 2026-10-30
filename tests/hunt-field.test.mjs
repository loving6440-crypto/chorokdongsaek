import test from 'node:test'
import assert from 'node:assert/strict'
import { HUNT_COOLDOWN_MS, HUNT_KINDS, HUNT_SPECIES, LEFT_TRAIL_ONE, clockwiseRoute, siteMissingData } from '../src/game/huntSites.js'
import { attemptHunt, enterHuntSite, huntCooldownLeft, huntNodeAt, huntOdds, huntStat, leaveHuntSite, moveHuntCreatures, moveOnHunt, resolveHuntEncounter } from '../src/game/huntField.js'
import { itemOf } from '../src/game/items.js'
import { ENEMIES, enemyTurn, newBattle, playerTurn, specialEffects } from '../src/game/battle.js'
import { fixtureSite, player, stats } from './hunt-fixtures.mjs'

const sequence = (...values) => { let i = 0; return () => values[i++] ?? 0.99 }
const enter = (site = fixtureSite(), rng = () => 0.99) => enterHuntSite(player(), site, 1000, rng).player
const withPosition = (p, position) => ({ ...p, huntExpedition: { ...p.huntExpedition, position } })

test('사진의 10×10 배치: 식물 7, 장애물 4, 동물 2, 시작 A10', () => {
  const s = LEFT_TRAIL_ONE
  assert.deepEqual(s.start, { x: 0, y: 9 })
  assert.deepEqual(['plant', 'obstacle', 'animal'].map(kind => s.nodes.filter(n => n.kind === kind).length), [7, 4, 2])
  assert.equal(new Set(s.nodes.map(n => `${n.x},${n.y}`)).size, 13)
  assert.equal(s.nodes.find(n => n.id === 'J1').kind, 'plant')
  assert.equal(s.nodes.find(n => n.id === 'G6').kind, 'obstacle')
  assert.equal(HUNT_KINDS.player.symbol, '●')
  assert.equal(HUNT_KINDS.ghost.symbol, '♠')
})

test('확인되지 않은 메모 데이터는 임의로 개방하지 않는다', () => {
  const incomplete = fixtureSite({ maxTurns: null, nodes: [{ id: 'A1', kind: 'plant', x: 0, y: 0, species: null, level: null }] })
  assert.ok(siteMissingData(incomplete).includes('최대 행동 턴 수'))
  assert.ok(enterHuntSite(player(), incomplete).error)
  assert.deepEqual(siteMissingData(fixtureSite()), [])
})

test('시트의 셀 메모와 좌표를 반영하며 덤불은 회색 장애물로 판정한다', () => {
  const expected = {
    J1: ['mugwort', 13], C2: ['poisonMushroom', 10], F4: ['snakeBerry', 8],
    C5: ['mushroom', 5], C6: ['poisonMushroom', 10], H6: ['snakeBerry', 8], I10: ['mushroom', 5],
    E2: ['stoneTower', 7], G6: ['stonePillar', 5], E8: ['stonePillar', 5], C10: ['bush', 2],
    A3: ['snake', 10], I3: ['fox', 15],
  }
  for (const node of LEFT_TRAIL_ONE.nodes) {
    assert.deepEqual([node.species, node.level], expected[node.id], node.id)
    assert.equal(node.kind, HUNT_SPECIES[node.species].kind)
    if (node.kind === 'animal') {
      assert.ok(node.route.some(p => p.x === node.x && p.y === node.y))
      assert.equal(node.route.length, node.species === 'snake' ? 4 : 8)
    }
  }
  const bush = LEFT_TRAIL_ONE.nodes.find(node => node.id === 'C10')
  assert.equal(bush.kind, 'obstacle')
  assert.equal(huntStat(bush.kind, { ...stats(0), insight: 7, control: 8 }), 15)
})

test('확정된 산길-1에 입장할 수 있고 30번째 행동 직후 종료된다', () => {
  assert.deepEqual(siteMissingData(LEFT_TRAIL_ONE), [])
  assert.equal(LEFT_TRAIL_ONE.nodes.find(node => node.id === 'J1').level, 13)
  let p = enter(LEFT_TRAIL_ONE)
  assert.equal(p.huntExpedition.maxTurns, 30)
  for (let turn = 1; turn <= 30; turn++) {
    p = moveOnHunt(p, { x: turn % 2, y: 9 }, 1000 + turn).player
    assert.equal(p.huntExpedition.turn, turn)
    assert.equal(p.huntExpedition.status, turn === 30 ? 'finished' : 'active')
  }
  assert.equal(huntCooldownLeft(p, LEFT_TRAIL_ONE.id, 1020), HUNT_COOLDOWN_MS)
})

test('영물 부러진 장승은 30레벨, 여섯 스탯 합으로 수렵하며 장승 조각 1d3개를 준다', () => {
  let p = enter(LEFT_TRAIL_ONE, sequence(0, 0.99, 0))
  const spirit = p.huntExpedition.nodes.find(node => node.kind === 'spirit')
  assert.equal(spirit.name, '부러진 장승')
  assert.equal(spirit.level, 30)
  assert.deepEqual(spirit.rewards, [{ item: 'jangseung-piece', dice: 3 }])
  p = withPosition(p, { x: spirit.x, y: spirit.y })
  for (const [roll, amount] of [[0, 1], [0.99, 3]]) {
    const result = attemptHunt(p, spirit.id, stats(5), 2000, sequence(0, roll))
    assert.equal(result.success, true)
    assert.deepEqual(result.rewards, { 'jangseung-piece': amount })
    assert.equal(result.player.huntExpedition.nodes.find(node => node.id === spirit.id).attemptsLeft, 2)
  }
  assert.equal(attemptHunt(p, spirit.id, stats(5), 2000, () => 0.9).success, false)
})

test('산귀신은 2단계로 기존 전투와 저주 패턴을 사용하고 승리 시 영력 20만 받는다', () => {
  const ghost = LEFT_TRAIL_ONE.ghost
  assert.equal(ghost.level, 2)
  assert.equal(ghost.enemy.tier, 2)
  assert.equal(ghost.enemy.partySize, 1)
  assert.equal(ghost.rewardSpirit, 20)
  assert.notEqual(ghost.enemy.id, 'wonhon')
  assert.ok(specialEffects(ghost.enemy).some(effect => effect.includes('저주 3턴')))
  const rng = () => 0.5
  const cursed = enemyTurn({ ...newBattle(ghost.enemy, stats(5), rng, 100, 100), queue: ['special', 'jab', 'jab', 'jab', 'jab'] }, { stats: stats(5), mp: 100 }, rng)
  assert.equal(cursed.state.curse, 3, '저주는 시전한 턴에는 피해를 주지 않는다')
  assert.equal(cursed.state.php, 100)
  const next = enemyTurn(cursed.state, { stats: stats(5), mp: 100 }, rng)
  assert.equal(next.state.curse, 2)
  assert.ok(next.events.some(event => event.text?.includes('저주가 스며든다')))
  for (const value of [5, 6]) {
    const s = stats(value)
    let state = newBattle(ghost.enemy, s, rng, 100, 100)
    let mp = 100
    for (let turn = 0; turn < 30 && !state.over; turn++) {
      const result = playerTurn(state, state.charms > 0 ? 'charm' : 'attack', { stats: s, mp }, rng)
      assert.ok(!result.invalid)
      mp -= result.mpCost
      state = result.state
      if (!state.over) state = enemyTurn(state, { stats: s, mp }, rng).state
    }
    assert.equal(state.over, 'win', `스탯 ${value}로 기본 공격·부적 전투 완주`)
    let p = enter(LEFT_TRAIL_ONE)
    p.huntExpedition.encounter = { nodeId: 'ghost', enemy: ghost.enemy, rewardSpirit: ghost.rewardSpirit }
    const result = resolveHuntEncounter(p, { win: true }, 3000).player
    assert.equal(result.spirit, 120)
    assert.equal(result.money, 50)
    assert.equal(result.huntExpedition.spiritGained, 20)
  }
  assert.ok(!ENEMIES.some(enemy => enemy.id === ghost.enemy.id), '일반 퇴마 실습 상대 목록은 유지')
})

test('실패율 예시: 안목 7 + 인내 8, 레벨 17은 성공 80%; 최소 실패 10%, 최대 실패 100%', () => {
  const s = { ...stats(0), insight: 7, endurance: 8 }
  assert.equal(huntOdds('plant', 17, s).value, 15)
  assert.equal(huntOdds('plant', 17, s).success, 80)
  assert.equal(huntOdds('plant', 17, s).bonus, 0)
  assert.equal(huntOdds('plant', 15, s).success, 90)
  assert.equal(huntOdds('plant', 1, s).success, 90)
  assert.equal(huntOdds('plant', 100, s).success, 0)
  assert.equal(huntOdds('plant', 1, stats(999)).bonus, 100)
  assert.equal(huntStat('obstacle', { ...stats(0), insight: 7, control: 8 }), 15)
  assert.equal(huntStat('animal', { ...stats(0), comprehension: 9, agility: 8 }), 17)
  assert.equal(huntStat('spirit', { ...stats(20), aggression: 1 }), 101)
  assert.equal(huntOdds('spirit', 103, { ...stats(20), aggression: 1 }).success, 80)
  assert.equal(huntOdds('spirit', 90, { ...stats(20), aggression: 1 }).bonus, 11)
})

test('정상 한 칸 이동만 1턴, 대각선·순간이동·맵 밖·장애물 진입은 무효', () => {
  const p = enter()
  assert.equal(moveOnHunt(p, { x: 1, y: 9 }).player.huntExpedition.turn, 1)
  for (const pos of [{ x: -1, y: 9 }, { x: 0, y: 10 }, { x: 1, y: 8 }, { x: 3, y: 9 }]) assert.ok(moveOnHunt(p, pos).error)
  const besideRock = withPosition(p, { x: 1, y: 9 })
  assert.ok(moveOnHunt(besideRock, { x: 2, y: 9 }).error)
  assert.equal(p.huntExpedition.turn, 0)
})

test('실제 시도도 80% 경계와 최소 10% 실패를 지키고 실패하면 보너스가 없다', () => {
  const p = withPosition(enter(), { x: 2, y: 1 })
  const s = { ...stats(0), insight: 7, endurance: 8 }
  assert.equal(attemptHunt(p, 'C2', s, 2000, sequence(0.7999, 0)).success, true)
  assert.equal(attemptHunt(p, 'C2', s, 2000, sequence(0.8)).success, false)
  const failed = attemptHunt(p, 'C2', stats(99), 2000, sequence(0.9, 0, 0))
  assert.equal(failed.success, false)
  assert.deepEqual(failed.rewards, {})
  assert.deepEqual(failed.player.inventory, {})
})

test('채집 실패도 턴과 시도를 소비하고 3회 뒤 빈칸이 된다; 원본은 불변', () => {
  const initial = withPosition(enter(), { x: 2, y: 1 })
  let p = initial
  for (let n = 1; n <= 3; n++) {
    const r = attemptHunt(p, 'C2', stats(2), 1000 + n, () => 0.99)
    assert.equal(r.success, false)
    p = r.player
    assert.equal(p.huntExpedition.turn, n)
    assert.equal(p.huntExpedition.nodes.find(node => node.id === 'C2').attemptsLeft, 3 - n)
  }
  assert.equal(huntNodeAt(p.huntExpedition, { x: 2, y: 1 }), undefined)
  assert.ok(attemptHunt(p, 'C2', stats(99)).error)
  assert.equal(initial.huntExpedition.nodes.find(n => n.id === 'C2').attemptsLeft, 3)
  assert.deepEqual(p.inventory, {})
})

test('모든 확정 보상과 보너스 아이템은 소지품 정의가 있고 주사위 상한을 지킨다', () => {
  for (const [species, definition] of Object.entries(HUNT_SPECIES)) {
    const site = fixtureSite({ nodes: [{ id: 'target', x: 0, y: 9, species, kind: definition.kind, level: 20,
      ...(definition.kind === 'animal' ? { route: clockwiseRoute(0, 6, 4) } : {}) }] })
    let p = enter(site)
    if (definition.kind === 'obstacle') p = withPosition(p, { x: 1, y: 9 })
    // 확률 보상은 rng()를 추가로 소비한다. 이 테스트는 모든 보상 판정이 성공하는 주사위를 준다.
    const rewardRolls = definition.rewards.flatMap(reward => [...(reward.chance != null ? [0] : []), ...(reward.dice ? [0.99] : [])])
    const result = attemptHunt(p, 'target', stats(20), 2000, sequence(0, ...rewardRolls, 0, 0.99))
    assert.equal(result.success, true, species)
    const bonus = definition.kind === 'plant' ? 'fine-woodchip' : definition.kind === 'obstacle' ? 'polishing-stone' : definition.kind === 'animal' ? 'trap-scraps' : null
    for (const reward of definition.rewards) {
      assert.ok(itemOf(reward.item), reward.item)
      // v79: 확정 보상과 랜덤 보너스가 같은 아이템이면 수량이 합산된다.
      const expected = (reward.dice ?? reward.amount) + (reward.item === bonus ? (definition.kind === 'obstacle' ? 2 : 1) : 0)
      assert.equal(result.rewards[reward.item], expected, species)
    }
    if (bonus) {
      assert.ok(result.rewards[bonus] > 0, bonus)
      assert.ok(itemOf(bonus))
    }
    assert.deepEqual(result.player.huntExpedition.rewards, result.player.inventory)
  }
})

test('인접 장애물 채집과 같은 칸 동물 수렵만 허용하며 수렵 시 동물이 멈춘다', () => {
  let p = enter()
  assert.ok(attemptHunt(p, 'C10', stats(10)).error)
  p = withPosition(p, { x: 1, y: 9 })
  assert.equal(attemptHunt(p, 'C10', stats(10), 2000, () => 0).player.huntExpedition.turn, 1)
  const animal = p.huntExpedition.nodes.find(node => node.id === 'A3')
  p = withPosition(p, { x: animal.x, y: animal.y })
  const result = attemptHunt(p, animal.id, stats(10), 2000, () => 0).player
  assert.deepEqual(result.huntExpedition.nodes.find(node => node.id === animal.id).x, animal.x)
  assert.deepEqual(result.huntExpedition.nodes.find(node => node.id === animal.id).y, animal.y)
})

test('뱀 2×2, 여우 3×3은 시계 방향 테두리만 이동하고 내부는 방문하지 않는다', () => {
  for (const size of [2, 3]) {
    const route = clockwiseRoute(0, 0, size)
    assert.equal(route.length, 4 * (size - 1))
    assert.equal(new Set(route.map(p => `${p.x},${p.y}`)).size, route.length)
    const node = { id: 'animal', kind: 'animal', x: 0, y: 0, attemptsLeft: 3, route }
    let s = { nodes: [node], position: { x: 9, y: 9 } }
    for (let i = 0; i < route.length; i++) {
      s = moveHuntCreatures(s)
      const next = s.nodes[0]
      assert.ok(next.x === 0 || next.y === 0 || next.x === size - 1 || next.y === size - 1)
    }
    assert.deepEqual([s.nodes[0].x, s.nodes[0].y], [0, 0])
    assert.deepEqual([node.x, node.y], [0, 0])
  }
})

test('이동해 따라잡은 동물은 같은 칸에 멈추며 고정 채집물은 움직이지 않는다', () => {
  const site = fixtureSite({ nodes: [{ id: 'snake', kind: 'animal', species: 'snake', level: 10, x: 1, y: 9, route: clockwiseRoute(0, 8, 2) },
    { id: 'plant', kind: 'plant', species: 'mugwort', level: 10, x: 5, y: 5 }] })
  const p = moveOnHunt(enter(site), { x: 1, y: 9 }).player
  assert.equal(p.huntExpedition.nodes[0].x, 1)
  assert.equal(p.huntExpedition.nodes[0].y, 9)
  assert.equal(p.huntExpedition.nodes[1].x, 5)
  assert.equal(p.huntExpedition.nodes[1].y, 5)
})

test('영물·귀신의 입장 20% 판정은 독립: 둘 다/없음/한쪽만; 흰 칸에만 출현', () => {
  for (const [rolls, expected] of [[[0.19, 0.19], ['spirit', 'ghost']], [[0.2, 0.2], []], [[0.1, 0.9], ['spirit']], [[0.9, 0.1], ['ghost']]]) {
    const p = enter(fixtureSite(), sequence(...rolls, 0, 0))
    const roaming = p.huntExpedition.nodes.filter(n => n.id.startsWith('roaming-'))
    assert.deepEqual(roaming.map(n => n.kind), expected)
    for (const node of roaming) {
      assert.ok(!fixtureSite().nodes.some(fixed => fixed.x === node.x && fixed.y === node.y))
      assert.notDeepEqual({ x: node.x, y: node.y }, p.huntExpedition.position)
    }
    assert.equal(new Set(roaming.map(n => `${n.x},${n.y}`)).size, roaming.length)
  }
})

test('영물은 멀어지고 귀신은 식물 위의 플레이어에게도 다가와 전투를 연다', () => {
  const s = { position: { x: 3, y: 3 }, nodes: [
    { id: 'spirit', kind: 'spirit', attemptsLeft: 3, x: 2, y: 3 },
    { id: 'ghost', kind: 'ghost', x: 3, y: 2, enemy: { id: 'wonhon' }, rewardSpirit: 20 },
    { id: 'plant', kind: 'plant', attemptsLeft: 3, x: 3, y: 3 },
  ] }
  const next = moveHuntCreatures(s)
  const spirit = next.nodes[0]
  assert.equal(Math.abs(spirit.x - 3) + Math.abs(spirit.y - 3), 2)
  assert.equal(next.encounter.nodeId, 'ghost')
  assert.deepEqual(next.position, s.position)
})

test('턴 소진과 조기 귀환은 즉시 재입장 가능, 저장 복원에도 대기가 없다', () => {
  const site = fixtureSite({ maxTurns: 1 })
  let p = moveOnHunt(enter(site), { x: 1, y: 9 }, 2000).player
  assert.equal(p.huntExpedition.status, 'finished')
  assert.equal(huntCooldownLeft(p, site.id, 2000), HUNT_COOLDOWN_MS)
  assert.ok(moveOnHunt(p, { x: 0, y: 9 }).error)
  p = JSON.parse(JSON.stringify(p))
  assert.equal(enterHuntSite(p, site, 2000 + HUNT_COOLDOWN_MS - 1).player.huntExpedition.turn, 0)
  assert.equal(enterHuntSite(p, site, 2000 + HUNT_COOLDOWN_MS).player.huntExpedition.turn, 0)
  const early = leaveHuntSite(enter(), 3000).player
  assert.equal(huntCooldownLeft(early, site.id, 3000), HUNT_COOLDOWN_MS)
  assert.equal(huntCooldownLeft(early, 'right-trail-1', 3000), 0)
})

test('귀신은 장애물 뒤에서 멈추지 않고 우회하여 매 턴 한 칸씩 추적한다', () => {
  let session = { position: { x: 2, y: 2 }, nodes: [
    { id: 'ghost', kind: 'ghost', x: 2, y: 0, enemy: {}, rewardSpirit: 20 },
    { id: 'rock', kind: 'obstacle', x: 2, y: 1, attemptsLeft: 3 },
  ] }
  for (let i = 0; i < 4; i++) {
    const previous = { ...session.nodes[0] }
    session = moveHuntCreatures(session)
    const current = session.nodes[0]
    assert.equal(Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y), 1)
    assert.notDeepEqual([current.x, current.y], [2, 1])
  }
  assert.equal(session.encounter.nodeId, 'ghost')
})

test('최종 턴 조우는 전투 후 종료, 승리 보상 영력20은 한 번만 지급하고 200 상한 적용', () => {
  let p = enter(fixtureSite({ maxTurns: 1 }))
  p.huntExpedition.nodes.push({ id: 'ghost', kind: 'ghost', x: 1, y: 8, enemy: {}, rewardSpirit: 20 })
  p = moveOnHunt(p, { x: 1, y: 9 }, 2000).player
  assert.equal(p.huntExpedition.status, 'active')
  assert.ok(p.huntExpedition.encounter)
  assert.ok(leaveHuntSite(p).error)
  assert.ok(moveOnHunt(p, { x: 0, y: 9 }).error)
  p.spirit = 190
  const result = resolveHuntEncounter(p, { win: true }, 3000)
  assert.equal(result.player.spirit, 200)
  assert.equal(result.player.money, 50)
  assert.equal(result.player.huntExpedition.status, 'finished')
  assert.equal(huntCooldownLeft(result.player, p.huntExpedition.siteId, 3000), HUNT_COOLDOWN_MS)
  assert.ok(resolveHuntEncounter(result.player, { win: true }).error)
})

test('패배 시 개척 종료, 도주 시 남은 행동으로 복귀하고 중간 저장 상태를 보존한다', () => {
  const p = withPosition(enter(), { x: 2, y: 1 })
  const once = attemptHunt(p, 'C2', stats(10), 2000, () => 0).player
  const restored = JSON.parse(JSON.stringify(once))
  assert.deepEqual(restored.huntExpedition, once.huntExpedition)
  for (const outcome of [{ win: false }, { win: false, fled: true }]) {
    const s = { ...restored.huntExpedition, encounter: { nodeId: 'ghost', rewardSpirit: 20 } }
    const result = resolveHuntEncounter({ ...restored, huntExpedition: s }, outcome, 3000).player
    assert.equal(result.spirit, restored.spirit)
    assert.equal(result.huntExpedition.status, outcome.fled ? 'active' : 'finished')
    if (outcome.fled) assert.equal(result.huntExpedition.turn, restored.huntExpedition.turn)
  }
})
