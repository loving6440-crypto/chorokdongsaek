// 2048 규칙 (UI 와 분리한 순수 로직)
export const SIZE = 4
export const WIN_VALUE = 2048

let nextTileId = 1
const newId = () => nextTileId++

/** 한 줄(행/열)의 칸 좌표를 '진행 방향의 벽에 가까운 칸부터' 순서대로 돌려준다. */
function lineCells(i, dir) {
  const idx = [...Array(SIZE).keys()]
  switch (dir) {
    case 'left':
      return idx.map((c) => [i, c])
    case 'right':
      return idx.map((c) => [i, SIZE - 1 - c])
    case 'up':
      return idx.map((r) => [r, i])
    default: // 'down'
      return idx.map((r) => [SIZE - 1 - r, i])
  }
}

export function emptyCells(tiles) {
  const used = new Set(tiles.map((t) => t.r * SIZE + t.c))
  const out = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) if (!used.has(r * SIZE + c)) out.push([r, c])
  }
  return out
}

/** 빈 칸 하나에 2(90%) 또는 4(10%) 를 놓는다. 빈 칸이 없으면 그대로 돌려준다. */
export function spawnTile(tiles, rand = Math.random) {
  const empties = emptyCells(tiles)
  if (empties.length === 0) return tiles
  const [r, c] = empties[Math.floor(rand() * empties.length)]
  const v = rand() < 0.9 ? 2 : 4
  return [...tiles, { id: newId(), r, c, v, isNew: true, isMerged: false }]
}

/** 한 방향으로 밀기. 움직임이 없었다면 moved=false. */
export function slide(tiles, dir) {
  const byPos = new Map(tiles.map((t) => [t.r * SIZE + t.c, t]))
  const out = []
  let gained = 0
  let moved = false

  for (let i = 0; i < SIZE; i++) {
    const cells = lineCells(i, dir)
    const line = cells.map(([r, c]) => byPos.get(r * SIZE + c)).filter(Boolean)
    let k = 0
    for (let j = 0; j < line.length; j++) {
      const t = line[j]
      const nxt = line[j + 1]
      const [r, c] = cells[k]
      if (nxt && nxt.v === t.v) {
        out.push({ id: newId(), r, c, v: t.v * 2, isNew: false, isMerged: true })
        gained += t.v * 2
        moved = true
        j++ // 합쳐진 다음 타일은 소모
      } else {
        if (t.r !== r || t.c !== c) moved = true
        out.push({ ...t, r, c, isNew: false, isMerged: false })
      }
      k++
    }
  }
  return { tiles: out, gained, moved }
}

export function hasMoves(tiles) {
  if (tiles.length < SIZE * SIZE) return true
  return ['left', 'right', 'up', 'down'].some((d) => slide(tiles, d).moved)
}

export function createGame(best = 0, rand = Math.random) {
  let tiles = spawnTile([], rand)
  tiles = spawnTile(tiles, rand)
  return { tiles, score: 0, best, won: false, keepGoing: false, over: false }
}

/** 입력 한 번을 처리한 새 게임 상태. 아무 변화가 없으면 같은 객체를 돌려준다. */
export function step(game, dir, rand = Math.random) {
  if (game.over || (game.won && !game.keepGoing)) return game
  const res = slide(game.tiles, dir)
  if (!res.moved) return game
  const tiles = spawnTile(res.tiles, rand)
  const score = game.score + res.gained
  const won = game.won || tiles.some((t) => t.v >= WIN_VALUE)
  return {
    ...game,
    tiles,
    score,
    best: Math.max(game.best, score),
    won,
    over: !hasMoves(tiles),
  }
}
