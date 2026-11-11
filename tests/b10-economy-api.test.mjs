import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const cwd = fileURLToPath(new URL('../', import.meta.url))
async function freePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}
async function req(port, method, route, body, token) {
  const resp = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: resp.status, ...await resp.json() }
}
const post = (p, r, b, t) => req(p, 'POST', r, b, t)
const get = (p, r, t) => req(p, 'GET', r, undefined, t)
const key = (n) => `verified-client-req-${n.toString().padStart(8, '0')}`

async function withServer(t, verified = true) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'chorok-b10-api-'))
  const port = await freePort()
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd,
    env: {
      ...process.env, PORT: String(port), DATABASE_URL: '', CHOROK_DATA: path.join(dir, 'data.json'),
      CHOROK_CARDS_DATA: path.join(dir, 'cards.json'), CHOROK_ACCOUNTS: path.join(dir, 'accounts.json'),
      CHOROK_ECONOMY_FILE: path.join(dir, 'economy.json'), CHOROK_ADMIN_KEY: '',
      CHOROK_ENABLE_UNSAFE_ECONOMY: '1', CHOROK_ENABLE_UNVERIFIED_RANKING: '1',
      CHOROK_ENABLE_VERIFIED_ECONOMY: verified ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (b) => { stderr += b.toString() })
  t.after(async () => {
    child.kill('SIGTERM')
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2000)])
    rmSync(dir, { recursive: true, force: true })
  })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) break
    try { if ((await get(port, '/api/health')).ok) return port } catch { /* loading */ }
    await sleep(50)
  }
  assert.fail(`server did not start: ${stderr.slice(0, 1000)}`)
}
async function connectSse(port, id, token, t) {
  const ticket = await post(port, '/api/events/ticket', { id }, token)
  assert.equal(ticket.status, 200)
  const controller = new AbortController()
  const response = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${ticket.ticket}`, { signal: controller.signal })
  assert.equal(response.status, 200)
  const reader = response.body.getReader()
  await reader.read()
  t.after(async () => { controller.abort(); await reader.cancel().catch(() => {}) })
}

test('B10 통합: 기존 SAVE의 위조 금액/아이템은 서버 거래 잔액에 절대 입금되지 않는다', { timeout: 25000 }, async (t) => {
  const port = await withServer(t)
  const alice = await post(port, '/api/account/signup', { id: 'verifiedAlice', password: 'password1', twitter: 'verifiedAlice' })
  const bob = await post(port, '/api/account/signup', { id: 'verifiedBravoo', password: 'password1', twitter: 'verifiedBravoo' })
  assert.equal(alice.ok, true)
  assert.equal(bob.ok, true)
  await connectSse(port, 'verifiedAlice', alice.token, t)
  await connectSse(port, 'verifiedBravoo', bob.token, t)
  assert.equal((await get(port, '/api/economy/wallet')).status, 401)
  assert.equal((await get(port, '/api/economy/wallet', alice.token)).wallet.money, 0)
  const save = await post(port, '/api/account/save', {
    base: alice.user.updatedAt,
    account: { save: { player: { money: 900000000, inventory: { stone: 999999 } } } },
  }, alice.token)
  assert.equal(save.ok, true)
  assert.equal((await get(port, '/api/economy/wallet', alice.token)).wallet.money, 0)
  assert.deepEqual((await get(port, '/api/economy/wallet', alice.token)).wallet.inventory, {})
  const forged = await post(port, '/api/economy/market/list', {
    id: 'verifiedAlice', requestId: key(1), item: 'stone', qty: 10, price: 1,
  }, alice.token)
  assert.equal(forged.error, 'insufficient-items')
  assert.equal(forged.status, 409)
  const pretending = await post(port, '/api/economy/market/list', {
    id: 'verifiedBravoo', requestId: key(2), item: 'stone', qty: 10, price: 1,
  }, alice.token)
  assert.equal(pretending.status, 403)
  assert.equal((await post(port, '/api/economy/market/list', { id: 'verifiedAlice', item: 'stone', qty: 1, price: 1 }, alice.token)).error, 'request-id-required')
  assert.equal((await post(port, '/api/economy/market/list', { id: 'verifiedAlice', requestId: key(3), item: 'not-real', qty: 1, price: 1 }, alice.token)).error, 'not-tradable')
  // 이전에 존재했던 우회 env=1을 설정해도 레거시 거래/랭킹이 다시 열리면 안 된다.
  assert.equal((await post(port, '/api/market/list', { id: 'verifiedAlice', item: 'stone', qty: 2, price: 1 }, alice.token)).status, 503)
  // B.15: 랭킹은 서버 세션·재현 검증을 통과해야만 오른다. 세션 없는 점수만 보내면 거절된다.
  assert.equal((await post(port, '/api/ranking', { id: 'verifiedAlice', course: 'talisman-2048', score: 100000 }, alice.token)).status, 410)
})

test('B10 통합: 신규 검증 장부 API는 기본 비활성화되고 읽기는 로그인 인증 필요', { timeout: 25000 }, async (t) => {
  const port = await withServer(t, false)
  const alice = await post(port, '/api/account/signup', { id: 'verifiedAlice', password: 'password1', twitter: 'verifiedAlice' })
  assert.equal(alice.ok, true)
  await connectSse(port, 'verifiedAlice', alice.token, t)
  const r = await post(port, '/api/economy/market/claim', { id: 'verifiedAlice', requestId: key(1) }, alice.token)
  assert.equal(r.status, 503)
  assert.equal(r.error, 'verified-economy-not-activated')
  assert.equal((await get(port, '/api/economy/market')).status, 401)
  assert.equal((await get(port, '/api/economy/wallet', alice.token)).wallet.money, 0)
  assert.equal((await get(port, '/api/economy/status')).tradingEnabled, false)
})
