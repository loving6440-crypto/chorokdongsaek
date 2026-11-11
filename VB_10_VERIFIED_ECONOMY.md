# 초록동색 v-B.10 — P0 2단계: 서버 검증 거래 장부 및 안전한 이전 점검

기준: **B.09 P0 패치**. 이 작업은 기존 계정·장터·사물함 데이터를 지우지 않으며, 서버 DB에 자동 마이그레이션을 실행하지 않는다.

## 결론부터

**B.10은 실제 게임 장터를 아직 다시 여는 릴리스가 아니다.** B.09에서 중단했던 기존 장터·선물·신규 랭킹 접수는 계속 막는다. 다만 앞으로 안전하게 다시 열기 위한 **원자적 서버 전용 거래 장부**를 만들고, 그 장부의 API·동시 요청 처리·멱등성·감사 도구·테스트까지 구현했다.

기존 브라우저 저장의 `save.player.money`, `save.player.inventory`는 여전히 게임 화면에서 사용된다. 그러나 **검증된 거래 잔고로 자동 이전되거나, 거래 장부 입금 근거로 사용되지 않는다.** 서버가 직접 검증한 획득/소비 액션을 모든 게임 콘텐츠에 연결한 다음에만 공식 거래로 전환해야 한다.

## 구현 내역

### 1. 원자적 서버 장부 `server/verifiedEconomy.js`

- 사용자별 별도 신뢰 잔액: `money`, `inventory`, `pendingMoney`, `inbox`, `version`.
- `list`: 검증된 재고를 확인하여 즉시 예약(차감), 매물 작성.
- `buy`: 실잔액·소지품 30칸 한도 검사, 구매자 차감/수령, 판매자 미수령 대금 적립, 매물 삭제를 **하나의 트랜잭션으로** 처리.
- `cancel`: 판매자만 취소하고 예약 재고를 반환. 단, 보관 공간이 없으면 실패하고 매물은 유지.
- `claim`: 미수령 판매대금 → 서버 잔액으로 원자적 이동.
- `gift`: 발송자 검증 재고 차감 + 수신자 서버 우편함에 영구 등록. 기존처럼 SSE로 물품 데이터를 전달하고 단순 브라우저 반영하는 방식은 사용하지 않음.
- `claimGift`: 수신자의 소지 공간 확인 후 우편함 물품을 재고에 **정확히 한 번** 지급.
- `grantTrusted`: 검증된 게임 액션이나 운영자 검수 이전용 **서버 내부 함수**. HTTP에서 호출 불가능. 같은 `sourceKey`로 재실행해도 한 번만 지급.
- 거래 가능한 물품은 현재 등록된 **기본 아이템 ID**로 제한. 개별 무구 인스턴스(`#`), 강화 수치 이전은 아직 미지원. 이런 거래는 계속 막아야 함.
- 각 변동 작업에 사용자별 `requestId`를 요구. 동일 요청 재전송은 최초 결과를 재사용하고, 같은 키로 다른 내용을 보내면 `409 request-id-conflict`.
- 고액·음수·소수 재화, 존재하지 않는 아이템, 과도한 거래 수량, 동시 구매 경쟁, 가득 찬 가방 등을 거부.

### 2. 데이터 영속화

**PostgreSQL 모드**

- 기존 Supabase `saves` 테이블에 `verified-economy:v1:wallet:<id>`, `verified-economy:v1:market`, `verified-economy:v1:op:<actor>:<requestId>`로 분리 저장. 별도 테이블 생성 작업이 필요하지 않다.
- PostgreSQL `BEGIN` → `pg_advisory_xact_lock` → 해당 행 조회 → 필요한 행만 UPSERT → `COMMIT`. 실패 시 `ROLLBACK`.
- 하나의 전역 거래 잠금으로 여러 Render 프로세스의 동시 요청도 동일 DB에 도달하면 순서대로 처리한다. 소규모 이용자 기준의 안전 우선 설계이며, 확장 시 판매자/매물 단위의 세분화 잠금으로 개선 가능.
- 매 트랜잭션이 기존 `server` 전체 스냅샷을 다시 쓰지 않는다. 저장되는 것은 해당 거래가 수정한 장부 행과 멱등 기록뿐이다.

**로컬 파일 모드**

- `CHOROK_ECONOMY_FILE`(기본 `server/economy.json`)에 별도 저장.
- 요청 직렬화 → 임시 파일 기록 및 `fsync` → `rename` 후에만 성공으로 응답.
- 손상된 파일은 조용히 빈 장부로 초기화하지 않고 서버 시작 시 오류를 발생시킨다.
- **한 프로세스의 개발 환경에서만 사용**. 여러 서버 인스턴스의 공통 장부로는 사용하지 않는다.

### 3. 서버 라우팅과 기능 플래그

- 신규 읽기: 인증을 요구하는 `GET /api/economy/wallet`, `GET /api/economy/market`.
- 신규 변경: `/api/economy/market/list`, `/buy`, `/cancel`, `/claim`, `/api/economy/gift`, `/api/economy/gift/claim`.
- 변경 요청에는 Bearer 인증과 현재 SSE 접속, 요청 ID와 자신의 계정 ID의 일치가 필요하다. rate limit 적용.
- **기본값은 신규 변경 기능도 비활성화**. `CHOROK_ENABLE_VERIFIED_ECONOMY=1`을 서버에서 명시해야 호출할 수 있다. 현재는 실제 게임 UI와 획득 경로가 미연결이므로 **운영 서버에서는 이 플래그를 켜지 말 것**.
- 기존 `/api/market/*`, `/api/gift`는 계속 HTTP 503. 기존 장터 내역은 조회할 수 있지만 점검 표시 유지.
- 위험한 기존 코드와 `CHOROK_ENABLE_UNSAFE_ECONOMY=1`, `CHOROK_ENABLE_UNVERIFIED_RANKING=1` 우회 기능을 제거. 해당 환경변수는 이제 무시된다.
- `/api/ranking` POST는 인증 후에도 여전히 503. 실제 미니게임 점수의 서버 재현이 필요하기 때문.

### 4. 기존 데이터 감사 `npm run economy:audit`

- `scripts/economy-audit.mjs`, `server/economyAudit.js` 추가.
- DB 모드에서는 `DATABASE_URL`의 `saves`에서, 파일 모드에서는 `CHOROK_ACCOUNTS`/`CHOROK_DATA`에서 **읽기 전용** 점검.
- 계정/프로필별 재화·아이템 형식 오류, 누락된 판매자, 잘못된 매물, 중복된 매물 ID, 미수령 금액을 검사.
- JSON 결과의 `safeToAutoMigrate`는 **언제나 false**. 오류가 0개라는 사실만으로 플레이 기록의 진정성을 증명하지 못한다.
- 출력에 계정 식별자와 보유량이 포함될 수 있으므로 보고서를 공개 저장소나 외부 로그에 업로드하지 말 것.
- 이 도구는 **옛 돈/아이템을 새 장부에 지급하거나 수정하지 않는다.**

## 새 API 전송 예시 (아직 운영 UI와 연결하지 않음)

```http
POST /api/economy/market/list
Authorization: Bearer <valid-session-token>
Content-Type: application/json

{"id":"existingAccount","requestId":"ae4a0f0d-98c4-4b2d-916e-35530a4e59ef","item":"stone","qty":1,"price":10}
```

요청 ID는 개별 변경 행동마다 유일해야 하고, 네트워크 재시도에서는 **같은 ID를 재사용**해야 한다. 위 예시의 아이디는 임의 이름이므로 실제 가입된 사용자 본인 아이디를 사용한다. 서버의 신뢰 장부에 실제 재고가 없으면 `409 insufficient-items`로 거절된다.

## 변경된 파일

- 신규: `server/verifiedEconomy.js`, `server/economyAudit.js`, `scripts/economy-audit.mjs`.
- 신규 테스트: `tests/b10-verified-economy.test.mjs`, `tests/b10-economy-api.test.mjs`, `tests/b10-economy-postgres-contract.test.mjs`, `tests/b10-economy-audit.test.mjs`.
- 수정: `server/index.js`, `package.json`, `package-lock.json` (버전), `.gitignore`, `.dockerignore`, `README.md`.

## 남은 P0 작업 (중요)

1. **실제 게임 액션의 서버 권한화**: 채집·수렵·제작·요리·상점 거래·전투 보상·강화·장비 이동·소지품 보관함 등을 서버가 판정하고, 신뢰 재고를 변경하도록 이전. `account/save`는 검증된 재화 필드를 덮어쓸 수 없게 해야 함.
2. **기존 이용자의 자산 검수/마이그레이션**: Supabase 전체 백업 후 중복 매물, 판매대금, 과거 선물, 다중 프로필 및 개별 무구 인스턴스의 정산 규칙을 정한다. 이번 감사 결과를 활용하되 브라우저 데이터는 신뢰하지 않는다.
3. **게임 UI 동기화**: 온라인 재화/인벤토리와 `src/Game.jsx`의 상태 변경이 이중 지급되지 않게 통합. 구매·판매·선물·우편함·재접속·멀티탭의 UI와 오류/재시도 상태를 변경.
4. **서버 검증 랭킹 세션**: 2048/타자/테트리스/민속학/퇴마실습 점수의 서버 재현 또는 권한 있는 게임 세션으로 결과 검증. 현재 랭킹은 계속 접수 중단.
5. **배포 검증**: 실제 Supabase PostgreSQL에서 트랜잭션 동작·성능·복원 실습, 실제 Vite 빌드 및 브라우저 시나리오. 이번 테스트는 로컬 파일 모드와 PostgreSQL **모의 계약 테스트**만 수행했다.

## 테스트 기록

`npm test` 전체 자동 테스트 실행. 기존 254개에 B.10 테스트 14개 추가. 확인: 동시 구매 1회 성공, 중복 요청 1회 처리, 거래 실패 롤백, 재접속 후 거래 유지(파일), 위조된 `account/save`에서 재화 승격 불가, 레거시 우회 플래그 무효, 감사 도구 원본 불변성 등.

빌드 도구가 설치되지 않은 실행 환경에서 `npm run build`는 `vite: not found`로 종료되었다. 빌드 성공을 주장하지 않는다. `npm install --include=dev` 이후 빌드와 lint 검증이 필요하다. 현재 잠금파일은 기존 배포의 `pg` 의존성 항목 누락이 남아 있을 수 있으므로, 패키지 설치가 가능한 환경에서 `npm install` 후 **갱신된 package-lock.json**을 커밋해야 한다 (`npm ci` 전에 검증).

## 배포 전 필수

- Supabase 데이터베이스 전체 백업, 테스트 서버에서 복원 검증.
- `CHOROK_ENABLE_VERIFIED_ECONOMY` **미설정** 유지. 위험한 기존 플래그도 설정하지 않는다.
- 기존 장터/선물/신규 랭킹 점검 상태 유지 안내.
- 모든 테스트 통과와 실제 npm 빌드·lint, 운영 설정, DB 연결 테스트 후 점진 배포.
- 운영 장부 수동 조작/임의 데이터 복사 금지.
