/**
 * 인증 + 캐릭터 저장
 * - 계정과 저장의 원본은 서버(Supabase)에 있다. 로그인 · 가입은 서버가 확인하고 로그인 토큰을 준다.
 * - 브라우저(localStorage)에는 같은 내용을 사본으로 둔다. 게임은 지금처럼 사본을 읽고 쓰고,
 *   바뀐 내용은 saveUsers() 에서 몇 초 모아 서버로 보낸다. (아래 '서버 동기화')
 * - 서버에 계정이 없는데 이 브라우저에 옛 기록이 있으면, 로그인할 때 비밀번호를 확인해 서버로 자동 이전한다.
 * - 서버에 연결할 수 없으면(서버 없이 npm run dev 만 켰을 때 등) 예전처럼 이 브라우저 안에서만 동작한다.
 * - 아래 signup / login 은 브라우저 전용(오프라인) 버전이고, 화면에서는 serverSignup / serverLogin 을 쓴다.
 */

const USERS_KEY = 'changnok-users'
const SESSION_KEY = 'changnok-session'

function simpleHash(str) {
  // 브라우저 내장 방식으로 가볍게 해시 (보안 목적이 아닌 평문 저장 방지용)
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function sessionId() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.id ?? null
  } catch {
    return null
  }
}

// fromServer: 서버에서 받은 내용을 사본에 적을 때. (이때는 다시 서버로 보내지 않는다)
function saveUsers(users, { fromServer = false } = {}) {
  const sid = sessionId()
  if (!fromServer && sid && users[sid]) {
    users[sid].dirty = true // 서버에 아직 안 보낸 변경이 있다
    changeSeq++
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  if (!fromServer && sid) schedulePush()
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const users = loadUsers()
    if (!users[session.id]) return null
    return session
  } catch {
    return null
  }
}

export function setSession(id) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: Date.now() }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function signup({ id, password, twitter }) {
  const cleanId = id.trim()
  if (!cleanId || cleanId.length < 2) {
    return { ok: false, error: '아이디는 2글자 이상이어야 합니다.' }
  }
  if (!/^[a-zA-Z0-9가-힣_]+$/.test(cleanId)) {
    return { ok: false, error: '아이디는 영문, 숫자, 한글, _ 만 사용할 수 있습니다.' }
  }
  if (!password || password.length < 4) {
    return { ok: false, error: '비밀번호는 4글자 이상이어야 합니다.' }
  }
  if (!twitter || !twitter.trim()) {
    return { ok: false, error: '트위터 아이디를 입력해 주세요.' }
  }

  const users = loadUsers()
  if (users[cleanId]) {
    return { ok: false, error: '이미 사용 중인 아이디입니다.' }
  }

  users[cleanId] = {
    id: cleanId,
    passwordHash: simpleHash(password + cleanId + 'changnok'),
    twitter: twitter.trim().replace(/^@/, ''),
    createdAt: Date.now(),
    // 캐릭터/게임 상태 (아직 없으면 null)
    save: null,
  }
  saveUsers(users)
  setSession(cleanId)
  return { ok: true, user: users[cleanId] }
}

export function login({ id, password }) {
  const cleanId = id.trim()
  const users = loadUsers()
  const user = users[cleanId]
  if (!user) {
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }
  const hash = simpleHash(password + cleanId + 'changnok')
  if (hash !== user.passwordHash) {
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }
  setSession(cleanId)
  return { ok: true, user }
}

const normTwitter = (t) => String(t ?? '').trim().replace(/^@/, '').toLowerCase()

/** 아이디 찾기: 가입할 때 적은 트위터 아이디로 계정 아이디를 찾는다. (대소문자·@ 무시, 비밀번호 찾기는 지원하지 않는다.) */
export function findIdsByTwitter(twitter) {
  const t = normTwitter(twitter)
  if (!t) return { ok: false, error: '트위터 아이디를 입력해 주세요.' }
  const ids = Object.values(loadUsers())
    .filter((u) => normTwitter(u.twitter) === t)
    .map((u) => u.id)
  if (!ids.length) return { ok: false, error: '이 트위터 아이디로 가입한 계정을 찾지 못했습니다.' }
  return { ok: true, ids }
}

export function getCurrentUser() {
  const session = getSession()
  if (!session) return null
  const users = loadUsers()
  return users[session.id] || null
}

export function saveGameState(userId, saveData) {
  const users = loadUsers()
  if (!users[userId]) return false
  users[userId].save = {
    ...saveData,
    savedAt: Date.now(),
  }
  saveUsers(users)
  return true
}

export function loadGameState(userId) {
  const users = loadUsers()
  return users[userId]?.save || null
}

export function logout() {
  clearSession()
}

// ───────── 관리자 · 멀티 프로필 ─────────
// 관리자 계정(users[id].admin)만 캐릭터를 여러 명 둘 수 있다. 일반 계정은 한 계정에 한 캐릭터.
// user.save 는 지금 쓰는 프로필의 저장이고, 쓰고 있지 않은 프로필은 user.profiles[pid] 에 맡겨 둔다.
const FIRST_PID = 'p1'
const ADMIN_KEY_STORE = 'chorok-admin-key'

export const isAdminUser = (user) => !!user?.admin

/** 관리자 키는 이 브라우저에만 저장한다. (접속할 때 서버로 보내 [관리자] 직함을 확인받는다.) */
export function getAdminKey() {
  try {
    return localStorage.getItem(ADMIN_KEY_STORE) || ''
  } catch {
    return ''
  }
}

/** 서버가 키를 확인해 준 뒤 이 계정을 관리자로 표시한다. */
export function markAdmin(userId, key) {
  const users = loadUsers()
  if (!users[userId]) return null
  users[userId].admin = true
  try {
    localStorage.setItem(ADMIN_KEY_STORE, key)
  } catch {
    /* 저장 불가면 다음 접속 때 다시 입력 */
  }
  saveUsers(users)
  return users[userId]
}

export const activeProfileId = (user) => user?.activeProfile ?? FIRST_PID

const profilesOf = (u) => u.profiles ?? { [FIRST_PID]: u.save ?? null }

/** 이 계정의 프로필 목록: [{ pid, name, age, grade, avatar, active, empty }] */
export function listProfiles(userId) {
  const u = loadUsers()[userId]
  if (!u) return []
  const active = activeProfileId(u)
  const ps = profilesOf(u)
  return Object.keys(ps).map((pid) => {
    const save = pid === active ? u.save : ps[pid]
    const c = save?.character
    return { pid, name: c?.name ?? '(만드는 중)', age: c?.age, grade: c?.grade ?? null, avatar: c?.avatar, active: pid === active, empty: !c }
  })
}

function stash(u) {
  u.profiles = { ...profilesOf(u), [activeProfileId(u)]: u.save ?? null }
}

export function switchProfile(userId, pid) {
  const users = loadUsers()
  const u = users[userId]
  if (!u || !u.admin) return { ok: false }
  stash(u)
  if (!(pid in u.profiles) || pid === activeProfileId(u)) return { ok: false }
  u.save = u.profiles[pid]
  u.activeProfile = pid
  saveUsers(users)
  return { ok: true, user: u }
}

/** 새 프로필을 만든다 (관리자만). 저장이 비어 있는 상태가 되어, 캐릭터 생성 화면으로 이어진다. */
export function createProfile(userId) {
  const users = loadUsers()
  const u = users[userId]
  if (!u || !u.admin) return { ok: false }
  stash(u)
  let pid = `p${Date.now().toString(36)}`
  while (pid in u.profiles) pid += 'x'
  u.profiles[pid] = null
  u.save = null
  u.activeProfile = pid
  saveUsers(users)
  return { ok: true, user: u, pid }
}

/** 아직 캐릭터를 만들지 않은 새 프로필을 접고, 직전 프로필로 돌아간다. */
export function cancelNewProfile(userId) {
  const users = loadUsers()
  const u = users[userId]
  if (!u || !u.admin || u.save) return { ok: false }
  const cur = activeProfileId(u)
  const rest = Object.keys(profilesOf(u)).filter((p) => p !== cur)
  if (!rest.length) return { ok: false }
  const profiles = { ...u.profiles }
  delete profiles[cur]
  u.profiles = profiles
  u.activeProfile = rest[rest.length - 1]
  u.save = profiles[u.activeProfile]
  saveUsers(users)
  return { ok: true, user: u }
}

/** 지금 쓰지 않는 프로필을 지운다 (관리자만). */
export function deleteProfile(userId, pid) {
  const users = loadUsers()
  const u = users[userId]
  if (!u || !u.admin || pid === activeProfileId(u)) return { ok: false }
  stash(u)
  const profiles = { ...u.profiles }
  delete profiles[pid]
  u.profiles = profiles
  saveUsers(users)
  return { ok: true, user: u }
}

// ───────── 서버 동기화 ─────────
// 로그인 토큰은 이 브라우저에만 둔다. 사본의 users[id] 에는 다음 두 칸이 더 붙는다.
//  - syncBase: 마지막으로 서버와 맞춘 저장 번호(서버가 매긴 updatedAt). 다른 기기가 그 뒤에 저장했는지 판단하는 데 쓴다.
//  - dirty: 서버에 아직 보내지 못한 변경이 있는지
const TOKEN_KEY = 'chorok-token'
const PUSH_DELAY_MS = 4000 // 게임은 0.8초마다 저장하므로 서버에는 몇 초씩 모아서 보낸다
const RETRY_MS = 15000
const GAME_FIELDS = ['save', 'profiles', 'activeProfile']
let changeSeq = 0
let pushTimer = null
let pushing = false
const listeners = new Set()

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))
const pickGame = (u) => Object.fromEntries(GAME_FIELDS.filter((k) => u && k in u).map((k) => [k, u[k]]))

/** 서버 연결 상태: 'online'(동기화 중) | 'offline'(서버 연결 안 됨, 이 브라우저에만 저장) */
export const syncMode = () => (getToken() ? 'online' : 'offline')

/** 다른 기기에서 더 최근에 저장된 기록을 받아 사본을 바꿨을 때 알림을 받는다. fn(user) — 화면을 새로 그려야 한다. */
export function onRemoteUpdate(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// 서버 호출. 서버가 없거나(404 · 5xx · 응답이 JSON 이 아님) 끊겼으면 { offline: true }
async function api(path, { method = 'POST', body, timeout = 8000, keepalive = false, auth = false } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (auth) headers.Authorization = `Bearer ${getToken()}`
    const r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal, keepalive })
    const data = await r.json().catch(() => null)
    if (!data || r.status === 404 || r.status >= 500) return { offline: true, status: r.status }
    return { status: r.status, ok: r.ok && !!data.ok, data }
  } catch {
    return { offline: true }
  } finally {
    clearTimeout(t)
  }
}

// 서버에서 받은 계정을 사본에 적는다. (비밀번호 해시는 오프라인 로그인용으로 이 브라우저 것을 유지)
function adoptServerUser(serverUser, passwordHash) {
  const users = loadUsers()
  const prev = users[serverUser.id]
  users[serverUser.id] = {
    ...serverUser,
    passwordHash: passwordHash ?? prev?.passwordHash,
    syncBase: serverUser.updatedAt ?? 0,
    dirty: false,
  }
  saveUsers(users, { fromServer: true })
  return users[serverUser.id]
}

function schedulePush(delay = PUSH_DELAY_MS) {
  if (!getToken()) return
  // 이미 예약돼 있으면 그대로 둔다. (저장이 계속 일어나는 동안에도 몇 초에 한 번은 반드시 보낸다 — 매번 예약을 미루면 영영 안 간다)
  if (pushTimer) return
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushNow()
  }, delay)
}

/** 바뀐 내용을 지금 서버로 보낸다. */
export async function pushNow({ keepalive = false } = {}) {
  const sid = sessionId()
  const u = sid && loadUsers()[sid]
  if (!getToken() || !u?.dirty) return
  if (pushing) return schedulePush(1000)
  pushing = true
  const seq = changeSeq
  const body = { base: u.syncBase ?? 0, account: pickGame(u) }
  // 페이지를 닫을 때 쓰는 keepalive 는 64KB 까지만 보낼 수 있다. (넘으면 다음 접속 때 이어서 보낸다)
  const r = await api('/api/account/save', { body, auth: true, keepalive: keepalive && JSON.stringify(body).length < 60_000 })
  pushing = false
  const users = loadUsers()
  const cur = users[sid]
  if (!cur) return
  if (r.ok) {
    cur.syncBase = r.data.updatedAt
    if (seq === changeSeq) cur.dirty = false // 보내는 동안 또 바뀌었으면 dirty 를 남겨 다음에 또 보낸다
    saveUsers(users, { fromServer: true })
    if (cur.dirty) schedulePush()
  } else if (r.status === 409 && r.data?.user) {
    // 다른 기기가 그 사이에 저장했다 → 서버 쪽 최신 기록으로 바꾸고 화면을 새로 그린다.
    const fresh = adoptServerUser(r.data.user)
    listeners.forEach((fn) => fn(fresh, 'conflict'))
  } else if (r.status === 401) {
    setToken('') // 토큰이 만료됐다 → 다음 로그인 때 다시 맞춘다 (사본에는 dirty 로 남아 있다)
  } else {
    schedulePush(RETRY_MS) // 서버 연결이 잠깐 끊겼다 → 잠시 뒤 다시
  }
}

// 탭을 닫거나 다른 앱으로 넘어갈 때 남은 변경을 보낸다.
if (typeof window !== 'undefined') {
  const flush = () => {
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    pushNow({ keepalive: true })
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
}

const AUTH_ERRORS = {
  'bad-login': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'bad-id': '아이디는 2글자 이상, 영문 · 숫자 · 한글 · _ 만 사용할 수 있습니다.',
  'bad-password': '비밀번호는 4글자 이상이어야 합니다.',
  'no-twitter': '트위터 아이디를 입력해 주세요.',
  taken: '이미 사용 중인 아이디입니다.',
  'slow-down': '시도가 너무 많습니다. 잠시 뒤에 다시 해 주세요.',
}
const authError = (r) => ({ ok: false, error: AUTH_ERRORS[r.data?.error] ?? '처리 중 오류가 발생했습니다.' })

/** 가입 (서버). 서버에 연결할 수 없으면 이 브라우저에만 만든다 → 나중에 서버가 있을 때 로그인하면 자동으로 옮겨진다. */
export async function serverSignup({ id, password, twitter, adminKey }) {
  const cleanId = id.trim()
  const r = await api('/api/account/signup', { body: { id: cleanId, password, twitter, adminKey } })
  if (r.offline) return { ...signup({ id, password, twitter }), offline: true }
  if (!r.ok) return authError(r)
  setToken(r.data.token)
  const user = adoptServerUser(r.data.user, simpleHash(password + cleanId + 'changnok'))
  setSession(cleanId)
  return { ok: true, user }
}

/** 로그인 (서버). 서버에 계정이 없고 이 브라우저에 옛 기록이 있으면 함께 보내 서버로 옮긴다. (자동 이전) */
export async function serverLogin({ id, password, adminKey }) {
  const cleanId = id.trim()
  const local = loadUsers()[cleanId] ?? null
  const r = await api('/api/account/login', { body: { id: cleanId, password, adminKey, local }, timeout: 20000 })
  if (r.offline) return { ...login({ id, password }), offline: true }
  if (!r.ok) return authError(r)
  setToken(r.data.token)
  const user = adoptServerUser(r.data.user, simpleHash(password + cleanId + 'changnok'))
  setSession(cleanId)
  return { ok: true, user, migrated: !!r.data.migrated }
}

/** 아이디 찾기 (서버). 서버에 연결할 수 없으면 이 브라우저의 기록에서 찾는다. */
export async function serverFindIds(twitter) {
  if (!String(twitter ?? '').trim()) return { ok: false, error: '트위터 아이디를 입력해 주세요.' }
  const r = await api('/api/account/find', { body: { twitter } })
  if (r.offline) return findIdsByTwitter(twitter)
  if (!r.ok) return authError(r)
  if (!r.data.ids.length) return { ok: false, error: '이 트위터 아이디로 가입한 계정을 찾지 못했습니다.' }
  return { ok: true, ids: r.data.ids }
}

/**
 * 앱을 켤 때: 서버의 최신 기록을 받아 사본을 맞춘다.
 * 반환: { user }  또는  { needLogin: true } — 서버 저장이 생기기 전부터 로그인해 있던 브라우저라 토큰이 없을 때.
 *       (비밀번호를 한 번 다시 받아야 기록을 서버로 옮길 수 있다)
 */
export async function syncOnStart() {
  const local = getCurrentUser()
  if (!local) return { user: null }
  if (!getToken()) {
    const h = await api('/api/health', { method: 'GET', timeout: 4000 })
    if (h.offline) return { user: local } // 서버가 없다 → 이 브라우저만으로 계속
    // 관리자 계정이 아니면 비밀번호 없이 바로 서버로 옮긴다. (자동 이전)
    if (!local.admin && /^[0-9a-f]{8}$/.test(String(local.passwordHash ?? ''))) {
      const a = await api('/api/account/adopt', { body: { local: { id: local.id, passwordHash: local.passwordHash, twitter: local.twitter, createdAt: local.createdAt, ...pickGame(local) } }, timeout: 20000 })
      if (a.offline) return { user: local }
      if (a.ok) {
        setToken(a.data.token)
        return { user: adoptServerUser(a.data.user, local.passwordHash), migrated: true }
      }
    }
    clearSession()
    return { needLogin: true, id: local.id }
  }
  const r = await api('/api/account/me', { method: 'GET', auth: true, timeout: 6000 })
  if (r.offline) return { user: local }
  if (r.status === 401) {
    setToken('')
    clearSession()
    return { needLogin: true, id: local.id }
  }
  const server = r.data.user
  if (local.dirty && (local.syncBase ?? 0) === (server.updatedAt ?? 0)) {
    // 이 브라우저에 못 보낸 변경이 있고, 그 사이 다른 기기는 저장하지 않았다 → 이쪽을 올린다
    pushNow()
    return { user: local }
  }
  if ((local.syncBase ?? 0) !== (server.updatedAt ?? 0) || local.dirty) return { user: adoptServerUser(server) }
  return { user: local }
}

/** 로그아웃: 남은 변경을 보내고 토큰을 지운다. */
export async function serverLogout() {
  clearTimeout(pushTimer)
  pushTimer = null
  await pushNow()
  setToken('')
  clearSession()
}
