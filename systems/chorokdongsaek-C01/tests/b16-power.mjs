// 테스트 보조: 효과의 '세기'를 대략 하나의 수로 — 제작 난이도(적정 레벨)와 함께 커지는지 본다.
const ev = (h) => !h ? 0 : (h.n || 0) * ((h.sides || 0) + 1) / 2 + (h.plus || 0) + (h.pct || 0) * 6
const statSum = (m) => Object.values(m ?? {}).reduce((a, b) => a + b, 0)
const give = (g) => g ? g.party * 0.7 + g.self * 0.3 : 0
export function powerOf(def) {
  if (def.bonus) return statSum(def.bonus) * 3 + (def.hunt?.turns || 0) * 2 + (def.hunt?.odds || 0) * 0.8 + (def.hunt?.bonus || 0) * 0.3
  const e = def.effect ?? {}
  const h = e.hunt ?? {}
  let p = 0
  p += (e.hp || 0) * 0.5 + (e.mp || 0) * 0.5 + (e.hpFull ? 60 : 0) + (e.mpFull ? 50 : 0) - (e.hpCost || 0) * 0.3
  p += (e.partyHp || 0) * 1.0 + (e.partyMp || 0) * 1.0 + statSum(e.partyStat) * 3 + (e.partyCleanse ? 10 : 0) + (e.partyCharms || 0) * 15
  p += give(e.giveHp) + give(e.giveMp) + (e.giveCleanse ? 6 : 0) + (e.boost ? 12 : 0)
  p += ev(e.enemyHit) + (e.drainSpirit || 0) * 1.5 + (e.reveal || 0) * 3 + (e.charms || 0) * 8 + (e.cleanse ? 6 : 0) + statSum(e.battleStat) * 2.5 + (e.revive ? 30 : 0)
  if (e.buff) p += e.buff.amount * 4 * e.buff.hours / 24
  for (const b of e.buffs ?? []) p += b.amount * 4 * b.hours / 24
  if (e.buffAll) p += e.buffAll.amount * 6 * 4 * e.buffAll.hours / 24
  if (e.randomBuff) p += e.randomBuff.count * e.randomBuff.amount * 4 * e.randomBuff.hours / 24
  p += (e.cureWeak ? 15 : 0) + (e.spirit || 0) * 0.8
  p += (h.turns || 0) * 3 + (h.odds ? h.odds.amount * h.odds.attempts / 6 : 0) + (h.attempts || 0) * 8 + (h.ward || 0) * 2 + (h.banish ? 25 : 0) + (h.freeze || 0) * 3 + (h.double || 0) * 12 + (h.bonus || 0) * 0.5 + statSum(h.stat) * 1.5
  return p
}
/** 순위 상관(스피어만) */
export function spearman(xs, ys) {
  const rank = (a) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; i = j + 1 } return r }
  const rx = rank(xs), ry = rank(ys), n = xs.length, mx = rx.reduce((a, b) => a + b) / n, my = ry.reduce((a, b) => a + b) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2 }
  return num / Math.sqrt(dx * dy)
}
