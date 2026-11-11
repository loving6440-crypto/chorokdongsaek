// 오목(五目). 2인, 파티 상태에서만 신청할 수 있다. 판정은 서버가 하고, 여기 로직은 서버·화면이 함께 쓴다.
export const OMOK_SIZE = 15
export const OMOK_WIN_LEN = 5

export const emptyBoard = (size = OMOK_SIZE) => Array(size * size).fill(null)

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

/** 방금 (x,y)에 color(0|1) 돌을 놓았다고 할 때, 그 돌을 지나는 5개 이상의 한 줄이 있으면 그 좌표들을 돌려준다(없으면 null). */
export function winLineAt(board, size, x, y, color) {
  const at = (cx, cy) => (cx >= 0 && cx < size && cy >= 0 && cy < size ? board[cy * size + cx] : undefined)
  for (const [dx, dy] of DIRS) {
    const line = [[x, y]]
    let cx = x + dx, cy = y + dy
    while (at(cx, cy) === color) {
      line.push([cx, cy])
      cx += dx
      cy += dy
    }
    cx = x - dx
    cy = y - dy
    while (at(cx, cy) === color) {
      line.unshift([cx, cy])
      cx -= dx
      cy -= dy
    }
    if (line.length >= OMOK_WIN_LEN) return line
  }
  return null
}

/** (x,y) 에 color 돌을 놓는다. 범위 밖/이미 있는 자리면 error. 놓은 뒤 승리 줄이 있으면 win 에 좌표 배열. */
export function placeStone(board, size, x, y, color) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= size || y < 0 || y >= size) return { error: 'out-of-range' }
  const i = y * size + x
  if (board[i] != null) return { error: 'occupied' }
  const next = board.slice()
  next[i] = color
  const win = winLineAt(next, size, x, y, color)
  return { board: next, win }
}
