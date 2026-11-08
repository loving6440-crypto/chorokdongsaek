// 실효 스탯 계산 (순수 함수). 브라우저(progress.js 재수출)와 서버(server/index.js 다인 전투 검증)가 함께 쓴다.
import { equipOf, gearBonus, specialEnhOf, trinketFx, weaponFx } from './items.js'

export const WEAK_MS = 24 * 3600 * 1000 // [쇠약] 지속 시간: 리얼타임 24시간
export const isWeak = (player, now = Date.now()) => Math.max(player.weakUntil || 0, player.curseUntil || 0) > now
/** [쇠약] 중이면 모든 육조 스탯이 현재 스탯의 5할(내림, 최소 1). 아니면 그대로. */
/** 아이템으로 받은 시간제 보정(예: 쑥 → 인내 +1, 24시간). 만료된 건 무시한다. */
export function tempBonus(player, now = Date.now()) {
  const out = {}
  for (const b of player.buffs ?? []) if (b.until > now) out[b.stat] = (out[b.stat] || 0) + b.amount
  return out
}
export function effectiveStats(player, now = Date.now()) {
  const bonus = { ...gearBonus(player) }
  for (const [k, v] of Object.entries(tempBonus(player, now))) bonus[k] = (bonus[k] || 0) + v
  const hasBonus = Object.keys(bonus).length > 0
  const fx = weaponFx(player)
  const tfx = trinketFx(player) // v-B.08 장신구 특수 효과(기합의 띠 · 도깨비 탈)
  const special = specialEnhOf(player, equipOf(player).weapon)
  if (!isWeak(player, now) && !hasBonus && !fx && !special && !tfx) return player.stats
  const weak = isWeak(player, now)
  // 쇠약으로 5할이 된 뒤에 장비 보정이 더해진다.
  const out = Object.fromEntries(Object.entries(player.stats).map(([k, v]) => [k, (weak ? Math.max(1, Math.floor(v / 2)) : v) + (bonus[k] || 0)]))
  // 무구의 특수 효과 id. 스탯 목록에는 나타나지 않도록(열거되지 않게) 붙인다.
  if (fx) Object.defineProperty(out, 'fx', { value: fx, enumerable: false })
  if (special) Object.defineProperty(out, 'special', { value: special, enumerable: false })
  if (tfx) Object.defineProperty(out, 'trinket', { value: tfx, enumerable: false })
  return out
}
