import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveEntries, isOpenAt, splitWinLose, visibleChoices, withName, findNode, dayKey } from '../src/game/scene.js'
import { FLOORS, HAENIM_CHOICES, MAINHALL_SPOT_KEYS, scriptOfDay } from '../src/game/explore.js'
import { ANNEX_FLOORS } from '../src/game/annex.js'
import { HIKE_PATHS, GOBLIN_GAMES, HIKE_SPOT_IDS } from '../src/game/hike.js'
import { SHRINE_AREAS, SHRINE_SIGN_INSIGHT, canReadSign, shrineOpen, SIGN_READ } from '../src/game/shrineExplore.js'
import * as X from '../src/game/exploreActions.js'
import * as I from '../src/game/items.js'
import { LOST_THINGS } from '../src/game/travelEvents.js'
import { sellPriceOf } from '../src/game/sell.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const fixed = (v) => () => v
const seqRng = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)] }
const noon = new Date(2026, 10, 7, 12, 0, 0).getTime()
const night = new Date(2026, 10, 7, 23, 0, 0).getTime()
const floor = (id) => FLOORS.find((f) => f.id === id)
const area = (f, id) => floor(f).areas.find((a) => a.id === id)
const room = (f, id) => ANNEX_FLOORS.find((x) => x.id === f).rooms.find((r) => r.id === id)
const spot = (pathId, id, branchId) => {
  const p = HIKE_PATHS.find((x) => x.id === pathId)
  return (branchId ? p.branches.find((b) => b.id === branchId).spots : p.spots).find((s) => s.id === id)
}
const shrineArea = (id) => SHRINE_AREAS.find((a) => a.id === id)

// ───────── 장면 규칙 ─────────
test('v-B.07 장면: 기본 문구는 하루 하나, 10% 문구는 볼 때마다 굴려 대신 나오고, 조건 문구는 붙거나 대신한다', () => {
  const entries = ['가', '나', { chance: 10, text: '드물다' }, { when: { insight: [10, null] }, mode: 'append', text: '붙는다' }]
  const a = resolveEntries(entries, { insight: 0 }, 's', noon, fixed(0.5))
  assert.equal(a.length, 1); assert.ok(['가', '나'].includes(a[0]))
  assert.deepEqual(resolveEntries(entries, { insight: 0 }, 's', noon, fixed(0.5)), a, '같은 날엔 같은 문구')
  assert.deepEqual(resolveEntries(entries, { insight: 0 }, 's', noon, fixed(0.05)), ['드물다'], '10% 안쪽이면 드문 문구')
  assert.deepEqual(resolveEntries(entries, { insight: 12 }, 's', noon, fixed(0.5)), [a[0], '붙는다'])
  assert.deepEqual(resolveEntries(['기본', { when: { insight: [10, null] }, mode: 'replace', text: '대신' }], { insight: 10 }, 's', noon), ['대신'])
  assert.equal(withName('“안녕하세요, OO 학생?”', '세원'), '“안녕하세요, 세원 학생?”')
  assert.equal(dayKey(noon), '2026-11-07')
})

test('v-B.07 장면: 밤 시간 판정(18시~6시), 승리/패배 글 나누기', () => {
  const n = { from: 18, to: 6 }
  assert.equal(isOpenAt(n, noon), false)
  assert.equal(isOpenAt(n, night), true)
  assert.equal(isOpenAt(n, new Date(2026, 10, 7, 5, 59).getTime()), true)
  assert.equal(isOpenAt(n, new Date(2026, 10, 7, 6, 0).getTime()), false)
  const { win, lose } = splitWinLose(GOBLIN_GAMES[0].result)
  assert.match(win, /^당신은 힘껏 커다란 장롱을 넘겼다/)
  assert.match(lose, /^당신은 장롱에게 가볍게 넘겨졌다/)
})

// ───────── 본관 탐사 ─────────
test('v-B.07 본관: 문헌보관소 안내수칙 — 스탯마다 글이 붙고, 호전·안목 15 이상이면 5 / 10분 선택지가 열린다', () => {
  const rules = findNode(area('b1', 'archiveB'), 'rules')
  assert.equal(resolveEntries(rules.text, {}, 'x', noon).length, 1)
  assert.equal(resolveEntries(rules.text, { aggression: 15, insight: 15, control: 20, comprehension: 15 }, 'x', noon).length, 5)
  assert.match(rules.text[0], /0번 항목이 보이지 않고/)
  assert.deepEqual(visibleChoices(rules, { aggression: 14, insight: 14 }), [])
  assert.deepEqual(visibleChoices(rules, { aggression: 15 }).map((c) => c.id), ['force'])
  assert.deepEqual(visibleChoices(rules, { insight: 15 }).map((c) => c.id), ['analyze'])
  for (const id of ['force', 'analyze']) {
    const c = findNode(rules, id)
    assert.deepEqual(c.cost, { mp: 5, wait: 10 })
    assert.match(c.result, /보관소 앞에 쓰러진 채로/)
  }
})

test('v-B.07 본관: 비품실 안내사항은 누르면 이어서 타이핑되고, 끝나면 본관 첫 화면으로', () => {
  const n = findNode(area('b1', 'supply'), 'notice')
  assert.match(n.text[0], /비품실에 있는 모든 물건들이 $/)
  assert.match(n.typeAfter, /^초상났네초상났어/)
  assert.match(n.typeAfter, /바로그소리$/)
  assert.equal(n.end, 'home')
})

test('v-B.07 본관: 로비·상장·문헌보관소(1층)·2층·3층이 시트대로 들어가 있다', () => {
  assert.deepEqual(floor('f1').areas.map((a) => a.id), ['lobby', 'principal', 'awards', 'archiveG'])
  assert.deepEqual(area('f1', 'lobby').choices.map((c) => c.id), ['woodDoor', 'shrine', 'calm'])
  const calm = findNode(area('f1', 'lobby'), 'calm')
  assert.equal(resolveEntries(calm.text, { insight: 10, aggression: 10 }, 'x', noon).length, 2, '안목 10 → 대신, 호전 10 → 붙는다')
  assert.doesNotMatch(calm.text[0], /정보 해금/, '시트의 메모 문구는 빼고')
  const open = findNode(area('f1', 'awards'), 'awardOpen')
  assert.match(open.text[0], /\[헌정 페어\] 초록동색 - Terrarium/)
  assert.equal(open.choices[0].name, '상장을 닫는다.')
  assert.deepEqual(floor('f2').areas.map((a) => a.id), ['av', 'beasts', 'staff', 'nurse', 'meditation'])
  assert.deepEqual(floor('f3').areas.map((a) => a.id), ['class1', 'class2', 'class3', 'locker1', 'locker2', 'locker3', 'storage'])
  for (const g of [1, 2, 3]) {
    const rec = findNode(area('f3', `class${g}`), `records${g}`)
    assert.equal(rec.widget, 'students'); assert.equal(rec.grade, g)
    assert.equal(rec.text[0], `등록되어 있는 ${g}학년 학생 전원의 명단이 보인다.`)
    assert.equal(area('f3', `locker${g}`).widget, 'locker')
  }
  assert.ok(MAINHALL_SPOT_KEYS.includes('mainHall:b1:rules'))
  assert.match(scriptOfDay('f1', 'principal', noon)[0], /^교장실의 문은 반쯤 열려있으나/)
})

test('v-B.07 본관: 양호실의 해님 — 인사 1 · 다시 말 걸기 3 · 조언 12, OO 에는 이름', () => {
  const nurse = area('f2', 'nurse')
  assert.equal(nurse.widget, 'gotoInfirmary')
  assert.deepEqual(HAENIM_CHOICES.map((c) => c.lines.length), [1, 3, 12])
  assert.equal(nurse.choices, HAENIM_CHOICES)
  assert.match(HAENIM_CHOICES[0].lines[0].text, /OO 학생/)
  assert.equal(HAENIM_CHOICES[0].npc.name, '해님')
  assert.match(read('../src/components/locations/Infirmary.jsx'), /view === 'haenim'/)
  assert.match(read('../src/game/activities.js'), /\{ id: 'haenim', label: '해님과 대화', icon: MessageCircle \}/)
})

// ───────── 별관 탐사 ─────────
test('v-B.07 별관: 서적실 10% 문구, 자료실 창록고·검은 안개, 아비규환은 흔들리고 누르면 자료실 처음으로', () => {
  const books = room('f3', 'books')
  assert.deepEqual(books.text.filter((e) => typeof e === 'object'), [{ chance: 10, text: '**책 에 서 당 장 손 떼**' }])
  const archive = room('f3', 'archive')
  assert.deepEqual(archive.choices.map((c) => c.id), ['changnok', 'fog'])
  assert.deepEqual(findNode(archive, 'changnok').choices.map((c) => c.name), ['연혁', '교칙', '배치'])
  const ch4 = findNode(archive, 'fogCh4')
  assert.equal(ch4.fx, 'jitter'); assert.equal(ch4.clickExit, true); assert.equal(ch4.end, 'root')
  assert.ok(findNode(archive, 'fogPreface').choices.includes(ch4), '서문을 읽은 뒤에 4장으로')
  for (const id of ['garden', 'plaza']) assert.ok(room('roof', id).text.some((e) => e.chance === 10), id)
  assert.match(ANNEX_FLOORS.find((f) => f.id === 'roof').intro[0], /옥상이 잠겨 있지 않다/)
  assert.equal(room('f2', 'craft').club, 'craft', '동아리 부실은 그대로')
  assert.match(read('../src/components/locations/Annex.jsx'), /<Scene key=\{`\$\{room\.id\}:\$\{visit\}`\}/)
})

// ───────── 산 탐사 ─────────
test('v-B.07 산 탐사: 이름이 바뀌고, 장소마다 글·선택지가 붙는다', () => {
  assert.match(read('../src/game/activities.js'), /\{ id: 'hike', label: '산 탐사', icon: Mountain \}/)
  assert.match(read('../src/components/locations/Hike.jsx'), /<h2 className="font-serif text-2xl text-gold">산 탐사<\/h2>/)
  assert.deepEqual(spot('left', 'armory').choices.map((c) => c.widget), ['armoryTalk', 'armoryManage'])
  assert.deepEqual(spot('left', 'garden').choices.map((c) => c.widget), ['seedShop', 'greenhouse'])
  assert.equal(findNode(spot('left', 'beastGround'), 'beastKeep').notice, '아직 만들어지지 않은 시스템')
  assert.equal(findNode(spot('center', 'peak', 'climb'), 'meditate').notice, '[아직 메인 스토리가 시작되지 않았습니다]')
  assert.match(HIKE_PATHS.find((p) => p.id === 'center').branches.find((b) => b.id === 'loop').text[0], /속세로 돌아갈 수 있다/)
  assert.equal(spot('center', 'extraBattle', 'loop').widget, 'extraBattle')
  const bari = findNode(spot('right', 'campsite'), 'campBari')
  assert.deepEqual(bari.night, { from: 18, to: 6, closed: '바리가 다른 곳에 있다.' })
  assert.equal(bari.choices[0].name, '도깨비 퀘스트')
  assert.equal(HIKE_PATHS.find((p) => p.id === 'yard').text.length, 2)
  assert.ok(HIKE_SPOT_IDS.includes('gym:left:goblinFarm'))
  const hike = read('../src/components/locations/Hike.jsx')
  assert.match(hike, /part="talk"/); assert.match(hike, /part="manage"/); assert.match(hike, /part="shop"/); assert.match(hike, /part="greenhouse"/)
  assert.match(read('../src/components/locations/Armory.jsx'), /\{part !== 'manage' && \(/)
  assert.match(read('../src/components/locations/Garden.jsx'), /useState\(part \?\? null\)/)
})

test('v-B.07 도깨비들과 놀아주기: 6가지 놀이 · 승리 확률 (1d30+스탯)% · 10분 또는 의지력 5', () => {
  assert.deepEqual(GOBLIN_GAMES.map((g) => [g.name, g.stat]), [['씨름', 'aggression'], ['끝말잇기', 'aggression'], ['술래잡기', 'agility'], ['숨바꼭질', 'insight'], ['공기놀이', 'control'], ['윷놀이', 'endurance']])
  const play = findNode(spot('left', 'goblinFarm'), 'goblinPlay')
  for (const c of play.choices) {
    assert.deepEqual(c.cost, { mp: 5, wait: 10 }); assert.equal(c.quickLabel, '빠른 놀이'); assert.equal(c.action.kind, 'goblinPlay')
  }
  // d30 = 30 (rng .99), 스탯 20 → 50%. d100 = 50 → 승리, 51 → 패배
  const p = { inventory: {} }
  const win = X.goblinPlay(p, { stat: 'aggression' }, { aggression: 20 }, noon, seqRng(0.99, 0.49))
  assert.equal(win.chance, 50); assert.equal(win.roll, 50); assert.equal(win.win, true)
  assert.equal(win.player.inventory['goblin-token'], 1); assert.equal(win.player.goblinTokenDay, '2026-11-07')
  const lose = X.goblinPlay(p, { stat: 'aggression' }, { aggression: 20 }, noon, seqRng(0.99, 0.5))
  assert.equal(lose.win, false); assert.equal(lose.player, p)
  const again = X.goblinPlay(win.player, { stat: 'aggression' }, { aggression: 20 }, noon, seqRng(0.99, 0))
  assert.equal(again.win, true); assert.equal(again.player.inventory['goblin-token'], 1, '증표는 하루 한 번')
  assert.match(again.notice, /이미 받았다/)
  const nextDay = X.goblinPlay(win.player, { stat: 'aggression' }, { aggression: 20 }, noon + 86400000, seqRng(0.99, 0))
  assert.equal(nextDay.player.inventory['goblin-token'], 2, '다음 날엔 또 받는다')
})

test('v-B.07 대기형 선택지: 10분을 기다리거나 의지력 5를 쓴다', () => {
  const p = { mp: 4, exploreWaits: {} }
  const w = X.startWait(p, 'k', 10, noon)
  assert.equal(w.player.exploreWaits.k, noon + 600000)
  assert.ok(X.startWait(w.player, 'k', 10, noon).error, '이미 기다리는 중')
  assert.match(X.claimWait(w.player, 'k', noon + 599000).error, /아직/)
  assert.equal(X.claimWait(w.player, 'k', noon + 600000).player.exploreWaits.k, undefined)
  assert.match(X.spendMp(p, 5).error, /의지력이 모자란다/)
  assert.equal(X.spendMp({ mp: 9 }, 5).player.mp, 4)
})

test('v-B.07 볍씨 주머니 열기: 주머니 o개 → o d o 개의 볍씨 (3개면 3d3)', () => {
  const p = { inventory: { 'rice-seeds': 3 } }
  const lo = X.openRicePouches(p, fixed(0))
  assert.equal(lo.grains, 3); assert.equal(lo.player.inventory['rice-seeds'], undefined); assert.equal(lo.player.inventory['rice-grain'], 3)
  assert.equal(X.openRicePouches(p, fixed(0.99)).grains, 9)
  assert.equal(X.openRicePouches({ inventory: { 'rice-seeds': 1 } }, fixed(0.99)).grains, 1, '1개면 1d1')
  assert.ok(X.openRicePouches({ inventory: {} }).error)
  assert.equal(X.ricePouchText(3, 7), '볍씨 주머니 3개 에서 7개의 볍씨가 나왔다!')
})

// ───────── 사당 ─────────
test('v-B.07 사당 표지판: 안목 20 이상이면 읽히고, 읽은 뒤부터 [사당 탐사]가 열린다', () => {
  assert.equal(SHRINE_SIGN_INSIGHT, 20)
  assert.equal(canReadSign({ insight: 19 }), false)
  assert.equal(canReadSign({ insight: 20 }), true)
  const r0 = X.readShrineSign({}, { insight: 19 })
  assert.equal(r0.read, false); assert.equal(shrineOpen(r0.player), false)
  const r1 = X.readShrineSign({}, { insight: 20 })
  assert.equal(r1.first, true); assert.equal(shrineOpen(r1.player), true)
  assert.equal(X.readShrineSign(r1.player, { insight: 20 }).first, false)
  assert.match(SIGN_READ, /혀를 차는 소리/)
  assert.match(read('../src/game/activities.js'), /\{ id: 'explore', label: '사당 탐사', icon: Compass, unlock: 'shrine' \}/)
  assert.match(read('../src/components/ActivityBar.jsx'), /filter\(\(a\) => !a\.unlock \|\| unlocks\[a\.unlock\]\)/)
  assert.match(read('../src/Game.jsx'), /unlocks=\{\{ shrine: !!player\.shrineSignRead \}\}/)
})

test('v-B.07 사당 탐사: 문전 · 내당 · 뒤뜰 · 봉인각, 신위전은 순서대로 · 이시는 양호실로', () => {
  assert.deepEqual(SHRINE_AREAS.map((a) => a.name), ['문전', '내당', '뒤뜰', '봉인각'])
  assert.deepEqual(shrineArea('gate').choices.map((c) => c.name), ['홍살문', '금줄길', '돌수호상', '정화수터'])
  const tablet = findNode(shrineArea('inner'), 'tabletHall')
  assert.deepEqual(visibleChoices(tablet, { aggression: 10 }).map((c) => c.id), ['liftTimid'])
  assert.deepEqual(visibleChoices(tablet, { aggression: 20 }).map((c) => c.id), ['liftTimid', 'liftBold'])
  assert.deepEqual(visibleChoices(tablet, { aggression: 30 }).map((c) => c.id), ['liftBold'])
  const bold = findNode(tablet, 'liftBold')
  assert.equal(bold.seq.length, 4); assert.equal(bold.seq[1], '*너*'); assert.equal(bold.end, 'home')
  assert.match(findNode(shrineArea('backyard'), 'vesselStore').text[0], /~~◆■~~의 책임을 물음/)
  assert.deepEqual(findNode(shrineArea('backyard'), 'throwStone').seq.length, 2)
  const ishi = findNode(shrineArea('sealHall'), 'ishiTalk')
  assert.equal(ishi.seq.length, 3); assert.deepEqual(ishi.end, { goto: 'infirmary' }); assert.equal(ishi.npc.name, '이시')
})

// ───────── 열쇠 · 보관함 · 학생기록부 ─────────
test('v-B.07 누군가가 잃어버린 열쇠: 이동 중 분실물로 줍고, 지니고 있으면 다른 학년 보관함을 몰래 연다', () => {
  const key = I.itemOf('lost-key')
  assert.equal(key.name, '누군가가 잃어버린 열쇠')
  assert.ok(LOST_THINGS.includes('lost-key'))
  assert.equal(sellPriceOf('lost-key'), null)
  assert.match(I.canUseItem(key, { countNow: 1 }).why, /몰래 열어보기/)
  assert.equal(X.hasLostKey({ inventory: { 'lost-key': 1 } }), true)
  assert.equal(X.hasLostKey({ inventory: {} }), false)
  const w = read('../src/components/ExploreWidgets.jsx')
  assert.match(w, /몰래 열어보기/); assert.match(w, /LOCKED_TEXT/)
  assert.match(read('../src/components/ItemIcon.jsx'), /B07_ICONS/)
})

test('v-B.07 학생기록부: 서버가 그 학년 학생 이름을 돌려준다', () => {
  const server = read('../server/index.js')
  assert.match(server, /route === '\/api\/students'/)
  assert.match(server, /gradeOfCard\(c\) === grade/)
  assert.match(read('../src/net/online.js'), /fetchStudents = \(grade\) => post\('\/api\/students', \{ grade \}\)/)
})

test('v-B.07 장면 화면: 흔들림 · 타이핑 · 순서대로 · 대기 상자', () => {
  const scene = read('../src/components/Scene.jsx')
  assert.match(scene, /scene-jitter/); assert.match(scene, /data-typewriter/); assert.match(scene, /data-scene-seq/); assert.match(scene, /data-cost-box/)
  assert.match(read('../src/index.css'), /@keyframes scene-jitter/)
  assert.match(read('../src/Game.jsx'), /const exploreAct = \(kind, payload = \{\}\) =>/)
})

// ───────── 해님 초상화 · 글자 연출 · 명조체 ─────────
test('v-B.07 해님 초상화: 기본 · 웃음 · 놀람, 대사마다 표정이 붙는다', async () => {
  const { HAENIM, HAENIM_AGAIN, HAENIM_ADVICE, HAENIM_GREETING } = await import('../src/game/explore.js')
  const { existsSync } = await import('node:fs')
  assert.deepEqual(Object.keys(HAENIM.faces), ['plain', 'smile', 'surprise'])
  for (const src of Object.values(HAENIM.faces)) assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), src)
  assert.equal(HAENIM_GREETING.face, 'smile')
  for (const l of [...HAENIM_AGAIN, ...HAENIM_ADVICE]) assert.ok(['plain', 'smile', 'surprise'].includes(l.face))
  assert.equal(HAENIM_AGAIN[2].face, 'surprise', '바리를 만났냐는 말은 놀란 얼굴')
  const scene = read('../src/components/Scene.jsx')
  assert.match(scene, /src=\{faceSrc\(node\.npc, paras\.face\)\}/)
})

test('v-B.07 글자 연출: 시트의 굵게·기울임 + 예전에 넣어 둔 단서 표시', () => {
  const all = JSON.stringify([FLOORS, ANNEX_FLOORS, HIKE_PATHS, SHRINE_AREAS])
  // 시트에서 굵은 곳
  assert.match(floor('f1').intro[0], /\*\*로비\*\*.*\*\*긴장이 풀리는 기분\*\*/)
  assert.match(area('f1', 'lobby').text[0], /\*\*나무문\*\*.*\*\*사당\*\*.*\*\*교장실, 상장 거치대, 문헌보관소\*\*/)
  assert.match(findNode(room('f3', 'archive'), 'rules').text[0], /8항\. \*\*검은 안개\*\*와/)
  // 시트에서 굵은+기울임 / 기울임인 곳
  const ch4 = findNode(room('f3', 'archive'), 'fogCh4')
  assert.match(ch4.name, /^\*\*\*\[검은안개/); assert.match(ch4.text[0], /^\*방울소리가[^*]+\*$/)
  assert.match(spot('center', 'tomb', 'climb').text[0], /\*헤집어라\. [^*]+네가 \*\*\*\*너\*\*\*\*라는 사실을 망자들에게 들키지 말라\.\*/)
  assert.match(findNode(shrineArea('backyard'), 'vesselStore').text[0], /반납 \*\*\*실패\*\*\* 시 ~~◆■~~의/)
  const notice = findNode(area('b1', 'supply'), 'notice')
  assert.equal(notice.typeBold, true); assert.equal(notice.typeItalic, true)
  // 예전에 넣어 둔 굵게·기울임(단서 표시)도 그대로 둔다
  assert.match(floor('b1').intro[0], /\*\*문헌보관소\*\*, \*\*비품실\*\*.*\*\*거대한 문\*\*/)
  assert.match(area('b1', 'archiveB').text[0], /\*\*금줄과 흰 천\*\*.*\*\*안내 수칙\*\*/)
  assert.match(floor('roof').intro[0], /\*검은 안개\*/)
  assert.match(findNode(area('f1', 'lobby'), 'shrine').text.at(-1).text, /\*아직은 어리구나 아해야\. 더 자라나 돌아오도록 하렴….\*/)
  assert.ok(all.includes('**목조 조각상**'))
  const scene = read('../src/components/Scene.jsx')
  assert.match(scene, /\*\*승리 :\*\* \$\{win\}/)
})

test('v-B.07 굵게·기울임 글자만 명조체(조선일보명조), 나머지 글은 화면 글꼴 그대로', () => {
  const css = read('../src/index.css')
  assert.match(css, /font-family: 'ChosunNm'/)
  assert.match(css, /\.script-myeongjo, \.script-myeongjo \* \{\n  font-family: 'ChosunNm', 'ChosunilboNM', 'Noto Serif KR'[^;]+!important;/)
  const scene = read('../src/components/Scene.jsx')
  assert.match(scene, /className=\{`\$\{SCRIPT_FONT\} font-bold italic`\} data-rich="bi"/)
  assert.match(scene, /className=\{`\$\{SCRIPT_FONT\} font-bold`\} data-rich="b"/)
  assert.match(scene, /className=\{`\$\{SCRIPT_FONT\} italic`\} data-rich="i"/)
  assert.doesNotMatch(scene, /\$\{SCRIPT_FONT\} whitespace-pre-line/, '문단 전체는 명조로 바꾸지 않는다')
  assert.doesNotMatch(read('../src/components/LocationIntro.jsx'), /script-myeongjo/)
})
