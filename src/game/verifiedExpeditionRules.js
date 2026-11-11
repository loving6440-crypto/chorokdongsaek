// B.13: 검증 개척은 기존 캐릭터 스탯과 분리된 테스트 밸런스로 운영한다.
// 브라우저가 스탯을 제출하거나 localStorage에서 바꾸더라도 서버 판정에 영향이 없다.
export const VERIFIED_EXPEDITION_STATS = Object.freeze({ insight: 10, aggression: 10, endurance: 10, control: 10, agility: 10, comprehension: 10 })
export const VERIFIED_EXPEDITION_MAX_ENERGY = 100
export const VERIFIED_EXPEDITION_COST = 10
export const VERIFIED_EXPEDITION_REGEN_MS = 60_000
