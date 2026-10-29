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
  mb: null, // 진행 중인 다인 전투 { bid, view }
  mbInvite: null, // { bid, from, enemy, expires } — 다인 전투 초대를 받았다
  mbLobby: null, // { bid, enemyId, waiting, joined } — 내가 건 다인 전투에서 응답을 기다리는 중
  mailUnread: 0, // 사물함에서 아직 안 읽은 쪽지 · 선물 수
  mailTick: 0, // 새 쪽지가 올 때마다 +1 (열려 있는 사물함이 다시 불러오는 신호)
  bgmPlaylist: [], // 관리자가 올린 배경음악(평소 곡) 재생목록: [{ id: 유튜브 영상ID, title }]. 비어 있으면 로컬 mp3.
  editReq: null, // 관리자의 스탯 · 디버프 수정 요청(동의 대기) { rid, adminName, changes, expires }
  editResult: null, // 내가 관리자일 때 받은 결과 { rid, status, targetName }
  club: null, // 내가 속한 동아리 { id, joinedAt, log: [...] } (없으면 null)
  omok: null, // 진행 중인 오목 { gid, size, board, turn, players, winner, win }
  omokInvite: null, // { from: { id, name } } — 오목 신청을 받았다
  yut: null, // 진행 중인 윷놀이 { gid, players, pieces, left, turn, phase, throws, pendingBranch, lastRoll, winner, log }
  yutInvite: null, // { lid, from: { id, name } } — 윷놀이 신청을 받았다
  yutLobby: null, // { lid, waiting: [names] } — 내가 건 윷놀이 신청에서 응답을 기다리는 중
  rummi: null, // 진행 중인 루미큐브 { gid, players, counts, hand, poolLeft, table, turn, hasPlayed, firstMeld, left, winner, log }
  rummiInvite: null, // { lid, from: { id, name } } — 루미큐브 신청을 받았다
  rummiLobby: null, // { lid, waiting: [names] } — 내가 건 루미큐브 신청에서 응답을 기다리는 중
  yacht: null, // 진행 중인 요트 다이스 { gid, players, scorecards, dice, rollsLeft, turn, left, winner, tie, log }
  yachtInvite: null, // { lid, from: { id, name } } — 요트 다이스 신청을 받았다
  yachtLobby: null, // { lid, waiting: [names] } — 내가 건 요트 다이스 신청에서 응답을 기다리는 중
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

const pushNotice = (text) => {
  const id = noticeSeq++
  const notice = { id, text }
  const msg = { id: `private-notice-${id}`, text, system: true, at: Date.now() }
  set({ notices: [...state.notices, notice].slice(-5), history: { ...state.history, talk: cap([...state.history.talk, msg]) } })
}

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
        mb: ev.mb ?? null,
        mailUnread: ev.mailUnread ?? 0,
        club: ev.club ?? null,
        omok: ev.omok ?? null,
        yut: ev.yut ?? null,
        rummi: ev.rummi ?? null,
        yacht: ev.yacht ?? null,
        bgmPlaylist: ev.bgmPlaylist ?? [],
      })
      break
    case 'bgm':
      set({ bgmPlaylist: ev.playlist ?? [] })
      break
    case 'presence': {
      // 서버가 전체 명부를 매번 다시 보내지 않고 바뀐 부분만 보낸다: add(새로 접속) · remove(접속 종료) · update(일행 등 항목 갱신).
      let online = state.online
      if (ev.remove?.length) {
        const gone = new Set(ev.remove)
        online = online.filter((o) => !gone.has(o.id))
      }
      if (ev.add?.length) {
        const ids = new Set(ev.add.map((o) => o.id))
        online = [...online.filter((o) => !ids.has(o.id)), ...ev.add]
      }
      if (ev.update?.length) {
        const byId = new Map(ev.update.map((o) => [o.id, o]))
        online = online.map((o) => byId.get(o.id) ?? o)
        // 명부에 아직 없던 사람의 갱신이면(있을 일은 거의 없지만) 추가해 둔다.
        for (const o of ev.update) if (!online.some((x) => x.id === o.id)) online = [...online, o]
      }
      set({ online })
      break
    }
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
    case 'partyMemberStats':
      if (state.party) {
        set({
          party: {
            ...state.party,
            members: state.party.members.map((m) => (m.id === ev.id ? { ...m, stats: ev.stats } : m)),
          },
        })
      }
      break
    case 'invite':
      set({ invite: { from: ev.from } })
      break
    case 'notice':
      pushNotice(ev.text)
      break
    case 'mb':
      if (ev.ev === 'invite') set({ mbInvite: { bid: ev.bid, from: ev.from, enemy: ev.enemy, expires: ev.expires } })
      else if (ev.ev === 'closed') set({ mbInvite: state.mbInvite?.bid === ev.bid ? null : state.mbInvite })
      else if (ev.ev === 'lobby') set({ mbLobby: { bid: ev.bid, enemyId: ev.enemyId, waiting: ev.waiting, joined: ev.joined } })
      else if (ev.ev === 'cancel') {
        set({ mbLobby: null })
        if (ev.reason) pushNotice(ev.reason)
      } else if (ev.ev === 'state') set({ mb: { bid: ev.bid, view: ev.view }, mbLobby: null, mbInvite: state.mbInvite?.bid === ev.bid ? null : state.mbInvite })
      break
    case 'gift':
      if (!seenGifts.has(ev.gift.id)) {
        seenGifts.add(ev.gift.id)
        giftListeners.forEach((l) => l(ev.gift))
      }
      break
    case 'clubChat':
      if (state.club?.id === ev.club) set({ club: { ...state.club, log: [...state.club.log, ev.msg].slice(-200) } })
      break
    case 'omok':
      if (ev.ev === 'invite') set({ omokInvite: { from: ev.from } })
      else if (ev.ev === 'start' || ev.ev === 'state') set({ omok: { gid: ev.gid, size: ev.size, board: ev.board, turn: ev.turn, players: ev.players, winner: ev.winner, win: ev.win }, omokInvite: null })
      else if (ev.ev === 'declined') pushNotice(`${ev.from.name}님이 오목 신청을 거절했다.`)
      else if (ev.ev === 'closed') set({ omokInvite: null })
      break
    case 'yut':
      if (ev.ev === 'invite') set({ yutInvite: { lid: ev.lid, from: ev.from } })
      else if (ev.ev === 'state')
        set({
          yut: { gid: ev.gid, players: ev.players, pieces: ev.pieces, left: ev.left, turn: ev.turn, phase: ev.phase, throws: ev.throws, pendingBranch: ev.pendingBranch, lastRoll: ev.lastRoll, winner: ev.winner, log: ev.log },
          yutInvite: null,
          yutLobby: null,
        })
      else if (ev.ev === 'lobby') set({ yutLobby: { lid: ev.lid, waiting: ev.waiting } })
      else if (ev.ev === 'lobby-cancel') {
        pushNotice(ev.reason)
        set({ yutLobby: null })
      } else if (ev.ev === 'closed') set({ yutInvite: null })
      break
    case 'rummi':
      if (ev.ev === 'invite') set({ rummiInvite: { lid: ev.lid, from: ev.from } })
      else if (ev.ev === 'state')
        set({
          rummi: { gid: ev.gid, players: ev.players, counts: ev.counts, hand: ev.hand, poolLeft: ev.poolLeft, table: ev.table, turn: ev.turn, hasPlayed: ev.hasPlayed, firstMeld: ev.firstMeld, left: ev.left, winner: ev.winner, log: ev.log },
          rummiInvite: null,
          rummiLobby: null,
        })
      else if (ev.ev === 'lobby') set({ rummiLobby: { lid: ev.lid, waiting: ev.waiting } })
      else if (ev.ev === 'lobby-cancel') {
        pushNotice(ev.reason)
        set({ rummiLobby: null })
      } else if (ev.ev === 'closed') set({ rummiInvite: null })
      break
    case 'yacht':
      if (ev.ev === 'invite') set({ yachtInvite: { lid: ev.lid, from: ev.from } })
      else if (ev.ev === 'state')
        set({
          yacht: { gid: ev.gid, players: ev.players, scorecards: ev.scorecards, dice: ev.dice, rollsLeft: ev.rollsLeft, turn: ev.turn, left: ev.left, winner: ev.winner, tie: ev.tie, log: ev.log },
          yachtInvite: null,
          yachtLobby: null,
        })
      else if (ev.ev === 'lobby') set({ yachtLobby: { lid: ev.lid, waiting: ev.waiting } })
      else if (ev.ev === 'lobby-cancel') {
        pushNotice(ev.reason)
        set({ yachtLobby: null })
      } else if (ev.ev === 'closed') set({ yachtInvite: null })
      break
    case 'mail':
      set({ mailUnread: state.mailUnread + 1, mailTick: state.mailTick + 1 })
      if (ev.mail?.kind === 'note') pushNotice(`${ev.mail.from.name}님의 쪽지가 사물함에 도착했다.`)
      if (ev.mail?.kind === 'friend') pushNotice(`${ev.mail.from.name}님이 친구로 추가했어. 사물함에서 확인할 수 있어.`)
      break
    case 'adminEdit':
      if (ev.ev === 'request') set({ editReq: { rid: ev.rid, adminName: ev.adminName, changes: ev.changes, expires: ev.expires } })
      else if (ev.ev === 'expired') set({ editReq: state.editReq?.rid === ev.rid ? null : state.editReq })
      else if (ev.ev === 'result') set({ editResult: { rid: ev.rid, status: ev.status, targetName: ev.targetName } })
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
    mb: null,
    mbInvite: null,
    mbLobby: null,
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
export const fetchFriends = () => post('/api/friends/list', {})
export const changeFriend = async (to, action) => {
  const result = await post('/api/friends/change', { to, action })
  if (result.ok && typeof window !== 'undefined') window.dispatchEvent(new Event('chorok:friends-changed'))
  return result
}

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
export const sendGift = (toId, items, enh, note = '') =>
  post('/api/gift', { to: toId, items, ...(enh && Object.keys(enh).length ? { enh } : {}), ...(note ? { note } : {}) })

// ───────── 우체통 · 사물함 ─────────
export const MAIL_MAX = 1000
/** 쪽지만 보내기(아이템 없이). 상대가 접속하지 않았어도 사물함에 쌓인다. */
export const sendNote = (toId, text) => post('/api/mail/send', { to: toId, text })
/** 사물함: { ok, received, sent } */
export const fetchMailbox = () => post('/api/mail/box', {})
export const markMailRead = async () => {
  const r = await post('/api/mail/read', {})
  if (r?.ok) set({ mailUnread: 0 })
  return r
}
/** 쪽지를 보낼 수 있는 사람들: { ok, people: [{ id, name, online }] } */
export const fetchMailPeople = () => post('/api/mail/people', {})
/** 관리자: 모든 쪽지 · 선물 내역 */
export const fetchAllMail = (id, key, who = '') => adminPost('/api/admin/mail', id, key, who ? { who } : {})

// ───────── 관리자 수정(당사자 동의 필요) ─────────
export const requestEdit = (id, key, target, changes) => adminPost('/api/admin/edit/request', id, key, { target, changes })
export const respondEdit = async (rid, accept) => {
  const r = await post('/api/admin/edit/respond', { rid, accept })
  set({ editReq: null })
  return r
}
export const clearEditResult = () => set({ editResult: null })

// ───────── 동아리 ─────────
export const applyClub = async (club, name, grade, age, hope) => {
  const r = await post('/api/club/apply', { club, name, grade, age, hope })
  if (r?.ok) set({ club: { id: r.club, joinedAt: Date.now(), log: [] } })
  return r
}
export const leaveClub = async () => {
  const r = await post('/api/club/leave', {})
  if (r?.ok) set({ club: null })
  return r
}
export const fetchClubMembers = (club) => post('/api/club/members', { club })
export const sendClubChat = (text) => post('/api/club/chat', { text })

// ───────── 오목 ─────────
export const inviteOmok = (to) => post('/api/omok/invite', { to })
export const respondOmok = async (from, accept) => {
  const r = await post('/api/omok/respond', { from, accept })
  if (!accept) set({ omokInvite: null })
  return r
}
export const moveOmok = (x, y) => post('/api/omok/move', { x, y })
export const closeOmok = () => set({ omok: null }) // 끝난 판 화면을 닫는다(서버는 이미 정리했다)
export const resignOmok = async () => {
  const r = await post('/api/omok/resign', {})
  if (r?.ok) set({ omok: null })
  return r
}

// ───────── 윷놀이 ─────────
export const inviteYut = async (to) => {
  const r = await post('/api/yut/invite', { to })
  if (r?.ok) set({ yutLobby: { lid: r.lid, waiting: to.map((id) => state.party?.members.find((m) => m.id === id)?.name ?? id) } })
  return r
}
export const respondYut = async (lid, accept) => {
  const r = await post('/api/yut/respond', { lid, accept })
  if (!accept) set({ yutInvite: null })
  return r
}
export const rollYutDice = () => post('/api/yut/roll', {})
export const applyYutThrow = (steps, target) => post('/api/yut/apply', { steps, target })
export const chooseYutBranch = (choice) => post('/api/yut/choose', { choice })
export const resignYut = async () => {
  const r = await post('/api/yut/resign', {})
  if (r?.ok) set({ yut: null })
  return r
}
export const closeYut = () => set({ yut: null })

// ───────── 루미큐브 ─────────
export const inviteRummi = async (to) => {
  const r = await post('/api/rummi/invite', { to })
  if (r?.ok) set({ rummiLobby: { lid: r.lid, waiting: to.map((id) => state.party?.members.find((m) => m.id === id)?.name ?? id) } })
  return r
}
export const respondRummi = async (lid, accept) => {
  const r = await post('/api/rummi/respond', { lid, accept })
  if (!accept) set({ rummiInvite: null })
  return r
}
/** table: [{tiles:[tileId,...], assign:{tileId:{color,num}}}, ...] — 내 턴이 끝났을 때 테이블의 전체 모습. */
export const commitRummi = (table) => post('/api/rummi/commit', { table: table ?? [] })
export const endRummiTurn = () => post('/api/rummi/end-turn', {})
export const resignRummi = async () => {
  const r = await post('/api/rummi/resign', {})
  if (r?.ok) set({ rummi: null })
  return r
}
export const closeRummi = () => set({ rummi: null })

// ───────── 요트 다이스 ─────────
export const inviteYacht = async (to) => {
  const r = await post('/api/yacht/invite', { to })
  if (r?.ok) set({ yachtLobby: { lid: r.lid, waiting: to.map((id) => state.party?.members.find((m) => m.id === id)?.name ?? id) } })
  return r
}
export const respondYacht = async (lid, accept) => {
  const r = await post('/api/yacht/respond', { lid, accept })
  if (!accept) set({ yachtInvite: null })
  return r
}
export const rollYacht = (keep) => post('/api/yacht/roll', { keep: keep ?? [false, false, false, false, false] })
export const scoreYacht = (category) => post('/api/yacht/score', { category })
export const resignYacht = async () => {
  const r = await post('/api/yacht/resign', {})
  if (r?.ok) set({ yacht: null })
  return r
}
export const closeYacht = () => set({ yacht: null })

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
/** 파티장 전용: 인원이 몇 명이든 일행을 바로 해체한다. */
export const disbandParty = () => post('/api/party/disband', {})
/** 파티 중일 때, 내 체력/영력/의지력·육조 스탯·장비를 일행에게 알린다. (일행 중일 때만 뜻이 있다) */
export const sendPartyStats = (stats) => post('/api/party/stats', { stats })

// ───────── 다인 전투 ─────────
/** 내 전투 스냅샷(스탯 · 체력 · 의지력)을 서버에 알려 준다. me = { stats, hp, hpMax, mp, mpMax, revive, boost } */
export async function mbStart(enemy, me) {
  const r = await post('/api/mb/start', { enemy, me })
  if (!r.ok) {
    const why = { 'not-leader': '파티장만 다인 전투와 보스 전투를 신청할 수 있다.', 'need-party': '일행 상태에서만 참여할 수 있다. (접속 중인 일행이 있어야 한다)', 'mates-busy': '일행이 모두 다른 전투 중이다.', 'already-in-battle': '이미 다인 전투에 참여 중이다.', 'slow-down': '잠시 후 다시 시도해 줘.' }[r.error]
    pushNotice(why ?? '다인 전투를 시작하지 못했다.')
  }
  return r
}
export async function mbRespond(accept, me) {
  const inv = state.mbInvite
  set({ mbInvite: null })
  if (!inv) return { ok: false }
  const r = await post('/api/mb/respond', { bid: inv.bid, accept, me })
  if (!r.ok) pushNotice('초대가 이미 만료되었다.')
  return r
}
export const mbCancel = () => {
  const bid = state.mbLobby?.bid
  set({ mbLobby: null })
  return bid ? post('/api/mb/cancel', { bid }) : Promise.resolve({ ok: false })
}
export const mbAct = (act) => post('/api/mb/act', { bid: state.mb?.bid, act })
export const mbSurvive = (accept) => post('/api/mb/survive', { bid: state.mb?.bid, accept })
export const mbItem = (item, to) => post('/api/mb/item', { bid: state.mb?.bid, item, to })
/** 결과 화면을 닫는다 */
export const mbClose = () => set({ mb: null })

// ───────── 인적사항 카드 ─────────
/** 내 카드를 서버에 올린다. card = { name, greeting, age, grade, avatar } */
export const sendCard = (card) => post('/api/card', { card })
/** 다른 사람의 카드를 가져온다. { ok, card, online, title } 또는 { ok:false } */
export async function fetchCard(targetId) {
  try {
    const r = await fetch(`/api/card?id=${encodeURIComponent(state.me?.id ?? '')}&target=${encodeURIComponent(targetId)}`)
    if (!r.ok) return { ok: false, status: r.status }
    return await r.json()
  } catch {
    return { ok: false, status: 0 }
  }
}

// ───────── 랭킹 ─────────
export async function fetchRanking(course, id, week = 'this') {
  try {
    const r = await fetch(`/api/ranking/${course}?id=${encodeURIComponent(id ?? '')}&week=${week}`)
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

/** 배경음악(평소 곡) 재생목록을 서버에서 받아온다. 접속(SSE) 전에도 쓸 수 있다. { ok, playlist, error } */
export async function fetchBgmPlaylist() {
  try {
    const r = await fetch('/api/bgm')
    const data = await r.json().catch(() => ({}))
    return r.ok && data.ok ? { ok: true, playlist: data.playlist } : { ok: false, error: data.error ?? 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}
/** 관리자: 배경음악 재생목록을 통째로 바꾼다. playlist: [{ id, title }]. 빈 배열이면 로컬 mp3 로 되돌아간다. */
export const adminSetBgmPlaylist = (id, key, playlist) => adminPost('/api/admin/bgm', id, key, { playlist })

/** 관리자: 회원(서버에 데이터가 남은 계정) 목록. { ok, members, total, error } */
export async function fetchMembers(id, key) {
  try {
    const r = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, key }),
    })
    const data = await r.json().catch(() => ({}))
    return r.ok && data.ok ? { ok: true, members: data.members, total: data.total } : { ok: false, error: data.error ?? 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ───────── 급식실 · 교내 신문 · 익명 사연 ─────────
/** 그날의 교내 신문. { ok, date, stories: [{ no, text }] } */
export async function fetchNewspaper(date) {
  try {
    const r = await fetch(`/api/newspaper${date ? `?date=${encodeURIComponent(date)}` : ''}`)
    const data = await r.json().catch(() => ({}))
    return r.ok && data.ok ? data : { ok: false, error: data.error ?? 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** 익명 사연 투고. { ok, error } — 접속 중이어야 한다. */
export const submitStory = (text) => post('/api/story/submit', { text })

async function adminPost(path, id, key, extra = {}) {
  try {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, key, ...extra }),
    })
    const data = await r.json().catch(() => ({}))
    return r.ok && data.ok ? data : { ok: false, error: data.error ?? 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}
/** 관리자: 심사 대기 사연 + 오늘 올라간 사연 */
export const fetchPendingStories = (id, key) => adminPost('/api/admin/stories', id, key)
/** 관리자: 승인하고 신문에 올리기 */
export const publishStory = (id, key, storyId) => adminPost('/api/admin/story/publish', id, key, { storyId })
/** 관리자: 반려(내용이 불순할 때) */
export const rejectStory = (id, key, storyId) => adminPost('/api/admin/story/reject', id, key, { storyId })
