// 윷놀이(정식 규칙). 2~4인, 일행(파티) 안에서만 한다. 판정과 진행은 서버가 맡고, 이 파일은 서버·화면이 함께 쓰는 순수 로직이다.
//
// 말판: 바깥 테두리 20칸(0~19, 0은 완주 지점) + 지름길(대각선) 9칸(중앙 포함).
//  - 대기 중인 말(START)은 0번 완주 지점을 밟지 않고 그 앞의 1번 칸부터 이동한다.
//    따라서 대기 상태에서 모(5칸)를 적용하면 5번 꼭짓점에 정확히 도착한다.
//  - 5번·10번 꼭짓점에 '정확히 멈춘' 말만 다음 이동에서 직진/지름길을 선택한다.
//  - 중앙(22)에 '정확히 멈춘' 말만 다음 이동에서 15 방향/완주 방향을 선택한다.
//  - 던진 칸 수로 이동하는 도중에 꼭짓점을 지나치면 멈추거나 꺾지 않고 기존 경로로 진행한다.
//    특히 중앙 통과는 진입 방향을 유지한다(21→22→23, 26→22→27).
//  - 꼭짓점에 도착한 이동은 그대로 끝나며, 방향 선택은 그 말을 다시 움직일 때 한다.

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

function plainNext(n, previous) {
  if (n === START) return 1 // 대기 중인 말의 첫 발은 0(완주점)이 아닌 1번 칸
  if (n === 19) return DONE
  if (n === 24) return 15 // 5번 지름길: 중앙 → 23 → 24 → 15
  if (n === 26) return 22 // 10번 지름길: 25 → 26 → 중앙
  if (n === 28) return DONE // 중앙 → 27 → 28 → 완주
  if (n === 22) return previous === 26 ? 27 : 23 // 중앙 통과 중에는 들어온 대각선을 계속 따라간다
  return n + 1 // 5·10에서는 꺾지 않고 테두리 직진
}

/** 이미 정해진 진행 방향으로 남은 칸 수만큼 걷는다. 도중의 꼭짓점에서는 멈추지 않는다. */
function walkThrough(pos, steps, previous = null) {
  let cur = pos
  let prev = previous
  for (let i = 0; i < steps; i++) {
    const next = plainNext(cur, prev)
    if (next === DONE) return { done: true, finished: true }
    prev = cur
    cur = next
  }
  return { done: true, pos: cur }
}

/** steps(1~5)만큼 전진. '출발 위치'가 꼭짓점인 경우에만 방향 선택을 요청한다. */
export function walk(pos, steps) {
  if (steps < 0) return walkBack(pos)
  if (!Number.isInteger(steps) || steps < 1) return { error: 'bad-steps' }
  if (isBranch(pos)) return { pending: true, at: pos, remaining: steps }
  return walkThrough(pos, steps)
}

/** 꼭짓점에 서 있던 말의 첫 발을 선택한 방향으로 옮기고 나머지는 자동으로 진행한다. */
export function resumeWalk(at, remaining, choiceId) {
  if (!Number.isInteger(remaining) || remaining < 1) return { error: 'bad-steps' }
  const opt = branchOptions(at)?.find((o) => o.id === choiceId)
  if (!opt) return { error: 'bad-choice' }
  return walkThrough(opt.to, remaining - 1, at)
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
