// 테트리스 규칙 (UI 와 분리한 순수 로직)
export const COLS = 10
export const ROWS = 20

export const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
}
export const PIECE_KEYS = Object.keys(SHAPES)

// 결계(오방색) 느낌의 블록 색
export const PIECE_COLORS = {
  I: '#38bdf8',
  O: '#eab308',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#dc2626',
  J: '#3b82f6',
  L: '#f97316',
}

const LINE_SCORES = [0, 100, 300, 500, 800]
const KICKS = [0, -1, 1, -2, 2]

export const rotateCW = (m) => m.map((_, r) => m.map((__, c) => m[m.length - 1 - c][r]))

/** mulberry32: 상태(seed)를 들고 다니는 순수 난수. [값, 다음 seed] */
function rnd(seed) {
  const t = (seed + 0x6d2b79f5) >>> 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t]
}

/** 7종 한 벌(7-bag)을 섞어 큐 뒤에 붙인다. */
function refill(queue, seed) {
  let q = queue
  let s = seed
  while (q.length < 7) {
    const bag = [...PIECE_KEYS]
    for (let i = bag.length - 1; i > 0; i--) {
      const [v, ns] = rnd(s)
      s = ns
      const j = Math.floor(v * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    q = [...q, ...bag]
  }
  return [q, s]
}

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null))

export function newPiece(type) {
  const shape = SHAPES[type].map((row) => [...row])
  return {
    type,
    shape,
    x: Math.floor((COLS - shape.length) / 2),
    y: type === 'I' ? -1 : 0, // I 는 모양 둘째 줄이 채워져 있어 한 칸 위에서 시작
  }
}

export function collides(board, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nx = x + c
      const ny = y + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  }
  return false
}

export function pieceCells(piece) {
  const out = []
  piece.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) out.push([piece.y + r, piece.x + c])
    }),
  )
  return out
}

export function ghostY(board, piece) {
  let y = piece.y
  while (!collides(board, piece.shape, piece.x, y + 1)) y++
  return y
}

export const dropInterval = (level) => Math.max(90, 800 - (level - 1) * 65)

export function initGame(seed = 1) {
  let [queue, s] = refill([], seed)
  const type = queue[0]
  queue = queue.slice(1)
  ;[queue, s] = refill(queue, s)
  return {
    board: emptyBoard(),
    piece: newPiece(type),
    queue,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    seed: s,
    status: 'ready', // ready | playing | paused | over
  }
}

/** 큐에서 다음 조각을 꺼내 현재 조각으로 만든다. 놓을 자리가 없으면 게임 오버. */
function spawn(state, forcedType) {
  let { queue, seed } = state
  let type = forcedType
  if (!type) {
    type = queue[0]
    queue = queue.slice(1)
    ;[queue, seed] = refill(queue, seed)
  }
  const piece = newPiece(type)
  const dead = collides(state.board, piece.shape, piece.x, piece.y)
  return { ...state, queue, seed, piece, status: dead ? 'over' : state.status }
}

function lockPiece(state) {
  const board = state.board.map((row) => [...row])
  for (const [r, c] of pieceCells(state.piece)) {
    if (r < 0) return { ...state, board, status: 'over' } // 천장 위에서 굳으면 종료
    board[r][c] = state.piece.type
  }
  const kept = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - kept.length
  const filled = [
    ...Array.from({ length: cleared }, () => Array(COLS).fill(null)),
    ...kept,
  ]
  const lines = state.lines + cleared
  const level = 1 + Math.floor(lines / 10)
  const score = state.score + LINE_SCORES[cleared] * state.level
  return spawn({ ...state, board: filled, lines, level, score, canHold: true })
}

function tryMove(state, dx, dy) {
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x + dx, piece.y + dy)) return null
  return { ...state, piece: { ...piece, x: piece.x + dx, y: piece.y + dy } }
}

function tryRotate(state, times) {
  const { board, piece } = state
  let shape = piece.shape
  for (let i = 0; i < times; i++) shape = rotateCW(shape)
  for (const k of KICKS) {
    if (!collides(board, shape, piece.x + k, piece.y)) {
      return { ...state, piece: { ...piece, shape, x: piece.x + k } }
    }
  }
  return state
}

export function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return state.status === 'ready' ? { ...state, status: 'playing' } : state
    case 'restart':
      return { ...initGame(action.seed), status: 'playing' }
    case 'pause':
      if (state.status === 'playing') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'playing' }
      return state
    default:
      break
  }
  if (state.status !== 'playing') return state

  switch (action.type) {
    case 'left':
      return tryMove(state, -1, 0) ?? state
    case 'right':
      return tryMove(state, 1, 0) ?? state
    case 'rotate':
      return tryRotate(state, 1)
    case 'rotateCCW':
      return tryRotate(state, 3)
    case 'tick':
      return tryMove(state, 0, 1) ?? lockPiece(state)
    case 'soft': {
      const moved = tryMove(state, 0, 1)
      return moved ? { ...moved, score: moved.score + 1 } : lockPiece(state)
    }
    case 'hard': {
      const y = ghostY(state.board, state.piece)
      const dist = y - state.piece.y
      return lockPiece({
        ...state,
        piece: { ...state.piece, y },
        score: state.score + dist * 2,
      })
    }
    case 'hold': {
      if (!state.canHold) return state
      const current = state.piece.type
      const swapped = state.hold
      const base = { ...state, hold: current, canHold: false }
      return spawn(base, swapped ?? undefined)
    }
    default:
      return state
  }
}
