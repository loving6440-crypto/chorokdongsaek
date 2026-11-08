/**
 * 서버가 소유하는 거래 장부 (B.10 준비 단계).
 * - 게임 저장/account/save에서 받은 money/inventory는 여기로 입금하지 않는다.
 * - PostgreSQL에서는 행 잠금과 행위자별 멱등 잠금을 사용해 다른 이용자의 행동을 병렬 처리한다.
 * - 로컬 파일 모드에서는 요청 순차화와 임시 파일 rename을 사용한다(단일 프로세스 전용).
 * - 각 작업은 영구 멱등키를 사용하고, 결과를 DB COMMIT 후에만 반환한다.
 * - 향후 서버가 직접 검증한 게임 액션만 grantTrusted()을 호출할 수 있다.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { canAddInventory } from '../src/game/inventoryCapacity.js'
import { GATHER_MINUTES, GATHER_TABLES, rollGather } from '../src/game/gather.js'
import { RECIPES } from '../src/game/crafting.js'
import { COOK_RECIPES } from '../src/game/cooking.js'
import { NPC_BUY_PRICES } from '../src/game/verifiedEconomyRules.js'
import { GARDEN_CROPS, GARDEN_EXTRA_SEEDS, GARDEN_GROW_MS, GARDEN_SLOTS, SEED_PRICE } from '../src/game/garden.js'
import { countSlots, INVENTORY_SLOTS } from '../src/game/inventoryCapacity.js'
import { HUNT_SITES, siteMissingData } from '../src/game/huntSites.js'
import { enterHuntSite, moveOnHunt, attemptHunt, leaveHuntSite, resolveHuntEncounter } from '../src/game/huntField.js'
import { VERIFIED_EXPEDITION_STATS, VERIFIED_EXPEDITION_MAX_ENERGY, VERIFIED_EXPEDITION_COST, VERIFIED_EXPEDITION_REGEN_MS } from '../src/game/verifiedExpeditionRules.js'
export { NPC_BUY_PRICES }

const PREFIX = 'verified-economy:v1:'
const MARKET_ROW = PREFIX + 'market'
const walletRow = (id) => `${PREFIX}wallet:${id}`
const opRow = (actor, requestId) => `${PREFIX}op:${actor}:${requestId}`
const REQUEST_ID = /^[A-Za-z0-9_-]{16,100}$/
// 신규 가입 규칙과 별개로 B.08 이전부터 존재하던 한 글자 ID도 로그인 가능해야 한다.
const ACCOUNT_ID = /^[a-zA-Z0-9가-힣_]{1,40}$/
const MAX_BALANCE = 9_000_000_000_000
const MAX_ITEMS = 999_999_999
const MAX_GIFT_ITEMS = 5
const MAX_LISTINGS = 10
const MAX_INBOX = 100
const MAX_QTY = 99
const MAX_PRICE = 99_999
const MAX_CRAFT_QTY = 99
// 매입가는 서버의 고정 테이블로 판정하며, 클라이언트 가격은 전혀 사용하지 않는다.
const CRAFT_RECIPES = new Map([...RECIPES, ...COOK_RECIPES].map((r) => [r.id, r]))
const GARDEN_BY_SEED = new Map(GARDEN_CROPS.map((crop) => [crop.seedId, crop]))
const SOLD_SEEDS = new Set([...GARDEN_BY_SEED.keys(), ...GARDEN_EXTRA_SEEDS.map((seed) => seed.id)])
const blankPlots = () => Array.from({ length: GARDEN_SLOTS }, () => null)

export class EconomyError extends Error {
  constructor(code, status = 400) {
    super(code)
    this.code = code
    this.status = status
  }
}
const fail = (code, status) => { throw new EconomyError(code, status) }
const validId = (id) => typeof id === 'string' && ACCOUNT_ID.test(id) && id === id.normalize('NFC')
const intRange = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max
const freshWallet = () => ({ money: 0, inventory: {}, pendingMoney: 0, inbox: [], gathering: null, gardenPlots: blankPlots(), expedition: null, expeditionEnergy: VERIFIED_EXPEDITION_MAX_ENERGY, expeditionEnergyAt: null, version: 0 })
const freshMarket = () => ({ listings: [] })
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')

/** Persist a small set of changed rows instead of rewriting unrelated account/card data. */
/**
 * B.14: read-only requests do not open a transaction or take write locks.
 * Transaction mutations lock only their touched rows, not the entire economy.
 * Identical actor request IDs are serialized by a namespaced advisory lock;
 * PostgreSQL row locks protect cross-user gifts and purchases.
 * PostgreSQL deadlocks can occur when a gift crosses a market sale, so retry
 * aborted transactions (never partial commits) a bounded number of times.
 */
function createDriver({ db, file, onMetric = () => {} }) {
  const report = (sample) => { try { onMetric(sample) } catch { /* metrics must never break transactions */ } }
  const clone = (data) => data == null ? null : structuredClone(data)
  if (db) {
    const runOnce = async (fn, actor) => {
      const started = performance.now()
      const client = await db.connect()
      const waitMs = performance.now() - started
      const stat = { type: 'write', waitMs, reads: 0, writes: 0, readBytes: 0, writeBytes: 0, ms: 0, failed: false }
      let transaction = false
      try {
        await client.query('BEGIN')
        transaction = true
        // Do not globally serialize unrelated players. Required because a missing
        // operation row cannot be protected by SELECT FOR UPDATE alone.
        if (actor) {
          const digest = crypto.createHash('sha256').update(actor).digest()
          await client.query('SELECT pg_advisory_xact_lock($1::integer, $2::integer)', [1876362, digest.readInt32BE(0)])
        }
        const pending = new Map()
        const held = new Map()
        const ctx = {
          async get(key) {
            if (pending.has(key)) return clone(pending.get(key))
            if (held.has(key)) return clone(held.get(key))
            const lockable = key === MARKET_ROW || key.startsWith(PREFIX + 'wallet:')
            const query = lockable ? 'SELECT data FROM saves WHERE id=$1 FOR UPDATE' : 'SELECT data FROM saves WHERE id=$1'
            let r = await client.query(query, [key])
            stat.reads++
            // Lock the absence of a new wallet/market row by inserting its default.
            // The insert and SELECT are in the same transaction; failed requests roll back.
            if (lockable && !r.rows.length) {
              const initial = key === MARKET_ROW ? freshMarket() : freshWallet()
              await client.query('INSERT INTO saves (id, data, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (id) DO NOTHING', [key, JSON.stringify(initial)])
              r = await client.query(query, [key])
              stat.reads++
            }
            const value = r.rows[0]?.data ?? null
            stat.readBytes += value == null ? 0 : Buffer.byteLength(JSON.stringify(value))
            held.set(key, clone(value))
            return clone(value)
          },
          set(key, data) { pending.set(key, clone(data)) },
        }
        const result = await fn(ctx)
        for (const [key, value] of pending) {
          const serialized = JSON.stringify(value)
          await client.query(
            `INSERT INTO saves (id, data, updated_at) VALUES ($1, $2::jsonb, now())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [key, serialized],
          )
          stat.writes++
          stat.writeBytes += Buffer.byteLength(serialized)
        }
        await client.query('COMMIT')
        transaction = false
        return result
      } catch (error) {
        stat.failed = true
        if (transaction) try { await client.query('ROLLBACK') } catch { /* connection may have failed */ }
        throw error
      } finally {
        stat.ms = performance.now() - started
        report(stat)
        client.release()
      }
    }
    return {
      async read(key) {
        const started = performance.now()
        try {
          const r = await db.query('SELECT data FROM saves WHERE id=$1', [key])
          const value = r.rows[0]?.data ?? null
          report({ type: 'read', ms: performance.now() - started, reads: 1, writes: 0, readBytes: value == null ? 0 : Buffer.byteLength(JSON.stringify(value)), writeBytes: 0 })
          return clone(value)
        } catch (error) {
          report({ type: 'read', ms: performance.now() - started, reads: 1, writes: 0, failed: true })
          throw error
        }
      },
      async run(fn, { actor = null } = {}) {
        // 40P01 deadlock / 40001 serialization failure are safe to retry:
        // the operation row and all wallet changes were rolled back together.
        for (let n = 0; ; n++) {
          try { return await runOnce(fn, actor) }
          catch (e) {
            if (n >= 2 || !['40P01', '40001'].includes(e.code)) throw e
          }
        }
      },
      // v-B.15: 오래된 멱등 기록 정리. 같은 요청 ID 재시도는 보통 몇 초 안에 끝나므로 기본 30일 보관이면 충분하다.
      async prune(prefix, maxAgeMs) {
        const r = await db.query(
          "DELETE FROM saves WHERE id LIKE $1 AND updated_at < now() - ($2::integer * interval '1 second')",
          [prefix + '%', Math.floor(maxAgeMs / 1000)],
        )
        return r.rowCount ?? 0
      },
    }
  }
  let rows = {}
  try {
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) rows = loaded
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  let previous = Promise.resolve()
  let sequence = 0
  return {
    async read(key) {
      const start = performance.now()
      const value = clone(rows[key])
      report({ type: 'read', ms: performance.now() - start, reads: 1, writes: 0, readBytes: value == null ? 0 : Buffer.byteLength(JSON.stringify(value)), writeBytes: 0 })
      return value
    },
    run(fn) {
      const task = previous.then(async () => {
        const started = performance.now()
        const pending = new Map()
        const ctx = {
          async get(key) { return pending.has(key) ? clone(pending.get(key)) : clone(rows[key]) },
          set(key, data) { pending.set(key, clone(data)) },
        }
        try {
          const result = await fn(ctx)
          if (pending.size) {
            const updated = { ...rows }
            for (const [key, value] of pending) updated[key] = value
            await fs.promises.mkdir(path.dirname(file), { recursive: true })
            const tmp = `${file}.${process.pid}.${++sequence}.tmp`
            try {
              const fd = await fs.promises.open(tmp, 'wx', 0o600)
              try { await fd.writeFile(JSON.stringify(updated)); await fd.sync() }
              finally { await fd.close() }
              await fs.promises.rename(tmp, file)
            } catch (e) { await fs.promises.rm(tmp, { force: true }).catch(() => {}); throw e }
            rows = updated
          }
          report({ type: 'write', ms: performance.now() - started, reads: 0, writes: pending.size })
          return result
        } catch (e) {
          report({ type: 'write', ms: performance.now() - started, failed: true })
          throw e
        }
      })
      previous = task.catch(() => {})
      return task
    },
    // v-B.15: 오래된 멱등 기록 정리 (단일 프로세스 파일 모드)
    prune(prefix, maxAgeMs) {
      const task = previous.then(async () => {
        const cutoff = Date.now() - maxAgeMs
        const updated = {}
        let removed = 0
        for (const [key, value] of Object.entries(rows)) {
          if (key.startsWith(prefix) && Number(value?.at) < cutoff) removed++
          else updated[key] = value
        }
        if (!removed) return 0
        const tmp = `${file}.${process.pid}.${++sequence}.tmp`
        try {
          const fd = await fs.promises.open(tmp, 'wx', 0o600)
          try { await fd.writeFile(JSON.stringify(updated)); await fd.sync() }
          finally { await fd.close() }
          await fs.promises.rename(tmp, file)
        } catch (e) { await fs.promises.rm(tmp, { force: true }).catch(() => {}); throw e }
        rows = updated
        return removed
      })
      previous = task.catch(() => {})
      return task
    },
  }
}

function settleVerifiedGhost(player, nowAt, rng) {
  if (!player.huntExpedition?.encounter) return player
  const avoided = resolveHuntEncounter({ ...player, spirit: 0, inventory: {} }, { win: false, fled: true }, nowAt, rng)
  if (avoided.error) throw new EconomyError('expedition-ghost-error', 500)
  const session = avoided.player.huntExpedition
  session.log = [...session.log, '검증 전투가 준비되기 전까지 요괴 조우는 보상 없이 회피한다.'].slice(-40)
  return { ...player, huntExpedition: session, ghostAvoided: true }
}

export function createVerifiedEconomyStore({ db = null, file, itemIds, now = Date.now, rng = () => crypto.randomInt(0, 1_000_000) / 1_000_000, onMetric } = {}) {
  if (!db && !file) throw new TypeError('economy requires a DB or a local file')
  const allowed = new Set(itemIds)
  const driver = createDriver({ db, file, onMetric })
  const verifyActor = (id) => { if (!validId(id)) fail('bad-account') }
  const verifyItem = (item) => { if (typeof item !== 'string' || !allowed.has(item) || item.includes('#')) fail('not-tradable') }
  const readWallet = async (tx, id) => {
    const wallet = (await tx.get(walletRow(id))) ?? freshWallet()
    // B.10/11 기존 장부 행에는 gardenPlots가 없다. 기존 자산은 건드리지 않고 비어 있는 밭만 보충한다.
    if (!Array.isArray(wallet.gardenPlots) || wallet.gardenPlots.length !== GARDEN_SLOTS) wallet.gardenPlots = blankPlots()
    // B.13: 에너지는 클라이언트의 mp 또는 저장 시각과 무관하며 서버 시계로만 회복한다.
    if (!Number.isSafeInteger(wallet.expeditionEnergy) || wallet.expeditionEnergy < 0 || wallet.expeditionEnergy > VERIFIED_EXPEDITION_MAX_ENERGY) wallet.expeditionEnergy = VERIFIED_EXPEDITION_MAX_ENERGY
    if (!Number.isFinite(wallet.expeditionEnergyAt)) wallet.expeditionEnergyAt = now()
    const elapsed = Math.max(0, now() - wallet.expeditionEnergyAt)
    const regenerated = Math.floor(elapsed / VERIFIED_EXPEDITION_REGEN_MS)
    if (regenerated > 0) {
      wallet.expeditionEnergy = Math.min(VERIFIED_EXPEDITION_MAX_ENERGY, wallet.expeditionEnergy + regenerated)
      wallet.expeditionEnergyAt += regenerated * VERIFIED_EXPEDITION_REGEN_MS
    }
    if (!Object.hasOwn(wallet, 'expedition')) wallet.expedition = null
    return wallet
  }
  const writeWallet = (tx, id, wallet) => {
    wallet.version = (wallet.version || 0) + 1
    tx.set(walletRow(id), wallet)
  }
  const readMarket = async (tx) => (await tx.get(MARKET_ROW)) ?? freshMarket()
  const assertCapacity = (inv, items) => { if (!canAddInventory(inv, items)) fail('inventory-full', 409) }
  const addInventory = (wallet, items) => {
    assertCapacity(wallet.inventory, items)
    for (const [item, qty] of Object.entries(items)) {
      const next = (wallet.inventory[item] || 0) + qty
      if (!intRange(next, MAX_ITEMS)) fail('inventory-overflow', 409)
      wallet.inventory[item] = next
    }
  }
  const subtractInventory = (wallet, items) => {
    for (const [item, qty] of Object.entries(items)) {
      if ((wallet.inventory[item] || 0) < qty) fail('insufficient-items', 409)
      wallet.inventory[item] -= qty
      if (!wallet.inventory[item]) delete wallet.inventory[item]
    }
  }
  const listItems = (items, maxTotal = MAX_GIFT_ITEMS) => {
    if (!items || typeof items !== 'object' || Array.isArray(items)) fail('bad-items')
    const clean = Object.create(null)
    let total = 0
    for (const [item, qty] of Object.entries(items)) {
      verifyItem(item)
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > maxTotal) fail('bad-items')
      total += qty
      if (total > maxTotal) fail('too-many-items')
      clean[item] = qty
    }
    if (!total) fail('bad-items')
    return { ...clean }
  }
  const idempotent = (actor, requestId, kind, payload, fn) => {
    verifyActor(actor)
    if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) fail('request-id-required')
    const fingerprint = sha([kind, payload])
    // 개척 이동 결과에 들어 있는 10×10 지도를 매 턴 멱등 로그에 중복 저장하지 않는다.
    const compactExpedition = kind.startsWith('expedition-')
    return driver.run(async (tx) => {
      const row = opRow(actor, requestId)
      const prior = await tx.get(row)
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail('request-id-conflict', 409)
        if (compactExpedition) {
          const current = await readWallet(tx, actor)
          return { ...prior.result, session: current.expedition, energy: current.expeditionEnergy, replay: true }
        }
        return { ...prior.result, replay: true }
      }
      const result = await fn(tx)
      const storedResult = compactExpedition ? Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'session')) : result
      tx.set(row, { kind, fingerprint, result: storedResult, at: Date.now() })
      return result
    }, { actor })
  }

  return {
    /** v-B.15: maxAgeMs 보다 오래된 멱등(op) 기록을 지운다. 지갑·장터 행은 건드리지 않는다. */
    async pruneOperations(maxAgeMs = 30 * 86_400_000) {
      if (!(maxAgeMs >= 86_400_000)) throw new EconomyError('bad-retention', 500) // 하루보다 짧게는 지우지 않는다
      return driver.prune(PREFIX + 'op:', maxAgeMs)
    },
    // 읽기는 아무 client-supplied 저장값도 참조하지 않는다.
    wallet(id) {
      verifyActor(id)
      return readWallet({ get: driver.read }, id)
    },
    async marketplace(id) {
      verifyActor(id)
      const market = await readMarket({ get: driver.read })
      return market.listings.map(({ seller, ...l }) => ({ ...l, mine: seller === id, total: l.qty * l.price }))
        .sort((a, b) => a.price - b.price || a.at - b.at)
    },
    list({ actor, requestId, item, qty, price }) {
      verifyItem(item)
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY) fail('bad-qty')
      if (!Number.isSafeInteger(price) || price < 1 || price > MAX_PRICE) fail('bad-price')
      return idempotent(actor, requestId, 'list', { item, qty, price }, async (tx) => {
        const market = await readMarket(tx)
        if (market.listings.filter((l) => l.seller === actor).length >= MAX_LISTINGS) fail('too-many-listings', 409)
        const wallet = await readWallet(tx, actor)
        subtractInventory(wallet, { [item]: qty })
        const listing = { id: `v-${crypto.randomUUID()}`, item, qty, price, seller: actor, at: Date.now() }
        market.listings.push(listing)
        writeWallet(tx, actor, wallet)
        tx.set(MARKET_ROW, market)
        return { ok: true, id: listing.id }
      })
    },
    buy({ actor, requestId, listing }) {
      if (typeof listing !== 'string' || !/^v-[a-f0-9-]{36}$/.test(listing)) fail('bad-listing')
      return idempotent(actor, requestId, 'buy', { listing }, async (tx) => {
        const market = await readMarket(tx)
        const i = market.listings.findIndex((l) => l.id === listing)
        if (i < 0) fail('gone', 404)
        const l = market.listings[i]
        if (l.seller === actor) fail('own', 400)
        const buyer = await readWallet(tx, actor)
        const seller = await readWallet(tx, l.seller)
        const total = l.price * l.qty
        if (buyer.money < total) fail('insufficient-money', 409)
        addInventory(buyer, { [l.item]: l.qty })
        if (!intRange(seller.pendingMoney + total, MAX_BALANCE)) fail('money-overflow', 409)
        buyer.money -= total
        seller.pendingMoney += total
        market.listings.splice(i, 1)
        writeWallet(tx, actor, buyer)
        writeWallet(tx, l.seller, seller)
        tx.set(MARKET_ROW, market)
        return { ok: true, item: l.item, qty: l.qty, total }
      })
    },
    cancel({ actor, requestId, listing }) {
      if (typeof listing !== 'string' || !/^v-[a-f0-9-]{36}$/.test(listing)) fail('bad-listing')
      return idempotent(actor, requestId, 'cancel', { listing }, async (tx) => {
        const market = await readMarket(tx)
        const i = market.listings.findIndex((l) => l.id === listing && l.seller === actor)
        if (i < 0) fail('gone', 404)
        const l = market.listings[i]
        const wallet = await readWallet(tx, actor)
        addInventory(wallet, { [l.item]: l.qty })
        market.listings.splice(i, 1)
        writeWallet(tx, actor, wallet)
        tx.set(MARKET_ROW, market)
        return { ok: true, item: l.item, qty: l.qty }
      })
    },
    claim({ actor, requestId }) {
      return idempotent(actor, requestId, 'claim', {}, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const amount = wallet.pendingMoney
        if (!intRange(wallet.money + amount, MAX_BALANCE)) fail('money-overflow', 409)
        wallet.money += amount
        wallet.pendingMoney = 0
        if (amount) writeWallet(tx, actor, wallet)
        return { ok: true, amount }
      })
    },
    gift({ actor, requestId, to, items, note = '' }) {
      verifyActor(to)
      if (actor === to) fail('self-gift')
      const clean = listItems(items)
      if (typeof note !== 'string' || note.length > 1000) fail('bad-note')
      return idempotent(actor, requestId, 'gift', { to, items: clean, note }, async (tx) => {
        const sender = await readWallet(tx, actor)
        const recipient = await readWallet(tx, to)
        if (recipient.inbox.length >= MAX_INBOX) fail('gift-inbox-full', 409)
        subtractInventory(sender, clean)
        const gift = { id: `g-${crypto.randomUUID()}`, from: actor, items: clean, note, at: Date.now() }
        recipient.inbox.push(gift)
        writeWallet(tx, actor, sender)
        writeWallet(tx, to, recipient)
        return { ok: true, giftId: gift.id, to }
      })
    },
    claimGift({ actor, requestId, giftId }) {
      if (typeof giftId !== 'string' || !/^g-[a-f0-9-]{36}$/.test(giftId)) fail('bad-gift')
      return idempotent(actor, requestId, 'claim-gift', { giftId }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const i = wallet.inbox.findIndex((x) => x.id === giftId)
        if (i < 0) fail('gift-gone', 404)
        const gift = wallet.inbox[i]
        addInventory(wallet, gift.items)
        wallet.inbox.splice(i, 1)
        writeWallet(tx, actor, wallet)
        return { ok: true, items: gift.items, from: gift.from }
      })
    },
    // B.13: 검증 개척. 브라우저의 캐릭터 스탯/MP/현재 위치/획득 결과를 읽지 않는다.
    // 입장비와 서버 세션, 이동, 주사위 및 지급은 동일 장부 트랜잭션에서 처리된다.
    expeditionEnter({ actor, requestId, siteId }) {
      if (typeof siteId !== 'string' || !Object.hasOwn(HUNT_SITES, siteId)) fail('unknown-expedition-site')
      return idempotent(actor, requestId, 'expedition-enter', { siteId }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.expedition?.status === 'active') fail('expedition-already-active', 409)
        if (wallet.expeditionEnergy < VERIFIED_EXPEDITION_COST) fail('expedition-low-energy', 409)
        if (siteMissingData(HUNT_SITES[siteId]).length) fail('unknown-expedition-site')
        const result = enterHuntSite({ hp: 100, mp: wallet.expeditionEnergy, inventory: {} }, HUNT_SITES[siteId], now(), rng)
        if (result.error) fail('expedition-not-ready', 409)
        wallet.expedition = result.player.huntExpedition
        wallet.expeditionEnergy = result.player.mp
        writeWallet(tx, actor, wallet)
        return { ok: true, session: wallet.expedition, energy: wallet.expeditionEnergy }
      })
    },
    expeditionMove({ actor, requestId, position }) {
      if (!position || typeof position !== 'object' || !Number.isInteger(position.x) || !Number.isInteger(position.y)) fail('bad-position')
      return idempotent(actor, requestId, 'expedition-move', { x: position.x, y: position.y }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.expedition?.status !== 'active') fail('expedition-not-active', 409)
        const result = moveOnHunt({ huntExpedition: wallet.expedition }, { x: position.x, y: position.y }, now())
        if (result.error) fail('expedition-invalid-move', 409)
        const settled = settleVerifiedGhost(result.player, now(), rng)
        wallet.expedition = settled.huntExpedition
        writeWallet(tx, actor, wallet)
        return { ok: true, session: wallet.expedition, ghostAvoided: settled.ghostAvoided || false }
      })
    },
    expeditionAttempt({ actor, requestId, nodeId }) {
      if (typeof nodeId !== 'string' || !/^[A-Za-z0-9_-]{1,48}$/.test(nodeId)) fail('bad-node')
      return idempotent(actor, requestId, 'expedition-attempt', { nodeId }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.expedition?.status !== 'active') fail('expedition-not-active', 409)
        const result = attemptHunt({ huntExpedition: wallet.expedition, inventory: {} }, nodeId, VERIFIED_EXPEDITION_STATS, now(), rng)
        if (result.error) fail('expedition-invalid-attempt', 409)
        // 기존 엔진이 반환한 클라이언트용 인벤토리는 믿지 않는다. 해당 턴에서 서버가 굴린 보상만 반영한다.
        const items = result.rewards ?? {}
        for (const [item, qty] of Object.entries(items)) {
          verifyItem(item)
          if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_ITEMS) fail('bad-reward', 500)
        }
        addInventory(wallet, items)
        const settled = settleVerifiedGhost(result.player, now(), rng)
        wallet.expedition = settled.huntExpedition
        writeWallet(tx, actor, wallet)
        return { ok: true, session: wallet.expedition, success: result.success, items, ghostAvoided: settled.ghostAvoided || false }
      })
    },
    expeditionLeave({ actor, requestId }) {
      return idempotent(actor, requestId, 'expedition-leave', {}, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.expedition?.status !== 'active') fail('expedition-not-active', 409)
        // 요괴 조우는 클라이언트 승리 판정 없이 서버가 도주 처리한다.
        const settled = settleVerifiedGhost({ huntExpedition: wallet.expedition }, now(), rng)
        const result = leaveHuntSite(settled, now())
        if (result.error) fail('expedition-cannot-leave', 409)
        wallet.expedition = result.player.huntExpedition
        writeWallet(tx, actor, wallet)
        return { ok: true, session: wallet.expedition }
      })
    },
    // B.11: 서버 시각으로 채집 시작/완료를 판정하고 지급한다.
    // 게임 저장/브라우저의 gathering.startedAt 은 절대 참조하지 않는다.
    startGather({ actor, requestId, spotId }) {
      if (typeof spotId !== 'string' || !Object.hasOwn(GATHER_TABLES, spotId)) fail('unknown-gather-site')
      return idempotent(actor, requestId, 'start-gather', { spotId }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.gathering) fail('gather-already-active', 409)
        const startedAt = now()
        if (!Number.isFinite(startedAt)) fail('clock-error', 500)
        wallet.gathering = { spotId, startedAt, readyAt: startedAt + GATHER_MINUTES * 60_000 }
        writeWallet(tx, actor, wallet)
        return { ok: true, gathering: wallet.gathering }
      })
    },
    claimGather({ actor, requestId }) {
      return idempotent(actor, requestId, 'claim-gather', {}, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const gathering = wallet.gathering
        if (!gathering) fail('gather-not-active', 409)
        if (now() < gathering.readyAt) fail('gather-not-ready', 409)
        if (!Object.hasOwn(GATHER_TABLES, gathering.spotId)) fail('unknown-gather-site', 409)
        const rolled = rollGather(gathering.spotId, rng)
        const items = Object.create(null)
        for (const result of rolled.items) {
          verifyItem(result.item)
          if (!Number.isSafeInteger(result.amount) || result.amount < 1) fail('bad-reward', 500)
          items[result.item] = (items[result.item] || 0) + result.amount
        }
        // 소지 공간 부족 시 채집 대기는 보존된다. 다음 요청으로 수령 가능하다.
        addInventory(wallet, items)
        wallet.gathering = null
        writeWallet(tx, actor, wallet)
        return { ok: true, items: { ...items }, text: rolled.text }
      })
    },
    // 게임 저장에 들어 있는 재료가 아닌 서버 장부의 재고로만 공작/조리를 판정한다.
    craft({ actor, requestId, recipeId, qty = 1 }) {
      if (typeof recipeId !== 'string' || !CRAFT_RECIPES.has(recipeId)) fail('unknown-recipe')
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_CRAFT_QTY) fail('bad-qty')
      const recipe = CRAFT_RECIPES.get(recipeId)
      return idempotent(actor, requestId, 'craft', { recipeId, qty }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const consumed = Object.create(null)
        for (const [item, quantity] of recipe.inputs) {
          verifyItem(item)
          if (!Number.isSafeInteger(quantity) || quantity < 1) fail('bad-recipe', 500)
          consumed[item] = (consumed[item] || 0) + quantity * qty
        }
        verifyItem(recipe.result)
        subtractInventory(wallet, consumed)
        addInventory(wallet, { [recipe.result]: qty })
        writeWallet(tx, actor, wallet)
        return { ok: true, result: recipe.result, qty, consumed: { ...consumed } }
      })
    },
    // B.12: 옛 player.gardenPlots와 무관한 서버 소유 5칸 비닐하우스.
    // 사용자가 보낸 readyAt, money, cropId, reward 값은 결과 판정에 사용하지 않는다.
    buySeed({ actor, requestId, seedId, qty = 1 }) {
      if (typeof seedId !== 'string' || !SOLD_SEEDS.has(seedId)) fail('unknown-seed')
      verifyItem(seedId)
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY) fail('bad-qty')
      return idempotent(actor, requestId, 'garden-buy', { seedId, qty }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const total = SEED_PRICE * qty
        if (wallet.money < total) fail('insufficient-money', 409)
        addInventory(wallet, { [seedId]: qty })
        wallet.money -= total
        writeWallet(tx, actor, wallet)
        return { ok: true, seedId, qty, total }
      })
    },
    plantSeed({ actor, requestId, seedId, slot }) {
      if (typeof seedId !== 'string' || !GARDEN_BY_SEED.has(seedId)) fail('unknown-seed')
      if (!Number.isInteger(slot) || slot < 0 || slot >= GARDEN_SLOTS) fail('bad-slot')
      return idempotent(actor, requestId, 'garden-plant', { seedId, slot }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        if (wallet.gardenPlots[slot]) fail('plot-occupied', 409)
        subtractInventory(wallet, { [seedId]: 1 })
        const plantedAt = now()
        if (!Number.isFinite(plantedAt) || plantedAt <= 0) fail('clock-error', 500)
        wallet.gardenPlots[slot] = { seedId, plantedAt }
        writeWallet(tx, actor, wallet)
        return { ok: true, slot, seedId, readyAt: plantedAt + GARDEN_GROW_MS }
      })
    },
    harvestSeed({ actor, requestId, slot }) {
      if (!Number.isInteger(slot) || slot < 0 || slot >= GARDEN_SLOTS) fail('bad-slot')
      return idempotent(actor, requestId, 'garden-harvest', { slot }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const plot = wallet.gardenPlots[slot]
        if (!plot) fail('plot-empty', 409)
        const crop = GARDEN_BY_SEED.get(plot.seedId)
        if (!crop) fail('invalid-plot', 409)
        if (now() < plot.plantedAt + GARDEN_GROW_MS) fail('garden-not-ready', 409)
        // 레거시 텃밭의 '이미 30칸이면 수확 불가' 규칙을 유지한다.
        if (countSlots(wallet.inventory) >= INVENTORY_SLOTS) fail('inventory-full', 409)
        verifyItem(crop.id)
        addInventory(wallet, { [crop.id]: 1 })
        wallet.gardenPlots[slot] = null
        writeWallet(tx, actor, wallet)
        return { ok: true, slot, item: crop.id, qty: 1 }
      })
    },
    // 시세/지급 금액을 클라이언트에서 받지 않는다. 안전한 고정가 매입만 허용한다.
    npcSell({ actor, requestId, item, qty }) {
      if (typeof item !== 'string' || !Object.hasOwn(NPC_BUY_PRICES, item)) fail('npc-not-buying')
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY) fail('bad-qty')
      return idempotent(actor, requestId, 'npc-sell', { item, qty }, async (tx) => {
        const wallet = await readWallet(tx, actor)
        const money = NPC_BUY_PRICES[item] * qty
        if (!intRange(wallet.money + money, MAX_BALANCE)) fail('money-overflow', 409)
        subtractInventory(wallet, { [item]: qty })
        wallet.money += money
        writeWallet(tx, actor, wallet)
        return { ok: true, item, qty, money }
      })
    },
    // 공개 라우트에서 절대 호출하지 않는다. 서버가 실제로 판정한 보상 또는 운영자 검수 이전 전용.
    // sourceKey 를 유일하게 선택해 반복 실행해도 지급이 한 번만 이뤄지도록 한다.
    grantTrusted({ target, sourceKey, money = 0, items = {} }) {
      verifyActor(target)
      if (typeof sourceKey !== 'string' || !REQUEST_ID.test(sourceKey)) fail('bad-source')
      if (!intRange(money, MAX_BALANCE)) fail('bad-money')
      const clean = Object.keys(items).length ? listItems(items, MAX_ITEMS) : {}
      return idempotent('system', sourceKey, 'trusted-grant', { target, money, items: clean }, async (tx) => {
        const wallet = await readWallet(tx, target)
        if (!intRange(wallet.money + money, MAX_BALANCE)) fail('money-overflow', 409)
        addInventory(wallet, clean)
        wallet.money += money
        writeWallet(tx, target, wallet)
        return { ok: true, target, money, items: clean }
      })
    },
  }
}
