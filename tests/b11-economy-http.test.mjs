import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const key = (n) => `b11-network-action-${String(n).padStart(12, '0')}`
const portAvailable = async () => {
  const s = net.createServer()
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve))
  const p = s.address().port
  await new Promise((resolve) => s.close(resolve))
  return p
}
async function req(port, method, route, token, body) {
  const res = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: res.status, ...await res.json() }
}
const post = (p, route, token, body) => req(p, 'POST', route, token, body)
const get = (p, route, token) => req(p, 'GET', route, token)
async function start(t, enabled = true) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'chorok-b11-http-'))
  const port = await portAvailable()
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port), DATABASE_URL: '', CHOROK_ADMIN_KEY: '',
      CHOROK_DATA: path.join(dir, 'data.json'), CHOROK_ACCOUNTS: path.join(dir, 'accounts.json'),
      CHOROK_CARDS_DATA: path.join(dir, 'cards.json'), CHOROK_ECONOMY_FILE: path.join(dir, 'economy.json'),
      CHOROK_ENABLE_VERIFIED_ECONOMY: enabled ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let errors = ''
  child.stderr.on('data', (d) => { errors += d.toString() })
  t.after(async () => {
    child.kill('SIGTERM')
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2500)])
    rmSync(dir, { recursive: true, force: true })
  })
  for (let i = 0; i < 160; i++) {
    try { if ((await get(port, '/api/health')).ok) return port } catch { /* startup */ }
    await sleep(40)
  }
  assert.fail(`server boot failed: ${errors.slice(0, 1000)}`)
}
async function connectSse(t, port, id, token) {
  const ticket = await post(port, '/api/events/ticket', token, { id })
  assert.equal(ticket.status, 200)
  const controller = new AbortController()
  const response = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${ticket.ticket}`, { signal: controller.signal })
  assert.equal(response.status, 200)
  const reader = response.body.getReader()
  await reader.read()
  t.after(async () => { controller.abort(); await reader.cancel().catch(() => {}) })
}

test('B11 HTTP: 채집 시작 후 허위 시간/보상 제출과 타인 명의 요청 차단', { timeout: 25000 }, async (t) => {
  const port = await start(t)
  const alice = await post(port, '/api/account/signup', null, { id: 'gatherAlice', password: 'password1', twitter: 'gatherAlice' })
  const bob = await post(port, '/api/account/signup', null, { id: 'gatherBobbb', password: 'password1', twitter: 'gatherBobbb' })
  assert.equal(alice.ok, true)
  assert.equal(bob.ok, true)
  await connectSse(t, port, 'gatherAlice', alice.token)
  assert.equal((await get(port, '/api/economy/wallet')).status, 401)
  assert.equal((await post(port, '/api/economy/gather/start', null, { id: 'gatherAlice', requestId: key(1), spotId: 'garden' })).status, 401)
  assert.equal((await post(port, '/api/economy/gather/start', alice.token, { id: 'gatherBobbb', requestId: key(2), spotId: 'garden' })).status, 403)
  assert.equal((await post(port, '/api/economy/gather/start', alice.token, { id: 'gatherAlice', requestId: key(3), spotId: 'bogus' })).error, 'unknown-gather-site')
  const started = await post(port, '/api/economy/gather/start', alice.token, {
    id: 'gatherAlice', requestId: key(4), spotId: 'garden', startedAt: 0, readyAt: 0, items: { stone: 100000 }, money: 1000000,
  })
  assert.equal(started.status, 200)
  const wallet = await get(port, '/api/economy/wallet', alice.token)
  assert.ok(wallet.wallet.gathering.readyAt > Date.now())
  assert.equal(wallet.wallet.money, 0)
  assert.deepEqual(wallet.wallet.inventory, {})
  const early = await post(port, '/api/economy/gather/claim', alice.token, { id: 'gatherAlice', requestId: key(5), readyAt: 0, items: { stone: 999999 }, money: 9999999999 })
  assert.equal(early.status, 409)
  assert.equal(early.error, 'gather-not-ready')
  const save = await post(port, '/api/account/save', alice.token, { base: alice.user.updatedAt, account: { save: { player: { money: 9999999, inventory: { stone: 999999 }, gathering: { readyAt: 0 } } } } })
  assert.equal(save.ok, true)
  assert.deepEqual((await get(port, '/api/economy/wallet', alice.token)).wallet.inventory, {})
  assert.equal((await post(port, '/api/economy/npc/sell', alice.token, { id: 'gatherAlice', requestId: key(6), item: 'stone', qty: 1, price: 999999 })).error, 'npc-not-buying')
  assert.equal((await post(port, '/api/economy/craft', alice.token, { id: 'gatherAlice', requestId: key(7), recipeId: 'r-whetstone', qty: 1 })).error, 'insufficient-items')
  assert.equal((await get(port, '/api/economy/wallet', bob.token)).wallet.money, 0)
})

test('B11 HTTP: 검증 게임 행동도 기능 플래그를 끄면 작동하지 않는다', { timeout: 25000 }, async (t) => {
  const port = await start(t, false)
  const alice = await post(port, '/api/account/signup', null, { id: 'gatherAlice', password: 'password1', twitter: 'gatherAlice' })
  await connectSse(t, port, 'gatherAlice', alice.token)
  const result = await post(port, '/api/economy/gather/start', alice.token, { id: 'gatherAlice', requestId: key(8), spotId: 'garden' })
  assert.equal(result.status, 503)
  assert.equal(result.error, 'verified-economy-not-activated')
})
