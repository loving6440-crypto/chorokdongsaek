import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const key = (n) => `b12-http-garden-${String(n).padStart(18, '0')}`
async function freePort() {
  const s = createServer()
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve))
  const port = s.address().port
  await new Promise((resolve) => s.close(resolve))
  return port
}
const send = async (port, method, route, token, body) => {
  const res = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: res.status, ...await res.json() }
}
const post = (port, path, token, data) => send(port, 'POST', path, token, data)
const get = (port, path, token) => send(port, 'GET', path, token)
async function start(t, state) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chorok-b12-http-'))
  const port = await freePort()
  const env = { ...process.env, PORT: String(port), DATABASE_URL: '', CHOROK_ADMIN_KEY: '', CHOROK_DATA: path.join(dir, 'data.json'), CHOROK_ACCOUNTS: path.join(dir, 'accounts.json'), CHOROK_CARDS_DATA: path.join(dir, 'cards.json'), CHOROK_ECONOMY_FILE: path.join(dir, 'ledger.json') }
  delete env.CHOROK_ENABLE_VERIFIED_ECONOMY
  if (state !== undefined) env.CHOROK_ENABLE_VERIFIED_ECONOMY = state
  const child = spawn(process.execPath, ['server/index.js'], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let errors = ''
  child.stderr.on('data', (d) => { errors += d.toString() })
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM')
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1800)])
    fs.rmSync(dir, { recursive: true, force: true })
  })
  for (let i = 0; i < 120; i++) {
    try { if ((await get(port, '/api/health')).ok) return port } catch { /* boot */ }
    await sleep(40)
  }
  assert.fail(errors || 'server did not respond')
}
async function user(t, port, id) {
  const r = await post(port, '/api/account/signup', null, { id, password: 'password1', twitter: id })
  assert.equal(r.status, 200)
  const ticket = await post(port, '/api/events/ticket', r.token, { id })
  assert.equal(ticket.status, 200)
  const abort = new AbortController()
  const response = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${ticket.ticket}`, { signal: abort.signal })
  assert.equal(response.status, 200)
  const reader = response.body.getReader()
  await reader.read()
  t.after(async () => { abort.abort(); await reader.cancel().catch(() => {}) })
  return r.token
}

test('B12 HTTP: 기본 환경변수 누락 시에도 검증 경제 등록/텃밭 액션 비활성화', { timeout: 20000 }, async (t) => {
  const port = await start(t)
  const token = await user(t, port, 'gardenDefaultOff')
  const w = await get(port, '/api/economy/wallet', token)
  assert.equal(w.tradingEnabled, false)
  const r = await post(port, '/api/economy/garden/buy', token, { id: 'gardenDefaultOff', requestId: key(1), seedId: 'seed-carrot', qty: 1 })
  assert.equal(r.status, 503)
  assert.equal(r.error, 'verified-economy-not-activated')
  assert.equal((await get(port, '/api/economy/wallet', token)).wallet.money, 0)
})

test('B12 HTTP: 기능 활성화 후 인증/타인 사칭/거짓 재고 요청/슬롯 검사', { timeout: 20000 }, async (t) => {
  const port = await start(t, '1')
  const alice = await user(t, port, 'gardenPlayerAlice')
  const bob = await user(t, port, 'gardenPlayerBobbb')
  const base = { id: 'gardenPlayerAlice', requestId: key(2), seedId: 'seed-carrot', qty: 1, money: 1000000 }
  assert.equal((await post(port, '/api/economy/garden/buy', null, base)).status, 401)
  assert.equal((await post(port, '/api/economy/garden/buy', bob, base)).status, 403)
  assert.equal((await post(port, '/api/economy/garden/buy', alice, base)).error, 'insufficient-money')
  const account = await get(port, '/api/account/me', alice)
  const forged = await post(port, '/api/account/save', alice, {
    base: account.user.updatedAt,
    account: { save: { player: { money: 9_999_999, inventory: { 'seed-carrot': 99, carrot: 99 }, gardenPlots: [{ seedId: 'seed-carrot', plantedAt: 1 }] } } },
  })
  assert.equal(forged.ok, true)
  assert.equal((await post(port, '/api/economy/garden/buy', alice, { ...base, requestId: key(5) })).error, 'insufficient-money')
  assert.equal((await post(port, '/api/economy/garden/plant', alice, { id: base.id, requestId: key(3), seedId: 'seed-carrot', slot: 0, inventory: { 'seed-carrot': 99 } })).error, 'insufficient-items')
  assert.equal((await post(port, '/api/economy/garden/harvest', alice, { id: base.id, requestId: key(4), slot: 0, readyAt: 0, qty: 9999 })).error, 'plot-empty')
  const w = await get(port, '/api/economy/wallet', alice)
  assert.deepEqual(w.wallet.gardenPlots, [null, null, null, null, null])
  assert.deepEqual(w.wallet.inventory, {})
})
