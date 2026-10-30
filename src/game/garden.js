// v79 — 텃밭: 씨앗 상점과 5칸 비닐하우스. 수확은 반드시 방문해 직접 실행한다.
import { canAddInventory, countSlots, INVENTORY_SLOTS } from './inventoryCapacity.js'

export const GARDEN_SLOTS = 5
export const GARDEN_GROW_MS = 60 * 60 * 1000
export const SEED_PRICE = 3
export const GARDEN_CROPS = Object.freeze([
  { id: 'cherry-tomato', name: '방울토마토', seedId: 'seed-cherry-tomato' },
  { id: 'carrot', name: '당근', seedId: 'seed-carrot' },
  { id: 'lettuce', name: '상추', seedId: 'seed-lettuce' },
  { id: 'potato', name: '감자', seedId: 'seed-potato' },
  { id: 'cabbage', name: '배추', seedId: 'seed-cabbage' },
  { id: 'spinach', name: '시금치', seedId: 'seed-spinach' },
  { id: 'soybean', name: '콩', seedId: 'seed-soybean' },
])
const CROPS_BY_SEED = new Map(GARDEN_CROPS.map(c => [c.seedId, c]))

/** 기존 저장 데이터에도 적용. 무효 슬롯은 농작물을 생성하지 않고 빈 칸으로 보인다. */
export function gardenPlots(player) {
  const saved = Array.isArray(player?.gardenPlots) ? player.gardenPlots : []
  return Array.from({ length: GARDEN_SLOTS }, (_, index) => {
    const p = saved[index]
    return p && CROPS_BY_SEED.has(p.seedId) && Number.isFinite(p.plantedAt) && p.plantedAt > 0
      ? { seedId: p.seedId, plantedAt: p.plantedAt } : null
  })
}
export const cropOfSeed = seedId => CROPS_BY_SEED.get(seedId) ?? null
export const harvestReady = (plot, now = Date.now()) => !!plot && now >= plot.plantedAt + GARDEN_GROW_MS

export function buyGardenSeed(player, seedId, qty = 1) {
  const crop = cropOfSeed(seedId)
  if (!crop) return { error: '판매하지 않는 씨앗입니다.' }
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 99) return { error: '구매 수량이 올바르지 않습니다.' }
  if (!Number.isFinite(player.money) || player.money < SEED_PRICE * qty) return { error: '냥이 모자랍니다.' }
  if (!canAddInventory(player.inventory, { [seedId]: qty })) return { error: '소지품이 가득 차 씨앗을 살 수 없습니다.' }
  return {
    player: { ...player, money: player.money - SEED_PRICE * qty, inventory: { ...(player.inventory ?? {}), [seedId]: (player.inventory?.[seedId] ?? 0) + qty } },
    log: `${crop.name} 씨앗 ${qty}개를 구매했다. (-${SEED_PRICE * qty}냥)`,
  }
}

export function plantGardenSeed(player, slot, seedId, now = Date.now()) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= GARDEN_SLOTS) return { error: '텃밭 칸을 선택해 주세요.' }
  const crop = cropOfSeed(seedId)
  if (!crop) return { error: '텃밭에 심을 수 없는 씨앗입니다.' }
  const plots = gardenPlots(player)
  if (plots[slot]) return { error: '이미 작물이 심어져 있는 칸입니다.' }
  if ((player.inventory?.[seedId] ?? 0) < 1) return { error: '해당 씨앗이 없습니다.' }
  const inventory = { ...(player.inventory ?? {}), [seedId]: player.inventory[seedId] - 1 }
  if (inventory[seedId] === 0) delete inventory[seedId]
  plots[slot] = { seedId, plantedAt: now }
  return { player: { ...player, inventory, gardenPlots: plots }, log: `${slot + 1}번 칸에 ${crop.name} 씨앗을 심었다. (수확까지 1시간)` }
}

export function harvestGardenPlot(player, slot, now = Date.now()) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= GARDEN_SLOTS) return { error: '텃밭 칸을 선택해 주세요.' }
  const plots = gardenPlots(player)
  const plot = plots[slot]
  if (!plot) return { error: '작물이 심어져 있지 않습니다.' }
  if (!harvestReady(plot, now)) return { error: '아직 수확할 시간이 아닙니다.' }
  const crop = cropOfSeed(plot.seedId)
  if (!crop) return { error: '수확할 작물을 찾을 수 없습니다.' }
  // 사용자의 명시 규칙: 이미 30칸이 꽉 찼다면 같은 작물의 묶음에 공간이 있어도 수확 불가.
  if (countSlots(player.inventory) >= INVENTORY_SLOTS || !canAddInventory(player.inventory, { [crop.id]: 1 })) {
    return { error: '소지품 30칸이 꽉 찼습니다. 정리한 뒤 다시 수확해 주세요.' }
  }
  plots[slot] = null
  const inventory = { ...(player.inventory ?? {}), [crop.id]: (player.inventory?.[crop.id] ?? 0) + 1 }
  return { player: { ...player, inventory, gardenPlots: plots }, crop, log: `${slot + 1}번 칸에서 ${crop.name} 1개를 수확했다.` }
}
