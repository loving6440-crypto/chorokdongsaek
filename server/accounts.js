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
const AVATAR_ROW = (accId, slot) => `avatar:${accId}:${slot}` // 사진 전용 줄: slot 은 'main' 또는 'p:<프로필id>'

// 사진 내용의 해시(같은 사진인지 비교용). 실제 바이트를 들고 다니지 않고도 "바뀌었는지" 알 수 있다.
export function avatarHash(src) {
  return crypto.createHash('sha1').update(String(src)).digest('base64url')
}
const isImageWithSrc = (a) => !!a && a.kind === 'image' && typeof a.src === 'string'
const isImageHashMark = (a) => !!a && a.kind === 'image' && typeof a.hash === 'string' && typeof a.src !== 'string'

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

  // ── 프로필 사진(avatar) 을 계정 "본채" 줄에서 떼어, 따로 떨어진 줄(avatar:<id>:<슬롯>)에 둔다. (DB 모드에서만)
  // 본채는 자동저장마다(몇 초 간격) 통째로 다시 쓰이므로, 사진 바이트를 그 안에 그대로 두면 사진이 하나도 안 바뀌어도
  // 매번 그 바이트가 Supabase 로 다시 나간다. 본채에는 사진 내용의 해시({kind:'image',hash})만 남기고,
  // 진짜 바이트는 해시가 실제로 바뀔 때만 별도 줄에 쓴다.
  const loadAvatarRow = async (accId, slot) => {
    const r = await db.query('select data from saves where id = $1', [AVATAR_ROW(accId, slot)])
    return r.rows[0]?.data ?? null
  }
  // acc(본채, avatar 칸이 해시만 있을 수 있음) 를 받아, 해시인 칸을 실제 사진 바이트로 채운 복사본을 돌려준다.
  // (이미 실제 바이트거나 색상/없음이면 그대로 둔다 — 그런 칸을 위해 따로 DB 를 읽지 않는다)
  const fillAvatars = async (acc) => {
    const out = { ...acc }
    if (acc.save?.character && isImageHashMark(acc.save.character.avatar)) {
      const row = await loadAvatarRow(acc.id, 'main')
      if (row) out.save = { ...acc.save, character: { ...acc.save.character, avatar: { kind: 'image', src: row.src } } }
    }
    if (acc.profiles) {
      const profiles = {}
      for (const [pid, p] of Object.entries(acc.profiles)) {
        if (p?.character && isImageHashMark(p.character.avatar)) {
          const row = await loadAvatarRow(acc.id, `p:${pid}`)
          profiles[pid] = row ? { ...p, character: { ...p.character, avatar: { kind: 'image', src: row.src } } } : p
        } else profiles[pid] = p
      }
      out.profiles = profiles
    }
    return out
  }
  // avatar 칸에 진짜 사진 바이트(src)가 있으면 그 바이트를 전용 줄에 쓰고, target(본채에 들어갈 character 칸)에는 해시만 남긴다.
  // 이미 해시뿐이거나 색상/없음이면 그대로 둔다 — 사진 줄은 건드리지 않는다.
  const splitAvatarForStore = async (accId, slot, avatar, targetCharacter) => {
    if (isImageWithSrc(avatar)) {
      const hash = avatarHash(avatar.src)
      await upsert(AVATAR_ROW(accId, slot), { kind: 'image', src: avatar.src, hash })
      targetCharacter.avatar = { kind: 'image', hash }
    }
  }

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
    // opts.withAvatar: true 면 (DB 모드에서) 해시로만 남아 있는 사진 칸을 실제 바이트로 채워서 돌려준다 —
    // 화면에 사진을 보여줘야 할 때만 쓴다. 평소(자동저장 등)엔 꺼 둔 채로 써서 사진 바이트를 안 읽는다.
    async get(id, opts) {
      const direct = await getExact(id)
      let found = direct
      if (!found) {
        const alt = id.normalize('NFC') === id ? id.normalize('NFD') : id.normalize('NFC')
        if (alt !== id) {
          found = await getExact(alt)
          if (found && found.id !== id) {
            found.id = id // 완성형으로 정리
            await this.put(found)
          }
        }
      }
      if (found && opts?.withAvatar && db) found = await fillAvatars(found)
      return found
    },
    async put(acc) {
      if (db) {
        const toStore = { ...acc }
        if (acc.save?.character) {
          toStore.save = { ...acc.save, character: { ...acc.save.character } }
          await splitAvatarForStore(acc.id, 'main', acc.save.character.avatar, toStore.save.character)
        }
        if (acc.profiles) {
          const profiles = {}
          for (const [pid, p] of Object.entries(acc.profiles)) {
            if (p?.character) {
              profiles[pid] = { ...p, character: { ...p.character } }
              await splitAvatarForStore(acc.id, `p:${pid}`, p.character.avatar, profiles[pid].character)
            } else profiles[pid] = p
          }
          toStore.profiles = profiles
        }
        await upsert(ACC(acc.id), toStore)
      } else {
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

// 프로필 사진은 바뀌지 않았으면 브라우저가 { kind:'image', unchanged:true } 표시만 보낸다(트래픽 절약).
// 여기서는 그 표시뿐 아니라, 브라우저가 (새로고침 등으로) 진짜 사진을 다시 보냈더라도 내용이 지금 저장된 것과
// 같으면("안 바뀐 것") 저장돼 있던 값(보통 해시만) 을 그대로 쓰도록 정리한다 — 그래야 accounts.put() 이
// 사진이 "진짜로 바뀌었을 때만" 전용 줄에 쓰고, 평소 자동저장에서는 사진 바이트를 전혀 건드리지 않는다.
function reconcileAvatar(incoming, stored) {
  if (incoming && incoming.kind === 'image' && incoming.unchanged === true) return stored ?? null
  if (isImageWithSrc(incoming)) {
    const h = avatarHash(incoming.src)
    if (isImageHashMark(stored) && stored.hash === h) return stored // 해시가 같다 — 바뀐 게 아니다
    if (isImageWithSrc(stored) && avatarHash(stored.src) === h) return stored // (아직 안 나눠진 옛 자료) 내용이 같다
    return { kind: 'image', src: incoming.src } // 진짜 새 사진
  }
  return incoming ?? null
}
export function reconcileAvatars(incoming, acc) {
  if (incoming.save?.character) {
    incoming.save.character.avatar = reconcileAvatar(incoming.save.character.avatar, acc?.save?.character?.avatar)
  }
  if (incoming.profiles) {
    for (const pid of Object.keys(incoming.profiles)) {
      const p = incoming.profiles[pid]
      if (p?.character) {
        p.character.avatar = reconcileAvatar(p.character.avatar, acc?.profiles?.[pid]?.character?.avatar)
      }
    }
  }
  return incoming
}
// (예전 이름 — 동작은 reconcileAvatars 와 같다. 호출하는 쪽을 새로 쓰면 지울 수 있다.)
export const resolveAvatarMarkers = reconcileAvatars
