import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const tutorial = readFileSync(new URL('../src/components/BattleTutorial2.jsx', import.meta.url), 'utf8')
const combat = readFileSync(new URL('../src/game/battle.js', import.meta.url), 'utf8')

test('#1 기본 전투: 인내 설명이 직접 전투 시작 대사 바로 전에 있다', () => {
  const narration = '인내는 받는 피해에 영향을 줘요. 높을 수록 덜 아프게 맞을 확률이 늘어나요.'
  const combatStart = '여기까지 배웠으면 직접 싸워가면서 해볼까요?'
  const p = tutorial.indexOf(narration)
  const next = tutorial.indexOf(combatStart)
  assert.ok(p > tutorial.indexOf('/** #1 기본 전투 */'))
  assert.ok(next > p)
  assert.ok(tutorial.slice(p, next).includes('note:'))
  assert.match(tutorial.slice(p, next), /발동 확률/)
})

test('인내 수치 안내는 실제 계산식 및 현재 스탯을 포함한다', () => {
  assert.match(tutorial, /인내 피해 감소 발동 확률 = 인내 ÷ 2% \(최대 100%\)/)
  assert.match(tutorial, /1d인내\(1~인내\)/)
  assert.match(tutorial, /최종 피해는 최소 0/)
  assert.match(tutorial, /인내가 0이면 발동하지 않는다/)
  assert.match(tutorial, /현재 인내 \$\{Math\.max\(0, Math\.floor\(stats\.endurance \|\| 0\)\)\}/)
  assert.match(combat, /rng\(\) \* 100 >= Math\.min\(100, e \/ 2\)/)
  assert.match(combat, /const reduced = die\(e, rng\)/)
})
