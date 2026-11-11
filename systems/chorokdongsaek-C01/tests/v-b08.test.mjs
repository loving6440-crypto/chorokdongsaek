import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as I from '../src/game/items.js'
import * as B from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'
import { RECIPES } from '../src/game/crafting.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { B08_RECIPES, B08_COOK_RECIPES, B08_ITEMS, B08_ICON_SPECS } from '../src/game/recipesB08.js'
import { B08_SHEET_OVERRIDES } from '../src/game/itemsB08.js'
import { itemLevel, recipeLevel, recipeDepth, materialTable, MATERIAL_SOURCES } from '../src/game/materialLevels.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const fixed = (v) => () => v
const stats = (n = 10, extra = {}) => ({ insight: n, aggression: n, endurance: n, control: n, agility: n, comprehension: n, ...extra })

// ───────── 새 제작법 100개 ─────────
test('v-B.08 제작법: 공작소 50 · 조리실 50, 공작소 안에 장비 10 · 장신구 10', () => {
  assert.equal(B08_RECIPES.length, 50)
  assert.equal(B08_COOK_RECIPES.length, 50)
  const slots = B08_RECIPES.map((r) => I.itemOf(r.result)).filter((it) => it.kind === 'gear')
  assert.equal(slots.filter((it) => it.slot === 'body').length, 10)
  assert.equal(slots.filter((it) => it.slot === 'trinket').length, 10)
  for (const r of B08_COOK_RECIPES) assert.notEqual(I.itemOf(r.result).kind, 'gear', `${r.result} 조리실에서는 장비가 나오지 않는다`)
})

test('v-B.08 제작법: 모두 게임에 들어가 있고, 재료는 모두 실제로 있으며, id 가 겹치지 않는다', () => {
  for (const r of B08_RECIPES) assert.ok(RECIPES.some((x) => x.id === r.id), r.id)
  for (const r of B08_COOK_RECIPES) assert.ok(COOK_RECIPES.some((x) => x.id === r.id), r.id)
  const ids = [...RECIPES, ...COOK_RECIPES].map((r) => r.id)
  assert.equal(new Set(ids).size, ids.length)
  const itemIds = I.ITEMS.map((i) => i.id)
  assert.equal(new Set(itemIds).size, itemIds.length)
  for (const r of [...B08_RECIPES, ...B08_COOK_RECIPES]) for (const [id, n] of r.inputs) {
    assert.ok(I.itemOf(id)?.id === id, `${r.id}: ${id} 없음`)
    assert.ok(n >= 1)
  }
  for (const it of B08_ITEMS) assert.ok([...B08_RECIPES, ...B08_COOK_RECIPES].some((r) => r.result === it.id), `${it.id} 만드는 법이 없다`)
})

test('v-B.08 제작법: 모든 재료에 적정 레벨이 있다 (수급처 없는 재료는 쓰지 않는다)', () => {
  for (const r of [...B08_RECIPES, ...B08_COOK_RECIPES]) assert.notEqual(recipeLevel(r), null, r.id)
})

test('v-B.08 제작법: 적정 레벨이 고르게 오른다 (낮은 · 중간 · 높은 구간이 다 있다)', () => {
  for (const list of [B08_RECIPES, B08_COOK_RECIPES]) {
    const lv = list.map((r) => recipeLevel(r)).sort((a, b) => a - b)
    assert.ok(lv[0] <= 5, `가장 쉬운 것: ${lv[0]}`)
    assert.ok(lv.at(-1) >= 200, `가장 어려운 것: ${lv.at(-1)}`)
    assert.ok(lv.filter((v) => v <= 20).length >= 10)
    assert.ok(lv.filter((v) => v > 20 && v <= 60).length >= 10)
    assert.ok(lv.filter((v) => v > 60).length >= 5)
  }
})

test('v-B.08 2중 제작: 만든 것을 다시 재료로 쓰는 제작법이 10개 이상, 3중도 있다', () => {
  const all = [...B08_RECIPES, ...B08_COOK_RECIPES]
  const two = all.filter((r) => recipeDepth(r) >= 2)
  assert.ok(two.length >= 10, `2중 제작 ${two.length}개`)
  assert.ok(all.some((r) => recipeDepth(r) >= 3))
  // 예: 칡 뿌리 → 노끈 → 도깨비불 등롱 → 혼백 등불
  const lantern = all.find((r) => r.result === 'soul-lantern')
  assert.equal(recipeDepth(lantern), 3)
  assert.ok(lantern.inputs.some(([id]) => id === 'ghostfire-lantern'))
})

test('v-B.08 아이콘: 새 아이템 100종과 까치 깃 모두 문양이 있다', () => {
  const src = read('../src/components/iconsB08.jsx')
  for (const it of B08_ITEMS) {
    const spec = B08_ICON_SPECS[it.id]
    assert.ok(spec, it.id)
    assert.ok(new RegExp(`\\n  ${spec[0]}: \\(`).test(src), `${it.id}: 모양 ${spec[0]}`)
  }
  assert.match(src, /'magpie-plain-feather'/)
  assert.match(read('../src/components/ItemIcon.jsx'), /Object\.assign\(CUSTOM_ICONS, B08_ICONS\)/)
})

// ───────── 재료 수급처 · 적정 레벨 ─────────
test('v-B.08 적정 레벨: 개척 칸 레벨 중 가장 낮은 것, 매점 · 텃밭은 0, 제작품은 재료의 최댓값', () => {
  assert.equal(itemLevel('mugwort'), Math.min(...MATERIAL_SOURCES.mugwort.map((s) => s.level)))
  assert.equal(itemLevel('brush'), 0)
  assert.equal(itemLevel('carrot'), 0)
  assert.equal(itemLevel('rice-grain'), itemLevel('rice-seeds'))
  assert.equal(itemLevel('twine'), itemLevel('arrowroot'))
  assert.equal(itemLevel('talisman-ink'), Math.max(itemLevel('pine-ink'), itemLevel('red-pigment')))
})

test('v-B.08 수급처 없음: 아직 얻을 길이 없는 재료만 모은다', () => {
  const none = materialTable().filter((r) => r.level == null).map((r) => r.id).sort()
  assert.deepEqual(none, ['alcohol-lamp', 'broken-inkstick', 'cherry-branch', 'cloth-scrap', 'crumpled-hanji', 'dye', 'friendship-letter', 'magpie-plain-feather', 'nail', 'pencil', 'rice', 'small-pot', 'split-brush', 'sugar'].sort())
  assert.equal(itemLevel('inkstick'), 0, '먹은 시트대로 매점에서 산다')
  assert.ok(I.STORE_ITEMS.some((it) => it.id === 'inkstick'))
})

// ───────── 시트에 맞춘 글 · 효과 ─────────
test('v-B.08 시트: 이름 · 설명이 바뀌었다', () => {
  assert.equal(I.itemOf('arrowroot').name, '칡 뿌리')
  assert.equal(I.itemOf('magpie-feather').name, '흰까치 깃')
  assert.equal(I.itemOf('weasel-fur').name, '흰족제비 털')
  assert.equal(I.itemOf('turtle-shell').name, '천년거북 등딱지')
  assert.match(I.itemOf('wild-grape').desc, /포도와는!/)
  assert.equal(I.itemOf('magpie-plain-feather').name, '까치 깃')
  assert.equal(I.itemOf('acorn').effectText, '제작용 재료')
  // 시트보다 나중에 정한 규칙은 그대로 둔다
  assert.equal(B08_SHEET_OVERRIDES['w-bell'], undefined)
  assert.equal(B08_SHEET_OVERRIDES['polishing-stone'], undefined)
  assert.equal(B08_SHEET_OVERRIDES.whetstone, undefined)
})

test('v-B.08 장신구: 뱀딸기 귀걸이 호전 +1, 금관 · 기합의 띠 · 도깨비 탈은 장신구 칸에 낀다', () => {
  for (const id of ['berry-earring', 'gold-crown', 'headband', 'goblin-mask']) {
    assert.equal(I.itemOf(id).kind, 'gear', id)
    assert.equal(I.itemOf(id).slot, 'trinket', id)
  }
  const p = { inventory: { 'berry-earring': 1 }, equip: {} }
  const on = I.equipItem(p, 'berry-earring').player
  assert.equal(I.gearBonus(on).aggression, 1)
  assert.equal(I.trinketFx(I.equipItem({ inventory: { 'goblin-mask': 1 }, equip: {} }, 'goblin-mask').player), 'goblin-mask')
})

test('v-B.08 도깨비 탈: 공격력 ×3(+200%), 돌발 +50%, 단체 전투에서 (호전/3)% 확률로 아군 공격', () => {
  const st = stats(20, { aggression: 30, control: 20 })
  assert.equal(B.atkMult(st), 1)
  assert.equal(B.rashPercent(st), 10)
  const mask = Object.defineProperty({ ...st }, 'trinket', { value: 'goblin-mask', enumerable: false })
  assert.equal(B.atkMult(mask), 3)
  assert.equal(B.rashPercent(mask), 60)
  assert.equal(B.maskFriendlyFirePercent(mask), 10)
  assert.equal(B.maskFriendlyFirePercent(st), 0)
  // 단풍(×1.1)과 겹친다
  Object.defineProperty(mask, 'special', { value: 'maple', enumerable: false })
  assert.ok(Math.abs(B.atkMult(mask) - 3.3) < 1e-9)
  // 무구 봉인이 걸려도 장신구 효과는 남는다
  assert.equal(B.afflictStats(mask, { weaponSeal: 2 }).trinket, 'goblin-mask')
})

test('v-B.08 도깨비 탈 (단체): 홀리면 상대 대신 아군이 그 피해를 받는다 — 아군은 체력 1 아래로 떨어지지 않는다', () => {
  // 호전 300 → (300/3)% = 100%: 반드시 홀린다. 절제도 300이라 돌발(호전 − 절제 + 50 = 50%)은 굴림 51에서 나지 않는다.
  const mk = (id, extra = {}) => ({ id, name: id, stats: stats(20, { aggression: id === 'a' ? 300 : 20, control: id === 'a' ? 300 : 20, agility: id === 'a' ? 60 : 1 }), hp: 100, hpMax: 100, mp: 50, mpMax: 50, psychics: [], ...extra })
  const mb = MB.createMB('dueoksini', [mk('a', { trinket: 'goblin-mask' }), mk('b')])
  assert.equal(mb.members[0].stats.trinket, 'goblin-mask')
  MB.beginRound(mb, fixed(0.5))
  for (let g = 0; g < 5 && mb.turn !== 'a'; g++) if (mb.turn) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, fixed(0.5)) } else MB.beginRound(mb, fixed(0.5))
  assert.equal(mb.turn, 'a')
  const ehp = mb.ehp
  MB.submit(mb, 'a', { action: 'attack' })
  MB.resolveTurn(mb, fixed(0.5))
  const b = mb.members.find((m) => m.id === 'b')
  assert.ok(mb.log.some((l) => /도깨비 탈에 홀려 b을\(를\) 공격했다/.test(l.text || '')), '홀림 로그')
  assert.equal(mb.ehp, ehp, '상대는 피해를 받지 않는다')
  assert.ok(b.php >= 1 && b.php < 100)
  assert.equal(mb.over, null, '상대가 쓰러지지 않았다')
  assert.ok(!mb.log.some((l) => /쓰러졌다/.test(l.text || '')))
})

test('v-B.08 기합의 띠 (단체): 에너지드링크 없이 쓰러지면 한 번 체력 1로 일어서고 headbandUsed 가 남는다', () => {
  const mb = MB.createMB('dueoksini', [{ id: 'a', name: 'A', trinket: 'headband', stats: stats(1), hp: 1, hpMax: 100, mp: 0, mpMax: 50, psychics: [] }])
  assert.equal(mb.members[0].headband, true)
  for (let g = 0; g < 12 && !mb.members[0].headbandUsed && !mb.over; g++) {
    if (mb.turn) { MB.submit(mb, mb.turn, { action: 'attack' }); MB.resolveTurn(mb, fixed(0.5)) } else MB.beginRound(mb, fixed(0.5))
  }
  const a = mb.members[0]
  assert.equal(a.headbandUsed, true)
  assert.equal(a.headband, false)
  assert.ok(mb.log.some((l) => /기합의 띠가 끊어지며 체력 1로 다시 일어섰다/.test(l.text || '')))
  assert.equal(MB.viewOf(mb).members[0].headbandUsed, true)
})

test('v-B.08 기합의 띠 (혼자 · 서버 · 화면): 쓰러지면 띠가 끊어져 장신구 칸이 빈다', () => {
  const p = I.equipItem({ inventory: { headband: 1 }, equip: {} }, 'headband').player
  assert.equal(I.trinketFx(p), 'headband')
  const broken = I.breakTrinket(p, 'headband')
  assert.equal(I.equipOf(broken).trinket, null)
  assert.equal(broken.inventory.headband, undefined, '소지품으로 돌아오지 않는다')
  assert.equal(I.breakTrinket(p, 'gold-crown'), p, '다른 장신구면 그대로')
  const battle = read('../src/components/locations/Battle.jsx')
  assert.match(battle, /기합의 띠가 끊어지며 체력 1로 다시 일어섰다/)
  assert.match(battle, /onHeadbandUsed\?\.\(\)/)
  const game = read('../src/Game.jsx')
  assert.match(game, /headbandOn=\{trinketFx\(player\) === 'headband'\}/)
  assert.match(game, /me\.headbandUsed && !mbRef\.current\.headbandDone/)
  assert.match(game, /trinket: trinketFx\(cur\)/)
  assert.match(read('../server/index.js'), /trinket: typeof me\?\.trinket === 'string'/)
})

test('v-B.08 일기장: 쓰면 의지력을 (인내 + 절제)만큼 회복한다', () => {
  const d = I.itemOf('diary')
  assert.deepEqual(d.effect.mpStats, ['endurance', 'control'])
  assert.equal(d.effectText, '의지를 (인내+절제)만큼 회복한다.')
  assert.equal(I.canUseItem(d, { inBattle: false, countNow: 1 }).ok, true)
  assert.equal(I.canUseItem(d, { inBattle: true, countNow: 1 }).ok, false, '전투 중에는 못 쓴다')
  assert.match(read('../src/Game.jsx'), /e\.mpStats \? e\.mpStats\.reduce/)
})

test('v-B.08 시트 제작법: 소형 돌제단 · 나물무침 · 정체불능의 보약을 만들 수 있다', () => {
  assert.deepEqual(RECIPES.find((r) => r.result === 'small-altar').inputs, [['stone', 5], ['fine-woodchip', 3]])
  assert.deepEqual(COOK_RECIPES.find((r) => r.result === 'herb-salad').inputs, [['chwinamul', 1]])
  assert.deepEqual(COOK_RECIPES.find((r) => r.result === 'mystery-tonic').inputs, [['licorice', 2], ['waning-flower', 1], ['crescent-flower', 1], ['lake-water', 1]])
})
