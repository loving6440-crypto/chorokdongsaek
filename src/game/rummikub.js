// 루미큐브. 2~4인, 일행(파티) 안에서만 한다. 판정은 서버가 맡고, 이 파일은 서버·화면이 함께 쓰는 순수 로직이다.
//
// 타일: 1~13 × 4색(빨강·파랑·검정·노랑) × 2장 + 조커 2장 = 106장. 4명이면 한 사람당 14장을 쥐고 시작한다.
// 조합: 그룹(같은 숫자, 서로 다른 색 3~4장) 또는 런(같은 색, 이어지는 숫자 3장 이상).
// 조커는 어떤 타일도 대신할 수 있고, 테이블에 낼 때 무엇을 대신하는지(색·숫자) 정해서 낸다.
//
// 테이블은 자유롭게 재배열할 수 있다 — 쪼개기·합치기·끼워 넣기·조커 빼내 쓰기까지 전부 가능하다.
// 한 차례의 제출은 "내 턴이 끝났을 때 테이블 전체가 어떤 모습이어야 하는지"를 통째로 보낸다. 서버는
// (1) 그 전까지 테이블에 있던 타일이 하나도 빠짐없이, 중복 없이 어딘가의 조합에 다시 들어 있는지,
// (2) 새로 더해진 타일은 전부 지금 내 손패에 있는지, (3) 제출된 조합들이 전부 유효한지를 확인한다.
// 조커는 어떤 타일도 대신할 수 있고, 다시 집어서 다른 의미로 쓰거나(조커 빼내 쓰기) 그대로 둘 수 있다.
//
// 단순화해 둔 것(정식 규칙과 다른 점):
//  - 첫 조합(30점 이상)을 내기 전에는 테이블에 이미 있는 조합을 손대거나 재배열할 수 없다 — 새 조합만 손패에서
//    낼 수 있고, 그 새 조합들의 합이 30점을 넘어야 한다(정식 규칙과 같다).
//  - 조커를 되찾아 쓴 바로 그 턴에 다시 내야 한다는 세부 규칙은 두지 않았다(되찾은 조커를 들고 있다가 나중에
//    내도 된다).

export const COLORS = ['red', 'blue', 'black', 'yellow']
export const COLOR_LABEL = { red: '빨강', blue: '파랑', black: '검정', yellow: '노랑' }
export const FIRST_MELD_MIN = 30

export function freshDeck() {
  const tiles = []
  for (const c of COLORS) {
    for (let n = 1; n <= 13; n++) {
      for (let k = 0; k < 2; k++) tiles.push({ id: `${c}${n}-${k}`, color: c, num: n, joker: false })
    }
  }
  tiles.push({ id: 'J0', color: null, num: null, joker: true })
  tiles.push({ id: 'J1', color: null, num: null, joker: true })
  return tiles
}

export function shuffle(arr, rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// tiles: {id, color, num, joker}[]. assign: 조커 타일 id → {color, num}.
// 조커는 언제든 다시 집어 다른 의미로 쓸 수 있으므로, assign 에 값이 있으면 그 값이 우선이고,
// 없을 때만 이미 정해져 있던(이전 턴에 놓아 둔) 색·숫자를 그대로 쓴다.
function resolveTiles(tiles, assign = {}) {
  return tiles.map((t) => {
    if (!t.joker) return { ...t, isJoker: false }
    const a = assign[t.id]
    if (a) return { ...t, isJoker: true, color: a.color ?? null, num: a.num ?? null }
    if (t.color != null && t.num != null) return { ...t, isJoker: true }
    return { ...t, isJoker: true, color: null, num: null }
  })
}

function validateGroup(r) {
  if (r.length < 3 || r.length > 4) return { error: 'bad-size' }
  const num = r[0].num
  if (!r.every((t) => t.num === num)) return { error: 'not-same-number' }
  const colors = r.map((t) => t.color)
  if (new Set(colors).size !== colors.length) return { error: 'dup-color' }
  return { ok: true, kind: 'group', value: r.reduce((s, t) => s + t.num, 0) }
}

function validateRun(r) {
  if (r.length < 3) return { error: 'bad-size' }
  const color = r[0].color
  if (!r.every((t) => t.color === color)) return { error: 'not-same-color' }
  const sorted = [...r].sort((a, b) => a.num - b.num)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].num === sorted[i - 1].num) return { error: 'dup-number' }
    if (sorted[i].num !== sorted[i - 1].num + 1) return { error: 'not-consecutive' }
  }
  if (sorted[0].num < 1 || sorted[sorted.length - 1].num > 13) return { error: 'out-of-range' }
  return { ok: true, kind: 'run', value: r.reduce((s, t) => s + t.num, 0) }
}

/** tiles(패에서 낸 것 + 이미 테이블에 있던 것 전부)를 그룹 또는 런으로 검증한다. */
export function validateMeld(tiles, assign = {}) {
  const r = resolveTiles(tiles, assign)
  if (r.some((t) => t.color == null || t.num == null)) return { error: 'need-joker-value' }
  const g = validateGroup(r)
  if (g.ok) return { ...g, tiles: r }
  const run = validateRun(r)
  if (run.ok) return { ...run, tiles: r }
  return { error: r.length < 3 ? 'bad-size' : g.error === 'dup-color' || run.error === 'dup-number' ? 'dup' : 'not-a-meld' }
}

export const tileValue = (t) => (t.joker ? (t.num ?? 0) : t.num)
