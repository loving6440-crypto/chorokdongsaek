import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('Silver 글꼴만 15% 크게 출력한다', () => {
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((m) => m[1])
  const silver = blocks.filter((block) => /font-family:\s*'Silver'/.test(block))
  assert.equal(silver.length, 1)
  assert.match(silver[0], /size-adjust:\s*115%/)
  assert.match(silver[0], /\/fonts\/Silver\.ttf/)
  assert.ok(blocks.every((block) => block === silver[0] || !/size-adjust:/.test(block)), '다른 서체 크기는 변경하지 않는다')
  assert.match(css, /\[data-ui-font='silver'\]\s*\{\s*--ui-font-family:\s*'Silver'/)
})
