import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BESTIARY } from '../src/game/bestiary.js'
import { ALL_ENEMIES, BESTIARY_ENEMIES, ENEMIES, REC_STATS, enemyById, enemyTurn, effectLine, newBattle, recLabel, specialEffects } from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'
import { HUNT_SITES } from '../src/game/huntSites.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const REC = { 1: '3~4', 2: '6~8', 3: '10', 4: '15', 5: '18~20', 6: '29~30', 7: '39~40', 8: '45~47', 9: '50', 10: '60' }
const stats = (n = 10) => ({ insight: n, aggression: n, endurance: n, control: n, agility: n, comprehension: n })
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }

test('v-B.04: 전투 데이터 50종 — 10단계 × (단독 3 · 파티 1 · 보스 1), 적정 스탯 표대로', () => {
  assert.equal(BESTIARY.length, 50)
  for (let t = 1; t <= 10; t++) {
    const tier = BESTIARY.filter((e) => e.tier === t)
    assert.equal(tier.length, 5, `${t}단계 5종`)
    assert.deepEqual(tier.map((e) => e.role).sort(), ['단독', '단독', '단독', '보스', '파티'].sort())
    assert.deepEqual(tier.filter((e) => e.role === '단독').map((e) => e.difficulty), ['쉬움', '보통', '어려움'])
    for (const e of tier) assert.equal(e.rec, REC[t])
    assert.equal(REC_STATS[t] && true, true)
  }
  for (const e of BESTIARY) {
    assert.ok(e.hp > 0 && e.atk > 0 && e.act > 0 && e.spirit > 0, `${e.id} 능력치`)
    assert.ok(e.blurb && e.special?.label && e.special?.note && e.special?.effect, `${e.id} 설명·영능력`)
    if (e.role === '보스') {
      assert.equal(e.boss, true); assert.equal(e.partySize, 3)
      assert.deepEqual(e.tags, ['다인 전투', '보스'])
      assert.ok(e.special2?.effect && e.gimmicks?.length >= 3, `${e.id} 보스 영능력 2종·기믹`)
    } else if (e.role === '파티') {
      assert.equal(e.partySize, 2); assert.deepEqual(e.tags, ['다인 전투'])
    } else assert.equal(e.partySize, 1)
  }
  assert.match(recLabel(enemyById('docheol')), /모든 스탯 60 기준/)
  assert.match(recLabel(enemyById('mongdangbi')), /모든 스탯 3~4 기준/)
  assert.equal(recLabel(ENEMIES.find((e) => e.id === 'scarecrow')), '모든 스탯 2~3 기준', '기존 적의 표기는 그대로')
})

test('v-B.04: id 가 기존 적·개척 요괴와 겹치지 않고, 보상은 영력 × 2', () => {
  const ids = new Set(BESTIARY.map((e) => e.id))
  assert.equal(ids.size, 50)
  // v-B.05: 산길 5~20 의 요괴는 전투 데이터 자체를 쓰므로(같은 id) 빼고 본다
  const ghosts = Object.values(HUNT_SITES).map((s) => s.ghost?.enemy?.id).filter((id) => id && !BESTIARY.some((b) => b.id === id))
  for (const id of [...ENEMIES.map((e) => e.id), ...ghosts]) assert.ok(!ids.has(id), id)
  for (const e of BESTIARY_ENEMIES) assert.equal(e.reward, e.spirit * 2)
  assert.equal(ALL_ENEMIES.length, ENEMIES.length + 50)
})

test('v-B.04 → v-B.05: 체육관 목록은 그대로 7종, 데이터 50종은 둘레길 [추가전투]와 도감 요괴 장에 나온다', () => {
  assert.equal(ENEMIES.length, 7)
  assert.ok(BESTIARY.every((e) => !ENEMIES.includes(e)))
  assert.match(read('../src/components/locations/Battle.jsx'), /const list = roster \?\? ENEMIES/, '체육관은 그대로 ENEMIES')
  assert.match(read('../src/components/locations/Hike.jsx'), /BESTIARY_ENEMIES\.filter\(\(e\) => e\.tier === tier\)/)
  assert.match(read('../src/game/codex.js'), /BESTIARY_ENEMIES/)
  for (const e of BESTIARY) assert.equal(enemyById(e.id).name, e.name)
})

test('v-B.04: 영능력 설명은 모두 데이터에서 만들어지고, 저주가 아닌 적에게 저주 설명이 붙지 않는다', () => {
  for (const e of BESTIARY_ENEMIES) {
    const lines = specialEffects(e)
    assert.ok(lines[0].startsWith(`《${e.special.label}》`), e.id)
    if (!e.special.effect.curse) assert.doesNotMatch(lines[0], /저주/, e.id)
    if (e.special2) assert.ok(lines[1].startsWith(`《${e.special2.label}》`), e.id)
  }
  assert.match(effectLine(enemyById('samdugumi'), enemyById('samdugumi').special), /× 3번/)
  assert.match(effectLine(enemyById('docheol'), enemyById('docheol').special), /영력결계로 막을 수 없다/)
})

// 영능력 하나만 쓰게 만든 판
const specialBattle = (enemy, extra = {}) => ({ ...newBattle(enemy, stats(), () => 0.5, 100, 100), queue: ['special', 'jab', 'jab', 'jab', 'jab'], ...extra })

// v-B.05 에서 50종의 영능력을 모두 바꿨으므로, 예전 칸(피해·막기·흡수·속박·저주·봉인·행동불능·회복·흡혈·기 모으기)은 시험용 적으로 확인한다.
const withSpecial = (id, effect, extra = {}) => ({ ...enemyById(id), special: { label: '시험', note: '시험', effect }, ...extra })
test('v-B.04: 데이터형 영능력 — 피해·막기·흡수·속박·저주·봉인·행동불능·회복·흡혈·기 모으기', () => {
  const S = stats(10)
  const e0 = withSpecial('mongdangbi', { dmg: { add: 0 }, drain: { die: 'spirit' } })
  const a = enemyTurn(specialBattle(e0), { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.ok(a.state.php < 100 && a.mpDrain > 0)
  const ag = enemyTurn(specialBattle(e0, { guard: true }), { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.equal(ag.state.php, a.state.php, '막을 수 없는 피해는 막기로 줄지 않는다')
  const im = withSpecial('imae-mangryang', { target: 'all', dmg: { add: 'spirit/2' }, blockable: true, bind: true })
  const b0 = enemyTurn({ ...specialBattle(im), party: true }, { stats: { ...S, endurance: 0 }, mp: 50, noSpiritGate: true }, () => 0.5)
  const b1 = enemyTurn({ ...specialBattle(im), party: true, guard: true }, { stats: { ...S, endurance: 0 }, mp: 50, noSpiritGate: true }, () => 0.5)
  assert.ok(100 - b1.state.php < 100 - b0.state.php, '막을 수 있는 피해는 줄어든다')
  assert.ok(b0.state.bound, '속박')
  const md = withSpecial('mongdal-gwisin', { curse: 3 })
  const c0 = enemyTurn(specialBattle(md), { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.equal(c0.state.curse, 3); assert.equal(c0.state.php, 100)
  const c1 = enemyTurn({ ...c0.state, queue: ['guard', ...c0.state.queue.slice(1)] }, { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.equal(c1.state.curse, 2); assert.ok(c1.state.php < 100)
  const s = enemyTurn(specialBattle(withSpecial('noho-seung', { seal: 2 })), { stats: S, mp: 50 }, () => 0.5)
  assert.equal(s.state.psySeal, 2); assert.equal(s.sealed, true)
  assert.equal(enemyTurn(specialBattle(enemyById('dalgyal-gwisin')), { stats: S, mp: 50 }, () => 0.5).state.pstun, 1)
  const hk = withSpecial('heokkaebi', { heal: 0.12 })
  const h = enemyTurn({ ...specialBattle(hk), ehp: 50 }, { stats: S, mp: 50 }, () => 0.5)
  assert.equal(h.state.ehp, 50 + Math.ceil(hk.hp * 0.12))
  const dm = enemyById('daemang')
  const l = enemyTurn({ ...specialBattle(dm), ehp: 60 }, { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.ok(l.state.ehp > 60 && l.state.ehp - 60 === Math.min(dm.hp - 60, Math.floor((100 - l.state.php) * 1)))
  const cg = enemyTurn(specialBattle(withSpecial('changgwi', { dmg: { add: 'spirit/2' }, charge: true })), { stats: S, mp: 50 }, () => 0.5)
  assert.equal(cg.state.queue[0], 'smash'); assert.ok(cg.state.known >= 1)
  const mg = enemyTurn(specialBattle(withSpecial('myogwi', { dmg: { hits: 3 } }, { name: '묘귀' })), { stats: { ...S, endurance: 0 }, mp: 50 }, () => 0.5)
  assert.equal(mg.events.filter((e) => /시험 \(\d\/3\)/.test(e.text || '')).length, 3)
})

test('v-B.04: 단독 전투 화면도 영능력 봉인을 지킨다 (효험·영능력 막힘, 내 턴이 지날 때마다 1씩 줄어듦)', () => {
  const ui = read('../src/components/locations/Battle.jsx')
  assert.match(ui, /if \(r\.sealed\) setBuffArmed\(false\)/)
  assert.match(ui, /psySeal: state\.psySeal - 1/)
  assert.match(ui, /영능력이 봉인되어 있다\. \(남은 \$\{cur\.psySeal\}턴\)/)
  assert.match(ui, /data-psy-seal=\{b\.psySeal\}/)
  assert.match(ui, /!effectPierces\(state\.enemy\?\.special\)/, '결계를 꿰뚫는 영능력(결계째 삼키기)')
})

const party = (n, s = 10) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `M${i}`, stats: stats(s), mp: 100, mpMax: 100, psychics: [] }))
function runMB(id, members, rng = Math.random, pick = () => ({ action: 'attack' })) {
  const mb = MB.createMB(id, members, rng)
  MB.openingInitiative(mb, rng)
  if (mb.phase === 'input' && !mb.turn) MB.beginRound(mb, rng)
  for (let g = 0; g < 4000 && !mb.over; g++) {
    if (mb.phase === 'survive') { for (const p of MB.pendingSurvivors(mb)) MB.survive(mb, p.id, true, rng); continue }
    if (MB.ready(mb)) { MB.resolveTurn(mb, rng); continue }
    const w = MB.waitingOn(mb)[0]
    if (!w) break
    const r = MB.submit(mb, w.id, pick(mb, w))
    if (r.error) MB.submit(mb, w.id, { action: 'attack' })
  }
  return mb
}

test('v-B.04: 파티 10종 · 보스 10종 모두 다인 전투로 끝까지 진행된다', () => {
  for (const e of BESTIARY.filter((x) => x.partySize > 1)) {
    const lv = Number(e.rec.split('~')[0])
    for (let k = 0; k < 3; k++) {
      const mb = runMB(e.id, party(e.partySize, lv))
      assert.ok(mb.over === 'win' || mb.over === 'lose', `${e.id} 끝남`)
    }
  }
})

test('v-B.04: 단체 영능력은 일행 전원에게, 적 회복은 단체여도 한 번만', () => {
  // target: 'all' 인 파티 적(시험용 영능력) — 일반(파티) 적인데도 전원이 맞는다
  const real = enemyById('dungap-jwi')
  const ALL = { ...real, special: { label: '우르르 갉기', note: '시험', effect: { target: 'all', dmg: { add: 0 } } } }
  const mb = MB.createMB('dungap-jwi', party(2, 1), () => 0.5)
  mb.enemy = ALL
  mb.queue = ['special', 'jab', 'jab', 'jab', 'jab']
  MB.beginRound(mb, () => 0.99)
  for (const r0 = mb.round; mb.turn && mb.round === r0;) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, () => 0.5) }
  assert.ok(mb.log.some((l) => /일행 전원을 향해 《우르르 갉기》/.test(l.text || '')))
  const heal = { ...enemyById('baekgol-janggun'), partySize: 2, special: { label: '진군의 북', note: '시험', effect: { heal: 0.1 } } }
  const v = { ...newBattle(heal, stats(50), () => 0.5, 200, 200, { party: true }), queue: ['special', 'jab', 'jab'], ehp: 100 }
  const first = enemyTurn(v, { stats: stats(50), mp: 50, noSpiritGate: true, firstTarget: true }, () => 0.5)
  const second = enemyTurn({ ...v, ehp: first.state.ehp }, { stats: stats(50), mp: 50, noSpiritGate: true, firstTarget: false }, () => 0.5)
  assert.ok(first.state.ehp > 100)
  assert.equal(second.state.ehp, first.state.ehp)
})

test('v-B.04: 보스 성장 계기 — 김서방(막기) · 금돼지(부적) · 구미호(영능력) · 도철(부적·영능력) · 역신(저주) · 한발(광분)', () => {
  const cases = [['kim-seobang', { action: 'guard' }], ['geumdwaeji', { action: 'charm' }], ['gumiho', { action: 'psychic', psychic: 'survival' }], ['docheol', { action: 'charm' }]]
  for (const [id, act] of cases) {
    const ms = party(3, 30).map((m) => ({ ...m, psychics: ['survival'], psychicBring: ['survival'] }))
    const mb = MB.createMB(id, ms, () => 0.99)
    mb.queue = ['guard', 'guard', 'guard', 'guard', 'guard']
    MB.beginRound(mb, () => 0.99)
    MB.submit(mb, mb.turn, act)
    MB.resolveTurn(mb, () => 0.99)
    assert.ok(mb.grow >= 1 || mb.members.some((m) => m.status === 'fled'), `${id} 커짐`)
    if (mb.grow) assert.equal(mb.enemy.atk, enemyById(id).atk + enemyById(id).grows.atkPerStage * mb.grow)
  }
  assert.deepEqual(MB.growTriggers(enemyById('geuseundae')), ['scan'], '그슨대는 그대로 간파')
  assert.deepEqual(MB.growTriggers(enemyById('hanbal')), [])
  // 역신: 저주에 걸린 사람이 있으면 라운드 끝마다 커진다
  const mb = MB.createMB('yeoksin', party(3, 30), () => 0.5)
  mb.members[0].curse = 3
  mb.queue = ['guard', 'guard', 'guard', 'guard', 'guard']
  MB.beginRound(mb, () => 0.99)
  for (const r0 = mb.round; mb.turn && mb.round === r0;) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, () => 0.99) }
  assert.equal(mb.grow, 1)
  assert.equal(enemyById('yeoksin').atk, mb.enemy.atk - 2, '원본은 그대로')
})

test('v-B.04: 보스 재생 — 지하국 대적은 라운드 끝마다 체력 3%를 되찾는다', () => {
  const mb = MB.createMB('jihaguk-daejeok', party(3, 50), () => 0.5)
  mb.ehp = 1000
  mb.queue = ['guard', 'guard', 'guard', 'guard', 'guard']
  MB.beginRound(mb, () => 0.99)
  for (const r0 = mb.round; mb.turn && mb.round === r0;) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, () => 0.99) }
  assert.equal(mb.ehp, 1000 + Math.ceil(enemyById('jihaguk-daejeok').hp * 0.03))
  assert.ok(mb.log.some((l) => /잘린 머리가 다시 돋아난다/.test(l.text || '')))
})

test('v-B.05: 영력결계를 꿰뚫는 영능력은 도철의 결계째 삼키기뿐 — 결계가 있어도 들어가고, 결계를 없앤다', () => {
  for (const e of BESTIARY) for (const sp of [e.special, e.special2].filter(Boolean)) assert.equal(!!sp.effect.pierce, false, `${e.id} pierce 칸 없음`)
  const ms = party(3, 60).map((m) => ({ ...m, psychics: ['spirit-barrier'], psychicBring: ['spirit-barrier'] }))
  const mb = MB.createMB('docheol', ms, () => 0.5)
  mb.queue = ['special', 'jab', 'jab', 'jab', 'jab']
  const orig = Math.random
  Math.random = () => 0.9 // special(1) 을 고른다
  try {
    MB.beginRound(mb, () => 0.99)
    for (const r0 = mb.round; mb.turn && mb.round === r0;) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, () => 0.9) }
  } finally { Math.random = orig }
  const hit = mb.members.filter((m) => m.barrierBroken)
  assert.equal(hit.length, 1, '한 사람의 결계가 깨졌다')
  assert.equal(MB.hasActiveSpiritBarrier(hit[0], mb.enemy), false)
  assert.ok(hit[0].php < hit[0].phpMax)
})

test('v-B.04 버그 수정: 지신밟기는 받는 피해를 줄일 뿐, 큰 피해에도 쓰러지지 않게 만들지 않는다', () => {
  const S = { ...stats(60), endurance: 0 }
  const enemy = { ...enemyById('docheol'), partySize: 1 }
  const base = { ...newBattle(enemy, S, () => 0.5, 200, 200), queue: ['smash', 'jab', 'jab'] }
  const hit = enemyTurn(base, { stats: S, mp: 1, reduction: 0.3 }, () => 0.99)
  assert.equal(hit.state.php, 0)
  assert.equal(hit.state.over, 'lose', '예전에는 체력 0 뒤에 30%를 되돌려 받아 살아남았다')
  const small = enemyTurn({ ...base, queue: ['jab', 'jab', 'jab'], enemy: { ...enemy, atk: 10, spirit: 10 } }, { stats: S, mp: 1, reduction: 0.3 }, seq(0.5, 0.95, 0.95))
  const none = enemyTurn({ ...base, queue: ['jab', 'jab', 'jab'], enemy: { ...enemy, atk: 10, spirit: 10 } }, { stats: S, mp: 1, reduction: 0 }, seq(0.5, 0.95, 0.95))
  const raw = 200 - none.state.php
  assert.equal(200 - small.state.php, raw - Math.floor(raw * 0.3))
  assert.doesNotMatch(read('../src/game/mbattle.js'), /mb\.earthReduction > 0 && r\.state\.php < prevPhp/)
  assert.doesNotMatch(read('../src/components/locations/Battle.jsx'), /state\.earthReduction > 0 && r\.state\.php < state\.php/)
})

test('v-B.04: 적 조회는 모두 enemyById — 데이터 50종도 느린 싸움·다인 전투·서버에서 찾아진다', () => {
  for (const f of ['../src/Game.jsx', '../server/index.js', '../src/game/progress.js', '../src/components/locations/MultiBattle.jsx']) assert.doesNotMatch(read(f), /ENEMIES\.find/, f)
  assert.match(read('../server/index.js'), /const enemy = enemyById\(body\.enemy\)/)
  assert.equal(MB.isMulti(enemyById('docheol')), true)
  assert.equal(MB.isMulti(enemyById('cheonma')), false)
})
