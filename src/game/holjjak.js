// 패 놀이터 '오광 뽑기'(화투). 시스템과 1:1로만 하는 내기. 파티 상태여도 할 수 있으나 파티 단위로는 할 수 없다.
//
// 참여비(2의 배수)를 내고 화투 광 다섯 장 중 하나를 고른다. 어느 패가 나오느냐에 따라 참여비의 배수를 돌려받는다.
//   1광 ×2   3광 ×1.5   8광 ×1(본전)   11광 ×0.5   12광 ×0(전부 잃음)
// 화면에서는: 다섯 장을 펼쳐 보여 준 뒤(이 순서를 보여 준다) → 모두 뒤집고 → 자리를 5초 정도 섞은 뒤 → 하나를 고르게 한다.
import { dayKey } from './progress'

export const HOLJJAK_MAX_PER_DAY = 3
export const HOLJJAK_MAX_BET = 500 // 한 번에 낼 수 있는 참여비 최대(냥). 2의 배수여야 한다.

// 화투 광 다섯 장과 그 배수. 1광이 제일 좋고(2배), 12광이 꽝(전부 잃음).
export const HOLJJAK_SLOTS = [
  { month: 1, mult: 2 },
  { month: 3, mult: 1.5 },
  { month: 8, mult: 1 },
  { month: 11, mult: 0.5 },
  { month: 12, mult: 0 },
]

export const holjjakStateOf = (player, now = Date.now()) => {
  const st = player.holjjak
  return st && st.day === dayKey(now) ? st : { day: dayKey(now), count: 0 }
}

function shuffle(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 이번 판에서 다섯 장을 섞어 둘 자리 순서. (화면에서 뒤집어 섞는 연출 뒤, 실제로 어느 자리에 무엇이 있는지를 정한다) */
export function shuffleHoljjak(rand = Math.random) {
  return shuffle(HOLJJAK_SLOTS, rand)
}

/**
 * 오광 뽑기 한 판. slots 는 shuffleHoljjak() 으로 미리 섞어 둔 다섯 장, slotIndex 는 그중 고른 자리(0~4).
 * admin 은 돈을 쓰지 않고(결과만 확인), 어느 패가 나왔는지는 그대로 계산한다.
 */
export function playHoljjak(player, bet, slots, slotIndex, admin = false, now = Date.now()) {
  const st = holjjakStateOf(player, now)
  if (st.count >= HOLJJAK_MAX_PER_DAY) return { error: '오늘은 더 이상 할 수 없다. (하루 3회)' }
  const b = Math.floor(bet)
  if (!(b >= 2) || b % 2 !== 0) return { error: '참여비는 2의 배수(2냥 이상)로 정해 주세요.' }
  if (b > HOLJJAK_MAX_BET) return { error: `한 번에 낼 수 있는 참여비는 최대 ${HOLJJAK_MAX_BET}냥이다.` }
  if (!admin && b > Math.floor(player.money)) return { error: '가진 돈보다 많이 낼 수 없다.' }
  if (!Array.isArray(slots) || slots.length !== HOLJJAK_SLOTS.length) return { error: '패가 올바르지 않다.' }
  const picked = slots[slotIndex]
  if (!picked) return { error: '고른 자리가 올바르지 않다.' }
  const payout = Math.floor(b * picked.mult)
  const delta = admin ? 0 : payout - b
  const next = { ...player, money: player.money + delta, holjjak: { day: st.day, count: st.count + 1 } }
  return { player: next, picked, bet: b, payout, delta }
}
