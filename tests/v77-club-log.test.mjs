import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { appendActivityLog, appendActivityLogs, latestActivityLog, normalizeActivityLogs } from '../src/game/activityLogs.js'

const source = readFileSync(new URL('../src/game/clubQuests.js', import.meta.url), 'utf8')
// 동아리 퀘스트 모듈은 clampSpirit 외에 외부 의존성이 없으므로 원본 소스를 메모리로 평가한다.
const questCode = source.replace("import { clampSpirit } from './constants'", 'const clampSpirit = (p) => p')
const quests = await import(`data:text/javascript;base64,${Buffer.from(questCode).toString('base64')}`)
const { dayStartOf, weekStartOf, bumpDaily, bumpWeekly, ensureDaily, ensureWeekly, CLUB_QUESTS, DAILY_QUESTS } = quests

const utc = (s) => Date.parse(`${s}Z`)

test('일일 동아리 퀘스트는 KST 매일 0시에 초기화되고 낮 12시에는 유지된다', () => {
  const before = utc('2026-10-29T14:59:59.999') // 23:59:59.999 KST
  const after = utc('2026-10-29T15:00:00.000')  // 다음날 00:00 KST
  assert.equal(dayStartOf(before), utc('2026-10-28T15:00:00'))
  assert.equal(dayStartOf(after), utc('2026-10-29T15:00:00'))
  let p = bumpDaily({}, 'lesson', 2, before)
  assert.equal(ensureDaily(p, utc('2026-10-29T03:30:00')).daily.lesson, 2) // 이미 지나간 정오에도 초기화 X
  p = bumpDaily(p, 'lesson', 1, after)
  assert.equal(p.daily.lesson, 1)
  assert.equal(p.daily.dayStart, dayStartOf(after))
  assert.deepEqual(p.daily.claimed, {})
})

test('주간 동아리 퀘스트는 KST 월요일 0시에만 초기화된다', () => {
  const sunday = utc('2026-11-01T14:59:59.999') // KST 일요일 23:59:59
  const monday = utc('2026-11-01T15:00:00') // KST 월요일 00:00:00
  assert.equal(weekStartOf(sunday), utc('2026-10-25T15:00:00'))
  assert.equal(weekStartOf(monday), monday)
  let p = bumpWeekly({}, 'lesson', 10, sunday)
  p = bumpWeekly(p, 'lesson', 1, monday)
  assert.equal(p.weekly.lesson, 1)
  assert.equal(p.weekly.weekStart, monday)
  assert.deepEqual(p.weekly.claimed, {})
  assert.equal(ensureWeekly(p, monday + 24 * 3600000).weekly.lesson, 1)
})

// 실제 progress.js의 수업 완료 본문을 발췌해, 직접 완료/대기 완료에서 호출하는 동일 로직을 검증한다.
const progress = readFileSync(new URL('../src/game/progress.js', import.meta.url), 'utf8')
const match = progress.match(/export function completeLesson\(player, courseId, now = Date\.now\(\)\) \{[\s\S]*?\n\}\n\n\/\*\* 시도 1회를/)
assert.ok(match, '실제 수업 완료 로직을 찾을 수 있어야 한다')
const completeLesson = new Function('lessonOf', 'courseTitle', 'setLesson', 'bumpDaily', 'bumpWeekly', 'clampSpirit', 'LESSON_SPIRIT_REWARD',
  `${match[0].slice(0, match[0].indexOf('\n\n/** 시도 1회를')).replace('export function', 'function')}\nreturn completeLesson`)(
  (p, id) => p.lessons?.[id] ?? { done: false },
  (id) => id,
  (p, id, st) => ({ ...p, lessons: { ...p.lessons, [id]: st } }),
  bumpDaily,
  bumpWeekly,
  (p) => p,
  5,
)

test('본관 수업을 직접 완료하면 주간·일간 카운터가 정확히 1 증가하고 재완료는 증가하지 않는다', () => {
  const now = utc('2026-10-29T05:10:00')
  const initial = { spirit: 0, lessons: {}, cleared: {} }
  const first = completeLesson(initial, 'spell-typing', now)
  assert.equal(first.player.weekly.lesson, 1)
  assert.equal(first.player.daily.lesson, 1)
  assert.equal(first.player.spirit, 5)
  assert.equal(first.logs.length, 1)
  const again = completeLesson(first.player, 'spell-typing', now + 1000)
  assert.equal(again.player, first.player, '같은 수업 중복 카운팅 방지')
  assert.equal(again.logs.length, 0)
  const another = completeLesson(first.player, 'talisman-2048', now + 2000)
  assert.equal(another.player.weekly.lesson, 2)
  assert.equal(another.player.daily.lesson, 2)
})

test('점복학 수업도 완료 즉시 카운팅하고 퀘스트 진도에 반영한다', () => {
  const now = utc('2026-10-29T05:10:00')
  let p = { spirit: 0, lessons: {} }
  for (const id of ['divination-fortune', 'spell-typing', 'talisman-2048']) {
    p = completeLesson(p, id, now).player
  }
  assert.equal(p.lessons['divination-fortune'].pendingStat, true)
  assert.equal(p.weekly.lesson, 3)
  assert.equal(p.daily.lesson, 3)
  assert.equal(DAILY_QUESTS.find(q => q.id === 'd_lesson3').done(p.daily), true)
  assert.equal(CLUB_QUESTS.find(q => q.id === 'lesson10').progress(p.weekly)[0], 3)
  assert.match(progress, /const r = completeLesson\(p, id, st\.waitUntil\)\s*\n\s*p = r\.player/,
    '대기 수업은 completeLesson에서 이미 집계했으므로 중복 집계하지 않는다')
})

test('기존 저장 로그(최신 먼저)를 이전 기록부터 정렬하고 새 로그를 아래에 추가한다', () => {
  const old = [{ id: 3, message: '새로운' }, { id: 2, message: '중간' }, { id: 1, message: '오래된' }]
  const normalized = normalizeActivityLogs(old)
  assert.deepEqual(normalized.map(x => x.id), [1, 2, 3])
  const appended = appendActivityLog(normalized, { id: 4, message: '추가' })
  assert.equal(latestActivityLog(appended).id, 4)
  assert.deepEqual(appendActivityLogs(appended, [{ id: 5 }, { id: 6 }]).map(x => x.id), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(normalizeActivityLogs(appended).map(x => x.id), [1, 2, 3, 4])
  const capped = appendActivityLogs([1, 2, 3].map(id => ({ id })), [{ id: 4 }, { id: 5 }], 3)
  assert.deepEqual(capped.map(x => x.id), [3, 4, 5])
})

test('새 로그는 맨 뒤로 저장하며, 화면 갱신 중에는 강제 스크롤하지 않는다', () => {
  const game = readFileSync(new URL('../src/Game.jsx', import.meta.url), 'utf8')
  const chat = readFileSync(new URL('../src/components/ChatPanel.jsx', import.meta.url), 'utf8')
  const log = readFileSync(new URL('../src/components/LogView.jsx', import.meta.url), 'utf8')
  assert.match(game, /logsRef\.current\.slice\(-SAVE_LOG_CAP\)/)
  assert.match(game, /const latestLog = latestActivityLog\(logs\)/)
  assert.match(game, /normalizeActivityLogs\(initialSave\.logs\)/)
  assert.match(chat, /logs\?\.\[logs\.length - 1\]/)
  assert.match(chat, /\[isLog, open\]/, '활동 로그 자동 스크롤은 탭 입장 시 한 번만 실행')
  assert.match(log, /\}, \[\]\)/, '활동 로그 자동 스크롤은 처음 열릴 때 한 번만 실행')
  assert.match(log, /overflowAnchor: 'none'/)
})
