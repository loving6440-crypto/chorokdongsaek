// 시간이 흐르면서 바뀌는 상태(수련 · 수업 대기 · 일일 수업)를 다루는 순수 함수 모음.
// 모두 타임스탬프 기반이라 새로고침해도 이어진다.
import { LESSON_SPIRIT_REWARD, LESSON_WAIT_MINUTES, COURSE_INFO } from './courseInfo'
import { MP_MAX, SPIRIT_BASELINE_MAX, STAT_KEYS, STAT_MAX } from './constants'
import { START_MONEY, baseIdOf, equipOf, gearBonus, migrateWeapons, weaponFx } from './items'
import { checkAchievements } from './achievements'
import { finishCraft } from './crafting'
import { ENEMIES } from './battle'
import { bumpWeekly, markWeeklySet, checkClubQuests } from './clubQuests'

export const TRAIN_UNIT_MIN = 5
export const TRAIN_MIN = 5
export const TRAIN_MAX = 300
export const REST_MIN = 1
export const REST_MAX = 120
export const REST_UNIT_MIN = 1
// 기숙사 휴식(취침): 무조건 6시간. 일어나면 체력·의지력이 가득 차고, 영력이 +100 (게이지 최댓값까지만) 오른다.
export const SLEEP_MIN = 360
export const SLEEP_SPIRIT = 100
/** 영력 게이지의 최댓값. 기본 200이고, 영력이 그보다 커지면 100 단위로 늘어난다. */
export const spiritGaugeMax = (spirit) => Math.max(SPIRIT_BASELINE_MAX, Math.ceil(spirit / 100) * 100)
/** 푹 자고 일어났을 때 오르는 영력. +100, 단 게이지 최댓값을 넘기지 않는다. */
export const sleepSpiritGain = (spirit) => Math.max(0, Math.min(SLEEP_SPIRIT, spiritGaugeMax(spirit) - spirit))
export const REST_KINDS = {
  bed: { label: '누워서 쉬기', stat: 'hp' },
  counsel: { label: '선생님과 상담하기', stat: 'mp' },
}

/** 영력 자연 회복: 0.1 을 채우는 데 걸리는 초. 절제 10 마다 5초씩 빨라지고 30초(5분에 1)가 한계. */
export const spiritIntervalSec = (control) => Math.max(30, 60 - 5 * Math.floor(control / 10))
/** 1분당 영력 자연 회복량 */
export const spiritPerMin = (control) => 6 / spiritIntervalSec(control)
/** 수련은 자연 회복의 2배. 소수점은 내린다. */
export const trainReward = (minutes, control) => Math.floor(2 * spiritPerMin(control) * minutes + 1e-9)

export const dayKey = (now = Date.now()) => {
  const d = new Date(now)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const TITLES = {
  'talisman-2048': '부적학',
  'spell-typing': '주술학',
  'ward-tetris': '결계학',
  'folklore-spot': '민속학',
  'divination-fortune': '점복학',
  'exorcism-space': '퇴마실습',
}
export const courseTitle = (id) => TITLES[id] ?? id

/** 오늘 기준의 수업 상태. 날짜가 바뀌었으면 새 상태(단, 진행 중인 대기는 유지). */
export function lessonOf(player, courseId, now = Date.now()) {
  const st = player.lessons?.[courseId]
  const today = dayKey(now)
  if (!st) return { day: today, used: 0, done: false, waitUntil: null, pendingStat: false }
  if (st.day !== today && !st.waitUntil && !st.pendingStat) {
    return { day: today, used: 0, done: false, waitUntil: null, pendingStat: false }
  }
  return st
}

const setLesson = (player, courseId, st) => ({
  ...player,
  lessons: { ...(player.lessons ?? {}), [courseId]: st },
})

/** 수업을 마친 것으로 처리하고 보상을 준다. 하루에 한 번만 받는다. */
export function completeLesson(player, courseId, now = Date.now()) {
  const st = lessonOf(player, courseId, now)
  if (st.done) return { player, logs: [] }
  const name = courseTitle(courseId)
  if (courseId === 'divination-fortune') {
    return {
      player: setLesson(player, courseId, { ...st, done: true, waitUntil: null, pendingStat: true }),
      logs: [`${name}: 운세를 뽑았다. 올릴 스탯을 하나 고를 수 있다.`],
    }
  }
  return {
    player: {
      ...setLesson(player, courseId, { ...st, done: true, waitUntil: null }),
      cleared: { ...(player.cleared ?? {}), [courseId]: player.cleared?.[courseId] ?? now }, // 처음 마친 시각(업적용)
      spirit: player.spirit + LESSON_SPIRIT_REWARD,
    },
    logs: [`${name} 수업을 마쳤다. 영력 +${LESSON_SPIRIT_REWARD}`],
  }
}

/** 시도 1회를 쓴다. 쓸 수 없으면 null. */
export function spendAttempt(player, courseId, now = Date.now()) {
  const st = lessonOf(player, courseId, now)
  if (st.waitUntil) return null // 시도 횟수 제한은 없다. 보상만 하루 한 번(completeLesson)
  return setLesson(player, courseId, { ...st, used: st.used + 1 })
}

export function startWait(player, courseId, now = Date.now()) {
  const st = lessonOf(player, courseId, now)
  if (st.done || st.waitUntil) return null
  return setLesson(player, courseId, { ...st, waitUntil: now + LESSON_WAIT_MINUTES * 60000 })
}

/** 진행 중인 수업 대기를 모두 끊는다. (끊긴 과목 id 목록도 돌려준다.) */
export function cancelWaits(player) {
  const ids = Object.keys(player.lessons ?? {}).filter((id) => player.lessons[id].waitUntil)
  if (!ids.length) return { player, ids }
  const lessons = { ...player.lessons }
  for (const id of ids) lessons[id] = { ...lessons[id], waitUntil: null }
  return { player: { ...player, lessons }, ids }
}

/**
 * 저장해 둔 수련·대기는 그대로 이어 간다. 새로고침하거나 탭을 닫았다 열어도 시각 기준으로 계산되므로,
 * 다시 열면 그 사이 흐른 시간만큼(수련은 5분 단위, 대기는 종료 시각)이 곧바로 반영된다.
 */
export function sanitizeRestored(player, joinedAt, admin = false) {
  // 의지력 최대치가 100으로 늘었다: 예전 저장분도 최대치만 올려 준다.
  let p = !admin && player.mpMax < MP_MAX ? { ...player, mpMax: MP_MAX } : player
  // 전투 교육 도중에 닫았다면 맡아 둔 체력·의지력을 돌려준다.
  if (p.tutorialSnap) {
    const { tutorialSnap: snap, ...rest } = p
    p = { ...rest, hp: Math.min(p.hpMax, snap.hp), mp: Math.min(p.mpMax, snap.mp) }
  }
  if (p.money == null) p = { ...p, money: START_MONEY }
  if (!p.inventory) p = { ...p, inventory: {} }
  // 최초 입학 프로필: 예전 저장분엔 없으니 지금 값을 최초 값으로 삼는다.
  if (!p.profile0) p = { ...p, profile0: { name: p.name, greeting: p.greeting ?? '', age: p.age, grade: p.grade ?? null, avatar: p.avatar } }
  // 캐릭터를 만든 시각(업적 기준). 예전 저장분엔 없으니 계정을 만든 시각으로 대신한다.
  if (!p.createdAt) p = { ...p, createdAt: joinedAt ?? Date.now() }
  // 모든 스탯의 최대치는 50.
  if (!admin && STAT_KEYS.some((k) => p.stats[k] > STAT_MAX)) {
    p = { ...p, stats: Object.fromEntries(STAT_KEYS.map((k) => [k, Math.min(STAT_MAX, p.stats[k])])) }
  }
  return syncCodex(migrateWeapons(p))
}

/** 도감: 한 번이라도 손에 넣은 아이템·만난 NPC 를 기록한다. 바뀐 게 없으면 같은 player 를 돌려준다. */
export function syncCodex(player) {
  const codex = player.codex ?? { items: {}, npcs: {} }
  const have = [...Object.keys(player.inventory ?? {}).filter((id) => player.inventory[id] > 0), ...Object.values(equipOf(player)).filter(Boolean)]
  const fresh = [...new Set(have.map(baseIdOf))].filter((id) => !codex.items?.[id])
  const bari = player.tutorialDone && !codex.npcs?.bari
  if (!fresh.length && !bari && player.codex) return player
  return {
    ...player,
    codex: {
      items: { ...codex.items, ...Object.fromEntries(fresh.map((id) => [id, true])) },
      npcs: { ...codex.npcs, ...(bari ? { bari: true } : {}) },
    },
  }
}

/** 영능력(스킬)을 새로 익힌다. 전투의 '영능력' 탭에 자동으로 들어간다. 이미 있으면 같은 player 를 돌려준다. */
export const WEAK_MS = 24 * 3600 * 1000 // [쇠약] 지속 시간: 리얼타임 24시간
export const isWeak = (player, now = Date.now()) => !!player.weakUntil && now < player.weakUntil
/** [쇠약] 중이면 모든 육조 스탯이 현재 스탯의 5할(내림, 최소 1). 아니면 그대로. */
/** 아이템으로 받은 시간제 보정(예: 쑥 → 인내 +1, 24시간). 만료된 건 무시한다. */
export function tempBonus(player, now = Date.now()) {
  const out = {}
  for (const b of player.buffs ?? []) if (b.until > now) out[b.stat] = (out[b.stat] || 0) + b.amount
  return out
}
export function effectiveStats(player, now = Date.now()) {
  const bonus = { ...gearBonus(player) }
  for (const [k, v] of Object.entries(tempBonus(player, now))) bonus[k] = (bonus[k] || 0) + v
  const hasBonus = Object.keys(bonus).length > 0
  const fx = weaponFx(player)
  if (!isWeak(player, now) && !hasBonus && !fx) return player.stats
  const weak = isWeak(player, now)
  // 쇠약으로 5할이 된 뒤에 장비 보정이 더해진다.
  const out = Object.fromEntries(Object.entries(player.stats).map(([k, v]) => [k, (weak ? Math.max(1, Math.floor(v / 2)) : v) + (bonus[k] || 0)]))
  // 무구의 특수 효과 id. 스탯 목록에는 나타나지 않도록(열거되지 않게) 붙인다.
  if (fx) Object.defineProperty(out, 'fx', { value: fx, enumerable: false })
  return out
}
export const weakLeftText = (player, now = Date.now()) => {
  const m = Math.max(0, Math.ceil(((player.weakUntil || 0) - now) / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

export function acquirePsychic(player, id) {
  if (player.psychics?.includes(id)) return player
  return { ...player, psychics: [...(player.psychics ?? []), id] }
}

export function markNpc(player, id) {
  if (player.codex?.npcs?.[id]) return player
  const codex = player.codex ?? { items: {}, npcs: {} }
  return { ...player, codex: { ...codex, npcs: { ...codex.npcs, [id]: true } } }
}

export function pickFortuneStat(player, key, now = Date.now()) {
  const st = lessonOf(player, 'divination-fortune', now)
  if (!st.pendingStat) return null
  if (player.stats[key] >= STAT_MAX) return null
  return {
    ...setLesson(player, 'divination-fortune', { ...st, pendingStat: false }),
    stats: { ...player.stats, [key]: player.stats[key] + 1 },
  }
}

export function startTraining(player, minutes, now = Date.now()) {
  const m = Math.min(TRAIN_MAX, Math.max(TRAIN_MIN, Math.round(minutes / TRAIN_UNIT_MIN) * TRAIN_UNIT_MIN))
  return { ...player, training: { startedAt: now, minutes: m, reward: trainReward(m, player.stats.control) } }
}

/** 기숙사에서 자기 시작. 6시간 뒤에 한꺼번에 회복된다. (끝까지 자야 한다.) */
export function startSleep(player, now = Date.now()) {
  return { ...player, sleeping: { startedAt: now, minutes: SLEEP_MIN } }
}

export function startRest(player, kind, minutes, now = Date.now()) {
  const m = Math.min(REST_MAX, Math.max(REST_MIN, Math.round(minutes)))
  return { ...player, resting: { kind, startedAt: now, minutes: m } }
}

/**
 * 1초마다(또는 복귀 시) 호출. 수련 중이면 끝났을 때 영력이 한 번에 오르고, 아니면 자연 회복.
 * 수업 대기가 끝났으면 수업을 마친 것으로 처리한다. 바뀐 게 없으면 같은 player 를 돌려준다.
 */
export function tickPlayer(player, now, dtSec) {
  let p = player
  const logs = []
  if (p.weakUntil && now >= p.weakUntil) {
    const { weakUntil: _w, ...rest } = p
    p = rest
    logs.push('[쇠약]이 풀렸다. 몸에 힘이 돌아온다.')
  }
  // 대기(수련·취침·휴식·수업 대기·제작) 중에는 끝날 때까지 어떤 스탯도 들어오지 않는다. 끝나는 순간 한꺼번에 받는다.
  const lessonWaiting = Object.values(p.lessons ?? {}).some((l) => l.waitUntil && now < l.waitUntil)
  const waiting = !!(p.training || p.sleeping || p.resting || lessonWaiting || p.crafting || p.slowFight)

  // 제작: 끝까지 기다려야 완성품이 한꺼번에 나온다. 중간에 나가면(crafting이 끊기면) 재료도 완성품도 없다.
  const cf = p.crafting
  if (cf && now >= cf.startedAt + cf.minutes * 60000) {
    const r = finishCraft(p)
    if (r) {
      p = bumpWeekly(r.player, 'craft', 1, now)
      logs.push(`제작을 마쳤다. ${r.item.name}${r.qty > 1 ? ` ${r.qty}개를` : '을(를)'} 얻었다.`)
    }
  }

  // 퇴마 실습(느린 싸움): 끝까지 기다리면 무조건 승리 판정을 받는다.
  const sf = p.slowFight
  if (sf && now >= sf.startedAt + sf.minutes * 60000) {
    const r = finishSlowFight(p, now)
    p = r.player
    logs.push(...r.logs)
  }

  const tr = p.training
  if (tr) {
    const total = tr.reward ?? tr.minutes / TRAIN_UNIT_MIN
    if (now >= tr.startedAt + tr.minutes * 60000) {
      p = bumpWeekly({ ...p, spirit: p.spirit + total, training: null }, 'trainMs', tr.minutes * 60000, now)
      logs.push(`수련을 마쳤다. (${tr.minutes}분 · 영력 +${total})`)
    }
  }

  // 취침: 6시간을 다 자면 체력·의지력이 가득 차고 영력이 오른다.
  const sl = p.sleeping
  if (sl && now >= sl.startedAt + sl.minutes * 60000) {
    const gain = sleepSpiritGain(p.spirit)
    const wasWeak = !!p.weakUntil
    const { weakUntil: _wk, ...awake } = p
    p = { ...(wasWeak ? awake : p), sleeping: null, hp: p.hpMax, mp: p.mpMax, spirit: p.spirit + gain }
    logs.push(`푹 자고 일어났다. 체력과 의지력이 가득 찼다.${gain ? ` (영력 +${Math.round(gain * 10) / 10})` : ' (영력은 이미 가득 차 있었다)'}${wasWeak ? ' [쇠약]도 함께 회복되었다.' : ''}`)
  }

  // 양호실 휴식: 끝까지 쉬어야 분당 1씩(누워서 쉬기: 체력 / 상담: 의지력) 한꺼번에 들어온다.
  const rs = p.resting
  if (rs && now >= rs.startedAt + rs.minutes * 60000) {
    const k = REST_KINDS[rs.kind]
    p =
      k.stat === 'hp'
        ? { ...p, resting: null, hp: Math.min(p.hpMax, p.hp + rs.minutes) }
        : { ...p, resting: null, mp: Math.min(p.mpMax, p.mp + rs.minutes) }
    p = bumpWeekly(p, rs.kind === 'bed' ? 'nurseRest' : 'nurseCounsel', 1, now)
    logs.push(`${k.label}를 마쳤다. (${rs.minutes}분 · ${k.stat === 'hp' ? '체력' : '의지력'} +${rs.minutes})`)
  }

  // 대기 중이 아닐 때만 자연 회복. 영력은 절제에 따라, 체력은 그 2배 속도. 의지력은 저절로 차지 않는다.
  if (!waiting) {
    p = { ...p, spirit: p.spirit + (spiritPerMin(p.stats.control) * dtSec) / 60 }
    const dHp = (2 * spiritPerMin(p.stats.control) * dtSec) / 60
    if (p.hp < p.hpMax) p = { ...p, hp: Math.min(p.hpMax, p.hp + dHp) }
  }

  // 수업 대기 종료 / 지난 날짜의 찌꺼기 정리
  const today = dayKey(now)
  for (const id of Object.keys(COURSE_INFO)) {
    const st = p.lessons?.[id]
    if (!st) continue
    if (st.waitUntil && now >= st.waitUntil) {
      const r = completeLesson(p, id, st.waitUntil)
      p = bumpWeekly(r.player, 'lesson', 1, now)
      logs.push(`${courseTitle(id)}: 30분의 대기가 끝났다.`, ...r.logs)
    } else if (st.day !== today && !st.waitUntil && !st.pendingStat) {
      const { [id]: _drop, ...rest } = p.lessons
      p = { ...p, lessons: rest }
    }
  }
  // 동아리 주간 활동(새 주로 넘어갔으면 초기화하고, 채운 활동이 있으면 보상)
  const cq = checkClubQuests(p, now)
  p = cq.player
  logs.push(...cq.logs)

  // 도감 · 업적
  p = syncCodex(p)
  const ach = checkAchievements(p, now)
  p = ach.player
  logs.push(...ach.logs)
  return { player: p, logs, unlocked: ach.unlocked }
}

// ── 체육관 전투 보상: 하루에 보상이 나오는 승리는 3번까지, 패배하면 영력을 조금 잃는다 ──
export const GYM_DAILY_REWARDS = 3
export const GYM_LOSS_PENALTY = 2

export function gymToday(player, now = Date.now()) {
  const g = player.gym
  return g && g.day === dayKey(now) ? g : { day: dayKey(now), wins: 0 }
}

/**
 * 전투 승리 보상: 영력과 돈(냥)을 똑같이(상대 영력 × REWARD_MULT) 받는다.
 * 낫을 들고 있으면 둘 다 1.5배(올림)로 늘어난다.
 */
export function applyBattleResult(player, win, reward0, now = Date.now()) {
  const g = gymToday(player, now)
  const reward = weaponFx(player) === 'sickle' ? Math.ceil(reward0 * 1.5) : reward0 // 낫: 보상 1.5배(올림)
  if (!win) {
    const lost = Math.min(GYM_LOSS_PENALTY, Math.floor(player.spirit))
    // 전투불능: [쇠약] 24시간(다시 쓰러지면 그때부터 24시간으로 갱신).
    return { player: { ...player, spirit: player.spirit - lost, gym: g, weakUntil: now + WEAK_MS }, granted: 0, lost }
  }
  if (g.wins >= GYM_DAILY_REWARDS) return { player: { ...player, gym: g }, granted: 0, lost: 0 }
  return {
    player: bumpWeekly({ ...player, spirit: player.spirit + reward, money: player.money + reward, gym: { ...g, wins: g.wins + 1 } }, 'battleReward', 1, now),
    granted: reward,
    lost: 0,
  }
}

// ── 퇴마 실습: 느린 싸움으로 보상 얻기 ──
// 전투 화면에서 직접 싸우는 대신, 상대의 영력×5분을 기다리면 무조건 승리 판정을 받는다(대신 체력·의지력이 영력×2만큼 깎인다).
// 보스 전투는 느린 싸움으로 할 수 없다 — 반드시 직접 싸워야 한다.
export const SLOW_FIGHT_WAIT_PER_SPIRIT = 5
export const SLOW_FIGHT_COST_PER_SPIRIT = 2
export const slowFightMinutes = (enemy) => Math.max(1, Math.round(enemy.spirit * SLOW_FIGHT_WAIT_PER_SPIRIT))

export function startSlowFight(player, enemyId, now = Date.now()) {
  if (player.slowFight) return { error: '이미 느린 싸움을 진행하는 중이다.' }
  const enemy = ENEMIES.find((e) => e.id === enemyId)
  if (!enemy) return { error: '그런 상대가 없다.' }
  if (enemy.boss) return { error: '보스 전투는 느린 싸움으로 할 수 없다. 직접 싸워야 한다.' }
  return { player: { ...player, slowFight: { enemyId, startedAt: now, minutes: slowFightMinutes(enemy) } } }
}

/** 중간에 나가면(확인 후) 보상 없이 취소된다. */
export function cancelSlowFight(player) {
  const { slowFight: _s, ...rest } = player
  return rest
}

/** 대기가 끝나는 순간 호출된다. 체력·의지력을 영력×2만큼 깎고, 무조건 승리 판정으로 applyBattleResult 를 돌린다. */
export function finishSlowFight(player, now = Date.now()) {
  const sf = player.slowFight
  const { slowFight: _s, ...rest } = player
  if (!sf) return { player: rest, logs: [] }
  const enemy = ENEMIES.find((e) => e.id === sf.enemyId)
  if (!enemy) return { player: rest, logs: [] }
  const cost = enemy.spirit * SLOW_FIGHT_COST_PER_SPIRIT
  const curHp = Math.floor(rest.hp)
  const curMp = Math.floor(rest.mp)
  const hp = Math.max(1, curHp - cost)
  const mp = Math.max(0, curMp - cost)
  const r = applyBattleResult({ ...rest, hp, mp }, true, enemy.reward, now)
  const logs = [
    `퇴마 실습(느린 싸움): ${sf.minutes}분을 들여 ${enemy.name}을(를) 확실하게 쓰러뜨렸다. 체력 -${curHp - hp}, 의지력 -${curMp - mp}.${r.granted ? ` 영력 +${r.granted}, 돈 +${r.granted}냥.` : ' (오늘의 보상은 모두 받았다)'}`,
  ]
  return { player: r.player, logs }
}
