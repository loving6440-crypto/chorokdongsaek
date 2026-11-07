import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BESTIARY } from '../src/game/bestiary.js'
import * as B from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'
import { HUNT_PATHS, HUNT_SITES, HUNT_SPECIES, TRAIL_SITES, siteMissingData } from '../src/game/huntSites.js'
import { enterHuntSite, huntOdds } from '../src/game/huntField.js'
import { itemOf } from '../src/game/items.js'
import { B05_ITEMS } from '../src/game/itemsB05.js'
import { HIKE_PATHS, HIKE_SPOT_IDS } from '../src/game/hike.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const stats = (n = 10) => ({ insight: n, aggression: n, endurance: 0, control: n, agility: n, comprehension: n })
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }
const fixed = (v) => () => v
const sp = (id, effect, extra = {}) => ({ ...B.enemyById(id), special: { label: '시험', note: '시험', effect }, ...extra })
const battle = (enemy, extra = {}) => ({ ...B.newBattle(enemy, stats(), fixed(0.5), 100, 100), queue: ['special', 'jab', 'jab', 'jab', 'jab', 'jab'], ...extra })
const turn = (s, ctx = {}, rng = fixed(0.5)) => B.enemyTurn(s, { stats: stats(), mp: 50, ...ctx }, rng)

// ───────── 영능력 60개 ─────────
test('v-B.05: 적 50종 + 보스 둘째 10 = 영능력 60개가 이름도 효과 조합도 서로 겹치지 않는다', () => {
  const defs = BESTIARY.flatMap((e) => [e.special, e.special2].filter(Boolean))
  assert.equal(defs.length, 60)
  assert.equal(new Set(defs.map((d) => d.label)).size, 60, '이름이 모두 다르다')
  // 효과의 '성격'(피해 칸·blockable·target 같은 공통 칸을 뺀 나머지 칸)이 겹치지 않는다
  const COMMON = ['target', 'blockable', 'dmg']
  const sig = (d) => {
    const keys = Object.keys(d.effect).filter((k) => !COMMON.includes(k)).sort()
    if (!keys.length) return `dmg:${JSON.stringify(d.effect.dmg)}`
    return keys.join('+')
  }
  const sigs = defs.map(sig)
  const dup = sigs.filter((x, i) => sigs.indexOf(x) !== i)
  assert.deepEqual(dup, [], `겹치는 효과: ${dup.join(', ')}`)
  // 예전처럼 '막을 수 없는 피해 + 의지력 흡수'만 하는 영능력은 하나도 없다
  for (const d of defs) assert.ok(!(d.effect.drain && Object.keys(d.effect).every((k) => ['dmg', 'drain', 'target', 'blockable'].includes(k))), d.label)
  for (const e of B.BESTIARY_ENEMIES) for (const line of B.specialEffects(e)) assert.doesNotMatch(line, /undefined|NaN/, e.id)
})

test('v-B.05: 영력결계를 꿰뚫는 칸(pierce)은 없어졌고, 결계째 삼키기만 결계를 무시한다', () => {
  for (const e of BESTIARY) for (const d of [e.special, e.special2].filter(Boolean)) assert.equal(d.effect.pierce, undefined, e.id)
  assert.equal(B.effectPierces(B.enemyById('docheol').special), true)
  assert.equal(B.effectPierces(B.enemyById('cheonma').special), false)
})

test('v-B.05: 즉시 효과 — 메치기·도깨비방망이·해 질 녘·범 부르기·마른 바람·머리 던지기·되비추기·끝없는 허기', () => {
  // 메치기: 지금 체력의 1/3, 막기도 소용없다
  const k = turn(battle(B.enemyById('kim-seobang'), { php: 90, guard: true }))
  assert.equal(k.state.php, 60)
  // 도깨비방망이: 공격력×4 를 인원 수로 나눈다
  const ks = { ...B.enemyById('kim-seobang'), special: B.enemyById('kim-seobang').special2 }
  const solo1 = turn({ ...battle(ks), party: true }, { noSpiritGate: true, partyN: 1 })
  const split3 = turn({ ...battle(ks), party: true }, { noSpiritGate: true, partyN: 3 })
  assert.ok(100 - split3.state.php < 100 - solo1.state.php)
  // 해 질 녘: 라운드가 지날수록 세다
  const m1 = turn(battle(B.enemyById('mangtae-halabeom'), { round: 1 }))
  const m9 = turn(battle(B.enemyById('mangtae-halabeom'), { round: 9 }))
  assert.equal((100 - m9.state.php) - (100 - m1.state.php), 16)
  // 범 부르기: 체력 절반 이하면 2배
  const hi = turn(battle(B.enemyById('changgwi'), { php: 100 }))
  const lo = turn(battle(B.enemyById('changgwi'), { php: 50 }))
  assert.equal(50 - lo.state.php, (100 - hi.state.php) * 2)
  // 마른 바람: 남은 의지력의 절반을 태워 그만큼 피해
  const g = turn(battle(B.enemyById('gangcheol')), { mp: 40 })
  assert.equal(g.mpDrain, 20); assert.equal(g.state.php, 80)
  // 머리 떼어 던지기: 자기 체력을 깎아 세 배로
  const jh = B.enemyById('jihaguk-daejeok')
  const j = turn({ ...battle(jh, { php: 1000, phpMax: 1000 }), party: true }, { noSpiritGate: true })
  const cost = Math.ceil(jh.hp * 0.02)
  assert.equal(j.state.ehp, jh.hp - cost); assert.equal(1000 - j.state.php, cost * 3)
  // 되비추기: 체력 비율이 평균으로
  const gw = B.enemyById('geoul-gwi')
  const e0 = Math.round(gw.hp * 0.2)
  const eq = turn(battle(gw, { php: 100, ehp: e0 }))
  const avg = (1 + e0 / gw.hp) / 2
  assert.equal(eq.state.php, Math.round(avg * 100)); assert.equal(eq.state.ehp, Math.round(avg * gw.hp))
  // 끝없는 허기: 부적을 먹고 장마다 3%
  const dc = { ...B.enemyById('docheol'), special: B.enemyById('docheol').special2 }
  const h = turn({ ...battle(dc, { ehp: 100 }), party: true }, { noSpiritGate: true })
  assert.equal(h.state.charms, 0); assert.equal(h.state.ehp, 100 + Math.ceil(dc.hp * 0.03 * 3))
})

test('v-B.05: 간파 방해 — 쓸어내기(간파 지움) · 헛것 보이기(거짓 행동) · 외발 뛰기(한 번 더)', () => {
  const w = turn(battle(B.enemyById('mongdangbi'), { known: 4 }))
  assert.equal(w.state.known, 0)
  const lie = turn(battle(B.enemyById('heokkaebi')))
  assert.equal(lie.state.lies.length, 3)
  lie.state.lies.forEach((f, i) => assert.notEqual(f, lie.state.queue[i], '거짓은 실제와 다르다'))
  assert.notDeepEqual(B.shownQueue(lie.state.queue, lie.state.lies), lie.state.queue)
  // 다음 턴마다 하나씩 밀린다
  const next = turn({ ...lie.state, queue: ['guard', ...lie.state.queue.slice(1)] })
  assert.equal(next.state.lies.length, 2)
  const dg = turn(battle(B.enemyById('dokgak-gwi'), { queue: ['special', 'jab', 'smash', 'jab', 'jab', 'jab'] }), {}, seq(0.5, 0.9, 0.9, 0.9))
  assert.ok(dg.events.some((e) => /한 번 더 움직인다/.test(e.text || '')))
  assert.ok(dg.events.some((e) => /약공/.test(e.text || '')), '당겨 쓴 약공')
  assert.equal(dg.state.queue[0], 'smash', '약공은 이미 썼으니 그다음 행동이 앞으로')
})

test('v-B.05: 내 상태 — 걸리고, 턴마다 줄고, 다 되면 풀린다', () => {
  const cases = [['yagwanggwi', 'itemSeal', 3], ['mongdal-gwisin', 'thorns', 3], ['songaksi', 'statDown', 3], ['jeokwi', 'vulnerable', 3], ['jigwi', 'forceRash', 2],
    ['yeou-nui', 'confuse', 3], ['geuseunsae', 'blind', 3], ['hwama', 'burn', 3], ['mudu-gwi', 'fear', 1], ['yohwa', 'paralyze', 3]]
  for (const [id, key, n] of cases) {
    const r = turn(battle(B.enemyById(id)))
    assert.equal(r.state.ps[key], n, `${id} → ${key}`)
    let s = r.state
    for (let i = 0; i < n; i++) s = turn({ ...s, queue: ['guard', ...s.queue.slice(1)], php: 100 }).state
    assert.equal(s.ps[key], undefined, `${id} ${key} 가 ${n}턴 뒤 풀린다`)
  }
  // 독은 쌓이고 풀리지 않는다
  let p = turn(battle(B.enemyById('cheonnyeon-jine'), { party: false }))
  p = turn({ ...p.state, queue: ['special', ...p.state.queue.slice(1)] })
  assert.equal(p.state.ps.poison, 2)
  for (let i = 0; i < 5; i++) p = turn({ ...p.state, queue: ['guard', ...p.state.queue.slice(1)], php: 100 })
  assert.equal(p.state.ps.poison, 2)
  assert.ok(p.events.some((e) => /독이 퍼진다 \(2겹\)/.test(e.text || '')))
  // 가위눌림: 잠들었다가 맞으면 깬다
  const sl = turn(battle(B.enemyById('gawi-gwi')))
  assert.equal(sl.state.pstun, 3); assert.equal(sl.state.ps.sleep, 1)
  const woke = turn({ ...sl.state, queue: ['jab', ...sl.state.queue.slice(1)] }, {}, fixed(0.9))
  assert.equal(woke.state.pstun, 0); assert.equal(woke.state.ps.sleep, undefined)
  // 할퀸 상처: 최대 체력이 줄어 쌓인다
  const mg = turn(battle(B.enemyById('myogwi')))
  assert.equal(mg.state.phpMax, 90)
})

test('v-B.05: 내 상태가 행동을 바꾼다 — 홀린 귀·연모·공포·저림, 그리고 스탯 변화(서러움·날개 그늘·무구 봉인·뒤섞임)', () => {
  const s = B.newBattle(B.enemyById('jangsanbeom'), stats(), fixed(0.5), 100, 100)
  const sc = B.beforePlayer({ ...s, ps: { scramble: 1 } }, 'charm', { mp: 10 }, fixed(0.99))
  assert.equal(sc.action, 'scan'); assert.equal(sc.state.ps.scramble, undefined)
  assert.equal(B.beforePlayer({ ...s, ps: { forceRash: 2 } }, 'guard', { mp: 10 }).action, 'attack')
  assert.equal(B.beforePlayer({ ...s, ps: { fear: 1 } }, 'charm', { mp: 10 }).action, 'guard')
  assert.equal(B.beforePlayer({ ...s, ps: { paralyze: 3, paralyzeChance: 30 } }, 'attack', { mp: 10 }, fixed(0.1)).failed, true)
  assert.equal(B.beforePlayer({ ...s, ps: { paralyze: 3, paralyzeChance: 30 } }, 'attack', { mp: 10 }, fixed(0.5)).failed, false)
  assert.deepEqual(B.blockedActions({ ps: { fear: 1 } }), ['attack', 'charm'])
  const base = { ...stats(20), aggression: 30 }
  Object.defineProperty(base, 'fx', { value: 'sword', enumerable: false })
  assert.equal(B.afflictStats(base, {}), base, '걸린 게 없으면 그대로')
  assert.equal(B.afflictStats(base, { statDown: 2, downStat: 'aggression' }).aggression, 15)
  assert.equal(B.afflictStats(base, { blind: 2 }).insight, 10)
  assert.equal(B.afflictStats(base, { weaponSeal: 2 }).fx, null)
  assert.equal(B.afflictStats(base, { statSwap: 2, swap: ['insight', 'aggression'] }).insight, 30)
  assert.equal(B.afflictStats(base, { blind: 2 }).fx, 'sword', '무구는 그대로 따라간다')
})

test('v-B.05: 내 행동의 뒤 — 금빛 울림·목마름·들러붙음·독안개·화상 끄기, 자기 턴의 대가로는 쓰러지지 않는다', () => {
  const s = { ...B.newBattle(B.enemyById('hanbal'), stats(), fixed(0.5), 100, 100), queue: ['jab', 'jab', 'jab', 'jab', 'jab'] }
  const scan = (ps, mp = 50) => B.afterPlayer({ ...s, ps }, B.playerTurn({ ...s, ps }, 'scan', { stats: stats(), mp, scanAmount: 5 }), { action: 'scan', mp })
  assert.equal(scan({ costUp: 2 }).mpCost, 10, '비용 두 배')
  assert.equal(scan({ costUp: 2 }, 7).mpCost, 7, '남은 의지력이 한도')
  assert.equal(scan({ mpTax: 2 }).state.php, 95, '쓴 의지력만큼 체력')
  const g = B.afterPlayer({ ...s, ps: { guardTrap: 2, guardTrapDie: 10, burn: 2, burnPct: 0.06 } }, B.playerTurn({ ...s, ps: { guardTrap: 2, guardTrapDie: 10, burn: 2, burnPct: 0.06 } }, 'guard', { stats: stats(), mp: 10 }), { action: 'guard', mp: 10 }, fixed(0.95))
  assert.equal(g.state.php, 90); assert.equal(g.state.ps.burn, undefined, '막으면 불이 꺼진다')
  const thin = { ...s, php: 3, ps: { thorns: 2, thornsDie: 50 } }
  const t = B.afterPlayer(thin, B.playerTurn(thin, 'attack', { stats: stats(), mp: 10 }, fixed(0.5)), { action: 'attack', mp: 10 }, fixed(0.99))
  assert.equal(t.state.php, 1, '체력 1에서 멈춘다')
  const burn = B.playerTurnStart({ ...s, php: 50, ps: { burn: 2, burnPct: 0.06 } })
  assert.equal(burn.state.php, 44)
})

test('v-B.05: 상대에게 준 피해의 처리 — 둔갑·홀림·껍질·방패 진형·대인 넘어뜨리기·땡볕 그치기·뼈 맞추기', () => {
  const e = B.enemyById('gwimok')
  const s = { ...B.newBattle(e, stats(30), fixed(0.5), 100, 100), queue: ['jab', 'jab', 'jab', 'jab', 'jab'] }
  const hit = (st, act = 'attack') => B.afterPlayer(st, B.playerTurn(st, act, { stats: stats(30), mp: 50 }, fixed(0.9)), { action: act, mp: 50 })
  const dealt = s.ehp - B.playerTurn(s, 'attack', { stats: stats(30), mp: 50 }, fixed(0.9)).state.ehp
  assert.ok(dealt > 0)
  const ev = hit({ ...s, es: { evade: 2 } })
  assert.equal(ev.state.ehp, s.ehp); assert.equal(ev.state.es.evade, 1)
  const cf = hit({ ...s, ps: { confuse: 3 } })
  assert.equal(cf.state.ehp, s.ehp); assert.equal(cf.state.php, 100 - Math.floor(dealt / 2))
  const sh = hit({ ...s, es: { shield: 5 } })
  assert.equal(sh.state.ehp, s.ehp - (dealt - 5)); assert.equal(sh.state.es.shield, undefined)
  const rf = hit({ ...s, es: { reflect: 0.5 } })
  assert.equal(rf.state.php, 100 - Math.floor(dealt * 0.5)); assert.equal(rf.state.es.reflect, undefined)
  const dl = hit({ ...s, es: { delayed: { turns: 2, mult: 3, add: 5, need: 1, taken: 0 } } })
  assert.equal(dl.state.es.delayed, undefined, '넘어져 취소')
  const fd = hit({ ...s, es: { field: { die: 5, need: 1, dealt: 0 } } })
  assert.equal(fd.state.es.field, undefined, '비가 내린다')
  const rv = hit({ ...s, ehp: 1, es: { revive: 0.25 } })
  assert.equal(rv.state.over, null); assert.equal(rv.state.ehp, Math.ceil(e.hp * 0.25)); assert.equal(rv.state.es.revive, 'used')
  const done = hit({ ...rv.state, ehp: 1 })
  assert.equal(done.state.over, 'win', '두 번은 안 일어선다')
})

test('v-B.05: 적에게 걸리는 상태 — 쥐 떼·엄니 갈기·날뛰기·발 들어 올리기·아홉 머리·마왕의 거울·아흔아홉째·되감기', () => {
  // 엄니 갈기: 다음 강공 ×3
  const gd = turn({ ...battle(B.enemyById('geumdwaeji')), party: true }, { noSpiritGate: true })
  assert.equal(gd.state.queue[0], 'smash'); assert.equal(gd.state.es.smashMult, 3)
  const smash = turn({ ...gd.state, party: false }, {}, fixed(0.9))
  assert.equal(smash.state.es.smashMult, undefined)
  assert.ok(smash.events.some((e) => /강공 \(×3\)/.test(e.text || '')))
  // 날뛰기: 다음 세 행동이 강공
  const dl = turn(battle(B.enemyById('doul')))
  assert.deepEqual(dl.state.queue.slice(0, 3), ['smash', 'smash', 'smash'])
  // 발 들어 올리기: 3턴 뒤 짓밟는다
  let d = turn(battle(B.enemyById('daein'), { php: 1000, phpMax: 1000 })).state
  assert.equal(d.es.delayed.turns, 3)
  for (let i = 0; i < 2; i++) d = turn({ ...d, queue: ['guard', ...d.queue.slice(1)] }).state
  assert.equal(d.es.delayed.turns, 1)
  const stomp = turn({ ...d, queue: ['guard', ...d.queue.slice(1)] })
  assert.ok(stomp.events.some((e) => /짓밟기/.test(e.text || ''))); assert.equal(stomp.state.es.delayed, undefined)
  // 아홉 머리 깨우기: 공격력이 쌓인다 (적 데이터는 그대로)
  const jh = { ...B.enemyById('jihaguk-daejeok'), special: B.enemyById('jihaguk-daejeok').special2 }
  const r1 = turn({ ...battle(jh), party: true }, { noSpiritGate: true })
  const r2 = turn({ ...r1.state, queue: ['special', ...r1.state.queue.slice(1)] }, { noSpiritGate: true })
  assert.equal(r2.state.es.atkBonus, 8); assert.equal(r2.state.enemy.atk, B.enemyById('jihaguk-daejeok').atk)
  // 마왕의 거울: 3턴 동안 공격력 +(내 가장 높은 스탯/2), 그 뒤 풀린다
  let c = turn(battle(B.enemyById('cheonma')), { stats: { ...stats(), insight: 60 } }).state
  assert.equal(c.es.statCopy, 3)
  for (let i = 0; i < 3; i++) c = turn({ ...c, queue: ['guard', ...c.queue.slice(1)] }).state
  assert.equal(c.es.statCopy, undefined)
  // 아흔아홉째: 쓸 때마다 두 배
  const y = B.enemyById('yeongno')
  const y1 = turn(battle(y, { php: 1000, phpMax: 1000 }))
  const y2 = turn({ ...y1.state, queue: ['special', ...y1.state.queue.slice(1)], php: 1000 })
  assert.equal(1000 - y2.state.php, (1000 - y1.state.php) * 2)
  // 거꾸로 외는 경: 두 턴 전 체력으로 (최대 30%)
  const nh = B.enemyById('noho-seung')
  const rw = turn(battle(nh, { ehp: 10, es: { ehpHist: [nh.hp, nh.hp - 5, 50] } }))
  assert.equal(rw.state.ehp, 10 + Math.ceil(nh.hp * 0.3))
})

// ───────── 다인 ─────────
const party = (n, s = 10) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `M${i}`, stats: stats(s), mp: 100, mpMax: 100, hp: 100, hpMax: 100, psychics: [] }))
/** 한 라운드: 모두 막기 → 상대가 영능력(which: 1 | 2) */
function oneRound(id, which = 1, members = party(3), setup = () => {}) {
  const mb = MB.createMB(id, members, fixed(0.5))
  mb.queue = ['special', 'jab', 'jab', 'jab', 'jab']
  setup(mb)
  const orig = Math.random
  Math.random = () => (which === 2 ? 0.1 : 0.9) // special2 를 고를지
  try {
    MB.beginRound(mb, fixed(0.99))
    // 보스의 두 영능력 중 하나는 resolveTurn 에 넘긴 rng 로 고른다 (< 0.5 → 둘째)
    for (const r0 = mb.round; mb.turn && mb.round === r0;) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, fixed(which === 2 ? 0.3 : 0.6)) }
  } finally { Math.random = orig }
  return mb
}

test('v-B.05 다인: 흰 털 냄새·산과 물 잇기·행렬에 끼우기·넋 뒤바꾸기', () => {
  const mk = oneRound('jangsanbeom', 2)
  assert.ok(mk.es.mark && mk.members.some((m) => m.id === mk.es.mark.id))
  const ln = oneRound('imae-mangryang', 1, party(2))
  assert.equal(ln.es.link.ids.length, 2)
  const bg = oneRound('baekgwi', 1, party(3, 45))
  const gone = bg.members.find((m) => m.banished > 0)
  assert.ok(gone, '한 사람이 끌려갔다')
  assert.ok(!bg.order.includes(gone.id), '이번 라운드 차례에서 빠진다')
  const sw = oneRound('gaekgwi', 1, party(2), (mb) => { mb.members[1].php = 20 })
  assert.deepEqual(sw.members.map((m) => m.php).sort((a, b) => a - b).slice(0, 1).length, 1)
  assert.ok(sw.log.some((l) => /넋이 뒤바뀐다/.test(l.text || '')))
})

test('v-B.05 다인: 싸움 붙이기·해와 달 물기·꼬리에 감은 원한·역병·쥐 떼', () => {
  const ff = oneRound('gunggi', 1, party(3, 50))
  assert.ok(ff.log.some((l) => /싸움을 붙인다/.test(l.text || '')))
  const ch = oneRound('bulgae', 1, party(3, 30))
  assert.ok(ch.log.some((l) => /차례로 문다/.test(l.text || '')))
  const rl = oneRound('samdugumi', 2, party(3, 46), (mb) => { mb.es = { takenLog: [300], takenNow: 0 } })
  assert.ok(rl.log.some((l) => /감아 둔 원한 \d+/.test(l.result || '')))
  const pl = oneRound('yeoksin', 1, party(3, 30))
  assert.equal(pl.members.filter((m) => (m.ps.plague || 0) > 0).length, 2, '걸린 사람 + 옮은 사람')
  const rat = oneRound('dungap-jwi', 1, party(2, 3))
  assert.ok(rat.log.some((l) => /쥐 떼가 발목을 문다/.test(l.text || '')))
})

test('v-B.05 다인: 신 훔치기·돌림병은 아이템을 막고, 결계째 삼키기는 결계를 없앤다', () => {
  const mb = MB.createMB('yeoksin', party(2), fixed(0.5))
  MB.beginRound(mb, fixed(0.99))
  const me = mb.members.find((m) => m.id === mb.turn)
  me.ps = { itemSeal: 2 }
  assert.equal(MB.useItemMB(mb, me.id, itemOf('energy'), me.id).error, 'item-seal')
  me.ps = { healBlock: 2 }
  const heal = { id: 'x', battle: true, effect: { hp: 10 } }
  assert.equal(MB.useItemMB(mb, me.id, heal, me.id).error, 'heal-block')
  const v = MB.viewOf(mb)
  assert.ok('ps' in v.members[0] && 'es' in v)
})

test('v-B.05: 전투 데이터 50종이 단독·다인 모두 끝까지 깨지지 않고 진행된다', () => {
  const KEYS = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension']
  for (const e of B.BESTIARY_ENEMIES) {
    const lv = Number(String(e.rec).split('~')[0])
    const st = Object.fromEntries(KEYS.map((k) => [k, lv]))
    if (e.partySize > 1) {
      const mb = MB.createMB(e.id, party(e.partySize, lv))
      MB.openingInitiative(mb)
      if (mb.phase === 'input' && !mb.turn) MB.beginRound(mb)
      for (let g = 0; g < 4000 && !mb.over; g++) {
        if (mb.phase === 'survive') { for (const p of MB.pendingSurvivors(mb)) MB.survive(mb, p.id, true); continue }
        if (MB.ready(mb)) { MB.resolveTurn(mb); continue }
        const w = MB.waitingOn(mb)[0]
        if (!w) { if (!mb.turn) MB.beginRound(mb); continue }
        if (MB.submit(mb, w.id, { action: 'attack' }).error) MB.submit(mb, w.id, { action: 'guard' })
      }
      assert.ok(mb.over, `${e.id} 끝남`)
    } else {
      let s = B.newBattle(e, st)
      let mp = 100
      for (let t = 0; t < 400 && !s.over; t++) {
        if (s.pendingDeath) { const sv = B.resolveSurvive(s, true, mp, st); mp -= sv.mpCost; s = sv.state; continue }
        s = B.playerTurnStart(s).state
        if (s.pstun > 0) s = { ...s, pstun: s.pstun - 1 }
        else {
          const pre = B.beforePlayer(s, 'attack', { mp })
          s = pre.state
          if (!pre.failed) {
            const r = B.afterPlayer(s, B.playerTurn(s, pre.action, { stats: st, mp, scanAmount: 1 }), { action: pre.action, mp })
            mp -= r.mpCost || 0
            s = r.state
          }
        }
        if (s.over) break
        const r = B.enemyTurn(s, { stats: st, mp })
        mp -= r.mpDrain
        s = r.state
      }
      assert.ok(s.over || s.pendingDeath, `${e.id} 끝남`)
    }
  }
})

// ───────── 개척 산길 5~20 ─────────
const cell = (x, y) => String.fromCharCode(65 + x) + (y + 1)
test('v-B.05 개척: 산길 5~20 열여섯 곳이 산길 4 다음 자리에 들어갔다', () => {
  const names = HUNT_PATHS[0].sites.map((s) => s.name)
  assert.deepEqual(names.slice(0, 20), Array.from({ length: 20 }, (_, i) => `산길 ${i + 1}`))
  assert.deepEqual(names.slice(20), ['호수', '묘소', '동굴', '?? 보관소'], '나머지는 원래 자리 그대로')
  assert.equal(TRAIL_SITES.length, 16)
  for (const t of TRAIL_SITES) {
    assert.equal(HUNT_SITES[t.id], t)
    assert.deepEqual(siteMissingData(t), [], t.name)
  }
})

test('v-B.05 개척: 지도 검사 — 겹침 없음, 동물 경로가 장애물을 밟지 않음, 30턴 안에 닿음, 목표 스탯으로 시도 가능', () => {
  for (const t of TRAIL_SITES) {
    const occ = new Map()
    for (const n of t.nodes) {
      assert.ok(!occ.has(n.id), `${t.name} ${n.id} 겹침`)
      occ.set(n.id, n)
      assert.ok(HUNT_SPECIES[n.species], `${t.name} 종 ${n.species}`)
    }
    assert.ok(!occ.has('A10'), `${t.name} 시작 칸이 비어 있다`)
    const obs = new Set(t.nodes.filter((n) => n.kind === 'obstacle').map((n) => n.id))
    for (const n of t.nodes.filter((x) => x.kind === 'animal')) {
      assert.ok(n.route.some((p) => p.x === n.x && p.y === n.y), `${t.name} ${n.id} 경로 위에서 시작`)
      for (const p of n.route) assert.ok(!obs.has(cell(p.x, p.y)) && p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10, `${t.name} ${n.id} 경로`)
    }
    // 걸어서(장애물은 3번 시도로 걷어 낸다고 치고) 30턴 안에 모든 칸에 닿는다
    const dist = new Map([['A10', 0]]); const pq = [[0, 0, 9]]
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]); const [d, x, y] = pq.shift()
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx > 9 || ny > 9) continue
        const c = cell(nx, ny), nd = d + 1 + (obs.has(c) ? 3 : 0)
        if (nd < (dist.get(c) ?? 1e9)) { dist.set(c, nd); pq.push([nd, nx, ny]) }
      }
    }
    for (const n of t.nodes.filter((x) => x.kind !== 'obstacle')) assert.ok((dist.get(n.id) ?? 99) <= 30, `${t.name} ${n.id} 도달`)
    const S = t.targetStat
    const st = { insight: S, aggression: S, endurance: S, control: S, agility: S, comprehension: S }
    for (const n of t.nodes) assert.equal(huntOdds(n.kind, n.level, st).blocked, false, `${t.name} ${n.id} 시도 가능`)
    for (const s of t.spirits) assert.equal(huntOdds('spirit', s.level, st).blocked, false, `${t.name} 영물 ${s.name}`)
    // 보상 아이템이 모두 있다
    for (const r of [...t.nodes.flatMap((n) => HUNT_SPECIES[n.species].rewards), ...t.spirits.flatMap((s) => s.rewards), ...t.ghost.rewardItems]) assert.ok(itemOf(r.item), `${t.name} 아이템 ${r.item}`)
  }
})

test('v-B.05 개척: 영물은 산길마다 둘(귀한 15% · 흔한 20%), 요괴는 전투 데이터의 단독 적', () => {
  const spiritKinds = new Set()
  for (const t of TRAIL_SITES) {
    assert.deepEqual(t.spirits.map((s) => s.chance), [0.15, 0.2], t.name)
    for (const s of t.spirits) { assert.equal(s.kind, 'spirit'); spiritKinds.add(s.species) }
    assert.equal(t.ghost.enemy.partySize, 1, `${t.name} 요괴는 혼자 상대`)
    assert.equal(t.ghost.rewardSpirit, Math.min(500, t.ghost.enemy.spirit * 2))
    assert.ok(t.ghost.enemy === B.enemyById(t.ghost.enemy.id))
  }
  assert.equal(spiritKinds.size, 13, '영물 13종 (9 + 덧붙인 4)')
  for (const s of ['whiteSquirrel', 'goldenSerpent', 'fortuneBat', 'haedongcheong']) assert.ok(spiritKinds.has(s), s)
})

test('v-B.05 개척: 영물 둘을 따로 굴려 roaming-spirit-1·-2 로 나타나고, 영물 하나인 터는 그대로 roaming-spirit', () => {
  const player = { hp: 100, mp: 100, inventory: {} }
  const both = enterHuntSite(player, HUNT_SITES['left-trail-5'], 1000, fixed(0.01)).player.huntExpedition
  const ids = both.nodes.filter((n) => n.id.startsWith('roaming-')).map((n) => n.id).sort()
  assert.deepEqual(ids, ['roaming-ghost', 'roaming-spirit-1', 'roaming-spirit-2'])
  assert.deepEqual(both.nodes.filter((n) => n.kind === 'spirit').map((n) => n.name).sort(), ['흰 까치', '흰 다람쥐'].sort())
  const none = enterHuntSite(player, HUNT_SITES['left-trail-5'], 1000, fixed(0.99)).player.huntExpedition
  assert.equal(none.nodes.filter((n) => n.id.startsWith('roaming-')).length, 0)
  const one = enterHuntSite(player, HUNT_SITES['left-trail-1'], 1000, fixed(0.01)).player.huntExpedition
  assert.deepEqual(one.nodes.filter((n) => n.id.startsWith('roaming-')).map((n) => n.id).sort(), ['roaming-ghost', 'roaming-spirit'])
})

test('v-B.05 개척: 새 재료 33종과 그 아이콘', () => {
  assert.equal(B05_ITEMS.length, 33)
  const icons = read('../src/components/iconsB05.jsx')
  for (const it of B05_ITEMS) {
    assert.equal(itemOf(it.id)?.name, it.name)
    assert.ok(itemOf(it.id).tags.includes('재료'))
    assert.match(icons, new RegExp(`'${it.id}': \\{ bg: '\\w+', art: ART\\.\\w+ \\}`), it.id)
  }
  assert.match(read('../src/components/ItemIcon.jsx'), /Object\.assign\(CUSTOM_ICONS, B05_ICONS\)/)
  assert.match(read('../src/Game.jsx'), /\$\{result\.enemy\?\.name \?\? '요괴'\}에게 쓰러져 양호실에서 눈을 떴다/, '개척 패배 문구가 요괴 이름을 쓴다')
})

// ───────── 도감 · 추가전투 ─────────
test('v-B.05 도감: 2장 이름이 요괴이고, 퇴마 실습·개척 요괴·추가전투 요괴와 그 영능력이 모두 들어간다', () => {
  const codex = read('../src/game/codex.js')
  assert.match(codex, /\{ id: 'enemies', no: 2, title: '요괴' \}/)
  assert.match(codex, /\.\.\.ENEMIES\.map\(\(e\) => \(\{ enemy: e, group: '퇴마 실습/)
  assert.match(codex, /group: '개척 요괴'/)
  assert.match(codex, /\.\.\.BESTIARY_ENEMIES\.map\(\(e\) => \(\{ enemy: e, group: tierGroup\(e\.tier\)/)
  assert.match(codex, /\.\.\.yogoeList\(\)\.flatMap\(/, '영능력 장도 같은 요괴 목록에서 만든다')
  assert.match(codex, /'mountain-ghost':.*'tree-spirit':.*'water-ghost':.*'ang-gwaengi':.*'eodukssini':/s, '개척 요괴 설명')
  // 개척 요괴(산귀신·목신·물귀신·앙괭이·어둑시니)는 모두 개척 터에 있다
  const ghostIds = new Set(Object.values(HUNT_SITES).map((s) => s.ghost?.enemy?.id))
  for (const id of ['mountain-ghost', 'tree-spirit', 'water-ghost', 'ang-gwaengi', 'eodukssini']) assert.ok(ghostIds.has(id), id)
})

test('v-B.05 추가전투: 둘레길 교외 옆에 있고, 전투 데이터 50종을 단계별로 고른다', () => {
  const loop = HIKE_PATHS.find((p) => p.id === 'center').branches.find((b) => b.id === 'loop')
  assert.deepEqual(loop.spots.map((s) => s.name), ['교외', '추가전투'])
  assert.ok(HIKE_SPOT_IDS.includes('gym:center:loop:extraBattle'))
  const hike = read('../src/components/locations/Hike.jsx')
  assert.match(hike, /spot\.id === 'extraBattle' && battle \?/)
  assert.match(hike, /<Battle \{\.\.\.battle\} roster=\{roster\} rosterIntro=\{intro\} \/>/)
  assert.match(read('../src/components/locations/Gym.jsx'), /battle=\{rest\}/, '체육관과 같은 전투 함수(보상 한도 포함)를 쓴다')
  const ui = read('../src/components/locations/Battle.jsx')
  assert.match(ui, /\{!roster && \(/, '추가전투에는 전투 안내 버튼이 없다')
  assert.match(ui, /statusChips\(b\.ps\)/); assert.match(ui, /enemyChips\(b\.es\)/); assert.match(ui, /shownQueue\(b\.queue, b\.lies\)/)
  assert.match(read('../src/components/locations/MultiBattle.jsx'), /statusChips\(m\.ps\)/)
})
