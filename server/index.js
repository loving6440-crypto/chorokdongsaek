// 초록동색 온라인 서버: 채팅(연락/담화/일행) · 일행(파티) · 랭킹.
// 외부 패키지 없이 Node 내장 모듈만 쓴다. (Node 18+)
//  - 서버 → 클라이언트: SSE (GET /api/events)
//  - 클라이언트 → 서버: JSON POST
// 실행:  npm run build && npm start      (기본 포트 8787, PORT 환경변수로 변경)
// 개발:  npm run server  +  npm run dev  (vite 가 /api 를 이 서버로 프록시한다)

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITEMS } from '../src/game/items.js'
import { ENEMIES } from '../src/game/battle.js'
import * as MB from '../src/game/mbattle.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GIFT_MAX = 5
const PORT = Number(process.env.PORT) || 8787
const DIST = process.env.CHOROK_DIST ? path.resolve(process.env.CHOROK_DIST) : path.resolve(__dirname, '../dist')
const DATA_FILE = process.env.CHOROK_DATA || path.join(__dirname, 'data.json')
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
let members = {} // 회원 명부: { [id]: { id, name, firstSeen, lastSeen, visits } } — 서버에 접속한 적 있는 모든 계정
let market = { seq: 1, listings: [], proceeds: {} } // listings: [{ id, seller, item, qty, price(1개당), at }]

// ───────── 영속 데이터(랭킹 · 벼룩시장) ─────────
let ranking = Object.fromEntries(COURSES.map((c) => [c, {}])) // { course: { [playerId]: { id, name, score, at } } }
try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  for (const c of COURSES) if (raw?.ranking?.[c]) ranking[c] = raw.ranking[c]
  if (raw?.cards && typeof raw.cards === 'object') cards = raw.cards
  if (raw?.members && typeof raw.members === 'object') members = raw.members
  if (raw?.market && Array.isArray(raw.market.listings)) market = { seq: raw.market.seq || 1, listings: raw.market.listings, proceeds: raw.market.proceeds ?? {} }
} catch {
  /* 첫 실행이면 빈 랭킹으로 시작 */
}
let saveTimer = null
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ ranking, market, cards, members }, null, 1))
    } catch (e) {
      console.error('랭킹 저장 실패:', e.message)
    }
  }, 400)
}

// ───────── 접속 상태(메모리) ─────────
const clients = new Map() // id → { id, name, res, joinedAt }
const history = { rp: [], talk: [] }
const parties = new Map() // partyId → { id, members: [id], log: [] }
const partyOf = new Map() // playerId → partyId
const invites = new Map() // inviteeId → { fromId, at }
const rate = new Map() // id → [timestamps]
let seq = 1

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
const partyView = (p) =>
  p && {
    id: p.id,
    members: p.members.map((id) => ({ id, name: clients.get(id)?.name ?? id, title: clients.get(id)?.title, online: clients.has(id) })),
  }
const pushParty = (p) => p.members.forEach((id) => sendTo(id, { t: 'party', party: partyView(p), log: p.log }))
const pushPresence = () => broadcast({ t: 'presence', online: onlineList() })

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
  if (!p) return
  const name = clients.get(id)?.name ?? id
  p.members = p.members.filter((m) => m !== id)
  sendTo(id, { t: 'party', party: null, log: [] })
  if (p.members.length <= 1) {
    // 혼자 남으면 일행은 해산한다.
    p.members.forEach((m) => {
      partyOf.delete(m)
      sendTo(m, { t: 'party', party: null, log: [] })
      sendTo(m, { t: 'notice', text: `${name}님이 일행을 ${reason === 'drop' ? '떠났다' : '떠나 일행이 해산되었다'}.` })
    })
    parties.delete(pid)
  } else {
    pushPartyMsg(p, makeMsg(null, `${name}님이 일행을 떠났다.`, { system: true }))
    pushParty(p)
  }
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
  MB.resolveRound(g.mb)
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
  g.mb = MB.createMB(g.enemyId, infos)
  MB.openingInitiative(g.mb)
  if (g.mb.phase === 'input' && !g.mb.members.some((m) => m.act)) MB.beginRound(g.mb)
  mbAfter(g)
}
function mbLobbyCheck(g) {
  if (g.phase !== 'lobby') return
  if (Object.values(g.invited).every((v) => v !== 'wait')) mbStart(g)
  else {
    for (const id of [g.host]) sendTo(id, { t: 'mb', ev: 'lobby', bid: g.id, enemyId: g.enemyId, waiting: Object.keys(g.invited).filter((i) => g.invited[i] === 'wait').map((i) => clients.get(i)?.name ?? i), joined: Object.keys(g.joins).map((i) => clients.get(i)?.name ?? i) })
  }
}
const mbInfo = (c, me) => ({ id: c.id, name: c.name, stats: me?.stats, hp: me?.hp, hpMax: me?.hpMax, mp: me?.mp, mpMax: me?.mpMax, revive: !!me?.revive, boost: !!me?.boost })
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
const cleanId = (v) => (typeof v === 'string' && /^[a-zA-Z0-9가-힣_]{1,40}$/.test(v) ? v : null)
const cleanName = (v) => (typeof v === 'string' ? v.replace(/[\r\n\t]/g, ' ').trim().slice(0, 24) : '')
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

  if (req.method === 'GET' && route === '/api/health') return json(res, 200, { ok: true, online: clients.size })

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
      mb: (() => {
        const g = mbs.get(mbOf.get(id))
        return g?.mb && g.phase === 'fight' ? { bid: g.id, view: MB.viewOf(g.mb, { deadline: g.deadline }) } : null
      })(),
    })
    if (party) pushParty(party)
    pushPresence()
    const ping = setInterval(() => res.write(': ping\n\n'), 20_000)
    req.on('close', () => {
      clearInterval(ping)
      if (clients.get(id) === client) {
        clients.delete(id)
        invites.delete(id)
        mbDisconnect(id)
        // 잠깐의 재연결은 일행을 유지하고, 오래 안 돌아오면 일행에서 뺀다.
        setTimeout(() => {
          if (!clients.has(id)) leaveParty(id, 'drop')
        }, 30_000)
        pushPresence()
      }
    })
    return
  }

  if (req.method === 'GET' && route.startsWith('/api/ranking/')) {
    const course = route.slice('/api/ranking/'.length)
    if (!COURSES.includes(course)) return json(res, 404, { error: 'unknown-course' })
    const me = cleanId(url.searchParams.get('id'))
    const mine = me ? ranking[course][me] : null
    const all = Object.values(ranking[course]).sort((a, b) => b.score - a.score || a.at - b.at)
    return json(res, 200, {
      course,
      top: topOf(course),
      me: mine ? { score: mine.score, rank: all.findIndex((r) => r.id === me) + 1 } : null,
      total: all.length,
    })
  }

  if (req.method !== 'POST') return json(res, 404, { error: 'not-found' })
  const body = await readBody(req, route === '/api/card' ? 400_000 : 10_000)
  if (!body) return json(res, 400, { error: 'bad-json' })

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

  if (route === '/api/ranking') {
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
      return json(res, 200, { ok: true })
    }
    if (channel === 'party') {
      const p = parties.get(partyOf.get(me.id))
      if (!p) return json(res, 400, { error: 'no-party' })
      pushPartyMsg(p, makeMsg(me, text))
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
    scheduleSave()
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
    const clean = {}
    let total = 0
    for (const [k, v] of Object.entries(given)) {
      if (!ids.has(k)) return json(res, 400, { error: 'items-only' }) // money 를 포함해 아이템이 아닌 건 모두 거절
      if (!Number.isInteger(v) || v < 1) return json(res, 400, { error: 'bad-items' })
      clean[k] = v
      total += v
    }
    if (total < 1 || total > GIFT_MAX) return json(res, 400, { error: 'too-many' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const gift = { id: `g${seq++}`, from: { id: me.id, name: me.name }, items: clean, at: Date.now() }
    send(target, { t: 'gift', gift })
    return json(res, 200, { ok: true, giftId: gift.id, to: { id: target.id, name: target.name } })
  }


  // ───────── 다인 전투 ─────────
  if (route === '/api/mb/start') {
    const enemy = ENEMIES.find((e) => e.id === body.enemy)
    if (!enemy || !MB.isMulti(enemy)) return json(res, 400, { error: 'not-multi' })
    if (mbOf.has(me.id)) return json(res, 409, { error: 'already-in-battle' })
    const p = parties.get(partyOf.get(me.id))
    const mates = p ? p.members.filter((m) => m !== me.id && clients.has(m)) : []
    if (!mates.length) return json(res, 409, { error: 'need-party' })
    if (rateLimited(me.id)) return json(res, 429, { error: 'slow-down' })
    const free = mates.filter((m) => !mbOf.has(m))
    if (!free.length) return json(res, 409, { error: 'mates-busy' })
    const g = { id: `b${mbSeq++}`, host: me.id, enemyId: enemy.id, phase: 'lobby', invited: Object.fromEntries(free.map((m) => [m, 'wait'])), joins: { [me.id]: mbInfo(me, body.me) }, mb: null, timer: null, deadline: null }
    mbs.set(g.id, g)
    mbOf.set(me.id, g.id)
    for (const m of free) {
      mbOf.set(m, g.id)
      sendTo(m, { t: 'mb', ev: 'invite', bid: g.id, from: { id: me.id, name: me.name }, enemy: { id: enemy.id, name: enemy.name }, expires: Date.now() + MB_LOBBY_MS })
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
    mbPush(g)
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
    if (!p) {
      p = { id: `p${seq++}`, members: [from.id], log: [] }
      parties.set(p.id, p)
      partyOf.set(from.id, p.id)
    }
    p.members.push(me.id)
    partyOf.set(me.id, p.id)
    pushPartyMsg(p, makeMsg(null, `${me.name}님이 일행으로 합류했다.`, { system: true }))
    pushParty(p)
    pushPresence()
    return json(res, 200, { ok: true })
  }

  if (route === '/api/party/leave') {
    leaveParty(me.id)
    pushPresence()
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
server.listen(PORT, () => console.log(`초록동색 서버: http://localhost:${PORT}  (랭킹 파일: ${DATA_FILE})`))
