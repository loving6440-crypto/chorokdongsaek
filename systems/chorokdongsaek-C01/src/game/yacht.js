// 요트 다이스. 2~4인, 일행(파티) 안에서만 한다. 판정은 서버가 맡고, 이 파일은 서버·화면이 함께 쓰는 순수 로직이다.
//
// 주사위 5개, 한 차례에 최대 3번까지 던진다(처음 던진 뒤엔 남길 주사위를 골라 나머지만 다시 던릴 수 있다).
// 던지기를 끝내면(또는 3번을 다 쓰면) 아직 안 채운 칸 하나를 골라 지금 주사위로 점수를 매겨 채운다 —
// 맞지 않는 칸에 넣어 0점으로 "버리는" 것도 정식 규칙대로 허용한다. 12칸을 전부 채우면 그 사람은 끝이고,
// 모두가 12칸을 다 채우면 게임이 끝나 총점이 가장 높은 사람이 이긴다.

export const DICE_N = 5
export const MAX_ROLLS = 3

export const CATEGORIES = [
  { id: 'ones', label: '숫자 1' },
  { id: 'twos', label: '숫자 2' },
  { id: 'threes', label: '숫자 3' },
  { id: 'fours', label: '숫자 4' },
  { id: 'fives', label: '숫자 5' },
  { id: 'sixes', label: '숫자 6' },
  { id: 'choice', label: '초이스' },
  { id: 'fourKind', label: '포커(같은 눈 4개)' },
  { id: 'fullHouse', label: '풀하우스' },
  { id: 'smallStraight', label: '스몰 스트레이트' },
  { id: 'largeStraight', label: '라지 스트레이트' },
  { id: 'yacht', label: '요트(같은 눈 5개)' },
]
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id))
export const isCategory = (id) => CATEGORY_IDS.has(id)

function counts(dice) {
  const c = Array(7).fill(0)
  for (const d of dice) if (d >= 1 && d <= 6) c[d]++
  return c
}

export function scoreFor(category, dice) {
  if (dice.length !== DICE_N || dice.some((d) => d < 1 || d > 6)) return 0
  const c = counts(dice)
  const sum = dice.reduce((s, d) => s + d, 0)
  switch (category) {
    case 'ones': return c[1] * 1
    case 'twos': return c[2] * 2
    case 'threes': return c[3] * 3
    case 'fours': return c[4] * 4
    case 'fives': return c[5] * 5
    case 'sixes': return c[6] * 6
    case 'choice': return sum
    case 'fourKind': return c.slice(1).some((n) => n >= 4) ? sum : 0
    case 'fullHouse': {
      const nz = c.slice(1).filter((n) => n > 0).sort((a, b) => a - b)
      return nz.length === 2 && nz[0] === 2 && nz[1] === 3 ? sum : 0
    }
    case 'smallStraight': {
      const has = (arr) => arr.every((n) => c[n] > 0)
      return has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 15 : 0
    }
    case 'largeStraight': {
      const has = (arr) => arr.every((n) => c[n] > 0)
      return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 30 : 0
    }
    case 'yacht': return c.slice(1).some((n) => n === 5) ? 50 : 0
    default: return 0
  }
}

/** keepArr[i] 가 true 이고 그 자리에 이미 값이 있을 때만 유지한다. 그 외(처음 던지기 포함)는 새로 굴린다. */
export function rollDice(dice, keepArr, rand = Math.random) {
  return dice.map((d, i) => (d && keepArr?.[i] ? d : 1 + Math.floor(rand() * 6)))
}

export const totalScore = (scorecard) => CATEGORIES.reduce((s, c) => s + (scorecard[c.id] ?? 0), 0)
export const isFull = (scorecard) => CATEGORIES.every((c) => scorecard[c.id] != null)
