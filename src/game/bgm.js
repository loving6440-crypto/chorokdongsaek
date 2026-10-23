/**
 * 배경음악: 한 곡을 반복 재생한다. 신입생 등록을 마치고 게임 화면에 들어서면 시작한다.
 * 효과음(sfx)과 따로 끄고 켜고, 볼륨도 따로 조절한다. 설정은 브라우저에 저장된다.
 */
const MUTE_KEY = 'chorok-bgm-muted'
const VOL_KEY = 'chorok-bgm-volume'
const DEFAULT_VOLUME = 0.4

const read = (k, d) => {
  try {
    const v = localStorage.getItem(k)
    return v == null ? d : v
  } catch {
    return d
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, String(v))
  } catch {
    /* 저장 불가 환경이면 이번 방문에만 적용 */
  }
}

let muted = read(MUTE_KEY, '0') === '1'
let volume = Math.min(1, Math.max(0, parseFloat(read(VOL_KEY, DEFAULT_VOLUME)) || 0))
let state = { muted, volume }
let audio = null
let wanted = false // 게임 화면에 있는가
const listeners = new Set()

function ensure() {
  if (audio || typeof Audio === 'undefined') return audio
  audio = new Audio('/bgm.mp3')
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = volume
  return audio
}

function retryOnInput() {
  const go = () => {
    window.removeEventListener('pointerdown', go, true)
    window.removeEventListener('keydown', go, true)
    sync()
  }
  window.addEventListener('pointerdown', go, true)
  window.addEventListener('keydown', go, true)
}

function sync() {
  const a = ensure()
  if (!a) return
  a.volume = volume
  if (!wanted || muted || volume <= 0) a.pause()
  else a.play().catch(retryOnInput)
}

const emit = () => {
  state = { muted, volume }
  listeners.forEach((fn) => fn())
}

export const bgm = {
  start() {
    wanted = true
    sync()
  },
  stop() {
    wanted = false
    sync()
  },
  getState: () => state,
  setMuted(next) {
    muted = !!next
    write(MUTE_KEY, muted ? '1' : '0')
    sync()
    emit()
  },
  setVolume(v) {
    volume = Math.min(1, Math.max(0, v))
    write(VOL_KEY, volume)
    sync()
    emit()
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
