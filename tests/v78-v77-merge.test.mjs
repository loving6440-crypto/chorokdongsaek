import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { HUNT_SITES, HUNT_SIZE, HUNT_COOLDOWN_MS, HUNT_SPECIES, HUNT_BONUSES } from '../src/game/huntSites.js'
import { enterHuntSite, leaveHuntSite, moveHuntCreatures, moveOnHunt, huntCooldownLeft } from '../src/game/huntField.js'
import { itemOf } from '../src/game/items.js'

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const player = () => ({ hp: 100, hpMax: 100, spirit: 40, inventory: {} })
const site = HUNT_SITES['left-trail-1']

test('뱀은 A3 기준 2×2, 여우는 I3가 포함된 3×3을 실제로 돈다', () => {
  for (const [id, size] of [['A3', 2], ['I3', 3]]) {
    const node = site.nodes.find(n => n.id === id)
    assert.ok(node)
    assert.equal(node.route.length, 4 * (size - 1))
    const xs = node.route.map(n => n.x), ys = node.route.map(n => n.y)
    assert.equal(Math.max(...xs)-Math.min(...xs)+1, size)
    assert.equal(Math.max(...ys)-Math.min(...ys)+1, size)
    assert.ok(node.route.every(n => n.x >= 0 && n.x < HUNT_SIZE && n.y >= 0 && n.y < HUNT_SIZE))
    const startIndex = node.route.findIndex(n => n.x === node.x && n.y === node.y)
    assert.notEqual(startIndex,-1)
    let field = {nodes:[{...node, attemptsLeft:3}],position:{x:0,y:9}}
    field = moveHuntCreatures(field)
    assert.deepEqual([field.nodes[0].x,field.nodes[0].y], Object.values(node.route[(startIndex+1)%node.route.length]))
    for(let step=1;step<node.route.length;step++) field=moveHuntCreatures(field)
    assert.deepEqual([field.nodes[0].x,field.nodes[0].y], [node.x,node.y])
  }
})

test('수렵 완료 뒤 저장 자원 유지, 50분 대기, 재입장 A10부터 턴 0', () => {
  const first=enterHuntSite(player(),site,1000,()=>0.9)
  assert.deepEqual(first.player.huntExpedition.position,{x:0,y:9})
  const p={...first.player, inventory:{'snake-skin':5}}
  const done=leaveHuntSite(p,2000).player
  assert.equal(done.huntExpedition.status,'finished')
  assert.equal(done.inventory['snake-skin'],5)
  assert.equal(huntCooldownLeft(done,site.id,2000),HUNT_COOLDOWN_MS)
  const again=enterHuntSite(done,site,2000+HUNT_COOLDOWN_MS,()=>0.9)
  assert.equal(again.player.huntExpedition.turn,0)
  assert.deepEqual(again.player.huntExpedition.position,{x:0,y:9})
  assert.equal(again.player.inventory['snake-skin'],5)
  assert.equal(again.player.huntExpedition.nodes.find(n=>n.id==='A3').attemptsLeft,3)
})

test('수렵 보상은 모두 v77의 실제 아이템 ID를 사용한다', () => {
  for (const x of Object.values(HUNT_SPECIES)) for (const reward of x.rewards ?? []) assert.ok(itemOf(reward.item), reward.item)
  for (const x of Object.values(HUNT_BONUSES)) assert.ok(itemOf(x.item), x.item)
})


test('v77 기존 수업·일퀘·로그·보안·폰트·아이템 구현 파일이 보존된다', () => {
  for (const file of ['src/game/activityLogs.js','src/game/inventoryCapacity.js','server/securityHeaders.js','src/hooks/useFontSize.js','src/hooks/useFont.js','tests/v77-club-log.test.mjs','tests/trap-scraps.test.mjs']) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)),file)
  }
  assert.equal(itemOf('trap-scraps').name,'덫 찌꺼기')
  assert.equal(itemOf('sunnabi-earring').name,'순나비 귀걸이')
  assert.match(source('src/index.css'), /--ui-font-scale/)
  assert.match(source('server/index.js'), /securityHeaders/)
  assert.match(source('src/game/clubQuests.js'), /00:00 KST/)
})

test('빈 수렵 칸의 title/정보 표시를 막고 수렵 종료 시 메뉴가 접힌다', () => {
  assert.match(source('src/components/locations/HuntField.jsx'), /title=\{\(node \|\| isPlayer\) \?[^]*: undefined\}/)
  assert.match(source('src/components/locations/HuntField.jsx'), /hasInformation &&/)
  assert.match(source('src/components/locations/Hike.jsx'), /previousHuntStatus\.current === 'active' && status === 'finished'/)
  assert.match(source('src/components/locations/Hike.jsx'), /setHuntOn\(false\)/)
  assert.match(source('src/components/locations/Hike.jsx'), /<GatherSpot/)
  assert.match(source('src/Game.jsx'), /onHuntAction=\{huntAction\}/)
  assert.match(source('src/Game.jsx'), /<HuntBattleModal/)
})

test('이전 v78 저장분의 잘못된 9×9 여우 순찰과 과거 보상 ID를 복구한다', async () => {
  const { migrateHuntSave } = await import('../src/game/huntMigration.js')
  const old = {
    hp: 100,
    inventory: { rock: 2, 'trap-scrap': 3, 'snake-skin': 1 },
    huntExpedition: {siteId: site.id, status:'active', rewards:{raspberry:2}, nodes:[
      {id:'I3',kind:'animal',x:8,y:2,species:'fox',route:[{x:0,y:0},{x:1,y:0}],rewards:[{item:'trap-scrap',amount:1}]},
    ]},
  }
  const updated=migrateHuntSave(old)
  assert.equal(updated.inventory.stone,2)
  assert.equal(updated.inventory['trap-scraps'],3)
  assert.equal(updated.inventory['snake-skin'],1)
  assert.equal(updated.huntExpedition.rewards['wild-raspberry'],2)
  assert.equal(updated.huntExpedition.nodes[0].route.length,8)
  assert.deepEqual([updated.huntExpedition.nodes[0].x, updated.huntExpedition.nodes[0].y],[8,2])
  assert.equal(updated.huntExpedition.nodes[0].rewards[0].item,'trap-scraps')
  assert.strictEqual(migrateHuntSave(updated),updated)
})
