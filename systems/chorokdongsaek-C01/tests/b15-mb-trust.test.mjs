import test from 'node:test'
import assert from 'node:assert/strict'
import { clampMbInfo } from '../server/mbTrust.js'

const stored = {
  stats: { insight: 10, aggression: 12, endurance: 8, control: 9, agility: 7, understanding: 6 },
  psychics: ['survival'],
  hp: 40, hpMax: 60, mp: 10, mpMax: 20,
  inventory: { picnic: 1, chewy: 0 },
  equip: { weapon: null, body: null, trinket: null },
}

test('B15 다인 전투: 위조 스탯·미보유 영능력·미보유 아이템·장비 효과는 저장 캐릭터 기준으로 깎인다', () => {
  const forged = {
    id: 'x', name: 'x',
    stats: { insight: 999, aggression: 999, endurance: 999, control: 999, agility: 999, understanding: 999 },
    psychics: ['buff', 'survival', 'seven-stars', 'language-barrier'],
    psychicBring: ['seven-stars', 'survival'],
    bring: { picnic: 3, chewy: 2 },
    fx: 'sword', trinket: 'goblin-mask', special: 'god-tier',
    hp: 99999, hpMax: 99999, mp: 99999, mpMax: 99999,
    baseAggression: 999, curseUntil: 0,
  }
  const out = clampMbInfo(forged, stored)
  assert.deepEqual(out.stats, stored.stats) // 장비·버프가 없으니 실효 스탯 = 저장 스탯
  assert.deepEqual(out.psychics, ['buff', 'survival']) // buff 는 기본 영능력, survival 은 보유
  assert.deepEqual(out.psychicBring, ['survival'])
  assert.deepEqual(out.bring, { picnic: 1 })
  assert.equal(out.fx, null)
  assert.equal(out.trinket, null)
  assert.equal(out.special, null)
  assert.equal(out.hpMax, 60)
  assert.equal(out.hp, 60)
  assert.equal(out.mpMax, 20)
  assert.equal(out.baseAggression, 12)
})

test('B15 다인 전투: 정상 제출은 그대로, 낮은 값은 낮은 대로 유지된다', () => {
  const honest = { id: 'x', name: 'x', stats: { ...stored.stats, insight: 5 }, psychics: ['survival'], hp: 30, hpMax: 60, mp: 5, mpMax: 20, baseAggression: 12 }
  const out = clampMbInfo(honest, stored)
  assert.equal(out.stats.insight, 5)
  assert.equal(out.hp, 30)
  assert.equal(out.mp, 5)
  assert.deepEqual(out.psychics, ['survival'])
})

test('B15 다인 전투: 저장 캐릭터에 걸린 저주는 숨길 수 없고, 저장값이 STAT_MAX 를 넘으면 잘린다', () => {
  const cursed = { ...stored, curseUntil: Date.now() + 3600_000, stats: { ...stored.stats, insight: 500 } }
  const out = clampMbInfo({ id: 'x', name: 'x', stats: { ...stored.stats, insight: 500 }, curseUntil: 0 }, cursed)
  assert.ok(out.curseUntil > Date.now())
  assert.ok(out.stats.insight <= 25) // STAT_MAX 50 → 쇠약 5할
  const admin = clampMbInfo({ id: 'x', name: 'x', stats: { insight: 500 } }, { ...stored, stats: { ...stored.stats, insight: 500 } }, { admin: true })
  assert.equal(admin.stats.insight, 500)
})
