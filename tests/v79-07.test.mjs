import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FIRE_MULT, MONKEY_PAW_STUN_TURNS, PASSIVE_PSYCHICS, fireTurn, monkeyPawStunChance, newBattle, ownedPassives, psychicTurn } from '../src/game/battle.js'
import { beginRound, createMB, hasActiveSpiritBarrier, resolveTurn, submit, viewOf } from '../src/game/mbattle.js'
import { HUNT_SITES, HUNT_SPECIES, snakeRoute } from '../src/game/huntSites.js'
import { attemptHunt, enterHuntSite, huntOdds, isMorningKST, moveHuntCreatures, rewardItemAt } from '../src/game/huntField.js'
import { itemOf } from '../src/game/items.js'
import { choseongOf, filterItems, itemMatches } from '../src/game/itemSearch.js'

const stats = { insight: 20, aggression: 20, endurance: 10, control: 10, agility: 20, comprehension: 20 }
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
// 2026-11-01 09:00 KST = 00:00 UTC / 15:00 KST = 06:00 UTC
const MORNING = Date.UTC(2026, 10, 1, 0, 0)
const AFTERNOON = Date.UTC(2026, 10, 1, 6, 0)

// ───────── 영능력 ─────────
test('언어장벽(단독): 1단계 간파는 턴을 쓰지 않고 20턴을 드러낸 뒤, 2단계에서 고른 턴만 다시 굴린다', () => {
  const s = newBattle('snake', stats, () => 0.5, 100, 100)
  const r1 = psychicTurn(s, 'language-barrier', { stats, mp: 100 }, () => 0.5)
  assert.equal(r1.keepTurn, true)
  assert.equal(r1.mpCost, 20)
  assert.equal(r1.state.queue.length, 20)
  assert.equal(r1.state.known, 20)
  assert.equal(r1.state.lbPick, true)
  assert.equal(r1.state.myTurns || 0, s.myTurns || 0, '간파만으로는 턴 수가 늘지 않는다')
  const before = [...r1.state.queue]
  const r2 = psychicTurn(r1.state, 'language-barrier', { stats, mp: 80, rerolls: [4, 4, 9, 30, 12] }, () => 0.95)
  assert.equal(r2.mpCost, 0, '고르기에는 의지력을 다시 쓰지 않는다')
  assert.ok(!r2.keepTurn)
  assert.equal(r2.state.lbPick, false)
  const changed = before.map((v, i) => i).filter((i) => i !== 4 && i !== 9 && i !== 12)
  for (const i of changed) assert.equal(r2.state.queue[i], before[i], `${i}번째는 바뀌지 않는다`)
})

test('언어장벽(다인): 간파 제출은 턴을 넘기지 않고, 고르기 전에는 다른 행동을 막으며, 확정하면 턴이 끝난다', () => {
  const members = [
    { id: 'a', name: 'A', stats: { ...stats, agility: 99 }, psychics: ['language-barrier'], hp: 150, hpMax: 150, mp: 100, mpMax: 150 },
    { id: 'b', name: 'B', stats, hp: 150, hpMax: 150, mp: 100, mpMax: 150 },
  ]
  const mb = createMB('foxfire', members, () => 0.5)
  beginRound(mb, () => 0.5)
  const actor = mb.turn
  const me = mb.members.find((m) => m.id === actor)
  const mp0 = me.mp
  assert.deepEqual(submit(mb, actor, { action: 'psychic', psychic: 'language-barrier' }), { ok: true, reveal: true })
  assert.equal(mb.turn, actor, '턴은 그대로')
  assert.equal(me.act, null)
  assert.equal(mb.known, 20)
  assert.equal(viewOf(mb).queue.length, 20, '모두가 20턴을 본다')
  assert.equal(viewOf(mb).members.find((m) => m.id === actor).lbPick, true)
  assert.ok(mp0 - me.mp > 0)
  assert.ok(submit(mb, actor, { action: 'attack' }).error, '고르기 전에는 다른 행동 불가')
  assert.deepEqual(submit(mb, actor, { action: 'psychic', psychic: 'language-barrier', rerolls: [0, 1] }), { ok: true })
  const mpAfterReveal = me.mp
  resolveTurn(mb, () => 0.5)
  assert.equal(me.lbPick, false)
  assert.equal(me.mp, mpAfterReveal, '확정 시 의지력을 다시 쓰지 않는다')
})

test('원숭이 손: ((호전−인내)+(호전−절제))% 확률로 즉시 행동불능', () => {
  assert.equal(monkeyPawStunChance({ aggression: 20, endurance: 10, control: 10 }), 20)
  assert.equal(monkeyPawStunChance({ aggression: 5, endurance: 10, control: 10 }), 0, '음수는 0%')
  assert.equal(monkeyPawStunChance({ aggression: 99, endurance: 1, control: 1 }), 100, '최대 100%')
  const s = { ...newBattle('wonhon', stats, () => 0.5, 100, 100), php: 80 }
  const hit = psychicTurn(s, 'monkey-paw', { stats, mp: 99, sacrifice: 5 }, () => 0.05)
  assert.equal(MONKEY_PAW_STUN_TURNS, 3)
  assert.equal(hit.selfStun, 3)
  assert.equal(hit.state.pstun, 3)
  const miss = psychicTurn(s, 'monkey-paw', { stats, mp: 99, sacrifice: 5 }, () => 0.5)
  assert.equal(miss.selfStun, 0)
  const src = read('../src/components/locations/Battle.jsx')
  assert.match(src, /state\.pstun > 0/, '단독 전투: 행동불능 턴을 건너뛴다')
  assert.match(read('../src/game/mbattle.js'), /if \(r\.selfStun\) m\.stun = /, '다인 전투: 행동불능 반영')
})

test('도깨비불 폭발 배율은 5배', () => {
  assert.equal(FIRE_MULT, 5)
  const s = { ...newBattle('wonhon', stats, () => 0.5, 100, 100), fire: 1 }
  const r = fireTurn(s, { stats, mp: 0 }, () => 0.5)
  assert.match(r.events[0].text, /×5 = /)
})

test('패시브 선택: 영력결계를 끄면 다인 전투에서도 발동하지 않는다', () => {
  assert.deepEqual(PASSIVE_PSYCHICS.map((p) => p.id), ['spirit-barrier'])
  assert.deepEqual(ownedPassives(['spirit-barrier', 'survival']), ['spirit-barrier'])
  const enemy = { boss: false }
  assert.equal(hasActiveSpiritBarrier({ psychics: ['spirit-barrier'] }, enemy), true)
  assert.equal(hasActiveSpiritBarrier({ psychics: ['spirit-barrier'], passiveOff: ['spirit-barrier'] }, enemy), false)
  const mb = createMB('foxfire', [
    { id: 'a', name: 'A', stats, psychics: ['spirit-barrier'], passiveOff: ['spirit-barrier', 'bogus'], hp: 100, hpMax: 100, mp: 50, mpMax: 50 },
    { id: 'b', name: 'B', stats, hp: 100, hpMax: 100, mp: 50, mpMax: 50 },
  ])
  assert.deepEqual(mb.members[0].passiveOff, ['spirit-barrier'])
  assert.equal(hasActiveSpiritBarrier(mb.members[0], mb.enemy), false)
  const battle = read('../src/components/locations/Battle.jsx')
  const game = read('../src/Game.jsx')
  assert.match(battle, /<PassivePicker/)
  assert.match(game, /<PassivePicker/)
  assert.match(read('../server/index.js'), /passiveOff: Array\.isArray\(me\?\.passiveOff\)/)
})

// ───────── 개척 (시트 [개척 터] 메모 기준) ─────────
test('터별 영물·요괴가 시트 메모와 같다', () => {
  const expect = {
    'left-trail-1': ['부러진 장승', 30, 'jangseung-piece', '산귀신', 2, 20, 'charm-scrap'],
    'left-trail-2': ['부러진 장승', 30, 'jangseung-piece', '산귀신', 2, 20, 'charm-scrap'],
    'left-trail-3': ['청록사슴', 50, 'antler', '목신', 3, 30, 'charm-scrap'],
    'left-trail-4': ['청록사슴', 50, 'antler', '목신', 3, 30, 'charm-scrap'],
    'left-cemetery': ['혼백나비', 100, 'spirit-orb', '앙괭이', 5, 50, 'silver-inlay'],
    'left-lake': ['이무기', 40, 'imugi-scale', '물귀신', 2, 20, 'charm-scrap'],
    'left-cave': ['암령', 100, 'darkness', '어둑시니', 4, 40, 'charm-scrap'],
  }
  for (const [id, [spirit, level, drop, ghost, ghostLevel, spiritReward, ghostDrop]] of Object.entries(expect)) {
    const site = HUNT_SITES[id]
    assert.equal(site.spirit.name, spirit, id)
    assert.equal(site.spirit.level, level, id)
    assert.equal(site.spirit.rewards[0].item, drop, id)
    assert.ok(itemOf(drop), drop)
    assert.equal(site.ghost.name, ghost, id)
    assert.equal(site.ghost.level, ghostLevel, id)
    assert.equal(site.ghost.rewardSpirit, spiritReward, id)
    assert.equal(site.ghost.rewardItems[0].item, ghostDrop, id)
    assert.equal(site.ghost.rewardItems[0].chance, 0.5, id)
    assert.equal(site.ghost.enemy.curse, true, id)
  }
  assert.deepEqual(HUNT_SITES['left-cave'].ghost.rewardItems[0], { item: 'charm-scrap', chance: 0.5, dice: 3, plus: 1 })
  assert.deepEqual(HUNT_SITES['left-trail-3'].ghost.rewardItems[0], { item: 'charm-scrap', chance: 0.5, dice: 3 })
})

test('자잘한 데이터: 너구리 반시계, 돌탑 1d2+1, 이끼바위·웅덩이는 식물', () => {
  const raccoon = HUNT_SITES['left-trail-1'].nodes.find((n) => n.id === 'J3')
  assert.equal(raccoon.species, 'raccoon')
  assert.equal(raccoon.route.length, 8)
  const i = raccoon.route.findIndex((p) => p.x === 9 && p.y === 2)
  const next = raccoon.route[(i + 1) % 8]
  assert.deepEqual(next, { x: 8, y: 2 }, '오른쪽 위 모서리에서 왼쪽으로 돈다')
  assert.deepEqual(HUNT_SPECIES.stoneTower.rewards[0], { item: 'stone', dice: 2, plus: 1 })
  assert.equal(HUNT_SPECIES.mossRock.kind, 'plant')
  assert.equal(HUNT_SPECIES.pond.kind, 'plant')
})

test('여우(산길 4)는 3×3을 S자로 돌고 같은 길로 돌아오며, 박쥐는 10칸을 끝까지 오르내린다', () => {
  const route = snakeRoute(9, 4, 3)
  assert.equal(route.length, 16)
  route.forEach((p, i) => assert.ok(adjacent(p, route[(i + 1) % route.length]), `${i}→${i + 1}`))
  const fox = HUNT_SITES['left-trail-4'].nodes.find((n) => n.id === 'J5')
  assert.deepEqual(fox.route, route)
  // 실제 이동: 같은 칸이 두 번 나와도 경로 순번을 따라간다.
  let session = { position: { x: 0, y: 9 }, nodes: [{ ...fox, kind: 'animal', attemptsLeft: 3 }] }
  const visited = []
  for (let t = 0; t < 32; t++) {
    session = moveHuntCreatures(session)
    visited.push(`${session.nodes[0].x},${session.nodes[0].y}`)
  }
  assert.equal(new Set(visited).size, 9, '9칸을 모두 지난다')
  const bat = HUNT_SITES['left-cave'].nodes.find((n) => n.id === 'E1')
  session = { position: { x: 0, y: 9 }, nodes: [{ ...bat, kind: 'animal', attemptsLeft: 3 }] }
  const ys = []
  for (let t = 0; t < 30; t++) { session = moveHuntCreatures(session); ys.push(session.nodes[0].y) }
  assert.equal(Math.min(...ys), 0)
  assert.equal(Math.max(...ys), 9)
  assert.ok(ys.filter((y) => y === 0).length >= 1 && ys.filter((y) => y === 9).length >= 1, '위아래 끝까지 왕복')
})

test('달꽃터: 오전(KST)에는 그믐꽃, 오후에는 초승꽃', () => {
  assert.equal(isMorningKST(MORNING), true)
  assert.equal(isMorningKST(AFTERNOON), false)
  const reward = HUNT_SPECIES.moonFlower.rewards[0]
  assert.equal(rewardItemAt(reward, MORNING), 'waning-flower')
  assert.equal(rewardItemAt(reward, AFTERNOON), 'crescent-flower')
  const cave = HUNT_SITES['left-cave']
  const site = { ...cave, nodes: cave.nodes.filter((n) => n.id === 'B3').map((n) => ({ ...n, x: 0, y: 9 })), spirit: null, ghost: null }
  const p = { hp: 100, mp: 100, spirit: 0, inventory: {}, stats }
  const entered = enterHuntSite(p, site, AFTERNOON, () => 0.99).player
  const r = attemptHunt(entered, 'B3', { ...stats, insight: 50, endurance: 50 }, AFTERNOON, () => 0)
  assert.equal(r.success, true)
  assert.ok(r.rewards['crescent-flower'] >= 1)
  assert.equal(r.rewards['waning-flower'], undefined)
})

test('산출값은 어떤 스탯의 합인지 함께 보여 준다', () => {
  assert.equal(huntOdds('plant', 10, stats).formula, '안목 20 + 인내 10')
  assert.equal(huntOdds('animal', 10, stats).formula, '이해 20 + 신속 20')
  assert.equal(huntOdds('spirit', 10, stats).formula.split(' + ').length, 6)
  assert.match(read('../src/components/locations/HuntField.jsx'), /odds\.formula/)
})

test('새 아이템 어둠과 전용 아이콘(어둠·염색약·영양제)', () => {
  assert.equal(itemOf('darkness')?.name, '어둠')
  const icons = read('../src/components/icons79b.jsx')
  for (const id of ['darkness', 'dye', 'nutrient']) assert.match(icons, new RegExp(`\\b${id}: \\{ bg:`))
  assert.match(read('../src/components/ItemIcon.jsx'), /V79B_ICONS\)/)
})

// ───────── 제작 · 벼룩시장 · 검색 ─────────
test('조리도 동아리 퀘스트의 제작 1회로 센다', () => {
  const game = read('../src/Game.jsx')
  assert.match(game, /const r = cook\(playerRef\.current, recipeId, admin\)[\s\S]{0,200}bumpDaily\(bumpWeekly\(r\.player, 'craft'\), 'craft'\)/)
})

test('벼룩시장 개수 입력은 입력 중 글자를 그대로 두고, −/+/최대 버튼이 있다', () => {
  const market = read('../src/components/Market.jsx')
  assert.match(market, /value=\{qty\} onChange=\{\(e\) => setQty\(e\.target\.value/)
  assert.match(market, /aria-label="올릴 개수 늘리기"/)
  assert.match(market, /aria-label="올릴 개수 줄이기"/)
  assert.match(market, />최대<\/button>/)
})

test('소지품·물품보관함 아이템 검색 (이름·분류·초성)', () => {
  const items = [itemOf('deer-tooth'), itemOf('mugwort'), itemOf('picnic')]
  assert.equal(choseongOf('고라니 이빨'), 'ㄱㄹㄴㅇㅃ')
  assert.deepEqual(filterItems(items, '고라니').map((i) => i.id), ['deer-tooth'])
  assert.deepEqual(filterItems(items, 'ㅆ').map((i) => i.id), ['mugwort'])
  assert.ok(itemMatches(itemOf('mugwort'), '재료'))
  assert.equal(filterItems(items, '').length, 3)
  assert.match(read('../src/components/InventoryModal.jsx'), /<ItemSearchBox/)
  assert.match(read('../src/components/Locker.jsx'), /<ItemSearchBox/)
})

test('원숭이 손(다인): 행동불능이 걸리면 내 턴 3번을 그대로 넘긴다', () => {
  const strong = { ...stats, aggression: 60, endurance: 5, control: 5, agility: 99 } // 확률 100%
  const mb = createMB('dueoksini', [
    { id: 'a', name: 'A', stats: strong, psychics: ['monkey-paw'], hp: 150, hpMax: 150, mp: 150, mpMax: 150 },
    { id: 'b', name: 'B', stats, hp: 150, hpMax: 150, mp: 150, mpMax: 150 },
  ], () => 0.5)
  beginRound(mb, () => 0.99) // 돌발 판정이 터지지 않게
  const a = mb.members.find((m) => m.id === 'a')
  assert.equal(mb.turn, 'a')
  assert.deepEqual(submit(mb, 'a', { action: 'psychic', psychic: 'monkey-paw', sacrifice: 1 }), { ok: true })
  resolveTurn(mb, () => 0.01)
  assert.equal(a.stun, 3)
  assert.ok(mb.log.some((e) => /3턴 동안 행동 불가/.test(e.text || '')))
})

// ───────── v79.0.8: 영력 상한 500 · 자연 회복 20분에 1 ─────────
test('v79.0.8: 영력 상한 500 — 어떤 값도 넘지 않고, 시작값은 100 그대로', async () => {
  const C = await import('../src/game/constants.js')
  assert.equal(C.SPIRIT_BASELINE_MAX, 500)
  assert.equal(C.SPIRIT_START, 100)
  assert.equal(C.clampSpirit({ spirit: 9999 }).spirit, 500)
  assert.equal(C.clampSpirit({ spirit: NaN }).spirit, 0)
  const ok = { spirit: 499.5 }
  assert.equal(C.clampSpirit(ok), ok, '상한 안이면 같은 객체')
  const progress = read('../src/game/progress.js')
  assert.match(progress, /export const spiritGaugeMax = \(\) => SPIRIT_BASELINE_MAX/)
  assert.match(progress, /Math\.min\(SLEEP_SPIRIT, SPIRIT_BASELINE_MAX - spirit\)/)
  // 관리자 저장분도 불러올 때 500으로 되돌린다(예전엔 관리자는 예외였다).
  assert.match(progress, /\n  p = clampSpirit\(p\)\n  return syncCodex\(migrateWeapons\(p\)\)/)
  assert.doesNotMatch(progress, /if \(!admin\) p = clampSpirit\(p\)/)
  assert.match(read('../src/game/huntField.js'), /SPIRIT_BASELINE_MAX - player\.spirit/)
  const game = read('../src/Game.jsx')
  assert.match(game, /const safe = clampSpirit\(limitNewGains\(previous, candidate\)\)/, '모든 setPlayer 경로')
  assert.match(game, /nextPlayer = clampSpirit\(limitNewGains\(previousPlayer, nextPlayer\)\)/, '1초 틱 경로')
  assert.match(game, /player: clampSpirit\(playerRef\.current\)/, '저장 경로')
  assert.match(read('../src/components/AdminPanel.jsx'), /spirit: num\(v\.spirit, 0, SPIRIT_MAX\)/, '관리자 입력')
})

test('v79.0.8: 영력 자연 회복은 기본 20분에 1, 절제 가속은 예전의 절반(10마다 25초), 한계 10분에 1', async () => {
  const P = await import('../src/game/spiritRegen.js')
  assert.equal(P.spiritMinutesPerPoint(0), 20)
  assert.equal(P.spiritIntervalSec(10), 117.5)
  assert.equal(P.spiritIntervalSec(50), 107.5)
  assert.equal(P.spiritMinutesPerPoint(240), 10)
  assert.equal(P.spiritMinutesPerPoint(999), 10, '10분에 1이 한계')
  // 하루(1440분) 동안 절제 0으로 72, 예전(10분에 1)의 절반
  assert.ok(Math.abs(P.spiritPerMin(0) * 1440 - 72) < 1e-9)
  // 체력 회복과 수련 보상은 예전 속도 유지
  assert.ok(Math.abs(P.hpPerMin(0) - 0.2) < 1e-9)
  assert.equal(P.trainReward(60, 0), 12)
})
