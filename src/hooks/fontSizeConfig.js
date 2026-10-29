export const FONT_SIZE_STORAGE_KEY = 'changnok-ui-font-size'
export const FONT_SIZE_MIN = 80
export const FONT_SIZE_MAX = 130
export const FONT_SIZE_STEP = 5
export const FONT_SIZE_DEFAULT = 100

/** 저장소/입력값을 허용 범위 내 5% 단위로 정규화한다. */
export function normalizeFontSize(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return FONT_SIZE_DEFAULT
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX,
    Math.round(number / FONT_SIZE_STEP) * FONT_SIZE_STEP))
}

