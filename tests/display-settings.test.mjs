import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ui = read('../src/components/ThemeToggle.jsx')
const hook = read('../src/hooks/useTheme.js')
const fontHook = read('../src/hooks/useFont.js')
const css = read('../src/index.css')
const html = read('../index.html')
const app = read('../src/App.jsx')

test('테마 전환 버튼은 직접 반전하지 않고 중앙 설정창을 연다', () => {
  assert.match(ui, /aria-label="화면 설정"/)
  assert.match(ui, /createPortal\(/)
  assert.match(ui, /document\.body/)
  assert.match(ui, /fixed inset-0/)
  assert.match(ui, /aria-modal="true"/)
  assert.match(ui, /onSelect\(id\)/)
  assert.doesNotMatch(ui, /onToggle\(/)
  assert.match(ui, /라이트모드/)
  assert.match(ui, /다크모드/)
  assert.match(hook, /localStorage\.setItem\(STORAGE_KEY, next\)/)
  assert.match(app, /onToggleTheme=\{selectTheme\}/)
})

test('글씨체 다섯 가지를 고를 수 있으며 브라우저 재접속과 탭 전환에도 유지된다', () => {
  for (const id of ['neo', 'stardust', 'galmuri9', 'silver', 'ramche']) {
    assert.match(fontHook, new RegExp(`id: '${id}'`))
    assert.match(css, new RegExp(`data-ui-font='${id}'`))
  }
  assert.match(fontHook, /FONT_STORAGE_KEY = 'changnok-ui-font'/)
  assert.match(fontHook, /setItem\(FONT_STORAGE_KEY, next\)/)
  assert.match(fontHook, /addEventListener\('storage'/)
  assert.match(html, /dataset\.uiFont/)
  assert.match(html, /getItem\('changnok-ui-font'\)/)
  assert.match(ui, /type="radio"/)
  assert.match(ui, /초록동색 가나다 123/)
})

test('V74 고정 글꼴을 대체하여 본문·버튼·입력·Tailwind 계열에 동일한 서체를 적용한다', () => {
  assert.match(css, /--font-sans: var\(--ui-font-family\)/)
  assert.match(css, /--font-serif: var\(--ui-font-family\)/)
  assert.match(css, /font-family: var\(--ui-font-family\) !important/)
  assert.match(css, /html\[data-ui-font\] \.font-mono/)
  assert.match(css, /PF-Stardust-Bold\.ttf/)
  assert.match(css, /PF-Stardust-ExtraBold\.ttf/)
  assert.match(css, /Galmuri9\.woff2/)
  assert.match(css, /galmuri@v2\.40\.4/)
})

test('팝업 닫기·초점 복귀·모바일 스크롤이 가능하다', () => {
  assert.match(ui, /event\.key === 'Escape'/)
  assert.match(ui, /event\.target === event\.currentTarget/)
  assert.match(ui, /max-h-\[calc\(100dvh-32px\)\]/)
  assert.match(ui, /overflow-y-auto/)
  assert.match(ui, /triggerRef\.current\?\.focus\(\)/)
})
