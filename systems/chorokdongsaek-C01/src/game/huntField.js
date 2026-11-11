import { HUNT_ATTEMPTS, HUNT_BONUSES, HUNT_COOLDOWN_MS, HUNT_SIZE, HUNT_SPECIES, HUNT_STAT_KEYS, siteMissingData } from './huntSites.js'
import { equipOf, itemOf } from './items.js'
import { SPIRIT_BASELINE_MAX } from './constants.js'

const same = (a, b) => a.x === b.x && a.y === b.y
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
/** v-B.03: 영물이 멈추는 구역 — 네 모서리의 2×2 사각형(예: A1·B1·A2·B2) 안 */
export const SPIRIT_CORNER_SIZE = 2
const nearEdge = v => v < SPIRIT_CORNER_SIZE || v >= HUNT_SIZE - SPIRIT_CORNER_SIZE
export const inCornerZone = p => nearEdge(p.x) && nearEdge(p.y)
const inside = p => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < HUNT_SIZE && p.y >= 0 && p.y < HUNT_SIZE
const active = node => node.kind === 'ghost' || node.attemptsLeft > 0
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const die = (n, rng) => 1 + Math.floor(rng() * n)
const KST_MS = 9 * 3600 * 1000
/** 한국 시간 기준 오전(00~12시)인가 */
export const isMorningKST = (now = Date.now()) => new Date(now + KST_MS).getUTCHours() < 12
/** 보상 한 줄의 실제 아이템: 오전/오후에 따라 달라지는 보상(달꽃터)을 고른다. */
export const rewardItemAt = (reward, now = Date.now()) => (reward.am || reward.pm) ? (isMorningKST(now) ? reward.am : reward.pm) : reward.item
/** 1dN(+plus) 또는 고정 개수 */
const rollQty = (reward, rng) => (reward.dice ? die(reward.dice, rng) : (reward.amount ?? 0)) + (reward.plus ?? 0)
const neighbors = p => [{ x: p.x, y: p.y - 1 }, { x: p.x + 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y }].filter(inside)

function chaseStep(start, target, blocked) {
  const queue = [{ position: start, first: null }]
  const visited = new Set([`${start.x},${start.y}`])
  for (let i = 0; i < queue.length; i++) {
    const { position, first } = queue[i]
    for (const next of neighbors(position)) {
      const key = `${next.x},${next.y}`
      if (visited.has(key) || blocked(next)) continue
      const step = first ?? next
      if (same(next, target)) return step
      visited.add(key)
      queue.push({ position: next, first: step })
    }
  }
  return start
}

const STAT_LABELS = { insight: '안목', comprehension: '이해', control: '절제', endurance: '인내', aggression: '호전', agility: '신속' }
/** 산출값을 이루는 스탯 목록: [{ key, label, value }] */
export function huntStatParts(kind, stats) {
  return (HUNT_STAT_KEYS[kind] ?? []).map(key => ({ key, label: STAT_LABELS[key] ?? key, value: Math.max(0, Number(stats[key]) || 0) }))
}
/** "안목 12 + 인내 9" 같은 산출 내역 문구 */
export const huntStatFormula = (kind, stats) => huntStatParts(kind, stats).map(p => `${p.label} ${p.value}`).join(' + ')

export function huntStat(kind, stats) {
  const values = (HUNT_STAT_KEYS[kind] ?? []).map(key => Math.max(0, Number(stats[key]) || 0))
  return values.reduce((sum, value) => sum + value, 0)
}

export function huntOdds(kind, level, stats) {
  const value = huntStat(kind, stats)
  const difference = level - value
  const raw = 100 - Math.max(1, difference) * 10
  const blocked = difference >= 15
  const fixed = !blocked && raw <= 0
  return { value, formula: huntStatFormula(kind, stats), success: blocked ? 0 : fixed ? 10 : clamp(raw, 10, 100), bonus: clamp(value - level, 0, 100), blocked, fixed, difference }
}

// ───────── v-B.16 개척 보정: 장비(착용) · 개척 아이템(#개척) ─────────
/** 착용한 장비의 개척 보정 합계 { turns, odds, bonus } */
export function gearHuntBonus(player) {
  const out = { turns: 0, odds: 0, bonus: 0 }
  for (const id of Object.values(equipOf(player ?? {}))) {
    const h = id ? itemOf(id)?.hunt : null
    if (!h) continue
    for (const k of Object.keys(out)) out[k] += Number(h[k]) || 0
  }
  return out
}
const addStats = (stats, extra) => {
  if (!extra) return stats
  const out = { ...stats }
  for (const [k, v] of Object.entries(extra)) out[k] = (Number(out[k]) || 0) + v
  return out
}
/** 지금 개척에서 이 대상을 시도할 때의 실제 확률(아이템 · 장비 보정 포함). 화면과 판정이 함께 쓴다. */
export function huntOddsNow(player, kind, level, stats) {
  const s = player?.huntExpedition
  const odds = huntOdds(kind, level, addStats(stats, s?.statBonus))
  if (odds.blocked) return { ...odds, extra: 0 }
  const gear = gearHuntBonus(player)
  const buff = s?.oddsBuff?.left > 0 ? s.oddsBuff.amount : 0
  const extra = gear.odds + buff
  return { ...odds, success: clamp(odds.success + extra, 0, 100), bonus: clamp(odds.bonus + gear.bonus + (s?.bonusUp || 0), 0, 100), extra }
}

export const huntCooldownLeft = () => 0 // v79: 이전 데이터의 대기시간도 무시한다.
export const huntNodeAt = (session, position) => session?.nodes.find(node => active(node) && same(node, position))

function addLog(session, text) {
  return { ...session, log: [...(session.log ?? []), text].slice(-40) }
}

function finish(player, now, reason) {
  const session = player.huntExpedition
  if (!session || session.status !== 'active') return player
  return {
    ...player,
    huntExpedition: addLog({ ...session, status: 'finished', endedAt: now, encounter: null }, reason),
    huntCooldowns: { ...player.huntCooldowns }, // 사용 중단된 기존 대기 데이터는 유지만 하고 강제하지 않는다.
  }
}

function randomEmpty(session, rng) {
  const empty = []
  for (let y = 0; y < HUNT_SIZE; y++) for (let x = 0; x < HUNT_SIZE; x++) {
    const p = { x, y }
    if (!same(session.position, p) && !huntNodeAt(session, p)) empty.push(p)
  }
  return empty[Math.floor(rng() * empty.length)]
}

export function enterHuntSite(player, site, now = Date.now(), rng = Math.random) {
  if (player.huntExpedition?.status === 'active') return { error: '진행 중인 개척을 먼저 마쳐야 한다.' }
  // v79: 재입장 대기시간을 폐지하고 입장할 때 의지력 10을 소모한다.
  if (siteMissingData(site).length) return { error: '이 터는 아직 개방되지 않았다.' }
  if (player.hp <= 0) return { error: '몸을 회복한 뒤 개척할 수 있다.' }
  if ((player.mp || 0) < 10) return { error: '개척에는 의지력 10이 필요하다.' }
  const gearTurns = gearHuntBonus(player).turns // v-B.16 장비 보정: 행동 턴 +N
  let session = {
    siteId: site.id, name: site.name, status: 'active', enteredAt: now, maxTurns: site.maxTurns + gearTurns, turn: 0,
    position: { ...site.start }, encounter: null, rewards: {}, spiritGained: 0,
    nodes: site.nodes.map(node => ({ ...HUNT_SPECIES[node.species], ...node, ...(node.route ? { route: node.route.map(point => ({ ...point })) } : {}), attemptsLeft: HUNT_ATTEMPTS })),
    log: [`${site.name}에 들어왔다. 이동과 채집·수렵 시도는 각각 1턴이다.${gearTurns ? ` (장비 덕분에 행동 턴 +${gearTurns})` : ''}`],
  }
  // 출현 판정을 모두 독립적으로 수행한다. 한쪽의 위치 추첨이 다른 쪽의 출현 판정에 영향을 주지 않는다.
  // v-B.05: 영물이 둘인 터(산길 5~20: 귀한 영물 + 흔한 영물)는 하나씩 따로 굴리고 roaming-spirit-1, -2 로 구분한다.
  const spirits = site.spirits ?? (site.spirit ? [site.spirit] : [])
  const rolls = [
    ...spirits.map((sp, i) => ({ def: sp, id: spirits.length > 1 ? `roaming-spirit-${i + 1}` : 'roaming-spirit' })),
    ...(site.ghost ? [{ def: site.ghost, id: 'roaming-ghost' }] : []),
  ]
  const spawned = rolls.filter(r => rng() < r.def.chance)
  for (const r of spawned) {
    const position = randomEmpty(session, rng)
    if (position) session.nodes.push({ ...r.def, ...position, id: r.id, attemptsLeft: HUNT_ATTEMPTS })
  }
  return { player: { ...player, mp: player.mp - 10, huntExpedition: session }, logs: [`개척: ${site.name}에 들어섰다. (의지력 -10)`] }
}

export function leaveHuntSite(player, now = Date.now()) {
  if (player.huntExpedition?.status !== 'active') return { error: '진행 중인 개척이 없다.' }
  if (player.huntExpedition?.encounter) return { error: '요괴와의 전투를 먼저 마쳐야 한다.' }
  return { player: finish(player, now, '개척을 종료했다.'), logs: ['개척을 종료했다.'] }
}

/** 동물은 고정 테두리를 매 턴 한 칸씩 돈다. 풀/장애물과 겹쳐도 경로를 벗어나지 않는다. */
export function moveHuntCreatures(session) {
  const nodes = session.nodes.map(node => ({ ...node }))
  const frozen = (session.freezeTurns || 0) > 0 // v-B.16: 동물·영물이 제자리에 멈춘다
  const warded = (session.wardTurns || 0) > 0 // v-B.16: 요괴가 다가오지 못하고, 마주쳐도 비켜 간다
  for (const node of nodes) {
    if (!active(node) || same(node, session.position) || !['animal', 'spirit', 'ghost'].includes(node.kind)) continue
    if (frozen && node.kind !== 'ghost') continue
    if (warded && node.kind === 'ghost') continue
    const occupied = p => !same(p, session.position) && nodes.some(other => other.id !== node.id && active(other) && same(other, p) && other.kind !== 'plant')
    if (node.kind === 'animal') {
      if (!node.route?.length) continue
      // 같은 칸을 두 번 지나는 경로(박쥐의 왕복, 여우의 S자)를 위해 경로상의 순번을 따로 기억한다.
      const known = Number.isInteger(node.routeIndex) && node.route[node.routeIndex] && same(node, node.route[node.routeIndex])
      const index = known ? node.routeIndex : node.route.findIndex(p => same(node, p))
      if (index < 0) continue
      const nextIndex = (index + 1) % node.route.length
      Object.assign(node, node.route[nextIndex], { routeIndex: nextIndex })
    } else if (node.kind === 'ghost') {
      Object.assign(node, chaseStep(node, session.position, occupied))
    } else {
      // 영물은 플레이어를 피해 도망가지만, 네 모서리의 2×2 사각형 안에 한 칸이라도 들어오면 즉시 멈춘다. (v-B.03)
      if (inCornerZone(node)) continue
      const options = [node, ...neighbors(node)].filter(p => !occupied(p) && !same(p, session.position))
      options.sort((a, b) => distance(b, session.position) - distance(a, session.position))
      if (options.length) Object.assign(node, { x: options[0].x, y: options[0].y })
    }
  }
  const ghost = warded ? null : nodes.find(node => node.kind === 'ghost' && active(node) && same(node, session.position))
  return { ...session, nodes, encounter: ghost ? { nodeId: ghost.id, enemy: ghost.enemy, rewardSpirit: ghost.rewardSpirit, rewardItems: ghost.rewardItems ?? [] } : null }
}

function endTurn(player, session, now) {
  const moved = moveHuntCreatures({ ...session, turn: session.turn + 1 })
  // v-B.16: 턴 단위 개척 효과는 짐승·요괴가 한 번 움직인 뒤 1씩 줄어든다.
  if (moved.wardTurns > 0) moved.wardTurns -= 1
  if (moved.freezeTurns > 0) moved.freezeTurns -= 1
  let next = { ...player, huntExpedition: moved }
  // 마지막 턴에 귀신과 조우했으면 전투를 먼저 마무리하고 종료한다.
  if (next.huntExpedition.turn >= session.maxTurns && !next.huntExpedition.encounter) next = finish(next, now, '행동 가능한 턴을 소진했습니다. 개척을 종료합니다.')
  return next
}

function playable(player) {
  const s = player.huntExpedition
  if (!s || s.status !== 'active') return '진행 중인 개척이 없다.'
  if (s.encounter) return '요괴와의 전투를 먼저 마쳐야 한다.'
  if (s.turn >= s.maxTurns) return '행동 가능한 턴을 모두 썼다.'
  return null
}

export function moveOnHunt(player, position, now = Date.now()) {
  const error = playable(player)
  if (error) return { error }
  const s = player.huntExpedition
  if (!inside(position) || distance(s.position, position) !== 1) return { error: '상하좌우로 한 칸씩 이동할 수 있다.' }
  if (huntNodeAt(s, position)?.kind === 'obstacle') return { error: '장애물을 먼저 옆 칸에서 채집해야 한다.' }
  const next = endTurn(player, { ...s, position: { ...position } }, now)
  return { player: next, logs: [] }
}

export function attemptHunt(player, nodeId, stats, now = Date.now(), rng = Math.random) {
  const error = playable(player)
  if (error) return { error }
  const s = player.huntExpedition
  const node = s.nodes.find(point => point.id === nodeId && active(point))
  if (!node || node.kind === 'ghost') return { error: '채집·수렵할 대상이 없다.' }
  if (node.kind === 'obstacle' ? distance(s.position, node) !== 1 : !same(s.position, node)) return { error: node.kind === 'obstacle' ? '장애물 옆 칸으로 이동해야 한다.' : '대상이 있는 칸으로 이동해야 한다.' }
  const odds = huntOddsNow(player, node.kind, node.level, stats)
  if (odds.blocked) return { error: '수렵 불가: 수렵 레벨이 15 이상 차이납니다.' }
  const success = rng() * 100 < odds.success
  const rewards = {}
  if (success) {
    for (const reward of node.rewards ?? []) {
      if (reward.chance != null && rng() >= reward.chance) continue
      const item = rewardItemAt(reward, now)
      rewards[item] = (rewards[item] ?? 0) + rollQty(reward, rng)
    }
    const bonus = HUNT_BONUSES[node.kind]
    if (bonus && rng() * 100 < odds.bonus) rewards[bonus.item] = (rewards[bonus.item] ?? 0) + (bonus.dice ? die(bonus.dice, rng) : bonus.amount)
  }
  // v-B.16: 보상 2배(#개척 아이템) — 실제로 얻은 것이 있는 성공에만 쓰인다.
  let doubled = false
  let doubleLeft = s.doubleLeft || 0
  if (success && doubleLeft > 0 && Object.keys(rewards).length) {
    for (const item of Object.keys(rewards)) rewards[item] *= 2
    doubleLeft -= 1
    doubled = true
  }
  const oddsBuff = s.oddsBuff?.left > 0 ? { ...s.oddsBuff, left: s.oddsBuff.left - 1 } : s.oddsBuff
  const inventory = { ...player.inventory }
  const totals = { ...s.rewards }
  for (const [item, qty] of Object.entries(rewards)) {
    inventory[item] = (inventory[item] ?? 0) + qty
    totals[item] = (totals[item] ?? 0) + qty
  }
  const text = `${odds.fixed ? '수렵 레벨이 많이 차이납니다. ' : ''}${node.name}: ${success ? '성공' : '실패'}${doubled ? ' · 보상 2배!' : ''} (성공률 ${odds.success}%${odds.extra ? `, 보정 +${odds.extra}%` : ''}, 남은 시도 ${node.attemptsLeft - 1}회)`
  const session = addLog({ ...s, ...(s.doubleLeft != null || doubled ? { doubleLeft } : {}), ...(oddsBuff ? { oddsBuff } : {}), rewards: totals, nodes: s.nodes.map(point => point.id === nodeId ? { ...point, attemptsLeft: point.attemptsLeft - 1 } : point) }, text)
  return { player: endTurn({ ...player, inventory }, session, now), logs: [`개척: ${text}`], success, rewards }
}

/** 결과는 한 번만 정산한다. 전투 보상은 퇴마 실습의 일일 한도/돈 보상과 무관하다. */
export function resolveHuntEncounter(player, { win, fled }, now = Date.now(), rng = Math.random) {
  const s = player.huntExpedition
  if (s?.status !== 'active' || !s.encounter) return { error: '진행 중인 조우가 없다.' }
  const gain = win ? Math.max(0, Math.min(s.encounter.rewardSpirit ?? 20, SPIRIT_BASELINE_MAX - player.spirit)) : 0
  const collected = {}
  if (win) for (const reward of s.encounter.rewardItems ?? []) {
    if (reward.chance != null && rng() >= reward.chance) continue
    const item = rewardItemAt(reward, now)
    collected[item] = (collected[item] || 0) + rollQty(reward, rng)
  }
  const itemList = Object.entries(collected).map(([id, n]) => `${itemOf(id)?.name || id} ${n}개`).join(', ')
  const enemyName = s.encounter.enemy?.name || '요괴'
  const text = win ? `${enemyName}를 물리쳤다. 영력 +${gain}${itemList ? `, 추가 보상 ${itemList}` : ''}` : fled ? `${enemyName}에게서 도망쳤다.` : `${enemyName}에게 패했다.`
  const session = addLog({ ...s, encounter: null, spiritGained: s.spiritGained + gain, nodes: s.nodes.filter(node => node.id !== s.encounter.nodeId) }, text)
  let next = { ...player, spirit: player.spirit + gain,
    inventory: { ...(player.inventory ?? {}), ...Object.fromEntries(Object.entries(collected).map(([id, n]) => [id, (player.inventory?.[id] || 0) + n])) },
    huntExpedition: session }
  if ((!win && !fled) || s.turn >= s.maxTurns) next = finish(next, now, '개척을 종료했다.')
  return { player: next, logs: [`개척: ${text}`] }
}

/** v-B.16 지금 걸려 있는 개척 효과 목록(화면 표시용) */
export function huntBuffsOf(session) {
  if (!session) return []
  const out = []
  if (session.wardTurns > 0) out.push({ key: 'ward', text: `요괴 쫓기 ${session.wardTurns}턴` })
  if (session.freezeTurns > 0) out.push({ key: 'freeze', text: `짐승 묶기 ${session.freezeTurns}턴` })
  if (session.oddsBuff?.left > 0) out.push({ key: 'odds', text: `성공률 +${session.oddsBuff.amount}% (${session.oddsBuff.left}회)` })
  if (session.doubleLeft > 0) out.push({ key: 'double', text: `보상 2배 ${session.doubleLeft}회` })
  if (session.bonusUp > 0) out.push({ key: 'bonus', text: `추가 보상 +${session.bonusUp}%` })
  const st = Object.entries(session.statBonus ?? {})
  if (st.length) out.push({ key: 'stat', text: st.map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`).join(' · ') })
  return out
}

/**
 * v-B.16 개척 아이템(#개척) 사용. 턴을 쓰지 않는다. 요괴와 싸우는 중에는 쓸 수 없다.
 * 효과: turns · odds{amount, attempts} · attempts · ward · banish · freeze · double · bonus · stat{…}  (+ 같은 아이템의 hp · mp)
 */
export function useHuntItem(player, item, now = Date.now()) {
  const error = playable(player)
  if (error && !(error === '행동 가능한 턴을 모두 썼다.' && item?.effect?.hunt?.turns)) return { error }
  const h = item?.effect?.hunt
  if (!h) return { error: '개척 중에 쓰는 아이템이 아니다.' }
  if (!((player.inventory?.[item.id] || 0) > 0)) return { error: '갖고 있지 않다.' }
  let s = { ...player.huntExpedition }
  const parts = []
  if (h.attempts) {
    // 지금 칸의 대상(다 쓴 것 포함) + 옆 칸 장애물
    const targets = s.nodes.filter(n => n.kind !== 'ghost' && (n.kind === 'obstacle' ? distance(n, s.position) === 1 : same(n, s.position)))
    if (!targets.length) return { error: '지금 칸(또는 옆 칸 장애물)에 다시 시도할 대상이 없다.' }
    const ids = new Set(targets.map(n => n.id))
    s.nodes = s.nodes.map(n => ids.has(n.id) ? { ...n, attemptsLeft: (n.attemptsLeft || 0) + h.attempts } : n)
    parts.push(`${targets.map(n => n.name).join(' · ')} 시도 +${h.attempts}`)
  }
  if (h.banish) {
    const ghosts = s.nodes.filter(n => n.kind === 'ghost' && active(n))
    if (!ghosts.length) return { error: '이 터에는 쫓아낼 요괴가 없다.' }
    s.nodes = s.nodes.filter(n => !(n.kind === 'ghost'))
    parts.push(`${ghosts.map(n => n.name).join(' · ')}을(를) 터에서 쫓아냈다`)
  }
  if (h.turns) { s.maxTurns += h.turns; parts.push(`행동 턴 +${h.turns}`) }
  if (h.odds) {
    const cur = s.oddsBuff?.left > 0 ? s.oddsBuff : { amount: 0, left: 0 }
    s.oddsBuff = { amount: Math.max(cur.amount, h.odds.amount), left: cur.left + h.odds.attempts }
    parts.push(`다음 ${h.odds.attempts}번 성공률 +${h.odds.amount}%`)
  }
  if (h.ward) { s.wardTurns = Math.max(s.wardTurns || 0, h.ward); parts.push(`요괴 쫓기 ${h.ward}턴`) }
  if (h.freeze) { s.freezeTurns = Math.max(s.freezeTurns || 0, h.freeze); parts.push(`짐승 묶기 ${h.freeze}턴`) }
  if (h.double) { s.doubleLeft = (s.doubleLeft || 0) + h.double; parts.push(`보상 2배 ${h.double}회`) }
  if (h.bonus) { s.bonusUp = Math.min(100, (s.bonusUp || 0) + h.bonus); parts.push(`추가 보상 +${h.bonus}%`) }
  if (h.stat) {
    s.statBonus = { ...(s.statBonus ?? {}) }
    for (const [k, v] of Object.entries(h.stat)) s.statBonus[k] = (s.statBonus[k] || 0) + v
    parts.push(Object.entries(h.stat).map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`).join(' · '))
  }
  const e = item.effect
  let next = { ...player, inventory: { ...player.inventory, [item.id]: player.inventory[item.id] - 1 } }
  if (next.inventory[item.id] <= 0) delete next.inventory[item.id]
  if (e.hp) { next.hp = Math.min(next.hpMax ?? next.hp + e.hp, (next.hp || 0) + e.hp); parts.push(`체력 +${e.hp}`) }
  if (e.mp) { next.mp = Math.min(next.mpMax ?? next.mp + e.mp, (next.mp || 0) + e.mp); parts.push(`의지력 +${e.mp}`) }
  // 턴을 다 썼어도 턴을 늘리는 아이템이면 이어서 할 수 있다(끝난 개척을 되살리지는 않는다 — 아직 진행 중일 때만).
  const text = `${item.name} 사용 — ${parts.join(' · ')}`
  s = addLog(s, text)
  next.huntExpedition = s
  return { player: next, logs: [`개척: ${text}`] }
}
