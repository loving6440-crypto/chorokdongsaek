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
