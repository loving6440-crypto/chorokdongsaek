/**
 * 秘靈: 초록동색 C.01 원본 규칙 진입점 (소스 보존).
 * 주의: index.html에서는 import하지 않는다. 캐릭터/저장/서버 API 연결은 이후 단계.
 */
export { STAT_KEYS, STAT_META, STAT_MIN, STAT_START_POINTS, HP_MAX, MP_MAX } from './chorokdongsaek-C01/src/game/constants.js';
export * as SoloBattle from './chorokdongsaek-C01/src/game/battle.js';
export * as PartyBattle from './chorokdongsaek-C01/src/game/mbattle.js';
export * as Pioneer from './chorokdongsaek-C01/src/game/huntField.js';
export * as PioneerSites from './chorokdongsaek-C01/src/game/huntSites.js';
export * as VerifiedPioneer from './chorokdongsaek-C01/src/game/verifiedExpeditionRules.js';
export * as StatCalculator from './chorokdongsaek-C01/src/game/statCalc.js';
export * as Equipment from './chorokdongsaek-C01/src/game/items.js';

// v0.3 — 비령 데이터 자료실 연결용 export (메인 화면에는 아직 비연결)
export * as Data from './data/index.mjs';
