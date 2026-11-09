import { BAG_ID, bagRemovalError } from './bag.js'
/**
 * v-B.06 매점 판매.
 *  - 누군가 잃어버린 물건 시리즈: 정해진 값 (머리끈 1 · 실내화 5 · 러브레터 8 · 핸드폰 20)
 *  - 매점·텃밭에서 살 수 있는 물건: 산 값의 1/5 (내림, 최소 1냥)
 *  - 재료: 얻기 어려운 만큼 — 개척에서 나오는 재료는 그 재료를 주는 가장 쉬운 칸의 적정 레벨로 정한다.
 *      식물·장애물·동물: 레벨 ÷ 4 (나올 확률이 낮으면 √확률로 나눠 더 비싸게) · 영물: 레벨 ÷ 3 + 10 · 요괴: 단계 × 5
 *    개척에서 안 나오는 재료는 아래 표(MANUAL)로 정한다. 텃밭 작물은 4냥(씨앗 3냥보다 조금 비싸게).
 *  - v-B.18: 공작소 · 조리실에서 만든 완성품(장비 · 장신구 · 음식 · 도구)도 판다.
 *      값 = 재료를 따로 팔 때 받는 값의 합 × 1.1 (올림, 최소 1냥). 착용 중인 장비는 소지품에 없으므로 팔리지 않는다.
 *  - 무구(도깨비 증표) · 화투패 · 강화로 하나뿐인 물건은 팔지 않는다.
 */
import { ITEMS, countOf, isGear, isInstance, isMaterial, isStoreOpen, itemOf } from './items.js'
import { HUNT_SITES, HUNT_SPECIES } from './huntSites.js'
import { GARDEN_CROPS } from './garden.js'
import { RECIPES } from './crafting.js'
import { COOK_RECIPES } from './cooking.js'

export const LOST_PRICES = { 'lost-hairband': 1, 'lost-slippers': 5, 'lost-love-letter': 8, 'lost-phone': 20 }
const MANUAL = {
  'crumpled-hanji': 1, 'broken-inkstick': 1, 'split-brush': 1, 'trap-scraps': 1, nail: 1, 'rice-grain': 1,
  pencil: 2, rice: 2, sugar: 2, 'cloth-scrap': 2,
  'friendship-letter': 3, inkstick: 3,
  'small-pot': 4, dye: 5, 'alcohol-lamp': 5, 'cherry-branch': 6, 'crescent-flower': 8,
  'soybean-oil': 22, // 콩 5개로 만든다
  trash: 1, // v-B.18 공작소 실패작
}
const CROP_PRICE = 4

/** 개척에서 나오는 재료의 값: 가장 쉽게 얻는 곳 기준 */
function huntPrices() {
  const out = {}
  const put = (id, v) => { if (!(out[id] <= v)) out[id] = v }
  for (const site of Object.values(HUNT_SITES)) {
    const spirits = site.spirits ?? (site.spirit ? [site.spirit] : [])
    for (const n of [...(site.nodes ?? []), ...spirits]) {
      const sp = HUNT_SPECIES[n.species]
      for (const r of sp?.rewards ?? []) {
        const chance = Math.max(0.05, r.chance ?? 1)
        const v = sp.kind === 'spirit' ? Math.round(n.level / 3) + 10 : Math.round(n.level / 4 / Math.sqrt(chance))
        put(r.item, Math.max(1, v))
      }
    }
    for (const r of site.ghost?.rewardItems ?? []) put(r.item, Math.max(1, (site.ghost.enemy?.tier ?? 3) * 5))
  }
  return out
}
const HUNT_PRICE = huntPrices()
const CROPS = new Set(GARDEN_CROPS.map((c) => c.id))

const RECIPE_OF = new Map([...RECIPES, ...COOK_RECIPES].map((r) => [r.result, r]))
export const CRAFTED_SELL_MULT = 1.1
/** v-B.18 만든 물건의 값: 재료 값의 합 × 1.1 (재료 중 팔 수 없는 게 있으면 그 재료는 1냥으로 친다) */
function craftedPrice(id, seen = new Set()) {
  const r = RECIPE_OF.get(id)
  if (!r || seen.has(id)) return null
  seen.add(id)
  const sum = r.inputs.reduce((a, [i, n]) => a + (sellPriceOf(i, seen) ?? 1) * n, 0)
  seen.delete(id)
  return Math.max(1, Math.ceil(sum * CRAFTED_SELL_MULT))
}

/** 매점에서 한 개를 팔 때 받는 값. 팔 수 없으면 null. */
export function sellPriceOf(itemOrId, seen = new Set()) {
  const item = typeof itemOrId === 'string' ? itemOf(itemOrId) : itemOrId
  if (!item || isInstance(item.id)) return null
  if (isGear(item)) return RECIPE_OF.has(item.id) ? craftedPrice(item.id, seen) : null // 만든 장비 · 장신구만
  if (LOST_PRICES[item.id] != null) return LOST_PRICES[item.id]
  if (item.price != null) return Math.max(1, Math.floor(item.price / 5))
  if (!isMaterial(item)) return RECIPE_OF.has(item.id) ? craftedPrice(item.id, seen) : null
  if (MANUAL[item.id] != null) return MANUAL[item.id]
  if (CROPS.has(item.id) && !HUNT_PRICE[item.id]) return CROP_PRICE
  if (HUNT_PRICE[item.id] != null) return HUNT_PRICE[item.id]
  return 2
}

/** 지금 가진 것 중 팔 수 있는 것: [{ item, count, price }] (ITEMS 순서) */
export function sellableItems(player) {
  return ITEMS.map((item) => ({ item, count: countOf(player, item.id), price: sellPriceOf(item) }))
    .filter((x) => x.count > 0 && x.price != null)
}

/** 판매. 반환 { player, gained, item, qty } 또는 { error } */
export function sellItem(player, id, qty = 1, now = Date.now()) {
  const item = itemOf(id)
  const price = sellPriceOf(item)
  if (price == null) return { error: '매점에서 사지 않는 물건이다.' }
  if (!isStoreOpen(now)) return { error: '지금은 매점 문이 닫혀 있다.' }
  if (!Number.isSafeInteger(qty) || qty < 1) return { error: '판매 수량이 올바르지 않다.' }
  const have = countOf(player, id)
  if (have < qty) return { error: '그만큼 갖고 있지 않다.' }
  if (id === BAG_ID) { const why = bagRemovalError(player, qty); if (why) return { error: why } } // v-B.17
  const inventory = { ...(player.inventory ?? {}), [id]: have - qty }
  if (inventory[id] <= 0) delete inventory[id]
  const gained = price * qty
  return { player: { ...player, inventory, money: (player.money || 0) + gained }, gained, item, qty }
}
