// 타자 속도 계산: 한국어 타자 연습에서 쓰는 '타수'(분당 키 입력 횟수) 방식.
// 글자를 자모로 풀어서 실제 키보드를 몇 번 눌러야 하는지 센다.

const CODE_BASE = 0xac00
const CODE_END = 0xd7a3

// 쌍자음·겹모음·겹받침은 Shift 또는 키 두 번이 필요하므로 2타로 센다.
const CHO_COST = [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1] // ㄲ ㄸ ㅃ ㅆ ㅉ = 2
const JUNG_COST = [1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 2, 1] // ㅒ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ = 2
const JONG_COST = [
  0, 1, 2, 2, 1, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1,
] // 받침 없음(0) / ㄲ ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ ㅆ = 2

/** 문자열을 입력하는 데 필요한 키 입력 횟수(타수). */
export function countKeystrokes(text) {
  let total = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code >= CODE_BASE && code <= CODE_END) {
      const idx = code - CODE_BASE
      const jong = idx % 28
      const jung = Math.floor(idx / 28) % 21
      const cho = Math.floor(idx / 28 / 21)
      total += CHO_COST[cho] + JUNG_COST[jung] + JONG_COST[jong]
    } else {
      total += 1 // 공백·숫자·문장부호
    }
  }
  return total
}

export const GRADES = [
  { min: 0, name: '초학자' },
  { min: 150, name: '견습 주문사' },
  { min: 250, name: '정식 주문사' },
  { min: 350, name: '명창 주문사' },
  { min: 450, name: '대주술사' },
  { min: 550, name: '신필(神筆)' },
]

export function gradeOf(cpm) {
  let g = GRADES[0]
  for (const item of GRADES) if (cpm >= item.min) g = item
  return g
}
