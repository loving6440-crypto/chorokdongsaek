/**
 * 클라이언트 사이드 인증 + 캐릭터 저장 (localStorage 기반)
 * - 한 브라우저/컴퓨터에서 아이디별로 데이터가 영구 보존됩니다.
 * - 비밀번호는 간단한 해시로 저장합니다 (데모용, 실제 서비스에서는 서버 인증을 사용하세요).
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

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
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
