import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { CONTENT_SECURITY_POLICY, HSTS, SECURITY_HEADERS, isSecureRequest } from '../server/securityHeaders.js'

const project = fileURLToPath(new URL('../', import.meta.url))
const read = (relative) => readFileSync(path.join(project, relative), 'utf8')

test('요청한 여섯 보안 헤더와 CSP 필수 방어 지시어가 정의돼 있다', () => {
  assert.equal(HSTS, 'max-age=31536000; includeSubDomains')
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'SAMEORIGIN')
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff')
  assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.match(SECURITY_HEADERS['Permissions-Policy'], /camera=\(\), microphone=\(\), geolocation=\(\)/)
  for (const v of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self'", "script-src 'self'", 'fonts.googleapis.com', 'cdn.jsdelivr.net', 'frame-src https://www.youtube.com']) {
    assert.ok(CONTENT_SECURITY_POLICY.includes(v), `CSP 누락: ${v}`)
  }
  const script = CONTENT_SECURITY_POLICY.split('; ').find(v => v.startsWith('script-src '))
  assert.doesNotMatch(script, /'unsafe-inline'|'unsafe-eval'/)
  assert.ok(CONTENT_SECURITY_POLICY.includes("style-src 'self' 'unsafe-inline'"), 'React 인라인 스타일 유지')
})

test('HSTS는 원본이 HTTPS인 요청에만 붙는다', () => {
  assert.equal(isSecureRequest({ headers: {}, socket: {} }), false)
  assert.equal(isSecureRequest({ headers: { 'x-forwarded-proto': 'https' }, socket: {} }), true)
  assert.equal(isSecureRequest({ headers: { 'x-forwarded-proto': 'https, http' }, socket: {} }), true)
  assert.equal(isSecureRequest({ headers: { 'x-forwarded-proto': 'http' }, socket: {} }), false)
  assert.equal(isSecureRequest({ headers: {}, socket: { encrypted: true } }), true)
})

test('테마 초기화 JS는 외부 파일로 옮겨져 CSP에서 차단되지 않는다', () => {
  const html = read('index.html')
  const boot = read('public/theme-bootstrap.js')
  assert.match(html, /<script src="\/theme-bootstrap\.js"><\/script>/)
  assert.doesNotMatch(html, /<script\s*>/i)
  assert.ok(html.indexOf('/theme-bootstrap.js') < html.indexOf('fonts.googleapis.com'))
  assert.match(boot, /localStorage\.getItem\('changnok-theme'\)/)
  assert.match(boot, /localStorage\.getItem\('changnok-ui-font-size'\)/)
  assert.match(boot, /dataset\.uiFont/)
})

async function getFreePort() {
  const srv = net.createServer()
  await new Promise((resolve, reject) => srv.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = srv.address().port
  await new Promise(resolve => srv.close(resolve))
  return port
}

async function request(port, pathname, headers = {}) {
  return await new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname, headers }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ code: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
  })
}

function checkCoreHeaders(headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(headers[key.toLowerCase()], value, `HTTP 응답에 ${key} 누락`)
  }
}

test('실제 서버는 HTML·JS·304·API 오류 모두에 보안 헤더를 설정하며 HTTPS에서 HSTS를 보낸다', { timeout: 15000 }, async () => {
  const work = mkdtempSync(path.join(tmpdir(), 'chorok-security-'))
  const dist = path.join(work, 'dist')
  mkdirSync(dist)
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>test</title>')
  writeFileSync(path.join(dist, 'theme-bootstrap.js'), 'window.booted=true')
  writeFileSync(path.join(dist, 'font.ttf'), Buffer.from('font-placeholder'))
  const port = await getFreePort()
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: project,
    env: {
      ...process.env, PORT: String(port), DATABASE_URL: '', CHOROK_DIST: dist,
      CHOROK_DATA: path.join(work, 'data.json'),
      CHOROK_CARDS_DATA: path.join(work, 'cards.json'),
      CHOROK_ACCOUNTS: path.join(work, 'accounts.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += chunk.toString() })
  try {
    let ready = false
    for (let i = 0; i < 65; i++) {
      if (child.exitCode != null) break
      try { await request(port, '/'); ready = true; break } catch { await sleep(100) }
    }
    assert.ok(ready, `서버 시작 실패: ${stderr.slice(0, 1300)}`)
    const html = await request(port, '/', { 'x-forwarded-proto': 'https' })
    assert.equal(html.code, 200)
    checkCoreHeaders(html.headers)
    assert.equal(html.headers['strict-transport-security'], HSTS)
    assert.equal(html.headers['content-type'], 'text/html; charset=utf-8')
    const js = await request(port, '/theme-bootstrap.js')
    checkCoreHeaders(js.headers)
    assert.equal(js.headers['strict-transport-security'], undefined)
    assert.equal(js.headers['content-type'], 'text/javascript; charset=utf-8')
    const font = await request(port, '/font.ttf')
    assert.equal(font.headers['content-type'], 'font/ttf')
    const notModified = await request(port, '/', { 'if-none-match': html.headers.etag, 'x-forwarded-proto': 'https' })
    assert.equal(notModified.code, 304)
    checkCoreHeaders(notModified.headers)
    assert.equal(notModified.headers['strict-transport-security'], HSTS)
    const api = await request(port, '/api/___does_not_exist___', { 'x-forwarded-proto': 'https' })
    assert.equal(api.code, 404)
    checkCoreHeaders(api.headers)
    assert.equal(api.headers['strict-transport-security'], HSTS)
  } finally {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(800)])
    if (child.exitCode == null) child.kill('SIGKILL')
    rmSync(work, { recursive: true, force: true })
  }
})
