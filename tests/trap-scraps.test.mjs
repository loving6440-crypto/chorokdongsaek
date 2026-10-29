import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS, itemOf, canUseItem } from '../src/game/items.js'
import { maxStack } from '../src/game/inventoryCapacity.js'
import { readFileSync } from 'node:fs'

test('덫 찌꺼기가 올바른 제작 재료로 등록되어 있다', () => {
  const item = itemOf('trap-scraps')
  assert.ok(item)
  assert.equal(item.name, '덫 찌꺼기')
  assert.equal(item.kind, 'material')
  assert.equal(item.price, null)
  assert.equal(item.desc, '가엾은 짐승에게 걸려 있었다. 그것을 풀어준 대가로 얻은 것이 적지 않다.')
  assert.equal(item.effectText, '제작 재료로 쓰인다.')
  assert.deepEqual(item.effect, {})
  assert.ok(item.tags.includes('재료'))
  assert.equal(maxStack(item.id), 99)
  assert.equal(ITEMS.filter(x => x.name === item.name).length, 1)
  assert.equal(canUseItem(item, { countNow: 1, inBattle: false, isParty: false }).ok, false)
})

test('덫 찌꺼기의 고유 플랫 SVG 아이콘이 등록되어 있다', () => {
  const source = readFileSync(new URL('../src/components/ItemIcon.jsx', import.meta.url), 'utf8')
  assert.match(source, /'trap-scraps':\s*\{[\s\S]*?bg: 'sand'/)
})
