// v-B.15: DB 모드(가짜 pg)로 실제 server/index.js 를 띄워, 공용 기록이 영역별 행으로 나뉘어
// "바뀐 영역만" 저장되는지, 종료·재시작 뒤 복원되는지, 예전 통짜 행과 호환되는지 확인한다.
// 가짜 pg 는 SQL 형태와 저장 흐름만 흉내 낸다. 실제 Supabase 성능 검증이 아니다.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { hashPassword, makeToken } from '../server/accounts.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const SECRET = 'b15-db-secret-never-deploy'
const REGISTER = fileURLToPath(new URL('./fixtures/fake-pg-register.mjs', import.meta.url))

async function freePort() {
  const s = net.createServer()
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve))
  const port = s.address().port
  await new Promise((resolve) => s.close(resolve))
  return port
}
async function call(port, method, route, body, token) {
  const r = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: r.status, ...await r.json().catch(() => ({})) }
}
const readLog = (file) => (existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const rowsOf = (file) => JSON.parse(readFileSync(file, 'utf8'))

async function boot(tmp, extraEnv = {}) {
  const port = await freePort()
  const child = spawn(process.execPath, ['--import', REGISTER, 'server/index.js'], {
    cwd,
    env: {
      ...process.env, PORT: String(port), DATABASE_URL: 'postgres://fake-for-tests', CHOROK_SECRET: SECRET,
      FAKE_PG_FILE: path.join(tmp, 'db.json'), FAKE_PG_LOG: path.join(tmp, 'sql.log'), FAKE_PG_OPTS_LOG: path.join(tmp, 'pool.json'),
      CHOROK_DATA: path.join(tmp, 'none.json'), CHOROK_ADMIN_KEY: 'k', ...extraEnv,
    }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let out = ''
  child.stdout.on('data', (c) => { out += c })
  child.stderr.on('data', (c) => { out += c })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) break
    try { if ((await call(port, 'GET', '/api/health')).ok) break } catch { /* booting */ }
    await sleep(50)
  }
  assert.equal(child.exitCode, null, out)
  return {
    port, out: () => out, child,
    async stop() {
      child.kill('SIGTERM')
      await Promise.race([new Promise((r) => child.once('exit', r)), sleep(5000)])
    },
  }
}
async function join(port, id) {
  const tk = await call(port, 'POST', '/api/events/ticket', { id }, makeToken(SECRET, id, 0))
  assert.equal(tk.status, 200)
  const ctrl = new AbortController()
  const r = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${encodeURIComponent(tk.ticket)}`, { signal: ctrl.signal })
  const reader = r.body.getReader()
  let bytes = ''
  for (let i = 0; i < 8 && !bytes.includes('"t":"hello"'); i++) bytes += new TextDecoder().decode((await reader.read()).value)
  return { close: () => ctrl.abort(), hello: bytes }
}

test('B15 DB: 채팅 한 줄은 server:chat 행만 쓰고, 쪽지·랭킹·예전 통짜 행은 다시 쓰지 않는다', { timeout: 40000 }, async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15db-'))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  const bigMail = Array.from({ length: 800 }, (_, i) => ({ id: `m${i}`, kind: 'note', from: { id: 'a', name: 'a' }, to: { id: 'b', name: 'b' }, text: '긴 쪽지 '.repeat(30), at: i, read: true }))
  writeFileSync(path.join(tmp, 'db.json'), JSON.stringify({
    server: { data: { mail: { seq: 801, log: bigMail }, history: { rp: [], talk: [{ id: 1, text: '예전 기록', from: { id: 'old', name: 'old' } }] }, seq: 50 } },
    'account:dbChatter': { data: { id: 'dbChatter', passwordHash: hashPassword('pass1234'), twitter: 'x', twitterNorm: 'x', admin: false, sessionVersion: 0, updatedAt: 1, save: null } },
  }))
  let srv = await boot(tmp)
  const conn = await join(srv.port, 'dbChatter')
  assert.ok(conn.hello.includes('예전 기록'), '예전 통짜 행의 채팅 기록을 불러와야 한다')
  writeFileSync(path.join(tmp, 'sql.log'), '') // 부팅·접속 이후만 본다
  const said = await call(srv.port, 'POST', '/api/chat', { id: 'dbChatter', channel: 'talk', text: '영역별 저장 시험' }, makeToken(SECRET, 'dbChatter', 0))
  assert.equal(said.status, 200)
  await sleep(2200) // DB 모드 묶음 저장 지연(1.5초) 이후
  const writes = readLog(path.join(tmp, 'sql.log')).filter((q) => /^insert into saves/i.test(q.sql))
  const written = writes.flatMap((w) => w.ids)
  assert.ok(written.includes('server:chat'), `server:chat 이 저장돼야 한다: ${JSON.stringify(written)}`)
  assert.ok(!written.includes('server'), '채팅 한 줄 때문에 예전 통짜 행을 다시 쓰면 안 된다')
  assert.ok(!written.includes('server:mail'), '쪽지 기록은 바뀌지 않았으니 다시 쓰지 않는다')
  const chatBytes = writes.filter((w) => w.ids.includes('server:chat')).reduce((n, w) => n + w.bytes, 0)
  const legacyBytes = JSON.stringify(rowsOf(path.join(tmp, 'db.json')).server.data).length
  assert.ok(chatBytes * 5 < legacyBytes, `채팅 저장(${chatBytes}B)이 통짜 행(${legacyBytes}B)보다 훨씬 작아야 한다`)
  conn.close()

  // 종료: 모든 영역 + 롤백용 통짜 행을 최신으로 맞춘다.
  await srv.stop()
  const rows = rowsOf(path.join(tmp, 'db.json'))
  assert.ok(rows['server:chat'].data.history.talk.some((m) => m.text === '영역별 저장 시험'))
  assert.ok(rows.server.data.history.talk.some((m) => m.text === '영역별 저장 시험'), '종료 시 통짜 행도 갱신(이전 버전 롤백 대비)')
  assert.equal(rows['server:mail'].data.mail.log.length, 800)

  // 재시작: 영역 행에서 복원
  srv = await boot(tmp)
  t.after(() => srv.stop())
  const again = await join(srv.port, 'dbChatter')
  assert.ok(again.hello.includes('영역별 저장 시험'))
  again.close()
})

test('B15 DB: /api/health 는 DB 확인을 캐시해 잦은 헬스체크가 매번 DB 를 두드리지 않는다', { timeout: 30000 }, async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15db-'))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  writeFileSync(path.join(tmp, 'db.json'), '{}')
  const srv = await boot(tmp)
  t.after(() => srv.stop())
  writeFileSync(path.join(tmp, 'sql.log'), '')
  for (let i = 0; i < 10; i++) assert.equal((await call(srv.port, 'GET', '/api/health')).db, true)
  const pings = readLog(path.join(tmp, 'sql.log')).filter((q) => /^select 1$/i.test(q.sql))
  assert.ok(pings.length <= 1, `헬스체크 10번에 DB 확인 ${pings.length}번`)
})

test('B15 DB: 인증서 검증 설정 — 기본은 호환 모드(경고), CA 를 주면 검증을 켠다', { timeout: 30000 }, async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15db-'))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  writeFileSync(path.join(tmp, 'db.json'), '{}')
  let srv = await boot(tmp)
  let pool = JSON.parse(readFileSync(path.join(tmp, 'pool.json'), 'utf8'))
  assert.equal(pool.ssl.rejectUnauthorized, false)
  assert.match(srv.out(), /인증서 검증/)
  await srv.stop()
  const ca = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n'
  srv = await boot(tmp, { CHOROK_DB_CA_CERT: ca })
  t.after(() => srv.stop())
  pool = JSON.parse(readFileSync(path.join(tmp, 'pool.json'), 'utf8'))
  assert.equal(pool.ssl.rejectUnauthorized, true)
  assert.equal(pool.ssl.ca, ca)
})

test('B15 DB: 바뀐 것 없는 로그인은 계정 본채·프로필 사진 줄을 다시 쓰지 않는다', { timeout: 30000 }, async (t) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15db-'))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  writeFileSync(path.join(tmp, 'db.json'), JSON.stringify({
    'account:loginQuiet': { data: { id: 'loginQuiet', passwordHash: hashPassword('pass1234'), twitter: 'q', twitterNorm: 'q', admin: false, passwordPolicy: 2, sessionVersion: 0, updatedAt: 5,
      save: { character: { name: '조용', avatar: { kind: 'image', hash: 'h1' } }, player: { stats: {} } } } },
    'avatar:loginQuiet:main': { data: { kind: 'image', src: 'data:image/png;base64,AAAA', hash: 'h1' } },
  }))
  const srv = await boot(tmp)
  t.after(() => srv.stop())
  writeFileSync(path.join(tmp, 'sql.log'), '')
  const r = await call(srv.port, 'POST', '/api/account/login', { id: 'loginQuiet', password: 'pass1234' })
  assert.equal(r.status, 200)
  assert.equal(r.user.save.character.avatar.src, 'data:image/png;base64,AAAA') // 화면용 사진은 그대로 돌려준다
  const writes = readLog(path.join(tmp, 'sql.log')).filter((q) => /^insert into saves/i.test(q.sql))
  assert.deepEqual(writes, [], `로그인만으로 쓰기 발생: ${JSON.stringify(writes)}`)
  // 관리자 키로 처음 로그인하는 경우처럼 실제로 바뀌면 저장한다 (관리자 로그인 방식 자체는 그대로)
  const admin = await call(srv.port, 'POST', '/api/account/login', { id: 'loginQuiet', password: 'pass1234', adminKey: 'k' })
  assert.equal(admin.user.admin, true)
  assert.equal(rowsOf(path.join(tmp, 'db.json'))['account:loginQuiet'].data.admin, true)
})
