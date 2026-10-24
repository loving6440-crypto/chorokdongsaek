// 계정 · 캐릭터 저장소 (서버 쪽).
// 저장 위치:
//  - DB(Supabase) 가 있으면 saves 테이블에 계정 하나당 한 줄: id = 'account:<아이디>', 비밀 키는 id = 'meta:secret'
//  - 없으면 accounts.json 파일 (로컬 개발용)
// 계정 레코드: { id, passwordHash, twitter, twitterNorm, createdAt, admin, save, profiles, activeProfile, updatedAt }
//  - save / profiles / activeProfile 은 브라우저(auth.js)의 users[id] 와 같은 모양이다. 서버는 내용을 해석하지 않고 그대로 보관한다.

import crypto from 'node:crypto'
import fs from 'node:fs'

const ACC = (id) => `account:${id}`
const SECRET_ROW = 'meta:secret'

export const normTwitter = (t) => String(t ?? '').trim().replace(/^@/, '').toLowerCase()

// ───────── 비밀번호 ─────────
// 새 방식: scrypt (솔트 포함). 형식 'scrypt$<salt>$<hash>'
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto.scryptSync(String(password), salt, 32).toString('base64url')
  return `scrypt$${salt}$${hash}`
}
export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false
  const [, salt, hash] = stored.split('$')
  const a = Buffer.from(hash, 'base64url')
  const b = crypto.scryptSync(String(password), salt, a.length)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
// 옛 방식: 브라우저(auth.js)의 simpleHash(password + id + 'changnok'). 기존 기록을 서버로 옮길 때 본인 확인용으로만 쓴다.
export function legacyHash(password, id) {
  const str = String(password) + id + 'changnok'
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

// ───────── 저장소 ─────────
export async function createAccountStore({ db, file }) {
  let mem = { secret: null, accounts: {} } // 파일 모드
  if (!db) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (raw?.accounts) mem = { secret: raw.secret ?? null, accounts: raw.accounts }
    } catch {
      /* 첫 실행 */
    }
  }
  let timer = null
  const writeFile = () => fs.writeFileSync(file, JSON.stringify(mem))
  const persist = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      try {
        writeFile()
      } catch (e) {
        console.error('계정 파일 저장 실패:', e.message)
      }
    }, 400)
  }
  const upsert = (id, data) =>
    db.query(
      `insert into saves (id, data, updated_at) values ($1, $2, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [id, JSON.stringify(data)],
    )

  // 토큰 서명 키: 환경변수 CHOROK_SECRET 이 있으면 그것, 없으면 처음 한 번 만들어 저장소에 보관한다. (재시작해도 로그인이 유지되도록)
  let secret = process.env.CHOROK_SECRET || null
  if (!secret) {
    if (db) {
      const r = await db.query('select data from saves where id = $1', [SECRET_ROW])
      secret = r.rows[0]?.data?.value ?? null
      if (!secret) {
        secret = crypto.randomBytes(32).toString('base64url')
        await upsert(SECRET_ROW, { value: secret })
      }
    } else {
      secret = mem.secret ?? crypto.randomBytes(32).toString('base64url')
      if (!mem.secret) {
        mem.secret = secret
        persist()
      }
    }
  }

  const getExact = async (id) => {
    if (db) {
      const r = await db.query('select data from saves where id = $1', [ACC(id)])
      return r.rows[0]?.data ?? null
    }
    return mem.accounts[id] ?? null
  }

  return {
    secret,
    // 한글은 완성형(NFC)·조합형(NFD) 두 표현이 있어 보기엔 같아도 문자열이 다를 수 있다.
    // 서버는 들어오는 아이디를 NFC 로 맞춰 쓰지만, 이 기능이 생기기 전에 조합형으로 저장된 옛 계정이 있을 수 있어
    // 못 찾으면 조합형으로도 한 번 더 찾아본다. 찾으면 그 자리에서 완성형으로 옮겨 써, 다음부터는 바로 찾는다.
    async get(id) {
      const direct = await getExact(id)
      if (direct) return direct
      const alt = id.normalize('NFC') === id ? id.normalize('NFD') : id.normalize('NFC')
      if (alt === id) return null
      const found = await getExact(alt)
      if (found && found.id !== id) {
        found.id = id // 완성형으로 정리
        await this.put(found)
      }
      return found
    },
    async put(acc) {
      if (db) await upsert(ACC(acc.id), acc)
      else {
        mem.accounts[acc.id] = acc
        persist()
      }
    },
    async idsByTwitter(twitter) {
      const t = normTwitter(twitter)
      if (!t) return []
      if (db) {
        const r = await db.query(`select data->>'id' as id from saves where id like 'account:%' and data->>'twitterNorm' = $1`, [t])
        return r.rows.map((x) => x.id)
      }
      return Object.values(mem.accounts)
        .filter((a) => a.twitterNorm === t)
        .map((a) => a.id)
    },
    flush() {
      if (!db && timer) {
        clearTimeout(timer)
        timer = null
        writeFile()
      }
    },
  }
}

// ───────── 로그인 토큰 ─────────
// 형식: base64url("아이디|만료시각") + '.' + HMAC 서명. 서버가 기억할 필요가 없어 재시작해도 그대로 쓸 수 있다.
const TOKEN_DAYS = 180
export function makeToken(secret, id) {
  const body = Buffer.from(`${id}|${Date.now() + TOKEN_DAYS * 86_400_000}`).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}
export function readToken(secret, token) {
  if (typeof token !== 'string') return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const want = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null
  const [id, exp] = Buffer.from(body, 'base64url').toString().split('|')
  if (!id || !(Number(exp) > Date.now())) return null
  return id
}

// 브라우저로 돌려줄 때는 비밀번호 해시를 뺀다.
export const publicAccount = ({ passwordHash, twitterNorm, ...rest }) => rest

// 게임 진행 부분만 (브라우저가 보낸 것 중 서버가 받아 주는 칸)
export const GAME_FIELDS = ['save', 'profiles', 'activeProfile']
export function pickGame(src) {
  const out = {}
  for (const k of GAME_FIELDS) if (src && k in src) out[k] = src[k]
  return out
}
