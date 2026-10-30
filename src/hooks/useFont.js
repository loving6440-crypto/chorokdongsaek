import { useCallback, useEffect, useState } from 'react'

export const FONT_STORAGE_KEY = 'changnok-ui-font'
export const UI_FONTS = [
  { id: 'neo', label: 'NEO둥근모', detail: '기본', family: 'NeoDunggeunmo' },
  { id: 'stardust', label: 'PF스타더스트', detail: '일반 · 굵게 · 아주 굵게', family: 'PF Stardust' },
  { id: 'galmuri9', label: '갈무리9', detail: 'v2.40.4', family: 'Galmuri9' },
  { id: 'silver', label: 'Silver', detail: '', family: 'Silver' },
  { id: 'kopub-dotum', label: 'KoPub 돋움', detail: '웹폰트', family: 'KoPub Dotum' },
  { id: 'kopub-batang', label: 'KoPub 바탕', detail: '웹폰트', family: 'KoPub Batang' },
  { id: 'ramche', label: '램체', detail: '', family: 'Ramche' },
]
const VALID = new Set(UI_FONTS.map((font) => font.id))
const normalize = (id) => VALID.has(id) ? id : 'neo'

function initialFont() {
  return normalize(document.documentElement.dataset.uiFont)
}

/** 글꼴은 계정 게임저장이 아니라 이 브라우저의 표시 설정으로 관리한다. */
export function useFont() {
  const [font, setFont] = useState(initialFont)

  useEffect(() => {
    document.documentElement.dataset.uiFont = font
  }, [font])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === FONT_STORAGE_KEY) setFont(normalize(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const selectFont = useCallback((id) => {
    const next = normalize(id)
    // 적용은 즉시, 저장은 성공하는 환경에서만 영속화.
    document.documentElement.dataset.uiFont = next
    setFont(next)
    try {
      localStorage.setItem(FONT_STORAGE_KEY, next)
    } catch {
      // 일부 브라우저의 비공개 모드 등에서는 이번 세션에만 유지한다.
    }
  }, [])

  return { font, selectFont }
}
