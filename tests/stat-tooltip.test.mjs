import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tooltipPosition } from '../src/components/statTooltipPosition.mjs'

const base = { width: 240, height: 160, viewportWidth: 860, viewportHeight: 600 }

test('육조 스탯은 공간이 충분하면 마우스 바로 위에 나타난다', () => {
  const { left, top } = tooltipPosition({ ...base, x: 80, y: 450, above: true })
  assert.equal(left, 92)
  assert.equal(top, 278)
})

test('상단에 공간이 없으면 툴팁을 아래로 옮긴다', () => {
  const { top } = tooltipPosition({ ...base, x: 80, y: 30, above: true })
  assert.equal(top, 42)
})

test('마우스가 오른쪽 가장자리에 있으면 툴팁은 왼쪽에 표시된다', () => {
  const { left } = tooltipPosition({ ...base, x: 840, y: 400, above: true })
  assert.equal(left, 588)
})

test('마우스가 하단에 있으면 기본 툴팁은 위로 뒤집힌다', () => {
  const { top } = tooltipPosition({ ...base, x: 240, y: 585, above: false })
  assert.equal(top, 413)
})

test('작은 화면에서도 좌표는 뷰포트 밖으로 벗어나지 않는다', () => {
  const pos = tooltipPosition({ x: 10, y: 5, width: 320, height: 400, viewportWidth: 280, viewportHeight: 220, above: true })
  assert.deepEqual(pos, { left: 8, top: 8 })
})

test('툴팁은 body 포털을 사용하고 마우스 위치 변경을 추적한다', () => {
  const component = readFileSync(new URL('../src/components/StatTooltip.jsx', import.meta.url), 'utf8')
  assert.match(component, /createPortal\(/)
  assert.match(component, /document\.body/)
  assert.match(component, /onMouseMove=\{showAtPointer\}/)
  assert.doesNotMatch(component, /bottom:\s*window\.innerHeight/)
})

// 실제 게임 CSS는 .ink-panel { position: relative }를 지정한다.
// 포털 툴팁에 인라인 fixed 지정이 없으면 화면 밖 -9999px에 남는 회귀 방지.
test('포털 스탯 설명창은 ink-panel 스타일보다 우선하는 fixed 위치를 사용한다', () => {
  const component = readFileSync(new URL('../src/components/StatTooltip.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /\.ink-panel\s*\{\s*position:\s*relative;/)
  assert.match(component, /style=\{\{\s*position:\s*'fixed',\s*left:\s*-9999/)
})
