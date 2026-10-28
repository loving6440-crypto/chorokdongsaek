import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
// 이 순수 함수 블록은 외부 npm 의존성이 없어도 검증하도록 실제 소스에서 발췌해 실행한다.
const progressSource = readFileSync(new URL('../src/game/progress.js', import.meta.url), 'utf8')
const recovery = progressSource.match(/  if \(!waiting\) \{\n([\s\S]*?)\n  \}\n\n  \/\/ 수업 대기/)
assert.ok(recovery, '자연 회복 코드가 존재해야 한다')
const recover = new Function('p', 'waiting', 'dtSec', 'spiritPerMin', 'SPIRIT_BASELINE_MAX', `if (!waiting) {\n${recovery[1]}\n} return p`)
const makePlayer = () => ({ stats: { control: 10 }, hp: 100, hpMax: 100, spirit: 200 })
const spiritPerMin = () => 0.1

test('회복 최대치에서는 불필요하게 플레이어 객체가 재생성되지 않는다', () => {
  const full = makePlayer()
  const result = recover(full, false, 1, spiritPerMin, 200)
  assert.equal(result, full, '영력과 체력이 가득 찼다면 동일 참조를 유지해야 한다')
})

test('회복량은 화면 갱신 간격과 무관하게 실제 시간으로 계산된다', () => {
  const start = { ...makePlayer(), spirit: 10, hp: 10 }
  const after = recover(start, false, 5, spiritPerMin, 200)
  assert.ok(Math.abs(after.spirit - (10 + 5 * spiritPerMin(10) / 60)) < 1e-9)
  assert.ok(Math.abs(after.hp - (10 + 10 * spiritPerMin(10) / 60)) < 1e-9)
})

test('저장 루프와 초대 전체화면 타이머를 분리했다', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const game = readFileSync(new URL('../src/Game.jsx', import.meta.url), 'utf8')
  const saveCallback = app.slice(app.indexOf('const handleSave = useCallback'), app.indexOf('// 관리자 프로필 전환'))
  assert.ok(!saveCallback.includes('setUser('), '자동 저장 콜백에서 App 상태 변경 금지')
  assert.ok(game.includes('setPlayerState(nextPlayer)'), '자연 회복은 행동 저장 플래그 없이 표시')
  assert.ok(!game.includes('setInviteClock'), '초대 갱신이 Game 최상위에 없어야 한다')
  assert.ok(game.includes('lastSavedAt.current >= 60000'), '자연회복 저장은 60초 간격')
})
