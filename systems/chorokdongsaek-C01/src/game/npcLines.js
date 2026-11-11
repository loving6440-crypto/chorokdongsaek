// NPC 대사 고르기.
//  - 평소 대사(when 없음)는 늘 후보다.
//  - 특수 대사: { when: 'low' 같은 조건 이름 } — 그 조건이 맞을 때만 후보가 된다.
//    조건이 처음 맞은 때엔 그 조건의 대사가 반드시 나오고(최초 1회), 그 뒤로는 평소 대사와 섞여 랜덤으로 나온다.
//  - 조건 함수는 CONDITIONS 에 모아 둔다. (체력 기준)

export const CONDITIONS = {
  hpHigh: (p) => p.hp >= 90,
  hpLow: (p) => p.hp <= 30,
  hpCritical: (p) => p.hp < 10,
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/**
 * lines 에서 이번에 할 대사를 고른다. 돌려주는 값: { line, firstOf } — firstOf 는 이번에 '최초 1회'로 보여 준 조건 이름(없으면 null).
 * seen: player.lineSeen (이미 본 조건 { [npcId:cond]: true }). 기록은 호출한 쪽에서 onSeen 으로 한다.
 */
export function pickNpcLine(npcId, lines, player, seen = {}) {
  const eligible = lines.filter((l) => !l.when || CONDITIONS[l.when]?.(player))
  const conds = [...new Set(eligible.filter((l) => l.when).map((l) => l.when))]
  const fresh = conds.find((c) => !seen[`${npcId}:${c}`])
  if (fresh) return { line: pick(eligible.filter((l) => l.when === fresh)), firstOf: fresh }
  return { line: pick(eligible), firstOf: null }
}

export function markLineSeen(player, npcId, cond) {
  const key = `${npcId}:${cond}`
  if (player.lineSeen?.[key]) return player
  return { ...player, lineSeen: { ...(player.lineSeen ?? {}), [key]: true } }
}
