import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HUNT_SITES } from '../src/game/huntSites.js'
import { enterHuntSite, attemptHunt, moveOnHunt } from '../src/game/huntField.js'
import { player, stats } from './hunt-fixtures.mjs'

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

for (const success of [true, false]) {
  test(`첫 채집 ${success ? '성공' : '실패'} 후 수렵은 계속 active이며 지도 상태가 보존된다`, () => {
    const entered = enterHuntSite(player(), HUNT_SITES['left-trail-1'], 1000, () => 0.99)
    assert.equal(entered.player.huntExpedition.status, 'active')
    const moved = moveOnHunt(entered.player, { x: 1, y: 9 }, 1100)
    assert.equal(moved.player.huntExpedition.status, 'active')
    const result = attemptHunt(moved.player, 'C10', stats(10), 1200, () => success ? 0 : 0.99)
    assert.equal(result.success, success)
    assert.equal(result.player.huntExpedition.status, 'active')
    assert.equal(result.player.huntExpedition.turn, 2)
    assert.deepEqual(result.player.huntExpedition.position, { x: 1, y: 9 })
    assert.equal(result.player.huntExpedition.siteId, 'left-trail-1')
  })
}

test('사용 가능한 행동이 마지막 20회째에 소진됐을 때만 자동 종료한다', () => {
  let p = enterHuntSite(player(), HUNT_SITES['left-trail-1'], 1000, () => 0.99).player
  for (let i = 1; i <= 20; i++) {
    const position = { x: i % 2, y: 9 }
    p = moveOnHunt(p, position, 1000 + i).player
    assert.equal(p.huntExpedition.status, i === 20 ? 'finished' : 'active')
  }
})

test('서버 동기화 재마운트에서 active 수렵일 때 산 탐색 화면을 복원하고 저장한다', () => {
  const game = source('src/Game.jsx')
  assert.match(game, /restored\?\.huntExpedition\?\.status === 'active'/)
  assert.match(game, /activity: locationIdRef\.current === 'gym'/)
  assert.match(game, /prev\.activity !== selectedActivity/)
  assert.match(game, /activityRef\.current === 'hike'/)
})

test('서버 충돌 안내와 수렵 예외 알림으로 원인 식별이 가능하다', () => {
  const app = source('src/App.jsx')
  const game = source('src/Game.jsx')
  const hike = source('src/components/locations/Hike.jsx')
  assert.match(app, /reason === 'conflict'/)
  assert.match(app, /role="alert"/)
  assert.match(game, /console\.error\('\[초록동색\] 수렵 명령 처리 오류:'/)
  assert.match(game, /'attempt' && next\.huntExpedition\?\.status === 'finished'/)
  assert.match(hike, /previousHuntStatus\.current === 'active' && status === 'finished'/)
})
