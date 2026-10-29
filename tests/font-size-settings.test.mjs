import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FONT_SIZE_DEFAULT, FONT_SIZE_MAX, FONT_SIZE_MIN, FONT_SIZE_STEP, normalizeFontSize } from '../src/hooks/fontSizeConfig.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const dialog = read('../src/components/ThemeToggle.jsx')
const hook = read('../src/hooks/useFontSize.js')
const css = read('../src/index.css')
const html = read('../index.html')
const bootstrap = read('../public/theme-bootstrap.js')

test('글씨 크기는 80~130% 5% 단위, 기본 100%다', () => {
  assert.deepEqual([FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP, FONT_SIZE_DEFAULT], [80, 130, 5, 100])
  assert.equal(normalizeFontSize('117'), 115)
  assert.equal(normalizeFontSize(99), 100)
  assert.equal(normalizeFontSize(20), 80)
  assert.equal(normalizeFontSize(250), 130)
  assert.equal(normalizeFontSize('invalid'), 100)
})

test('설정 대화상자에 접근 가능한 크기 슬라이더와 원래 크기 버튼이 있다', () => {
  assert.match(dialog, /글씨 크기 조절/)
  assert.match(dialog, /type="range"/)
  assert.match(dialog, /value=\{fontSize\}/)
  assert.match(dialog, /onChange=\{\(event\) => selectFontSize\(event\.target\.value\)\}/)
  assert.match(dialog, /selectFontSize\(FONT_SIZE_DEFAULT\)/)
  assert.match(dialog, /aria-label="글씨 크기"/)
})

test('폰트 크기 설정은 즉시 적용, 저장, 재접속 사전 복원, 다른 탭 동기화가 가능하다', () => {
  assert.match(hook, /setProperty\('--ui-font-scale', String\(size \/ 100\)\)/)
  assert.match(hook, /localStorage\.setItem\(FONT_SIZE_STORAGE_KEY, String\(next\)\)/)
  assert.match(hook, /addEventListener\('storage'/)
  assert.match(bootstrap, /getItem\('changnok-ui-font-size'\)/)
  assert.match(bootstrap, /style\.setProperty\('--ui-font-scale', String\(fontSize \/ 100\)\)/)
  assert.match(css, /--text-sm: calc\(\.875rem \* var\(--ui-font-scale\)\)/)
  assert.match(css, /size-adjust: 115%/)
})

test('글자 크기 조절은 rem 기반 UI의 폭/간격을 변경하지 않는다', () => {
  assert.doesNotMatch(css, /html\s*\{\s*font-size\s*:/)
  assert.match(css, /--text-xs: calc\(\.75rem \* var\(--ui-font-scale\)\)/)
  assert.match(css, /--text-2xl: calc\(1\.5rem \* var\(--ui-font-scale\)\)/)
  assert.match(css, /\[class~="text-\[11px\]"\] \{ font-size: calc\(11px \* var\(--ui-font-scale\)\); \}/)
  assert.match(css, /body \{ font-size: calc\(1rem \* var\(--ui-font-scale\)\); \}/)
  assert.doesNotMatch(html, /--ui-font-size/)
})
