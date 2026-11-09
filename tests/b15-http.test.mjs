import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { hashPassword, makeToken } from '../server/accounts.js'
import { step } from '../src/game/minigames/logic2048.js'
import { MOVE_CODE_2048, seeded2048 } from '../src/game/minigames/rankedVerify.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const SECRET = 'b15-test-secret-never-deploy'
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
  return { status: r.status, ...await r.json().catch(() => ({})) }
}
const post = (port, route, body, token) => request(port, 'POST', route, body, token)
const get = (port, route, token) => request(port, 'GET', route, undefined, token)

const account = (id, extra = {}) => ({
  id, passwordHash: hashPassword('pass1234'), twitter: id, createdAt: 1, admin: false, passwordPolicy: 2, sessionVersion: 0, updatedAt: 1, save: null, ...extra,
})

export async function startServer(t, { accounts = {}, env = {} } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b15-'))
  const port = await freePort()
  writeFileSync(path.join(tmp, 'accounts.json'), JSON.stringify({ secret: SECRET, accounts }))
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd,
    env: {
      ...process.env, DATABASE_URL: '', PORT: String(port), CHOROK_ADMIN_KEY: 'b15-admin-key', CHOROK_SECRET: SECRET,
      CHOROK_DATA: path.join(tmp, 'data.json'), CHOROK_CARDS_DATA: path.join(tmp, 'cards.json'),
      CHOROK_ACCOUNTS: path.join(tmp, 'accounts.json'), CHOROK_ECONOMY_FILE: path.join(tmp, 'economy.json'),
      ...env,
    }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (c) => { stderr += c.toString() })
  let ready = false
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) break
    try { if ((await get(port, '/api/health')).ok) { ready = true; break } } catch { /* waiting */ }
    await sleep(50)
  }
  assert.ok(ready, `server failed: ${stderr.slice(0, 1500)}`)
  const stop = async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM')
      await Promise.race([new Promise((r) => child.once('exit', r)), sleep(4000)])
    }
  }
  t.after(async () => { await stop(); rmSync(tmp, { recursive: true, force: true }) })
  return { port, tmp, stop, stderr: () => stderr }
}
const tokenOf = (id) => makeToken(SECRET, id, 0)

async function join(port, id) {
  const ticket = await post(port, '/api/events/ticket', { id }, tokenOf(id))
  assert.equal(ticket.status, 200)
  const controller = new AbortController()
  const r = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${encodeURIComponent(ticket.ticket)}`, { signal: controller.signal })
  assert.equal(r.status, 200)
  const reader = r.body.getReader()
  let bytes = ''
  for (let i = 0; i < 6 && !bytes.includes('"t":"hello"'); i++) bytes += new TextDecoder().decode((await reader.read()).value)
  return { close: () => controller.abort(), reader }
}

function short2048(seed, n = 12) {
  const { game: first, rand } = seeded2048(seed)
  let game = first
  let moves = ''
  for (const dir of ['left', 'up', 'right', 'down', 'left', 'up', 'left', 'down', 'right', 'up', 'left', 'down', 'right', 'up', 'left', 'down']) {
    if (moves.length >= n) break
    const next = step(game, dir, rand)
    if (next === game) continue
    moves += MOVE_CODE_2048[dir]
    game = next
  }
  return { moves, score: game.score }
}

test('B15 HTTP: 랭킹은 서버 세션 + 재현 검증을 통과해야만 기록된다', { timeout: 30000 }, async (t) => {
  const { port } = await startServer(t, { accounts: { rankerAlpha: account('rankerAlpha'), rankerBravo: account('rankerBravo') } })
  const a = tokenOf('rankerAlpha')
  // 인증·본인 확인
  assert.equal((await post(port, '/api/ranking/session', { id: 'rankerAlpha', course: 'talisman-2048' })).status, 401)
  assert.equal((await post(port, '/api/ranking/session', { id: 'rankerBravo', course: 'talisman-2048' }, a)).status, 403)
  assert.equal((await post(port, '/api/ranking/session', { id: 'rankerAlpha', course: 'nope' }, a)).status, 404)

  const sess = await post(port, '/api/ranking/session', { id: 'rankerAlpha', course: 'talisman-2048' }, a)
  assert.equal(sess.status, 200)
  assert.ok(sess.sid && Number.isInteger(sess.seed))

  // 점수만 크게 적고 기록이 엉터리면 거절
  const forged = await post(port, '/api/ranking', { id: 'rankerAlpha', course: 'talisman-2048', sid: sess.sid, score: 999999, proof: { moves: 'lrud'.repeat(200) } }, a)
  assert.equal(forged.status, 422)
  // 다른 사람의 세션으로는 제출 불가
  assert.equal((await post(port, '/api/ranking', { id: 'rankerBravo', course: 'talisman-2048', sid: sess.sid, proof: {} }, tokenOf('rankerBravo'))).status, 410)
  // 과목 바꿔치기
  assert.equal((await post(port, '/api/ranking', { id: 'rankerAlpha', course: 'ward-tetris', sid: sess.sid, proof: {} }, a)).status, 409)

  // 진짜 판: 브라우저와 같은 규칙으로 둔 기록 → 서버가 같은 점수를 계산하고 기록
  const run = short2048(sess.seed)
  const ok = await post(port, '/api/ranking', { id: 'rankerAlpha', course: 'talisman-2048', sid: sess.sid, score: 999999, proof: { moves: run.moves } }, a)
  assert.equal(ok.status, 200)
  assert.equal(ok.score, run.score) // 브라우저가 적은 999999 가 아니라 서버 재현 점수
  if (run.score > 0) {
    assert.equal(ok.recorded, true)
    const board = await get(port, '/api/ranking/talisman-2048?id=rankerAlpha')
    assert.equal(board.submissionsPaused, false)
    assert.equal(board.top[0].id, 'rankerAlpha')
    assert.equal(board.top[0].score, run.score)
  }
})

test('B15 HTTP: 관리자 계정 기록은 검증돼도 랭킹에 올리지 않는다', { timeout: 30000 }, async (t) => {
  const { port } = await startServer(t, { accounts: { adminRanker: account('adminRanker', { admin: true }) } })
  const tok = tokenOf('adminRanker')
  const sess = await post(port, '/api/ranking/session', { id: 'adminRanker', course: 'talisman-2048' }, tok)
  const run = short2048(sess.seed)
  const r = await post(port, '/api/ranking', { id: 'adminRanker', course: 'talisman-2048', sid: sess.sid, proof: { moves: run.moves } }, tok)
  assert.equal(r.status, 200)
  assert.equal(r.recorded, false)
  assert.equal((await get(port, '/api/ranking/talisman-2048')).total, 0)
})

test('B15 HTTP: 서버에 저장된 캐릭터가 없으면 다인 전투 스탯을 받아 주지 않는다', { timeout: 30000 }, async (t) => {
  const { port } = await startServer(t, { accounts: { mbNoSave: account('mbNoSave') } })
  const conn = await join(port, 'mbNoSave')
  t.after(() => conn.close())
  const r = await post(port, '/api/mb/start', { id: 'mbNoSave', enemy: 'foxfire', me: { stats: { insight: 999 } } }, tokenOf('mbNoSave'))
  assert.equal(r.status, 409)
  assert.equal(r.error, 'character-not-synced')
})

test('B15 HTTP: 한 IP 의 실시간 접속 수 제한', { timeout: 30000 }, async (t) => {
  const { port } = await startServer(t, { accounts: { ipUserOne: account('ipUserOne'), ipUserTwo: account('ipUserTwo') }, env: { CHOROK_SSE_PER_IP: '1' } })
  const first = await join(port, 'ipUserOne')
  t.after(() => first.close())
  const ticket = await post(port, '/api/events/ticket', { id: 'ipUserTwo' }, tokenOf('ipUserTwo'))
  const r = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${encodeURIComponent(ticket.ticket)}`)
  assert.equal(r.status, 503)
  assert.equal((await r.json()).error, 'too-many-connections')
  // 같은 계정의 재접속도 IP 한도를 넘으면 기다려야 한다 → 앞 연결을 닫으면 다시 들어올 수 있다
  first.close()
  await sleep(200)
  const again = await join(port, 'ipUserTwo')
  again.close()
})

export { account, tokenOf, join, post, get, readFileSync }
