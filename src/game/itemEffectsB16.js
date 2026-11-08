/**
 * v-B.16 — 제작법은 있는데 효과가 비어 있던 완성품 102종에 효과를 붙인다. (제작용 재료는 제외)
 *
 *  ■ 조리실 요리 51종
 *    - 전투 중 먹는 것 17 : 일행용(파티 전원) 6 · 개인용(나에게만) 6 · 건넬 수 있는 것(일행 한 명 또는 나) 5
 *    - 비전투 34 : 개척 중에 먹는 것(#개척) 17 · 평소에 먹는 것(회복 · 일상 버프) 17
 *  ■ 공작소 물건
 *    - 신체 장비 10 · 장신구 10 : 육조 보정(+ 일부는 개척 보정)
 *    - 그 밖의 물건 31 : 전투 중 쓰는 것 16 · 개척 중 쓰는 것(#개척) 15
 *  ■ 만들기 어려울수록(제작 적정 레벨이 높을수록) 효과가 크다. 같은 계열의 상위 호환이 있다.
 *
 * 효과 칸(effect) 해석 위치
 *  - 전투(단독): Game.jsx useItem → hp · mp · revive · boost · battleStat(20분 버프) / 판 상태는 battleItems.js applyItemToBattle
 *  - 전투(다인): mbattle.js useItemCore
 *  - 개척: huntField.js useHuntItem (effect.hunt)
 *  - 일상: Game.jsx useItem (buff · buffs · buffAll · randomBuff · spirit · hpFull · mpFull · cureWeak · hpCost)
 *  - 장비: bonus(육조) → gearBonus / hunt(개척 보정) → huntField.js gearHuntBonus
 */
import { STAT_KEYS } from './constants.js'

export const B16_TAG_HUNT = '#개척'
const LABEL = { insight: '안목', aggression: '호전', endurance: '인내', control: '절제', agility: '신속', comprehension: '이해' }
const statText = (map) => {
  const vals = Object.values(map)
  if (STAT_KEYS.every((k) => map[k] === vals[0]) && Object.keys(map).length === STAT_KEYS.length) return `모든 육조 +${vals[0]}`
  return Object.entries(map).map(([k, v]) => `${LABEL[k] ?? k} +${v}`).join(' · ')
}
const allStats = (n) => Object.fromEntries(STAT_KEYS.map((k) => [k, n]))
const dice = ({ n = 0, sides = 0, plus = 0, pct = 0 }) => [n && sides ? `${n}d${sides}` : '', plus ? `${plus}` : '', pct ? `적 최대 체력의 ${pct}%` : ''].filter(Boolean).join(' + ')

/** 효과 칸 → 화면에 보여 줄 문구(자동). */
export function describeEffect(e = {}, { party = false } = {}) {
  const out = []
  const h = e.hunt
  if (h) {
    if (h.turns) out.push(`개척 행동 턴 +${h.turns}`)
    if (h.odds) out.push(`다음 ${h.odds.attempts}번의 채집·수렵 성공률 +${h.odds.amount}%`)
    if (h.attempts) out.push(`지금 칸(옆 칸 장애물 포함) 대상의 남은 시도 +${h.attempts}`)
    if (h.ward) out.push(`${h.ward}턴 동안 요괴가 다가오지 못하고, 마주쳐도 비켜 간다`)
    if (h.banish) out.push('이 터를 떠도는 요괴를 쫓아낸다(보상 없음)')
    if (h.freeze) out.push(`${h.freeze}턴 동안 동물·영물이 제자리에 멈춘다`)
    if (h.double) out.push(`다음 ${h.double}번의 성공 보상이 2배`)
    if (h.bonus) out.push(`이번 개척 동안 추가 보상 확률 +${h.bonus}%`)
    if (h.stat) out.push(`이번 개척 동안 ${statText(h.stat)}`)
  }
  if (e.partyHp || e.partyMp) out.push(`일행 전원 ${[e.partyHp ? `체력 +${e.partyHp}` : '', e.partyMp ? `의지력 +${e.partyMp}` : ''].filter(Boolean).join(' · ')}`)
  if (e.partyStat) out.push(`일행 전원 그 전투 동안 ${statText(e.partyStat)}`)
  if (e.partyCleanse) out.push('일행 전원의 나쁜 상태(독·저주·속박 등) 해제')
  if (e.partyCharms) out.push(`일행 전원 부적 사용 횟수 +${e.partyCharms}`)
  if (e.giveHp) out.push(`체력 회복: 일행에게 건네면 +${e.giveHp.party}, 자신이 먹으면 +${e.giveHp.self}`)
  if (e.giveMp) out.push(`의지력 회복: 일행에게 건네면 +${e.giveMp.party}, 자신이 먹으면 +${e.giveMp.self}`)
  if (e.giveCleanse) out.push('받는 사람의 나쁜 상태(독·저주·속박 등) 해제')
  if (e.boost) out.push('받는 사람의 다음 행동 피해 2배(1턴)')
  if (e.enemyHit) out.push(`적에게 막을 수 없는 피해 ${dice(e.enemyHit)} (적 체력은 1 아래로 내려가지 않는다 — 마무리는 직접)`)
  if (e.drainSpirit) out.push(`적의 영능력 자원(영력) -${e.drainSpirit}`)
  if (e.reveal) out.push(`적의 앞으로 ${e.reveal}개 행동을 간파`)
  if (e.charms) out.push(`부적 사용 횟수 +${e.charms}`)
  if (e.cleanse) out.push('나의 나쁜 상태(독·저주·속박 등) 해제')
  if (e.battleStat) out.push(`전투 중 ${statText(e.battleStat)} (다인 전투는 그 전투 동안, 단독 전투는 20분)`)
  if (e.revive) out.push('전투불능 시 1회 체력 1로 부활 대기(한 전투에 부활 아이템은 1번)')
  if (e.hpFull) out.push('체력 완전 회복')
  else if (e.hp) out.push(`체력 +${e.hp}`)
  if (e.mpFull) out.push('의지력 완전 회복')
  else if (e.mp) out.push(`의지력 +${e.mp}`)
  if (e.hpCost) out.push(`체력 -${e.hpCost} (1 아래로는 내려가지 않는다)`)
  if (e.buff) out.push(`${e.buff.hours}시간 동안 ${statText({ [e.buff.stat]: e.buff.amount })}`)
  if (e.buffs) out.push(`${e.buffs[0].hours}시간 동안 ${e.buffs.map((b) => statText({ [b.stat]: b.amount })).join(' · ')}`)
  if (e.buffAll) out.push(`${e.buffAll.hours}시간 동안 모든 육조 +${e.buffAll.amount}`)
  if (e.randomBuff) out.push(`${e.randomBuff.hours}시간 동안 무작위 육조 ${e.randomBuff.count}개 +${e.randomBuff.amount}`)
  if (e.cureWeak) out.push('[쇠약] 즉시 회복')
  if (e.spirit) out.push(`영력 +${e.spirit}`)
  const where = h ? '개척 중: ' : e.onlyBattle || party ? '전투 중: ' : ''
  return where + out.join(' / ') + (e.oncePerBattle ? ' (한 전투에 1번)' : '')
}

// ───────── 분류별 빌더 ─────────
// 전투 개인용(나에게만): 턴을 쓰지 않는다(#턴소모無). 판 상태를 바꾸는 것(적 피해·영력·간파·부적·해제)은 전투 중에만.
const BATTLE_STATE = ['enemyHit', 'drainSpirit', 'reveal', 'charms', 'cleanse']
const self = (effect, { once = false } = {}) => {
  const onlyBattle = BATTLE_STATE.some((k) => effect[k]) || !!effect.battleStat || !!effect.revive
  return {
    effect: { ...effect, ...(once ? { oncePerBattle: true } : {}), ...(onlyBattle ? { onlyBattle: true } : {}) },
    battle: true,
    party: false,
    ...(onlyBattle ? { only: 'battle' } : {}),
    oncePerBattle: once,
    tags: ['완성품', '전투 중 사용 가능', '#턴소모無'],
  }
}
// 전투 일행용(파티 전원): 일행 전투에서만, 쓰면 턴이 끝난다.
const party = (effect) => ({ effect: { ...effect, onlyBattle: true }, battle: true, party: true, only: 'battle', tags: ['완성품', '전투 중 사용 가능', '#턴소모有'] })
// 건넬 수 있는 것: 다인 전투에서는 일행 한 명(또는 나)을 고른다. 단독 전투·평소에는 자신이 먹는 쪽 효과.
const give = (effect) => ({ effect, battle: true, party: false, tags: ['완성품', '전투 중 사용 가능', effect.boost && !effect.giveHp && !effect.giveMp && !effect.giveCleanse ? '#턴소모無' : '#턴소모有'] })
// 개척 중에만 쓴다(#개척). 개척 화면의 이동 버튼 아래 아이템 칸에 저절로 들어간다.
const hunt = (h, extra = {}) => ({ effect: { hunt: h, ...extra }, battle: false, party: false, only: 'hunt', tags: ['완성품', B16_TAG_HUNT] })
// 평소에 먹는 것: 전투 밖에서 언제든.
const daily = (effect) => ({ effect, battle: false, party: false, tags: ['완성품'] })
const gear = (bonus, h) => ({ bonus, ...(h ? { hunt: h } : {}) })

const RAW = {
  // ═══════════ 조리실 · 전투 · 일행용 6 ═══════════
  'mushroom-stew': party({ partyHp: 12 }),
  'carp-soup': party({ partyHp: 20 }),
  'king-mushroom-stew': party({ partyHp: 18, partyMp: 8 }),
  'oyster-mushroom-hotpot': daily({ hp: 35, mp: 15 }), // (평소용 — 아래 목록과 함께 센다)
  'flower-rice-cake': party({ partyCleanse: true, partyHp: 10 }), // 붉은 떡: 액막이
  'songi-rice': party({ partyHp: 35, partyMp: 15 }),
  'frost-bingsu': party({ partyHp: 20, partyMp: 30, partyStat: { agility: 3 } }), // 머리가 띵 → 정신이 번쩍

  // ═══════════ 조리실 · 전투 · 개인용(나에게만) 6 ═══════════
  'barley-gaetteok': self({ hp: 12 }),
  'grilled-king-mushroom': self({ hp: 30 }),
  'doraji-jeonggwa': self({ cleanse: true, mp: 8 }),
  'licorice-taffy': self({ mp: 25 }),
  'antler-tonic': self({ battleStat: { aggression: 4, endurance: 2 }, hp: 20 }),
  'wild-ginseng-jeonggwa': self({ revive: true, hp: 50, mp: 30 }),

  // ═══════════ 조리실 · 전투 · 건넬 수 있는 것 5 ═══════════
  'pickled-raspberry': give({ giveHp: { party: 14, self: 6 } }),
  'snakeberry-punch': give({ giveMp: { party: 15, self: 6 } }),
  'pearl-dumpling': give({ giveCleanse: true, giveHp: { party: 20, self: 8 } }),
  'dangwi-tea': give({ giveHp: { party: 25, self: 10 }, giveMp: { party: 15, self: 6 } }),
  'pine-nut-gangjeong': give({ boost: true, giveHp: { party: 30, self: 12 } }),

  // ═══════════ 조리실 · 개척 17 ═══════════
  'grilled-mushroom': hunt({ turns: 2 }),
  'carrot-mushroom-stirfry': hunt({ odds: { amount: 10, attempts: 3 } }),
  'dandelion-tea': hunt({ turns: 3 }), // 졸음이 달아난다
  'clover-salad': hunt({ bonus: 15 }),
  ssukbeomuri: hunt({ ward: 5 }), // 쑥: 잡귀가 싫어한다
  'mugwort-potato-pancake': hunt({ ward: 3 }, { hp: 10 }),
  'stirfried-fern': hunt({ odds: { amount: 12, attempts: 4 } }),
  'greens-sujebi': hunt({ turns: 4 }),
  'loofah-namul': hunt({ attempts: 1 }),
  'acorn-jelly': hunt({ freeze: 3 }), // 도토리 냄새에 짐승이 멈춰 선다
  'arrowroot-tea': hunt({ stat: { endurance: 5, control: 3 } }),
  'grilled-deodeok': hunt({ stat: { insight: 4, comprehension: 4 } }),
  'clover-hwajeon': hunt({ double: 1 }),
  'omija-punch': hunt({ odds: { amount: 20, attempts: 5 }, turns: 2 }),
  'pine-nut-porridge': hunt({ turns: 8 }, { mp: 20 }),
  'golden-toad-pill': hunt({ double: 2, bonus: 25 }),
  'somdari-tea': hunt({ stat: allStats(6), turns: 5 }), // 높은 곳의 공기

  // ═══════════ 조리실 · 평소 17 ═══════════
  'lake-mushroom-soup': daily({ hp: 18, mp: 8 }),
  'cabbage-soup': daily({ hp: 25 }),
  'poison-mushroom-stew': daily({ mp: 35, hpCost: 15 }),
  'herb-salad': daily({ hp: 15, mp: 10 }),
  'grilled-carp': daily({ hp: 15, buff: { stat: 'endurance', amount: 1, hours: 24 } }),
  'chestnut-porridge': daily({ hp: 45 }),
  'sipjeon-tang': daily({ buffAll: { amount: 1, hours: 24 } }),
  'mystery-tonic': daily({ randomBuff: { count: 1, amount: 3, hours: 24 }, hp: 15 }),
  'wild-grape-punch': daily({ mp: 45 }),
  'dragon-palace-soup': daily({ hp: 30, buffs: [{ stat: 'agility', amount: 2, hours: 24 }, { stat: 'endurance', amount: 2, hours: 24 }] }),
  'fortune-pill': daily({ randomBuff: { count: 2, amount: 4, hours: 24 }, spirit: 20 }),
  'elixir-of-youth': daily({ hpFull: true, mpFull: true, cureWeak: true, spirit: 40 }),
  'turtle-shell-tonic': daily({ buffAll: { amount: 3, hours: 48 }, spirit: 60 }),
  'snakeberry-jam': daily({ mp: 25, buff: { stat: 'control', amount: 1, hours: 12 } }),
  bibimbap: daily({ hp: 30, mp: 20 }),
  'flower-pancake': daily({ hp: 20, buff: { stat: 'comprehension', amount: 1, hours: 24 } }),

  // ═══════════ 공작소 · 전투 16 ═══════════
  'pebble-sling': self({ enemyHit: { n: 2, sides: 6 } }, { once: true }),
  'charm-bundle': self({ charms: 1 }, { once: true }),
  'curse-doll': self({ drainSpirit: 3 }, { once: true }),
  'green-charm': self({ cleanse: true, mp: 10 }), // 태우면 마음이 안정된다
  'exorcism-gate': party({ partyCleanse: true }), // 끔찍한 냄새로 잡것을 몰아낸다
  'centipede-ward': self({ enemyHit: { n: 3, sides: 6, plus: 4 } }, { once: true }),
  'jaeaek-charm': self({ drainSpirit: 4, reveal: 2 }, { once: true }), // 비명 소리
  'ink-talisman': self({ charms: 1, mp: 10 }, { once: true }),
  'badger-brush': self({ charms: 2 }, { once: true }),
  'cinnabar-paste': self({ battleStat: { control: 5, insight: 1 } }), // 도장처럼 차분해진다
  'red-fox-charm': self({ battleStat: { agility: 4, insight: 2 } }), // '다른 것'이 되는 기분
  'spirit-disposable': self({ revive: true }),
  'sealing-talisman': self({ drainSpirit: 8, reveal: 1 }, { once: true }),
  'wolf-fang-charm': self({ battleStat: { aggression: 6 }, enemyHit: { n: 2, sides: 10, pct: 3 } }, { once: true }),
  'fortune-talisman': party({ partyStat: allStats(3), partyCharms: 1 }),
  'turtle-oracle': self({ reveal: 5, drainSpirit: 25, charms: 3, cleanse: true }, { once: true }),

  // ═══════════ 공작소 · 개척 15 ═══════════
  'small-altar': hunt({ ward: 4 }),
  'cairn-model': hunt({ turns: 3 }),
  'snakeskin-bookmark': hunt({ freeze: 2 }),
  'mugwort-incense': hunt({ ward: 6 }),
  'moss-pot': hunt({ odds: { amount: 15, attempts: 3 } }),
  'feather-deco': hunt({ bonus: 12 }),
  'yarn-doll': hunt({ freeze: 3 }), // 미끼 인형
  'clover-bookmark': hunt({ double: 1 }),
  'ghostfire-lantern': hunt({ turns: 5 }),
  'jangseung-keyring': hunt({ ward: 8 }),
  'imugi-tag': hunt({ odds: { amount: 25, attempts: 5 } }),
  'jujube-amulet': hunt({ banish: true }),
  'hawk-quill': hunt({ stat: { insight: 6, agility: 6, comprehension: 4 }, turns: 2 }),
  'soul-lantern': hunt({ turns: 10, freeze: 4 }),
  'serpent-chest': hunt({ double: 3, bonus: 15 }),

  // ═══════════ 공작소 · 신체 장비 10 ═══════════
  'straw-raincape': gear({ endurance: 2, control: 1 }, { turns: 2 }),
  'foxfur-coat': gear({ comprehension: 2, agility: 1 }),
  'bat-cape': gear({ agility: 3 }),
  'talisman-robe': gear({ control: 2, comprehension: 2 }),
  'marten-vest': gear({ endurance: 3, agility: 2 }),
  'hawk-cheollik': gear({ insight: 3, aggression: 2 }, { odds: 5 }),
  'bearfur-overcoat': gear({ endurance: 5, aggression: 2 }),
  'frost-hansam': gear({ control: 4, insight: 3 }),
  'weasel-galot': gear({ agility: 5, insight: 3 }, { odds: 8 }),
  'crane-robe': gear({ comprehension: 5, control: 4, endurance: 3 }),

  // ═══════════ 공작소 · 장신구 10 ═══════════
  'clover-crown': gear({ insight: 1 }, { bonus: 5 }),
  'berry-ribbon': gear({ agility: 1, comprehension: 1 }),
  'feather-norigae': gear({ agility: 2 }),
  'deer-tooth-necklace': gear({ aggression: 2 }),
  'crystal-bracelet': gear({ insight: 2, comprehension: 1 }),
  'gogok-norigae': gear({ comprehension: 3, control: 1 }),
  'jujube-hairpin': gear({ control: 3, endurance: 2 }),
  'magpie-hairpiece': gear({ insight: 3, agility: 2 }, { bonus: 10 }),
  'toad-ring': gear({ insight: 3 }, { bonus: 20, odds: 5 }),
  'dragon-hatstring': gear({ agility: 4, aggression: 4, insight: 3 }, { turns: 5 }),
}

/** 장비의 개척 보정 문구 */
export const describeGearHunt = (h) => !h ? '' : '개척: ' + [h.turns ? `행동 턴 +${h.turns}` : '', h.odds ? `채집·수렵 성공률 +${h.odds}%` : '', h.bonus ? `추가 보상 확률 +${h.bonus}%` : ''].filter(Boolean).join(' · ')

/** items.js 가 마지막에 덮어쓰는 칸: effect · effectText · battle · party · only · tags · bonus · hunt */
export const B16_ITEM_EFFECTS = Object.fromEntries(Object.entries(RAW).map(([id, def]) => {
  if (def.bonus) {
    const text = [statText(def.bonus) ? `착용 시 ${statText(def.bonus)}` : '', describeGearHunt(def.hunt)].filter(Boolean).join(' / ')
    return [id, { ...def, effectText: text }]
  }
  return [id, { ...def, effectText: describeEffect(def.effect, { party: def.party }) }]
}))

/** 분류 확인용(테스트 · 문서) */
export const B16_GROUPS = {
  foodBattleParty: ['mushroom-stew', 'carp-soup', 'king-mushroom-stew', 'flower-rice-cake', 'songi-rice', 'frost-bingsu'],
  foodBattleSelf: ['barley-gaetteok', 'grilled-king-mushroom', 'doraji-jeonggwa', 'licorice-taffy', 'antler-tonic', 'wild-ginseng-jeonggwa'],
  foodBattleGive: ['pickled-raspberry', 'snakeberry-punch', 'pearl-dumpling', 'dangwi-tea', 'pine-nut-gangjeong'],
  foodHunt: ['grilled-mushroom', 'carrot-mushroom-stirfry', 'dandelion-tea', 'clover-salad', 'ssukbeomuri', 'mugwort-potato-pancake', 'stirfried-fern', 'greens-sujebi', 'loofah-namul', 'acorn-jelly', 'arrowroot-tea', 'grilled-deodeok', 'clover-hwajeon', 'omija-punch', 'pine-nut-porridge', 'golden-toad-pill', 'somdari-tea'],
  foodDaily: ['oyster-mushroom-hotpot', 'lake-mushroom-soup', 'cabbage-soup', 'poison-mushroom-stew', 'herb-salad', 'grilled-carp', 'chestnut-porridge', 'sipjeon-tang', 'mystery-tonic', 'wild-grape-punch', 'dragon-palace-soup', 'fortune-pill', 'elixir-of-youth', 'turtle-shell-tonic', 'snakeberry-jam', 'bibimbap', 'flower-pancake'],
  workshopBattle: ['pebble-sling', 'charm-bundle', 'curse-doll', 'green-charm', 'exorcism-gate', 'centipede-ward', 'jaeaek-charm', 'ink-talisman', 'badger-brush', 'cinnabar-paste', 'red-fox-charm', 'spirit-disposable', 'sealing-talisman', 'wolf-fang-charm', 'fortune-talisman', 'turtle-oracle'],
  workshopHunt: ['small-altar', 'cairn-model', 'snakeskin-bookmark', 'mugwort-incense', 'moss-pot', 'feather-deco', 'yarn-doll', 'clover-bookmark', 'ghostfire-lantern', 'jangseung-keyring', 'imugi-tag', 'jujube-amulet', 'hawk-quill', 'soul-lantern', 'serpent-chest'],
  body: ['straw-raincape', 'foxfur-coat', 'bat-cape', 'talisman-robe', 'marten-vest', 'hawk-cheollik', 'bearfur-overcoat', 'frost-hansam', 'weasel-galot', 'crane-robe'],
  trinket: ['clover-crown', 'berry-ribbon', 'feather-norigae', 'deer-tooth-necklace', 'crystal-bracelet', 'gogok-norigae', 'jujube-hairpin', 'magpie-hairpiece', 'toad-ring', 'dragon-hatstring'],
}

/** 효과 종류(서로 다른 메커니즘) 목록 — 효과 칸 키 기준 */
export function effectKindsOf(def) {
  const kinds = new Set()
  const e = def.effect ?? {}
  for (const [k, v] of Object.entries(e)) {
    if (['onlyBattle', 'oncePerBattle'].includes(k)) continue
    if (k === 'hunt') for (const hk of Object.keys(v)) kinds.add(`hunt.${hk}`)
    else kinds.add(k)
  }
  if (def.bonus) kinds.add('gear.stat')
  for (const hk of Object.keys(def.hunt ?? {})) kinds.add(`gear.hunt.${hk}`)
  return [...kinds]
}
