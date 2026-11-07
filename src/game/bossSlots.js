// 보스 전투 전용 슬롯 (v-B.01). 아이템 최대 3개 + 영능력 최대 2개 조합을 1~3번 슬롯에 저장해 두고,
// 보스 전투 준비 화면에서 슬롯을 고르면 그 조합이 바로 담긴다. 저장 위치: player.bossSlots = [slot|null, slot|null, slot|null]
export const BOSS_SLOT_COUNT = 3
export const SLOT_ITEM_MAX = 3
export const SLOT_PSYCHIC_MAX = 2

const countIn = (player, id) => Math.max(0, Math.floor(Number(player?.inventory?.[id]) || 0))

/** 저장된 슬롯을 안전한 모양으로 고친다. 비었으면 null */
export function cleanSlot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const items = {}
  let total = 0
  for (const [id, n0] of Object.entries(raw.items ?? {})) {
    const n = Math.min(SLOT_ITEM_MAX - total, Math.max(0, Math.floor(Number(n0) || 0)))
    if (typeof id !== 'string' || !n) continue
    items[id] = n
    total += n
    if (total >= SLOT_ITEM_MAX) break
  }
  const psychics = [...new Set((Array.isArray(raw.psychics) ? raw.psychics : []).filter((x) => typeof x === 'string'))].slice(0, SLOT_PSYCHIC_MAX)
  return total || psychics.length ? { items, psychics } : null
}

/** 세 칸짜리 슬롯 목록 */
export const bossSlotsOf = (player) => Array.from({ length: BOSS_SLOT_COUNT }, (_, i) => cleanSlot(player?.bossSlots?.[i]))

/** index(0부터) 슬롯에 지금 고른 조합을 저장한다. 아무것도 안 골랐으면 슬롯을 비운다. */
export function saveBossSlot(player, index, items, psychics) {
  if (!Number.isInteger(index) || index < 0 || index >= BOSS_SLOT_COUNT) return player
  const slots = bossSlotsOf(player)
  slots[index] = cleanSlot({ items, psychics })
  return { ...player, bossSlots: slots }
}

/** 슬롯을 지금 쓸 수 있는지. 아이템이 모자라면 { error: '아이템이 모자라 N번 슬롯을 사용할 수 없습니다.' } */
export function loadBossSlot(player, index, ownedPsychicIds = []) {
  const slot = bossSlotsOf(player)[index]
  if (!slot) return { error: `${index + 1}번 슬롯이 비어 있습니다.` }
  const short = Object.entries(slot.items).filter(([id, n]) => countIn(player, id) < n)
  if (short.length) return { error: `아이템이 모자라 ${index + 1}번 슬롯을 사용할 수 없습니다.`, short: short.map(([id]) => id) }
  const psychics = slot.psychics.filter((id) => ownedPsychicIds.includes(id))
  return { items: { ...slot.items }, psychics, droppedPsychics: slot.psychics.filter((id) => !psychics.includes(id)) }
}
