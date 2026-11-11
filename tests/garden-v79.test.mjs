import test from 'node:test'
import assert from 'node:assert/strict'
import { buyGardenSeed, plantGardenSeed, harvestGardenPlot, gardenPlots, GARDEN_GROW_MS, GARDEN_CROPS, harvestReady } from '../src/game/garden.js'
import { countSlots, INVENTORY_SLOTS } from '../src/game/inventoryCapacity.js'
import { itemOf, ITEMS, STORE_ITEMS } from '../src/game/items.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { resolveHuntEncounter, enterHuntSite } from '../src/game/huntField.js'
import { HUNT_SITES, HUNT_KINDS } from '../src/game/huntSites.js'
import { readFileSync } from 'node:fs'
const fresh = () => ({ inventory: {}, money: 50, mp: 100, hp:100, spirit:100 })
const t0=1700000000000

test('씨앗 7종 전부 3냥이고 수확물 6종은 기존 상추와 함께 등록되며 고유 ID가 유지된다',()=>{
  assert.equal(GARDEN_CROPS.length,7)
  for (const crop of GARDEN_CROPS) {
    const item = itemOf(crop.seedId)
    assert.ok(item && item.effect && Object.keys(item.effect).length===0)
    assert.equal(item.price,3,'씨앗 개당 가격은 3냥')
    assert.equal(item.storeOnly,'garden')
    assert.equal(STORE_ITEMS.some(x=>x.id===item.id),false,'일반 매점에서는 팔지 않음')
    assert.equal(item.desc,`텃밭에 심으면 ${crop.name} 수확이 가능한 씨앗.`)
    assert.equal(itemOf(crop.id)?.name,crop.name)
  }
  assert.equal(ITEMS.length,new Set(ITEMS.map(i=>i.id)).size)
  assert.ok(COOK_RECIPES.some(r=>r.result==='soybean-oil'&&r.inputs[0][0]==='soybean'&&r.inputs[0][1]===5))
})

test('씨앗 구매는 정확히 3냥 소모, 돈·소지품 부족 시 변경 불가',()=>{
  const p=fresh()
  const a=buyGardenSeed(p,'seed-carrot',2)
  assert.equal(a.player.money,44)
  assert.equal(a.player.inventory['seed-carrot'],2)
  assert.equal(p.money,50)
  assert.ok(buyGardenSeed({...p,money:2},'seed-carrot').error)
  assert.ok(buyGardenSeed(p,'bad-seed').error)
  const full = { ...p, inventory: Object.fromEntries(ITEMS.filter(x=>x.tags.includes('재료')).slice(0,INVENTORY_SLOTS).map(x=>[x.id,99])) }
  assert.equal(countSlots(full.inventory),INVENTORY_SLOTS)
  assert.ok(buyGardenSeed(full,'seed-carrot').error)
})

test('5개 밭에만 심을 수 있고 씨앗 1개가 심을 때 차감된다',()=>{
  let p={...fresh(),inventory:{'seed-carrot':6}}
  for(let slot=0;slot<5;slot++){
    const r=plantGardenSeed(p,slot,'seed-carrot',t0+slot)
    assert.ok(r.player)
    p=r.player
  }
  assert.equal(gardenPlots(p).filter(Boolean).length,5)
  assert.equal(p.inventory['seed-carrot'],1)
  assert.ok(plantGardenSeed(p,5,'seed-carrot').error)
  assert.ok(plantGardenSeed(p,3,'seed-carrot').error)
  assert.deepEqual(gardenPlots(fresh()),[null,null,null,null,null])
})

test('1시간 완료 뒤 자동 수확 없이 보존되며 방문 시 직접 수확한다',()=>{
  const p=plantGardenSeed({...fresh(),inventory:{'seed-soybean':1}},0,'seed-soybean',t0).player
  assert.equal(harvestReady(gardenPlots(p)[0],t0+GARDEN_GROW_MS-1),false)
  assert.equal(harvestReady(gardenPlots(p)[0],t0+GARDEN_GROW_MS),true)
  assert.ok(harvestGardenPlot(p,0,t0+GARDEN_GROW_MS-1).error)
  assert.deepEqual(p.inventory,{})
  assert.equal(gardenPlots(p).filter(Boolean).length,1)
  const loaded=JSON.parse(JSON.stringify(p))
  const r=harvestGardenPlot(loaded,0,t0+GARDEN_GROW_MS+86400000)
  assert.equal(r.player.inventory.soybean,1)
  assert.deepEqual(gardenPlots(r.player),[null,null,null,null,null])
  assert.deepEqual(gardenPlots(p)[0],{seedId:'seed-soybean',plantedAt:t0})
  assert.ok(harvestGardenPlot(r.player,0,t0+GARDEN_GROW_MS).error)
})

test('소지품이 30칸이면 같은 종류 추가 공간이 있어도 수확 불가, 작물 그대로 유지',()=>{
  let p=plantGardenSeed({...fresh(),inventory:{'seed-carrot':1}},0,'seed-carrot',t0).player
  const materials=ITEMS.filter(x=>x.tags.includes('재료')&&x.id!=='carrot').slice(0,30)
  p={...p,inventory:Object.fromEntries(materials.map(x=>[x.id,1]))}
  assert.equal(countSlots(p.inventory),30)
  const r=harvestGardenPlot(p,0,t0+GARDEN_GROW_MS)
  assert.ok(r.error)
  assert.equal(r.player,undefined)
  assert.equal(gardenPlots(p).filter(Boolean).length,1)
})

test('요괴 표시 및 도주 시 남은 턴으로 개척 지속, 턴 소진 시 종료',()=>{
  assert.equal(HUNT_KINDS.ghost.label,'요괴')
  let p=enterHuntSite(fresh(),HUNT_SITES['left-trail-1'],t0,()=>0.99).player
  p={...p,huntExpedition:{...p.huntExpedition,turn:5,encounter:{nodeId:'roaming-ghost',rewardSpirit:20}}}
  const r=resolveHuntEncounter(p,{win:false,fled:true},t0+1000)
  assert.equal(r.player.huntExpedition.status,'active')
  assert.equal(r.player.huntExpedition.turn,5)
  assert.equal(r.player.huntExpedition.encounter,null)
  p={...p,huntExpedition:{...p.huntExpedition,turn:p.huntExpedition.maxTurns}}
  assert.equal(resolveHuntEncounter(p,{win:false,fled:true},t0+1000).player.huntExpedition.status,'finished')
  assert.equal(resolveHuntEncounter({...p,huntExpedition:{...p.huntExpedition,turn:5}},{win:false,fled:false},t0+1000).player.huntExpedition.status,'finished')
})

test('이전 텃밭의 대기형 채집 버튼은 제거하고 비닐하우스만 연결한다',()=>{
  const src=readFileSync(new URL('../src/components/locations/Hike.jsx',import.meta.url),'utf8')
  assert.doesNotMatch(src,/GatherSpot|onGather|채집하기 \(/)
  assert.match(src,/Garden player=\{player\}/)
  const game=readFileSync(new URL('../src/Game.jsx',import.meta.url),'utf8')
  assert.match(game,/buyGardenSeed\(/)
  assert.match(game,/harvestGardenPlot\(/)
})
