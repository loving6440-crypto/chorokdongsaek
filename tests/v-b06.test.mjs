import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as I from '../src/game/items.js'
import * as B from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'
import { sellPriceOf, sellableItems, sellItem, LOST_PRICES } from '../src/game/sell.js'
import { RECIPES, startCraft } from '../src/game/crafting.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { HUNT_BONUSES } from '../src/game/huntSites.js'
import { buyGardenSeed, plantGardenSeed, GARDEN_EXTRA_SEEDS } from '../src/game/garden.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const fixed = (v) => () => v
const noon = new Date(2026, 10, 7, 12, 0, 0).getTime()
const stats = (n = 10, extra = {}) => ({ insight: n, aggression: n, endurance: n, control: n, agility: n, comprehension: n, ...extra })

// ───────── 매점 판매 ─────────
test('v-B.06 매점: 잃어버린 물건은 정해진 값, 살 수 있는 물건은 1/5, 재료는 얻기 어려운 만큼, 장비·완성품은 받지 않는다', () => {
  assert.deepEqual(LOST_PRICES, { 'lost-hairband': 1, 'lost-slippers': 5, 'lost-love-letter': 8, 'lost-phone': 20 })
  for (const [id, v] of Object.entries(LOST_PRICES)) assert.equal(sellPriceOf(id), v)
  for (const it of I.STORE_ITEMS) assert.equal(sellPriceOf(it), Math.max(1, Math.floor(it.price / 5)), it.id)
  assert.equal(sellPriceOf('seed-carrot'), 1, '씨앗 3냥 → 1냥(최소)')
  // 재료: 쉬운 것 < 어려운 것 < 영물
  assert.ok(sellPriceOf('stone') < sellPriceOf('fox-fur'))
  assert.ok(sellPriceOf('fox-fur') < sellPriceOf('somdari'))
  assert.ok(sellPriceOf('somdari') < sellPriceOf('turtle-shell'))
  assert.ok(sellPriceOf('chestnut') > sellPriceOf('acorn'), '같은 칸이라도 드물게 나오면 비싸다')
  for (const it of I.ITEMS.filter((x) => I.isMaterial(x))) assert.ok(sellPriceOf(it) >= 1, it.id)
  // v-B.18: 만든 완성품(숫돌 · 연마석 · 비빔밥 · 깃털 장식 등)은 이제 판다. 무구 · 교복(만들 수 없는 장비) · 화투패 · 증표는 그대로 받지 않는다.
  for (const id of ['w-fan', 'uniform', 'hwatu-pine', 'goblin-token']) assert.equal(sellPriceOf(id), null, id)
  for (const id of ['whetstone', 'polishing-stone', 'bibimbap', 'feather-deco']) assert.ok(sellPriceOf(id) >= 1, id)
})

test('v-B.06 매점: 판매하면 돈이 들어오고 소지품이 줄며, 가진 것보다 많이 팔 수 없다', () => {
  const p = { money: 10, inventory: { 'lost-phone': 2, stone: 5, 'w-fan#test': 1 } }
  assert.deepEqual(sellableItems(p).map((x) => x.item.id).sort(), ['lost-phone', 'stone'])
  const r = sellItem(p, 'lost-phone', 2, noon)
  assert.equal(r.player.money, 50); assert.equal(r.player.inventory['lost-phone'], undefined); assert.equal(r.gained, 40)
  assert.ok(sellItem(p, 'stone', 6, noon).error)
  assert.ok(sellItem(p, 'w-fan#test', 1, noon).error)
  // 잃어버린 물건은 더 이상 '사용'으로 돈이 되지 않는다(매점에서 판다). 러브레터는 그대로 의지력 +30.
  assert.match(I.canUseItem(I.itemOf('lost-phone'), { countNow: 1 }).why, /매점/)
  assert.equal(I.canUseItem(I.itemOf('lost-love-letter'), { countNow: 1 }).ok, true)
  const ui = read('../src/components/locations/Store.jsx')
  assert.match(ui, /data-store-tab="sell"/); assert.match(ui, /data-sell-confirm/)
  assert.match(read('../src/Game.jsx'), /onSell=\{sellToStore\}/)
})

// ───────── 강화 ─────────
test('v-B.06 강화: n번째 강화에 연마석 n개 (1 … 15), 특수 강화는 화투패 1 + 숫돌 9', () => {
  assert.deepEqual(Array.from({ length: 15 }, (_, i) => I.enhCostFor(i).polishing), Array.from({ length: 15 }, (_, i) => i + 1))
  assert.equal(I.SPECIAL_WHETSTONES, 9)
  const base = { hp: 100, mp: 100, spirit: 500, money: 1000, inventory: { 'w-sword#test': 1, 'hwatu-pine': 1, whetstone: 8 }, enh: {}, weaponSpecial: {}, equip: {} }
  assert.match(I.specialEnhanceWeapon(base, 'w-sword#test', 'pine').error, /숫돌 9개/)
  const ok = I.specialEnhanceWeapon({ ...base, inventory: { ...base.inventory, whetstone: 9 } }, 'w-sword#test', 'pine')
  assert.ok(!ok.error); assert.equal(ok.player.inventory.whetstone, undefined); assert.equal(ok.player.inventory['hwatu-pine'], undefined)
  const armory = read('../src/components/locations/Armory.jsx')
  assert.match(armory, /숫돌 \{SPECIAL_WHETSTONES\}개/)
})

test('v-B.06 제작: 연마석 = 숫돌 1 + 자갈돌 1 (공작소), 개척 장애물 보너스는 자갈돌 1d2', () => {
  const r = RECIPES.find((x) => x.result === 'polishing-stone')
  assert.deepEqual(r.inputs, [['whetstone', 1], ['pebble', 1]])
  const made = startCraft({ inventory: { whetstone: 2, pebble: 2 } }, r.id, 2)
  assert.equal(made.player.inventory['polishing-stone'], 2)
  assert.equal(I.itemOf('pebble').name, '자갈돌')
  assert.deepEqual(HUNT_BONUSES.obstacle, { item: 'pebble', dice: 2 })
})

// ───────── 아이템 시트 ─────────
test('v-B.06 아이템 시트: 없던 것은 추가, 바뀐 설명은 반영, 조합은 그대로', () => {
  const added = { 'rice-grain': '볍씨', 'wheat-seed': '밀 씨앗', 'barley-seed': '보리 씨앗', 'goblin-token': '도깨비 증표', 'small-altar': '소형 돌제단', 'herb-salad': '나물무침', 'mystery-tonic': '정체불능의 보약' }
  for (const [id, name] of Object.entries(added)) assert.equal(I.itemOf(id)?.name, name, id)
  assert.equal(I.itemOf('goblin-token').effectText, '10개를 모을 시 무구보관소에서 무구 중 1개로 교환할 수 있다.')
  assert.match(I.itemOf('pebble').desc, /그냥 돌보다는 크고 바위보다는 작은 것/)
  assert.match(I.itemOf('bibimbap').desc, /합의하지 않고/)
  assert.match(I.itemOf('flower-pancake').desc, /달큰하고 화한 맛/)
  // 시트의 조합 28개는 공작소·조리실에 이미 똑같이 들어 있다 (몇 개만 확인)
  const rec = (list, result) => list.find((x) => x.result === result)?.inputs
  assert.deepEqual(rec(RECIPES, 'goblin-mask'), [['jangseung-piece', 2], ['fine-woodchip', 2]])
  assert.deepEqual(rec(RECIPES, 'whetstone'), [['stone', 9]])
  assert.deepEqual(rec(COOK_RECIPES, 'bibimbap'), [['chwinamul', 2], ['lettuce', 2], ['fern', 2], ['rice', 2]])
  assert.deepEqual(rec(COOK_RECIPES, 'soybean-oil'), [['soybean', 5]])
})

test('v-B.06 도깨비 증표: 10개를 원하는 무구 한 벌로 바꾼다', () => {
  const p = { inventory: { 'goblin-token': 12 } }
  const r = I.exchangeGoblinTokens(p, 'w-bow')
  assert.ok(!r.error); assert.equal(r.player.inventory['goblin-token'], 2)
  assert.ok(I.isInstance(r.id) && r.id.startsWith('w-bow#')); assert.equal(r.player.inventory[r.id], 1)
  assert.match(I.exchangeGoblinTokens({ inventory: { 'goblin-token': 9 } }, 'w-bow').error, /10개/)
  assert.ok(I.exchangeGoblinTokens(p, 'uniform').error, '무구만 고를 수 있다')
  assert.match(read('../src/components/locations/Armory.jsx'), /data-goblin-token/)
})

test('v-B.06 텃밭: 밀 씨앗·보리 씨앗을 같이 팔지만 비닐하우스에 심지는 못한다', () => {
  assert.deepEqual(GARDEN_EXTRA_SEEDS.map((x) => x.id), ['wheat-seed', 'barley-seed'])
  const r = buyGardenSeed({ money: 10, inventory: {} }, 'barley-seed', 2)
  assert.equal(r.player.inventory['barley-seed'], 2); assert.equal(r.player.money, 4)
  assert.ok(plantGardenSeed(r.player, 0, 'barley-seed').error)
  assert.ok(!I.STORE_ITEMS.some((x) => x.id === 'wheat-seed'), '매점 목록에는 안 나온다')
})

// ───────── 무구: 무당방울 너프 · 부채는 그대로 ─────────
test('v-B.06 무당방울: 버티기 +1은 그대로, 매 턴 회복 확률은 이해와 상관없이 10%', () => {
  const bell = stats(30, { fx: 'bell' })
  assert.equal(B.maxSurvives(bell), 2)
  assert.equal(B.maxSurvives(stats(30)), 1)
  const hit = B.bellTick(bell, fixed(0.09)) // d100 = 10 → 발동
  assert.equal(hit.chance, 10); assert.equal(hit.label, '무당방울'); assert.equal(hit.basis, '10%'); assert.ok(hit.heal >= 1 && hit.heal <= 30)
  assert.equal(B.bellTick(bell, fixed(0.10)), null, 'd100 = 11 → 안 됨 (예전엔 이해 30이면 30%)')
  assert.match(I.itemOf('w-bell').effectText, /매 턴마다 10% 확률로 1d\(이해\)/)
  assert.match(I.itemOf('w-bell').effectText, /의지력이 0이면 두 번째 버티기도 할 수 없다/)
  // 버티기는 의지력 2 이상일 때만 (0이 된 의지력은 채워지지 않는다)
  const down = { ...B.newBattle('scarecrow', bell, fixed(0.5), 100, 100), php: 0, survived: 1 }
  assert.equal(B.resolveSurvive(down, true, 0, bell, fixed(0.99)).state.survived, 1, '의지력 0이면 두 번째 버티기도 못 한다')
  assert.equal(B.resolveSurvive(down, true, 5, bell, fixed(0.99)).state.survived, 2, '의지력이 남아 있으면 두 번째 버티기')
})

test('v-B.06 부채: 원래 효과 그대로 (무조건 선공 · 적 공격 회피), 버티기·회복은 없다', () => {
  const fan = stats(30, { fx: 'fan' })
  assert.equal(B.maxSurvives(fan), 1)
  assert.equal(B.bellTick(fan, fixed(0)), null)
  assert.match(I.itemOf('w-fan').effectText, /무조건 나 또는 나의 일행이 선공/)
  const init = B.rollInitiative({ act: 99 }, { ...fan, agility: 1 }, fixed(0))
  assert.equal(init.playerFirst, true); assert.equal(init.fan, true)
  // 회피: d100 = 1 ≤ 10 + 1d이해 → 빗나간다
  const s = { ...B.newBattle('scarecrow', fan, fixed(0.5), 100, 100), queue: ['jab', 'jab', 'jab', 'jab', 'jab'] }
  const seq = () => { let i = 0; return () => (i++ === 0 ? 0.5 : 0) } // 적의 명중 굴림은 보통, 부채 굴림은 d100 = 1
  const a = B.enemyTurn(s, { stats: { ...fan, endurance: 0 }, mp: 50 }, seq())
  assert.equal(a.state.php, s.php); assert.ok(a.events.some((e) => /부채 바람에 휩쓸려 빗나갔다/.test(e.text || '')))
  const b = B.enemyTurn(s, { stats: { ...stats(30), endurance: 0 }, mp: 50 }, seq())
  assert.ok(b.state.php < s.php, '부채가 없으면 맞는다')
  // 다인: 부채를 든 사람이 있으면 일행이 무조건 먼저
  const mb = MB.createMB('dueoksini', [{ id: 'a', name: 'A', fx: 'fan', stats: { ...fan, agility: 1 }, mp: 50, mpMax: 50, psychics: [], equip: {} }])
  MB.openingInitiative(mb, fixed(0))
  assert.ok(mb.log.some((l) => /부채 덕에/.test(l.text || '')))
})

// ───────── 전투: 칠성낙인 · 에너지드링크 ─────────
test('v-B.06 칠성낙인: 내가 직접 고르는 첫 번째 턴이면 쓸 수 있다 (상대 선공·돌발로 억지로 움직인 턴은 세지 않는다)', () => {
  const st = stats(20)
  const ctx = { stats: st, mp: 150, baseAggression: 20 }
  let s = B.newBattle('wonhon', st, fixed(0.5), 100, 100)
  s = B.enemyTurn(s, { stats: st, mp: 150 }, fixed(0.5)).state // 상대가 먼저 움직였다
  s = B.playerTurn(s, 'attack', { stats: st, mp: 150, forced: true }, fixed(0.5)).state // 돌발 행동
  s = B.enemyTurn(s, { stats: st, mp: 150 }, fixed(0.5)).state
  assert.equal(s.myTurns, 1); assert.equal(s.choseTurns, 0)
  assert.equal(B.psychicTurn(s, 'seven-stars', ctx, fixed(0.5)).invalid, undefined, '돌발 다음 턴에도 쓸 수 있다')
  const after = B.playerTurn(s, 'guard', { stats: st, mp: 150 }, fixed(0.5)).state
  assert.equal(B.psychicTurn(after, 'seven-stars', ctx, fixed(0.5)).invalid, true, '직접 고른 턴이 지나면 못 쓴다')
  // 다인: 시간 초과로 넘어간 턴(자동 막기)도 세지 않는다
  const mk = (id, ag) => ({ id, name: id, stats: { ...st, agility: ag }, mp: 150, mpMax: 150, psychics: ['seven-stars'] })
  const mb = MB.createMB('dueoksini', [mk('fast', 30), mk('slow', 2)])
  MB.beginRound(mb, fixed(0.99))
  MB.resolveTurn(mb, fixed(0.99)) // fast: 아무것도 고르지 않음(시간 초과)
  assert.equal(mb.turn, 'slow')
  MB.submit(mb, 'slow', { action: 'guard' }); MB.resolveTurn(mb, fixed(0.99))
  for (let g = 0; g < 5 && mb.turn !== 'fast'; g++) if (mb.turn) MB.resolveTurn(mb, fixed(0.99)); else MB.beginRound(mb, fixed(0.99))
  assert.equal(mb.turn, 'fast')
  assert.ok(!MB.submit(mb, 'fast', { action: 'psychic', psychic: 'seven-stars' }).error)
  MB.resolveTurn(mb, fixed(0.99))
  assert.ok(mb.log.some((l) => /\[fast\] ✦ 칠성낙인!/.test(l.text || '')))
})

test('v-B.06 에너지드링크: 쓸 수 없는 때는 이유를 알려 준다 (쓰러진 뒤 · 이미 마신 전투)', () => {
  const e = I.itemOf('energy')
  assert.equal(I.canUseItem(e, { inBattle: true, countNow: 1 }).ok, true)
  assert.match(I.canUseItem(e, { inBattle: true, countNow: 1, downed: true }).why, /쓰러지기 전에 미리/)
  assert.match(I.canUseItem(e, { inBattle: true, countNow: 1, usedThisBattle: true }).why, /이미 사용했다/)
  const game = read('../src/Game.jsx')
  assert.match(game, /if \(!ok\.ok\) \{ notify\(ok\.why\); return \}/, '예전엔 조용히 무시됐다')
  assert.match(game, /usedItems=\{mbLive \? \(mbMe\?\.energyUsed \? \['energy'\] : \[\]\) : battleUsedItems\}/)
  // v-B.16: 같은 전투에서 다른 부활 아이템을 이미 썼는지도 함께 본다(reviveSpent).
  assert.match(read('../src/components/InventoryModal.jsx'), /usedThisBattle: usedItems\.includes\(picked\.id\) \|\| reviveSpent, downed/)
  assert.match(read('../src/components/locations/Battle.jsx'), /downed: afflictKey\[2\] === '1'/)
})
