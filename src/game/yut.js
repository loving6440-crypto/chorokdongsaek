// 윷놀이(정식 규칙). 2~4인, 일행(파티) 안에서만 한다. 판정과 진행은 서버가 맡고, 이 파일은 서버·화면이 함께 쓰는 순수 로직이다.
//
// 말판: 바깥 테두리 20칸(0~19, 0이 출발점이자 완주점) + 지름길(대각선) 9칸(중앙 포함).
//  - 5번 칸(귀퉁이)에서: 그대로 가기(6) 또는 지름길(20→21→중앙22)을 골라 15번 칸으로 바로 나올 수 있다.
//  - 10번 칸(귀퉁이)에서: 그대로 가기(11) 또는 지름길(25→26→중앙22)을 골라 곧장 완주(0)로 나올 수 있다.
//  - 중앙(22)에 정확히 서면: 15 쪽(23→24→15)이나 완주 쪽(27→28→0) 중 하나를 고른다.
// 말이 가는 중간에 분기점을 지나야 한다면(정확히 서지 않고 지나치는 경우 포함) 그 자리에서 멈춰 선택을 받는다.
//
// 단순화해 둔 두 가지(정식 규칙과 다른 점):
//  - 업기(내 말이 있는 자리에 또 내 말이 가면)는 항상 자동으로 이뤄진다(따로 업을지 말지 고르지 않는다).
//  - 빽도(뒤로 한 칸)는 바깥 테두리(0~19) 위에 있는 말에만 쓸 수 있다. 지름길·중앙 위의 말엔 쓸 수 없다(드문 경우라 단순화).

export const OUTER_LEN = 20
export const START = -1
export const DONE = 'done'

const BRANCH = {
  5: [
    { id: 'straight', to: 6, label: '그대로 가기' },
    { id: 'short', to: 20, label: '지름길 (중앙을 거쳐 15로)' },
  ],
  10: [
    { id: 'straight', to: 11, label: '그대로 가기' },
    { id: 'short', to: 25, label: '지름길 (중앙을 거쳐 곧장 완주)' },
  ],
  22: [
    { id: 'to15', to: 23, label: '15 방향으로 나가기' },
    { id: 'to0', to: 27, label: '완주 방향(0)으로 나가기' },
  ],
}

export const isBranch = (n) => n === 5 || n === 10 || n === 22
export const branchOptions = (n) => BRANCH[n] ?? null

function plainNext(n) {
  if (n === START) return 0
  if (n === 19) return DONE
  if (n === 24) return 15 // 지름길 A(5번 쪽): 22(중앙) → 23 → 24 → 15
  if (n === 26) return 22 // 지름길 B(10번 쪽): 25 → 26 → 22(중앙) — 번호가 거꾸로라 +1로는 안 이어진다
  if (n === 28) return DONE // 지름길 B: 22(중앙) → 27 → 28 → 0(완주)
  return n + 1
}

/** steps(1~5) 만큼 전진한다. 분기점에 걸리면 멈추고 선택을 요구한다(pending). 끝까지 가면 done. */
export function walk(pos, steps) {
  if (steps < 0) return walkBack(pos)
  let cur = pos
  let remaining = steps
  while (remaining > 0) {
    if (isBranch(cur)) return { pending: true, at: cur, remaining }
    const nx = plainNext(cur)
    if (nx === DONE) return { done: true, finished: true }
    cur = nx
    remaining--
  }
  return { done: true, pos: cur }
}

/** 분기점에서 고른 뒤 이어서 걷는다. */
export function resumeWalk(at, remaining, choiceId) {
  const opt = branchOptions(at)?.find((o) => o.id === choiceId)
  if (!opt) return { error: 'bad-choice' }
  return walk(opt.to, remaining - 1)
}

function walkBack(pos) {
  let p
  if (pos === START) p = null
  else if (pos === 0) p = START
  else if (pos >= 1 && pos <= 19) p = pos - 1
  else p = null // 지름길·중앙 위의 말은 빽도를 쓸 수 없다(단순화)
  if (p == null) return { error: 'no-backdo' }
  return { done: true, pos: p }
}

const STICKS = 4
/** 윷가지 네 개를 던진다. 0번 가지가 '표시' 윷가지(빽도 판정용). */
export function rollYut(rand = Math.random) {
  const flats = Array.from({ length: STICKS }, () => rand() < 0.5)
  const flatCount = flats.filter(Boolean).length
  if (flatCount === 1 && flats[0]) return { name: '빽도', steps: -1, extra: false }
  if (flatCount === 0) return { name: '모', steps: 5, extra: true }
  if (flatCount === 1) return { name: '도', steps: 1, extra: false }
  if (flatCount === 2) return { name: '개', steps: 2, extra: false }
  if (flatCount === 3) return { name: '걸', steps: 3, extra: false }
  return { name: '윳', steps: 4, extra: true } // flatCount === 4
}
