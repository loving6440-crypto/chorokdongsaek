// 시간이 흐르면서 바뀌는 상태(수련 · 수업 대기 · 일일 수업)를 다루는 순수 함수 모음.
// 모두 타임스탬프 기반이라 새로고침해도 이어진다.
import { LESSON_DAILY_ATTEMPTS, LESSON_SPIRIT_REWARD, LESSON_WAIT_MINUTES, COURSE_INFO } from './courseInfo'
import { MP_MAX } from './constants'
import { START_MONEY } from './items'

export const TRAIN_UNIT_MIN = 5
export const TRAIN_MIN = 5
export const TRAIN_MAX = 300
export const REST_MIN = 1
export const REST_MAX = 120
export const REST_UNIT_MIN = 1
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
      spirit: player.spirit + LESSON_SPIRIT_REWARD,
    },
    logs: [`${name} 수업을 마쳤다. 영력 +${LESSON_SPIRIT_REWARD}`],
  }
}

/** 시도 1회를 쓴다. 쓸 수 없으면 null. */
export function spendAttempt(player, courseId, now = Date.now()) {
  const st = lessonOf(player, courseId, now)
  if (st.waitUntil || st.used >= LESSON_DAILY_ATTEMPTS) return null
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
export function sanitizeRestored(player) {
  // 의지력 최대치가 100으로 늘었다: 예전 저장분도 최대치만 올려 준다.
  let p = player.mpMax < MP_MAX ? { ...player, mpMax: MP_MAX } : player
  if (p.money == null) p = { ...p, money: START_MONEY }
  if (!p.inventory) p = { ...p, inventory: {} }
  return p
}

export function pickFortuneStat(player, key, now = Date.now()) {
  const st = lessonOf(player, 'divination-fortune', now)
  if (!st.pendingStat) return null
  return {
    ...setLesson(player, 'divination-fortune', { ...st, pendingStat: false }),
    stats: { ...player.stats, [key]: player.stats[key] + 1 },
  }
}

export function startTraining(player, minutes, now = Date.now()) {
  const m = Math.min(TRAIN_MAX, Math.max(TRAIN_MIN, Math.round(minutes / TRAIN_UNIT_MIN) * TRAIN_UNIT_MIN))
  return { ...player, training: { startedAt: now, minutes: m, reward: trainReward(m, player.stats.control) } }
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
  const tr = p.training
  if (tr) {
    // 수련 보상은 끝까지 마쳐야 한 번에 들어온다. (중간에 나가면 받을 수 없다.)
    const total = tr.reward ?? tr.minutes / TRAIN_UNIT_MIN
    if (now >= tr.startedAt + tr.minutes * 60000) {
      p = { ...p, spirit: p.spirit + total, training: null }
      logs.push(`수련을 마쳤다. (${tr.minutes}분 · 영력 +${total})`)
    }
  } else {
    p = { ...p, spirit: p.spirit + (spiritPerMin(p.stats.control) * dtSec) / 60 }
  }

  // 체력은 영력 자연 회복 속도의 2배로 저절로 찬다. 의지력은 저절로 차지 않는다.
  // 양호실에서 쉬는 동안엔 1분에 1씩 찬다. (누워서 쉬기: 체력 / 선생님과 상담하기: 의지력)
  const naturalHp = 2 * spiritPerMin(p.stats.control) // 분당
  const dtMin = dtSec / 60
  let dHp = naturalHp * dtMin
  let dMp = 0
  const rs = p.resting
  if (rs) {
    const end = rs.startedAt + rs.minutes * 60000
    const from = Math.max(now - dtSec * 1000, rs.startedAt)
    const eff = Math.max(0, Math.min(now, end) - from) / 60000 // 이 구간 중 실제로 쉰 분
    // 누워서 쉬는 분 동안엔 자연 회복 대신 1분에 1씩, 나머지 시간엔 자연 회복.
    if (REST_KINDS[rs.kind].stat === 'hp') dHp = naturalHp * Math.max(0, dtMin - eff) + eff
    else dMp = eff
    if (now >= end) {
      p = { ...p, resting: null }
      logs.push(`${REST_KINDS[rs.kind].label}를 마쳤다. (${rs.minutes}분)`)
    }
  }
  if ((dHp > 0 && p.hp < p.hpMax) || (dMp > 0 && p.mp < p.mpMax)) {
    p = { ...p, hp: Math.min(p.hpMax, p.hp + dHp), mp: Math.min(p.mpMax, p.mp + dMp) }
  }

  // 수업 대기 종료 / 지난 날짜의 찌꺼기 정리
  const today = dayKey(now)
  for (const id of Object.keys(COURSE_INFO)) {
    const st = p.lessons?.[id]
    if (!st) continue
    if (st.waitUntil && now >= st.waitUntil) {
      const r = completeLesson(p, id, st.waitUntil)
      p = r.player
      logs.push(`${courseTitle(id)}: 30분의 대기가 끝났다.`, ...r.logs)
    } else if (st.day !== today && !st.waitUntil && !st.pendingStat) {
      const { [id]: _drop, ...rest } = p.lessons
      p = { ...p, lessons: rest }
    }
  }
  return { player: p, logs }
}

// ── 체육관 전투 보상: 하루에 보상이 나오는 승리는 3번까지, 패배하면 영력을 조금 잃는다 ──
export const GYM_DAILY_REWARDS = 1
export const GYM_LOSS_PENALTY = 2

export function gymToday(player, now = Date.now()) {
  const g = player.gym
  return g && g.day === dayKey(now) ? g : { day: dayKey(now), wins: 0 }
}

export function applyBattleResult(player, win, reward, now = Date.now()) {
  const g = gymToday(player, now)
  if (!win) {
    const lost = Math.min(GYM_LOSS_PENALTY, Math.floor(player.spirit))
    return { player: { ...player, spirit: player.spirit - lost, gym: g }, granted: 0, lost }
  }
  if (g.wins >= GYM_DAILY_REWARDS) return { player: { ...player, gym: g }, granted: 0, lost: 0 }
  return { player: { ...player, spirit: player.spirit + reward, gym: { ...g, wins: g.wins + 1 } }, granted: reward, lost: 0 }
}
