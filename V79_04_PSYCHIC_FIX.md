# 초록동색 v79.0.4 — 영능력 사용 불가 오류 수정

기준 버전: v79.0.3

## 원인
단독 전투 `src/components/locations/Battle.jsx`의 `usePsychic`에서 `baseAggression`을 참조했지만 Battle의 props에서 해당 변수를 받지 않았다. 그 결과 영능력 사용 시 `ReferenceError: baseAggression is not defined`가 발생할 수 있었다. `Gym` 경로에서는 부모가 이미 이 값을 넘기고 있었지만, 수신이 누락되어 있었다.

## 수정
- Battle 컴포넌트에서 `baseAggression` prop 수신. 미전달 시 현재 스탯의 호전 값으로 대체.
- 개척 조우용 `HuntBattleModal`에서도 플레이어의 기본 호전 값을 전달.
- `psychicTurn` 호출 중 예상치 못한 예외는 콘솔 및 전투 로그에 안내하고 현재 전투 화면은 유지.
- 단독/단체 전투의 사용형 영능력 11종 회귀 테스트 추가. 영력결계는 상시 발동 스킬이므로 사용 버튼이 없는 것이 정상.
- 기존 친구 신청, 텃밭, 개척 묘소 등 v79.0.3 변경 사항은 그대로 유지.

## 검증
- `node --test tests/*.test.mjs`로 기존 테스트와 신규 테스트 실행.
- JSX 화면의 실제 브라우저 동작은 별도 수동 확인이 필요.
