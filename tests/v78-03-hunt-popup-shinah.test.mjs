import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SHINAH, pickShinahLine, shinahGiftLine } from '../src/game/armory.js'
import { HUNT_SITES } from '../src/game/huntSites.js'
import { enterHuntSite, moveOnHunt, leaveHuntSite } from '../src/game/huntField.js'
import { player } from './hunt-fixtures.mjs'

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('신아 기본 대사는 요청된 7개가 무작위로 선택되며 양 끝 인덱스를 포함한다', () => {
  assert.equal(SHINAH.lines.length, 7)
  assert.equal(pickShinahLine(() => 0), SHINAH.lines[0].text)
  assert.equal(pickShinahLine(() => 0.999999), SHINAH.lines[6].text)
  assert.equal(new Set(SHINAH.lines.map(x => x.text)).size, 7)
  assert.match(SHINAH.lines[0].text, /그거면 된 거 아니냐/)
  assert.match(SHINAH.lines[6].text, /단애/)
})

test('신아 선물 반응은 호감도 1, 3, 5에 순차 해금되어 가장 높은 단계가 나온다', () => {
  assert.equal(shinahGiftLine(0), null)
  for (const [level, index] of [[1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [10, 2]]) {
    assert.equal(shinahGiftLine(level), SHINAH.giftLines[index].text)
  }
  assert.match(shinahGiftLine(1), /잘 먹을게/)
  assert.match(shinahGiftLine(3), /무료로 무기 봐줄 일 없으니까/)
  assert.match(shinahGiftLine(5), /오늘도 고맙다/)
})

test('무구보관소에 랜덤 대사, 재대화, NPC 선물 이벤트가 실제 연결되어 있다', () => {
  const armory = source('src/components/locations/Armory.jsx')
  const hike = source('src/components/locations/Hike.jsx')
  const gym = source('src/components/locations/Gym.jsx')
  const gift = source('src/components/NpcGift.jsx')
  assert.match(armory, /useState\(\(\) => pickShinahLine\(\)\)/)
  assert.match(armory, /data-shinah-talk/)
  assert.match(armory, /NpcGift npcId=\{SHINAH\.id\}/)
  assert.match(armory, /onGift=\{giftReaction\}/)
  assert.match(gift, /onGift\?\.\(result\)/)
  assert.match(hike, /Armory player=\{player\}[^\n]*onGiveNpc=\{onGiveNpc\}/)
  assert.match(gym, /onGiveNpc=\{rest\.onGiveNpc\}/)
})

test('행동 횟수 소진 시 수렵은 종료되나 확인 팝업으로 명시 안내하고 확인 시 닫는다', () => {
  const hike = source('src/components/locations/Hike.jsx')
  assert.match(hike, /previousHuntStatus\.current === 'active' && status === 'finished'/)
  assert.match(hike, /session\?\.turn >= session\?\.maxTurns/)
  assert.match(hike, /setTurnExhausted\(true\)/)
  assert.match(hike, /role="alertdialog" aria-modal="true"/)
  assert.match(hike, /행동 가능한 턴을 소진했습니다\. 채집을 종료합니다\./)
  assert.match(hike, /data-hunt-end-confirm/)
  assert.match(hike, /onClick=\{acknowledgeTurnExhausted\}/)
  assert.match(hike, /const acknowledgeTurnExhausted = \(\) => \{[\s\S]*?setTurnExhausted\(false\)[\s\S]*?setHuntOn\(false\)/)
  const site = HUNT_SITES['left-trail-1']
  let session = enterHuntSite(player(), site, 1000, () => 0.99).player
  for (let i = 0; i < site.maxTurns; i++) {
    session = moveOnHunt(session, { x: i % 2 ? 0 : 1, y: 9 }, 1001 + i).player
  }
  assert.equal(session.huntExpedition.status, 'finished')
  assert.equal(session.huntExpedition.turn, site.maxTurns)
})

test('조기 귀환은 턴 소진 팝업과 구분되는 종료 상태다', () => {
  const entered = enterHuntSite(player(), HUNT_SITES['left-trail-1'], 1000, () => 0.99).player
  const left = leaveHuntSite(entered, 1001).player
  assert.equal(left.huntExpedition.status, 'finished')
  assert.ok(left.huntExpedition.turn < left.huntExpedition.maxTurns)
})
