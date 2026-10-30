import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { HUNT_SITES, HUNT_SPECIES } from '../src/game/huntSites.js'
import { attemptHunt, enterHuntSite, resolveHuntEncounter } from '../src/game/huntField.js'
import { migrateHuntSave } from '../src/game/huntMigration.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))
function testPlayer() { return { hp:100, mp:100, spirit:0, inventory:{}, stats:{insight:50,control:50,comprehension:50,agility:50,endurance:50,aggression:50} } }

test('묘소는 시트 B26:K36의 오브젝트 21칸, 혼백나비, 앙괭이 데이터를 반영한다', () => {
 const s=HUNT_SITES['left-cemetery']
 const expected={B2:'rat',D3:'stoneTower',E3:'lantern',F3:'lantern',G3:'stoneTower',C4:'stoneTower',H4:'stoneTower',C5:'lantern',E5:'graveRock',F5:'sarcophagus',H5:'lantern',C6:'lantern',E6:'scentRock',F6:'monument',H6:'lantern',C7:'stoneTower',H7:'stoneTower',D8:'stoneTower',E8:'lantern',F8:'lantern',G8:'stoneTower'}
 assert.equal(s.nodes.length,21)
 assert.deepEqual(Object.fromEntries(s.nodes.map(n=>[n.id,n.species])), expected)
 assert.equal(s.spirit.name,'혼백나비'); assert.equal(s.spirit.level,100)
 assert.deepEqual(s.spirit.rewards,[{item:'spirit-orb',amount:1}])
 assert.equal(s.ghost.name,'앙괭이');assert.equal(s.ghost.level,5)
 assert.equal(s.ghost.rewardSpirit,50)
 assert.deepEqual(s.ghost.rewardItems,[{item:'silver-inlay',chance:0.5,amount:1}])
 assert.deepEqual(HUNT_SPECIES.sarcophagus.rewards,[{item:'gold-crown',chance:0.05,amount:1},{item:'gogok',chance:0.1,dice:2}])
})

test('묘소 10%, 5% 보상은 채집 성공과 독립적으로 주사위를 굴린다',()=>{
 const site=HUNT_SITES['left-cemetery']
 let base=enterHuntSite(testPlayer(), site, 100,()=>0.99).player
 // The target is obstacle, so player can stand adjacent to its cell.
 const moved={...base,huntExpedition:{...base.huntExpedition,position:{x:4,y:3}}}
 let r=attemptHunt(moved,'E5',testPlayer().stats,101,(()=>{const seq=[0,0.99,0.99,0,0];let n=0;return ()=>seq[n++]??0})())
 assert.equal(r.success,true)
 assert.equal(r.rewards.stone,5)
 assert.equal(r.rewards['sealing-stone'],undefined)
 const hit=attemptHunt(moved,'E5',testPlayer().stats,101,()=>0)
 assert.equal(hit.success,true)
 assert.equal(hit.rewards['sealing-stone'],1)
 const sealed={...base,huntExpedition:{...base.huntExpedition,position:{x:5,y:3}}}
 const loot=attemptHunt(sealed,'F5',testPlayer().stats,101,()=>0)
 assert.equal(loot.rewards['gold-crown'],1)
 assert.equal(loot.rewards.gogok,1)
 const failed=attemptHunt(sealed,'F5',testPlayer().stats,101,(()=>{const seq=[0,0.99,0.99,0];let n=0;return ()=>seq[n++]??0})())
 assert.equal(failed.rewards['gold-crown'],undefined)
 assert.equal(failed.rewards.gogok,undefined)
})

test('묘소 앙괭이 승리 시 영력 50과 은입사 장식 50% 판정, 도주 시 보상 없음',()=>{
 const site=HUNT_SITES['left-cemetery']
 const base=enterHuntSite(testPlayer(),site,100,()=>0.99).player
 const player={...base,huntExpedition:{...base.huntExpedition,encounter:{nodeId:'roaming-ghost',enemy:site.ghost.enemy,rewardSpirit:site.ghost.rewardSpirit,rewardItems:site.ghost.rewardItems}}}
 const win=resolveHuntEncounter(player,{win:true,fled:false},101,()=>0)
 assert.equal(win.player.spirit,50);assert.equal(win.player.inventory['silver-inlay'],1)
 const noDrop=resolveHuntEncounter(player,{win:true,fled:false},101,()=>0.99)
 assert.equal(noDrop.player.inventory['silver-inlay'],undefined)
 const escape=resolveHuntEncounter(player,{win:false,fled:true},101,()=>0)
 assert.equal(escape.player.spirit,0);assert.equal(escape.player.inventory['silver-inlay'],undefined)
 assert.equal(escape.player.huntExpedition.status,'active')
})

test('묘소 구 버전 탐사 세이브에서 빠진 4칸 복원',()=>{
 const site=HUNT_SITES['left-cemetery']
 const old={...testPlayer(),huntExpedition:{siteId:site.id,status:'active',nodes:site.nodes.filter(n=>!['C7','H7','E8','F8'].includes(n.id)).map(n=>({...n,attemptsLeft:3,...(n.id==='F5' ? {rewards:[{item:'gogok',dice:2}]} : {})})),rewards:{}}}
 const upgraded=migrateHuntSave(old)
 for(const id of ['C7','H7','E8','F8'])assert.ok(upgraded.huntExpedition.nodes.find(x=>x.id===id))
 assert.deepEqual(upgraded.huntExpedition.nodes.find(x=>x.id==='F5').rewards, HUNT_SPECIES.sarcophagus.rewards)
})

async function freePort() { const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p }
async function post(port,route,body){const res=await fetch(`http://127.0.0.1:${port}${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {...await res.json(),httpStatus:res.status} }
async function loginEvents(port,id,name){const controller=new AbortController();const r=await fetch(`http://127.0.0.1:${port}/api/events?${new URLSearchParams({id,name})}`,{signal:controller.signal});assert.equal(r.status,200);const reader=r.body.getReader();const hello=await reader.read();assert.equal(hello.done,false);return {close:async()=>{controller.abort();await reader.cancel().catch(()=>{})}}}
async function startServer(env){const child=spawn(process.execPath,['server/index.js'],{cwd,env:{...process.env,...env},stdio:'ignore'});let started=false;for(let i=0;i<90;i++){try{if((await fetch(`http://127.0.0.1:${env.PORT}/api/health`)).ok){started=true;break}}catch{}await sleep(50)}assert.ok(started,'서버 부팅 실패');return {stop:async()=>{child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(2500)])}}}

test('서버: 신청 단계에서는 양쪽 미등록, 쪽지 동의 후 쌍방 등록·삭제·거절·저장', {timeout:25000},async()=>{
 const tmp=mkdtempSync(path.join(tmpdir(),'cds-friend-'))
 const port=await freePort();const env={PORT:String(port),DATABASE_URL:'',CHOROK_DATA:path.join(tmp,'data.json'),CHOROK_ACCOUNTS:path.join(tmp,'accounts.json'),CHOROK_CARDS_DATA:path.join(tmp,'cards.json')}
 let server;const sessions=[]
 try{
  server=await startServer(env)
  for(const id of ['testA','testB','testC'])assert.equal((await post(port,'/api/account/signup',{id,password:'pass1234',twitter:id})).ok,true)
  for(const id of ['testA','testB','testC'])sessions.push(await loginEvents(port,id,id))
  const list=async id=>post(port,'/api/friends/list',{id})
  const make=await post(port,'/api/friends/change',{id:'testA',to:'testB',action:'add'})
  assert.equal(make.ok,true); assert.equal(make.pending,true)
  assert.deepEqual((await list('testA')).friends,[])
  assert.deepEqual((await list('testB')).friends,[])
  assert.equal((await post(port,'/api/friends/change',{id:'testA',to:'testB',action:'add'})).alreadyPending,true)
  const box=await post(port,'/api/mail/box',{id:'testB'})
  const req=box.received.find(x=>x.id===make.requestId)
  assert.equal(req.kind,'friend-request');assert.equal(req.status,'pending')
  assert.equal(req.text,'testA 님이 친구 신청을 보냈습니다.')
  assert.equal((await post(port,'/api/friends/respond',{id:'testC',requestId:req.id,accept:true})).httpStatus,404,'타인의 친구 신청 수락 금지')
  const accept=await post(port,'/api/friends/respond',{id:'testB',requestId:req.id,accept:true})
  assert.equal(accept.ok,true)
  assert.deepEqual((await list('testA')).friends.map(x=>x.id),['testB'])
  assert.deepEqual((await list('testB')).friends.map(x=>x.id),['testA'])
  assert.equal((await post(port,'/api/friends/respond',{id:'testB',requestId:req.id,accept:true})).httpStatus,409)
  assert.equal((await post(port,'/api/friends/change',{id:'testA',to:'testB',action:'remove'})).ok,true)
  assert.deepEqual((await list('testA')).friends,[]);assert.deepEqual((await list('testB')).friends,[])
  const req2=await post(port,'/api/friends/change',{id:'testC',to:'testB',action:'add'})
  assert.equal((await post(port,'/api/friends/respond',{id:'testB',requestId:req2.requestId,accept:false})).accepted,false)
  assert.deepEqual((await list('testB')).friends,[])
  const req3=await post(port,'/api/friends/change',{id:'testC',to:'testA',action:'add'})
  assert.equal((await post(port,'/api/friends/respond',{id:'testA',requestId:req3.requestId,accept:true})).accepted,true)
  await sleep(700)
  for(const s of sessions)await s.close();sessions.length=0
  await server.stop();server=null
  const saved=JSON.parse(readFileSync(env.CHOROK_DATA,'utf8'))
  assert.ok(saved.mail.log.find(m=>m.id===req.id&&m.status==='accepted'))
  assert.ok(saved.mail.log.find(m=>m.id===req2.requestId&&m.status==='declined'))
  server=await startServer(env)
  sessions.push(await loginEvents(port,'testB','testB'))
  sessions.push(await loginEvents(port,'testA','testA'))
  sessions.push(await loginEvents(port,'testC','testC'))
  assert.deepEqual((await list('testA')).friends.map(x=>x.id),['testC'])
  assert.deepEqual((await list('testC')).friends.map(x=>x.id),['testA'])
  const persisted=await post(port,'/api/mail/box',{id:'testB'})
  assert.equal(persisted.received.find(x=>x.id===req2.requestId).status,'declined')
 }finally{for(const s of sessions)await s.close().catch(()=>{});await server?.stop();rmSync(tmp,{recursive:true,force:true})}
})
