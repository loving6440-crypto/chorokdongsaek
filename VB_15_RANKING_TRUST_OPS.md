# 초록동색 v-B.15 — 랭킹 서버 검증 · 다인 전투 검증 · 저장 구조 분리 · 운영 보강

> 2026-11-08. B.14(80.0.14)를 기반으로 한 패치(80.0.15). B.08 심층 감사 보고서에서 **아직 남아 있던 항목**을 이어서 처리했다.
> 관리자 로그인 방식(로고 7회 클릭 → 관리자 키)과 신규 가입 아이디·비밀번호 규칙은 **바꾸지 않았다.**
> 검증 경제 기본값 `CHOROK_ENABLE_VERIFIED_ECONOMY=0`, 기존 계정·장터·사물함 데이터 보존 원칙도 그대로다.

## 한눈에 보기

| B.08 항목 | B.14까지 | B.15 |
|---|---|---|
| P0-3 / P0-D 랭킹 조작 | 신규 등록 503(중단) | **서버 세션 + 재현 검증으로 재개** |
| P1-4 / P1-D 다인 전투 스탯 신뢰 | 형식 검사만 | **서버 저장 캐릭터 기준 상한 적용** |
| P1-7 / P2-A 공용 기록 통짜 저장 | 최대 15초 지연 + 직렬화 | **영역별 행으로 분리, 바뀐 영역만 저장** |
| P1-5 / P1-E DB TLS 검증 끔 | 그대로 | **CA 인증서 설정 시 검증 켬(기본은 호환 + 경고)** |
| P1-6 SSE 자원 남용 | 느린 수신자 차단 | **IP당 · 전체 접속 상한, 티켓 발급 속도 제한** |
| 운영 메모: 헬스체크마다 DB 조회 | 매번 `select 1` | **1분 캐시** |
| 운영 메모: 치명 예외 후 계속 구동 | 로그만 | **저장 시도 후 종료 → Render 재기동** |
| P2-1 로그인마다 계정·사진 재저장 | 매번 `put` | **바뀐 것이 있을 때만 저장** |
| B.11 잔여: 멱등 기록 무한 누적 | 정리 없음 | **30일 지난 기록 6시간마다 정리** |
| P2-C 수급 불가 제작법 | "얻을 수 없는 재료" 표시 | **어떤 재료가 준비 중인지 이름 표시** |

## 1. 랭킹 서버 검증 (P0-D)

**원칙:** 브라우저가 보낸 점수는 참고값일 뿐이다. 서버가 직접 계산한 점수만 랭킹에 오른다.

1. 판을 시작할 때 `POST /api/ranking/session {id, course}` → 서버가 `sid`와 난수 씨앗 `seed`를 정하고 시작 시각을 잰다. (Bearer 인증 + 본인 ID 일치, 계정당 하루 120판·동시 6판 상한, 3시간 유효, 메모리 보관)
2. 브라우저는 그 씨앗으로 판을 만들고 진행 기록(proof)을 남긴다.
3. `POST /api/ranking {id, course, sid, proof}` → 서버가 `src/game/minigames/rankedVerify.js`로 같은 판을 처음부터 다시 돌려 점수를 계산한다.

| 과목 | 기록(proof) | 서버 검증 |
|---|---|---|
| 부적학 2048 | 실제로 판이 바뀐 이동만 `l/r/u/d`(+계속하기 `k`) | 같은 씨앗으로 **완전 재현**. 무효 이동 하나라도 있으면 거절. 초당 20수 초과 거절 |
| 결계학 테트리스 | 판을 바꾼 조작만 한 글자씩(중력 포함) | **완전 재현**. 레벨별 중력 간격보다 빠른 기록 거절(30% 여유), 초당 30조작 초과 거절 |
| 주술학 타자 | 문장별 입력·시간(ms) 10개 | 문장 순서를 서버 씨앗으로 정함 → 다른(쉬운) 문장 바꿔치기 불가. 문장당 1000타/분 초과, 시간 합계 > 서버 경과 시간 거절 |
| 민속학 화투 | 판별 뒤집은 패 순서 + 판별 시간 | 판마다 패 배치 **재현**, 짝·콤보·보너스를 서버가 계산. 보너스 시간은 판정 지연 하한 아래로 내려가지 않음. 시간 합계 > 서버 경과 시간 거절 |
| 퇴마실습 러너 | 달린 시간 `t` | 점수는 달린 시간의 함수 → 서버가 잰 경과 시간으로 **낼 수 있는 점수 상한** 검사 |

- 관리자 계정은 검증을 통과해도 랭킹에 올리지 않는다(기존 방침).
- 판이 끝나면 게임 창에 결과가 나온다: *서버 검증 완료 · 랭킹 기록 N* / *이번 주 최고보다 낮음* / *세션 없이 진행되어 미반영* / *재현 불일치로 미반영*.
- 세션 발급에 실패하면(오프라인 등) 판은 평소처럼 즐길 수 있고 랭킹에만 오르지 않는다.
- 관리자 지표 `/api/admin/metrics`: `rankVerified`, `rankRejected`.

**한계(정직하게):** 씨앗이 브라우저에 전달되므로, 자동 입력 프로그램이 판을 *실제로* 플레이하는 것까지는 막지 못한다. 막는 것은 "그 씨앗으로 도달할 수 없는 점수"와 "흐른 시간보다 빠른 기록"이다. 화투는 원래도 펼쳐 보기 단계에서 패를 보여 주는 게임이고, 기존 화면이 `data-month` 속성을 노출하고 있어 기억 보조 도구를 원천 차단할 수는 없다.

## 2. 다인 전투 참가 정보 검증 (P1-D)

`server/mbTrust.js` — `/api/mb/start`, `/api/mb/respond`에서 브라우저가 보낸 참가 정보를 **서버에 저장된 활성 캐릭터(`account.save.player`)** 기준으로 깎는다.

- 스탯: 저장 캐릭터의 실효 스탯(장비·버프·쇠약 반영, 기본 스탯은 STAT_MAX 50으로 자름) 이하로.
- 영능력·보스전 지참 영능력: 기본 영능력 또는 저장 캐릭터가 익힌 것만.
- 보스전 지참 아이템: 저장 소지품 수량 이하로.
- 무구 효과·장신구 효과·특수 강화: 저장된 장비에서 서버가 다시 구함(브라우저 주장 무시).
- 최대 체력·영력: 저장값 이하. 저주(쇠약)는 저장값과 제출값 중 늦게 끝나는 쪽.
- 저장 캐릭터가 아예 없으면 `409 character-not-synced` → "잠시 뒤 다시 시도" 안내.
- 관리자 계정은 스탯 상한을 두지 않는다(기존처럼 스탯을 자유롭게 조절하므로).
- 실효 스탯 계산은 `src/game/statCalc.js`로 옮겨 서버와 브라우저가 같은 코드를 쓴다(`progress.js`가 재수출, 기존 import 그대로).

**한계:** 저장 캐릭터 자체도 아직 브라우저가 올리는 저장이다. 이번 조치는 "전투 요청 한 번만 조작해 저장된 캐릭터보다 강해지는 것"을 막는다. 근본 해결은 캐릭터 성장(스탯·장비·영능력 획득)의 서버 권위화다.

## 3. 공용 기록 영역별 저장 (P1-7 / P2-A)

예전: 채팅 한 줄만 와도 랭킹·장터·친구·쪽지(최대 5000건)·동아리·채팅·파티를 담은 `server` 한 줄 전체를 다시 썼다.

B.15:
- `server:ranking`, `server:market`, `server:members`, `server:social`, `server:stories`, `server:mail`, `server:clubs`, `server:clubChat`, `server:chat`, `server:bgm` 10개 행으로 나누고, **바뀐 영역의 행만** 한 번의 다중 행 upsert로 쓴다.
- 불러올 때는 기존 `server` 행을 먼저 읽고, 영역 행으로 덮어쓴다 → **B.14 데이터 그대로 이어짐, 마이그레이션 작업 불필요.**
- 기존 `server` 통짜 행은 **롤백·백업용**으로 바뀐 것이 있을 때만 30분마다 한 번(`CHOROK_LEGACY_SNAPSHOT_MS`, 0이면 끔), 그리고 서버 종료 시 갱신한다. B.14로 되돌려도 최대 30분 전(정상 종료라면 종료 시점) 상태로 열린다.
- 관리자 지표: `snapshotDomainBytes`(영역별 누적 바이트), `legacySnapshotSaveCount/Bytes`.
- `npm run economy:audit`도 `server:market` 행을 함께 읽도록 수정.
- 파일 모드(로컬 개발)는 기존처럼 `data.json` 하나.

## 4. 운영 보강

- **DB 인증서 검증:** `CHOROK_DB_CA_CERT`(PEM 본문, 한 줄로 붙여 넣은 `\n`도 인식) 또는 `CHOROK_DB_CA_FILE`(경로)을 주면 `rejectUnauthorized: true` + 해당 CA로 검증. `CHOROK_DB_SSL_STRICT=1`이면 시스템 CA로 검증. 아무것도 없으면 운영 중단을 막기 위해 기존처럼 연결하되 부팅 로그에 경고. `render.yaml`에 키 추가(`sync: false`).
- **SSE 상한:** IP당 40개(`CHOROK_SSE_PER_IP`), 전체 600개(`CHOROK_SSE_MAX`). 같은 계정 재접속은 이전 연결을 밀어내므로 전체 수에 더해지지 않는다. 학교·가정 공유기를 고려해 넉넉히 잡았다. Render 프록시 뒤에서는 `X-Forwarded-For`의 가장 오른쪽 값(프록시가 붙인 실제 IP)을 쓴다(`CHOROK_TRUST_PROXY=0`이면 소켓 주소). SSE 티켓 발급에도 계정별 속도 제한. 지표 `sseRejected`.
- **헬스체크:** DB 확인 결과를 1분 캐시. UptimeRobot이 자주 불러도 DB 호출은 분당 최대 1회(Supabase 일시정지 방지 목적엔 충분).
- **치명 예외:** `uncaughtException` 시 저장 시도(공용 기록·카드·계정) 후 종료 코드 1로 끝내고, 8초 안에 반드시 종료. Render가 새 프로세스를 띄운다. 예전 동작이 필요하면 `CHOROK_EXIT_ON_FATAL=0`. 처리되지 않은 Promise 거절은 계속 로그만.
- **종료 처리:** 새 요청 수락을 먼저 멈추고(`server.close()`), 모든 영역 행 + 백업 행 + 카드 + 계정을 저장한 뒤 DB 연결 종료.
- **로그인 쓰기 감소:** 사진 바이트 없이 계정을 읽고, 레거시 비밀번호 전환·브라우저 미전송 기록 병합·관리자 플래그 신규 부여처럼 **실제로 바뀐 경우에만** 저장. 화면용 사진은 응답 직전에만 채운다. (관리자 키로 로그인하면 관리자가 되는 동작은 그대로)
- **멱등 기록 정리:** 검증 장부의 `verified-economy:v1:op:*` 행 중 30일(`CHOROK_ECONOMY_OP_RETENTION_DAYS`) 지난 것을 6시간마다 삭제. 지갑·장터 행은 건드리지 않고, 하루보다 짧은 보관 기간은 거부. 지표 `economyOpsPruned`.

## 5. 콘텐츠

- 공작소·조리실의 수급 불가 제작법 라벨이 `수급처 준비 중 · 쌀, 설탕`처럼 **준비 중인 재료 이름**을 보여 준다. 현재 11개 제작법 / 해당 재료: 자투리 천조각, 알코올 램프, 작은 항아리, 염색약, 구겨진 한지, 갈라진 붓, 쌀, 설탕.
- 수급처 자체(어디서 얻게 할지)와 B.08 신규 아이템 100종의 효과 수치는 기획 결정이라 이번에 임의로 만들지 않았다(정본 시트 기준으로 정해 주면 반영).

## 6. 검증

| 항목 | 결과 |
|---|---|
| `node --test tests/*.test.mjs` | **309개 통과, 실패 0** (B.14 291 + 신규 18) |
| 신규 단위 테스트 | 5개 미니게임 재현·조작 거절, 다인 전투 상한, 멱등 기록 정리(파일·PostgreSQL 계약) |
| 신규 HTTP 테스트 | 랭킹 세션·위조·타인 세션·과목 바꿔치기·정상 기록, 관리자 제외, 저장 캐릭터 없는 다인 전투, IP당 SSE 상한 |
| 신규 DB 모드 테스트 | 테스트 전용 가짜 pg(`tests/fixtures/fake-pg*.mjs`)로 **실제 `server/index.js`를 DB 모드로 실행**: 채팅 한 줄 → `server:chat`만 저장(통짜 행·쪽지 미저장), 종료·재시작 복원, 통짜 행 호환, 헬스체크 캐시, TLS 옵션, 무변경 로그인 무쓰기 |
| 브라우저 실플레이 | Chromium(Playwright)에서 실제 `GameModal` + 5개 미니게임 컴포넌트를 플레이 → **5과목 모두 "서버 검증 완료"** 및 랭킹 반영 확인 |
| 전체 앱 번들 점검 | esbuild로 `src/main.jsx` 전체 번들 성공(모든 import 해석 확인). *공식 Vite 빌드는 아님* |
| 로컬 100명 부하 | `reports/B15_LOCAL_LOAD_100.json` — SSE 100 유지, 인증 조회·채팅 실패 0, 채팅 p95 약 85ms (파일 모드, Supabase·Render 미포함) |

**완료하지 못한 것:** `npm install`/`npm run build`(Vite)/`npm run lint`(oxlint) — 이 환경에서 패키지 설치 불가. 실제 Supabase PostgreSQL·Render 환경 검증. 가짜 pg는 SQL 형태와 흐름만 흉내 내며 성능·잠금 지표가 아니다.

## 7. 배포 체크리스트

1. Supabase `saves` 테이블 백업(복원 가능 여부 확인).
2. 테스트 서버에서 `npm install --include=dev && npm run build && npm run lint && npm test`.
3. (권장) Supabase 대시보드에서 CA 인증서를 받아 Render `CHOROK_DB_CA_CERT`에 넣고 접속 확인. 연결이 실패하면 값을 비워 두면 예전 방식으로 돌아간다.
4. 배포 후 `/api/admin/metrics`에서 `snapshotDomainBytes`·`snapshotSaveBytes`가 B.14 대비 줄었는지, `rankVerified`/`rankRejected` 비율이 정상인지 확인.
5. 플레이어 공지: 랭킹 재개(서버 검증), 판 도중 서버 재배포 시 그 판은 랭킹 미반영.
6. `CHOROK_ENABLE_VERIFIED_ECONOMY`는 계속 `0` 유지.

## 8. 남은 과제 (다음 단계)

1. **캐릭터 성장·재화의 서버 권위화(P0-B 본체):** 스탯·장비·영능력·돈·인벤토리를 서버가 판정. 이것이 끝나야 다인 전투·장터가 완전해진다.
2. 레거시 자산 → 검증 장부 이전(관리자 검수 절차, 자동 이전 금지 유지).
3. 단일 전투 결과의 서버 판정, 검증 개척 요괴 전투.
4. 장터 매물 행 분리(B.14 잔여), 다중 인스턴스용 Redis pub/sub.
5. 수급처 미정 재료 8종(제작법 11개)과 B.08 신규 아이템 효과 — 정본 시트 확정 후 반영.
6. 실제 Supabase 스테이징에서 10→25→50→100명 부하·복원 실습.

## 변경 파일

- 신규: `src/game/minigames/rankedVerify.js`, `src/game/statCalc.js`, `server/mbTrust.js`, `tests/b15-*.test.mjs`(5개), `tests/fixtures/fake-pg*.mjs`(3개), `reports/B15_LOCAL_LOAD_100.json`, 이 문서.
- 수정: `server/index.js`, `server/verifiedEconomy.js`, `src/net/online.js`, `src/components/GameModal.jsx`, `src/components/RankingPanel.jsx`, `src/components/minigames/{Game2048,Tetris,TypingGame,Hwatu,RunnerGame}.jsx`, `src/game/lessonContext.js`, `src/game/minigames/runnerEngine.js`(상수 export만), `src/game/progress.js`(statCalc 재수출), `src/components/locations/{Workshop,Cooking}.jsx`, `src/components/locations/recipeMeta.js`, `src/game/updateNotes.js`, `scripts/economy-audit.mjs`, `scripts/loadtest-100-local.mjs`, `render.yaml`, `package.json`, `package-lock.json`(버전만), 기존 테스트 3개(랭킹 503 → 세션 없는 제출 거절 기대값, statCalc 이동 반영).
- 손대지 않음: `src/components/AuthScreen.jsx`, `server/authPolicy.js`, 관리자 키 확인 흐름, 신규 가입 규칙.
