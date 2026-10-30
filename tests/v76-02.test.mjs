import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bellTick, mpCostOf, newBattle, psychicTurn } from '../src/game/battle.js'
import { itemOf } from '../src/game/items.js'
import { createMB, beginRound, resolveTurn, submit, useItemMB } from '../src/game/mbattle.js'

const stats = (overrides={}) => ({ insight:10, aggression:10, endurance:10, control:10, agility:10, comprehension:10, ...overrides })
const rng = (v) => () => v
const setupMulti = () => {
  const mb = createMB('foxfire', [
    {id:'fast',name:'빠름',stats:stats({agility:15}),hp:100,hpMax:100,mp:100,mpMax:100},
    {id:'slow',name:'느림',stats:stats({agility:5}),hp:100,hpMax:100,mp:100,mpMax:100},
  ],rng(0.5))
  beginRound(mb,rng(0.5))
  assert.equal(mb.turn,'fast')
  return mb
}

test('무당방울: 이해 10이면 10%만 회복 발동, 무당방울 없으면 회복 없음',()=>{
  assert.equal(bellTick(stats({fx:'sword', comprehension:10}),rng(0.01)),null)
  assert.deepEqual(bellTick(stats({fx:'bell', comprehension:10}),rng(0.09)), {chance:10,roll:10,heal:1})
  assert.equal(bellTick(stats({fx:'bell', comprehension:10}),rng(0.10)),null)
  assert.equal(bellTick(stats({fx:'bell', comprehension:0}),rng(0)),null)
  assert.equal(bellTick(stats({fx:'bell', comprehension:250}),rng(0.99))?.chance,100)
})

test('원숭이 손: 체력 30 감소 시 의지력 40 소모, 부족하면 무효',()=>{
  const s = newBattle('scarecrow',stats(),rng(0.5),100,100)
  const r = psychicTurn(s,'monkey-paw',{stats:stats(),mp:50,sacrifice:30},rng(0.5))
  assert.equal(r.invalid,undefined)
  assert.equal(r.mpCost,40)
  assert.equal(r.state.php,70)
  assert.equal(s.php,100)
  const missing = psychicTurn(s,'monkey-paw',{stats:stats(),mp:39,sacrifice:30},rng(0.5))
  assert.equal(missing.invalid,true)
  assert.equal(missing.state.php,100)
})

test('원숭이 손: 석장 소모 할인 및 효험 추가 소모가 상세 설명/계산과 일치',()=>{
  const st=stats({fx:'staff'})
  const s = newBattle('scarecrow',st,rng(0.5),100,100)
  assert.equal(mpCostOf(st,30),24)
  const r = psychicTurn(s,'monkey-paw',{stats:st,mp:100,sacrifice:30,buff:true},rng(0.5))
  assert.equal(r.mpCost,40) // 30 체력 +10 기본 의지력 40, 석장 20% 할인 32 + 효험 8
})

test('불가살이: 막기 불가 상태에서 턴 소모 아이템을 쓰면 상태 해제되고 다음 사람 차례로 넘어간다',()=>{
  const mb=setupMulti()
  const fast=mb.members.find(m=>m.id==='fast')
  fast.bound=true
  assert.equal(submit(mb,'fast',{action:'guard'}).error,'bound')
  assert.equal(useItemMB(mb,'fast',itemOf('bag-snack')).ok,true)
  assert.equal(fast.bound,true, '아이템을 적용한 순간에는 아직 턴을 소비하기 전')
  resolveTurn(mb,rng(0.5))
  assert.equal(mb.turn,'slow')
  assert.equal(fast.bound,false, '유효한 아이템으로 턴을 사용했으므로 막기 불가 종료')
})

test('불가살이: 턴 비소모 아이템을 사용한 것만으로 막기 불가가 조기 종료되지 않는다',()=>{
  const mb=setupMulti()
  const fast=mb.members.find(m=>m.id==='fast')
  fast.bound=true
  assert.equal(useItemMB(mb,'fast',itemOf('picnic')).ok,true)
  assert.equal(fast.bound,true)
  assert.equal(mb.turn,'fast')
  assert.equal(submit(mb,'fast',{action:'guard'}).error,'bound')
  assert.equal(submit(mb,'fast',{action:'attack'}).ok,true)
  resolveTurn(mb,rng(0.5))
  assert.equal(fast.bound,false)
})

test('불가살이: 행동불능/자동 턴도 막기 불가가 유지되지 않는다',()=>{
  const mb=setupMulti()
  const fast=mb.members.find(m=>m.id==='fast')
  fast.bound=true
  fast.stun=1
  resolveTurn(mb,rng(0.5))
  assert.equal(fast.stun,0)
  assert.equal(fast.bound,false)
})

test('UI: 버리기 버튼이 착용 버튼 이후, 일행 상태는 신속 내림차순',()=>{
  const inv=readFileSync(new URL('../src/components/InventoryModal.jsx',import.meta.url),'utf8')
  assert.ok(inv.indexOf('data-equip>')<inv.indexOf('>버리기</button>'))
  const multi=readFileSync(new URL('../src/components/locations/MultiBattle.jsx',import.meta.url),'utf8')
  assert.match(multi,/const orderedMates = \[\.\.\.view\.members\]\.sort\(\(a, b\) => \(b\.agility/)
  assert.match(multi,/aria-label="일행 상태">\s*\{orderedMates\.map/)
})
