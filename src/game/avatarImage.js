import { AVATAR_MAX_CHARS, AVATAR_MAX_FILE_MB, AVATAR_SIZE } from './constants'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = url
  })
}

/**
 * 업로드한 이미지 파일을 검증하고 디코드한다. 자르기는 하지 않는다 — 그 결과(img)를 AvatarCropper 에 넘겨
 * 사용자가 직접 자를 영역을 고르게 한다. 실패하면 사용자에게 보여줄 한국어 메시지를 담은 Error 를 던진다.
 * 반환된 url 은 다 쓴 뒤(크롭 완료/취소 시) 반드시 URL.revokeObjectURL 로 해제해야 한다.
 */
export async function loadAvatarImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.')
  }
  if (file.size > AVATAR_MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`이미지 크기는 ${AVATAR_MAX_FILE_MB}MB 이하여야 해요.`)
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    if (!Math.min(img.naturalWidth, img.naturalHeight)) throw new Error('decode')
    return { img, url }
  } catch (err) {
    URL.revokeObjectURL(url)
    if (err.message && err.message !== 'decode') throw err
    throw new Error('이미지를 읽을 수 없어요. 다른 파일을 골라 주세요.')
  }
}

/**
 * v-B.17: 원본 이미지에서 정사각형 영역(sx, sy, size — 원본 픽셀 기준)을 잘라 data URL 로 만든다.
 *  - 자른 영역이 AVATAR_SIZE(512) 이하면 **원본 해상도 그대로**, 넘으면 반씩 나눠 여러 번 줄여(계단 현상 없이) AVATAR_SIZE 로 맞춘다.
 *    (예전에는 256으로 한 번에 줄인 PNG 라 흐려지고, 화면의 픽셀 아트 렌더링 때문에 도트처럼 깨져 보였다)
 *  - 투명한 부분이 있으면 WebP(투명 유지) · 없으면 JPEG 를 높은 화질(0.95)로 저장한다. 서버 상한(AVATAR_MAX_CHARS)을 넘을 때만 화질을 조금씩 낮춘다.
 */
export function cropAvatarDataUrl(img, { sx, sy, size }) {
  const side = Math.max(1, Math.round(Math.min(size, AVATAR_SIZE)))
  // 1) 원본 영역을 그대로 한 장에 옮긴다.
  let src = document.createElement('canvas')
  src.width = src.height = Math.max(1, Math.round(size))
  let ctx = src.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, size, size, 0, 0, src.width, src.height)
  // 2) 목표보다 두 배 넘게 크면 반씩 줄여 간다(한 번에 크게 줄일 때 생기는 거친 계단을 막는다).
  while (src.width / 2 >= side) {
    const half = document.createElement('canvas')
    half.width = half.height = Math.max(side, Math.round(src.width / 2))
    const hctx = half.getContext('2d')
    hctx.imageSmoothingEnabled = true
    hctx.imageSmoothingQuality = 'high'
    hctx.drawImage(src, 0, 0, half.width, half.height)
    src = half
  }
  const out = document.createElement('canvas')
  out.width = out.height = side
  ctx = out.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, side, side)
  const alpha = hasTransparency(ctx, side)
  return encodeWithin(out, alpha)
}

function hasTransparency(ctx, side) {
  try {
    const data = ctx.getImageData(0, 0, side, side).data
    for (let i = 3; i < data.length; i += 16) if (data[i] < 250) return true
  } catch {
    /* 읽을 수 없으면 투명 없음으로 본다 */
  }
  return false
}

/** 상한 안에 들어올 때까지 화질 → 크기 순으로 낮춘다. 대부분은 첫 시도(화질 0.95)에서 끝난다. */
function encodeWithin(canvas, alpha) {
  const encode = (c, q) => {
    if (alpha) {
      const webp = c.toDataURL('image/webp', q)
      return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png') // WebP 를 못 만드는 브라우저는 PNG
    }
    return c.toDataURL('image/jpeg', q)
  }
  let c = canvas
  for (let round = 0; round < 6; round++) {
    for (const q of [0.95, 0.9, 0.85, 0.8]) {
      const url = encode(c, q)
      if (url.length <= AVATAR_MAX_CHARS) return url
    }
    const smaller = document.createElement('canvas')
    smaller.width = smaller.height = Math.max(64, Math.round(c.width * 0.85))
    const sctx = smaller.getContext('2d')
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(c, 0, 0, smaller.width, smaller.height)
    c = smaller
  }
  return encode(c, 0.75)
}

/** 배경색 위에서 읽기 좋은 글자색(어두운 색 / 흰색)을 고른다. */
export function readableTextColor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.4 ? '#14161c' : '#ffffff'
}

/**
 * 사용자가 입력한 #코드를 '#rrggbb' (소문자) 로 정규화한다.
 * '#' 은 있어도 없어도 되고, 3자리(#abc)·6자리(#aabbcc) 를 받는다. 잘못된 값이면 null.
 */
export function normalizeHex(input) {
  const raw = String(input ?? '')
    .trim()
    .replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}
