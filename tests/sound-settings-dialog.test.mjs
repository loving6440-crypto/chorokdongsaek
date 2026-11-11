import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/SoundToggle.jsx', import.meta.url), 'utf8')

test('음악 설정은 버튼 아래의 좌표 팝업이 아니라 body 포털 중앙 대화상자로 열린다', () => {
  assert.match(source, /createPortal\(/)
  assert.match(source, /document\.body/)
  assert.match(source, /fixed inset-0/)
  assert.match(source, /items-center justify-center/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.doesNotMatch(source, /getBoundingClientRect\(/)
  assert.doesNotMatch(source, /const POPUP_WIDTH/)
})

test('작은 화면을 벗어나지 않으며 스크롤과 닫기를 지원한다', () => {
  assert.match(source, /max-w-\[320px\]/)
  assert.match(source, /max-h-\[calc\(100dvh-32px\)\]/)
  assert.match(source, /overflow-y-auto/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.target === event\.currentTarget/)
  assert.match(source, /aria-label="음악 설정 닫기"/)
})

test('효과음과 배경음악의 제어, 접근성 및 초점 복귀를 유지한다', () => {
  assert.match(source, /label="효과음" store=\{sfx\}/)
  assert.match(source, /label="배경음악" store=\{bgm\}/)
  assert.match(source, /store\.setVolume\(/)
  assert.match(source, /store\.setMuted\(/)
  assert.match(source, /aria-expanded=\{open\}/)
  assert.match(source, /aria-haspopup="dialog"/)
  assert.match(source, /btnRef\.current\?\.focus\(\)/)
})
