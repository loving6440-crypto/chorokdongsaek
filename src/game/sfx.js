// 효과음 모듈 — 외부 음원 파일 없이 Web Audio 로 그 자리에서 합성한다.
// (저작권/용량 걱정이 없고, 전체 볼륨은 MASTER 한 곳에서 조절한다. 배경음악은 따로 붙일 예정.)

const MUTE_KEY = 'chorok-sfx-muted'
const VOL_KEY = 'chorok-sfx-volume'
const MASTER = 0.45 // 전체 볼륨. 너무 시끄럽지 않게 낮게 잡았다.

let ctx = null
let master = null
let noiseBuf = null
let muted = readMuted()
let volume = readVolume() // 0~1, 효과음 슬라이더 값
const listeners = new Set()
let state = { muted: readMuted(), volume: readVolume() }
const lastPlayed = new Map()

function readVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY))
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1
  } catch {
    return 1
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

// ───────── 컨텍스트 ─────────

/** 브라우저는 사용자 입력 이후에만 소리를 허용한다. 입력 이벤트마다 불러 두면 된다. */
function unlock() {
  if (muted || typeof window === 'undefined') return
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER * volume
    const lp = ctx.createBiquadFilter() // 날카로운 고음을 깎아 귀가 편하게
    lp.type = 'lowpass'
    lp.frequency.value = 5200
    master.connect(lp)
    lp.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

function ready() {
  if (muted) return null
  unlock()
  return ctx && ctx.state === 'running' ? ctx : null
}

function getNoise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// ───────── 재료: 음(tone) 과 잡음(noise) ─────────

const midi = (n) => 440 * 2 ** ((n - 69) / 12)

/** 한 음. f→f2 로 음높이가 미끄러지고, v 는 최대 음량, d 는 길이(초), t 는 지연(초). */
function tone({ f, f2, t = 0, d = 0.12, type = 'sine', v = 0.15, a = 0.006 }) {
  const c = ready()
  if (!c) return
  const t0 = c.currentTime + t
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t0)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(v, t0 + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  o.connect(g)
  g.connect(master)
  o.start(t0)
  o.stop(t0 + d + 0.03)
}

/** 필터를 거친 잡음 한 번. 타격음·바람·문 소리의 재료. */
function noise({ t = 0, d = 0.1, v = 0.12, type = 'bandpass', f = 1000, f2, q = 1 }) {
  const c = ready()
  if (!c) return
  const t0 = c.currentTime + t
  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  src.loop = true
  const flt = c.createBiquadFilter()
  flt.type = type
  flt.Q.value = q
  flt.frequency.setValueAtTime(f, t0)
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t0 + d)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(0.012, d / 3))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  src.connect(flt)
  flt.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + d + 0.03)
}

/** 맑은 종소리: 기본음 + 비정수배 배음. */
function bell(n, t = 0, v = 0.07, d = 0.7) {
  const f = typeof n === 'number' && n < 200 ? midi(n) : n
  tone({ f, t, d, v, type: 'sine' })
  tone({ f: f * 2.76, t, d: d * 0.45, v: v * 0.35, type: 'sine' })
}

/** 칩튠풍 아르페지오. */
function run(notes, { gap = 0.08, type = 'square', v = 0.06, d = 0.11, t = 0 } = {}) {
  notes.forEach((n, i) => tone({ f: midi(n), t: t + i * gap, d, type, v }))
}

// ───────── 소리 목록 ─────────

const SOUNDS = {
  // 공통 UI
  click: () => tone({ f: 720, f2: 540, d: 0.05, type: 'triangle', v: 0.1 }),
  nav: () => {
    tone({ f: midi(67), d: 0.08, type: 'triangle', v: 0.09 })
    tone({ f: midi(74), t: 0.06, d: 0.1, type: 'triangle', v: 0.09 })
  },

  // 인트로
  doorClose: () => {
    noise({ d: 0.95, v: 0.16, type: 'lowpass', f: 520, f2: 120 })
    tone({ f: 95, f2: 50, d: 0.7, v: 0.22 })
    tone({ f: 70, f2: 34, t: 0.88, d: 0.4, v: 0.3 }) // 맞물리는 쿵
    noise({ t: 0.88, d: 0.25, v: 0.12, type: 'lowpass', f: 300 })
  },
  doorOpen: () => {
    noise({ d: 2.1, v: 0.13, type: 'lowpass', f: 180, f2: 950 })
    tone({ f: 58, f2: 118, d: 1.9, v: 0.13 })
    bell(79, 1.0, 0.045, 1.2)
    bell(83, 1.18, 0.045, 1.2)
    bell(86, 1.36, 0.045, 1.4)
  },
  introNext: () => {
    bell(76, 0, 0.06, 0.6)
    bell(83, 0.07, 0.04, 0.6)
  },
  // 어둠 속 제호가 떠오를 때의 낮고 긴 징 소리
  introGong: () => {
    tone({ f: 56, f2: 52, d: 5, v: 0.2, a: 0.03 })
    tone({ f: 112, d: 3.6, v: 0.09, a: 0.03 })
    tone({ f: 168, d: 2.6, v: 0.045, a: 0.03 })
    noise({ d: 0.5, v: 0.09, type: 'lowpass', f: 420, f2: 90 })
  },
  introEnd: () => [60, 64, 67, 72].forEach((n, i) => bell(n, i * 0.07, 0.05, 1.5)),

  // 2048
  g2048Start: () => run([72, 79], { gap: 0.09, type: 'triangle', v: 0.1, d: 0.16 }),
  g2048Move: () => tone({ f: 330, f2: 300, d: 0.04, type: 'sine', v: 0.06 }),
  g2048Merge: (value = 4) => {
    const step = Math.min(Math.log2(Math.max(value, 2)), 13)
    const n = 60 + step * 1.6
    tone({ f: midi(n), d: 0.15, type: 'triangle', v: 0.12 })
    tone({ f: midi(n + 12), t: 0.03, d: 0.12, type: 'sine', v: 0.05 })
  },
  g2048Win: () => run([72, 76, 79, 84, 88], { gap: 0.11, type: 'triangle', v: 0.1, d: 0.3 }),
  g2048Over: () => run([67, 64, 60, 55], { gap: 0.16, type: 'triangle', v: 0.1, d: 0.3 }),

  // 테트리스
  tetrisStart: () => run([76, 71, 72, 74, 72, 71, 69], { gap: 0.085, v: 0.045, d: 0.1 }),
  tetrisMove: () => tone({ f: 200, d: 0.03, type: 'square', v: 0.04 }),
  tetrisRotate: () => tone({ f: 420, f2: 640, d: 0.05, type: 'square', v: 0.05 }),
  tetrisHold: () => tone({ f: 520, f2: 380, d: 0.09, type: 'triangle', v: 0.09 }),
  tetrisLock: () => {
    noise({ d: 0.06, v: 0.09, type: 'lowpass', f: 900 })
    tone({ f: 130, f2: 90, d: 0.07, type: 'sine', v: 0.12 })
  },
  tetrisHard: () => {
    noise({ d: 0.13, v: 0.14, type: 'lowpass', f: 1400, f2: 300 })
    tone({ f: 220, f2: 55, d: 0.14, type: 'sine', v: 0.2 })
  },
  tetrisLines: (count = 1) => {
    const seq = [[72, 76], [72, 76, 79], [72, 76, 79, 84], [72, 76, 79, 84, 88, 91]][
      Math.min(Math.max(count, 1), 4) - 1
    ]
    run(seq, { gap: 0.065, v: 0.06, d: 0.12 })
    if (count >= 4) bell(96, 0.4, 0.05, 0.9)
  },
  levelUp: () => run([67, 72, 76, 79, 84], { gap: 0.07, type: 'triangle', v: 0.08, d: 0.14, t: 0.18 }),
  tetrisOver: () => {
    run([72, 71, 69, 67, 64, 60, 55], { gap: 0.1, v: 0.055, d: 0.16 })
    noise({ t: 0.7, d: 0.5, v: 0.07, type: 'lowpass', f: 600, f2: 90 })
  },
  pause: () => tone({ f: 440, f2: 330, d: 0.08, type: 'triangle', v: 0.08 }),

  // 주술학 (타자)
  key: () => {
    noise({ d: 0.02, v: 0.035, type: 'highpass', f: 2800 })
    tone({ f: 1100, d: 0.015, type: 'square', v: 0.012 })
  },
  typeStart: () => run([69, 73, 76], { gap: 0.08, type: 'triangle', v: 0.09, d: 0.14 }),
  typeOk: () => {
    bell(84, 0, 0.06, 0.35)
    bell(91, 0.05, 0.04, 0.35)
  },
  typeBad: () => {
    tone({ f: 150, f2: 90, d: 0.4, type: 'sawtooth', v: 0.07 })
    tone({ f: 112, f2: 70, d: 0.4, type: 'square', v: 0.04 })
  },
  typeDone: () => {
    run([72, 76, 79, 84], { gap: 0.1, type: 'triangle', v: 0.1, d: 0.28 })
    bell(96, 0.5, 0.05, 1.0)
  },

  // 퇴마실습 (러너)
  runStart: () => run([60, 64, 67], { gap: 0.07, v: 0.05, d: 0.1 }),
  jump: () => tone({ f: 300, f2: 620, d: 0.13, type: 'square', v: 0.05 }),
  point: () => {
    tone({ f: 988, d: 0.05, type: 'square', v: 0.045 })
    tone({ f: 1318, t: 0.07, d: 0.07, type: 'square', v: 0.045 })
  },
  crash: () => {
    noise({ d: 0.25, v: 0.15, type: 'bandpass', f: 800, f2: 200, q: 0.8 })
    tone({ f: 240, f2: 50, d: 0.4, type: 'sawtooth', v: 0.09 })
  },

  // 민속학 (화투 신경쇠약)
  hwatuStart: () => run([67, 72, 76], { gap: 0.09, type: 'triangle', v: 0.08, d: 0.14 }),
  hwatuFlip: () => {
    noise({ d: 0.05, v: 0.07, type: 'highpass', f: 2200 })
    tone({ f: 760, f2: 520, d: 0.05, type: 'triangle', v: 0.05 })
  },
  hwatuMatch: () => {
    bell(79, 0, 0.07, 0.5)
    bell(84, 0.09, 0.06, 0.6)
  },
  hwatuMiss: () => tone({ f: 190, f2: 130, d: 0.22, type: 'triangle', v: 0.09 }),
  hwatuClear: () => {
    ;[72, 76, 79, 84, 88].forEach((n, i) => bell(n, i * 0.09, 0.07, 0.8))
  },
  hwatuOver: () => run([67, 64, 60, 55], { gap: 0.15, type: 'triangle', v: 0.09, d: 0.28 }),

  // 점복학 (운세)
  fortuneShake: () => {
    for (let i = 0; i < 9; i++) {
      noise({ t: i * 0.13, d: 0.07, v: 0.06, type: 'bandpass', f: 1400 + Math.random() * 1800, q: 3 })
    }
  },
  fortuneGreatGood: () => {
    ;[72, 76, 79, 84, 88].forEach((n, i) => bell(n, i * 0.1, 0.07, 0.9))
    bell(96, 0.6, 0.05, 1.2)
  },
  fortuneGood: () => [72, 76, 79].forEach((n, i) => bell(n, i * 0.12, 0.07, 0.8)),
  fortuneNormal: () => {
    bell(69, 0, 0.07, 0.8)
    bell(74, 0.16, 0.05, 0.8)
  },
  fortuneBad: () => {
    tone({ f: midi(52), f2: midi(48), d: 0.6, type: 'triangle', v: 0.1 })
    tone({ f: midi(55), t: 0.12, f2: midi(50), d: 0.6, type: 'triangle', v: 0.05 })
  },
  fortuneGreatBad: () => {
    tone({ f: 82, f2: 46, d: 1.0, type: 'sawtooth', v: 0.06 })
    noise({ d: 0.9, v: 0.1, type: 'lowpass', f: 500, f2: 80 })
  },

  // 오목·루미큐브·요트 다이스·윷놀이: 내 차례가 시작될 때 짧고 높지 않은 '삐롱' 알림
  myTurn: () => {
    tone({ f: midi(69), f2: midi(74), d: 0.1, type: 'sine', v: 0.09 })
    tone({ f: midi(74), t: 0.08, d: 0.12, type: 'sine', v: 0.07 })
  },

  // 일행(파티) 채팅에서 메시지 끝에 <se.1> 이 붙으면 울리는 짧은 '삐릭' 알림음
  partyPing: () => {
    tone({ f: midi(81), f2: midi(86), d: 0.07, type: 'square', v: 0.07 })
    tone({ f: midi(86), t: 0.06, d: 0.09, type: 'square', v: 0.055 })
  },
}

// 너무 자주 울리면 시끄러운 소리의 최소 간격(ms)
const MIN_GAP = { hwatuFlip: 60, key: 22, tetrisMove: 28, g2048Move: 40, click: 30, point: 150, myTurn: 400, partyPing: 120 }

export const sfx = {
  play(name, arg) {
    if (muted) return
    const fn = SOUNDS[name]
    if (!fn) return
    const now = performance.now()
    const gap = MIN_GAP[name] ?? 0
    if (gap && now - (lastPlayed.get(name) ?? -1e9) < gap) return
    lastPlayed.set(name, now)
    try {
      fn(arg)
    } catch {
      /* 소리가 안 나는 것이 게임이 멈추는 것보다 낫다 */
    }
  },
  unlock,
  isMuted: () => muted,
  getVolume: () => volume,
  setVolume(v) {
    volume = Math.min(1, Math.max(0, v))
    try {
      localStorage.setItem(VOL_KEY, String(volume))
    } catch {
      /* 저장 불가 환경이면 이번 방문에만 적용 */
    }
    if (master) master.gain.value = MASTER * volume
    state = { muted, volume }
    listeners.forEach((fn) => fn())
  },
  getState: () => state,
  setMuted(next) {
    muted = !!next
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* 저장 불가 환경이면 이번 방문에만 적용 */
    }
    if (!muted) unlock()
    state = { muted, volume }
    listeners.forEach((fn) => fn())
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
