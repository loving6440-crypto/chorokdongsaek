// 테스트 전용: 서버 프로세스에서 `import('pg')` 를 파일 기반 가짜 Postgres 로 바꾼다.
//   node --import ./tests/fixtures/fake-pg-register.mjs server/index.js
// 실제 Supabase 성능·잠금 동작을 대신하지 않는다. SQL 호출 형태와 저장·재시작 흐름만 검증한다.
import { register } from 'node:module'
register('./fake-pg-hooks.mjs', import.meta.url)
