import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const Q = await import('../src/game/quests.js')
const D = await import('../src/game/questData.js')
const L = await import('../src/game/questLevels.js')
const C = await import('../src/game/clubQuests.js')
const ITEMS_MOD = await import('../src/game/items.js')
const { itemOf } = ITEMS_MOD
const { enemyById } = await import('../src/game/battle.js')

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mk = (S, extra = {}) => ({ name: '시험', createdAt: 7, stats: { insight: S, aggression: S, endurance: S, control: S, agility: S, comprehension: S }, inventory: {}, money: 0, spirit: 0, mp: 30, ...extra })
const NIGHT = Date.parse('2026-11-08T12:00:00Z') // 한국 시각 21:00
const mulberry = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const complete = (p, q) => {
  const g = q.goal
  if (g.type === 'deliver') return { ...p, inventory: { ...p.inventory, [g.id]: (p.inventory[g.id] || 0) + g.n } }
  let n = p
  for (let i = 0; i < g.n; i++) n = Q.questEvent(n, g.type === 'kill' ? { type: 'kill', id: g.id } : g.type === 'visit' ? { type: 'visit', key: g.key } : { type: g.type }, NIGHT)
  return n
}

test('B18 퀘스트 글: 모든 물건 · 적 id 가 실제로 있고, 대사 · 지문이 빠짐없다', () => {
  const goalIds = (g) => [g.item, g.enemy, ...(g.pool ?? []).map(([id]) => id)].filter(Boolean)
  for (const t of D.BARI_QUESTS) {
    for (const id of goalIds(t.goal)) assert.ok(itemOf(id) || enemyById(id), `${t.id}: ${id}`)
    for (const k of ['offer', 'accept', 'progress', 'done']) assert.ok(t[k]?.text, `${t.id}.${k}`)
  }
  for (const [npc, list] of Object.entries(D.NPC_QUESTS)) {
    assert.ok(D.QUEST_NPCS.some((n) => n.id === npc))
    assert.ok(list.length >= 6, `${npc} 부탁 6개 이상`)
    for (const t of list) {
      for (const id of goalIds(t.goal)) assert.ok(itemOf(id) || enemyById(id), `${t.id}: ${id}`)
      for (const k of ['offer', 'accept', 'progress', 'done']) assert.ok(t[k]?.text, `${t.id}.${k}`)
    }
  }
  assert.deepEqual(Object.keys(D.CLUB_TASK_DATA).sort(), ['board', 'broadcast', 'cook', 'craft', 'garden', 'martial', 'music', 'read', 'tea'])
  for (const d of Object.values(D.CLUB_TASK_DATA)) for (const [id] of d.deliver) assert.ok(itemOf(id), id)
  assert.ok(D.EXTRA_QUESTS.length >= 24)
  for (const z of D.EXTRA_ZONES) assert.ok(D.EXTRA_QUESTS.filter((t) => t.zone === z).length >= 5, `${z} 엑스트라 5개 이상`)
  assert.ok(!D.EXTRA_ZONES.includes('dorm'), '기숙사는 빠진다')
  for (const t of D.EXTRA_QUESTS) {
    assert.ok(t.text && t.acceptText && t.declineText && t.who, t.id)
    if (t.kind === 'quest') { assert.ok(t.doneText, t.id); for (const id of goalIds(t.goal)) assert.ok(itemOf(id) || enemyById(id), `${t.id}: ${id}`) }
    if (t.cost?.item) assert.ok(itemOf(t.cost.item), t.id)
  }
  assert.equal(Q.fillText('{item|을} {enemy|이} {x|으로} {y|으로} {z|은}', { item: '부적 묶음', enemy: '독각귀', x: '바늘', y: '먹', z: '도토리묵' }), '부적 묶음을 독각귀가 바늘로 먹으로 도토리묵은')
})

test('B18 수준 맞춤: 처치 대상은 지금 이길 만한 적, 납품 물건은 실제 개척 확률로 무난히 구할 수 있는 것', async () => {
  const { huntOdds } = await import('../src/game/huntField.js')
  const { HUNT_SITES, HUNT_SPECIES } = await import('../src/game/huntSites.js')
  for (const S of [2, 4, 7, 10, 13, 16, 20, 25, 30, 40, 46, 50, 60]) {
    const stats = L.questStats(mk(S))
    const access = L.makeAccess(stats)
    for (let day = 0; day < 20; day++) {
      const now = NIGHT + day * 86400000
      const p = mk(S)
      const offers = [Q.bariOffer(p, now), ...D.QUEST_NPCS.map((n) => Q.npcOffer(p, n.id, now))].filter(Boolean)
      for (const o of offers) {
        if (o.goal.type === 'kill') {
          const e = enemyById(o.goal.id)
          assert.ok(L.recLow(e) <= S || S < 2, `S${S} ${o.tpl}: ${e.name} 적정 ${e.rec ?? e.tier}`)
          assert.ok(!e.boss && (e.partySize || 1) === 1, `${o.tpl}: 혼자 싸울 수 있는 적`)
        }
        if (o.goal.type === 'deliver') {
          const a = access(o.goal.id)
          assert.ok(a.ok && a.y >= L.MIN_YIELD, `S${S} ${o.tpl}: ${o.goal.id} 무난하지 않음`)
          assert.ok(o.goal.n >= 1 && o.goal.n <= Math.max(1, Math.round(10 * Math.min(1, a.y))) + 0, `S${S} ${o.tpl}: 귀한 물건 개수 ${o.goal.id}×${o.goal.n}`)
        }
      }
    }
  }
  // 개척 칸 물건은 그 칸 종류의 두 스탯 합으로 성공 확률 80% 이상인 칸이 실제로 있어야 한다(huntOdds 로 따로 확인)
  const st10 = L.questStats(mk(10))
  const okNode = (item) => Object.values(HUNT_SITES).some((site) => (site.nodes ?? []).some((n) => {
    const sp = HUNT_SPECIES[n.species]
    return sp?.rewards?.some((r) => r.item === item && (r.chance ?? 1) >= 0.12) && huntOdds(sp.kind, n.level, st10).success >= 80
  }))
  for (const item of ['mushroom', 'pearl', 'acorn']) assert.equal(L.makeAccess(st10)(item).ok, okNode(item), item)
  // 요괴 전리품만으로 나오는 물건(은입사 장식: 5단계 앙괭이 15% × 50%)은 어느 수준에서도 부탁하지 않는다
  for (const S of [4, 20, 60]) assert.equal(L.makeAccess(L.questStats(mk(S)))('silver-inlay').ok, false)
  // 드롭 10% 인 봉인석은 장애물 스탯이 아주 높을 때만, 그것도 1개
  assert.equal(L.makeAccess(L.questStats(mk(20)))('sealing-stone').ok, false)
  // 영물(나타날 확률 15~20%)에게서만 나오는 장승 조각은 개수를 1로 줄인다
  const a = L.makeAccess(L.questStats(mk(10)))('jangseung-piece')
  assert.ok(a.ok && L.scaledCount(2, a) === 1)
  // 착용 장비 보정도 수준에 들어간다
  assert.equal(L.playerS(mk(10)), 10)
  assert.equal(L.playerS({ ...mk(10), equip: { body: 'crane-robe' } }), 12, '학창의(+12) 착용 → 평균 +2')
  // 분실물(이동 중에 줍는 것)은 갖고 있을 때만 부탁한다
  assert.equal(L.makeAccess(L.questStats(mk(30)))('lost-phone').ok, false)
  for (let day = 0; day < 60; day++) assert.notEqual(Q.npcOffer(mk(10), 'yumin', NIGHT + day * 86400000)?.tpl, 'yumin-lost')
  let seen = false
  for (let day = 0; day < 60 && !seen; day++) seen = Q.npcOffer(mk(10, { inventory: { 'lost-phone': 1 } }), 'yumin', NIGHT + day * 86400000)?.tpl === 'yumin-lost'
  assert.ok(seen, '분실물을 갖고 있으면 유민이 분실물 함 부탁을 한다')
  // 아주 처음(S2)에도 부탁이 끊기지 않는다
  for (let day = 0; day < 10; day++) assert.ok(Q.bariOffer(mk(2), NIGHT + day * 86400000), '바리 부탁')
})

test('B18 1순위 바리: 하룻밤에 한 건, 증표 1~2개, 바리에게만 건넨다, 다음 밤에 새 부탁', () => {
  let p = mk(4)
  const offer = Q.bariOffer(p, NIGHT)
  assert.ok(offer && [1, 2].includes(offer.reward.token))
  let r = Q.acceptBari(p, NIGHT)
  p = r.player
  assert.equal(Q.bariOffer(p, NIGHT), null)
  assert.match(Q.acceptBari(p, NIGHT).error, /이미/)
  const q = Q.bariActive(p)
  assert.equal(Q.questReady(q, p), false)
  p = complete(p, q)
  assert.equal(Q.questReady(Q.bariActive(p), p), true)
  assert.match(Q.turnInQuest(p, q.uid, NIGHT).error, /캠핑장/)
  r = Q.turnInQuest(p, q.uid, NIGHT, { via: 'bari' })
  assert.ok(r.line?.text)
  p = r.player
  assert.equal(p.inventory['goblin-token'], offer.reward.token)
  if (q.goal.type === 'deliver') assert.equal(p.inventory[q.goal.id] || 0, 0, '건넨 물건은 빠진다')
  assert.equal(Q.bariOffer(p, NIGHT), null, '같은 밤에는 더 없다')
  assert.equal(Q.bariOffer(p, NIGHT + 8 * 3600000), null, '새벽 5시도 같은 밤')
  assert.ok(Q.bariOffer(p, NIGHT + 24 * 3600000), '다음 밤에는 새 부탁')
  // 포기해도 그 밤은 끝
  let p2 = Q.acceptBari(mk(20), NIGHT).player
  p2 = Q.abandonQuest(p2, Q.bariActive(p2).uid, NIGHT).player
  assert.equal(Q.bariOffer(p2, NIGHT), null)
  // 증표 평균: 하룻밤 1~2개 → 농장 1개와 합쳐 하루 3개 이하
  for (const S of [3, 10, 20, 45]) {
    let sum = 0
    for (let d = 0; d < 100; d++) sum += Q.bariOffer(mk(S), NIGHT + d * 86400000).reward.token
    assert.ok(sum / 100 >= 1 && sum / 100 <= 2, `S${S} 평균 ${sum / 100}`)
  }
  // 소지품이 가득하면(증표 넣을 칸이 없으면) 건넬 수 없다
  const { ITEMS, isMaterial } = ITEMS_MOD
  let full = Q.acceptBari(mk(4), NIGHT).player
  const fq = Q.bariActive(full)
  full = complete(full, fq)
  const fillers = ITEMS.filter((it) => !isMaterial(it) && !it.id.includes('#') && it.id !== 'goblin-token' && it.id !== fq.goal.id).slice(0, 40)
  const stuffed = { ...full, inventory: { ...full.inventory, ...Object.fromEntries(fillers.map((it) => [it.id, 9])) } }
  assert.match(Q.turnInQuest(stuffed, fq.uid, NIGHT, { via: 'bari' }).error, /소지품이 가득/)
})

test('B18 3순위 NPC 의뢰: 한 사람이 하루 한 건, 건네면 냥 · 영력 · 호감도 +2', () => {
  let p = mk(10)
  for (const n of D.QUEST_NPCS) assert.ok(Q.npcOffer(p, n.id, NIGHT), `${n.id} 부탁`)
  let r = Q.acceptNpc(p, 'danae', NIGHT)
  p = r.player
  const q = Q.npcActive(p, 'danae')
  assert.equal(Q.npcOffer(p, 'danae', NIGHT), null)
  assert.ok(Q.npcOffer(p, 'yumin', NIGHT), '다른 사람의 부탁은 따로')
  p = complete(p, q)
  assert.equal(Q.readyCount(p), 1)
  r = Q.turnInQuest(p, q.uid, NIGHT)
  assert.ok(!r.error, r.error)
  p = r.player
  assert.equal(p.affinity.danae, 2)
  assert.equal(p.money, q.reward.money)
  assert.equal(p.spirit, q.reward.spirit)
  assert.equal(Q.npcOffer(p, 'danae', NIGHT), null, '오늘은 끝')
  assert.ok(Q.npcOffer(p, 'danae', NIGHT + 86400000), '내일 새 부탁')
})

test('B18 4순위 엑스트라: 네 구역 도착 때 10%, 하루에 받아들이는 건 한 건(받아들이면 그날은 더 뜨지 않는다), 3일 기한', () => {
  assert.equal(Q.EXTRA_CHANCE, 0.1)
  // 지금은 꺼 둠: 게임에서는 뜨지 않는다(데이터 · 구현은 남아 있다)
  assert.equal(Q.EXTRA_ENABLED, false)
  for (const z of D.EXTRA_ZONES) assert.equal(Q.rollExtra(mk(10, { inventory: { hanji: 9 } }), z, NIGHT, () => 0).enc, null)
  const rng = mulberry(11)
  let hits = 0
  const N = 20000
  for (let i = 0; i < N; i++) if (Q.rollExtra(mk(10, { inventory: { hanji: 9 } }), 'annex', NIGHT, rng, { force: true }).enc) hits++
  assert.ok(Math.abs(hits / N - 0.1) < 0.01, `확률 ${hits / N}`)
  assert.equal(Q.rollExtra(mk(10), 'dorm', NIGHT, () => 0, { force: true }).enc, null, '기숙사에서는 없다')
  // 지나치기만 하면 하루 5번까지 마주친다
  let p = mk(10)
  let n = 0
  for (let i = 0; i < 20; i++) { const r = Q.rollExtra(p, 'gym', NIGHT, () => 0.01, { force: true }); p = r.player; if (r.enc) n++ }
  assert.equal(n, Q.EXTRA_DAILY_ROLLS)
  // 의지력 · 물건은 그 자리에서 — 받아들이면 그날은 더 뜨지 않는다
  const mpT = D.EXTRA_QUESTS.find((t) => t.id === 'mh-books')
  const enc = Q.resolveExtra(mpT, mk(10), 'mainHall')
  const done = Q.acceptExtra(mk(10), enc, NIGHT)
  assert.equal(done.instant, true)
  assert.equal(done.player.mp, 30 - mpT.cost.mp)
  assert.ok(done.player.money > 0)
  assert.equal(Q.extraAcceptedToday(done.player, NIGHT), true)
  for (let i = 0; i < 10; i++) assert.equal(Q.rollExtra(done.player, 'mainHall', NIGHT + i * 60000, () => 0, { force: true }).enc, null, '같은 날에는 더 뜨지 않는다')
  assert.match(Q.acceptExtra(done.player, Q.resolveExtra(mpT, done.player, 'mainHall'), NIGHT).error, /오늘은 이미/)
  const tomorrow = NIGHT + 4 * 3600000 // 한국 시각 다음 날 새벽 1시
  assert.ok(Q.rollExtra(done.player, 'mainHall', tomorrow, () => 0, { force: true }).enc, '다음 날에는 다시 뜬다')
  assert.equal(Q.resolveExtra(D.EXTRA_QUESTS.find((t) => t.id === 'mh-hanji'), mk(10), 'mainHall'), null, '한지가 없으면 한지 부탁은 안 나온다')
  // 받아 두는 부탁: 하루 한 건씩, 기한(3일) 안에 3개까지
  let pq = mk(10)
  const quests = D.EXTRA_QUESTS.filter((t) => t.kind === 'quest')
  const days = [NIGHT, NIGHT + 4 * 3600000, NIGHT + 28 * 3600000, NIGHT + 52 * 3600000]
  for (let k = 0; k < 3; k++) {
    const r = Q.acceptExtra(pq, Q.resolveExtra(quests[k], pq, quests[k].zone ?? 'annex', () => 0.2), days[k])
    assert.ok(!r.error, r.error)
    pq = r.player
  }
  assert.match(Q.acceptExtra(pq, Q.resolveExtra(quests[3], pq, 'annex', () => 0.2), days[3]).error, /3개까지/)
  assert.equal(Q.rollExtra(pq, 'annex', days[3], () => 0, { force: true }).enc, null)
  const first = Q.questState(pq).active[0]
  assert.equal(first.until - first.at, 3 * 86400000)
  assert.equal(Q.questState(Q.pruneQuests(pq, NIGHT + 3 * 86400000 + 1)).active.length, 2)
  const ready = complete(pq, first)
  const t = Q.turnInQuest(ready, first.uid, days[2])
  assert.ok(!t.error && t.line?.text, t.error)
})

test('B18 2순위 동아리: 동아리별 주간 납품 · 토벌이 실제로 세어지고, 건넬 때 물건이 빠진다', () => {
  let p = C.ensureWeekly(mk(15), NIGHT)
  assert.equal(p.weekly.questS, 15, '그 주의 수준을 잠근다')
  const ctx = (pl) => ({ player: pl, clubId: 'cook' })
  const deliver = C.CLUB_QUESTS.find((q) => q.id === 'deliver')
  const hunt = C.CLUB_QUESTS.find((q) => q.id === 'hunt')
  assert.ok(!deliver.auto && !hunt.auto, '자동 달성 아님')
  assert.match(deliver.labelFor(p.weekly, ctx(p)), /^\[요리 동아리\] 동아리 시식회에 올릴 /)
  assert.match(hunt.labelFor(p.weekly, ctx(p)), /^\[요리 동아리\] 조리실 식재료를 노리는 .+ 3번 토벌하기/)
  assert.equal(hunt.done(p.weekly, ctx(p)), false)
  const task = Q.clubTask(p.weekly, ctx(p))
  assert.ok(L.makeAccess(L.questStats(mk(15)))(task.deliver.id).ok)
  assert.ok(L.recLow(enemyById(task.hunt.id)) <= 15)
  assert.deepEqual(p.weekly.questStats, L.questStats(mk(15)), '그 주의 퀘스트 스탯을 잠근다')
  // 토벌: 적을 쓰러뜨릴 때마다 센다
  for (let i = 0; i < 3; i++) p = Q.questEvent(p, { type: 'kill', id: task.hunt.id }, NIGHT)
  assert.equal(p.weekly.kills[task.hunt.id], 3)
  assert.equal(hunt.done(p.weekly, ctx(p)), true)
  let r = C.claimQuest(p, 'hunt', NIGHT, 'cook')
  assert.ok(r.ok)
  assert.ok(r.player.money > 0 && r.player.weekly.claimed.hunt)
  p = r.player
  // 납품: 물건이 있어야 하고, 받으면 빠진다
  assert.equal(C.claimQuest(p, 'deliver', NIGHT, 'cook').ok, false)
  p = { ...p, inventory: { [task.deliver.id]: task.deliver.n + 1 } }
  r = C.claimQuest(p, 'deliver', NIGHT, 'cook')
  assert.ok(r.ok)
  assert.equal(r.player.inventory[task.deliver.id], 1)
  // 동아리 id 가 없으면(가입 전) 달성되지 않는다
  assert.equal(deliver.done(p.weekly, { player: p, clubId: null }), false)
  // 업데이트 전에 시작된 주: 틱에서 수준을 한 번 채운다
  const legacy = { ...mk(20), weekly: { weekStart: C.weekStartOf(NIGHT), claimed: {} } }
  assert.equal(C.checkClubQuests(legacy, NIGHT).player.weekly.questS, 20)
  assert.ok(C.checkClubQuests(legacy, NIGHT).player.weekly.questStats)
})

test('B18 연결: 전투 승리 · 느린 싸움 · 개척 · 탐사 · 도깨비 놀이 · 도착 · 메뉴 · 캠핑장', () => {
  const game = read('../src/Game.jsx')
  assert.match(game, /if \(win && enemy\?\.id\) resultPlayer = questEvent\(resultPlayer, \{ type: 'kill', id: enemy\.id \}\)/)
  assert.match(game, /questEvent\(counted0, \{ type: 'pioneer' \}, now\)/)
  assert.match(game, /questEvent\(markWeeklySet\(playerRef\.current, 'exploreVisited', key\), \{ type: 'visit', key \}\)/)
  assert.match(game, /questEvent\(r\.player, \{ type: 'play' \}, now\)/)
  assert.equal((game.match(/rollExtra\(/g) ?? []).length, 3, '이동 도착 · 빠른 이동 · 바로 이동')
  assert.match(game, /panel === 'quest' \? \(\s*<QuestBoard player=\{player\} onAct=\{questAct\} \/>/)
  assert.match(game, /<ExtraQuestModal enc=\{extraEnc\}/)
  assert.match(read('../src/game/progress.js'), /questEvent\(r\.player, \{ type: 'kill', id: enemy\.id \}, now\)/)
  const menu = read('../src/components/MenuPanel.jsx')
  const order = [...menu.matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1])
  assert.deepEqual(order, ['world', 'beast', 'market', 'mailbox', 'quest', 'log'], '[의뢰]는 벼룩시장 · 사물함 아래 줄')
  assert.match(read('../src/game/hike.js'), /\{ id: 'goblinQuest', name: '도깨비 퀘스트', widget: 'bariQuest' \}/)
  assert.match(read('../src/components/locations/Hike.jsx'), /node\.widget === 'bariQuest'\) return <BariQuest player=\{player\} act=\{act\} \/>/)
  assert.match(read('../src/components/ClubModal.jsx'), /onClaimQuest\?\.\(q\.id, club\?\.id\)/)
})

test('B18 전하기: 해님 → 바리, 신아 → 단애 — 직접 전한 뒤 [의뢰]에서 보고해야 끝난다', () => {
  const findOffer = (npc, tpl, S = 12) => {
    for (let d = 0; d < 400; d++) {
      const now = NIGHT + d * 86400000
      const o = Q.npcOffer(mk(S), npc, now)
      if (o?.tpl === tpl) return now
    }
    return null
  }
  for (const [npc, tpl, to, reply] of [
    ['haenim', 'haenim-bari', 'bari', '앗, 저에게 주는 건가요? 고마워요. 잘 먹을게요!'],
    ['shinah', 'shinah-danae', 'danae', '와, 고마워. 그런데 갑자기 웬 선물이야?'],
  ]) {
    const now = findOffer(npc, tpl)
    assert.ok(now, `${tpl} 가 나오는 날`)
    let p = Q.acceptNpc(mk(12), npc, now).player
    const q = Q.npcActive(p, npc)
    assert.deepEqual(q.relay, { to })
    assert.equal(q.relayed, false)
    assert.match(Q.goalLine(q.goal, q.relay), new RegExp(`${Q.RELAY_TARGETS[to].name}에게 전하기`))
    // 물건만 갖고 있으면 아직 끝낼 수 없다
    p = { ...p, inventory: { ...p.inventory, [q.goal.id]: q.goal.n } }
    assert.equal(Q.questReady(Q.npcActive(p, npc), p), false)
    assert.equal(Q.readyCount(p), 0)
    assert.match(Q.turnInQuest(p, q.uid, now).error, /먼저 .+에게 직접 전해야/)
    // 다른 사람에게는 못 전한다
    assert.match(Q.relayQuest(p, q.uid, to === 'bari' ? 'danae' : 'bari', now).error, /에게 전해야 한다/)
    assert.equal(Q.relaysFor(p, to).length, 1)
    // 직접 전한다 → 물건이 빠지고, 받은 사람의 반응
    const r = Q.relayQuest(p, q.uid, to, now)
    assert.ok(!r.error, r.error)
    assert.equal(r.line.text, reply)
    p = r.player
    assert.equal(p.inventory[q.goal.id] || 0, 0)
    assert.equal(Q.relaysFor(p, to).length, 0)
    assert.match(Q.relayQuest(p, q.uid, to, now).error, /이미 전했다/)
    // 돌아가 보고한다 → 물건은 다시 빠지지 않고 보상
    const back = Q.npcActive(p, npc)
    assert.equal(Q.questReady(back, p), true)
    assert.equal(Q.readyCount(p), 1)
    assert.ok(Q.questLine(back, p, 'progress').text.length > 0)
    const done = Q.turnInQuest({ ...p, inventory: { ...p.inventory, [q.goal.id]: 5 } }, q.uid, now)
    assert.ok(!done.error, done.error)
    assert.equal(done.player.inventory[q.goal.id], 5, '보고할 때는 물건이 빠지지 않는다')
    assert.equal(done.player.affinity[npc], 2)
  }
  // 연결: 캠핑장 바리 위젯 · 별관 조리실 단애 · questAct
  assert.match(read('../src/components/QuestParts.jsx'), /<RelayButtons player=\{player\} to="bari"/)
  assert.match(read('../src/components/locations/Annex.jsx'), /<RelayButtons player=\{player\} to="danae"/)
  assert.match(read('../src/Game.jsx'), /op === 'relay'\) r = relayQuest\(cur, payload\.uid, payload\.to, now\)/)
})

test('B18 수정: 시트 대사 · 제목 반영, 퀘스트 대사에 따옴표 없음', () => {
  const lines = []
  for (const t of D.BARI_QUESTS) for (const k of ['offer', 'accept', 'progress', 'done']) lines.push([t.id, t[k].text])
  for (const list of Object.values(D.NPC_QUESTS)) for (const t of list) {
    for (const k of ['offer', 'accept', 'progress', 'done']) lines.push([t.id, t[k].text])
    if (t.relay) lines.push([t.id, t.relay.line.text])
    if (t.relayed) lines.push([t.id, t.relayed.text])
  }
  for (const v of [...Object.values(D.BARI_LINES), ...Object.values(D.NPC_IDLE)]) lines.push(['common', v.text])
  for (const [id, text] of lines) assert.ok(!/[“”"]/.test(text), `${id}: ${text}`)
  const npc = (id) => Object.values(D.NPC_QUESTS).flat().find((t) => t.id === id)
  assert.equal(npc('danae-ingredient').title, '가진게 없어')
  assert.equal(npc('haenim-window').title, '양호실은 정신병원이 아닙니다')
  assert.equal(npc('shinah-danae').done.text, '뭐라 하던? 아니, 너만 알아. 가버려.')
  assert.equal(npc('haenim-herb').offer.text.startsWith('약재 상자가'), true)
  assert.equal(D.BARI_QUESTS.find((t) => t.id === 'bari-bully').title, '겁많은 도깨비들')
  assert.equal(D.BARI_QUESTS.find((t) => t.id === 'bari-mongdang').done.text, '빗자루가 하나둘 돌아오고 있대요! 사감 선생님도 한숨 돌리셨고요. 이거, 도깨비들이 미안하다고 맡긴 증표예요.')
  assert.equal(npc('haenim-bari').relay.line.text, '앗, 저에게 주는 건가요? 고마워요. 잘 먹을게요!')
})

test('B18 아이템: 제작 전 효과 표시 · 완성품 판매 · 수량만큼 사용', async () => {
  assert.match(read('../src/components/RecipeBook.jsx'), /data-recipe-effect>효과 · \{out\.effectText\}/)
  for (const f of ['../src/components/locations/Workshop.jsx', '../src/components/locations/Cooking.jsx']) assert.match(read(f), /<RecipeBook listed=\{LISTED\}/)
  const S = await import('../src/game/sell.js')
  const { RECIPES } = await import('../src/game/crafting.js')
  const { COOK_RECIPES } = await import('../src/game/cooking.js')
  const { isMaterial } = ITEMS_MOD
  for (const r of [...RECIPES, ...COOK_RECIPES]) {
    if (isMaterial(itemOf(r.result))) continue // 재료로도 쓰는 중간 산물은 재료 값
    const p = S.sellPriceOf(r.result)
    assert.ok(Number.isInteger(p) && p >= 1, `${r.result} 판매가 ${p}`)
    const sum = r.inputs.reduce((a, [i, n]) => a + (S.sellPriceOf(i) ?? 1) * n, 0)
    assert.equal(p, Math.max(1, Math.ceil(sum * 1.1)), r.result)
  }
  assert.equal(S.sellPriceOf('w-fan'), null, '무구는 팔지 않는다')
  const r = S.sellItem({ inventory: { 'acorn-jelly': 2 }, money: 0 }, 'acorn-jelly', 2, Date.parse('2026-11-09T03:00:00Z'))
  assert.ok(!r.error, r.error)
  assert.equal(r.player.money, S.sellPriceOf('acorn-jelly') * 2)
  // 수량만큼 사용: 효과가 쌓이는 것만
  const inv = read('../src/components/InventoryModal.jsx')
  assert.match(inv, /onUse\(picked\.id, charcoalStat, useN\)/)
  const src = inv.match(/const STACK_KEYS = new Set\((\[[^\]]+\])\)/)[1]
  const keys = new Set(JSON.parse(src.replace(/'/g, '"')))
  const multi = (it) => !!it?.effect && !it.effect.hunt && Object.keys(it.effect).length > 0 && Object.keys(it.effect).every((k) => keys.has(k))
  assert.equal(multi(itemOf('ramen')), Object.keys(itemOf('ramen').effect).every((k) => keys.has(k)))
  assert.equal(multi({ effect: { buff: { stat: 'insight', amount: 1, hours: 1 } } }), false, '버프는 겹치지 않아 하나씩')
  assert.equal(multi({ effect: { hp: 10 } }), true)
  const game = read('../src/Game.jsx')
  assert.match(game, /onUse=\{useItemN\}/)
  assert.match(game, /const times = battleRef\.current \|\| mbLiveRef\.current \? 1 :/)
})


test('B18 자유 제작: 제작 칸 10칸, 제작법과 맞으면 그대로(배수면 여러 개), 없으면 조리실 숯 · 공작소 쓰레기', async () => {
  const F = await import('../src/game/freeCraft.js')
  const { RECIPES } = await import('../src/game/crafting.js')
  const { COOK_RECIPES } = await import('../src/game/cooking.js')
  assert.equal(F.BENCH_SLOTS, 10)
  const wr = RECIPES.find((r) => r.inputs.length >= 2)
  const inv = Object.fromEntries(wr.inputs.map(([id, n]) => [id, n * 3]))
  const p = { inventory: inv }
  // 정확히 맞으면 1개
  const one = F.benchCraft(p, wr.inputs.map(([id, n]) => ({ id, n })), 'workshop')
  assert.ok(!one.error, one.error)
  assert.equal(one.failed, false)
  assert.equal(one.player.inventory[wr.result], (inv[wr.result] || 0) + 1)
  // 같은 물건을 여러 칸에 나눠 올려도 합쳐서 본다 · 딱 2배면 2개
  const split = wr.inputs.flatMap(([id, n]) => [{ id, n }, { id, n }])
  const two = F.benchCraft(p, split, 'workshop')
  assert.equal(two.qty, 2)
  // 맞지 않는 조합 → 쓰레기, 재료는 사라진다
  const [a0] = wr.inputs[0]
  const bad = F.benchCraft(p, [{ id: a0, n: 1 }], 'workshop')
  assert.equal(bad.failed, true)
  assert.equal(bad.item.id, 'trash')
  assert.equal(bad.player.inventory.trash, 1)
  assert.equal(bad.player.inventory[a0], inv[a0] - 1)
  // 조리실 실패작은 숯
  const cr = COOK_RECIPES[0]
  const pk = { inventory: Object.fromEntries(cr.inputs.map(([id, n]) => [id, n * 2])) }
  assert.equal(F.benchCraft(pk, cr.inputs.map(([id, n]) => ({ id, n })), 'kitchen').item.id, cr.result)
  const ck = F.benchCraft(pk, [{ id: cr.inputs[0][0], n: 1 }], 'kitchen')
  assert.equal(ck.item.id, 'charcoal')
  // 가진 것보다 많이 올리면 안 된다
  assert.match(F.benchCraft(p, [{ id: a0, n: 999 }], 'workshop').error, /모자란다/)
  assert.match(F.benchCraft(p, [], 'workshop').error, /비어 있다/)
  // 미리 보기
  assert.equal(F.benchPreview([{ id: a0, n: 1 }], 'workshop').fail, true)
  assert.equal(F.benchPreview(wr.inputs.map(([id, n]) => ({ id, n })), 'workshop').recipe.id, wr.id)
  // 숯은 이제 효과 없는 재료, 쓰레기는 새 재료(아이콘 포함)
  assert.equal(itemOf('charcoal').kind, 'material')
  assert.deepEqual(itemOf('charcoal').effect, {})
  assert.equal(itemOf('trash').name, '쓰레기')
  assert.match(read('../src/components/iconsB17.jsx'), /trash: \{ bg: 'sand'/)
  // UI 연결
  const bench = read('../src/components/CraftBench.jsx')
  assert.match(bench, /onDrop=/)
  assert.match(bench, /draggable=\{can > 0\}/)
  const book = read('../src/components/RecipeBook.jsx')
  assert.match(book, /만들 수 있는 제작만 보기/)
  assert.match(book, /localeCompare\(itemOf\(b\.r\.result\)\?\.name \?\? '', 'ko'\)/)
  for (const f of ['../src/components/locations/Workshop.jsx', '../src/components/locations/Cooking.jsx']) {
    const src = read(f)
    assert.match(src, /\['bench', '제작'\], \['book', '제작법 보기'\]/)
    assert.match(src, /<CraftBench /)
  }
  assert.match(read('../src/Game.jsx'), /onBench=\{benchCraftAct\}/)
  // NPC 초상화 도트 효과 끔
  assert.match(read('../src/index.css'), /img\.npc-portrait, \[data-npc\] img \{ image-rendering: auto !important; \}/)
  assert.match(read('../src/components/NpcDialog.jsx'), /className="npc-portrait /)
})

test('B18 아는 제작법대로 만들기: 지금 만들 수 있고 · 한 번 만들어 본 제작법만, N개치', async () => {
  const F = await import('../src/game/freeCraft.js')
  const { RECIPES } = await import('../src/game/crafting.js')
  const [r1, r2] = RECIPES.filter((r) => r.inputs.length >= 2).slice(0, 2)
  const inv = {}
  for (const r of [r1, r2]) for (const [id, n] of r.inputs) inv[id] = (inv[id] || 0) + n * 3
  let p = { inventory: inv }
  assert.equal(F.knownMakeable(p, 'workshop').length, 0, '만들어 본 적이 없으면 비어 있다')
  assert.match(F.knownCraft(p, 'workshop', r1.id, 1).error, /만들어 본 적 없는/)
  // 제작 칸에서 한 번 만들면 기록된다(게임에서는 benchCraftAct 가 markMade)
  const once = F.benchCraft(p, r1.inputs.map(([id, n]) => ({ id, n })), 'workshop')
  p = F.markMade(once.player, once.recipe.id)
  assert.ok(F.madeBefore(p, r1.id))
  const list = F.knownMakeable(p, 'workshop')
  assert.deepEqual(list.map((r) => r.id), [r1.id], '교집합: 만들어 봤고 지금 만들 수 있는 것만')
  const max = F.maxQtyFor(p, r1)
  assert.ok(max >= 1)
  const made = F.knownCraft(p, 'workshop', r1.id, max)
  assert.ok(!made.error, made.error)
  assert.equal(made.qty, max)
  assert.equal(F.knownMakeable(made.player, 'workshop').length, 0, '재료가 떨어지면 목록에서 빠진다')
  assert.match(F.knownCraft(made.player, 'workshop', r1.id, 1).error, /모자란다/)
  // 연결
  const game = read('../src/Game.jsx')
  assert.match(game, /onKnownCraft=\{knownCraftAct\}/)
  assert.match(game, /markMade\(bumpDaily\(bumpWeekly\(r\.player, 'craft'\), 'craft'\), r\.recipe\?\.id\)/)
  const bench = read('../src/components/CraftBench.jsx')
  assert.match(bench, /아는 \{place === 'kitchen' \? '요리법' : '제작법'\}대로 만들기/)
  assert.match(bench, /function KnownCraftModal/)
})
