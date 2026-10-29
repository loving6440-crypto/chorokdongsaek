// v78 시범판 저장 데이터 호환: 이전 판에 없던 보상 ID / 잘못된 순찰 경로를 복구한다.
// 다른 v77 진행 상태는 변경하지 않는다.
import { HUNT_SITES } from './huntSites.js'

const OLD_IDS = { rock: 'stone', raspberry: 'wild-raspberry', 'trap-scrap': 'trap-scraps' }

function fixItems(items) {
  if (!items || typeof items !== 'object') return items
  if (!Object.keys(OLD_IDS).some(key => Object.hasOwn(items, key))) return items
  const result = { ...items }
  for (const [oldId, newId] of Object.entries(OLD_IDS)) {
    if (!Object.hasOwn(result, oldId)) continue
    result[newId] = (result[newId] || 0) + (result[oldId] || 0)
    delete result[oldId]
  }
  return result
}

function fixRewards(rewards) {
  if (!Array.isArray(rewards)) return rewards
  if (!rewards.some(x => OLD_IDS[x.item])) return rewards
  return rewards.map(x => OLD_IDS[x.item] ? { ...x, item: OLD_IDS[x.item] } : x)
}

function sameRoute(a, b) {
  return Array.isArray(a) && a.length === b?.length && a.every((p, i) => p.x === b[i].x && p.y === b[i].y)
}

function fixSession(session) {
  if (!session?.nodes?.length) return session
  const site = HUNT_SITES[session.siteId]
  let changed = false
  const nodes = session.nodes.map(node => {
    let next = node
    const definition = site?.nodes.find(point => point.id === node.id && point.kind === 'animal')
    if (definition?.route && !sameRoute(node.route, definition.route)) {
      // 잘못된 기존 9×9 순찰 경로 때문에 여우가 멈춰 있었던 저장분도 복구한다.
      const onPath = definition.route.some(p => p.x === node.x && p.y === node.y)
      next = {
        ...next,
        x: onPath ? node.x : definition.x,
        y: onPath ? node.y : definition.y,
        route: definition.route.map(p => ({ ...p })),
      }
      changed = true
    }
    const rewards = fixRewards(next.rewards)
    if (rewards !== next.rewards) { next = { ...next, rewards }; changed = true }
    return next
  })
  const rewards = fixItems(session.rewards)
  if (rewards !== session.rewards) changed = true
  return changed ? { ...session, nodes, rewards } : session
}

export function migrateHuntSave(player) {
  if (!player || typeof player !== 'object') return player
  let next = player
  for (const key of ['inventory', 'pendingInventory']) {
    const corrected = fixItems(next[key])
    if (corrected !== next[key]) next = { ...next, [key]: corrected }
  }
  const lockers = next.lockers
  if (lockers) {
    const repaired = Object.fromEntries(Object.entries(lockers).map(([k, contents]) => [k, fixItems(contents)]))
    if (Object.keys(lockers).some(k => lockers[k] !== repaired[k])) next = { ...next, lockers: repaired }
  }
  const huntExpedition = fixSession(next.huntExpedition)
  if (huntExpedition !== next.huntExpedition) next = { ...next, huntExpedition }
  return next
}
