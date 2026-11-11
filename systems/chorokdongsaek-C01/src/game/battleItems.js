// v-B.16 전투 아이템의 '판 상태' 효과 — 단독 전투(battle.js 상태)와 다인 전투(mbattle.js)가 같은 규칙을 쓴다.
//  enemyHit    : 적에게 막을 수 없는 피해 (n d sides + plus + 적 최대 체력의 pct%). 적 체력은 1 아래로 내려가지 않는다(마무리는 직접).
//  drainSpirit : 적의 영능력 자원(espirit) 감소
//  reveal      : 적의 앞으로 N개 행동 간파(known)
//  charms      : 부적 사용 횟수 +N
//  cleanse     : 나쁜 상태(ps · 저주 · 속박) 해제

const die = (n, rng) => 1 + Math.floor(rng() * Math.max(1, Math.floor(n)))

export const BATTLE_STATE_KEYS = ['enemyHit', 'drainSpirit', 'reveal', 'charms', 'cleanse']
/** 이 효과가 전투 판(적·부적·상태)을 바꾸는가 */
export const touchesBattleState = (e = {}) => BATTLE_STATE_KEYS.some((k) => e[k])

/** 적 피해량 굴림 */
export function rollItemHit(hit, enemyMaxHp, rng = Math.random) {
  if (!hit) return 0
  let d = hit.plus || 0
  for (let i = 0; i < (hit.n || 0); i++) d += die(hit.sides || 1, rng)
  if (hit.pct) d += Math.ceil((enemyMaxHp || 0) * hit.pct / 100)
  return Math.max(0, d)
}

/** 나쁜 상태를 모두 걷어 낸 복사본 { ps, curse, bound } */
export const cleansed = () => ({ ps: {}, curse: 0, bound: false })

/**
 * 단독 전투 상태에 아이템 효과를 적용한다. (Battle.jsx 가 소지품에서 쓴 아이템을 받아 부른다)
 * @returns { state, events }
 */
export function applyItemToBattle(state, effect = {}, { name = '아이템', rng = Math.random } = {}) {
  if (!state || state.over) return { state, events: [] }
  const s = { ...state }
  const parts = []
  if (effect.enemyHit) {
    const before = s.ehp
    const d = rollItemHit(effect.enemyHit, s.enemy?.hp, rng)
    s.ehp = Math.max(1, s.ehp - d)
    parts.push(`${s.enemy?.name ?? '적'}에게 피해 ${before - s.ehp}${before - s.ehp < d ? ' (마지막 한 방은 직접!)' : ''}`)
  }
  if (effect.drainSpirit) {
    const before = s.espirit ?? 0
    s.espirit = Math.max(0, before - effect.drainSpirit)
    parts.push(`적의 영력 -${before - s.espirit}`)
  }
  if (effect.reveal) {
    const n = Math.min(effect.reveal, s.queue?.length ?? 0)
    if (n > (s.known || 0)) s.known = n
    parts.push(`적의 행동 ${n}개를 간파했다`)
  }
  if (effect.charms) {
    s.charms = (s.charms || 0) + effect.charms
    parts.push(`부적 +${effect.charms}`)
  }
  if (effect.cleanse) {
    Object.assign(s, cleansed())
    parts.push('나쁜 상태가 모두 걷혔다')
  }
  return { state: s, events: parts.length ? [{ kind: 'info', text: `✦ ${name}! ${parts.join(' · ')}.` }] : [] }
}
