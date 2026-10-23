import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'changnok-theme'

const normalize = (value) => (value === 'light' ? 'light' : 'dark')

// index.html 의 인라인 스크립트가 첫 페인트 전에 data-theme 을 심어 두므로 그 값을 이어받는다.
function readTheme() {
  return normalize(document.documentElement.dataset.theme)
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // 다른 탭에서 테마를 바꾸면 이 탭도 따라간다.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setTheme(normalize(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // 저장소를 쓸 수 없는 환경에서는 이번 세션에만 적용한다.
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
