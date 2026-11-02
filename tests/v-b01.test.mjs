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
  assert.equal(UPDATE_NOTES.length, 1)
  assert.equal(UPDATE_NOTES[0].version, 'v-B.01')
  assert.ok(UPDATE_NOTES[0].items.length >= 8)
  assert.ok(UPDATE_NOTES.every((n) => !/^v\d/.test(n.version)), '예전 v숫자 버전 노트는 남아 있지 않다')
})
