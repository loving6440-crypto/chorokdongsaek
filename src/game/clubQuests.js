// 동아리 주간 활동(주간 퀘스트). 동아리에 가입하면 한 주(월요일 0시 KST ~ 다음 월요일 0시) 동안 할 수 있는 활동들이고,
// 랭킹과 똑같은 주 경계로 초기화된다. player.weekly 에 이번 주의 실적을 쌓아 두고, checkClubQuests 가 매 틱 확인해 보상을 준다.
//  - 채집 · 동아리별 재료 납품 · 동아리별 적 토벌(14·15번)은 아직 그 시스템이 없어 구현을 생략한다 — 대신 누구나 바로 채운 것으로 쳐서,
//    '동아리 활동 N개 달성' 메타 퀘스트가 막히지 않게 해 둔다.
const KST_MS = 9 * 3600 * 1000
const DAY_MS = 24 * 3600 * 1000

/** 이 시각이 속한 주의 시작(월요일 00:00 KST)의 UTC ms. 서버의 랭킹 주차 계산과 똑같다. */
export const weekStartOf = (now = Date.now()) => {
  const k = now + KST_MS
  const dow = new Date(k).getUTCDay() // 0=일
  const sinceMon = (dow + 6) % 7
  return Math.floor(k / DAY_MS) * DAY_MS - sinceMon * DAY_MS - KST_MS
}

const BLANK_WEEKLY = () => ({
  weekStart: 0,
  craft: 0,
  battleReward: 0,
  lesson: 0,
  nurseRest: 0,
  nurseCounsel: 0,
  trainMs: 0,
  shopBuy: 0,
  newsDays: {},
  exploreVisited: {},
  claimed: {},
})

/** 주가 바뀌었으면(또는 처음이면) player.weekly 를 새로 비운다. */
export function ensureWeekly(player, now = Date.now()) {
  const ws = weekStartOf(now)
  if (player.weekly?.weekStart === ws) return player
  return { ...player, weekly: { ...BLANK_WEEKLY(), weekStart: ws } }
}

/** 숫자 카운터를 하나 늘린다(craft · battleReward · lesson · nurseRest · nurseCounsel · shopBuy · trainMs). */
export function bumpWeekly(player, key, amount = 1, now = Date.now()) {
  const p = ensureWeekly(player, now)
  return { ...p, weekly: { ...p.weekly, [key]: (p.weekly[key] || 0) + amount } }
}

/** 집합형 카운터에 값을 하나 추가한다(newsDays 는 날짜 문자열, exploreVisited 는 장소 id). */
export function markWeeklySet(player, key, value, now = Date.now()) {
  const p = ensureWeekly(player, now)
  if (p.weekly[key]?.[value]) return p
  return { ...p, weekly: { ...p.weekly, [key]: { ...p.weekly[key], [value]: true } } }
}

// 탐사해야 하는 세 장소(본관 · 별관 · 산=뒷산).
export const EXPLORE_SPOTS = ['mainHall', 'annex', 'shrine']
export const TRAIN_HOURS_GOAL = 3

/** 퀘스트 목록. auto === true 인 항목은 그 시스템(채집 · 동아리별 납품 · 토벌)이 아직 없어 누구나 바로 채운 것으로 친다. */
export const CLUB_QUESTS = [
  { id: 'craft5', label: '제작 5회 하기', reward: { money: 10 }, done: (w) => w.craft >= 5 },
  // 채집 시스템이 없어 실제로는 달성 조건을 확인할 수 없다 (사용자 지시: 구현 생략 OK) — 보상 없이 '달성'으로만 쳐서
  // '15개 전부'를 이룰 수 있게 하고, 매 주 시작마다 공짜 돈이 지급되는 일은 막는다.
  { id: 'gather5', label: '채집 5회 하기', reward: null, auto: true, done: () => true },
  { id: 'craft3', label: '제작 3회 하기', reward: { money: 10 }, done: (w) => w.craft >= 3 },
  { id: 'battle10', label: '전투 보상 10번 얻기', reward: { money: 30, spirit: 10 }, done: (w) => w.battleReward >= 10 },
  { id: 'battle21', label: '전투 보상 21번 얻기', reward: { money: 50, spirit: 30 }, done: (w) => w.battleReward >= 21 },
  { id: 'lesson10', label: '수업 10번 완료하기', reward: { money: 20, spirit: 5 }, done: (w) => w.lesson >= 10 },
  { id: 'lesson20', label: '수업 20번 완료하기', reward: { money: 30, spirit: 10 }, done: (w) => w.lesson >= 20 },
  { id: 'lesson35', label: '수업 35번 완료하기', reward: { money: 50, spirit: 30 }, done: (w) => w.lesson >= 35 },
  { id: 'nurse1', label: '양호실에서 휴식·상담 1회씩 진행하기', reward: { money: 5, item: 'nutrient' }, done: (w) => w.nurseRest >= 1 && w.nurseCounsel >= 1 },
  { id: 'train3h', label: '기숙사에서 총합 3시간 이상 수련하기', reward: { spirit: 20 }, done: (w) => w.trainMs >= TRAIN_HOURS_GOAL * 3600 * 1000 },
  { id: 'shop2', label: '매점에서 물건 2번 구매하기', reward: { money: 10 }, done: (w) => w.shopBuy >= 2 },
  { id: 'news3', label: '교내 신문에 3일 이상 사연 투고하기', reward: { money: 10 }, done: (w) => Object.keys(w.newsDays || {}).length >= 3 },
  { id: 'exploreAll', label: '본관·별관·산을 모두 한 번 이상 탐사하기', reward: { money: 10, spirit: 10 }, done: (w) => EXPLORE_SPOTS.every((s) => w.exploreVisited?.[s]) },
  { id: 'deliver', label: '동아리별 재료 납품하기', reward: null, auto: true, done: () => true },
  { id: 'hunt', label: '동아리별 특수한 적 토벌하기', reward: null, auto: true, done: () => true },
]
export const CLUB_META_QUESTS = [
  { id: 'club5', label: '동아리 활동 5개 달성하기', reward: { spirit: 10, money: 10 }, threshold: 5 },
  { id: 'club10', label: '동아리 활동 10개 달성하기', reward: { spirit: 20, money: 20 }, threshold: 10 },
  { id: 'club15', label: '동아리 활동 15개 전부 달성하기', reward: { spirit: 50, money: 50 }, threshold: CLUB_QUESTS.length },
]

export const rewardText = (r) =>
  [r?.spirit ? `영력 +${r.spirit}` : '', r?.money ? `돈 +${r.money}냥` : '', r?.item ? `[${r.item}] 획득` : ''].filter(Boolean).join(' · ')

/** 이번 주 완료한 일반 퀘스트 개수(메타 퀘스트 자신은 세지 않는다). */
export const completedCount = (w) => CLUB_QUESTS.filter((q) => q.done(w)).length

/** 매 틱 호출. 새로 채운 퀘스트(일반 + 메타)가 있으면 보상을 주고 기록한다. */
export function checkClubQuests(player, now = Date.now()) {
  let p = ensureWeekly(player, now)
  const logs = []
  const grant = (id, label, reward) => {
    if (!reward) {
      p = { ...p, weekly: { ...p.weekly, claimed: { ...p.weekly.claimed, [id]: true } } }
      return
    }
    p = {
      ...p,
      spirit: p.spirit + (reward.spirit ?? 0),
      money: p.money + (reward.money ?? 0),
      inventory: reward.item ? { ...p.inventory, [reward.item]: (p.inventory?.[reward.item] || 0) + 1 } : p.inventory,
      weekly: { ...p.weekly, claimed: { ...p.weekly.claimed, [id]: true } },
    }
    logs.push(`동아리 활동: [${label}] 달성! ${rewardText(reward)}`.trim())
  }
  for (const q of CLUB_QUESTS) {
    if (p.weekly.claimed?.[q.id]) continue
    if (q.done(p.weekly)) grant(q.id, q.label, q.reward)
  }
  const n = completedCount(p.weekly)
  for (const q of CLUB_META_QUESTS) {
    if (p.weekly.claimed?.[q.id]) continue
    if (n >= q.threshold) grant(q.id, q.label, q.reward)
  }
  return { player: p, logs }
}
