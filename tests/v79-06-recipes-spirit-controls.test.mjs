import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RECIPES, RECIPE_SHOP, knowsRecipe, startCraft } from '../src/game/crafting.js'
import { COOK_RECIPES, cook, knowsCookRecipe } from '../src/game/cooking.js'
import { itemOf } from '../src/game/items.js'
import { moveHuntCreatures } from '../src/game/huntField.js'
import { countSlots } from '../src/game/inventoryCapacity.js'

const workshop = readFileSync(new URL('../src/components/locations/Workshop.jsx', import.meta.url), 'utf8')
const kitchen = readFileSync(new URL('../src/components/locations/Cooking.jsx', import.meta.url), 'utf8')
const field = readFileSync(new URL('../src/components/locations/HuntField.jsx', import.meta.url), 'utf8')

test('모든 등록 제작법은 정확한 장소에 표시될 수 있고 재료/결과물이 존재한다', () => {
  assert.ok(RECIPES.length >= 20)
  assert.ok(COOK_RECIPES.length >= 9)
  assert.deepEqual(RECIPE_SHOP, [])
  assert.equal(knowsRecipe({}, 'r-goblin-mask'), true)
  assert.equal(knowsCookRecipe({}, 'cook-rice-cake'), true)
  assert.equal(knowsRecipe({}, 'no-such-recipe'), false)
  for (const r of [...RECIPES, ...COOK_RECIPES]) {
    assert.ok(itemOf(r.result), `결과물 누락: ${r.id}`)
    for (const [id, count] of r.inputs) {
      assert.ok(itemOf(id), `재료 누락: ${r.id} → ${id}`)
      assert.ok(Number.isInteger(count) && count > 0)
    }
  }
  assert.match(workshop, /const known = RECIPES/)
  assert.match(kitchen, /const known = COOK_RECIPES/)
  assert.ok(RECIPES.some(r => r.id === 'r-goblin-mask' && r.result === 'goblin-mask'))
  assert.ok(COOK_RECIPES.some(r => r.id === 'cook-soybean-oil' && r.result === 'soybean-oil'))
})

test('공작소 즉시 제작은 별도 습득 없이 재료를 소모하며 수량·업적 상태가 맞다', () => {
  const player = { inventory: { stone: 18 } }
  const made = startCraft(player, 'r-whetstone', 2)
  assert.equal(made.error, undefined)
  assert.equal(made.minutes, 0)
  assert.equal(made.player.crafting, undefined)
  assert.deepEqual(made.player.inventory, { whetstone: 2 })
  assert.deepEqual(player.inventory, { stone: 18 }, '입력 상태 직접 수정 금지')
  assert.ok(startCraft(player, 'r-whetstone', 3).error)
  assert.ok(startCraft(player, 'nonexistent', 1).error)
  assert.ok(startCraft(player, 'r-whetstone', 1.5).error)
  const lamp = startCraft({ inventory: { 'cloth-scrap': 2, 'alcohol-lamp': 1 } }, 'r-exercise-lamp', 1, false, 123456)
  assert.equal(lamp.player.cleared['exercise-lamp'], 123456)
})

test('공작소/조리실 즉석 제작은 소지품 30칸 제한도 지킨다', () => {
  const inventory = Object.fromEntries(Array.from({length: 30}, (_,i) => [`dye-${i}`, 1]))
  // 유효 아이템 30종으로 한도를 채우되 결과물이 들어갈 공간은 없다.
  const recipes = [...RECIPES, ...COOK_RECIPES]
  const ids = [...new Set(recipes.flatMap(r=>[r.result,...r.inputs.map(([id])=>id)]))].filter(x=>itemOf(x))
  const full = Object.fromEntries(ids.slice(0,30).map(id=>[id,1]))
  assert.equal(countSlots(full), 30)
  const fail = startCraft({inventory: full}, 'r-whetstone', 1)
  assert.ok(fail.error)
  const cooked = cook({ inventory: { soybean: 5 } }, 'cook-soybean-oil')
  assert.deepEqual(cooked.player.inventory, { 'soybean-oil': 1 })
  assert.equal(cook({},'bad-recipe').error,'그런 요리법은 없다.')
})

test('영물은 네 모서리의 2×2 사각형 안에 닿으면 즉시 멈춘다 (v-B.03)', () => {
  // 2×2 구역 16칸: 어느 칸이든 그 자리에서 멈춘다
  const zone = [0, 1, 8, 9].flatMap((x) => [0, 1, 8, 9].map((y) => [x, y]))
  for (const [x, y] of zone) {
    let current = { position: { x: 5, y: 5 }, nodes: [{ id: 'spirit', kind: 'spirit', attemptsLeft: 3, x, y }] }
    for (let i = 0; i < 12; i++) current = moveHuntCreatures(current)
    assert.deepEqual([current.nodes[0].x, current.nodes[0].y], [x, y], `${x},${y}`)
  }
  // 구역 밖(C3 등)에서는 도망치고, 구역에 닿는 순간 멈춘다
  for (const [x, y] of [[2, 2], [2, 0], [0, 2], [7, 7]]) {
    const moving = moveHuntCreatures({ position: { x: 5, y: 5 }, nodes: [{ id: 'spirit', kind: 'spirit', attemptsLeft: 3, x, y }] })
    assert.notDeepEqual([moving.nodes[0].x, moving.nodes[0].y], [x, y], `${x},${y}에서는 도망`)
  }
  let run = { position: { x: 5, y: 5 }, nodes: [{ id: 'spirit', kind: 'spirit', attemptsLeft: 3, x: 3, y: 3 }] }
  for (let i = 0; i < 10; i++) run = moveHuntCreatures(run)
  const end = run.nodes[0]
  assert.ok((end.x <= 1 || end.x >= 8) && (end.y <= 1 || end.y >= 8), '결국 2×2 구역에서 멈춘다')
  assert.ok(end.x === 1 || end.y === 1 || end.x === 8 || end.y === 8, '모서리 끝까지 가지 않고 구역에 닿자마자 멈춘다')
})

test('플레이어는 방향 이동 버튼으로만 움직이며 타일·키보드는 정보 선택만 한다',()=>{
  assert.match(field,/const chooseCell = p => \{\s*\/\/[^\n]*\n\s*setSelected\(p\)\s*\}/)
  assert.doesNotMatch(field,/onKeyDown=\{/)
  assert.doesNotMatch(field,/const onKey\s*=/)
  assert.match(field,/onClick=\{\(\) => move\(dx, dy\)\}/)
  assert.match(field,/aria-label="개척 방향 버튼"/)
  const controls = field.indexOf('aria-label="개척 방향 버튼"')
  const details = field.indexOf('aria-label="타일 정보"')
  assert.ok(controls > 0 && controls < details, '이동 버튼이 정보 박스 위에 있어야 함')
  assert.match(field,/h-\[5\.5rem\]/)
})
