import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ITEMS, canUseItem, isHuntItem, itemNeedsTarget, itemOf, itemTurnFree } from '../src/game/items.js'
import { RECIPES } from '../src/game/crafting.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { recipeLevel } from '../src/game/materialLevels.js'
import { B16_GROUPS, B16_ITEM_EFFECTS, B16_TAG_HUNT, effectKindsOf } from '../src/game/itemEffectsB16.js'
import { applyItemToBattle } from '../src/game/battleItems.js'
import { newBattle } from '../src/game/battle.js'
import { beginRound, createMB, openingInitiative, useItemMB } from '../src/game/mbattle.js'
import { attemptHunt, enterHuntSite, gearHuntBonus, huntOddsNow, moveOnHunt, useHuntItem } from '../src/game/huntField.js'
import { fixtureSite, player, stats } from './hunt-fixtures.mjs'
import { powerOf, spearman } from './b16-power.mjs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const RECIPE_OF = new Map([...RECIPES, ...COOK_RECIPES].map((r) => [r.result, r]))
const isMaterial = (it) => it.kind === 'material' || it.tags?.includes('재료')
const hasEffect = (it) => Object.keys(it.effect ?? {}).length > 0 || Object.keys(it.bonus ?? {}).length > 0

test('B16: 제작법이 있는 완성품은 모두 효과가 있다 (제작 재료는 제외, 그대로)', () => {
  const results = [...RECIPE_OF.keys()].map(itemOf).filter(Boolean)
  const finished = results.filter((it) => !isMaterial(it))
  const tools = new Set(['whetstone', 'polishing-stone', 'five-knot', 'oil-cloth', 'cinnabar-charm', 'exercise-lamp']) // 강화 재료 · 업적용(예전부터 설명 있음)
  const empty = finished.filter((it) => !tools.has(it.id) && !hasEffect(it) && !it.trinketFx)
  assert.deepEqual(empty.map((it) => it.id), [])
  for (const it of results.filter(isMaterial)) assert.ok(!B16_ITEM_EFFECTS[it.id], `재료 ${it.id} 에 효과를 붙이지 않는다`)
  assert.equal(Object.keys(B16_ITEM_EFFECTS).length, 102)
})

test('B16: 요리 비율 — 전투 1/3(일행 6 · 나에게만 6 · 건네기 5) · 개척 1/3 · 평소 1/3', () => {
  const g = B16_GROUPS
  const foods = ITEMS.filter((it) => it.kind === 'food' && B16_ITEM_EFFECTS[it.id])
  assert.equal(foods.length, 51)
  assert.deepEqual([g.foodBattleParty.length, g.foodBattleSelf.length, g.foodBattleGive.length, g.foodHunt.length, g.foodDaily.length], [6, 6, 5, 17, 17])
  for (const id of g.foodBattleParty) { const it = itemOf(id); assert.ok(it.battle && it.party && !itemTurnFree(it), id) }
  for (const id of g.foodBattleSelf) { const it = itemOf(id); assert.ok(it.battle && !it.party && itemTurnFree(it) && !itemNeedsTarget(it), id) }
  for (const id of g.foodBattleGive) { const it = itemOf(id); assert.ok(it.battle && itemNeedsTarget(it), id) }
  for (const id of g.foodHunt) { const it = itemOf(id); assert.ok(isHuntItem(it) && it.tags.includes(B16_TAG_HUNT) && !it.battle, id) }
  for (const id of g.foodDaily) { const it = itemOf(id); assert.ok(!it.battle && !isHuntItem(it) && hasEffect(it), id) }
})

test('B16: 공작소 — 장비·장신구는 보정, 나머지는 전투 16 · 개척 15 (#개척 태그)', () => {
  const g = B16_GROUPS
  assert.equal(g.body.length + g.trinket.length, 20)
  for (const id of [...g.body, ...g.trinket]) assert.ok(Object.keys(itemOf(id).bonus).length > 0 && itemOf(id).effectText.startsWith('착용 시'), id)
  assert.deepEqual([g.workshopBattle.length, g.workshopHunt.length], [16, 15])
  for (const id of g.workshopBattle) assert.ok(itemOf(id).battle && itemOf(id).tags.includes('전투 중 사용 가능'), id)
  for (const id of g.workshopHunt) assert.ok(isHuntItem(itemOf(id)) && itemOf(id).tags.includes('#개척'), id)
  // 예전 시트의 잘못된 '전투 중 사용 가능' 칩이 남지 않는다
  assert.ok(!itemOf('small-altar').tags.includes('전투 중 사용 가능'))
})

test('B16: 서로 다른 효과가 25종 이상이고 전투 · 개척 · 일상에 고루 있다', () => {
  const kinds = new Set(Object.values(B16_ITEM_EFFECTS).flatMap(effectKindsOf))
  assert.ok(kinds.size >= 25, `효과 ${kinds.size}종`)
  const battle = ['enemyHit', 'drainSpirit', 'reveal', 'charms', 'cleanse', 'battleStat', 'revive', 'partyHp', 'partyStat', 'partyCleanse', 'partyCharms', 'giveHp', 'giveMp', 'giveCleanse', 'boost']
  const huntK = ['hunt.turns', 'hunt.odds', 'hunt.attempts', 'hunt.ward', 'hunt.banish', 'hunt.freeze', 'hunt.double', 'hunt.bonus', 'hunt.stat']
  const daily = ['buff', 'buffs', 'buffAll', 'randomBuff', 'spirit', 'hpFull', 'cureWeak', 'hpCost']
  for (const k of [...battle, ...huntK, ...daily, 'gear.stat', 'gear.hunt.turns', 'gear.hunt.odds', 'gear.hunt.bonus']) assert.ok(kinds.has(k), k)
})

test('B16: 만들기 어려울수록(적정 레벨이 높을수록) 효과가 세다 — 분류마다 순위 상관 0.8 이상, 최상위 제작품이 그 분류에서 가장 세다', () => {
  for (const [group, ids] of Object.entries(B16_GROUPS)) {
    const rows = ids.map((id) => ({ id, lv: recipeLevel(RECIPE_OF.get(id)) ?? 25, p: powerOf(B16_ITEM_EFFECTS[id]) }))
    const r = spearman(rows.map((x) => x.lv), rows.map((x) => x.p))
    assert.ok(r >= 0.8, `${group}: ${r.toFixed(2)}`)
    const top = rows.reduce((a, b) => (b.lv > a.lv ? b : a))
    assert.equal(top.p, Math.max(...rows.map((x) => x.p)), `${group}: 가장 어려운 ${top.id}`)
  }
})

test('B16: 사용 조건 — #개척은 개척 중에만, 일행용은 일행 전투에서만, 한 전투 1번 아이템', () => {
  const ctx = { countNow: 1 }
  const altar = itemOf('mugwort-incense')
  assert.match(canUseItem(altar, { ...ctx }).why, /개척 중에만/)
  assert.equal(canUseItem(altar, { ...ctx, inHunt: true }).ok, true)
  assert.match(canUseItem(altar, { ...ctx, inHunt: true, inBattle: true }).why, /전투 중에는/)
  assert.match(canUseItem(itemOf('songi-rice'), { ...ctx, inBattle: true, isParty: false }).why, /일행/)
  assert.equal(canUseItem(itemOf('songi-rice'), { ...ctx, inBattle: true, isParty: true }).ok, true)
  assert.match(canUseItem(itemOf('songi-rice'), { ...ctx }).why, /일행|전투 중에만/)
  const sling = itemOf('pebble-sling')
  assert.equal(canUseItem(sling, { ...ctx, inBattle: true }).ok, true)
  assert.match(canUseItem(sling, { ...ctx, inBattle: true, usedThisBattle: true }).why, /한 전투에 1번/)
  assert.match(canUseItem(sling, { ...ctx }).why, /전투 중에만/)
  assert.equal(canUseItem(itemOf('cabbage-soup'), { ...ctx }).ok, true)
  assert.match(canUseItem(itemOf('cabbage-soup'), { ...ctx, inBattle: true }).why, /전투 중에는/)
  assert.equal(canUseItem(itemOf('pickled-raspberry'), { ...ctx }).ok, true) // 건네는 요리도 평소엔 자신이 먹는다
})

test('B16 단독 전투: 적 피해는 체력 1에서 멈추고, 영력 · 간파 · 부적 · 해제가 판에 걸린다', () => {
  const s0 = { ...newBattle('foxfire', stats(10)), ehp: 5, espirit: 6, ps: { poison: 2, poisonDie: 3 }, curse: 2, bound: true }
  const hit = applyItemToBattle(s0, itemOf('wolf-fang-charm').effect, { name: 't', rng: () => 0.99 })
  assert.equal(hit.state.ehp, 1)
  assert.match(hit.events[0].text, /마지막 한 방은 직접/)
  const r = applyItemToBattle(s0, itemOf('turtle-oracle').effect, { name: '천년거북 점판' })
  assert.equal(r.state.espirit, 0)
  assert.equal(r.state.known, Math.min(5, s0.queue.length))
  assert.equal(r.state.charms, s0.charms + 3)
  assert.deepEqual([r.state.ps, r.state.curse, r.state.bound], [{}, 0, false])
  assert.equal(applyItemToBattle({ ...s0, over: 'win' }, itemOf('pebble-sling').effect).state.ehp, 5) // 끝난 판은 그대로
})

function mbOf() {
  const base = (id) => ({ id, name: id, stats: stats(12), hp: 40, hpMax: 80, mp: 10, mpMax: 60 })
  const mb = createMB('foxfire', [base('a'), base('b'), base('c')], () => 0.5)
  openingInitiative(mb)
  if (mb.phase === 'input' && !mb.turn) beginRound(mb)
  return mb
}
const turnOf = (mb, id) => { mb.turn = id; for (const m of mb.members) m.act = null; return mb }

test('B16 다인 전투: 일행용 · 건네기 · 나에게만 효과가 각자 맞게 들어간다', () => {
  let mb = turnOf(mbOf(), 'a')
  assert.equal(useItemMB(mb, 'a', itemOf('fortune-talisman')).ok, true)
  for (const m of mb.members) { assert.equal(m.stats.insight, 15); assert.equal(m.charms, 4) }
  assert.deepEqual(mb.members.find((m) => m.id === 'a').act, { action: 'item' }) // 일행용은 턴을 쓴다

  mb = turnOf(mbOf(), 'a')
  mb.members[1].ps = { poison: 1 }
  assert.equal(useItemMB(mb, 'a', itemOf('dangwi-tea'), 'b').ok, true)
  assert.deepEqual([mb.members[1].php, mb.members[1].mp], [65, 25])
  assert.equal(useItemMB(turnOf(mb, 'a'), 'a', itemOf('pearl-dumpling'), 'b').ok, true)
  assert.deepEqual(mb.members[1].ps, {})
  assert.equal(useItemMB(turnOf(mb, 'c'), 'c', itemOf('dangwi-tea')).ok, true) // 자신에게는 작은 쪽
  assert.deepEqual([mb.members[2].php, mb.members[2].mp], [50, 16])

  mb = turnOf(mbOf(), 'a')
  const a = mb.members[0]
  const before = mb.ehp
  assert.equal(useItemMB(mb, 'a', itemOf('centipede-ward')).ok, true)
  assert.ok(mb.ehp < before && mb.ehp >= 1)
  assert.equal(a.act, null) // 나에게만 쓰는 건 턴을 쓰지 않는다
  assert.equal(useItemMB(mb, 'a', itemOf('centipede-ward')).error, 'already') // 한 전투 1번
  assert.equal(useItemMB(mb, 'a', itemOf('red-fox-charm')).ok, true)
  assert.equal(a.stats.agility, 16)
  assert.equal(useItemMB(mb, 'a', itemOf('spirit-disposable')).ok, true)
  assert.equal(useItemMB(mb, 'a', itemOf('wild-ginseng-jeonggwa')).error, 'already') // 부활 아이템은 한 전투에 1번
  assert.equal(useItemMB(mb, 'a', itemOf('red-fox-charm'), 'b').error, 'self-only')
})

test('B16 개척: 턴 · 성공률 · 보상 2배 · 요괴 쫓기 · 짐승 묶기 · 퇴치 · 스탯 · 시도 회복, 그리고 턴을 쓰지 않는다', () => {
  const site = fixtureSite({ ghost: { ...(fixtureSite().ghost ?? {}), id: 'g', name: '시험 요괴', kind: 'ghost', chance: 1, level: 5, enemy: { id: 'foxfire', name: '여우불' }, rewardSpirit: 1 } })
  const inv = Object.fromEntries([...B16_GROUPS.foodHunt, ...B16_GROUPS.workshopHunt].map((id) => [id, 3]))
  let p = enterHuntSite({ ...player(), inventory: inv }, site, 1000, () => 0).player
  const turn0 = p.huntExpedition.turn
  const max0 = p.huntExpedition.maxTurns
  p = useHuntItem(p, itemOf('soul-lantern'), 1000).player
  assert.equal(p.huntExpedition.maxTurns, max0 + 10)
  assert.equal(p.huntExpedition.turn, turn0) // 턴을 쓰지 않는다
  assert.equal(p.inventory['soul-lantern'], 2)

  // 짐승 묶기: 동물이 움직이지 않는다
  const animals = () => p.huntExpedition.nodes.filter((n) => n.kind === 'animal').map((n) => `${n.x},${n.y}`)
  const before = animals()
  p = moveOnHunt(p, { x: p.huntExpedition.position.x + 1, y: p.huntExpedition.position.y }, 1001).player
  assert.deepEqual(animals(), before)

  // 요괴 쫓기: 요괴가 다가오지 않고 조우하지 않는다
  p = useHuntItem(p, itemOf('jangseung-keyring'), 1002).player
  const ghost = () => p.huntExpedition.nodes.find((n) => n.kind === 'ghost')
  assert.ok(ghost(), '시험 터에는 요괴가 나와 있어야 한다')
  {
    const g0 = `${ghost().x},${ghost().y}`
    p = moveOnHunt(p, { x: p.huntExpedition.position.x - 1, y: p.huntExpedition.position.y }, 1003).player
    assert.equal(`${ghost().x},${ghost().y}`, g0)
    assert.equal(p.huntExpedition.encounter, null)
    p = useHuntItem(p, itemOf('jujube-amulet'), 1004).player
    assert.equal(ghost(), undefined)
    assert.match(useHuntItem(p, itemOf('jujube-amulet'), 1005).error, /쫓아낼 요괴가 없다/)
  }

  // 스탯 · 성공률 보정이 실제 확률에 반영된다
  const node = p.huntExpedition.nodes.find((n) => n.kind === 'plant')
  const base = huntOddsNow(p, node.kind, node.level, stats(1))
  p = useHuntItem(p, itemOf('somdari-tea'), 1006).player
  p = useHuntItem(p, itemOf('omija-punch'), 1007).player
  const boosted = huntOddsNow(p, node.kind, node.level, stats(1))
  assert.ok(boosted.success > base.success)
  assert.equal(boosted.extra, 20)

  // 보상 2배: 성공한 시도의 보상이 두 배
  p = { ...p, huntExpedition: { ...p.huntExpedition, position: { x: node.x, y: node.y } } }
  p = useHuntItem(p, itemOf('serpent-chest'), 1008).player
  const doubled = attemptHunt(p, node.id, stats(50), 1009, () => 0)
  assert.equal(doubled.success, true)
  assert.match(doubled.logs[0], /보상 2배/)
  assert.equal(doubled.player.huntExpedition.doubleLeft, 2)
  assert.equal(doubled.player.huntExpedition.oddsBuff.left, 4)
  // 시도 회복
  const left = doubled.player.huntExpedition.nodes.find((n) => n.id === node.id).attemptsLeft
  const restored = useHuntItem(doubled.player, itemOf('loofah-namul'), 1010).player
  assert.equal(restored.huntExpedition.nodes.find((n) => n.id === node.id).attemptsLeft, left + 1)
  assert.match(useHuntItem({ ...restored, inventory: {} }, itemOf('loofah-namul'), 1011).error, /갖고 있지 않다/)
})

test('B16 장비: 개척 보정(턴 · 성공률 · 추가 보상)이 입장과 확률에 반영된다', () => {
  const pl = { ...player(), equip: { body: 'weasel-galot', trinket: 'dragon-hatstring' } }
  assert.deepEqual(gearHuntBonus(pl), { turns: 5, odds: 8, bonus: 0 })
  const site = fixtureSite()
  const p = enterHuntSite(pl, site, 1000, () => 0.99).player
  assert.equal(p.huntExpedition.maxTurns, site.maxTurns + 5)
  const node = p.huntExpedition.nodes.find((n) => n.kind === 'plant')
  assert.equal(huntOddsNow(p, node.kind, node.level, stats(10)).extra, 8)
})

test('B16 화면: 개척 아이템 칸 · 건네기 대상 · 단독 전투 판 효과가 연결돼 있다', () => {
  const field = read('../src/components/locations/HuntField.jsx')
  assert.match(field, /data-hunt-items/)
  assert.match(field, /isHuntItem\(itemOf\(id\)\)/)
  assert.match(field, /act\(\{ type: 'item', itemId: pickedItem\.item\.id \}\)/)
  assert.match(read('../src/components/locations/Pioneer.jsx'), /showItems=\{false\}/) // 서버 검증 개척(별도 장부)에는 넣지 않는다
  const game = read('../src/Game.jsx')
  assert.match(game, /action\.type === 'item' \? useHuntItem\(/)
  assert.match(game, /setSoloItemFx\(/)
  assert.match(read('../src/components/locations/Battle.jsx'), /applyItemToBattle\(cur, itemFx\.effect/)
  assert.match(read('../src/components/InventoryModal.jsx'), /itemNeedsTarget\(picked\)/)
})
