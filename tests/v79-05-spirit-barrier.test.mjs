import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createMB, beginRound, submit, resolveTurn, hasActiveSpiritBarrier } from '../src/game/mbattle.js'

const stats = { insight:20, aggression:10, endurance:20, control:50, agility:20, comprehension:20 }
const boss = { boss:true }
const weak = { boss:false }

function bossRound({ bringA = [], bringB = [], rngValue = 0.1, hpA = 200, hpB = 200, barrierA = true, barrierB = false } = {}) {
  const mb = createMB('bulgasari', [
    { id:'a', name:'A', stats, hp:hpA, hpMax:250, mp:200, mpMax:200, psychics:barrierA ? ['spirit-barrier'] : [], psychicBring:bringA },
    { id:'b', name:'B', stats, hp:hpB, hpMax:250, mp:200, mpMax:200, psychics:barrierB ? ['spirit-barrier'] : [], psychicBring:bringB },
  ], () => rngValue)
  mb.queue[0] = 'special'
  beginRound(mb, () => rngValue)
  let steps = 0
  while (mb.round === 1 && mb.phase === 'input' && steps++ < 12) {
    const current = mb.members.find(m => m.id === mb.turn)
    assert.ok(current)
    if (!current.act) assert.deepEqual(submit(mb, current.id, {action:'guard'}), {ok:true})
    resolveTurn(mb, () => rngValue)
  }
  assert.ok(steps < 12, 'round advanced')
  return mb
}

test('영력결계는 일반 전투에서 습득시 발동하지만 보스전에서는 실제 가져간 경우에만 적용', () => {
  const learned = { psychics:['spirit-barrier'], psychicBring:[] }
  assert.equal(hasActiveSpiritBarrier(learned, weak), true)
  assert.equal(hasActiveSpiritBarrier(learned, boss), false)
  assert.equal(hasActiveSpiritBarrier({...learned, psychicBring:['spirit-barrier']}, boss), true)
  assert.equal(hasActiveSpiritBarrier({psychics:[], psychicBring:['spirit-barrier']}, boss), false)
  assert.equal(hasActiveSpiritBarrier({...learned, psychicBring:null}, boss), false)
})

test('보스 단체 영능력: 가져오지 않으면 습득자도 피해를 받는다', () => {
  const mb = bossRound({ bringA:[] })
  assert.ok(mb.members[0].php < 200)
  assert.ok(mb.members[1].php < 200)
  assert.ok(mb.members[0].bound && mb.members[1].bound)
  assert.equal(mb.espirit, 10)
})

test('보스 단체 영능력: 가져온 사람만 피해/막기불가 면역, 다른 아군은 정상적으로 피해', () => {
  const mb = bossRound({ bringA:['spirit-barrier'] })
  assert.equal(mb.members[0].php, 200)
  assert.equal(mb.members[0].bound, false)
  assert.ok(mb.members[1].php < 200)
  assert.equal(mb.members[1].bound, true)
  assert.equal(mb.espirit, 10)
  assert.ok(mb.log.some(x=>x.kind==='special' && x.label==='불길 내뿜기'))
  assert.ok(mb.log.some(x=>x.text?.includes('영력결계')))
  assert.equal(mb.round, 2)
})

test('마지막 공격 대상만 결계를 가져와도 라운드/행동 큐가 전진한다', () => {
  const mb = bossRound({ bringB:['spirit-barrier'], barrierA:false, barrierB:true })
  assert.ok(mb.members[0].php < 200)
  assert.equal(mb.members[1].php,200)
  assert.equal(mb.round,2)
  assert.notEqual(mb.queue[0], 'special') // rng=0.1 => 다음 행동 강공, 기존 special 반복되지 않음
})

test('보스 단체 영능력: 전원 면역이어도 영능력 발동 기록 및 영력 소모는 유지', () => {
  const mb = bossRound({ bringA:['spirit-barrier'], bringB:['spirit-barrier'], barrierB:true })
  assert.deepEqual(mb.members.map(m=>m.php),[200,200])
  assert.ok(mb.log.some(x=>x.kind==='special' && x.label==='불길 내뿜기'))
  assert.equal(mb.espirit,10)
  assert.equal(mb.round,2)
})

test('보스 단일 영능력: 결계를 가져오지 않으면 원래 피해+흡수', () => {
  const mb = bossRound({rngValue:0.9,hpA:225,hpB:125})
  assert.ok(mb.members[0].php < 225)
  assert.ok(mb.members[0].mp < 200)
  assert.ok(mb.log.some(x=>x.kind==='special' && x.label==='쇠 갉아먹기'))
})

test('보스 단일 영능력: 결계를 가져온 대상에게만 약공 대체, 의지력 흡수 없음', () => {
  const mb = bossRound({bringA:['spirit-barrier'],rngValue:0.9,hpA:225,hpB:125})
  assert.ok(mb.members[0].php < 225) // 약공으로 변경된 피해
  assert.ok(mb.members[0].php > 193) // 원래 영능력보다 작은 피해
  assert.equal(mb.members[0].mp,200)
  assert.equal(mb.espirit,10) // 보스의 영능력 소모는 유지
  assert.ok(mb.log.some(x=>x.text?.includes('약공으로 바뀌었다')))
  assert.ok(mb.log.some(x=>x.kind==='special' && x.label==='쇠 갉아먹기'))
})

test('보스전 영력결계를 가져온 사람은 공격 영능력/효험 사용 불가, 아군 지원은 사용 가능', () => {
  function fresh(bring, enemyId='bulgasari') {
    const m=createMB(enemyId,[{id:'a',name:'A',stats,psychics:['spirit-barrier','cotton-mist','echo-form','earth-step','seven-stars','warding-scripture'],psychicBring:bring,hp:200,mp:200,mpMax:200}],()=>0.8)
    beginRound(m,()=>0.8)
    return m
  }
  let mb=fresh(['spirit-barrier','cotton-mist'])
  assert.match(submit(mb,'a',{action:'psychic',psychic:'cotton-mist'}).error,/영력결계/)
  assert.match(submit(mb,'a',{action:'attack',buff:true}).error,/효험/)
  mb=fresh(['spirit-barrier','echo-form'])
  assert.deepEqual(submit(mb,'a',{action:'psychic',psychic:'echo-form',target:'a'}),{ok:true})
  mb=fresh(['cotton-mist'])
  assert.deepEqual(submit(mb,'a',{action:'psychic',psychic:'cotton-mist'}),{ok:true})
  mb=fresh(['cotton-mist'])
  assert.deepEqual(submit(mb,'a',{action:'attack',buff:true}),{ok:true})
})

test('영능력 보스전 선택과 차단이 UI에서도 일치한다', () => {
  const file=readFileSync(new URL('../src/components/locations/MultiBattle.jsx', import.meta.url),'utf8')
  assert.match(file,/!view\.boss \|\| me\?\.psychicBring\?\.includes\('spirit-barrier'\)/)
  assert.match(file,/disabled=\{barrierActive \|\| !canAct/)
  assert.match(file,/barrierActive \? '영력결계로 사용 불가'/)
})
