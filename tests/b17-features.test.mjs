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
import { LOST_THINGS, LOST_WEIGHTS, pickLostThing, rollTravelEvent } from '../src/game/travelEvents.js'
import { itemOf, STORE_ITEMS, discardInventoryItem } from '../src/game/items.js'
import { BAG_SLOTS, bagContents, bagRemovalError, compactBags, grantStarterBag, protectBags, putInBag, takeFromBag } from '../src/game/bag.js'
import { sellItem } from '../src/game/sell.js'
import { ALL_ENEMIES } from '../src/game/battle.js'
import { MB_INPUT_MS } from '../src/game/mbattle.js'
import { kitFor, measure, recStatOf } from '../scripts/balance-sim.mjs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// ───────── 누군가가 잃어버린 열쇠 ─────────
test('B17 잃어버린 열쇠: 해설 · 효과 문구, 이동 중 분실물 5% 안에서 열쇠 8% · 나머지 넷 23%씩', () => {
  const key = itemOf('lost-key')
  assert.equal(key.name, '누군가가 잃어버린 열쇠')
  assert.equal(key.desc, '학교에서 이런 걸 잃어버렸다는 것은 그의 고교 인생을 잃어버린 것과 다름이 없다.')
  assert.equal(key.effectText, '누군가의 물품보관소를 열 수 있다. 안에서 무엇이 나올지는 아무도 모르겠지만.')
  assert.equal(LOST_THINGS.length, 5)
  assert.ok(Math.abs(LOST_WEIGHTS['lost-key'] - 0.08) < 1e-12)
  for (const id of LOST_THINGS.filter((x) => x !== 'lost-key')) assert.ok(Math.abs(LOST_WEIGHTS[id] - 0.23) < 1e-12, id)
  assert.ok(Math.abs(Object.values(LOST_WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-12)
  // 몬테카를로: 분실물 전체 약 5%, 그중 열쇠 약 8%
  let a = 7
  const rng = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const N = 400_000
  let lost = 0, keys = 0, candy = 0
  for (let i = 0; i < N; i++) {
    const r = rollTravelEvent(rng).reward
    if (r === 'ginseng-candy') candy++
    else if (r) { lost++; if (r === 'lost-key') keys++ }
  }
  assert.ok(Math.abs(lost / N - 0.05) < 0.002, `분실물 ${lost / N}`)
  assert.ok(Math.abs(keys / lost - 0.08) < 0.01, `열쇠 ${keys / lost}`)
  assert.ok(Math.abs(candy / N - 0.025) < 0.002, `사탕 ${candy / N}`)
  assert.equal(pickLostThing(0.95), 'lost-key')
  assert.equal(pickLostThing(0.0), 'lost-hairband')
})

// ───────── 가방 ─────────
test('B17 가방: 누구나 하나, 매점 50냥, 40칸(소지품과 같은 칸 규칙), 물건이 든 가방은 내보낼 수 없다', () => {
  const bag = itemOf('bag')
  assert.equal(bag.price, 50)
  assert.ok(STORE_ITEMS.some((it) => it.id === 'bag'))
  let p = grantStarterBag({ inventory: { stone: 120, picnic: 5 } })
  assert.equal(p.inventory.bag, 1)
  assert.equal(grantStarterBag(p), p) // 한 번만
  assert.equal(grantStarterBag({ ...p, inventory: {} }).inventory.bag, undefined) // 버린 뒤 다시 생기지 않는다
  p = putInBag(p, 0, 'stone', 120).player
  assert.deepEqual(bagContents(p, 0), { stone: 120 })
  assert.equal(p.inventory.stone, undefined)
  assert.match(putInBag(p, 0, 'bag', 1).error, /가방 안에 가방/)
  assert.match(putInBag(p, 1, 'picnic', 1).error, /그 가방이 없다/)
  // 40칸: 재료 99개가 한 칸, 그 밖 9개가 한 칸 — stone 120 은 2칸
  const full = { ...p, inventory: { ...p.inventory, 'fine-woodchip': 99 * 38, picnic: 10 } }
  const r = putInBag(full, 0, 'fine-woodchip', 99 * 38)
  assert.ok(r.player)
  assert.match(putInBag(r.player, 0, 'picnic', 1).error, new RegExp(`${BAG_SLOTS}칸`))
  // 버리기 · 팔기 · 내보내기 막힘
  assert.match(discardInventoryItem(p, 'bag', 1).error, /비워/)
  assert.match(sellItem(p, 'bag', 1, new Date('2026-11-09T03:00:00Z').getTime()).error ?? '', /비워|닫혀/)
  assert.match(bagRemovalError(p, 1), /비워/)
  const back = takeFromBag(p, 0, 'stone', 120).player
  assert.equal(back.inventory.stone, 120)
  assert.equal(bagRemovalError(back, 1), null)
  // 마지막 안전망: 어떤 경로로든 물건이 든 가방이 사라지면 개수를 되돌린다
  const broken = { ...p, inventory: { ...p.inventory, bag: 0 } }
  assert.equal(protectBags(p, broken).inventory.bag, 1)
  // 가방 두 개 중 빈 것 하나를 내보내면 물건 든 가방이 앞으로 모인다
  const two = { ...p, inventory: { ...p.inventory, bag: 2 }, bags: [{}, { stone: 3 }] }
  assert.deepEqual(compactBags({ ...two, inventory: { ...two.inventory, bag: 1 } }).bags, [{ stone: 3 }])
})

test('B17 가방 화면 · 새 캐릭터 지급 · 불러올 때 지급이 연결돼 있다', () => {
  assert.match(read('../src/game/character.js'), /inventory: \{ bag: 1 \}/)
  assert.match(read('../src/game/progress.js'), /p = grantStarterBag\(p\)/)
  const inv = read('../src/components/InventoryModal.jsx')
  assert.match(inv, /data-bag-open/)
  assert.match(inv, /data-bag-put/)
  assert.match(inv, /data-bag-panel/)
  assert.match(read('../src/Game.jsx'), /onBag=\{bagAction\}/)
})

// ───────── 이미지 ─────────
test('B17 이미지: 사용자 사진은 픽셀 렌더링에서 빼고, 원본 해상도(최대 512)로 고화질 저장', () => {
  assert.match(read('../src/index.css'), /img\.user-photo, \.user-photo img \{ image-rendering: auto !important; \}/)
  assert.match(read('../src/components/Avatar.jsx'), /user-photo/)
  assert.match(read('../src/components/AvatarCropper.jsx'), /user-photo/)
  const src = read('../src/game/avatarImage.js')
  assert.match(src, /imageSmoothingQuality = 'high'/)
  assert.match(src, /Math\.min\(size, AVATAR_SIZE\)/)
  assert.match(src, /image\/jpeg/)
  assert.doesNotMatch(src, /canvas\.toDataURL\('image\/png'\)\n/)
})

// ───────── 적 재조정 ─────────
test('B17 적 재조정: 모든 적의 체력 · 공격력이 시뮬레이션 배율대로, 행동력 · 영력(보상)은 그대로', async () => {
  const res = JSON.parse(read('../reports/B17_ENEMY_BALANCE_SIM.json'))
  assert.equal(res.length, ALL_ENEMIES.length)
  const original = { scarecrow: [60, 6, 6, 5], foxfire: [110, 6, 7, 6], 'kim-seobang': [287, 9, 7, 5], docheol: [3781, 183, 63, 70], 'jihaguk-daejeok': [2545, 50, 53, 58] }
  for (const [id, [hp, atk, act, spirit]] of Object.entries(original)) {
    const e = ALL_ENEMIES.find((x) => x.id === id)
    const k = res.find((r) => r.enemy === id).k
    assert.equal(e.hp, Math.round(hp * k), id)
    assert.equal(e.atk, Math.max(1, Math.round(atk * (1 + (k - 1) / 2))), id)
    assert.deepEqual([e.act, e.spirit, e.reward], [act, spirit, spirit * 2], id)
  }
  for (const r of res) assert.ok(r.k >= 1 && r.k <= 2.5, `${r.enemy} k=${r.k}`)
  // 단계가 오를수록 만들 수 있는 장비가 좋아진다
  assert.equal(kitFor(4).body, null)
  assert.ok(kitFor(60).body && kitFor(60).trinket)
})

test('B17 적 재조정: 아이템을 든 플레이어의 체감이 아이템 없던 예전 난이도와 비슷하다(표본 확인)', () => {
  const res = JSON.parse(read('../reports/B17_ENEMY_BALANCE_SIM.json'))
  for (const id of ['mangtae-halabeom', 'changgwi']) {
    const e = ALL_ENEMIES.find((x) => x.id === id)
    const r = res.find((x) => x.enemy === id)
    const kit = kitFor(recStatOf(e), { slots: 1 })
    const now = measure(e, 1, kit, 400, 99)
    assert.ok(Math.abs(now.M - r.base.M) < 0.06, `${id}: 지금 ${now.M.toFixed(3)} / 예전 ${r.base.M.toFixed(3)}`)
  }
})

// ───────── 다인 전투 재접속 · 이탈 ─────────
const SECRET = 'b17-secret-never-deploy'
async function freePort() {
  const s = net.createServer()
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  const port = s.address().port
  await new Promise((r) => s.close(r))
  return port
}
async function call(port, route, body, id) {
  const r = await fetch(`http://127.0.0.1:${port}${route}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(id ? { Authorization: `Bearer ${makeToken(SECRET, id, 0)}` } : {}) }, ...(body ? { body: JSON.stringify({ id, ...body }) } : {}) })
  return { status: r.status, ...await r.json().catch(() => ({})) }
}
async function open(port, id) {
  const tk = await call(port, '/api/events/ticket', {}, id)
  const ctrl = new AbortController()
  const r = await fetch(`http://127.0.0.1:${port}/api/events?ticket=${encodeURIComponent(tk.ticket)}`, { signal: ctrl.signal })
  const reader = r.body.getReader()
  const events = []
  let buf = ''
  const pump = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += new TextDecoder().decode(value)
        let i
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i)
          buf = buf.slice(i + 2)
          const line = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (line) events.push(JSON.parse(line.slice(6)))
        }
      }
    } catch { /* closed */ }
  })()
  for (let i = 0; i < 50 && !events.some((e) => e.t === 'hello'); i++) await sleep(20)
  return { events, close: () => ctrl.abort(), pump }
}
const player = (name) => ({ stats: { insight: 10, aggression: 10, endurance: 10, control: 10, agility: 10, comprehension: 10 }, hp: 54, hpMax: 54, mp: 100, mpMax: 100, psychics: [], inventory: {}, name })
const account = (id) => ({ id, passwordHash: hashPassword('pass1234'), twitter: id, createdAt: 1, admin: false, passwordPolicy: 2, sessionVersion: 0, updatedAt: 1, save: { character: { name: id }, player: player(id) } })

test('B17 다인 전투: 끊겨도 빠지지 않고 다시 접속하면 같은 판, [전투 이탈]을 눌러야만 빠진다', { timeout: 40000 }, async (t) => {
  assert.equal(MB_INPUT_MS, 60_000)
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'chorok-b17-'))
  const port = await freePort()
  writeFileSync(path.join(tmp, 'accounts.json'), JSON.stringify({ secret: SECRET, accounts: { leaderUser: account('leaderUser'), memberUser: account('memberUser') } }))
  const child = spawn(process.execPath, ['server/index.js'], { cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...process.env, DATABASE_URL: '', PORT: String(port), CHOROK_SECRET: SECRET, CHOROK_DATA: path.join(tmp, 'd.json'), CHOROK_CARDS_DATA: path.join(tmp, 'c.json'), CHOROK_ACCOUNTS: path.join(tmp, 'accounts.json'), CHOROK_ECONOMY_FILE: path.join(tmp, 'e.json') }, stdio: 'ignore' })
  t.after(() => { child.kill('SIGTERM'); rmSync(tmp, { recursive: true, force: true }) })
  for (let i = 0; i < 100; i++) { try { if ((await call(port, '/api/health')).ok) break } catch { /* booting */ } await sleep(50) }
  const a = await open(port, 'leaderUser')
  let b = await open(port, 'memberUser')
  t.after(() => { a.close(); b.close() })
  assert.equal((await call(port, '/api/party/invite', { to: 'memberUser' }, 'leaderUser')).status, 200)
  assert.equal((await call(port, '/api/party/respond', { accept: true }, 'memberUser')).status, 200)
  const start = await call(port, '/api/mb/start', { enemy: 'foxfire', me: { stats: player().stats, hp: 54, hpMax: 54, mp: 100, mpMax: 100 } }, 'leaderUser')
  assert.equal(start.status, 200, JSON.stringify(start))
  assert.equal((await call(port, '/api/mb/respond', { bid: start.bid, accept: true, me: { stats: player().stats, hp: 54, hpMax: 54, mp: 100, mpMax: 100 } }, 'memberUser')).status, 200)
  await sleep(200)
  // 끊김 → 다시 접속: hello 에 같은 판이 실려 오고, 여전히 '살아 있음'
  b.close()
  await sleep(300)
  b = await open(port, 'memberUser')
  const hello = b.events.find((e) => e.t === 'hello')
  assert.equal(hello.mb?.bid, start.bid)
  assert.equal(hello.mb.view.members.find((m) => m.id === 'memberUser').status, 'alive')
  assert.ok(hello.mb.view.log.some((l) => /접속이 끊겼다/.test(l.text)))
  // 이탈 버튼: 그 사람만 빠지고, 이탈 결과 화면을 받는다
  const flee = await call(port, '/api/mb/flee', { bid: start.bid }, 'memberUser')
  assert.equal(flee.status, 200)
  await sleep(200)
  const last = [...b.events].reverse().find((e) => e.t === 'mb' && e.ev === 'state')
  assert.equal(last.view.members.find((m) => m.id === 'memberUser').result, 'fled')
  assert.ok(last.view.over)
  const leaderView = [...a.events].reverse().find((e) => e.t === 'mb' && e.ev === 'state').view
  assert.equal(leaderView.members.find((m) => m.id === 'memberUser').status, 'fled')
  assert.equal(leaderView.members.find((m) => m.id === 'leaderUser').status, 'alive')
  assert.equal((await call(port, '/api/mb/flee', { bid: start.bid }, 'memberUser')).status, 410) // 두 번은 못 한다
  // 서버 코드: 끊김 처리에서 dropMember 를 부르지 않는다, 시간 초과 버티기는 자동 시도
  const server = read('../server/index.js')
  const disc = server.slice(server.indexOf('function mbDisconnect'), server.indexOf('// ───────── 오목'))
  assert.doesNotMatch(disc, /dropMember/)
  assert.match(server, /MB\.survive\(mb, m\.id, true\)/)
})
