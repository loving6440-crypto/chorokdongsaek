import { HUNT_ATTEMPTS, HUNT_BONUSES, HUNT_COOLDOWN_MS, HUNT_SIZE, HUNT_SPECIES, HUNT_STAT_KEYS, siteMissingData } from './huntSites.js'

const same = (a, b) => a.x === b.x && a.y === b.y
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const inside = p => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < HUNT_SIZE && p.y >= 0 && p.y < HUNT_SIZE
const active = node => node.kind === 'ghost' || node.attemptsLeft > 0
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const die = (n, rng) => 1 + Math.floor(rng() * n)
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

export function huntStat(kind, stats) {
  const values = (HUNT_STAT_KEYS[kind] ?? []).map(key => Math.max(0, Number(stats[key]) || 0))
  return values.reduce((sum, value) => sum + value, 0)
}

export function huntOdds(kind, level, stats) {
  const value = huntStat(kind, stats)
  return { value, success: 100 - clamp(Math.max(1, level - value) * 10, 10, 100), bonus: clamp(value - level, 0, 100) }
}

export const huntCooldownLeft = (player, siteId, now = Date.now()) => Math.max(0, (player.huntCooldowns?.[siteId] ?? 0) - now)
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
    huntCooldowns: { ...player.huntCooldowns, [session.siteId]: now + HUNT_COOLDOWN_MS },
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
  if (player.huntExpedition?.status === 'active') return { error: '진행 중인 수렵을 먼저 마쳐야 한다.' }
  if (huntCooldownLeft(player, site?.id, now)) return { error: '아직 이 터에 다시 갈 수 없다.' }
  if (siteMissingData(site).length) return { error: '이 터는 아직 개방되지 않았다.' }
  if (player.hp <= 0) return { error: '몸을 회복한 뒤 수렵할 수 있다.' }
  let session = {
    siteId: site.id, name: site.name, status: 'active', enteredAt: now, maxTurns: site.maxTurns, turn: 0,
    position: { ...site.start }, encounter: null, rewards: {}, spiritGained: 0,
    nodes: site.nodes.map(node => ({ ...HUNT_SPECIES[node.species], ...node, ...(node.route ? { route: node.route.map(point => ({ ...point })) } : {}), attemptsLeft: HUNT_ATTEMPTS })),
    log: [`${site.name}에 들어왔다. 이동과 채집·수렵 시도는 각각 1턴이다.`],
  }
  // 두 출현 판정을 독립적으로 수행한다. 한쪽의 위치 추첨이 다른 쪽의 출현 판정에 영향을 주지 않는다.
  const spawned = ['spirit', 'ghost'].filter(kind => site[kind] && rng() < site[kind].chance)
  for (const kind of spawned) {
    const position = randomEmpty(session, rng)
    if (position) session.nodes.push({ ...site[kind], ...position, id: `roaming-${kind}`, attemptsLeft: HUNT_ATTEMPTS })
  }
  return { player: { ...player, huntExpedition: session }, logs: [`수렵: ${site.name}에 들어섰다.`] }
}

export function leaveHuntSite(player, now = Date.now()) {
  if (player.huntExpedition?.status !== 'active') return { error: '진행 중인 수렵이 없다.' }
  if (player.huntExpedition?.encounter) return { error: '귀신과의 전투를 먼저 마쳐야 한다.' }
  return { player: finish(player, now, '터에서 돌아왔다. 50분 뒤에 다시 올 수 있다.'), logs: ['수렵을 마치고 돌아왔다.'] }
}

/** 동물은 고정 테두리를 매 턴 한 칸씩 돈다. 풀/장애물과 겹쳐도 경로를 벗어나지 않는다. */
export function moveHuntCreatures(session) {
  const nodes = session.nodes.map(node => ({ ...node }))
  for (const node of nodes) {
    if (!active(node) || same(node, session.position) || !['animal', 'spirit', 'ghost'].includes(node.kind)) continue
    const occupied = p => !same(p, session.position) && nodes.some(other => other.id !== node.id && active(other) && same(other, p) && other.kind !== 'plant')
    if (node.kind === 'animal') {
      if (!node.route?.length) continue
      const index = node.route.findIndex(p => same(node, p))
      if (index < 0) continue
      const next = node.route[(index + 1) % node.route.length]
      Object.assign(node, next)
    } else if (node.kind === 'ghost') {
      Object.assign(node, chaseStep(node, session.position, occupied))
    } else {
      const options = [node, ...neighbors(node)].filter(p => !occupied(p) && !same(p, session.position))
      options.sort((a, b) => distance(b, session.position) - distance(a, session.position))
      Object.assign(node, { x: options[0].x, y: options[0].y })
    }
  }
  const ghost = nodes.find(node => node.kind === 'ghost' && active(node) && same(node, session.position))
  return { ...session, nodes, encounter: ghost ? { nodeId: ghost.id, enemy: ghost.enemy, rewardSpirit: ghost.rewardSpirit } : null }
}

function endTurn(player, session, now) {
  let next = { ...player, huntExpedition: moveHuntCreatures({ ...session, turn: session.turn + 1 }) }
  // 마지막 턴에 귀신과 조우했으면 전투를 먼저 마무리하고 종료한다.
  if (next.huntExpedition.turn >= session.maxTurns && !next.huntExpedition.encounter) next = finish(next, now, '행동 가능한 턴을 모두 썼다. 수렵을 마친다.')
  return next
}

function playable(player) {
  const s = player.huntExpedition
  if (!s || s.status !== 'active') return '진행 중인 수렵이 없다.'
  if (s.encounter) return '귀신과의 전투를 먼저 마쳐야 한다.'
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
  const odds = huntOdds(node.kind, node.level, stats)
  const success = rng() * 100 < odds.success
  const rewards = {}
  if (success) {
    for (const reward of node.rewards ?? []) rewards[reward.item] = (rewards[reward.item] ?? 0) + (reward.dice ? die(reward.dice, rng) : reward.amount)
    const bonus = HUNT_BONUSES[node.kind]
    if (bonus && rng() * 100 < odds.bonus) rewards[bonus.item] = (rewards[bonus.item] ?? 0) + (bonus.dice ? die(bonus.dice, rng) : bonus.amount)
  }
  const inventory = { ...player.inventory }
  const totals = { ...s.rewards }
  for (const [item, qty] of Object.entries(rewards)) {
    inventory[item] = (inventory[item] ?? 0) + qty
    totals[item] = (totals[item] ?? 0) + qty
  }
  const text = `${node.name}: ${success ? '성공' : '실패'} (성공률 ${odds.success}%, 남은 시도 ${node.attemptsLeft - 1}회)`
  const session = addLog({ ...s, rewards: totals, nodes: s.nodes.map(point => point.id === nodeId ? { ...point, attemptsLeft: point.attemptsLeft - 1 } : point) }, text)
  return { player: endTurn({ ...player, inventory }, session, now), logs: [`수렵: ${text}`], success, rewards }
}

/** 결과는 한 번만 정산한다. 전투 보상은 퇴마 실습의 일일 한도/돈 보상과 무관하다. */
export function resolveHuntEncounter(player, { win, fled }, now = Date.now()) {
  const s = player.huntExpedition
  if (s?.status !== 'active' || !s.encounter) return { error: '진행 중인 조우가 없다.' }
  const gain = win ? Math.max(0, Math.min(s.encounter.rewardSpirit ?? 20, 200 - player.spirit)) : 0
  const text = win ? `산귀신을 물리쳤다. 영력 +${gain}` : fled ? '산귀신에게서 도망쳤다.' : '산귀신에게 패했다.'
  const session = addLog({ ...s, encounter: null, spiritGained: s.spiritGained + gain, nodes: s.nodes.filter(node => node.id !== s.encounter.nodeId) }, text)
  let next = { ...player, spirit: player.spirit + gain, huntExpedition: session }
  if (!win || s.turn >= s.maxTurns) next = finish(next, now, '수렵을 마치고 터에서 돌아왔다.')
  return { player: next, logs: [`수렵: ${text}`] }
}
