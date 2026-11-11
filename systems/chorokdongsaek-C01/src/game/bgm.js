/**
 * 배경음악: 한 곡(또는 관리자가 등록한 유튜브 재생목록)을 반복 재생한다. 신입생 등록을 마치고 게임 화면에 들어서면 시작한다.
 * 효과음(sfx)과 따로 끄고 켜고, 볼륨도 따로 조절한다. 설정은 브라우저에 저장된다.
 *
 * '평소 곡'(main)은 두 가지 방식 중 하나로 흐른다:
 *  - 관리자가 재생목록(유튜브 영상ID들)을 등록해 두었으면: 화면 밖에 숨겨 둔 유튜브 플레이어로 그 목록을 순서대로, 다 돌면 처음부터 반복한다.
 *  - 등록해 둔 게 없으면: 예전처럼 로컬 파일(/bgm.mp3)을 반복 재생한다.
 * '전투 곡'(battle)은 항상 로컬 파일(/bgm-battle.mp3)이다 — 관리자 재생목록과 무관하다.
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
const TRACKS = { main: '/bgm.mp3', battle: '/bgm-battle.mp3' }
const audios = {}
let track = 'main' // 지금 틀어야 하는 곡. 전투에 들어가면 'battle'
let wanted = false // 게임 화면에 있는가
const listeners = new Set()

// ───────── 관리자 유튜브 재생목록 (main 트랙에서만 쓴다) ─────────
let playlist = [] // [{ id: 유튜브 영상ID, title }]
let ytIndex = 0
let ytPlayer = null
let ytLoadedId = null
let ytApiLoading = false

function loadYtApi() {
  if (typeof window === 'undefined') return
  if (window.YT && window.YT.Player) {
    onYtApiReady()
    return
  }
  if (ytApiLoading) return
  ytApiLoading = true
  const prevCb = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    prevCb?.()
    onYtApiReady()
  }
  if (!document.querySelector('script[data-chorok-ytapi]')) {
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.dataset.chorokYtapi = '1'
    document.head.appendChild(s)
  }
}
function onYtApiReady() {
  if (ytPlayer || typeof document === 'undefined') return
  let host = document.getElementById('chorok-ytbgm')
  if (!host) {
    host = document.createElement('div')
    host.id = 'chorok-ytbgm'
    host.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;'
    document.body.appendChild(host)
  }
  ytPlayer = new window.YT.Player(host, {
    height: '1',
    width: '1',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => {
        loadCurrentYtVideo()
        sync()
      },
      onStateChange: (e) => {
        if (playlist.length && e.data === window.YT.PlayerState.ENDED) {
          ytIndex = pickNextYtIndex()
          loadCurrentYtVideo(true)
        }
      },
    },
  })
}
/** 다음에 틀 곡의 자리를 무작위로 고른다. 두 곡 이상이면 방금 곡이 바로 다시 나오지 않게 한다. */
function pickNextYtIndex() {
  if (playlist.length <= 1) return 0
  let next = ytIndex
  while (next === ytIndex) next = Math.floor(Math.random() * playlist.length)
  return next
}
/** 지금 ytIndex 가 가리키는 곡을 불러온다. autoplay 가 true 거나 지금 재생 중이어야 하는 상태면 바로 틀고, 아니면 cue 만 해 둔다. */
function loadCurrentYtVideo(autoplay) {
  if (!ytPlayer || !playlist.length) return
  const v = playlist[ytIndex % playlist.length]
  if (!v) return
  ytLoadedId = v.id
  try {
    if (autoplay || (wanted && !muted && volume > 0 && track === 'main')) ytPlayer.loadVideoById(v.id)
    else ytPlayer.cueVideoById(v.id)
  } catch {
    /* 플레이어가 아직 완전히 준비되지 않았을 수 있다 */
  }
}

function ensure(name) {
  if (audios[name] || typeof Audio === 'undefined') return audios[name]
  const a = new Audio(TRACKS[name])
  a.loop = true
  a.preload = name === 'main' ? 'auto' : 'metadata'
  a.volume = volume
  audios[name] = a
  return a
}

// 브라우저의 자동재생 제한에 걸려 재생이 막혔을 때, 사용자가 처음 뭔가를 누르거나 입력하면 그때 다시 시도한다. (중복 등록 방지)
let retryArmed = false
function retryOnInput() {
  if (retryArmed) return
  retryArmed = true
  const go = () => {
    retryArmed = false
    window.removeEventListener('pointerdown', go, true)
    window.removeEventListener('keydown', go, true)
    sync()
  }
  window.addEventListener('pointerdown', go, true)
  window.addEventListener('keydown', go, true)
}

function sync() {
  const usingYt = playlist.length > 0 && track === 'main'
  if (!usingYt && ytPlayer) {
    try {
      ytPlayer.pauseVideo()
    } catch {
      /* 아직 준비되지 않았을 수 있다 */
    }
  }
  for (const n of Object.keys(audios)) {
    audios[n].volume = volume
    const shouldPlayLocal = n === track && !(n === 'main' && usingYt)
    if (!shouldPlayLocal) audios[n].pause()
  }
  if (usingYt) {
    if (!ytPlayer) {
      loadYtApi()
      return
    }
    try {
      ytPlayer.setVolume(Math.round(volume * 100))
      if (!wanted || muted || volume <= 0) ytPlayer.pauseVideo()
      else {
        if (ytLoadedId !== playlist[ytIndex % playlist.length]?.id) loadCurrentYtVideo()
        ytPlayer.playVideo()
        retryOnInput()
      }
    } catch {
      /* 아직 준비되지 않았을 수 있다 — onReady 에서 다시 sync() 가 불린다 */
    }
    return
  }
  const cur = ensure(track)
  if (!cur) return
  if (!wanted || muted || volume <= 0) cur.pause()
  else cur.play().catch(retryOnInput)
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
  /** 곡을 바꾼다: 'main' 평소 / 'battle' 전투. 전투가 끝나면 평소 곡이 멈췄던 데서 이어진다. */
  setTrack(next) {
    if (!TRACKS[next] || next === track) return
    track = next
    try {
      document.documentElement.dataset.bgm = next
    } catch {
      /* 테스트용 표시 */
    }
    const a = audios[next]
    if (a && next === 'battle') a.currentTime = 0
    sync()
  },
  getTrack: () => track,
  getState: () => state,
  /** 관리자가 등록한 평소 곡 재생목록을 반영한다. list 가 비어 있으면 로컬 mp3 로 되돌아간다. */
  setPlaylist(list) {
    const next = Array.isArray(list) ? list.filter((v) => v && typeof v.id === 'string') : []
    const changed = next.length !== playlist.length || next.some((v, i) => v.id !== playlist[i]?.id)
    playlist = next
    if (!changed) {
      sync()
      return
    }
    ytIndex = 0
    ytLoadedId = null
    if (next.length) {
      if (ytPlayer) loadCurrentYtVideo()
      else loadYtApi()
    }
    sync()
  },
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
