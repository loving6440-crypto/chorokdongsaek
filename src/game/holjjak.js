// 패 놀이터 '홀/짝'. 시스템과 1:1로만 하는 간단한 내기. 파티 상태여도 할 수 있으나 파티 단위로는 할 수 없다.
import { dayKey } from './progress'

export const HOLJJAK_MAX_PER_DAY = 3
export const HOLJJAK_MAX_BET = 500 // 한 번에 걸 수 있는 최대 돈(냥)

export const holjjakStateOf = (player, now = Date.now()) => {
  const st = player.holjjak
  return st && st.day === dayKey(now) ? st : { day: dayKey(now), count: 0 }
}

/** 홀/짝 한 판. pick 은 'odd'(홀) | 'even'(짝). admin 은 돈을 쓰지 않고(결과만 확인), 승패는 그대로 계산한다. */
export function playHoljjak(player, bet, pick, admin = false, now = Date.now(), rand = Math.random) {
  if (pick !== 'odd' && pick !== 'even') return { error: '홀 또는 짝을 골라야 한다.' }
  const st = holjjakStateOf(player, now)
  if (st.count >= HOLJJAK_MAX_PER_DAY) return { error: '오늘은 더 이상 할 수 없다. (하루 3회)' }
  const b = Math.floor(bet)
  if (!(b >= 1)) return { error: '걸 돈을 1냥 이상 정해 주세요.' }
  if (b > HOLJJAK_MAX_BET) return { error: `한 번에 걸 수 있는 돈은 최대 ${HOLJJAK_MAX_BET}냥이다.` }
  if (!admin && b > Math.floor(player.money)) return { error: '가진 돈보다 많이 걸 수 없다.' }
  const sysPick = rand() < 0.5 ? 'odd' : 'even'
  const win = sysPick === pick
  const delta = admin ? 0 : win ? b : -b
  const next = { ...player, money: player.money + delta, holjjak: { day: st.day, count: st.count + 1 } }
  return { player: next, win, sysPick, bet: b, delta }
}
