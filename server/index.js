// 초록동색 온라인 서버: 채팅(연락/담화/일행) · 일행(파티) · 랭킹.
// 외부 패키지 없이 Node 내장 모듈만 쓴다. (Node 18+)
//  - 서버 → 클라이언트: SSE (GET /api/events)
//  - 클라이언트 → 서버: JSON POST
// 실행:  npm run build && npm start      (기본 포트 8787, PORT 환경변수로 변경)
// 개발:  npm run server  +  npm run dev  (vite 가 /api 를 이 서버로 프록시한다)

import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITEMS } from '../src/game/items.js'
import { STAT_KEYS } from '../src/game/constants.js'
import { ENEMIES, PSYCHICS } from '../src/game/battle.js'
import { SKINS } from '../src/game/skins2048.js'
import { SKINS_RUNNER } from '../src/game/skinsRunner.js'
import * as MB from '../src/game/mbattle.js'
import { kstDate, STORY_MAX } from '../src/game/meals.js'
import * as A from './accounts.js'
import { CLUB_IDS, CLUB_JOIN_LOCK_MS, CLUB_REJOIN_WAIT_MS } from '../src/game/clubs.js'
import { OMOK_SIZE, emptyBoard, placeStone } from '../src/game/omok.js'
import { START as YUT_START, branchOptions as yutBranchOptions, resumeWalk as yutResumeWalk, rollYut, walk as yutWalk } from '../src/game/yut.js'
import { FIRST_MELD_MIN, freshDeck as rummiFreshDeck, shuffle as rummiShuffle, validateMeld as rummiValidateMeld } from '../src/game/rummikub.js'
import { CATEGORIES as YACHT_CATEGORIES, isCategory as yachtIsCategory, isFull as yachtIsFull, MAX_ROLLS as YACHT_MAX_ROLLS, rollDice as yachtRollDice, scoreFor as yachtScoreFor, totalScore as yachtTotalScore } from '../src/game/yacht.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GIFT_MAX = 5
const PORT = Number(process.env.PORT) || 8787
const DIST = process.env.CHOROK_DIST ? path.resolve(process.env.CHOROK_DIST) : path.resolve(__dirname, '../dist')
const DATA_FILE = process.env.CHOROK_DATA || path.join(__dirname, 'data.json')
// 인적사항 카드(cards)는 따로 저장한다 — 프로필 사진(최대 250KB)이 들어 있어서 커질 수 있는데,
// 한 덩어리로 같이 저장하면 채팅 한 줄만 와도 카드 전체(모든 사람의 사진 포함)를 매번 다시 굳혀서 써야 한다.
// 1000명 규모로 접속자가 늘면 그 직렬화·디스크 쓰기 자체가 (짧게나마) 서버 전체를 멈추게 만들 수 있어 분리했다.
const CARDS_FILE = process.env.CHOROK_CARDS_DATA || path.join(__dirname, 'cards.json')
// 관리자: 환경변수 CHOROK_ADMIN_KEY 를 아는 계정만 관리자가 된다. (키가 없으면 관리자 기능은 꺼진다.)
//  - 접속할 때 키를 보내 서버가 확인하면 채팅에 [관리자] 직함이 붙는다.
//  - 관리자 계정은 마음대로 스탯을 조절하므로 랭킹에는 오르지 않는다.
const ADMIN_KEY = process.env.CHOROK_ADMIN_KEY || ''
const ADMIN_TITLE = '관리자'
let keyFails = [] // 틀린 키 시도 시각 (무차별 대입 방지: 10분에 20번을 넘으면 잠시 막는다)
const keyBlocked = () => (keyFails = keyFails.filter((t) => Date.now() - t < 600_000)).length >= 20
const adminOk = (key) => {
  if (!ADMIN_KEY || typeof key !== 'string' || !key || keyBlocked()) return false
  const ok = key.length === ADMIN_KEY.length && key === ADMIN_KEY
  if (!ok) keyFails.push(Date.now())
  return ok
}
const admins = new Set() // 키로 확인된 관리자 id (접속할 때마다 다시 채워진다)

const COURSES = ['talisman-2048', 'spell-typing', 'ward-tetris', 'folklore-spot', 'exorcism-space']
const HISTORY_MAX = 100
const TEXT_MAX = 200
const RATE_WINDOW_MS = 5000
const RATE_MAX = 6
const INVITE_TTL_MS = 60_000

// 벼룩시장: 누가 올렸는지는 손님에게 보이지 않는다. (판매자는 서버만 안다.) 팔린 대금은 판매자가 받아 갈 때까지 맡아 둔다.
const MARKET_MAX_PER_SELLER = 10
const MARKET_QTY_MAX = 99
const MARKET_PRICE_MAX = 99999
let cards = {} // 인적사항 카드: { [id]: { id, name, greeting, age, grade, avatar, at } }  (접속자 이름을 눌렀을 때 보여 준다)
const dirtyCards = new Set() // 마지막 저장 뒤 (다시) 바뀐 카드의 id — 이 사람들 것만 다음 저장 때 내보낸다
let legacyCardsRowCleared = false // 예전의 "전원분 한 덩어리" 카드 줄을 지웠는지 (DB 연결 뒤 saveCardsNow 에서 확정)
let cardsSaveTimer = null // scheduleCardsSave 가 부팅 중(마이그레이션)부터 바로 호출될 수 있어, 선언을 위로 올려 둔다
let members = {} // 회원 명부: { [id]: { id, name, firstSeen, lastSeen, visits } } — 서버에 접속한 적 있는 모든 계정
let stories = { pending: [], papers: {}, seq: 1 } // 익명 사연: pending [{id, text, at}] · papers { 'YYYY-MM-DD': [{ no, text, at }] } (그날의 교내 신문). 쓴 사람은 저장하지 않는다.
let clubs = Object.fromEntries(CLUB_IDS.map((id) => [id, { members: {} }])) // { [clubId]: { members: { [playerId]: {id,name,grade,age,hope,joinedAt} } } }
let clubOf = {} // playerId → 지금 속한 동아리 id (한 번에 하나)
let clubLeftAt = {} // playerId → 마지막으로 탈퇴한 시각(재가입 대기용)
let clubChat = Object.fromEntries(CLUB_IDS.map((id) => [id, []])) // { [clubId]: [메시지…] } (최근 400개)
const CLUB_CHAT_CAP = 400
let mail = { seq: 1, log: [] } // 쪽지 · 선물 내역: log [{ id, kind:'note'|'gift', from:{id,name}, to:{id,name}, text, items?, enh?, at, read }] (최신이 뒤). 관리자는 전부 열람.
const MAIL_MAX = 1000 // 쪽지 글자 수 상한
const MAIL_LOG_CAP = 5000
let market = { seq: 1, listings: [], proceeds: {} } // listings: [{ id, seller, item, qty, price(1개당), at }]
let bgmPlaylist = [] // 관리자가 등록한 배경음악(평소 곡) 재생목록: [{ id: 유튜브 영상ID, title }]. 비어 있으면 클라이언트가 기존 로컬 mp3를 쓴다.
const BGM_MAX = 30 // 재생목록 최대 곡 수
const isYoutubeId = (s) => typeof s === 'string' && /^[\w-]{10,20}$/.test(s)
// 연락(rp)·담화(talk) 채팅 내역과 일행(파티) 상태: 서버가 재시작돼도 사라지지 않도록 snapshot/applyRaw 에 함께 싣는다.
// (parties·partyOf 는 Map 이라 그대로는 저장할 수 없으니, parties 는 배열로 접었다 펴고 partyOf 는 그 배열에서 다시 만든다.)
const history = { rp: [], talk: [] }
const parties = new Map() // partyId → { id, members: [id], log: [] }
const partyOf = new Map() // playerId → partyId
let seq = 1 // 쪽지·선물·채팅·일행 id 에 함께 쓰는 전역 번호. 재시작해도 이어지도록 snapshot 에 싣는다.

// ───────── 영속 데이터(랭킹 · 벼룩시장 · 인적사항 카드 · 회원 명부 · 익명 사연) ─────────
// 저장 위치는 두 가지:
//  - 환경변수 DATABASE_URL 이 있으면 Supabase(Postgres)의 saves 테이블, id='server' 한 줄에 통째로 저장한다.
//    (Render 무료 플랜은 재시작 · 재배포 때 파일이 지워지므로 배포 서버에서는 반드시 이쪽을 쓴다.)
//  - 없으면 지금까지처럼 data.json 파일. (로컬 개발용)
// Supabase 테이블:  create table saves (id text primary key, data jsonb not null, updated_at timestamptz default now());
const DATABASE_URL = process.env.DATABASE_URL || ''
const DB_ROW_ID = 'server'
const DB_ROW_ID_CARDS = 'server-cards' // (예전 방식) 인적사항 카드 전원분을 한 덩어리로 담던 행 — 마이그레이션 읽기에만 쓴다
const CARD_ROW_PREFIX = 'card:' // (지금 방식) 사람별로 한 줄씩: `card:<id>`
let db = null // pg Pool (DATABASE_URL 이 있을 때만)
if (DATABASE_URL) {
  const { default: pg } = await import('pg')
  db = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 })
  db.on('error', (e) => console.error('DB 연결 오류:', e.message))
}

let ranking = Object.fromEntries(COURSES.map((c) => [c, {}])) // { course: { [playerId]: { id, name, score, at } } } — 이번 주(월요일 00시 KST 에 리셋)
// ───────── 주간 랭킹: 매주 월요일 오전 00시(한국 시간)에 리셋. 리셋 직전 기록 중 5위까지를 '지난주의 기록'으로 남긴다. ─────────
const KST_MS = 9 * 3600 * 1000
const DAY_MS = 24 * 3600 * 1000
const LAST_WEEK_TOP = 5
/** 이 시각이 속한 주의 시작(월요일 00:00 KST)의 UTC ms */
const weekStartOf = (now) => {
  const k = now + KST_MS // KST 벽시계를 UTC 필드처럼 다룬다
  const dow = new Date(k).getUTCDay() // 0=일
  const sinceMon = (dow + 6) % 7
  return Math.floor(k / DAY_MS) * DAY_MS - sinceMon * DAY_MS - KST_MS
}
const weekLabel = (start) => new Date(start + KST_MS).toISOString().slice(0, 10)
let rankingWeek = weekStartOf(Date.now()) // 지금 쌓이는 기록이 속한 주의 시작
let lastWeek = null // { start, end, top: { [course]: [{rank,id,name,score}] } }
/** 주가 바뀌었으면 지난주 5위까지를 남기고 이번 주를 비운다. 읽고 쓰기 전에 늘 부른다. */
function rollWeek(now = Date.now()) {
  const cur = weekStartOf(now)
  if (cur === rankingWeek) return false
  const prevWeek = cur - 7 * DAY_MS
  // 바로 지난주 기록일 때만 '지난주의 기록'이 된다. (서버가 오래 꺼져 있었다면 비어 있다.)
  lastWeek =
    rankingWeek === prevWeek
      ? { start: rankingWeek, end: cur, top: Object.fromEntries(COURSES.map((c) => [c, topOf(c, LAST_WEEK_TOP)])) }
      : { start: prevWeek, end: cur, top: Object.fromEntries(COURSES.map((c) => [c, []])) }
  ranking = Object.fromEntries(COURSES.map((c) => [c, {}]))
  rankingWeek = cur
  scheduleSave()
  return true
}
function applyRaw(raw) {
  if (Number.isFinite(raw?.rankingWeek)) rankingWeek = raw.rankingWeek
  if (raw?.lastWeek && typeof raw.lastWeek === 'object') lastWeek = raw.lastWeek
  for (const c of COURSES) if (raw?.ranking?.[c]) ranking[c] = raw.ranking[c]
  if (raw?.cards && typeof raw.cards === 'object') cards = raw.cards
  if (raw?.members && typeof raw.members === 'object') members = raw.members
  if (raw?.stories && Array.isArray(raw.stories.pending)) stories = { pending: raw.stories.pending, papers: raw.stories.papers ?? {}, seq: raw.stories.seq || 1 }
  if (raw?.mail && Array.isArray(raw.mail.log)) mail = { seq: raw.mail.seq || 1, log: raw.mail.log }
  if (raw?.clubs && typeof raw.clubs === 'object') for (const id of CLUB_IDS) if (raw.clubs[id]?.members) clubs[id] = { members: raw.clubs[id].members }
  if (raw?.clubOf && typeof raw.clubOf === 'object') clubOf = raw.clubOf
  if (raw?.clubLeftAt && typeof raw.clubLeftAt === 'object') clubLeftAt = raw.clubLeftAt
  if (raw?.clubChat && typeof raw.clubChat === 'object') for (const id of CLUB_IDS) if (Array.isArray(raw.clubChat[id])) clubChat[id] = raw.clubChat[id]
  if (raw?.market && Array.isArray(raw.market.listings)) market = { seq: raw.market.seq || 1, listings: raw.market.listings, proceeds: raw.market.proceeds ?? {} }
  if (Array.isArray(raw?.bgmPlaylist)) bgmPlaylist = raw.bgmPlaylist.filter((t) => isYoutubeId(t?.id)).slice(0, BGM_MAX)
  if (Number.isFinite(raw?.seq) && raw.seq > seq) seq = raw.seq
  if (raw?.history && typeof raw.history === 'object') {
    if (Array.isArray(raw.history.rp)) history.rp = raw.history.rp
    if (Array.isArray(raw.history.talk)) history.talk = raw.history.talk
  }
  if (Array.isArray(raw?.parties)) {
    for (const p of raw.parties) {
      if (!p?.id || !Array.isArray(p.members) || p.members.length < 1) continue
      parties.set(p.id, { id: p.id, members: [...p.members], log: Array.isArray(p.log) ? p.log : [] })
      for (const m of p.members) partyOf.set(m, p.id)
    }
  }
}
if (db) {
  // DB 를 못 읽었는데 빈 상태로 시작하면 다음 저장 때 기존 기록을 덮어쓰므로, 읽기에 실패하면 서버를 띄우지 않는다.
  try {
    const r = await db.query('select data from saves where id = $1', [DB_ROW_ID])
    if (r.rows[0]) applyRaw(r.rows[0].data)
    else {
      // DB 가 비어 있으면 data.json 이 남아 있을 경우 한 번 옮겨 온다. (로컬에서 쓰던 기록 이전용)
      try {
        applyRaw(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')))
        console.log('data.json 의 기록을 DB 로 옮깁니다.')
      } catch {
        /* 옮길 파일도 없으면 빈 상태로 시작 */
      }
    }
    console.log('저장소: Supabase(Postgres)')
  } catch (e) {
    console.error('DB 에서 기록을 불러오지 못했습니다. DATABASE_URL 과 saves 테이블을 확인하세요:', e.message)
    process.exit(1)
  }
} else {
  try {
    applyRaw(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')))
  } catch {
    /* 첫 실행이면 빈 랭킹으로 시작 */
  }
}
// 인적사항 카드: 메인 기록과 분리된 자리에서 따로 읽는다. (예전 data.json 에 같이 있었다면 위 applyRaw 가 이미 cards 를 채웠을 수 있는데, 여기서 더 최신 것이 있으면 덮어쓴다)
//  - DB 에서는 사람별로 한 줄씩(`card:<id>`) 저장한다. 한 사람이 카드(사진)를 고쳐도 그 사람 줄만 다시 쓰면 되게 하려는 것.
//    (예전엔 전원분을 한 덩어리(`DB_ROW_ID_CARDS`)로 저장해서, 한 명만 사진을 바꿔도 그때까지 쌓인 모든 사람의
//    사진을 통째로 다시 Supabase 로 내보내고 있었다 — egress 가 실제 사용량보다 훨씬 크게 찍힌 원인)
if (db) {
  try {
    const r = await db.query('select id, data from saves where id like $1', [CARD_ROW_PREFIX + '%'])
    if (r.rows.length) {
      for (const row of r.rows) {
        const pid = row.id.slice(CARD_ROW_PREFIX.length)
        if (pid && row.data) cards[pid] = row.data
      }
    } else {
      // 사람별 줄이 하나도 없으면(예전 버전에서 막 올라온 경우), 옛 방식의 한 덩어리 줄에서 딱 한 번만 옮겨 온다.
      const legacy = await db.query('select data from saves where id = $1', [DB_ROW_ID_CARDS])
      if (legacy.rows[0]?.data?.cards) {
        cards = legacy.rows[0].data.cards
        for (const pid of Object.keys(cards)) dirtyCards.add(pid) // 다음 저장 때 사람별 줄로 흩어 쓴다
        scheduleCardsSave() // 곧바로 한 번 흩어 쓰도록 예약 (함수 선언은 호이스팅되어 여기서도 쓸 수 있다)
        console.log(`인적사항 카드 ${Object.keys(cards).length}명분을 사람별 저장 방식으로 옮깁니다.`)
      }
    }
  } catch (e) {
    console.error('인적사항 카드를 DB 에서 불러오지 못했습니다:', e.message)
  }
} else {
  try {
    const raw = JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8'))
    if (raw?.cards && typeof raw.cards === 'object') cards = raw.cards
  } catch {
    /* 따로 저장된 파일이 아직 없으면(예전 버전) data.json 에 실려 있던 것을 그대로 쓴다 */
  }
}

// 계정 · 캐릭터 저장소 (server/accounts.js). DB 가 없으면 accounts.json 파일.
const ACCOUNTS_FILE = process.env.CHOROK_ACCOUNTS || path.join(__dirname, 'accounts.json')
const accounts = await A.createAccountStore({ db, file: ACCOUNTS_FILE })
const ACCOUNT_BODY_MAX = 3_000_000 // 프로필 사진(데이터 URL)이 들어 있을 수 있어 넉넉히
let loginFails = new Map() // id → [틀린 시각]  (10분에 10번 넘게 틀리면 잠시 막는다)
const loginBlocked = (id) => {
  const arr = (loginFails.get(id) ?? []).filter((t) => Date.now() - t < 600_000)
  loginFails.set(id, arr)
  return arr.length >= 10
}
const bearer = (req) => accounts && A.readToken(accounts.secret, (req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
const ID_RULE = /^[a-zA-Z0-9가-힣_]{2,40}$/

const snapshot = () => ({
  ranking,
  rankingWeek,
  lastWeek,
  market,
  members,
  stories,
  mail,
  clubs,
  clubOf,
  clubLeftAt,
  clubChat,
  seq,
  history,
  parties: [...parties.values()],
  bgmPlaylist,
})
async function saveNow() {
  if (db) {
    await db.query(
      `insert into saves (id, data, updated_at) values ($1, $2, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [DB_ROW_ID, JSON.stringify(snapshot())]
    )
  } else {
    // 동기 쓰기(writeFileSync)는 쓰는 동안 이벤트 루프 전체를 멈춘다 — 접속자가 많을 때는 비동기로.
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(snapshot(), null, 1))
  }
}
let saveTimer = null
let dirty = false
function scheduleSave() {
  dirty = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saveTimer = null
    dirty = false
    try {
      await saveNow()
    } catch (e) {
      console.error('기록 저장 실패(10초 뒤 다시 시도):', e.message)
      if (!saveTimer) setTimeout(() => !saveTimer && scheduleSave(), 10_000)
    }
  }, db ? 1500 : 400)
}

// 인적사항 카드(cards)는 따로, 더 느긋하게 저장한다 — 사진이 커서 매번 다시 굳히는 비용이 있고,
// 프로필을 자주 고치는 사람도 적어서 급하게 저장할 필요가 없다. (서버가 중간에 죽어도 카드는 잠깐 전 상태로만 복구된다)
//  - DB 에서는 "고쳐진 사람 것만" 그 사람의 줄(`card:<id>`)에 쓴다. 다른 사람 사진은 안 건드린다 — 이게 핵심.
async function saveCardsNow() {
  if (db) {
    const ids = [...dirtyCards]
    let wrote = 0
    for (const pid of ids) {
      const card = cards[pid]
      if (!card) {
        dirtyCards.delete(pid) // 사이에 지워졌으면(있을 일은 거의 없지만) 쓸 게 없으니 그냥 넘어간다
        continue
      }
      await db.query(
        `insert into saves (id, data, updated_at) values ($1, $2, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        [CARD_ROW_PREFIX + pid, JSON.stringify(card)]
      )
      dirtyCards.delete(pid) // 쓰기가 성공했을 때만 지운다 — 도중에 실패하면 남은(및 이 pid 포함) 건 다음 재시도 때 다시 쓴다
      wrote++
    }
    if (!legacyCardsRowCleared && wrote) {
      // 사람별 줄로 한 번 옮겨졌으니, 예전의 "전원분 한 덩어리" 줄은 이제 다 지난 사본이라 지운다.
      legacyCardsRowCleared = true
      await db.query('delete from saves where id = $1', [DB_ROW_ID_CARDS]).catch(() => {})
    }
  } else {
    await fs.promises.writeFile(CARDS_FILE, JSON.stringify({ cards }, null, 1))
  }
}
function scheduleCardsSave(id) {
  if (id) dirtyCards.add(id)
  clearTimeout(cardsSaveTimer)
  cardsSaveTimer = setTimeout(async () => {
    cardsSaveTimer = null
    try {
      await saveCardsNow()
    } catch (e) {
      console.error('인적사항 카드 저장 실패(10초 뒤 다시 시도):', e.message)
      if (!cardsSaveTimer) setTimeout(() => !cardsSaveTimer && scheduleCardsSave(), 10_000)
    }
  }, db ? 5_000 : 2_000)
}

// ───────── 접속 상태(메모리) ─────────
const clients = new Map() // id → { id, name, res, joinedAt }
const invites = new Map() // inviteeId → { fromId, at }
const partyStats = new Map() // playerId → { hp, hpMax, mp, mpMax, stats:{...육조}, equipment } — 일행에게 보여줄 실시간 상태(재시작 땐 안 남아도 된다. 접속하면 금방 다시 채워진다)
const rate = new Map() // id → [timestamps]

const send = (client, payload) => {
  try {
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`)
  } catch {
    /* 끊긴 연결은 close 핸들러가 정리한다 */
  }
}
const sendTo = (id, payload) => {
  const c = clients.get(id)
  if (c) send(c, payload)
}
const broadcast = (payload) => clients.forEach((c) => send(c, payload))
const onlineList = () =>
  [...clients.values()].map((c) => ({ id: c.id, name: c.name, title: c.title, partyId: partyOf.get(c.id) ?? null }))
// 접속 중인 사람 한 명의 명부 항목(접속 중이 아니면 null).
const presenceEntry = (id) => {
  const c = clients.get(id)
  return c ? { id, name: c.name, title: c.title, partyId: partyOf.get(id) ?? null } : null
}
const partyView = (p) =>
  p && {
    id: p.id,
    members: p.members.map((id) => ({
      id,
      name: clients.get(id)?.name ?? id,
      title: clients.get(id)?.title,
      online: clients.has(id),
      stats: partyStats.get(id) ?? null,
    })),
  }
const pushParty = (p) => p.members.forEach((id) => sendTo(id, { t: 'party', party: partyView(p), log: p.log }))
// 명부가 바뀔 때마다 전체 목록을 다시 보내지 않고, 바뀐 부분만 보낸다 — 인원이 많을수록(접속자 수)^2 로 커지는 걸 막는다.
// delta = { add?: [entry,…], remove?: [id,…], update?: [entry,…] } (update 는 partyId 등 기존 항목의 변경)
const pushPresence = (delta) => {
  if (!delta || (!delta.add?.length && !delta.remove?.length && !delta.update?.length)) return
  broadcast({ t: 'presence', ...delta })
}

const makeMsg = (from, text, extra = {}) => ({
  id: seq++,
  at: Date.now(),
  from: from ? { id: from.id, name: from.name, title: from.title } : null,
  text,
  ...extra,
})

function pushPartyMsg(p, msg) {
  p.log.push(msg)
  if (p.log.length > HISTORY_MAX) p.log.shift()
  p.members.forEach((id) => sendTo(id, { t: 'chat', channel: 'party', msg }))
}

function leaveParty(id, reason = 'leave') {
  const pid = partyOf.get(id)
  if (!pid) return
  const p = parties.get(pid)
  partyOf.delete(id)
  // partyId 가 바뀌는 사람들(명부 갱신용) — 이 아이디가 아직 접속 중이 아니면(연결이 끊겨서 호출된 경우) 명부엔 안 보낸다.
  const presenceChanged = [id]
  if (!p) {
    pushPresence({ update: presenceChanged.map(presenceEntry).filter(Boolean) })
    return
  }
  const name = clients.get(id)?.name ?? id
  p.members = p.members.filter((m) => m !== id)
  partyStats.delete(id)
  sendTo(id, { t: 'party', party: null, log: [] })
  if (p.members.length <= 1) {
    // 혼자 남으면 일행은 해산한다.
    p.members.forEach((m) => {
      partyOf.delete(m)
      partyStats.delete(m)
      presenceChanged.push(m)
      sendTo(m, { t: 'party', party: null, log: [] })
      sendTo(m, { t: 'notice', text: `${name}님이 일행을 ${reason === 'drop' ? '떠났다' : '떠나 일행이 해산되었다'}.` })
    })
    parties.delete(pid)
  } else {
    pushPartyMsg(p, makeMsg(null, `${name}님이 일행을 떠났다.`, { system: true }))
    pushParty(p)
  }
  pushPresence({ update: presenceChanged.map(presenceEntry).filter(Boolean) })
  scheduleSave()
}

// 파티장이 일행 전체를 바로 해체한다. (혼자 탈퇴해서 자연 해산되는 leaveParty 와 달리, 인원이 남아 있어도 전원 내보낸다)
function disbandParty(p) {
  const name = clients.get(p.members[0])?.name ?? p.members[0]
  const presenceChanged = [...p.members]
  for (const m of p.members) {
    partyOf.delete(m)
    partyStats.delete(m)
    sendTo(m, { t: 'party', party: null, log: [] })
    sendTo(m, { t: 'notice', text: `${name}님이 일행을 해체했다.` })
  }
  parties.delete(p.id)
  pushPresence({ update: presenceChanged.map(presenceEntry).filter(Boolean) })
  scheduleSave()
}


// ───────── 다인 전투 ─────────
// 일행(파티) 중 한 명이 '다인 전투' 상대에게 도전하면 나머지 일행에게 초대가 가고, 수락한 사람들이 한 판에서 함께 싸운다.
// 판은 서버가 진행한다. (src/game/mbattle.js)
const MB_LOBBY_MS = 30_000
const mbs = new Map() // bid → { id, host, enemyId, phase: 'lobby'|'fight'|'over', invited: {id: 'wait'|'yes'|'no'}, joins: {id: info}, mb, timer, deadline }
const mbOf = new Map() // playerId → bid (로비이거나 전투 중)
let mbSeq = 1

const mbMembers = (g) => (g.mb ? g.mb.members.map((m) => m.id) : [...mbOf].filter(([, b]) => b === g.id).map(([id]) => id))
function mbPush(g, extra = {}) {
  if (!g.mb) return
  for (const id of g.mb.members.map((m) => m.id)) sendTo(id, { t: 'mb', ev: 'state', bid: g.id, view: MB.viewOf(g.mb, { deadline: g.deadline, ...extra }) })
}
function mbClear(g, ids) {
  clearTimeout(g.timer)
  for (const id of ids) if (mbOf.get(id) === g.id) mbOf.delete(id)
}
function mbEnd(g) {
  g.phase = 'over'
  g.deadline = null
  mbPush(g)
  mbClear(g, g.mb.members.map((m) => m.id))
  setTimeout(() => mbs.delete(g.id), 120_000)
}
// 라운드 진행 중 시간 제한을 건다.
function mbArm(g) {
  clearTimeout(g.timer)
  const mb = g.mb
  if (mb.over) return mbEnd(g)
  if (mb.phase === 'input') {
    g.deadline = Date.now() + MB.MB_INPUT_MS
    g.timer = setTimeout(() => {
      MB.autoFill(mb)
      mbStep(g)
    }, MB.MB_INPUT_MS)
  } else if (mb.phase === 'survive') {
    g.deadline = Date.now() + MB.MB_SURVIVE_MS
    g.timer = setTimeout(() => {
      for (const m of MB.pendingSurvivors(mb)) MB.survive(mb, m.id, false)
      mbAfter(g)
    }, MB.MB_SURVIVE_MS)
  }
  mbPush(g)
}
function mbAfter(g) {
  if (g.mb.over) return mbEnd(g)
  mbArm(g)
  if (g.mb.phase === 'input' && MB.ready(g.mb)) mbStep(g) // 전원 돌발이면 곧바로 해결
}
function mbStep(g) {
  if (g.phase !== 'fight' || g.mb.phase !== 'input') return
  // 한 사람씩 차례대로: 행동이 정해진 사람(돌발 포함)은 바로 해결하고 다음 사람으로 넘어간다.
  for (let i = 0; i < 40 && g.mb.phase === 'input' && MB.ready(g.mb); i++) MB.resolveTurn(g.mb)
  mbAfter(g)
}
function mbStart(g) {
  clearTimeout(g.timer)
  const infos = [g.joins[g.host], ...Object.keys(g.joins).filter((id) => id !== g.host).map((id) => g.joins[id])]
  if (infos.length < 2) {
    sendTo(g.host, { t: 'mb', ev: 'cancel', bid: g.id, reason: '함께할 일행이 없어 전투가 취소되었다.' })
    for (const id of Object.keys(g.invited)) sendTo(id, { t: 'mb', ev: 'closed', bid: g.id })
    mbClear(g, [g.host, ...Object.keys(g.invited)])
    mbs.delete(g.id)
    return
  }
  for (const id of Object.keys(g.invited)) if (g.invited[id] !== 'yes') {
    sendTo(id, { t: 'mb', ev: 'closed', bid: g.id })
    if (mbOf.get(id) === g.id) mbOf.delete(id)
  }
  g.phase = 'fight'
  const isBoss = !!ENEMIES.find((e) => e.id === g.enemyId)?.boss
  g.mb = MB.createMB(g.enemyId, infos.map((i) => ({ ...i, bring: isBoss ? (i.bring ?? {}) : null })))
  MB.openingInitiative(g.mb)
  if (g.mb.phase === 'input' && !g.mb.turn) MB.beginRound(g.mb)
  mbAfter(g)
}
function mbLobbyCheck(g) {
  if (g.phase !== 'lobby') return
  if (Object.values(g.invited).every((v) => v !== 'wait')) mbStart(g)
  else {
    for (const id of [g.host]) sendTo(id, { t: 'mb', ev: 'lobby', bid: g.id, enemyId: g.enemyId, waiting: Object.keys(g.invited).filter((i) => g.invited[i] === 'wait').map((i) => clients.get(i)?.name ?? i), joined: Object.keys(g.joins).map((i) => clients.get(i)?.name ?? i) })
  }
}
/** 보스 전투에 가져가는 아이템: 전투용 아이템만, 한 '개' 단위로 합쳐서 최대 3개 */
const BOSS_BRING_MAX = 3
function cleanBring(raw) {
  const out = {}
  let total = 0
  for (const [id, n0] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
    const it = ITEMS.find((i) => i.id === id)
    const n = Math.floor(Number(n0))
    if (!it?.battle || !(n >= 1)) continue
    const take = Math.min(n, BOSS_BRING_MAX - total)
    if (take <= 0) break
    out[id] = take
    total += take
  }
  return out
}
const mbInfo = (c, me) => ({ id: c.id, name: c.name, bring: me?.bring === undefined ? undefined : cleanBring(me.bring), stats: me?.stats, fx: me?.fx, hp: me?.hp, hpMax: me?.hpMax, mp: me?.mp, mpMax: me?.mpMax, revive: !!me?.revive, boost: !!me?.boost })
function mbDisconnect(id) {
  const bid = mbOf.get(id)
  const g = bid && mbs.get(bid)
  if (!g) return
  if (g.phase === 'lobby') {
    if (id === g.host) {
      for (const i of Object.keys(g.invited)) sendTo(i, { t: 'mb', ev: 'closed', bid: g.id })
      mbClear(g, [g.host, ...Object.keys(g.invited)])
      clearTimeout(g.timer)
      mbs.delete(g.id)
    } else if (g.invited[id] === 'wait') {
      g.invited[id] = 'no'
      mbOf.delete(id)
      mbLobbyCheck(g)
    }
  } else if (g.phase === 'fight') {
    // 잠깐 끊긴 건 봐 준다. 30초 안에 돌아오지 않으면 전투에서 이탈한 것으로 친다.
    setTimeout(() => {
      if (clients.has(id) || g.phase !== 'fight') return
      MB.dropMember(g.mb, id)
      mbOf.delete(id)
      if (g.mb.over) return mbEnd(g)
      if (g.mb.phase === 'survive' && !MB.pendingSurvivors(g.mb).length) mbAfter(g)
      else if (MB.ready(g.mb)) mbStep(g)
      else mbPush(g)
    }, 30_000)
  }
}

// ───────── 오목 ─────────
// 일행(파티) 안의 두 사람이 신청 → 수락하면 바로 시작. 판은 서버가 들고 있고(재시작하면 사라진다), 매 수를 서버가 판정한다.
const omoks = new Map() // gid → { id, players: [idA, idB], board, turn, winner, win, phase: 'play'|'over' }
const omokOf = new Map() // playerId → gid
const omokInvites = new Map() // inviteeId → { from, at }
let omokSeq = 1

const omokView = (g) => ({
  gid: g.id,
  size: OMOK_SIZE,
  board: g.board,
  turn: g.turn,
  players: g.players.map((id) => ({ id, name: clients.get(id)?.name ?? id })),
  winner: g.winner,
  win: g.win ?? null,
})
const omokPush = (g) => g.players.forEach((id) => sendTo(id, { t: 'omok', ev: 'state', ...omokView(g) }))
function omokEnd(g, winner, noticeToOther) {
  g.phase = 'over'
  g.winner = winner
  for (const id of g.players) omokOf.delete(id)
  omokPush(g)
  if (noticeToOther) for (const id of g.players) if (id !== winner) sendTo(id, { t: 'notice', text: noticeToOther })
  setTimeout(() => omoks.delete(g.id), 60_000)
}
function omokDisconnect(id) {
  omokInvites.delete(id)
  for (const [to, inv] of omokInvites) if (inv.from === id) {
    omokInvites.delete(to)
    sendTo(to, { t: 'omok', ev: 'closed' })
  }
  const g = omoks.get(omokOf.get(id))
  if (!g || g.phase !== 'play') return
  setTimeout(() => {
    if (clients.has(id) || g.phase !== 'play') return
    const other = g.players.find((p) => p !== id)
    omokEnd(g, other, `${clients.get(id)?.name ?? id}님이 접속을 종료해 오목이 끝났다.`)
  }, 30_000)
}

// ───────── 윷놀이 ─────────
// 일행(파티) 안의 2~4명이 신청(여러 명 동시 초대) → 모두 수락하면 시작. 판은 서버가 들고 있고(재시작하면 사라진다).
const yutGames = new Map() // gid → game
const yutOf = new Map() // playerId → gid (게임이 시작된 뒤)
const yutLobbies = new Map() // lid → { id, host, invited: {id:'wait'|'yes'|'no'}, timer }
const yutLobbyOf = new Map() // playerId → lid (로비 응답 대기 중)
let yutSeq = 1
const YUT_LOBBY_MS = 30_000
const yutBusy = (id) => yutOf.has(id) || yutLobbyOf.has(id)

function yutView(g) {
  return {
    gid: g.id,
    players: g.players,
    pieces: g.pieces,
    left: [...(g.left ?? [])],
    turn: g.turn,
    phase: g.phase,
    throws: g.throws,
    pendingBranch: g.pendingBranch ? { at: g.pendingBranch.at, options: yutBranchOptions(g.pendingBranch.at) } : null,
    lastRoll: g.lastRoll,
    winner: g.winner,
    log: g.log.slice(-8),
  }
}
const yutPush = (g) => g.players.forEach((p) => sendTo(p.id, { t: 'yut', ev: 'state', ...yutView(g) }))
function yutLog(g, text) {
  g.log.push(text)
  if (g.log.length > 30) g.log.shift()
}
function yutEnd(g, winnerId, notice) {
  g.phase = 'over'
  g.winner = winnerId ?? null
  if (notice) yutLog(g, notice)
  yutPush(g)
  for (const p of g.players) yutOf.delete(p.id)
  setTimeout(() => yutGames.delete(g.id), 60_000)
}
function yutNextTurn(g) {
  const n = g.players.length
  for (let k = 1; k <= n; k++) {
    const t = (g.turn + k) % n
    if (!g.left.has(g.players[t].id)) {
      g.turn = t
      return
    }
  }
}
function yutResolve(g, idxs, r) {
  if (r.error) return r
  if (r.pending) {
    g.pendingBranch = { idxs, at: r.at, remaining: r.remaining }
    g.phase = 'branch'
    return { ok: true, pending: true }
  }
  g.pendingBranch = null
  const pIdx = g.turn
  if (r.finished) {
    for (const i of idxs) g.pieces[pIdx][i].pos = 'done'
    yutLog(g, `${g.players[pIdx].name}의 말이 완주했다.`)
    if (g.pieces[pIdx].every((p) => p.pos === 'done')) {
      yutEnd(g, g.players[pIdx].id, `${g.players[pIdx].name}님이 윷놀이에서 이겼다!`)
      return { ok: true, finished: true, over: true }
    }
    return { ok: true, finished: true }
  }
  let captured = false
  for (let op = 0; op < g.players.length; op++) {
    if (op === pIdx) continue
    for (const piece of g.pieces[op]) if (piece.pos === r.pos) {
      piece.pos = YUT_START
      captured = true
    }
  }
  for (const i of idxs) g.pieces[pIdx][i].pos = r.pos
  if (captured) yutLog(g, `${g.players[pIdx].name}이(가) 상대 말을 잡았다! (한 번 더)`)
  return { ok: true, captured }
}
function yutApply(g, selector, steps) {
  const mine = g.pieces[g.turn]
  let idxs
  let from
  if (selector === 'start') {
    const i = mine.findIndex((p) => p.pos === YUT_START)
    if (i < 0) return { error: 'no-piece' }
    idxs = [i]
    from = YUT_START
  } else {
    const pos = Number(selector)
    idxs = mine.map((p, i) => i).filter((i) => mine[i].pos === pos)
    if (!idxs.length) return { error: 'no-piece' }
    from = pos
  }
  return yutResolve(g, idxs, yutWalk(from, steps))
}
// apply · choose 가 끝난 뒤 공통으로 하는 일: 분기 대기면 그대로 두고, 아니면 한 번 더 던질지/다음 차례로 넘길지 정한다.
function yutAfter(g, r) {
  if (r.error || g.phase === 'over') return
  if (r.pending) return yutPush(g)
  if (r.captured) {
    g.phase = 'roll'
  } else {
    yutPruneDeadThrows(g)
    if (g.throws.length === 0) {
      yutNextTurn(g)
      g.phase = 'roll'
    } else g.phase = 'apply'
  }
  yutPush(g)
}
// 정식 규칙: 던진 수를 쓸 수 있는 말이 하나도 없으면(예: 아직 낸 말이 없는데 빽도가 나온 경우) 그 던지기는 버려진다.
function yutHasLegalMove(g, steps) {
  const froms = new Set()
  for (const p of g.pieces[g.turn]) if (p.pos !== 'done') froms.add(p.pos)
  for (const from of froms) if (!yutWalk(from, steps).error) return true
  return false
}
function yutPruneDeadThrows(g) {
  const before = g.throws.length
  g.throws = g.throws.filter((s) => yutHasLegalMove(g, s))
  if (g.throws.length < before) yutLog(g, `${g.players[g.turn].name} : 쓸 수 없는 던지기는 버려졌다.`)
}
function yutResign(g, id) {
  if (g.phase === 'over' || g.left.has(id)) return
  g.left.add(id)
  const name = g.players.find((p) => p.id === id)?.name ?? id
  const active = g.players.filter((p) => !g.left.has(p.id))
  if (active.length <= 1) return yutEnd(g, active[0]?.id, `${name}님이 윷놀이를 포기했다.`)
  yutLog(g, `${name}님이 윷놀이에서 빠졌다.`)
  if (g.players[g.turn].id === id) {
    yutNextTurn(g)
    g.phase = 'roll'
    g.throws = []
    g.pendingBranch = null
  }
  yutPush(g)
}
function yutLobbyCancel(lobby, reason) {
  clearTimeout(lobby.timer)
  yutLobbies.delete(lobby.id)
  yutLobbyOf.delete(lobby.host)
  sendTo(lobby.host, { t: 'yut', ev: 'lobby-cancel', lid: lobby.id, reason })
  for (const id of Object.keys(lobby.invited)) {
    yutLobbyOf.delete(id)
    sendTo(id, { t: 'yut', ev: 'closed', lid: lobby.id })
  }
}
function yutLobbyStart(lobby) {
  clearTimeout(lobby.timer)
  const ids = [lobby.host, ...Object.keys(lobby.invited)]
  yutLobbies.delete(lobby.id)
  for (const id of ids) yutLobbyOf.delete(id)
  const gid = 'yg' + yutSeq++
  const g = {
    id: gid,
    players: ids.map((id) => ({ id, name: clients.get(id)?.name ?? id })),
    pieces: ids.map(() => Array.from({ length: 4 }, () => ({ pos: YUT_START }))),
    left: new Set(),
    turn: 0,
    phase: 'roll',
    throws: [],
    pendingBranch: null,
    lastRoll: null,
    winner: null,
    log: [],
  }
  yutGames.set(gid, g)
  for (const id of ids) yutOf.set(id, gid)
  yutPush(g)
}
function yutLobbyCheck(lobby) {
  const vals = Object.values(lobby.invited)
  if (vals.some((v) => v === 'no')) return yutLobbyCancel(lobby, '누군가 윷놀이 신청을 거절해 취소되었다.')
  if (vals.every((v) => v === 'yes')) return yutLobbyStart(lobby)
  sendTo(lobby.host, {
    t: 'yut',
    ev: 'lobby',
    lid: lobby.id,
    waiting: Object.keys(lobby.invited).filter((i) => lobby.invited[i] === 'wait').map((i) => clients.get(i)?.name ?? i),
  })
}
function yutDisconnect(id) {
  const lid = yutLobbyOf.get(id)
  if (lid) {
    const lobby = yutLobbies.get(lid)
    if (lobby) yutLobbyCancel(lobby, '접속이 끊겨 윷놀이 신청이 취소되었다.')
  }
  const g = yutGames.get(yutOf.get(id))
  if (!g || g.phase === 'over') return
  setTimeout(() => {
    if (clients.has(id) || g.phase === 'over') return
    yutResign(g, id)
  }, 30_000)
}

// ───────── 루미큐브 ─────────
const rummiGames = new Map() // gid → game
const rummiOf = new Map() // playerId → gid
const rummiLobbies = new Map() // lid → { id, host, invited: {id:'wait'|'yes'|'no'}, timer }
const rummiLobbyOf = new Map()
let rummiSeq = 1
const RUMMI_LOBBY_MS = 30_000
const RUMMI_HAND_START = 14
const rummiBusy = (id) => rummiOf.has(id) || rummiLobbyOf.has(id)

function rummiLog(g, text) {
  g.log.push(text)
  if (g.log.length > 30) g.log.shift()
}
function rummiViewFor(g, id) {
  const myIdx = g.players.findIndex((p) => p.id === id)
  return {
    gid: g.id,
    players: g.players,
    counts: g.hands.map((h) => h.length),
    hand: myIdx >= 0 ? g.hands[myIdx] : [],
    poolLeft: g.pool.length,
    table: g.table,
    turn: g.turn,
    hasPlayed: g.hasPlayedThisTurn,
    firstMeld: [...g.firstMeld],
    left: [...g.left],
    winner: g.winner,
    log: g.log.slice(-8),
  }
}
const rummiPush = (g) => g.players.forEach((p) => sendTo(p.id, { t: 'rummi', ev: 'state', ...rummiViewFor(g, p.id) }))
function rummiEnd(g, winnerId, notice) {
  g.phase = 'over'
  g.winner = winnerId ?? null
  if (notice) rummiLog(g, notice)
  rummiPush(g)
  for (const p of g.players) rummiOf.delete(p.id)
  setTimeout(() => rummiGames.delete(g.id), 60_000)
}
function rummiNextTurn(g) {
  const n = g.players.length
  for (let k = 1; k <= n; k++) {
    const t = (g.turn + k) % n
    if (!g.left.has(g.players[t].id)) {
      g.turn = t
      return
    }
  }
}
function rummiEndByScore(g) {
  const scores = g.hands.map((h) => h.reduce((s, t) => s + (t.joker ? 30 : t.num), 0))
  let best = -1
  for (let i = 0; i < scores.length; i++) if (!g.left.has(g.players[i].id) && (best < 0 || scores[i] < scores[best])) best = i
  rummiEnd(g, best >= 0 ? g.players[best].id : null, '더 낼 수 있는 조합이 없어 남은 패가 가장 적은 사람이 이겼다.')
}
function rummiResign(g, id) {
  if (g.phase === 'over' || g.left.has(id)) return
  g.left.add(id)
  const name = g.players.find((p) => p.id === id)?.name ?? id
  const active = g.players.filter((p) => !g.left.has(p.id))
  if (active.length <= 1) return rummiEnd(g, active[0]?.id, `${name}님이 루미큐브를 포기했다.`)
  rummiLog(g, `${name}님이 루미큐브에서 빠졌다.`)
  if (g.players[g.turn].id === id) {
    rummiNextTurn(g)
    g.hasPlayedThisTurn = false
  }
  rummiPush(g)
}
function rummiLobbyCancel(lobby, reason) {
  clearTimeout(lobby.timer)
  rummiLobbies.delete(lobby.id)
  rummiLobbyOf.delete(lobby.host)
  sendTo(lobby.host, { t: 'rummi', ev: 'lobby-cancel', lid: lobby.id, reason })
  for (const id of Object.keys(lobby.invited)) {
    rummiLobbyOf.delete(id)
    sendTo(id, { t: 'rummi', ev: 'closed', lid: lobby.id })
  }
}
function rummiLobbyStart(lobby) {
  clearTimeout(lobby.timer)
  const ids = [lobby.host, ...Object.keys(lobby.invited)]
  rummiLobbies.delete(lobby.id)
  for (const id of ids) rummiLobbyOf.delete(id)
  const gid = 'rg' + rummiSeq++
  const deck = rummiShuffle(rummiFreshDeck())
  const hands = ids.map(() => deck.splice(0, RUMMI_HAND_START))
  const g = {
    id: gid,
    players: ids.map((id) => ({ id, name: clients.get(id)?.name ?? id })),
    hands,
    pool: deck,
    table: [],
    turn: 0,
    phase: 'play',
    hasPlayedThisTurn: false,
    passStreak: 0,
    firstMeld: new Set(),
    left: new Set(),
    winner: null,
    log: [],
    meldSeq: 1,
  }
  rummiGames.set(gid, g)
  for (const id of ids) rummiOf.set(id, gid)
  rummiPush(g)
}
function rummiLobbyCheck(lobby) {
  const vals = Object.values(lobby.invited)
  if (vals.some((v) => v === 'no')) return rummiLobbyCancel(lobby, '누군가 루미큐브 신청을 거절해 취소되었다.')
  if (vals.every((v) => v === 'yes')) return rummiLobbyStart(lobby)
  sendTo(lobby.host, {
    t: 'rummi',
    ev: 'lobby',
    lid: lobby.id,
    waiting: Object.keys(lobby.invited).filter((i) => lobby.invited[i] === 'wait').map((i) => clients.get(i)?.name ?? i),
  })
}
function rummiDisconnect(id) {
  const lid = rummiLobbyOf.get(id)
  if (lid) {
    const lobby = rummiLobbies.get(lid)
    if (lobby) rummiLobbyCancel(lobby, '접속이 끊겨 루미큐브 신청이 취소되었다.')
  }
  const g = rummiGames.get(rummiOf.get(id))
  if (!g || g.phase === 'over') return
  setTimeout(() => {
    if (clients.has(id) || g.phase === 'over') return
    rummiResign(g, id)
  }, 30_000)
}

// ───────── 요트 다이스 ─────────
const yachtGames = new Map() // gid → game
const yachtOf = new Map() // playerId → gid
const yachtLobbies = new Map() // lid → { id, host, invited: {id:'wait'|'yes'|'no'}, timer }
const yachtLobbyOf = new Map()
let yachtSeq = 1
const YACHT_LOBBY_MS = 30_000
const yachtBusy = (id) => yachtOf.has(id) || yachtLobbyOf.has(id)

function yachtLog(g, text) {
  g.log.push(text)
  if (g.log.length > 30) g.log.shift()
}
function yachtViewFor(g) {
  return {
    gid: g.id,
    players: g.players,
    scorecards: g.scorecards,
    dice: g.dice,
    rollsLeft: g.rollsLeft,
    turn: g.turn,
    left: [...g.left],
    winner: g.winner,
    tie: g.tie ?? null,
    log: g.log.slice(-8),
  }
}
const yachtPush = (g) => { const v = yachtViewFor(g); g.players.forEach((p) => sendTo(p.id, { t: 'yacht', ev: 'state', ...v })) }
function yachtEnd(g, winnerId, notice, tie) {
  g.phase = 'over'
  g.winner = winnerId ?? null
  g.tie = tie ?? null
  if (notice) yachtLog(g, notice)
  yachtPush(g)
  for (const p of g.players) yachtOf.delete(p.id)
  setTimeout(() => yachtGames.delete(g.id), 60_000)
}
function yachtEndByScore(g) {
  const active = g.players.filter((p) => !g.left.has(p.id))
  const totals = active.map((p) => yachtTotalScore(g.scorecards[g.players.findIndex((pp) => pp.id === p.id)]))
  const best = Math.max(...totals)
  const winners = active.filter((_, i) => totals[i] === best)
  if (winners.length > 1) yachtEnd(g, null, `${winners.map((p) => p.name).join(', ')}님이 ${best}점으로 동점 우승!`, winners.map((p) => p.id))
  else yachtEnd(g, winners[0]?.id, `${winners[0]?.name}님이 ${best}점으로 이겼다!`)
}
function yachtNextTurn(g) {
  const n = g.players.length
  for (let k = 1; k <= n; k++) {
    const t = (g.turn + k) % n
    if (!g.left.has(g.players[t].id)) { g.turn = t; return }
  }
}
function yachtResign(g, id) {
  if (g.phase === 'over' || g.left.has(id)) return
  g.left.add(id)
  const name = g.players.find((p) => p.id === id)?.name ?? id
  const active = g.players.filter((p) => !g.left.has(p.id))
  if (active.length <= 1) return yachtEnd(g, active[0]?.id, `${name}님이 요트 다이스를 포기했다.`)
  yachtLog(g, `${name}님이 요트 다이스에서 빠졌다.`)
  if (g.players[g.turn].id === id) {
    yachtNextTurn(g)
    g.dice = [0, 0, 0, 0, 0]
    g.rollsLeft = YACHT_MAX_ROLLS
  }
  yachtPush(g)
}
function yachtLobbyCancel(lobby, reason) {
  clearTimeout(lobby.timer)
  yachtLobbies.delete(lobby.id)
  yachtLobbyOf.delete(lobby.host)
  sendTo(lobby.host, { t: 'yacht', ev: 'lobby-cancel', lid: lobby.id, reason })
  for (const id of Object.keys(lobby.invited)) {
    yachtLobbyOf.delete(id)
    sendTo(id, { t: 'yacht', ev: 'closed', lid: lobby.id })
  }
}
function yachtLobbyStart(lobby) {
  clearTimeout(lobby.timer)
  const ids = [lobby.host, ...Object.keys(lobby.invited)]
  yachtLobbies.delete(lobby.id)
  for (const id of ids) yachtLobbyOf.delete(id)
  const gid = 'yg2' + yachtSeq++
  const g = {
    id: gid,
    players: ids.map((id) => ({ id, name: clients.get(id)?.name ?? id })),
    scorecards: ids.map(() => ({})),
    dice: [0, 0, 0, 0, 0],
    rollsLeft: YACHT_MAX_ROLLS,
    turn: 0,
    phase: 'play',
    left: new Set(),
    winner: null,
    tie: null,
    log: [],
  }
  yachtGames.set(gid, g)
  for (const id of ids) yachtOf.set(id, gid)
  yachtPush(g)
}
function yachtLobbyCheck(lobby) {
  const vals = Object.values(lobby.invited)
  if (vals.some((v) => v === 'no')) return yachtLobbyCancel(lobby, '누군가 요트 다이스 신청을 거절해 취소되었다.')
  if (vals.every((v) => v === 'yes')) return yachtLobbyStart(lobby)
  sendTo(lobby.host, {
    t: 'yacht',
    ev: 'lobby',
    lid: lobby.id,
    waiting: Object.keys(lobby.invited).filter((i) => lobby.invited[i] === 'wait').map((i) => clients.get(i)?.name ?? i),
  })
}
function yachtDisconnect(id) {
  const lid = yachtLobbyOf.get(id)
  if (lid) {
    const lobby = yachtLobbies.get(lid)
    if (lobby) yachtLobbyCancel(lobby, '접속이 끊겨 요트 다이스 신청이 취소되었다.')
  }
  const g = yachtGames.get(yachtOf.get(id))
  if (!g || g.phase === 'over') return
  setTimeout(() => {
    if (clients.has(id) || g.phase === 'over') return
    yachtResign(g, id)
  }, 30_000)
}

// ───────── HTTP 유틸 ─────────
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}
function readBody(req, max = 10_000) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > max) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}
// 한글은 두 가지 유니코드 표현(완성형 NFC/조합형 NFD)이 있어, 보기엔 똑같아도 다른 문자열일 수 있다.
// (예: 어떤 기기·IME 는 '이요' 를 조합형으로 입력한다.) 아이디는 들어오는 모든 자리에서 NFC 로 맞춰, 같은 아이디가 다른 문자열로 갈리지 않게 한다.
const nfc = (v) => (typeof v === 'string' ? v.normalize('NFC') : v)
const cleanId = (v) => (typeof v === 'string' && /^[a-zA-Z0-9가-힣_]{1,40}$/.test(nfc(v)) ? nfc(v) : null)
const cleanName = (v) => (typeof v === 'string' ? v.replace(/[\r\n\t]/g, ' ').trim().slice(0, 24) : '')
const cleanNote = (v) => (typeof v === 'string' ? v.replace(/\r/g, '').trim() : '')
function addMail(entry) {
  const m = { id: `m${mail.seq++}`, at: Date.now(), read: false, ...entry }
  mail.log.push(m)
  if (mail.log.length > MAIL_LOG_CAP) mail.log.splice(0, mail.log.length - MAIL_LOG_CAP)
  scheduleSave()
  sendTo(m.to.id, { t: 'mail', mail: m })
  return m
}
const editReqs = new Map() // 관리자 수정 요청(당사자 동의 대기): rid → { rid, admin, target, changes, status }
const storyRate = new Map() // 사연 투고 횟수 제한(접속 중에만 기억, 쓴 사람은 저장하지 않는다)
const requireClient = (body, res) => {
  const id = cleanId(body?.id)
  const c = id && clients.get(id)
  if (!c) {
    json(res, 409, { error: 'not-connected' })
    return null
  }
  return c
}
function rateLimited(id) {
  const now = Date.now()
  const arr = (rate.get(id) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  arr.push(now)
  rate.set(id, arr)
  return arr.length > RATE_MAX
}

// ───────── 랭킹 ─────────
const topOf = (course, limit = 20) =>
  Object.values(ranking[course])
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, score: r.score }))

// ───────── 라우터 ─────────
async function handleApi(req, res, url) {
  const route = url.pathname

  // 잠들기 방지용으로 UptimeRobot 등이 주기적으로 찌르는 주소. DB 도 함께 건드려 Supabase 무료 프로젝트가 일시정지되지 않게 한다.
  if (req.method === 'GET' && route === '/api/health') {
    let dbOk = null
    if (db) dbOk = await db.query('select 1').then(() => true, () => false)
    return json(res, 200, { ok: true, online: clients.size, db: dbOk })
  }

  // 그날의 교내 신문: 누구나 볼 수 있다. ?date=YYYY-MM-DD (없으면 오늘, KST)
  // 배경음악(평소 곡) 재생목록: 관리자가 올려 둔 유튜브 영상ID 목록. 접속(SSE) 전에도 곧장 받아 쓸 수 있도록 공개 GET 으로도 둔다.
  if (req.method === 'GET' && route === '/api/bgm') {
    return json(res, 200, { ok: true, playlist: bgmPlaylist })
  }

  if (req.method === 'GET' && route === '/api/newspaper') {
    const q = url.searchParams.get('date')
    const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : kstDate()
    return json(res, 200, { ok: true, date, stories: (stories.papers[date] ?? []).map((s) => ({ no: s.no, text: s.text })) })
  }

  // 내 계정 (로그인 토큰 필요): 다른 기기에서 저장한 최신 기록을 받아 간다.
  if (req.method === 'GET' && route === '/api/account/me') {
    const id = bearer(req)
    if (!id) return json(res, 401, { error: 'no-auth' })
    const acc = await accounts.get(id, { withAvatar: true })
    if (!acc) return json(res, 401, { error: 'no-account' })
    return json(res, 200, { ok: true, user: A.publicAccount(acc) })
  }

  // 벼룩시장 목록: 물건 종류별로(상점 순서) 1개당 값이 싼 것부터. 올린 사람은 알려 주지 않고, 본인 것만 mine 으로 표시한다.
  if (req.method === 'GET' && route === '/api/market') {
    const id = cleanId(url.searchParams.get('id'))
    if (!id || !clients.get(id)) return json(res, 409, { error: 'not-connected' })
    const order = new Map(ITEMS.map((it, i) => [it.id, i]))
    const list = [...market.listings]
      .sort((a, b) => order.get(a.item) - order.get(b.item) || a.price - b.price || a.at - b.at)
      .map((l) => ({ id: l.id, item: l.item, qty: l.qty, price: l.price, total: l.price * l.qty, mine: l.seller === id }))
    return json(res, 200, { ok: true, listings: list })
  }

  // 인적사항 카드 조회: 접속해 있는 사람만 볼 수 있다. 상대가 접속 중이 아니어도 마지막으로 저장된 카드가 나온다.
  if (req.method === 'GET' && route === '/api/card') {
    const id = cleanId(url.searchParams.get('id'))
    if (!id || !clients.get(id)) return json(res, 409, { error: 'not-connected' })
    const target = cleanId(url.searchParams.get('target'))
    const c = target && cards[target]
    if (!c) return json(res, 404, { error: 'no-card' })
    const live = clients.get(target)
    return json(res, 200, { ok: true, card: { ...c, id: target }, online: !!live, title: live?.title ?? null })
  }

  if (req.method === 'GET' && route === '/api/events') {
    const id = cleanId(url.searchParams.get('id'))
    const name = cleanName(url.searchParams.get('name')) || id
    if (!id) return json(res, 400, { error: 'bad-id' })
    const isAdmin = adminOk(url.searchParams.get('key') ?? '')
    if (isAdmin) admins.add(id)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('retry: 2000\n\n')
    const prev = clients.get(id)
    if (prev) {
      try {
        prev.res.end() // 같은 계정의 이전 연결(다른 탭)은 밀어낸다
      } catch {
        /* 이미 닫힘 */
      }
    }
    const client = { id, name, res, joinedAt: Date.now(), title: isAdmin ? ADMIN_TITLE : undefined }
    {
      const m = members[id]
      const now = Date.now()
      members[id] = { id, name, firstSeen: m?.firstSeen ?? now, lastSeen: now, visits: (m?.visits ?? 0) + (prev ? 0 : 1) }
      scheduleSave()
    }
    clients.set(id, client)
    const pid = partyOf.get(id)
    const party = pid ? parties.get(pid) : null
    send(client, {
      t: 'hello',
      you: { id, name, title: client.title },
      online: onlineList(),
      history,
      party: partyView(party),
      partyLog: party?.log ?? [],
      bgmPlaylist,
      mailUnread: mail.log.reduce((n, m) => n + (m.to.id === id && !m.read ? 1 : 0), 0),
      club: clubOf[id] ? { id: clubOf[id], joinedAt: clubs[clubOf[id]]?.members?.[id]?.joinedAt ?? null, log: clubChat[clubOf[id]]?.slice(-200) ?? [] } : null,
      mb: (() => {
        const g = mbs.get(mbOf.get(id))
        return g?.mb && g.phase === 'fight' ? { bid: g.id, view: MB.viewOf(g.mb, { deadline: g.deadline }) } : null
      })(),
      omok: (() => {
        const g = omoks.get(omokOf.get(id))
        return g && g.phase === 'play' ? omokView(g) : null
      })(),
      yut: (() => {
        const g = yutGames.get(yutOf.get(id))
        return g && g.phase !== 'over' ? yutView(g) : null
      })(),
      rummi: (() => {
        const g = rummiGames.get(rummiOf.get(id))
        return g && g.phase !== 'over' ? rummiViewFor(g, id) : null
      })(),
      yacht: (() => {
        const g = yachtGames.get(yachtOf.get(id))
        return g && g.phase !== 'over' ? yachtViewFor(g) : null
      })(),
    })
    if (party) pushParty(party)
    pushPresence({ add: [presenceEntry(id)] })
    // 이미 끊긴 연결에 쓰다가 예외가 나면(close 이벤트가 아직 안 와도 생길 수 있다) 서버 전체가 죽는다 — 반드시 감싼다.
    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        clearInterval(ping)
      }
    }, 20_000)
    req.on('close', () => {
      clearInterval(ping)
      if (clients.get(id) === client) {
        clients.delete(id)
        invites.delete(id)
        mbDisconnect(id)
        omokDisconnect(id)
        yutDisconnect(id)
        rummiDisconnect(id)
        yachtDisconnect(id)
        // 잠깐의 재연결은 일행을 유지하고, 오래 안 돌아오면 일행에서 뺀다.
        setTimeout(() => {
          if (!clients.has(id)) leaveParty(id, 'drop')
        }, 30_000)
        pushPresence({ remove: [id] })
      }
    })
    return
  }

  if (req.method === 'GET' && route.startsWith('/api/ranking/')) {
    rollWeek()
    const course = route.slice('/api/ranking/'.length)
    if (!COURSES.includes(course)) return json(res, 404, { error: 'unknown-course' })
    const me = cleanId(url.searchParams.get('id'))
    const weekInfo = { weekStart: rankingWeek, weekLabel: weekLabel(rankingWeek), resetsAt: rankingWeek + 7 * DAY_MS }
    if (url.searchParams.get('week') === 'last') {
      const lw = lastWeek
      const top = lw?.top?.[course] ?? []
      return json(res, 200, { course, week: 'last', ...weekInfo, lastStart: lw?.start ?? null, lastLabel: lw ? weekLabel(lw.start) : null, lastEndLabel: lw ? weekLabel(lw.end - DAY_MS) : null, top, total: top.length, me: null })
    }
    const mine = me ? ranking[course][me] : null
    const all = Object.values(ranking[course]).sort((a, b) => b.score - a.score || a.at - b.at)
    return json(res, 200, {
      course,
      week: 'this',
      ...weekInfo,
      top: topOf(course),
      me: mine ? { score: mine.score, rank: all.findIndex((r) => r.id === me) + 1 } : null,
      total: all.length,
    })
  }

  if (req.method !== 'POST') return json(res, 404, { error: 'not-found' })
  const body = await readBody(req, route === '/api/card' ? 400_000 : route.startsWith('/api/account/') ? ACCOUNT_BODY_MAX : 10_000)
  if (!body) return json(res, 400, { error: 'bad-json' })

  // ───────── 계정 (가입 · 로그인 · 저장 · 아이디 찾기) ─────────
  if (route === '/api/account/signup') {
    const id = nfc(typeof body.id === 'string' ? body.id.trim() : '')
    const password = typeof body.password === 'string' ? body.password : ''
    const twitter = typeof body.twitter === 'string' ? body.twitter.trim().replace(/^@/, '') : ''
    if (!ID_RULE.test(id)) return json(res, 400, { error: 'bad-id' })
    if (password.length < 4) return json(res, 400, { error: 'bad-password' })
    if (!twitter) return json(res, 400, { error: 'no-twitter' })
    if (rateLimited(`auth:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (await accounts.get(id)) return json(res, 409, { error: 'taken' })
    const acc = {
      id,
      passwordHash: A.hashPassword(password),
      twitter,
      twitterNorm: A.normTwitter(twitter),
      createdAt: Date.now(),
      admin: !!(body.adminKey && adminOk(body.adminKey)),
      save: null,
      updatedAt: Date.now(),
    }
    await accounts.put(acc)
    return json(res, 200, { ok: true, token: A.makeToken(accounts.secret, id), user: A.publicAccount(acc) })
  }

  // 로그인. 서버에 계정이 없고 이 브라우저에 옛 기록(local)이 있으면, 비밀번호가 맞을 때 그 기록을 서버로 옮긴다. (자동 이전)
  if (route === '/api/account/login') {
    const id = nfc(typeof body.id === 'string' ? body.id.trim() : '')
    const password = typeof body.password === 'string' ? body.password : ''
    if (!ID_RULE.test(id) || !password) return json(res, 401, { error: 'bad-login' })
    if (rateLimited(`auth:${id}`) || loginBlocked(id)) return json(res, 429, { error: 'slow-down' })
    const local = body.local && typeof body.local === 'object' && body.local.id === id ? body.local : null
    const localOk = !!local && local.passwordHash === A.legacyHash(password, id)
    let acc = await accounts.get(id, { withAvatar: true })
    let migrated = false
    if (!acc) {
      if (!localOk) {
        loginFails.get(id)?.push(Date.now()) ?? loginFails.set(id, [Date.now()])
        return json(res, 401, { error: 'bad-login' })
      }
      acc = {
        id,
        passwordHash: A.hashPassword(password),
        twitter: String(local.twitter ?? ''),
        twitterNorm: A.normTwitter(local.twitter),
        createdAt: Number(local.createdAt) || Date.now(),
        admin: !!local.admin,
        ...A.pickGame(local),
        updatedAt: Date.now(),
      }
      migrated = true
    } else {
      const legacy = typeof acc.passwordHash === 'string' && acc.passwordHash.startsWith('legacy$')
      const pwOk = legacy ? acc.passwordHash === `legacy$${A.legacyHash(password, id)}` : A.verifyPassword(password, acc.passwordHash)
      if (pwOk && legacy) {
        acc.passwordHash = A.hashPassword(password) // 처음 로그인하는 순간 안전한 방식으로 바꾼다
        delete acc.adopted
      }
      if (!pwOk) {
        loginFails.get(id)?.push(Date.now()) ?? loginFails.set(id, [Date.now()])
        return json(res, 401, { error: 'bad-login' })
      }
      // 이 브라우저에서 서버에 못 보낸 플레이(dirty)가 있고, 그 사이 다른 기기가 저장하지 않았다면 이 브라우저 쪽을 남긴다.
      if (localOk && local.dirty && Number(local.syncBase) === (acc.updatedAt || 0)) {
        Object.assign(acc, A.pickGame(local), { updatedAt: Math.max(Date.now(), (acc.updatedAt || 0) + 1) })
        migrated = true
      }
    }
    if (body.adminKey && adminOk(body.adminKey)) acc.admin = true
    loginFails.delete(id)
    await accounts.put(acc)
    return json(res, 200, { ok: true, migrated, mustReset: !!acc.mustReset, token: A.makeToken(accounts.secret, id), user: A.publicAccount(acc) })
  }

  // 비밀번호 바꾸기(로그인 토큰 필요). 관리자가 임시 비밀번호를 발급한 뒤, 본인이 로그인해서 새 비밀번호로 바꿀 때 쓴다.
  if (route === '/api/account/password') {
    const id = bearer(req)
    if (!id) return json(res, 401, { error: 'no-auth' })
    const acc = await accounts.get(id)
    if (!acc) return json(res, 401, { error: 'no-account' })
    const password = typeof body.password === 'string' ? body.password : ''
    if (password.length < 4) return json(res, 400, { error: 'bad-password' })
    if (rateLimited(`auth:${id}`)) return json(res, 429, { error: 'slow-down' })
    acc.passwordHash = A.hashPassword(password)
    delete acc.mustReset
    await accounts.put(acc)
    return json(res, 200, { ok: true })
  }

  // 자동 이전: 서버 저장이 생기기 전부터 로그인해 있던 브라우저가 접속하자마자 자기 기록을 올린다. (비밀번호 입력 없이)
  // 서버에 같은 아이디가 이미 있으면 거절(409) → 그 브라우저는 평소처럼 로그인해야 한다. 관리자 표시는 믿지 않는다.
  // 비밀번호는 브라우저에 있던 옛 해시를 'legacy$' 로 보관했다가, 그 계정이 처음 비밀번호로 로그인하는 순간 안전한 방식으로 바꾼다.
  if (route === '/api/account/adopt') {
    const local = body.local && typeof body.local === 'object' ? body.local : null
    const id = nfc(typeof local?.id === 'string' ? local.id.trim() : '')
    if (!ID_RULE.test(id) || !/^[0-9a-f]{8}$/.test(String(local.passwordHash ?? ''))) return json(res, 400, { error: 'bad-local' })
    if (rateLimited(`auth:${id}`) || rateLimited('adopt:all')) return json(res, 429, { error: 'slow-down' })
    if (await accounts.get(id)) return json(res, 409, { error: 'exists' })
    const acc = {
      id,
      passwordHash: `legacy$${local.passwordHash}`,
      twitter: String(local.twitter ?? '').slice(0, 60),
      twitterNorm: A.normTwitter(local.twitter),
      createdAt: Number(local.createdAt) || Date.now(),
      admin: false,
      adopted: true,
      ...A.pickGame(local),
      updatedAt: Date.now(),
    }
    await accounts.put(acc)
    return json(res, 200, { ok: true, token: A.makeToken(accounts.secret, id), user: A.publicAccount(acc) })
  }

  // 게임 저장 (로그인 토큰 필요). 브라우저가 저장할 때마다 몇 초 모아서 보낸다.
  if (route === '/api/account/save') {
    const id = bearer(req)
    if (!id) return json(res, 401, { error: 'no-auth' })
    const acc = await accounts.get(id) // 사진은 해시만 — 평소 자동저장에서는 사진 바이트를 전혀 안 읽는다
    if (!acc) return json(res, 401, { error: 'no-account' })
    // base: 이 브라우저가 마지막으로 서버와 맞춘 저장 번호. 그 사이 다른 기기가 저장했다면 덮어쓰지 않고 최신 기록을 돌려준다.
    if (Number(body.base) !== (acc.updatedAt || 0)) {
      const full = await accounts.get(id, { withAvatar: true }) // 충돌 응답은 브라우저 화면을 통째로 덮어쓰므로 실제 사진이 필요하다
      return json(res, 409, { error: 'stale', user: A.publicAccount(full ?? acc) })
    }
    const incoming = A.reconcileAvatars(A.pickGame(body.account), acc)
    Object.assign(acc, incoming, { updatedAt: Math.max(Date.now(), (acc.updatedAt || 0) + 1) })
    await accounts.put(acc)
    return json(res, 200, { ok: true, updatedAt: acc.updatedAt })
  }

  // 아이디 찾기: 가입할 때 적은 트위터 아이디로. (비밀번호 찾기는 지원하지 않는다.)
  if (route === '/api/account/find') {
    if (rateLimited('auth:find')) return json(res, 429, { error: 'slow-down' })
    const ids = await accounts.idsByTwitter(body.twitter)
    return json(res, 200, { ok: true, ids })
  }

  // 관리자: 계정 문제(비밀번호를 잊음 등)가 생긴 사람에게 임시 비밀번호를 발급한다.
  // 본인이 그 임시 비밀번호로 로그인하면 곧바로 새 비밀번호를 정해야 한다(mustReset). 관리자는 원래 비밀번호를 알 수도, 볼 수도 없다.
  if (route === '/api/admin/account/reset') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    const target = nfc(typeof body.target === 'string' ? body.target.trim() : '')
    if (!ID_RULE.test(target)) return json(res, 400, { error: 'bad-target' })
    const acc = await accounts.get(target)
    if (!acc) return json(res, 400, { error: 'no-account' }) // 404 는 이 호출을 거는 game/auth.js 의 api() 가 '서버 없음'으로 오인해, 진짜 사유가 가려진다
    const temp = crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8)
    acc.passwordHash = A.hashPassword(temp)
    acc.mustReset = true
    await accounts.put(acc)
    return json(res, 200, { ok: true, target, tempPassword: temp })
  }

  // 관리자 키 확인 (로그인 화면에서 한 번). 맞으면 클라이언트가 그 계정을 관리자로 표시한다.
  if (route === '/api/admin/verify') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (keyBlocked()) return json(res, 429, { error: 'slow-down' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    admins.add(id)
    return json(res, 200, { ok: true })
  }

  // 회원 목록(관리자 전용): 서버에 데이터가 남은 모든 계정. 명부 + 인적사항 카드 + 랭킹 기록에서 모은다.
  // 관리자: 배경음악(평소 곡) 재생목록을 통째로 바꾼다 — 유튜브 영상ID 배열. 빈 배열로 보내면 로컬 mp3 로 되돌아간다.
  if (route === '/api/admin/bgm') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    if (!Array.isArray(body.playlist)) return json(res, 400, { error: 'bad-playlist' })
    const list = body.playlist
      .filter((t) => t && isYoutubeId(t.id))
      .slice(0, BGM_MAX)
      .map((t) => ({ id: t.id, title: typeof t.title === 'string' ? t.title.slice(0, 80) : '' }))
    bgmPlaylist = list
    broadcast({ t: 'bgm', playlist: bgmPlaylist })
    scheduleSave()
    return json(res, 200, { ok: true, playlist: bgmPlaylist })
  }

  if (route === '/api/admin/members') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    const ids = new Set([...Object.keys(members), ...Object.keys(cards)])
    for (const c of COURSES) for (const k of Object.keys(ranking[c])) ids.add(k)
    const list = [...ids].map((pid) => {
      const m = members[pid]
      const c = cards[pid]
      const scores = {}
      for (const co of COURSES) if (ranking[co][pid]) scores[co] = ranking[co][pid].score
      return {
        id: pid,
        name: m?.name ?? c?.name ?? ranking[COURSES.find((co) => ranking[co][pid])]?.[pid]?.name ?? pid,
        grade: c?.grade ?? null,
        age: c?.age ?? null,
        greeting: c?.greeting ?? '',
        firstSeen: m?.firstSeen ?? null,
        lastSeen: m?.lastSeen ?? c?.at ?? null,
        visits: m?.visits ?? 0,
        online: clients.has(pid),
        admin: admins.has(pid),
        scores,
      }
    })
    list.sort((a, b) => (b.online - a.online) || ((b.lastSeen ?? 0) - (a.lastSeen ?? 0)))
    return json(res, 200, { ok: true, total: list.length, members: list })
  }

  // 쪽지 전체 열람(관리자 전용): 누가 누구에게 보낸 쪽지·선물인지 모두 보인다.
  if (route === '/api/admin/mail') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    const q = cleanId(body.who)
    let list = mail.log
    if (q) list = list.filter((m) => m.from.id === q || m.to.id === q)
    return json(res, 200, { ok: true, total: list.length, mail: list.slice(-500).reverse() })
  }

  // 스탯 · 디버프 수정 요청(관리자 전용): 당사자가 동의해야만 적용된다. 서버는 요청을 전하고 결과를 돌려줄 뿐이다.
  if (route === '/api/admin/edit/request') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    const target = clients.get(cleanId(body.target))
    if (!target) return json(res, 409, { error: 'target-offline' })
    const ch = body.changes && typeof body.changes === 'object' ? body.changes : {}
    const STATS = ['insight', 'comprehension', 'control', 'endurance', 'aggression', 'agility']
    const changes = {}
    if (ch.stats && typeof ch.stats === 'object') {
      const st = {}
      for (const k of STATS) {
        if (ch.stats[k] == null || ch.stats[k] === '') continue
        const v = Math.floor(Number(ch.stats[k]))
        if (Number.isFinite(v)) st[k] = Math.max(1, Math.min(999, v))
      }
      if (Object.keys(st).length) changes.stats = st
    }
    if (ch.clearWeak) changes.clearWeak = true
    if (ch.clearBuffs) changes.clearBuffs = true
    if (ch.refill) changes.refill = true
    if (ch.addPsychic && PSYCHICS.some((p) => p.id === ch.addPsychic && !p.default)) changes.addPsychic = ch.addPsychic
    if (ch.addSkin2048 && SKINS.some((s) => s.id === ch.addSkin2048 && s.unlock)) changes.addSkin2048 = ch.addSkin2048
    if (ch.addSkinRunner && SKINS_RUNNER.some((s) => s.id === ch.addSkinRunner && s.unlock)) changes.addSkinRunner = ch.addSkinRunner
    if (!Object.keys(changes).length) return json(res, 400, { error: 'no-changes' })
    const rid = `e${seq++}`
    const adminName = members[id]?.name ?? id
    const r = { rid, admin: id, adminName, target: target.id, targetName: target.name, changes, status: 'wait', at: Date.now() }
    editReqs.set(rid, r)
    setTimeout(() => {
      const x = editReqs.get(rid)
      if (x && x.status === 'wait') {
        x.status = 'expired'
        sendTo(x.admin, { t: 'adminEdit', ev: 'result', rid, status: 'expired', targetName: x.targetName })
        sendTo(x.target, { t: 'adminEdit', ev: 'expired', rid })
      }
      setTimeout(() => editReqs.delete(rid), 60_000)
    }, 60_000)
    sendTo(target.id, { t: 'adminEdit', ev: 'request', rid, adminName, changes, expires: Date.now() + 60_000 })
    return json(res, 200, { ok: true, rid, target: { id: target.id, name: target.name } })
  }

  // 익명 사연 심사(관리자 전용): 대기 목록 / 신문에 올리기 / 반려
  if (route === '/api/admin/stories' || route === '/api/admin/story/publish' || route === '/api/admin/story/reject') {
    const id = cleanId(body.id)
    if (!id) return json(res, 400, { error: 'bad-id' })
    if (rateLimited(`admin:${id}`)) return json(res, 429, { error: 'slow-down' })
    if (!ADMIN_KEY) return json(res, 503, { error: 'admin-disabled' })
    if (!adminOk(body.key)) return json(res, 403, { error: 'bad-key' })
    const today = kstDate()
    if (route === '/api/admin/stories') return json(res, 200, { ok: true, date: today, pending: stories.pending, published: stories.papers[today] ?? [] })
    const idx = stories.pending.findIndex((s) => s.id === body.storyId)
    if (idx < 0) return json(res, 404, { error: 'no-story' })
    const [st] = stories.pending.splice(idx, 1)
    if (route === '/api/admin/story/publish') {
      const paper = (stories.papers[today] ??= [])
      const no = paper.reduce((m, s) => Math.max(m, s.no), 0) + 1
      paper.push({ no, text: st.text, at: Date.now() })
      scheduleSave()
      return json(res, 200, { ok: true, no, date: today })
    }
    scheduleSave()
    return json(res, 200, { ok: true, rejected: true })
  }

  if (route === '/api/ranking') {
    rollWeek()
    const id = cleanId(body.id)
    const course = body.course
    const score = Number(body.score)
    if (!id || !COURSES.includes(course) || !Number.isFinite(score) || score < 0 || score > 1e9) {
      return json(res, 400, { error: 'bad-score' })
    }
    if (admins.has(id)) return json(res, 200, { ok: true, ignored: 'admin' }) // 관리자는 랭킹에 오르지 않는다
    const name = cleanName(body.name) || id
    const prev = ranking[course][id]
    const best = !prev || score > prev.score
    if (best) ranking[course][id] = { id, name, score: Math.round(score * 10) / 10, at: Date.now() }
    else if (prev.name !== name) prev.name = name
    scheduleSave()
    const all = Object.values(ranking[course]).sort((a, b) => b.score - a.score || a.at - b.at)
    return json(res, 200, { ok: true, newBest: best, rank: all.findIndex((r) => r.id === id) + 1 })
  }

  const me = requireClient(body, res)
  if (!me) return

  // 당사자의 답: 관리자의 수정 요청에 동의/거절. 동의하면 클라이언트가 자기 캐릭터에 적용한 뒤 이 답을 보낸다.
  if (route === '/api/admin/edit/respond') {
    const r = editReqs.get(String(body.rid))
    if (!r || r.target !== me.id || r.status !== 'wait') return json(res, 410, { error: 'expired' })
    r.status = body.accept ? 'accepted' : 'declined'
    sendTo(r.admin, { t: 'adminEdit', ev: 'result', rid: r.rid, status: r.status, targetName: r.targetName, changes: r.changes })
    return json(res, 200, { ok: true, status: r.status })
  }

  // 우체통: 아이템 없이 쪽지만 보내기. 접속하지 않은 사람에게도 보낼 수 있다(사물함에 쌓인다).
  if (route === '/api/mail/send') {
    const to = cleanId(body.to)
    if (!to || to === me.id || !members[to]) return json(res, 400, { error: 'no-target' })
    const text = cleanNote(body.text)
    if (!text) return json(res, 400, { error: 'empty' })
    if (text.length > MAIL_MAX) return json(res, 400, { error: 'too-long' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const m = addMail({ kind: 'note', from: { id: me.id, name: me.name }, to: { id: to, name: members[to].name }, text })
    return json(res, 200, { ok: true, id: m.id })
  }
  // 사물함: 받은 것(쪽지 · 선물)과 내가 보낸 것
  if (route === '/api/mail/box') {
    const mine = mail.log.filter((m) => m.to.id === me.id).slice(-200).reverse()
    const sent = mail.log.filter((m) => m.from.id === me.id).slice(-200).reverse()
    return json(res, 200, { ok: true, received: mine, sent })
  }
  if (route === '/api/mail/read') {
    let n = 0
    for (const m of mail.log) if (m.to.id === me.id && !m.read) (m.read = true), n++
    if (n) scheduleSave()
    return json(res, 200, { ok: true, n })
  }
  // 쪽지를 보낼 수 있는 사람 목록(서버에 접속한 적 있는 계정)
  if (route === '/api/mail/people') {
    const list = Object.values(members)
      .filter((m) => m.id !== me.id)
      .map((m) => ({ id: m.id, name: m.name, online: clients.has(m.id) }))
      .sort((a, b) => b.online - a.online || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 1000)
    return json(res, 200, { ok: true, people: list })
  }

  // 익명 사연 투고함: 접속한 사람이면 누구나. 쓴 사람은 저장하지 않는다. (남용 방지는 접속 중 횟수 제한만 한다)
  if (route === '/api/story/submit') {
    const text = typeof body.text === 'string' ? body.text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim() : ''
    if (!text) return json(res, 400, { error: 'empty' })
    if (text.length > STORY_MAX) return json(res, 400, { error: 'too-long' })
    if (stories.pending.length >= 200) return json(res, 429, { error: 'full' })
    const now = Date.now()
    const arr = (storyRate.get(me.id) ?? []).filter((t0) => now - t0 < 3600000)
    if (arr.length >= 5) return json(res, 429, { error: 'slow-down' })
    arr.push(now)
    storyRate.set(me.id, arr)
    stories.pending.push({ id: `s${stories.seq++}`, text, at: now })
    scheduleSave()
    return json(res, 200, { ok: true })
  }

  if (route === '/api/chat') {
    const channel = body.channel
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : ''
    if (!text) return json(res, 400, { error: 'empty' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    if (channel === 'rp' || channel === 'talk') {
      const msg = makeMsg(me, text)
      history[channel].push(msg)
      if (history[channel].length > HISTORY_MAX) history[channel].shift()
      broadcast({ t: 'chat', channel, msg })
      scheduleSave()
      return json(res, 200, { ok: true })
    }
    if (channel === 'party') {
      const p = parties.get(partyOf.get(me.id))
      if (!p) return json(res, 400, { error: 'no-party' })
      pushPartyMsg(p, makeMsg(me, text))
      scheduleSave()
      return json(res, 200, { ok: true })
    }
    return json(res, 400, { error: 'bad-channel' })
  }

  // 내 인적사항 카드 저장(프로필을 바꾸거나 접속할 때마다 클라이언트가 보낸다)
  if (route === '/api/card') {
    const c = body.card && typeof body.card === 'object' ? body.card : {}
    const clean = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '')
    const av = c.avatar
    let avatar = { kind: 'color', color: '#1f7a4d' }
    if (av?.kind === 'color' && typeof av.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(av.color)) avatar = { kind: 'color', color: av.color }
    else if (av?.kind === 'image' && typeof av.src === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(av.src) && av.src.length <= 250_000) avatar = { kind: 'image', src: av.src }
    const age = Number.isInteger(c.age) && c.age >= 10 && c.age <= 40 ? c.age : null
    const grade = [1, 2, 3].includes(c.grade) ? c.grade : null
    cards[me.id] = { name: clean(c.name, 12) || me.name, greeting: clean(c.greeting, 30), age, grade, avatar, at: Date.now() }
    scheduleCardsSave(me.id)
    return json(res, 200, { ok: true })
  }

  // ───────── 벼룩시장 ─────────
  if (route === '/api/market/list') {
    const item = ITEMS.find((i) => i.id === body.item)
    const qty = body.qty
    const price = body.price
    if (!item || !Number.isInteger(qty) || qty < 1 || qty > MARKET_QTY_MAX) return json(res, 400, { error: 'bad-qty' })
    if (!Number.isInteger(price) || price < 1 || price > MARKET_PRICE_MAX) return json(res, 400, { error: 'bad-price' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    if (market.listings.filter((l) => l.seller === me.id).length >= MARKET_MAX_PER_SELLER) return json(res, 400, { error: 'too-many-listings' })
    const l = { id: `m${market.seq++}`, seller: me.id, item: item.id, qty, price, at: Date.now() }
    market.listings.push(l)
    scheduleSave()
    return json(res, 200, { ok: true, id: l.id })
  }
  if (route === '/api/market/buy') {
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const i = market.listings.findIndex((l) => l.id === body.listing)
    if (i < 0) return json(res, 404, { error: 'gone' }) // 이미 팔렸거나 내려갔다
    const l = market.listings[i]
    if (l.seller === me.id) return json(res, 400, { error: 'own' })
    market.listings.splice(i, 1)
    const total = l.price * l.qty
    market.proceeds[l.seller] = (market.proceeds[l.seller] || 0) + total
    scheduleSave()
    const seller = clients.get(l.seller)
    if (seller) send(seller, { t: 'market-sold' })
    return json(res, 200, { ok: true, item: l.item, qty: l.qty, total })
  }
  if (route === '/api/market/cancel') {
    const i = market.listings.findIndex((l) => l.id === body.listing && l.seller === me.id)
    if (i < 0) return json(res, 404, { error: 'gone' })
    const [l] = market.listings.splice(i, 1)
    scheduleSave()
    return json(res, 200, { ok: true, item: l.item, qty: l.qty })
  }
  if (route === '/api/market/claim') {
    const amount = market.proceeds[me.id] || 0
    if (amount > 0) {
      delete market.proceeds[me.id]
      scheduleSave()
    }
    return json(res, 200, { ok: true, amount })
  }

  // 선물: 접속 중인 다른 사람에게 아이템을 합쳐 최대 GIFT_MAX 개까지. 돈(냥)은 보낼 수 없다.
  if (route === '/api/gift') {
    const target = clients.get(cleanId(body.to))
    if (!target || target.id === me.id) return json(res, 400, { error: 'no-target' })
    const given = body.items
    if (!given || typeof given !== 'object' || Array.isArray(given)) return json(res, 400, { error: 'bad-items' })
    const ids = new Set(ITEMS.map((i) => i.id))
    // 무구는 한 벌마다 고유 id('w-칼#꼬리'). 무구 종류의 id 와 꼬리 형식이 맞으면 통과시킨다.
    const okInstance = (k) => /^w-[a-z]+#[a-z0-9]{4,12}$/.test(k) && ids.has(k.split('#')[0])
    const clean = {}
    let total = 0
    for (const [k, v] of Object.entries(given)) {
      if (!ids.has(k) && !okInstance(k)) return json(res, 400, { error: 'items-only' }) // money 를 포함해 아이템이 아닌 건 모두 거절
      if (!Number.isInteger(v) || v < 1 || (k.includes('#') && v !== 1)) return json(res, 400, { error: 'bad-items' })
      clean[k] = v
      total += v
    }
    if (total < 1 || total > GIFT_MAX) return json(res, 400, { error: 'too-many' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    // 무구의 강화: 보내는 무구에 한해, 알려진 스탯 · 0~5 정수만 통과시킨다.
    const enh = {}
    const ENH_KEYS = ['insight', 'comprehension', 'control', 'endurance', 'aggression', 'agility']
    if (body.enh && typeof body.enh === 'object' && !Array.isArray(body.enh)) {
      for (const [wid, st] of Object.entries(body.enh)) {
        if (!clean[wid] || !okInstance(wid) || !st || typeof st !== 'object') continue
        const one = {}
        for (const k of ENH_KEYS) {
          const v = Math.floor(Number(st[k]))
          if (v >= 1) one[k] = Math.min(5, v)
        }
        if (Object.keys(one).length) enh[wid] = one
      }
    }
    const note = cleanNote(body.note)
    if (note.length > MAIL_MAX) return json(res, 400, { error: 'too-long' })
    const gift = { id: `g${seq++}`, from: { id: me.id, name: me.name }, items: clean, ...(Object.keys(enh).length ? { enh } : {}), ...(note ? { note } : {}), at: Date.now() }
    send(target, { t: 'gift', gift })
    addMail({ kind: 'gift', from: { id: me.id, name: me.name }, to: { id: target.id, name: target.name }, text: note, items: clean, ...(Object.keys(enh).length ? { enh } : {}) })
    return json(res, 200, { ok: true, giftId: gift.id, to: { id: target.id, name: target.name } })
  }


  // ───────── 동아리 ─────────
  // 가입 신청서 제출 = 그 자리에서 가입. 한 번에 한 동아리만, 탈퇴 뒤 24시간은 다른 동아리에도 못 들어간다.
  if (route === '/api/club/apply') {
    const clubId = typeof body.club === 'string' ? body.club : ''
    if (!CLUB_IDS.includes(clubId)) return json(res, 400, { error: 'bad-club' })
    if (clubOf[me.id]) return json(res, 409, { error: 'already-in-club' })
    const waited = Date.now() - (clubLeftAt[me.id] || 0)
    if (waited < CLUB_REJOIN_WAIT_MS) return json(res, 429, { error: 'rejoin-wait', waitMs: CLUB_REJOIN_WAIT_MS - waited })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const name = cleanName(body.name).slice(0, 20)
    const grade = [1, 2, 3].includes(body.grade) ? body.grade : null
    const age = Number.isInteger(body.age) && body.age >= 10 && body.age <= 40 ? body.age : null
    const hope = typeof body.hope === 'string' ? body.hope.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    if (!name) return json(res, 400, { error: 'bad-app' })
    clubs[clubId].members[me.id] = { id: me.id, name, grade, age, hope, joinedAt: Date.now() }
    clubOf[me.id] = clubId
    scheduleSave()
    return json(res, 200, { ok: true, club: clubId })
  }
  if (route === '/api/club/leave') {
    const clubId = clubOf[me.id]
    if (!clubId) return json(res, 400, { error: 'no-club' })
    const m = clubs[clubId].members[me.id]
    if (!m || Date.now() - m.joinedAt < CLUB_JOIN_LOCK_MS) return json(res, 403, { error: 'too-soon' })
    delete clubs[clubId].members[me.id]
    delete clubOf[me.id]
    clubLeftAt[me.id] = Date.now()
    scheduleSave()
    return json(res, 200, { ok: true })
  }
  // 동아리 부실을 방문하면 누구나 멤버 목록(이름·학년·나이·포부)을 열람할 수 있다. (가입 여부와 상관없이)
  if (route === '/api/club/members') {
    const clubId = typeof body.club === 'string' ? body.club : ''
    if (!CLUB_IDS.includes(clubId)) return json(res, 400, { error: 'bad-club' })
    const list = Object.values(clubs[clubId].members)
      .map((m) => ({ id: m.id, name: m.name, grade: m.grade, age: m.age, hope: m.hope, joinedAt: m.joinedAt }))
      .sort((a, b) => a.joinedAt - b.joinedAt)
    return json(res, 200, { ok: true, club: clubId, members: list })
  }
  // 동아리 채팅: 멤버만 보내고, 지금 접속해 있는 멤버에게만 실시간으로 간다(접속하면 hello 로 최근 기록을 받는다).
  if (route === '/api/club/chat') {
    const clubId = clubOf[me.id]
    if (!clubId) return json(res, 400, { error: 'no-club' })
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : ''
    if (!text) return json(res, 400, { error: 'empty' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const msg = makeMsg(me, text)
    clubChat[clubId].push(msg)
    if (clubChat[clubId].length > CLUB_CHAT_CAP) clubChat[clubId].shift()
    scheduleSave()
    for (const pid of Object.keys(clubs[clubId].members)) sendTo(pid, { t: 'clubChat', club: clubId, msg })
    return json(res, 200, { ok: true })
  }

  // ───────── 윷놀이 ─────────
  if (route === '/api/yut/invite') {
    const targets = Array.isArray(body.to) ? [...new Set(body.to.map(cleanId).filter(Boolean))].slice(0, 3) : []
    if (!targets.length || targets.includes(me.id)) return json(res, 400, { error: 'bad-target' })
    const myParty = partyOf.get(me.id)
    if (!myParty) return json(res, 403, { error: 'not-party' })
    for (const t of targets) if (!clients.has(t) || partyOf.get(t) !== myParty) return json(res, 403, { error: 'not-party' })
    if (yutBusy(me.id)) return json(res, 409, { error: 'already-in-game' })
    for (const t of targets) if (yutBusy(t)) return json(res, 409, { error: 'target-busy' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const lid = 'yl' + yutSeq++
    const lobby = { id: lid, host: me.id, invited: Object.fromEntries(targets.map((t) => [t, 'wait'])) }
    yutLobbies.set(lid, lobby)
    yutLobbyOf.set(me.id, lid)
    for (const t of targets) {
      yutLobbyOf.set(t, lid)
      sendTo(t, { t: 'yut', ev: 'invite', lid, from: { id: me.id, name: me.name } })
    }
    lobby.timer = setTimeout(() => {
      if (yutLobbies.has(lid)) yutLobbyCancel(lobby, '응답이 없어 윷놀이 신청이 취소되었다.')
    }, YUT_LOBBY_MS)
    return json(res, 200, { ok: true, lid })
  }
  if (route === '/api/yut/respond') {
    const lid = typeof body.lid === 'string' ? body.lid : ''
    const lobby = yutLobbies.get(lid)
    if (!lobby || lobby.invited[me.id] === undefined) return json(res, 400, { error: 'no-invite' })
    lobby.invited[me.id] = body.accept ? 'yes' : 'no'
    yutLobbyCheck(lobby)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yut/roll') {
    const g = yutGames.get(yutOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    if (g.players[g.turn].id !== me.id) return json(res, 403, { error: 'not-your-turn' })
    if (g.phase !== 'roll') return json(res, 400, { error: 'not-roll-phase' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const r = rollYut()
    g.throws.push(r.steps)
    g.lastRoll = { name: r.name, steps: r.steps }
    yutLog(g, `${me.name} : ${r.name}`)
    yutPruneDeadThrows(g)
    if (g.throws.length === 0 && !r.extra) {
      yutNextTurn(g)
      g.phase = 'roll'
    } else {
      g.phase = r.extra ? 'roll' : 'apply'
    }
    yutPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yut/apply') {
    const g = yutGames.get(yutOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    if (g.players[g.turn].id !== me.id) return json(res, 403, { error: 'not-your-turn' })
    if (g.phase !== 'apply') return json(res, 400, { error: 'not-apply-phase' })
    const steps = Number(body.steps)
    const i = g.throws.indexOf(steps)
    if (i < 0) return json(res, 400, { error: 'bad-throw' })
    const selector = body.target === 'start' ? 'start' : Number(body.target)
    const r = yutApply(g, selector, steps)
    if (r.error) return json(res, 400, { error: r.error })
    g.throws.splice(i, 1)
    yutAfter(g, r)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yut/choose') {
    const g = yutGames.get(yutOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    if (g.players[g.turn].id !== me.id) return json(res, 403, { error: 'not-your-turn' })
    if (g.phase !== 'branch' || !g.pendingBranch) return json(res, 400, { error: 'no-pending' })
    const pb = g.pendingBranch
    const walked = yutResumeWalk(pb.at, pb.remaining, body.choice)
    if (walked.error) return json(res, 400, { error: walked.error })
    const r = yutResolve(g, pb.idxs, walked)
    yutAfter(g, r)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yut/resign') {
    const g = yutGames.get(yutOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    yutResign(g, me.id)
    return json(res, 200, { ok: true })
  }

  // ───────── 루미큐브 ─────────
  if (route === '/api/rummi/invite') {
    const targets = Array.isArray(body.to) ? [...new Set(body.to.map(cleanId).filter(Boolean))].slice(0, 3) : []
    if (!targets.length || targets.includes(me.id)) return json(res, 400, { error: 'bad-target' })
    const myParty = partyOf.get(me.id)
    if (!myParty) return json(res, 403, { error: 'not-party' })
    for (const t of targets) if (!clients.has(t) || partyOf.get(t) !== myParty) return json(res, 403, { error: 'not-party' })
    if (rummiBusy(me.id)) return json(res, 409, { error: 'already-in-game' })
    for (const t of targets) if (rummiBusy(t)) return json(res, 409, { error: 'target-busy' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const lid = 'rl' + rummiSeq++
    const lobby = { id: lid, host: me.id, invited: Object.fromEntries(targets.map((t) => [t, 'wait'])) }
    rummiLobbies.set(lid, lobby)
    rummiLobbyOf.set(me.id, lid)
    for (const t of targets) {
      rummiLobbyOf.set(t, lid)
      sendTo(t, { t: 'rummi', ev: 'invite', lid, from: { id: me.id, name: me.name } })
    }
    lobby.timer = setTimeout(() => {
      if (rummiLobbies.has(lid)) rummiLobbyCancel(lobby, '응답이 없어 루미큐브 신청이 취소되었다.')
    }, RUMMI_LOBBY_MS)
    return json(res, 200, { ok: true, lid })
  }
  if (route === '/api/rummi/respond') {
    const lid = typeof body.lid === 'string' ? body.lid : ''
    const lobby = rummiLobbies.get(lid)
    if (!lobby || lobby.invited[me.id] === undefined) return json(res, 400, { error: 'no-invite' })
    lobby.invited[me.id] = body.accept ? 'yes' : 'no'
    rummiLobbyCheck(lobby)
    return json(res, 200, { ok: true })
  }
  // 테이블 전체를 통째로 다시 제출받는다 — 쪼개기·합치기·끼워 넣기·조커 빼내 쓰기까지 여기서 전부 검증한다.
  // body.table: [ { tiles: [tileId,...], assign?: {tileId:{color,num}} }, ... ]  (턴이 끝났을 때 테이블의 전체 모습)
  if (route === '/api/rummi/commit') {
    const g = rummiGames.get(rummiOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    const pIdx = g.players.findIndex((p) => p.id === me.id)
    if (g.turn !== pIdx) return json(res, 403, { error: 'not-your-turn' })
    const reqTable = Array.isArray(body.table) ? body.table.slice(0, 40) : []
    if (!reqTable.length && !g.table.length) return json(res, 400, { error: 'empty' })

    const hand = g.hands[pIdx]
    const handMap = new Map(hand.map((t) => [t.id, t]))
    const oldFlat = new Map()
    for (const m of g.table) for (const t of m.tiles) oldFlat.set(t.id, t)

    const usedIds = new Set()
    const resolvedMelds = []
    for (const entry of reqTable) {
      const ids = Array.isArray(entry?.tiles) ? entry.tiles.slice(0, 20) : []
      if (ids.length < 3) return json(res, 400, { error: 'bad-size' })
      const tiles = []
      let bad = false
      for (const tid of ids) {
        if (typeof tid !== 'string' || usedIds.has(tid)) { bad = true; break }
        const base = handMap.get(tid) ?? oldFlat.get(tid)
        if (!base) { bad = true; break }
        usedIds.add(tid)
        tiles.push(base)
      }
      if (bad) return json(res, 400, { error: 'bad-tile' })
      const r = rummiValidateMeld(tiles, entry?.assign || {})
      if (r.error) return json(res, 400, { error: r.error })
      resolvedMelds.push({ idSet: new Set(ids), tiles: r.tiles, kind: r.kind, value: r.value })
    }

    // 보존 확인: 그 전까지 테이블에 있던 타일은 하나도 빠짐없이(손패로 되돌릴 수 없다) 어딘가에 다시 들어 있어야 한다.
    for (const tid of oldFlat.keys()) if (!usedIds.has(tid)) return json(res, 400, { error: 'missing-tile' })

    const firstMeldDone = g.firstMeld.has(me.id)
    let newValue = 0
    if (!firstMeldDone) {
      // 첫 조합을 내기 전에는 기존 조합을 손댈 수 없다 — 전부 그대로 재등장해야 하고, 나머지(새 조합)는
      // 전부 손패에서만 와야 하며 합이 30점 이상이어야 한다.
      const oldMeldSets = g.table.map((m) => new Set(m.tiles.map((t) => t.id)))
      const matched = new Array(oldMeldSets.length).fill(false)
      const extras = []
      for (const rm of resolvedMelds) {
        const idx = oldMeldSets.findIndex((s, i) => !matched[i] && s.size === rm.idSet.size && [...s].every((x) => rm.idSet.has(x)))
        if (idx >= 0) matched[idx] = true
        else extras.push(rm)
      }
      if (matched.includes(false) || extras.some((rm) => [...rm.idSet].some((id) => oldFlat.has(id)))) {
        return json(res, 400, { error: 'need-first-meld' })
      }
      newValue = extras.reduce((s, rm) => s + rm.value, 0)
      if (newValue < FIRST_MELD_MIN) return json(res, 400, { error: 'need-30', value: newValue })
    }

    for (const tid of usedIds) {
      if (oldFlat.has(tid)) continue
      const i = hand.findIndex((h) => h.id === tid)
      if (i >= 0) hand.splice(i, 1)
    }
    g.table = resolvedMelds.map((rm) => ({ id: 'm' + g.meldSeq++, kind: rm.kind, tiles: rm.tiles }))
    if (!firstMeldDone) g.firstMeld.add(me.id)
    g.hasPlayedThisTurn = true
    g.passStreak = 0
    rummiLog(g, `${me.name} : 테이블을 정리했다.`)
    if (hand.length === 0) {
      rummiEnd(g, me.id, `${me.name}님이 루미큐브에서 패를 다 내고 이겼다!`)
      return json(res, 200, { ok: true })
    }
    rummiPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/rummi/end-turn') {
    const g = rummiGames.get(rummiOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    const pIdx = g.players.findIndex((p) => p.id === me.id)
    if (g.turn !== pIdx) return json(res, 403, { error: 'not-your-turn' })
    if (!g.hasPlayedThisTurn) {
      if (g.pool.length > 0) {
        g.hands[pIdx].push(g.pool.pop())
        rummiLog(g, `${me.name} : 패를 한 장 더 가져왔다.`)
      } else {
        rummiLog(g, `${me.name} : 낼 수 있는 조합이 없어 차례를 넘겼다.`)
      }
      g.passStreak++
    } else {
      g.passStreak = 0
    }
    const activeCount = g.players.filter((p) => !g.left.has(p.id)).length
    if (g.pool.length === 0 && g.passStreak >= activeCount) {
      rummiEndByScore(g)
      return json(res, 200, { ok: true })
    }
    rummiNextTurn(g)
    g.hasPlayedThisTurn = false
    rummiPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/rummi/resign') {
    const g = rummiGames.get(rummiOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    rummiResign(g, me.id)
    return json(res, 200, { ok: true })
  }

  // ───────── 요트 다이스 ─────────
  if (route === '/api/yacht/invite') {
    const targets = Array.isArray(body.to) ? [...new Set(body.to.map(cleanId).filter(Boolean))].slice(0, 3) : []
    if (!targets.length || targets.includes(me.id)) return json(res, 400, { error: 'bad-target' })
    const myParty = partyOf.get(me.id)
    if (!myParty) return json(res, 403, { error: 'not-party' })
    for (const t of targets) if (!clients.has(t) || partyOf.get(t) !== myParty) return json(res, 403, { error: 'not-party' })
    if (yachtBusy(me.id)) return json(res, 409, { error: 'already-in-game' })
    for (const t of targets) if (yachtBusy(t)) return json(res, 409, { error: 'target-busy' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const lid = 'ylb' + yachtSeq++
    const lobby = { id: lid, host: me.id, invited: Object.fromEntries(targets.map((t) => [t, 'wait'])) }
    yachtLobbies.set(lid, lobby)
    yachtLobbyOf.set(me.id, lid)
    for (const t of targets) {
      yachtLobbyOf.set(t, lid)
      sendTo(t, { t: 'yacht', ev: 'invite', lid, from: { id: me.id, name: me.name } })
    }
    lobby.timer = setTimeout(() => {
      if (yachtLobbies.has(lid)) yachtLobbyCancel(lobby, '응답이 없어 요트 다이스 신청이 취소되었다.')
    }, YACHT_LOBBY_MS)
    return json(res, 200, { ok: true, lid })
  }
  if (route === '/api/yacht/respond') {
    const lid = typeof body.lid === 'string' ? body.lid : ''
    const lobby = yachtLobbies.get(lid)
    if (!lobby || lobby.invited[me.id] === undefined) return json(res, 400, { error: 'no-invite' })
    lobby.invited[me.id] = body.accept ? 'yes' : 'no'
    yachtLobbyCheck(lobby)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yacht/roll') {
    const g = yachtGames.get(yachtOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    if (g.players[g.turn].id !== me.id) return json(res, 403, { error: 'not-your-turn' })
    if (g.rollsLeft <= 0) return json(res, 400, { error: 'no-rolls-left' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const keep = Array.isArray(body.keep) ? body.keep.slice(0, 5).map(Boolean) : []
    g.dice = yachtRollDice(g.dice, keep)
    g.rollsLeft--
    yachtLog(g, `${me.name} : ${g.dice.join(' ')}`)
    yachtPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yacht/score') {
    const g = yachtGames.get(yachtOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    const pIdx = g.players.findIndex((p) => p.id === me.id)
    if (g.turn !== pIdx) return json(res, 403, { error: 'not-your-turn' })
    if (g.rollsLeft >= 3) return json(res, 400, { error: 'must-roll-first' })
    const cat = typeof body.category === 'string' ? body.category : ''
    if (!yachtIsCategory(cat)) return json(res, 400, { error: 'bad-category' })
    if (g.scorecards[pIdx][cat] != null) return json(res, 400, { error: 'already-filled' })
    const score = yachtScoreFor(cat, g.dice)
    g.scorecards[pIdx][cat] = score
    yachtLog(g, `${me.name} : ${YACHT_CATEGORIES.find((c) => c.id === cat)?.label ?? cat} = ${score}점`)
    g.dice = [0, 0, 0, 0, 0]
    g.rollsLeft = YACHT_MAX_ROLLS
    const allFull = g.players.every((p) => g.left.has(p.id) || yachtIsFull(g.scorecards[g.players.findIndex((pp) => pp.id === p.id)]))
    if (allFull) {
      yachtEndByScore(g)
      return json(res, 200, { ok: true })
    }
    yachtNextTurn(g)
    yachtPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/yacht/resign') {
    const g = yachtGames.get(yachtOf.get(me.id))
    if (!g || g.phase === 'over') return json(res, 400, { error: 'no-game' })
    yachtResign(g, me.id)
    return json(res, 200, { ok: true })
  }

  // ───────── 오목 ─────────
  if (route === '/api/omok/invite') {
    const to = cleanId(body.to)
    if (!to || to === me.id) return json(res, 400, { error: 'bad-target' })
    if (!clients.has(to)) return json(res, 404, { error: 'offline' })
    const myParty = partyOf.get(me.id)
    if (!myParty || partyOf.get(to) !== myParty) return json(res, 403, { error: 'not-party' })
    if (omokOf.has(me.id)) return json(res, 409, { error: 'already-in-game' })
    if (omokOf.has(to)) return json(res, 409, { error: 'target-busy' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    omokInvites.set(to, { from: me.id, at: Date.now() })
    sendTo(to, { t: 'omok', ev: 'invite', from: { id: me.id, name: me.name } })
    return json(res, 200, { ok: true })
  }
  if (route === '/api/omok/respond') {
    const fromId = cleanId(body.from)
    const inv = omokInvites.get(me.id)
    if (!inv || inv.from !== fromId) return json(res, 400, { error: 'no-invite' })
    omokInvites.delete(me.id)
    if (!body.accept) {
      sendTo(fromId, { t: 'omok', ev: 'declined', from: { id: me.id, name: me.name } })
      return json(res, 200, { ok: true })
    }
    if (!clients.has(fromId) || omokOf.has(me.id) || omokOf.has(fromId)) return json(res, 409, { error: 'unavailable' })
    const gid = 'om' + omokSeq++
    const g = { id: gid, players: [fromId, me.id], board: emptyBoard(OMOK_SIZE), turn: 0, winner: null, win: null, phase: 'play' }
    omoks.set(gid, g)
    omokOf.set(fromId, gid)
    omokOf.set(me.id, gid)
    for (const id of g.players) sendTo(id, { t: 'omok', ev: 'start', ...omokView(g) })
    return json(res, 200, { ok: true, gid })
  }
  if (route === '/api/omok/move') {
    const g = omoks.get(omokOf.get(me.id))
    if (!g || g.phase !== 'play') return json(res, 400, { error: 'no-game' })
    const turnIdx = g.players.indexOf(me.id)
    if (g.turn !== turnIdx) return json(res, 403, { error: 'not-your-turn' })
    const x = Math.floor(Number(body.x))
    const y = Math.floor(Number(body.y))
    const r = placeStone(g.board, OMOK_SIZE, x, y, turnIdx)
    if (r.error) return json(res, 400, { error: r.error })
    g.board = r.board
    if (r.win) {
      g.win = r.win
      omokEnd(g, me.id)
      return json(res, 200, { ok: true })
    }
    g.turn = 1 - g.turn
    omokPush(g)
    return json(res, 200, { ok: true })
  }
  if (route === '/api/omok/resign') {
    const g = omoks.get(omokOf.get(me.id))
    if (!g || g.phase !== 'play') return json(res, 400, { error: 'no-game' })
    const other = g.players.find((p) => p !== me.id)
    omokEnd(g, other, `${me.name}님이 오목을 포기했다.`)
    return json(res, 200, { ok: true })
  }

  // ───────── 다인 전투 ─────────
  if (route === '/api/mb/start') {
    const enemy = ENEMIES.find((e) => e.id === body.enemy)
    if (!enemy || !MB.isMulti(enemy)) return json(res, 400, { error: 'not-multi' })
    if (mbOf.has(me.id)) return json(res, 409, { error: 'already-in-battle' })
    const p = parties.get(partyOf.get(me.id))
    const mates = p ? p.members.filter((m) => m !== me.id && clients.has(m)) : []
    if (!mates.length) return json(res, 409, { error: 'need-party' })
    if (p.members[0] !== me.id) return json(res, 403, { error: 'not-leader' }) // 파티장만 다인 · 보스 전투를 신청할 수 있다
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const free = mates.filter((m) => !mbOf.has(m))
    if (!free.length) return json(res, 409, { error: 'mates-busy' })
    const g = { id: `b${mbSeq++}`, host: me.id, enemyId: enemy.id, phase: 'lobby', invited: Object.fromEntries(free.map((m) => [m, 'wait'])), joins: { [me.id]: mbInfo(me, body.me) }, mb: null, timer: null, deadline: null }
    mbs.set(g.id, g)
    mbOf.set(me.id, g.id)
    for (const m of free) {
      mbOf.set(m, g.id)
      sendTo(m, { t: 'mb', ev: 'invite', bid: g.id, from: { id: me.id, name: me.name }, enemy: { id: enemy.id, name: enemy.name, boss: !!enemy.boss }, expires: Date.now() + MB_LOBBY_MS })
    }
    g.timer = setTimeout(() => {
      for (const id of Object.keys(g.invited)) if (g.invited[id] === 'wait') g.invited[id] = 'no'
      mbLobbyCheck(g)
    }, MB_LOBBY_MS)
    mbLobbyCheck(g)
    return json(res, 200, { ok: true, bid: g.id, invited: free.length })
  }

  if (route === '/api/mb/respond') {
    const g = mbs.get(body.bid)
    if (!g || g.phase !== 'lobby' || g.invited[me.id] !== 'wait') return json(res, 410, { error: 'expired' })
    if (body.accept) {
      g.invited[me.id] = 'yes'
      g.joins[me.id] = mbInfo(me, body.me)
    } else {
      g.invited[me.id] = 'no'
      mbOf.delete(me.id)
      sendTo(g.host, { t: 'notice', text: `${me.name}님이 ${ENEMIES.find((e) => e.id === g.enemyId)?.name} 전투 초대를 거절했다.` })
    }
    mbLobbyCheck(g)
    return json(res, 200, { ok: true })
  }

  if (route === '/api/mb/cancel') {
    const g = mbs.get(body.bid)
    if (!g || g.phase !== 'lobby' || g.host !== me.id) return json(res, 410, { error: 'expired' })
    for (const i of Object.keys(g.invited)) sendTo(i, { t: 'mb', ev: 'closed', bid: g.id })
    sendTo(me.id, { t: 'mb', ev: 'cancel', bid: g.id, reason: '전투 초대를 취소했다.' })
    mbClear(g, [g.host, ...Object.keys(g.invited)])
    mbs.delete(g.id)
    return json(res, 200, { ok: true })
  }

  if (route === '/api/mb/act') {
    const g = mbs.get(body.bid)
    if (!g || g.phase !== 'fight') return json(res, 410, { error: 'expired' })
    const r = MB.submit(g.mb, me.id, body.act)
    if (r.error) return json(res, 409, r)
    if (MB.ready(g.mb)) mbStep(g)
    else mbPush(g)
    return json(res, 200, { ok: true })
  }

  if (route === '/api/mb/survive') {
    const g = mbs.get(body.bid)
    if (!g || g.phase !== 'fight') return json(res, 410, { error: 'expired' })
    const r = MB.survive(g.mb, me.id, !!body.accept)
    if (r.error) return json(res, 409, r)
    if (g.mb.phase === 'survive') mbPush(g)
    else mbAfter(g)
    return json(res, 200, { ok: true })
  }

  if (route === '/api/mb/item') {
    const g = mbs.get(body.bid)
    if (!g || g.phase !== 'fight') return json(res, 410, { error: 'expired' })
    const item = ITEMS.find((i) => i.id === body.item)
    const r = MB.useItemMB(g.mb, me.id, item, cleanId(body.to) || me.id)
    if (r.error) return json(res, 409, r)
    if (MB.ready(g.mb)) mbStep(g)
    else mbPush(g)
    return json(res, 200, { ok: true })
  }

  if (route === '/api/party/invite') {
    const target = clients.get(cleanId(body.to))
    if (!target || target.id === me.id) return json(res, 400, { error: 'no-target' })
    if (partyOf.has(target.id)) return json(res, 409, { error: 'target-in-party' })
    invites.set(target.id, { fromId: me.id, at: Date.now() })
    send(target, { t: 'invite', from: { id: me.id, name: me.name } })
    return json(res, 200, { ok: true })
  }

  if (route === '/api/party/respond') {
    const inv = invites.get(me.id)
    if (!inv || Date.now() - inv.at > INVITE_TTL_MS) {
      invites.delete(me.id)
      return json(res, 410, { error: 'expired' })
    }
    invites.delete(me.id)
    const from = clients.get(inv.fromId)
    if (!body.accept) {
      if (from) send(from, { t: 'notice', text: `${me.name}님이 일행 초대를 거절했다.` })
      return json(res, 200, { ok: true })
    }
    if (!from) return json(res, 410, { error: 'inviter-gone' })
    if (partyOf.has(me.id)) return json(res, 409, { error: 'already-in-party' })
    let p = parties.get(partyOf.get(from.id))
    const presenceChanged = [me.id]
    if (!p) {
      p = { id: `p${seq++}`, members: [from.id], log: [] }
      parties.set(p.id, p)
      partyOf.set(from.id, p.id)
      presenceChanged.push(from.id)
    }
    p.members.push(me.id)
    partyOf.set(me.id, p.id)
    pushPartyMsg(p, makeMsg(null, `${me.name}님이 일행으로 합류했다.`, { system: true }))
    pushParty(p)
    pushPresence({ update: presenceChanged.map(presenceEntry).filter(Boolean) })
    scheduleSave()
    return json(res, 200, { ok: true })
  }

  if (route === '/api/party/leave') {
    leaveParty(me.id)
    return json(res, 200, { ok: true })
  }

  // 파티장 전용: 인원이 몇 명이든 일행을 바로 해체한다.
  if (route === '/api/party/disband') {
    const pid = partyOf.get(me.id)
    const p = pid ? parties.get(pid) : null
    if (!p) return json(res, 409, { error: 'no-party' })
    if (p.members[0] !== me.id) return json(res, 403, { error: 'not-leader' })
    disbandParty(p)
    return json(res, 200, { ok: true })
  }

  // 일행 중일 때: 체력·영력·의지력·육조 스탯·장비를 일행에게 알린다. (인적사항 밑에서 보여 주는 용도, 재시작 땐 안 남아도 된다)
  if (route === '/api/party/stats') {
    const pid = partyOf.get(me.id)
    if (!pid) return json(res, 200, { ok: true }) // 일행이 아니면 조용히 무시(클라이언트가 늦게 알아도 그만)
    const s = body.stats && typeof body.stats === 'object' ? body.stats : {}
    const num = (v, max = 999999) => (Number.isFinite(v) && v >= 0 && v <= max ? v : 0)
    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, num(s.stats?.[k], 999)]))
    const equip = { weapon: null, body: null, trinket: null }
    if (s.equip && typeof s.equip === 'object') {
      for (const slot of ['weapon', 'body', 'trinket']) {
        const v = s.equip[slot]
        if (typeof v === 'string' && v.length <= 80) equip[slot] = v
      }
    }
    partyStats.set(me.id, {
      hp: num(s.hp),
      hpMax: num(s.hpMax),
      mp: num(s.mp),
      mpMax: num(s.mpMax),
      spirit: num(s.spirit),
      stats,
      equip,
      at: Date.now(),
    })
    const p = parties.get(pid)
    if (p) {
      for (const id of p.members) {
        if (id !== me.id) sendTo(id, { t: 'partyMemberStats', id: me.id, stats: partyStats.get(me.id) })
      }
    }
    return json(res, 200, { ok: true })
  }

  return json(res, 404, { error: 'not-found' })
}

// ───────── 정적 파일 (빌드 결과) ─────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname)
  if (rel.endsWith('/')) rel += 'index.html'
  let file = path.join(DIST, rel)
  if (!file.startsWith(DIST)) return json(res, 403, { error: 'forbidden' })
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('dist 가 없습니다. 먼저 `npm run build` 를 실행하세요.')
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => {
      console.error(e)
      if (!res.headersSent) json(res, 500, { error: 'server-error' })
    })
  } else {
    serveStatic(req, res, url)
  }
})
rollWeek() // 서버가 꺼져 있던 사이에 월요일이 지났다면 지금 리셋한다.
setInterval(() => rollWeek(), 30_000) // 월요일 0시를 넘기면 사람이 없어도 리셋된다.
server.listen(PORT, () => console.log(`초록동색 서버: http://localhost:${PORT}  (저장소: ${db ? 'Supabase' : DATA_FILE})`))

// Render 는 재배포 · 재시작 직전에 SIGTERM 을 보낸다. 아직 안 쓴 기록이 있으면 마저 저장하고 끈다.
let shuttingDown = false
async function shutdown(sig) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${sig} 수신: 기록을 저장하고 종료합니다.`)
  clearTimeout(saveTimer)
  if (dirty || saveTimer) {
    try {
      await saveNow()
    } catch (e) {
      console.error('종료 전 저장 실패:', e.message)
    }
  }
  try {
    accounts.flush()
  } catch (e) {
    console.error('계정 파일 저장 실패:', e.message)
  }
  await db?.end().catch(() => {})
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// 어딘가에서 예외를 못 잡고 흘렸다고 해서 접속해 있는 모두의 연결이 통째로 끊기면 안 된다.
// 로그만 남기고 서버는 계속 돌린다(이미 깨진 요청 하나는 응답을 못 받겠지만, 그게 전체가 죽는 것보단 낫다).
process.on('uncaughtException', (e) => console.error('uncaughtException:', e))
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e))
