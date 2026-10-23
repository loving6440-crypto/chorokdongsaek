import { AVATAR_MAX_FILE_MB, AVATAR_SIZE } from './constants'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = url
  })
}

/**
 * 업로드한 이미지 파일을 가운데 기준 정사각형으로 잘라 AVATAR_SIZE 로 줄인 PNG data URL 로 바꾼다.
 * (큰 원본을 그대로 들고 있지 않도록 하고, 비율이 달라도 찌그러지지 않게 한다.)
 * 실패하면 사용자에게 보여줄 한국어 메시지를 담은 Error 를 던진다.
 */
export async function fileToAvatarDataUrl(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.')
  }
  if (file.size > AVATAR_MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`이미지 크기는 ${AVATAR_MAX_FILE_MB}MB 이하여야 해요.`)
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (!side) throw new Error('decode')

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return canvas.toDataURL('image/png')
  } catch (err) {
    if (err.message && err.message !== 'decode') throw err
    throw new Error('이미지를 읽을 수 없어요. 다른 파일을 골라 주세요.')
  } finally {
    URL.revokeObjectURL(url)
  }
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
