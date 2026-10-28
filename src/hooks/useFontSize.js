import { useCallback, useEffect, useState } from 'react'

import { FONT_SIZE_STORAGE_KEY, FONT_SIZE_DEFAULT, normalizeFontSize } from './fontSizeConfig'

export { FONT_SIZE_STORAGE_KEY, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP, FONT_SIZE_DEFAULT, normalizeFontSize } from './fontSizeConfig'

function readInitialSize() {
  return normalizeFontSize(document.documentElement.dataset.uiFontSize || FONT_SIZE_DEFAULT)
}

function applyFontSize(size) {
  document.documentElement.dataset.uiFontSize = String(size)
  // 초기 HTML 스크립트에서도 동일한 변수를 사용해 첫 화면 깜빡임을 피한다.
  document.documentElement.style.setProperty('--ui-font-size', `${size}%`)
}

/** 테마/서체와 독립적인 브라우저별 글씨 크기 설정. */
export function useFontSize() {
  const [fontSize, setFontSize] = useState(readInitialSize)

  useEffect(() => { applyFontSize(fontSize) }, [fontSize])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== FONT_SIZE_STORAGE_KEY) return
      const next = normalizeFontSize(event.newValue ?? FONT_SIZE_DEFAULT)
      applyFontSize(next)
      setFontSize(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const selectFontSize = useCallback((value) => {
    const next = normalizeFontSize(value)
    applyFontSize(next)
    setFontSize(next)
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next))
    } catch {
      // 저장소 접근이 막힌 브라우저에서도 현재 탭에는 즉시 적용한다.
    }
  }, [])

  return { fontSize, selectFontSize }
}
