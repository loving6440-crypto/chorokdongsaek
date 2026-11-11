# 초록동색 v76.0.16 — 보안 헤더 개선

기반 버전: v76.0.15. 전투/아이템/친구/튜토리얼/글꼴 설정의 게임 규칙은 변경하지 않음.

## 1. 실제 HTTP 응답에 적용한 헤더

| 헤더 | 설정 |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (HTTPS 응답에만) |
| `Content-Security-Policy` | 서버의 `server/securityHeaders.js` 참조. 인라인 JS/`eval` 불허, 게임에서 쓰는 도메인만 허용 |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | 카메라·마이크·위치·결제·민감 장치 API 비활성화 |

해당 헤더는 Node 서버의 공통 응답에 설정되어 일반 문서, 정적 자산, API 및 SSE 오류 응답에 적용된다. HSTS만 원래 클라이언트 연결이 HTTPS일 때 추가한다. Render는 TLS를 엣지에서 종료하고 `X-Forwarded-Proto`를 전달하므로 이 값을 확인한다.

## 2. CSP를 깨뜨리지 않기 위한 수정

- HTML에 있던 글꼴·테마·크기 초기화용 인라인 스크립트를 `/theme-bootstrap.js`로 이동. 브라우저 첫 페인트 전에 동기 실행되는 기존 동작은 유지.
- `script-src`에 `'unsafe-inline'`, `'unsafe-eval'` 미사용.
- 웹폰트: Google Fonts, jsDelivr(NEO둥근모/갈무리9) 허용.
- 배경음악: YouTube IFrame API의 스크립트 및 프레임 출처 허용.
- 아바타: `data:` 및 `blob:` 이미지 허용.
- React 인라인 스타일을 위해 `style-src`에 한하여 `'unsafe-inline'` 유지.
- `nosniff`와의 호환을 위해 `.ttf`, `.otf`, `.woff` MIME 추가.

## 3. 배포 방법

**Render Node 웹 서비스** (현재 `render.yaml`의 `runtime: node`)라면 별도 Render 대시보드 설정 없이 이 프로젝트 전체를 배포하면 된다. 보안 헤더는 Node 서버가 전송하므로 **프런트엔드가 GitHub Pages나 다른 호스팅에서 제공되면 해당 웹페이지에는 자동 적용되지 않는다.** 그 경우 해당 호스팅의 HTTP 헤더 설정을 따로 해야 한다.

```
npm install --include=dev
npm run build
npm start
```

배포 후 PowerShell/터미널에서 (실제 게임 주소로 치환):

```
curl.exe -I https://YOUR-GAME.example/
curl.exe -I https://YOUR-GAME.example/theme-bootstrap.js
```

응답에 6개 항목이 나타나는지 확인한다. 브라우저 개발자 도구(콘솔)에서 CSP 위반 메시지도 확인해야 한다. 특히 **관리자 YouTube 재생목록, 모든 글씨체, 효과음, 실시간 채팅/SSE, 업로드 아바타**를 테스트 서버에서 검사한다.

**주의:** `includeSubDomains`는 해당 도메인의 모든 하위 도메인도 HTTPS를 강제한다. HTTPS를 지원하지 않는 하위 도메인이 있다면 운영 적용 전 정책을 조정해야 한다. CSP는 XSS 방어를 강화하지만 입력값 검증·인증/권한 검사·백엔드 보안을 대체하지 않는다.

## 4. 테스트 범위 및 한계

- `node --test tests/*.test.mjs` — 보안 헤더 + 기존 게임 회귀 테스트 57개 통과.
- Node 실제 HTTP 응답에서 200, 304, API 404, JS MIME, TTF MIME, HSTS HTTPS 판단 검사 통과.
- **브라우저에서 외부 YouTube 재생 및 모든 폰트 표시를 확인한 것은 아니다.** 실제 배포 후 개발자 도구 CSP 오류와 네트워크 요청을 반드시 확인할 것.
- npm 의존성이 환경에 없어 Vite 전체 빌드 성공 여부는 별도 검증이 필요하다.
- 제공 ZIP에는 이전 버전과 동일하게 사용자가 올린 상업용 폰트 원본이 재배포되지 않는다. 이미 폰트를 포함한 로컬 프로젝트가 있다면 `security-only-patch.zip` 파일을 사용한다.
