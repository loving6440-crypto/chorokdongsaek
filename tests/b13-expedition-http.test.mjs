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
const key = (n) => `b13-http-operation-${String(n).padStart(12, '0')}`
async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}
const api = async (port, method, route, token, body) => {
  const res = await fetch(`http://127.0.0.1:${port}${route}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: res.status, ...await res.json() }
}
const post = (port, route, token, body) => api(port, 'POST', route, token, body)
const get = (port, route, token) => api(port, 'GET', route, token)
async function start(t, enabled = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b13-http-'))
  const port = await freePort()
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd, env: {
      ...process.env, PORT: String(port), DATABASE_URL: '', CHOROK_ADMIN_KEY: '',
      CHOROK_DATA: path.join(dir, 'data.json'), CHOROK_ACCOUNTS: path.join(dir, 'accounts.json'),
      CHOROK_CARDS_DATA: path.join(dir, 'cards.json'), CHOROK_ECONOMY_FILE: path.join(dir, 'economy.json'),
      CHOROK_ENABLE_VERIFIED_ECONOMY: enabled ? '1' : '0',
    }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (d) => { stderr += d.toString() })
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM')
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(2000)])
    fs.rmSync(dir, { recursive: true, force: true })
  })
  for (let i = 0; i < 150; i++) {
    try { if ((await get(port, '/api/health')).ok) return port } catch { /* boot */ }
    await sleep(40)
  }
  assert.fail(`startup failed: ${stderr}`)
}
async function user(t, port, id) {
  const account = await post(port, '/api/account/signup', null, { id, password: 'password1', twitter: id })
  assert.equal(account.status, 200)
  const ticket = await post(port, '/api/events/ticket', account.token, { id })
  assert.equal(ticket.status, 200)
  const abort = new AbortController()
  const stream = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${ticket.ticket}`, { signal: abort.signal })
  assert.equal(stream.status, 200)
  const reader = stream.body.getReader()
  await reader.read()
  t.after(async () => { abort.abort(); await reader.cancel().catch(() => {}) })
  return account.token
}
test('B13 HTTP: 기본 비활성화/인증/사칭/서버 움직임 검증', { timeout: 25000 }, async (t) => {
  const port = await start(t, true)
  const alice = await user(t, port, 'expeditionAlice')
  const bob = await user(t, port, 'expeditionBobby')
  const cmd = (id, requestId, extra = {}) => ({ id, requestId, ...extra })
  assert.equal((await post(port, '/api/economy/expedition/enter', null, cmd('expeditionAlice', key(1), {siteId: 'left-trail-1'}))).status, 401)
  assert.equal((await post(port, '/api/economy/expedition/enter', bob, cmd('expeditionAlice', key(2), {siteId: 'left-trail-1'}))).status, 403)
  const entry = await post(port, '/api/economy/expedition/enter', alice, cmd('expeditionAlice', key(3), {siteId: 'left-trail-1', mp: 999999, stats: {agility: 999999}, items: {'stone': 999}}))
  assert.equal(entry.status, 200)
  assert.equal(entry.energy, 90)
  assert.equal((await get(port, '/api/economy/wallet', alice)).wallet.money, 0)
  const illegal = await post(port, '/api/economy/expedition/move', alice, cmd('expeditionAlice', key(4), {position: {x: 8, y: 9}, items: {mushroom: 100000}}))
  assert.equal(illegal.status, 409)
  assert.equal(illegal.error, 'expedition-invalid-move')
  const early = await post(port, '/api/economy/expedition/attempt', alice, cmd('expeditionAlice', key(5), {nodeId: 'I10', success: true, items: {mushroom: 999}}))
  assert.equal(early.status, 409)
  const account = await get(port, '/api/account/me', alice)
  assert.equal((await post(port, '/api/account/save', alice, {
    base: account.user.updatedAt, account: { save: { player: {mp: 9999999, inventory: {mushroom: 999999}, huntExpedition: {rewards: {mushroom: 9999}, status: 'finished'} } } },
  })).ok, true)
  assert.deepEqual((await get(port, '/api/economy/wallet', alice)).wallet.inventory, {})
  assert.equal((await post(port, '/api/economy/expedition/move', alice, cmd('expeditionAlice', key(6), {position: {x: 0, y: 8}}))).status, 200)
  assert.equal((await post(port, '/api/economy/expedition/leave', alice, cmd('expeditionAlice', key(7), {win: true, items: {'gold-crown': 999}}))).status, 200)
  assert.equal((await post(port, '/api/economy/expedition/leave', alice, cmd('expeditionAlice', key(7)))).replay, true)
  const wallet = (await get(port, '/api/economy/wallet', alice)).wallet
  assert.equal(wallet.expedition.status, 'finished')
  assert.equal(wallet.expedition.turn, 1)
  assert.equal(wallet.expeditionEnergy, 90)
  assert.deepEqual(wallet.inventory, {})
})
test('B13 HTTP: 운영 기본 OFF에서는 개척 지급 API 차단', { timeout: 25000 }, async (t) => {
  const port = await start(t, false)
  const token = await user(t, port, 'expeditionDefaultOff')
  const wallet = await get(port, '/api/economy/wallet', token)
  assert.equal(wallet.tradingEnabled, false)
  const attempt = await post(port, '/api/economy/expedition/enter', token, { id: 'expeditionDefaultOff', requestId: key(8), siteId: 'left-trail-1' })
  assert.equal(attempt.status, 503)
  assert.equal(attempt.error, 'verified-economy-not-activated')
  assert.equal((await get(port, '/api/economy/wallet', token)).wallet.expedition, null)
})
