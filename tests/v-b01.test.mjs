import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BOSS_SLOT_COUNT, bossSlotsOf, cleanSlot, loadBossSlot, saveBossSlot } from '../src/game/bossSlots.js'
import { UPDATE_NOTES } from '../src/game/updateNotes.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('v-B.01: 산 탐색 안의 개척 입구가 없고, [개척] 화면에서만 개척한다', () => {
  const hike = read('../src/components/locations/Hike.jsx')
  assert.doesNotMatch(hike, /HuntField|pickHunt|huntOn/)
  assert.match(read('../src/components/locations/Pioneer.jsx'), /<HuntField/)
  assert.match(read('../src/components/locations/Gym.jsx'), /view === 'pioneer'/)
})

test('v-B.01: 동아리 활동 — 개척 10회(+20냥, 자동 달성 아님) · 개척 2회(+5냥) · 제작 5회 +20냥 · 양호실 7회', () => {
  const q = read('../src/game/clubQuests.js')
  assert.match(q, /\{ id: 'pioneer10', label: '개척 10회 하기', reward: \{ money: 20 \}, done: \(w\) => \(w\.pioneer \|\| 0\) >= 10/)
  assert.doesNotMatch(q, /gather5/)
  assert.doesNotMatch(q, /id: 'pioneer10'[^\n]*auto: true/)
  assert.match(q, /\{ id: 'd_pioneer2', label: '개척 2회 하기', reward: \{ money: 5 \}, done: \(d\) => \(d\.pioneer \|\| 0\) >= 2/)
  assert.doesNotMatch(q, /d_gather1/)
  assert.match(q, /\{ id: 'craft5', label: '제작 5회 하기 \(공작소·조리실\)', reward: \{ money: 20 \}/)
  assert.match(q, /label: '양호실에서 휴식·상담 총 7회 진행하기'[\s\S]{0,120}>= 7/)
  assert.match(q, /pioneer: 0, \/\/ v-B\.01/)
  // 개척 터에 들어갈 때마다 주간·일일 개척 1회
  assert.match(read('../src/Game.jsx'), /action\.type === 'enter' \? bumpDaily\(bumpWeekly\(result\.player, 'pioneer', 1, now\), 'pioneer', 1, now\)/)
})

test('v-B.01: 파티 전투 수락 1분, 보스 전투 2분', () => {
  const server = read('../server/index.js')
  assert.match(server, /const MB_LOBBY_MS = 60_000/)
  assert.match(server, /const MB_BOSS_LOBBY_MS = 120_000/)
  assert.match(server, /expires: Date\.now\(\) \+ mbLobbyMs\(enemy\)/)
  assert.match(server, /\}, mbLobbyMs\(enemy\)\)/)
})

test('v-B.01: 보스 전투 슬롯 3개 — 저장·불러오기·모자랄 때 안내', () => {
  assert.equal(BOSS_SLOT_COUNT, 3)
  let p = { inventory: { chewy: 2, ramen: 1 } }
  assert.deepEqual(bossSlotsOf(p), [null, null, null])
  p = saveBossSlot(p, 0, { chewy: 2, ramen: 1 }, ['survival', 'dokkaebi-fire'])
  p = saveBossSlot(p, 2, { ramen: 5 }, ['a', 'b', 'c'])
  const slots = bossSlotsOf(p)
  assert.deepEqual(slots[0], { items: { chewy: 2, ramen: 1 }, psychics: ['survival', 'dokkaebi-fire'] })
  assert.deepEqual(slots[2], { items: { ramen: 3 }, psychics: ['a', 'b'] }, '아이템 3개 · 영능력 2개까지만')
  assert.equal(slots[1], null)
  const ok = loadBossSlot(p, 0, ['survival', 'dokkaebi-fire'])
  assert.deepEqual(ok.items, { chewy: 2, ramen: 1 })
  assert.deepEqual(ok.psychics, ['survival', 'dokkaebi-fire'])
  const short = loadBossSlot({ ...p, inventory: { chewy: 1, ramen: 1 } }, 0, ['survival'])
  assert.equal(short.error, '아이템이 모자라 1번 슬롯을 사용할 수 없습니다.')
  assert.equal(loadBossSlot(p, 2, []).error, '아이템이 모자라 3번 슬롯을 사용할 수 없습니다.')
  assert.equal(loadBossSlot(p, 1, []).error, '2번 슬롯이 비어 있습니다.')
  assert.deepEqual(loadBossSlot(p, 0, ['survival']).droppedPsychics, ['dokkaebi-fire'], '지금 없는 영능력은 빠진다')
  assert.equal(cleanSlot({ items: {}, psychics: [] }), null)
  assert.equal(bossSlotsOf(saveBossSlot(p, 0, {}, []))[0], null, '빈 선택으로 저장하면 슬롯을 비운다')
  const picker = read('../src/components/BringPicker.jsx')
  assert.match(picker, /data-boss-slot=\{i \+ 1\}/)
  assert.match(picker, /onClick=\{\(\) => useSlot\(i\)\}/)
  assert.match(read('../src/Game.jsx'), /onSaveSlot=\{\(index, items, psychics\) => setPlayer\(\(p\) => saveBossSlot\(p, index, items, psychics\)\)\}/)
})

test('v-B.01: 업데이트 노트는 이전 기록을 모두 지우고 v-B.01부터 시작한다', () => {
  // 가장 오래된 노트가 v-B.01이고, 그 위로 v-B.02 … 가 쌓인다.
  assert.equal(UPDATE_NOTES.at(-1).version, 'v-B.01')
  assert.ok(UPDATE_NOTES.at(-1).items.length >= 8)
  assert.ok(UPDATE_NOTES.every((n) => /^v-B\.\d{2}$/.test(n.version)))
  assert.ok(UPDATE_NOTES.every((n) => !/^v\d/.test(n.version)), '예전 v숫자 버전 노트는 남아 있지 않다')
})

// ───────── 5단계 3인 보스: 그슨대 ─────────
test('그슨대: 5단계 · 3인 · 보스, 영능력 2종과 기믹 문구', async () => {
  const { ENEMIES, REC_STATS, recLabel, specialEffects } = await import('../src/game/battle.js')
  const e = ENEMIES.find((x) => x.id === 'geuseundae')
  assert.ok(e)
  assert.equal(e.tier, 5)
  assert.equal(e.partySize, 3)
  assert.equal(e.boss, true)
  assert.deepEqual(e.tags, ['다인 전투', '보스'])
  assert.equal(REC_STATS[5], '18~20')
  assert.equal(recLabel(e), '모든 스탯 18~20 기준')
  assert.equal(e.reward, e.spirit * 2)
  assert.ok(e.special.label && e.special2.label)
  assert.equal(specialEffects(e).length, 4)
  assert.ok(e.gimmicks.length >= 3)
})

test('그슨대: 내리누르기는 막을 수 없는 피해 + 영능력 봉인 / 어둠 드리우기는 막을 수 있는 피해 + 의지력 흡수 증가', async () => {
  const { ENEMIES, enemyTurn, newBattle, PSY_SEAL_ROUNDS, darkDrainDie } = await import('../src/game/battle.js')
  const enemy = ENEMIES.find((x) => x.id === 'geuseundae')
  const stats = { insight: 19, aggression: 19, endurance: 1, control: 19, agility: 19, comprehension: 19 }
  const fresh = (guard) => ({ ...newBattle(enemy, stats, () => 0.5, 100, 100, { party: true }), queue: ['special', 'jab', 'jab'], guard })
  // 내리누르기: 막기 중이어도 피해가 그대로, 봉인 3라운드, 막기 불가는 없음
  const s1 = enemyTurn(fresh(false), { stats, mp: 50, sp: 1, noSpiritGate: true }, () => 0.5)
  const s1g = enemyTurn(fresh(true), { stats, mp: 50, sp: 1, noSpiritGate: true }, () => 0.5)
  assert.equal(PSY_SEAL_ROUNDS, 3)
  assert.equal(s1.state.psySeal, 3)
  assert.ok(!s1.state.bound)
  assert.equal(100 - s1g.state.php, 100 - s1.state.php, '막아도 줄지 않는다')
  // 어둠 드리우기: 막으면 피해가 줄고, 의지력은 1d(영력×3/4)
  const s2 = enemyTurn(fresh(false), { stats, mp: 50, sp: 2, noSpiritGate: true }, () => 0.5)
  const s2g = enemyTurn(fresh(true), { stats, mp: 50, sp: 2, noSpiritGate: true }, () => 0.5)
  assert.ok(100 - s2g.state.php < 100 - s2.state.php, '막으면 줄어든다')
  assert.equal(darkDrainDie(enemy), Math.floor(enemy.spirit * 0.75))
  assert.ok(darkDrainDie(enemy) > Math.floor(enemy.spirit / 2), '예전(영력/2)보다 더 빨아들인다')
  assert.ok(s2.mpDrain > 0)
})

test('그슨대: 봉인된 사람은 다음 3라운드 동안 영능력·효험을 못 쓰고, 그 뒤 풀린다', async () => {
  const MB = await import('../src/game/mbattle.js')
  const stats = { insight: 19, aggression: 19, endurance: 19, control: 19, agility: 19, comprehension: 19 }
  const members = ['a', 'b', 'c'].map((id) => ({ id, name: id, stats, hp: 100, hpMax: 100, mp: 100, mpMax: 100, psychics: ['survival'] }))
  const mb = MB.createMB('geuseundae', members, () => 0.5)
  const a = mb.members[0]
  a.psySeal = 3
  a.psySealFresh = true
  MB.beginRound(mb, () => 0.99)
  // 봉인된 사람의 차례가 오면 영능력·효험 제출이 거부된다
  let guard = 0
  while (mb.turn !== 'a' && guard++ < 10) { MB.submit(mb, mb.turn, { action: 'guard' }); MB.resolveTurn(mb, () => 0.99) }
  assert.equal(mb.turn, 'a')
  assert.match(MB.submit(mb, 'a', { action: 'psychic', psychic: 'survival' }).error, /봉인/)
  assert.match(MB.submit(mb, 'a', { action: 'attack', buff: true }).error, /봉인/)
  assert.equal(MB.viewOf(mb).members.find((m) => m.id === 'a').psySeal, 3)
  assert.match(read('../src/components/locations/MultiBattle.jsx'), /영능력 봉인 \{m\.psySeal\}라운드/)
})

test('그슨대는 뒷산 · 전투 실습 목록의 맨 아래(마지막)에 있다', async () => {
  const { ENEMIES } = await import('../src/game/battle.js')
  assert.equal(ENEMIES.at(-1).id, 'geuseundae')
  assert.match(read('../src/components/locations/Gym.jsx'), /return <Battle \{\.\.\.rest\} \/>/)
  assert.match(read('../src/components/locations/Battle.jsx'), /const list = roster \?\? ENEMIES/) // v-B.05: 추가전투는 다른 목록(roster)을 넘긴다
  assert.match(read('../src/components/locations/Battle.jsx'), /\{list\.map\(\(e\) => \{/)
})

test('그슨대: 간파할 때마다 커지고(최대 5단계, 단계당 공격력 +2), 원본 적 데이터는 바뀌지 않는다', async () => {
  const { ENEMIES } = await import('../src/game/battle.js')
  const MB = await import('../src/game/mbattle.js')
  const baseAtk = ENEMIES.find((x) => x.id === 'geuseundae').atk
  const stats = { insight: 19, aggression: 19, endurance: 19, control: 19, agility: 19, comprehension: 19 }
  const members = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase(), stats, hp: 100, hpMax: 100, mp: 100, mpMax: 100 }))
  const mb = MB.createMB('geuseundae', members, () => 0.5)
  MB.beginRound(mb, () => 0.99)
  const actor = mb.turn
  assert.deepEqual(MB.submit(mb, actor, { action: 'scan', scanAmount: 1 }), { ok: true })
  MB.resolveTurn(mb, () => 0.99)
  assert.equal(mb.grow, 1)
  assert.equal(mb.enemy.atk, baseAtk + 2)
  assert.ok(mb.log.some((e) => /올려다보았다/.test(e.text || '')))
  MB.growBoss(mb, 10, '테스트')
  assert.equal(mb.grow, 5)
  assert.equal(mb.enemy.atk, baseAtk + 10)
  assert.equal(ENEMIES.find((x) => x.id === 'geuseundae').atk, baseAtk, '원본은 그대로')
  const view = MB.viewOf(mb)
  assert.equal(view.grow, 5)
  assert.equal(view.enemyAtk, baseAtk + 10)
})

test('보스 광분: 그슨대는 약공을 단체로 바꾸지 않고 매 라운드 커진다 / 불가살이는 기존대로', async () => {
  const MB = await import('../src/game/mbattle.js')
  const stats = { insight: 19, aggression: 19, endurance: 19, control: 19, agility: 19, comprehension: 19 }
  const members = ['a', 'b', 'c'].map((id) => ({ id, name: id, stats, hp: 100, hpMax: 100, mp: 100, mpMax: 100 }))
  const g = MB.createMB('geuseundae', members, () => 0.5)
  g.ehp = Math.floor(g.enemy.hp * 0.2)
  g.round = 1
  const r1 = MB.bossGimmick(g, 'jab')
  assert.equal(r1.intent, 'jab')
  assert.match(r1.notes[0], /솟아오른다/)
  const b = MB.createMB('bulgasari', members, () => 0.5)
  b.ehp = Math.floor(b.enemy.hp * 0.2)
  b.round = 1
  assert.equal(MB.bossGimmick(b, 'jab').intent, 'group')
  assert.match(MB.bossGimmick(b, 'jab').notes.join('') + b.rage, /2/)
})
