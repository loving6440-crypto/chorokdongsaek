// 영력·체력 자연 회복 속도와 수련 보상 공식. 의존성이 없어 테스트에서 바로 불러온다. (v79.0.8)
/**
 * 영력 자연 회복 (v79.0.8): 0.1 을 채우는 데 걸리는 초. 기본 120초(= 20분에 1).
 * 절제 10 마다 2.5초씩 빨라진다(예전 5초의 절반). 60초(10분에 1)가 한계 — 예전처럼 기본의 2배 속도까지만.
 */
export const SPIRIT_REGEN_BASE_SEC = 120
export const SPIRIT_REGEN_STEP_SEC = 2.5
export const SPIRIT_REGEN_MIN_SEC = 60
export const spiritIntervalSec = (control) => Math.max(SPIRIT_REGEN_MIN_SEC, SPIRIT_REGEN_BASE_SEC - SPIRIT_REGEN_STEP_SEC * Math.floor((control || 0) / 10))
/** 1분당 영력 자연 회복량 */
export const spiritPerMin = (control) => 6 / spiritIntervalSec(control)
/** 영력 1을 채우는 데 걸리는 분 */
export const spiritMinutesPerPoint = (control) => spiritIntervalSec(control) / 6
/**
 * 체력 자연 회복과 수련 보상은 v79.0.8 이전의 속도를 그대로 쓴다(요청 범위가 영력 자연 회복뿐이라).
 * 예전 기준: 0.1 에 60초, 절제 10 마다 5초 빨라짐, 30초 한계.
 */
const legacyIntervalSec = (control) => Math.max(30, 60 - 5 * Math.floor((control || 0) / 10))
const legacyPerMin = (control) => 6 / legacyIntervalSec(control)
/** 1분당 체력 자연 회복량 (예전 영력 회복의 2배) */
export const hpPerMin = (control) => 2 * legacyPerMin(control)
/** 수련 보상: 예전 자연 회복의 2배. 소수점은 내린다. */
export const trainReward = (minutes, control) => Math.floor(2 * legacyPerMin(control) * minutes + 1e-9)
