// v-B.15 다인 전투 참가 정보 검증.
// 브라우저가 보낸 스탯·영능력·장비 효과·체력·가져가는 아이템을 서버에 저장된 캐릭터(account.save.player)
// 기준의 상한으로 깎는다. 서버 저장값 자체도 아직 브라우저가 올리는 저장이므로 "완전한 서버 권위"는 아니지만,
// 전투 요청 한 번만 조작해 저장된 캐릭터보다 강해지는 것은 막는다. (근본 해결: 캐릭터 성장 서버 권위화)
import { STAT_MAX } from '../src/game/constants.js'
import { PSYCHICS } from '../src/game/battle.js'
import { equipOf, trinketFx, weaponFx } from '../src/game/items.js'
import { effectiveStats } from '../src/game/statCalc.js'

const VITAL_MAX = 999_999
const finite = (v) => typeof v === 'number' && Number.isFinite(v)

/** 저장된 캐릭터의 기본 스탯을 정상 범위로 자른 사본. (관리자는 스탯을 마음대로 조절하므로 상한을 두지 않는다) */
function saneBaseStats(player, admin) {
  const out = {}
  for (const [k, v] of Object.entries(player.stats ?? {})) {
    if (!finite(v)) continue
    out[k] = Math.max(1, Math.floor(admin ? v : Math.min(v, STAT_MAX)))
  }
  return out
}

/**
 * @param info   mbInfo() 로 형식만 정리한 브라우저 제출값
 * @param player 서버에 저장된 활성 캐릭터의 player 객체
 * @returns 상한을 적용한 새 info
 */
export function clampMbInfo(info, player, { admin = false, now = Date.now() } = {}) {
  const base = saneBaseStats(player, admin)
  const safePlayer = { ...player, stats: base }
  const eff = effectiveStats(safePlayer, now)
  const claimed = info.stats && typeof info.stats === 'object' ? info.stats : {}
  const stats = {}
  for (const [k, cap] of Object.entries(eff)) {
    const v = claimed[k]
    stats[k] = finite(v) ? Math.max(1, Math.min(Math.round(v), cap)) : cap
  }

  const owned = new Set(Array.isArray(player.psychics) ? player.psychics : [])
  const allowedPsychic = (id) => PSYCHICS.some((p) => p.id === id && (p.default || owned.has(id)))

  // 최대 체력·영력: 저장된 값이 있으면 그보다 클 수 없다. (아주 오래된 저장에 값이 없으면 엔진 기본 계산에 맡긴다)
  const capMax = (stored, claim, min) => {
    if (finite(stored)) return Math.max(min, Math.min(stored, finite(claim) ? claim : VITAL_MAX, VITAL_MAX))
    return finite(claim) ? Math.max(min, Math.min(claim, VITAL_MAX)) : undefined
  }
  const hpMax = capMax(player.hpMax, info.hpMax, 1)
  const mpMax = capMax(player.mpMax, info.mpMax, 0)
  const pick = (claim, stored, max) => {
    const v = finite(claim) ? claim : finite(stored) ? stored : max
    return max === undefined ? (finite(v) ? Math.max(0, v) : undefined) : Math.max(0, Math.min(v, max))
  }

  let bring = info.bring
  if (bring && typeof bring === 'object') {
    const inv = player.inventory && typeof player.inventory === 'object' ? player.inventory : {}
    bring = {}
    for (const [id, n] of Object.entries(info.bring)) {
      const have = Math.max(0, Math.floor(Number(inv[id]) || 0))
      const take = Math.min(n, have)
      if (take > 0) bring[id] = take
    }
  }

  const baseAggr = base.aggression ?? 1
  const weaponId = equipOf(player).weapon
  return {
    ...info,
    stats,
    psychics: (info.psychics ?? []).filter(allowedPsychic),
    psychicBring: Array.isArray(info.psychicBring) ? info.psychicBring.filter(allowedPsychic) : info.psychicBring,
    bring,
    // 장비 효과는 브라우저 주장 대신 저장된 장비에서 다시 구한다.
    fx: weaponFx(player),
    trinket: trinketFx(player),
    special: (weaponId && player.weaponSpecial?.[weaponId]) || null,
    baseAggression: finite(info.baseAggression) ? Math.max(1, Math.min(info.baseAggression, baseAggr)) : baseAggr,
    // 저주(쇠약)는 숨길 수 없다: 저장된 쪽과 제출된 쪽 중 더 늦게 끝나는 시각을 쓴다.
    curseUntil: Math.max(info.curseUntil || 0, finite(player.curseUntil) ? player.curseUntil : 0),
    hpMax,
    mpMax,
    hp: pick(info.hp, player.hp, hpMax),
    mp: pick(info.mp, player.mp, mpMax),
  }
}
