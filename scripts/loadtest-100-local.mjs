/**
 * B.14 LOCAL-ONLY load check (no Supabase; does not modify production accounts).
 * Simulates 100 unique signed-in SSE connections + authenticated GET traffic.
 * Outputs a JSON report; do not extrapolate timings to Render or PostgreSQL.
 * Run: node scripts/loadtest-100-local.mjs [50|100]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { makeToken } from '../server/accounts.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const count = Number(process.argv[2] ?? 100)
if (![50, 100].includes(count)) throw new Error('Use only 50 or 100 local connections')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chorok-loadtest-'))
const secret = 'b14-benchmark-not-a-production-secret'
const admin = 'b14-benchmark-admin-key'
const ids = Array.from({ length: count }, (_, i) => `benchuser${String(i).padStart(4, '0')}`)
const accounts = Object.fromEntries(ids.map((id) => [id, {
  id, passwordHash: 'no-password-auth-in-loadtest', save: { character: { name: id } },
  sessionVersion: 0, mustReset: false, createdAt: Date.now(),
}]))
fs.writeFileSync(path.join(tmp, 'accounts.json'), JSON.stringify({ secret, accounts }))
const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)) })
})
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port), DATABASE_URL: '', CHOROK_ENABLE_VERIFIED_ECONOMY: '0',
    CHOROK_SECRET: secret, CHOROK_ADMIN_KEY: admin,
    CHOROK_ACCOUNTS: path.join(tmp, 'accounts.json'),
    CHOROK_DATA: path.join(tmp, 'data.json'),
    CHOROK_CARDS_DATA: path.join(tmp, 'cards.json'),
    CHOROK_ECONOMY_FILE: path.join(tmp, 'economy.json'),
    CHOROK_SSE_PER_IP: '1000', // 모든 가상 사용자가 127.0.0.1 한 곳에서 접속하므로 IP당 제한을 풀어 둔다
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let errors = ''
child.stderr.on('data', (b) => { errors += b.toString().slice(0, 1000) })
const aborts = []
const streams = []
const percent = (vals, p) => vals.sort((a, b) => a - b)[Math.min(vals.length - 1, Math.max(0, Math.floor(vals.length * p)))]
const jsonFetch = async (uri, init) => {
  const r = await fetch(base + uri, { signal: AbortSignal.timeout(15000), ...init })
  const result = await r.json()
  if (!r.ok) throw new Error(`${uri} ${r.status} ${JSON.stringify(result)}`)
  return result
}
let done = false
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode != null) throw new Error('server exited before startup: ' + errors)
    try { await jsonFetch('/api/health'); break }
    catch { if (attempt === 99) throw new Error('server never became ready: ' + errors); await delay(100) }
  }
  const began = performance.now()
  await Promise.all(ids.map(async (id) => {
    const token = makeToken(secret, id)
    const ticket = await jsonFetch('/api/events/ticket', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const abort = new AbortController()
    aborts.push(abort)
    const stream = await fetch(`${base}/api/events?ticket=${encodeURIComponent(ticket.ticket)}`, { signal: abort.signal })
    if (stream.status !== 200) throw new Error(`SSE failed: ${id} ${stream.status}`)
    streams.push(stream)
  }))
  const setupMs = performance.now() - began
  await delay(500)
  const health = await jsonFetch('/api/health')
  const times = []
  const errorsByStatus = []
  await Promise.all(ids.map(async (id) => {
    const t = performance.now()
    const token = makeToken(secret, id)
    try {
      const r = await jsonFetch('/api/account/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) errorsByStatus.push(id)
    } catch (error) { errorsByStatus.push(String(error).slice(0, 180)) }
    times.push(performance.now() - t)
  }))
  // One simultaneous chat per user exercises the 100-recipient SSE fanout.
  const chatMs = []
  const chatErrors = []
  await Promise.all(ids.map(async (id, n) => {
    const t = performance.now()
    try {
      const token = makeToken(secret, id)
      await jsonFetch('/api/chat', { method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, channel: 'talk', text: `local benchmark message ${n}` }),
      })
    } catch (e) { chatErrors.push(String(e).slice(0, 120)) }
    chatMs.push(performance.now() - t)
  }))
  const afterChat = await jsonFetch('/api/health')
  const metricToken = makeToken(secret, ids[0])
  const metrics = await jsonFetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${metricToken}`, 'x-admin-key': admin } })
  const report = {
    environment: 'local-node-file-store-no-supabase',
    targetConcurrentConnections: count, actualOnline: health.online,
    setupMs: Math.round(setupMs), authGetRequests: count,
    authGetErrors: errorsByStatus.length, authGetP50Ms: Math.round(percent(times, 0.5)),
    authGetP95Ms: Math.round(percent(times, 0.95)), authGetMaxMs: Math.round(Math.max(...times)),
    concurrentChatPosts: count, chatErrors: chatErrors.length,
    chatPostP95Ms: Math.round(percent(chatMs, 0.95)), onlineAfterChat: afterChat.online,
    sseConnects: metrics.sseConnectCount, sseWrites: metrics.sseSendCount,
    sseSendBytes: metrics.sseSendBytes, sseSlowDisconnects: metrics.sseSlowDisconnects,
    economyReadCount: metrics.economyReadCount, economyWriteCount: metrics.economyWriteCount,
    accountAuthDbLookupsEquivalent: metrics.authLookups,
    caveat: 'No real PostgreSQL/Supabase or Render latency; not a production capacity guarantee',
  }
  if (health.online !== count || afterChat.online !== count || errorsByStatus.length || chatErrors.length) throw new Error('load test failed: ' + JSON.stringify(report))
  done = true
  console.log(JSON.stringify(report, null, 2))
} finally {
  for (const ctrl of aborts) ctrl.abort()
  child.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(2000)])
  if (child.exitCode == null) child.kill('SIGKILL')
  fs.rmSync(tmp, { recursive: true, force: true })
  if (!done && errors) console.error('server stderr:', errors.slice(0, 1500))
}
