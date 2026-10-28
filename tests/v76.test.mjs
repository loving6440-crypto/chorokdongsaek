import test from 'node:test'
import assert from 'node:assert/strict'
import { ENH_MAX, enhCostFor, enhanceWeapon, specialEnhanceWeapon, removeWeaponSpecial, discardInventoryItem, itemOf, enhTotal } from '../src/game/items.js'
import { mpCostOf, enduranceMitigation } from '../src/game/battle.js'

const inventory = { 'w-sword#unit': 1, 'polishing-stone': 90, whetstone: 90, 'oil-cloth': 90, 'five-knot': 90, 'cinnabar-charm': 90, 'silver-inlay': 90, 'plain-cloth': 1, 'hwatu-pine': 1 }
const player = () => ({ hp: 100, mp: 1000, spirit: 1000, money: 1500, inventory: { ...inventory }, enh: {}, weaponSpecial: {}, equip: {} })

test('15 단계 강화 비용표', () => {
  assert.equal(ENH_MAX, 15)
  for(let level=0; level<15; level++){
    const tier=Math.floor(level/3)
    assert.deepEqual(enhCostFor(level), { polishing: tier+1, material:['whetstone','oil-cloth','five-knot','cinnabar-charm','silver-inlay'][tier], quantity:level%3+1, spirit:(tier+1)*10 })
  }
  assert.equal(enhCostFor(15), null)
})
test('강화 15단계까지 적용, 비용·자원 및 초과 강화 거부', () => {
  let p=player()
  for(let i=0; i<15; i++){
    const before=p.spirit
    const r=enhanceWeapon(p,'w-sword#unit','endurance')
    assert.ok(!r.error, r.error)
    assert.equal(r.player.spirit, before-enhCostFor(i).spirit)
    p=r.player
  }
  assert.equal(enhTotal(p,'w-sword#unit'),15)
  assert.ok(enhanceWeapon(p,'w-sword#unit','endurance').error)
})
test('특수 강화 해제 시 화투패 반환, 일반 강화 유지', () => {
  let p=player()
  p=enhanceWeapon(p,'w-sword#unit','agility').player
  const r=specialEnhanceWeapon(p,'w-sword#unit','pine')
  assert.ok(!r.error,r.error)
  assert.equal(r.player.inventory['hwatu-pine'], undefined)
  const removed=removeWeaponSpecial(r.player,'w-sword#unit')
  assert.ok(!removed.error,removed.error)
  assert.equal(removed.player.inventory['hwatu-pine'],1)
  assert.equal(removed.player.inventory['plain-cloth'],undefined)
  assert.equal(enhTotal(removed.player,'w-sword#unit'),1)
  assert.equal(removed.player.weaponSpecial['w-sword#unit'],undefined)
  assert.ok(removeWeaponSpecial(removed.player,'w-sword#unit').error)
})
test('아이템 수량 검증, 무구 버리면 강화 기록 제거', () => {
  let p=player()
  assert.ok(discardInventoryItem(p,'whetstone',100).error)
  assert.ok(discardInventoryItem(p,'whetstone',-2).error)
  assert.equal(discardInventoryItem(p,'whetstone',3).player.inventory.whetstone,87)
  p.enh['w-sword#unit']={agility:2}; p.weaponSpecial['w-sword#unit']='pine'
  const r=discardInventoryItem(p,'w-sword#unit',1)
  assert.ok(!r.error)
  assert.equal(r.player.enh['w-sword#unit'],undefined)
  assert.equal(r.player.weaponSpecial['w-sword#unit'],undefined)
})
test('석장 20% 할인, 인내 감소 확률과 최저 피해 0', () => {
  assert.equal(mpCostOf({fx:'staff'},10),8)
  assert.equal(mpCostOf({fx:'staff'},30),24)
  assert.equal(mpCostOf({fx:'sword'},30),30)
  assert.deepEqual(enduranceMitigation(0,4,()=>0),{damage:4,reduced:0})
  const rng=(()=>{const vals=[0,0];return()=>vals.shift()??0})()
  assert.deepEqual(enduranceMitigation(10,4,rng),{damage:3,reduced:1})
})
test('연마석, 숫돌과 무명천 고유 아이템',()=>{
  for(const id of ['polishing-stone','whetstone','plain-cloth']) assert.ok(itemOf(id))
})
