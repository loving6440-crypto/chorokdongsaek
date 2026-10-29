import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { cleanChatTitle, retitleMessages } from '../server/chatTitles.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))

test('커스텀 칭호 유효성 검사 · 관리자 칭호 사칭 방지', () => {
  assert.equal(cleanChatTitle(' 활자 '), '활자')
  assert.equal(cleanChatTitle('작가 1호'), '작가 1호')
  assert.equal(cleanChatTitle(''), '')
  for (const s of ['관리자', 'ADMIN', '파티장', '<script>', '[활자]', '한'.repeat(13), 'a\nb', null, 1]) {
    assert.equal(cleanChatTitle(s), null, `잘못된 칭호 ${String(s)}`)
  }
  const logs = [{ from: { id: 'user1', name: '첫째', title: '옛날' }, text: '안녕' }, { from: { id: 'user2', name: '둘째' }, text: '반가워' }]
  const changed = retitleMessages(logs, 'user1', '활자')
  assert.equal(changed[0].from.title, '활자')
  assert.equal(changed[1], logs[1])
  assert.equal(retitleMessages(changed, 'user1', null)[0].from.title, undefined)
})

async function portFree() {
  const srv = net.createServer()
  await new Promise((resolve, reject) => srv.once('error', reject).listen(0, '127.0.0.1', resolve))
  const p = srv.address().port
  await new Promise((resolve) => srv.close(resolve))
  return p
}

async function api(port, route, body) {
  const res = await fetch(`http://127.0.0.1:${port}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, ...(await res.json()) }
}

async function listenEvents(port, id, name, key = '') {
  const controller = new AbortController()
  const params = new URLSearchParams({ id, name, ...(key ? { key } : {}) })
  const res = await fetch(`http://127.0.0.1:${port}/api/events?${params}`, { signal: controller.signal })
  assert.equal(res.status, 200)
  let textBuffer = ''
  const queue = []
  const waiters = []
  let closed = false
  async function pump() {
    const reader = res.body.getReader()
    try {
      while (!closed) {
        const { value, done } = await reader.read()
        if (done) break
        textBuffer += new TextDecoder().decode(value)
        let cut
        while ((cut = textBuffer.indexOf('\n\n')) !== -1) {
          const frame = textBuffer.slice(0, cut)
          textBuffer = textBuffer.slice(cut + 2)
          const line = frame.split('\n').find(s => s.startsWith('data: '))
          if (!line) continue
          let message
          try { message = JSON.parse(line.slice(6)) } catch { continue }
          queue.push(message)
          for (const waiter of [...waiters]) if (waiter.predicate(message)) {
            waiters.splice(waiters.indexOf(waiter), 1)
            waiter.resolve(message)
          }
        }
      }
    } catch (e) { if (!closed) throw e }
  }
  const task = pump()
  return {
    async next(predicate, timeoutMs = 2500) {
      const old = queue.find(predicate)
      if (old) return old
      return await Promise.race([
        new Promise(resolve => waiters.push({ predicate, resolve })),
        sleep(timeoutMs).then(() => { throw new Error('SSE 타임아웃') }),
      ])
    },
    async close() { closed = true; controller.abort(); await task.catch(() => {}) },
  }
}

async function startServer(env) {
  const child = spawn(process.execPath, ['server/index.js'], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', b => { stderr += b.toString() })
  let started = false
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) break
    try {
      const res = await fetch(`http://127.0.0.1:${env.PORT}/api/health`)
      if (res.ok) { started = true; break }
    } catch { /* retry */ }
    await sleep(50)
  }
  assert.ok(started, `서버 시작 실패 ${stderr.slice(0, 500)}`)
  return { child, async stop() { child.kill('SIGTERM'); await Promise.race([new Promise(r => child.once('exit', r)), sleep(3000)]) } }
}

test('실제 서버에서 권한 검증·칭호 부여·실시간 채팅·삭제·재시작 유지', { timeout: 25000 }, async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'cds-title-'))
  const port = await portFree()
  const env = { PORT: String(port), DATABASE_URL: '', CHOROK_ADMIN_KEY: 'dev-integration-secret', CHOROK_DATA: path.join(tmp, 'data.json'), CHOROK_ACCOUNTS: path.join(tmp, 'accounts.json'), CHOROK_CARDS_DATA: path.join(tmp, 'cards.json') }
  let server
  let sse
  try {
    server = await startServer(env)
    assert.equal((await api(port, '/api/account/signup', { id: 'titleUser', password: 'pass1234', twitter: 'titleUser' })).ok, true)
    const args = { id: 'adminUser', key: env.CHOROK_ADMIN_KEY, target: 'titleUser', title: '활자' }
    assert.equal((await api(port, '/api/admin/chat-title', { ...args, key: 'wrong' })).status, 403)
    assert.equal((await api(port, '/api/admin/chat-title', { ...args, title: '관리자' })).error, 'bad-title')
    assert.equal((await api(port, '/api/admin/chat-title', { ...args, target: 'missing' })).error, 'no-account')
    const added = await api(port, '/api/admin/chat-title', args)
    assert.equal(added.ok, true)
    assert.equal(added.title, '활자')
    sse = await listenEvents(port, 'titleUser', '테스터')
    const hello = await sse.next(ev => ev.t === 'hello')
    assert.equal(hello.you.title, '활자')
    const sent = await api(port, '/api/chat', { id: 'titleUser', channel: 'talk', text: '테스트 메시지' })
    assert.equal(sent.ok, true)
    const chat = await sse.next(ev => ev.t === 'chat' && ev.msg?.text === '테스트 메시지')
    assert.equal(chat.msg.from.title, '활자')
    assert.equal((await api(port, '/api/admin/chat-title', { ...args, title: '출판인' })).ok, true)
    const changed = await sse.next(ev => ev.t === 'chatTitle' && ev.title === '출판인')
    assert.equal(changed.id, 'titleUser')
    await sleep(650) // 스냅샷 저장
    await sse.close(); sse = null
    await server.stop(); server = null
    const snapshot = JSON.parse(readFileSync(env.CHOROK_DATA, 'utf8'))
    assert.equal(snapshot.customChatTitles.titleUser, '출판인')
    server = await startServer(env)
    sse = await listenEvents(port, 'titleUser', '테스터')
    assert.equal((await sse.next(ev => ev.t === 'hello')).you.title, '출판인')
    assert.equal((await api(port, '/api/admin/chat-title', { ...args, title: '' })).ok, true)
    assert.equal((await sse.next(ev => ev.t === 'chatTitle' && ev.title === null)).id, 'titleUser')
    await sse.close(); sse = null
  } finally {
    await sse?.close().catch(() => {})
    await server?.stop()
    rmSync(tmp, { recursive: true, force: true })
  }
})
