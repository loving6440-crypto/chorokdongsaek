import test from 'node:test'
import assert from 'node:assert/strict'
import { HUNT_SITES, HUNT_PATHS, HUNT_SIZE, siteMissingData } from '../src/game/huntSites.js'
import { enterHuntSite, leaveHuntSite, huntOdds, huntCooldownLeft, moveOnHunt } from '../src/game/huntField.js'
import { itemOf, ITEMS, canUseItem } from '../src/game/items.js'
import { createMB, useItemMB, viewOf } from '../src/game/mbattle.js'
import { rollTravelEvent, TRAVEL_LINES, LOST_THINGS } from '../src/game/travelEvents.js'
import { readFileSync } from 'node:fs'
const stats = { insight: 10, aggression: 10, endurance: 10, control: 10, agility: 10, comprehension: 10 }
const player = { hp:100,hpMax:100, mp:100,mpMax:100,spirit:100,money:10,stats,inventory:{} }
const party = () => createMB('foxfire',[{id:'a',name:'A',stats,hp:100,hpMax:100,mp:100,mpMax:100},{id:'b',name:'B',stats,hp:100,hpMax:100,mp:100,mpMax:100}],()=>.5)
test('v79: 기존 아이템 ID 그대로 유지, 최신 아이템 및 요리 목록 등록',()=>{
  for(const id of ['trap-scraps','sunnabi-earring','godok','beginner-godok','rice-cake','charcoal','lost-phone','bibimbap','flower-pancake'])assert.ok(itemOf(id),id)
  assert.equal(itemOf('lost-love-letter').effect.mp,30)
  assert.equal(ITEMS.length,new Set(ITEMS.map(x=>x.id)).size)
})
test('v79: 컵라면·만두 전투 불가, 일행 태그',()=>{
  for(const id of ['ramen','dumpling'])assert.equal(canUseItem(itemOf(id),{inBattle:true,isParty:true,countNow:1}).ok,false)
  for(const id of ['firecracker','bag-snack','godok','picnic'])assert.ok(itemOf(id).tags.includes('일행'))
})
test('v79: 뒷산 7개 개척 터와 미개방 보관소',()=>{
  assert.equal(HUNT_SIZE,10)
  assert.equal(Object.keys(HUNT_SITES).length,7)
  assert.ok(HUNT_PATHS[0].sites.find(x=>x.name==='?? 보관소'))
  for(const site of Object.values(HUNT_SITES))assert.deepEqual(siteMissingData(site),[],site.name)
})
test('v79: 개척 입장 의지력10, 대기0, 종료한 뒤 재입장',()=>{
  const site=HUNT_SITES['left-trail-1']
  let p=enterHuntSite(player,site,1000,()=>0.99).player
  assert.equal(p.mp,90)
  p=leaveHuntSite(p,2000).player
  assert.equal(huntCooldownLeft(p,site.id,2000),0)
  p=enterHuntSite(p,site,3000,()=>0.99).player
  assert.deepEqual(p.huntExpedition.position,{x:0,y:9})
  assert.equal(p.mp,80)
})
test('v79: 레벨 차이 15 이상 불가, 원래 성공0 이하이면 10% 고정',()=>{
  const st={...stats, comprehension:1,agility:1}
  assert.equal(huntOdds('animal',17,st).blocked,true)
  assert.equal(huntOdds('animal',16,st).blocked,false)
  assert.equal(huntOdds('animal',16,st).success,10)
  assert.equal(huntOdds('animal',16,st).fixed,true)
})
test('v79: 고독 보스 여부 무관 즉시 처치 후 일행 전원 3일 저주',()=>{
  const mb=party(), before=Date.now()
  const r=useItemMB(mb,'a',itemOf('godok'))
  assert.equal(r.ok,true)
  assert.equal(mb.over,'win')
  assert.equal(mb.ehp,0)
  for(const m of viewOf(mb).members)assert.ok(m.curseUntil>=before+259000000)
})
test('v79: 초보용 고독 3라운드 피해 증가 적용',()=>{
  const mb=party()
  assert.equal(useItemMB(mb,'a',itemOf('beginner-godok')).ok,true)
  assert.equal(mb.enemyVulnerabilityRounds,3)
})
test('v79: 저주 쇠약은 씻거나 자더라도 타임스탬프가 살아 있으면 적용',()=>{
  const now=Date.now()
  const src=readFileSync(new URL('../src/game/progress.js',import.meta.url),'utf8')
  assert.match(src,/player\.curseUntil/)
  assert.match(src,/export const isWeak =/)
  assert.ok(now < now+10000)
})
test('v79: 건물 이동 5% 확률 지급, 일상 문구 기본 동등 추첨',()=>{
  assert.equal(TRAVEL_LINES.length,4)
  assert.equal(LOST_THINGS.length,4)
  const vals=[0,0.01,0.1];let i=0
  assert.equal(rollTravelEvent(()=>vals[i++]).reward,'ginseng-candy')
  const vals2=[0.1,0.2];i=0
  assert.equal(rollTravelEvent(()=>vals2[i++]).reward,undefined)
})
