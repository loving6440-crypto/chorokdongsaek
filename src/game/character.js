import { START_MONEY } from './items'
import {
  AGE_MAX,
  AGE_MIN,
  GRADES,
  HP_MAX,
  MP_MAX,
  NAME_MAX_LENGTH,
  SPIRIT_START,
  STAT_KEYS,
  STAT_MIN,
  STAT_START_POINTS,
} from './constants'

/** 이름 앞뒤 공백을 정리하고 길이를 제한한다. */
export function cleanName(raw) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX_LENGTH)
}

export function isValidAge(age) {
  return Number.isInteger(age) && age >= AGE_MIN && age <= AGE_MAX
}

/** 학년. 고르지 않았으면(null) 나이로 정한다: 17세 1학년 · 18세 2학년 · 19세 3학년. */
export function gradeOf({ age, grade }) {
  if (GRADES.includes(grade)) return grade
  return Math.min(3, Math.max(1, (age ?? AGE_MIN) - 16))
}

/** 모든 스탯이 최소값인 상태에서 시작하는 "투자량" 객체 (투자량 0 = 스탯 STAT_MIN). */
export function emptyAllocation() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]))
}

export function remainingPoints(allocation) {
  const spent = STAT_KEYS.reduce((sum, key) => sum + allocation[key], 0)
  return STAT_START_POINTS - spent
}

/** 투자량 → 실제 스탯 (기본 STAT_MIN + 투자량). 최대값은 없다. */
export function allocationToStats(allocation) {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, STAT_MIN + allocation[key]]))
}

/**
 * 캐릭터 생성 결과로 플레이어 초기 상태를 만든다.
 * 모든 캐릭터는 영력 중앙값, 체력·의지력 100%로 시작한다.
 */
export function createPlayer({ name, age, grade = null, avatar, stats }) {
  return {
    name,
    age,
    grade,
    avatar,
    stats: { ...stats },
    spirit: SPIRIT_START,
    money: START_MONEY,
    inventory: {},
    createdAt: Date.now(), // 캐릭터를 만든 시각 (업적 '신의 주시' 기준)
    hp: HP_MAX,
    hpMax: HP_MAX,
    mp: MP_MAX,
    mpMax: MP_MAX,
  }
}
