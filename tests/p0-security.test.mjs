import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import crypto from 'node:crypto'
import { hashPassword, readTokenClaims, makeToken } from '../server/accounts.js'
import { NEW_ID_RULE, validNewPassword } from '../server/authPolicy.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))
async function freePort() {
  const s = net.createServer()
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve))
  const port = s.address().port
  await new Promise((resolve) => s.close(resolve))
  return port
}
async function request(port, method, route, body, token) {
  const r = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: r.status, ...await r.json() }
}
const post = (port, route, body, token) => request(port, 'POST', route, body, token)
const get = (port, route, token) => request(port, 'GET', route, undefined, token)

async function startServer() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-p0-'))
  const port = await freePort()
  const secretKey = 'test-key-never-deploy'
  // 기존 가입 계정: 새 가입 정책 적용 대상이 아니므로 짧은 아이디/비밀번호를 유지한다.
  writeFileSync(path.join(tmp, 'accounts.json'), JSON.stringify({ secret: null, accounts: {
    oldA: { id: 'oldA', passwordHash: hashPassword('abcd'), twitter: 'oldA', createdAt: 1, admin: false, save: null, updatedAt: 1 },
  } }))
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd,
    env: {
      ...process.env, DATABASE_URL: '', PORT: String(port), CHOROK_ADMIN_KEY: secretKey,
      CHOROK_DATA: path.join(tmp, 'data.json'), CHOROK_CARDS_DATA: path.join(tmp, 'cards.json'),
      CHOROK_ACCOUNTS: path.join(tmp, 'accounts.json'),
      CHOROK_ENABLE_UNSAFE_ECONOMY: '0', CHOROK_ENABLE_UNVERIFIED_RANKING: '0',
      CHOROK_ALLOW_UNVERIFIED_ADOPT: '0',
    }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) break
    try { if ((await get(port, '/api/health')).ok) { ready = true; break } } catch { /* waiting for server */ }
    await sleep(50)
  }
  assert.ok(ready, `server failed: ${stderr.slice(0, 1000)}`)
  return {
    port, secretKey,
    async stop() {
      child.kill('SIGTERM')
      await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(3000)])
      rmSync(tmp, { recursive: true, force: true })
    },
  }
}

async function join(port, id, token, key = '') {
  const t = await post(port, '/api/events/ticket', { id, ...(key ? { key } : {}) }, token)
  assert.equal(t.status, 200)
  const controller = new AbortController()
  const result = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${encodeURIComponent(t.ticket)}`, { signal: controller.signal })
  assert.equal(result.status, 200)
  const reader = result.body.getReader()
  let bytes = ''
  for (let i = 0; i < 5 && !bytes.includes('"t":"hello"'); i++) {
    const r = await reader.read()
    bytes += new TextDecoder().decode(r.value)
  }
  assert.match(bytes, /"t":"hello"/)
  const helloFrame = bytes.split('\n').find((line) => line.startsWith('data: '))
  const hello = JSON.parse(helloFrame.slice(6))
  return { hello, ticket: t.ticket, async close() { controller.abort(); await reader.cancel().catch(() => {}) } }
}

test('P0: 신규 규칙과 기존 계정 예외, 인증 전용 SSE, 사칭 차단, 거래·랭킹 보류', { timeout: 25000 }, async () => {
  const server = await startServer()
  const streams = []
  try {
    const { port, secretKey } = server
    assert.equal(NEW_ID_RULE.test('abcdefgh'), true)
    assert.equal(NEW_ID_RULE.test('abcde123'), false)
    assert.equal(validNewPassword('letters1'), true)
    assert.equal(validNewPassword('lettersletters'), false)
    assert.equal(validNewPassword('12345678'), false)
    const legacyBody = Buffer.from(`oldA|${Date.now() + 60_000}`).toString('base64url')
    const oldSignature = crypto.createHmac('sha256', 'local-signature-key').update(legacyBody).digest('base64url')
    assert.deepEqual(readTokenClaims('local-signature-key', `${legacyBody}.${oldSignature}`), { id: 'oldA', version: 0 }, 'old signed tokens remain parsable')
    assert.deepEqual(readTokenClaims('local-signature-key', makeToken('local-signature-key', 'aliceUser', 4)), { id: 'aliceUser', version: 4 })

    const signup = (id, password) => post(port, '/api/account/signup', { id, password, twitter: id })
    assert.equal((await signup('short', 'goodpass1')).error, 'bad-id')
    assert.equal((await signup('letter12', 'goodpass1')).error, 'bad-id')
    assert.equal((await signup('longletters', 'lettersOnly')).error, 'bad-password')
    assert.equal((await signup('longletters', '123456789')).error, 'bad-password')
    const alice = await signup('aliceUser', 'pass1234')
    const bob = await signup('bravoUser', 'pass1234')
    assert.equal(alice.ok, true)
    assert.equal(bob.ok, true)

    const old = await post(port, '/api/account/login', { id: 'oldA', password: 'abcd' })
    assert.equal(old.ok, true, 'existing users keep older login policy')
    assert.equal((await post(port, '/api/account/login', { id: 'oldA', password: 'incorrect' })).status, 401)

    assert.equal((await get(port, '/api/events?id=aliceUser')).status, 401, 'SSE without ticket is rejected')
    assert.equal((await post(port, '/api/events/ticket', { id: 'aliceUser' })).status, 401)
    assert.equal((await post(port, '/api/events/ticket', { id: 'bravoUser' }, alice.token)).status, 403)
    assert.equal((await get(port, '/api/market?id=aliceUser')).status, 401)
    assert.equal((await get(port, '/api/card?id=aliceUser&target=bravoUser', alice.token)).status, 409) // own id valid, but no SSE connection yet
    assert.equal((await get(port, '/api/market?id=bravoUser', alice.token)).status, 403)

    // 올바른 관리자 키 검증은 (아직 로그인하지 않은) 아무 계정에 관리자 직함을 부여하면 안 된다.
    assert.equal((await post(port, '/api/admin/verify', { id: 'aliceUser', key: secretKey })).ok, true)
    streams.push(await join(port, 'aliceUser', alice.token))
    streams.push(await join(port, 'bravoUser', bob.token))
    assert.equal(streams[0].hello.you.title, undefined)
    assert.equal((await get(port, `/api/events?ticket=${streams[0].ticket}`)).status, 401, 'SSE ticket cannot be replayed')

    assert.equal((await post(port, '/api/mail/send', { id: 'aliceUser', to: 'bravoUser', text: 'fake' })).status, 401)
    assert.equal((await post(port, '/api/mail/send', { id: 'bravoUser', to: 'aliceUser', text: 'fake' }, alice.token)).status, 403)
    assert.equal((await post(port, '/api/mail/send', { id: 'aliceUser', to: 'bravoUser', text: 'hello' }, alice.token)).ok, true)
    assert.equal((await post(port, '/api/admin/chat-title', { id: 'aliceUser', key: secretKey, target: 'bravoUser', title: '별' })).status, 401)
    assert.equal((await post(port, '/api/admin/chat-title', { id: 'bravoUser', key: secretKey, target: 'aliceUser', title: '별' }, alice.token)).status, 403)

    const market = await get(port, '/api/market?id=aliceUser', alice.token)
    assert.equal(market.ok, true)
    assert.equal(market.maintenance, true)
    assert.equal((await post(port, '/api/market/list', { id: 'aliceUser', item: 'stone', qty: 99, price: 1 }, alice.token)).error, 'economy-verification-pending')
    assert.equal((await post(port, '/api/market/buy', { id: 'aliceUser', listing: 'm1' }, alice.token)).status, 503)
    assert.equal((await post(port, '/api/market/claim', { id: 'aliceUser' }, alice.token)).status, 503)
    assert.equal((await post(port, '/api/gift', { id: 'aliceUser', to: 'bravoUser', items: { stone: 5 } }, alice.token)).status, 503)
    assert.equal((await post(port, '/api/ranking', { id: 'bravoUser', course: 'talisman-2048', score: 99999 }, alice.token)).status, 403)
    // B.15: 세션·진행 기록 없이 점수만 보내는 위조 제출은 거절된다.
    assert.equal((await post(port, '/api/ranking', { id: 'aliceUser', course: 'talisman-2048', score: 999999999 }, alice.token)).error, 'session-expired')

    assert.equal((await post(port, '/api/account/password', { password: 'lettersonly' }, alice.token)).error, 'bad-password')
    const pw = await post(port, '/api/account/password', { password: 'newpass123' }, alice.token)
    assert.equal(pw.ok, true)
    assert.ok(pw.token)
    assert.equal((await get(port, '/api/account/me', alice.token)).status, 401, 'prior token must be invalid')
    assert.equal((await get(port, '/api/account/me', pw.token)).status, 200, 'new session must remain usable')
    assert.equal((await post(port, '/api/events/ticket', { id: 'aliceUser' }, alice.token)).status, 401)

    assert.equal((await post(port, '/api/account/adopt', { local: { id: 'legacyFoo', passwordHash: '11111111' } })).error, 'legacy-migration-paused')
  } finally {
    for (const s of streams) await s.close().catch(() => {})
    await server.stop()
  }
})
