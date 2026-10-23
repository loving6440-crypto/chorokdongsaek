// 온라인 서버 연결(SSE) 과 그 상태 저장소. React 에서는 useOnline() 으로 읽는다.
// 서버가 없으면 status 가 'offline' 으로 남고, 게임의 나머지 부분은 그대로 동작한다.
import { useSyncExternalStore } from 'react'

const HISTORY_MAX = 100

let state = {
  status: 'offline', // offline | connecting | online
  me: null, // { id, name }
  online: [], // [{ id, name, partyId }]
  history: { rp: [], talk: [], party: [] },
  unread: { rp: 0, talk: 0, party: 0 },
  party: null, // { id, members: [{ id, name, online }] }
  invite: null, // { from: { id, name } }
  notices: [], // [{ id, text }]
}
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const set = (patch) => {
  state = { ...state, ...patch }
  emit()
}

const seenGifts = new Set()
const giftListeners = new Set()
const soldListeners = new Set()
let source = null
let noticeSeq = 1
let activeChannel = null // 지금 화면에 열려 있는 채팅 탭 (안 읽음 계산용)

const pushNotice = (text) =>
  set({ notices: [...state.notices, { id: noticeSeq++, text }].slice(-5) })

const cap = (arr) => (arr.length > HISTORY_MAX ? arr.slice(-HISTORY_MAX) : arr)

function handle(ev) {
  switch (ev.t) {
    case 'hello':
      set({
        status: 'online',
        me: ev.you,
        online: ev.online,
        history: { rp: ev.history.rp, talk: ev.history.talk, party: ev.partyLog ?? [] },
        party: ev.party ?? null,
      })
      break
    case 'presence':
      set({ online: ev.online })
      break
    case 'chat': {
      const ch = ev.channel
      const history = { ...state.history, [ch]: cap([...state.history[ch], ev.msg]) }
      const mine = ev.msg.from?.id === state.me?.id
      const unread =
        activeChannel === ch || mine ? state.unread : { ...state.unread, [ch]: state.unread[ch] + 1 }
      set({ history, unread })
      break
    }
    case 'party':
      set({ party: ev.party, history: { ...state.history, party: ev.party ? (ev.log ?? state.history.party) : [] } })
      break
    case 'invite':
      set({ invite: { from: ev.from } })
      break
    case 'notice':
      pushNotice(ev.text)
      break
    case 'gift':
      if (!seenGifts.has(ev.gift.id)) {
        seenGifts.add(ev.gift.id)
        giftListeners.forEach((l) => l(ev.gift))
      }
      break
    case 'market-sold':
      soldListeners.forEach((l) => l())
      break
    default:
  }
}

export function connect(id, name, key = '') {
  if (typeof EventSource === 'undefined') return
  if (source && state.me?.id === id && state.me?.name === name && state.status !== 'offline') return
  disconnect()
  set({ status: 'connecting', me: { id, name } })
  const es = new EventSource(`/api/events?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}${key ? `&key=${encodeURIComponent(key)}` : ''}`)
  source = es
  es.onmessage = (e) => {
    try {
      handle(JSON.parse(e.data))
    } catch {
      /* 깨진 프레임은 무시 */
    }
  }
  // 연결이 끊기면 브라우저가 자동으로 다시 붙는다. 그동안은 연결 중으로 표시한다.
  es.onerror = () => set({ status: es.readyState === EventSource.CLOSED ? 'offline' : 'connecting' })
}

export function disconnect() {
  if (source) source.close()
  source = null
  set({
    status: 'offline',
    me: null,
    online: [],
    party: null,
    invite: null,
    history: { rp: [], talk: [], party: [] },
    unread: { rp: 0, talk: 0, party: 0 },
  })
}

export function setActiveChannel(ch) {
  activeChannel = ch
  if (ch && state.unread[ch]) set({ unread: { ...state.unread, [ch]: 0 } })
}

export function dismissNotice(id) {
  set({ notices: state.notices.filter((n) => n.id !== id) })
}

async function post(path, body) {
  try {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: state.me?.id, ...body }),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok, status: r.status, ...data }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  }
}

export const sendChat = (channel, text) => post('/api/chat', { channel, text })

export async function inviteToParty(toId) {
  const r = await post('/api/party/invite', { to: toId })
  if (!r.ok) pushNotice(r.error === 'target-in-party' ? '그 사람은 이미 다른 일행에 속해 있다.' : '초대를 보내지 못했다.')
  else pushNotice('일행 초대를 보냈다.')
  return r
}

export async function respondInvite(accept) {
  set({ invite: null })
  const r = await post('/api/party/respond', { accept })
  if (!r.ok && r.error === 'expired') pushNotice('초대가 만료되었다.')
  return r
}

export const notify = pushNotice

/** 선물이 도착하면 cb(gift) 를 부른다. 돌려주는 함수로 해제. */
export function onGift(cb) {
  giftListeners.add(cb)
  return () => giftListeners.delete(cb)
}

/** 선물 보내기. 상대가 접속 중이어야 하고, 아이템만 합쳐 최대 5개. (돈은 서버가 거절한다.) */
export const sendGift = (toId, items) => post('/api/gift', { to: toId, items })

// ───────── 벼룩시장 ─────────
/** 내 물건이 팔렸다는 알림이 오면 cb() 를 부른다. */
export function onMarketSold(cb) {
  soldListeners.add(cb)
  return () => soldListeners.delete(cb)
}
export async function marketFetch() {
  try {
    const r = await fetch(`/api/market?id=${encodeURIComponent(state.me?.id ?? '')}`)
    if (!r.ok) return { ok: false, status: r.status }
    return await r.json()
  } catch {
    return { ok: false, status: 0 }
  }
}
export const marketList = (item, qty, price) => post('/api/market/list', { item, qty, price })
export const marketBuy = (listing) => post('/api/market/buy', { listing })
export const marketCancel = (listing) => post('/api/market/cancel', { listing })
export const marketClaim = () => post('/api/market/claim', {})

export const leaveParty = () => post('/api/party/leave', {})

// ───────── 랭킹 ─────────
export async function fetchRanking(course, id) {
  try {
    const r = await fetch(`/api/ranking/${course}?id=${encodeURIComponent(id ?? '')}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function submitScore(course, id, name, score) {
  try {
    const r = await fetch('/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, course, score }),
    })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/** 관리자 키를 서버에 확인한다. { ok, error } — error: bad-key | admin-disabled | slow-down | network */
export async function verifyAdminKey(id, key) {
  try {
    const r = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, key }),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok && !!data.ok, error: data.error ?? (r.ok ? undefined : 'network') }
  } catch {
    return { ok: false, error: 'network' }
  }
}
