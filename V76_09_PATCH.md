# 초록동색 v76.0.9 — 화면 테마 팝업 · 글씨체 선택

## 변경 내용

- 프로필, 로그인, 캐릭터 생성 화면의 테마 아이콘 버튼을 **화면 설정 팝업 열기**로 변경
- 팝업에서 **라이트모드/다크모드** 직접 선택. 이전의 클릭 즉시 반전 동작 제거
- 팝업 아래에 **글씨체 변경**: NEO둥근모(기본), PF스타더스트, 갈무리9, Silver, 램체
- 선택 전 각 글꼴 이름과 `초록동색 가나다 123` 미리보기 제공
- 선택 즉시 글씨체와 테마 적용, 로컬 저장 및 새로고침/탭 간 설정 유지
- 기존 V74 픽셀 스킨의 강제 글꼴 규칙을 변수 기반으로 교체하고 `font-sans`, `font-serif`, `font-mono`, 입력/버튼에 적용
- 음악 설정과 동일한 형태의 포털 중앙 대화상자: 화면 가장자리 대응, 밖 클릭/Esc/닫기 버튼, 초점 복귀
- 갈무리9 웹폰트는 `quiple/galmuri`의 **v2.40.4** 태그로 고정
- NEO둥근모 웹폰트는 `neodgm/neodgm-webfont`의 **1.601** 버전 사용

## 중요: 사용자 첨부 글꼴 설치 필요

이 ZIP은 글꼴 파일 자체를 포함하지 않습니다. 사용자 보유 원본 파일을 `public/fonts/`에 다음 이름으로 복사한 후 배포하세요. 파일 경로는 대소문자를 구분하는 서버에서도 정확히 일치해야 합니다.

| 원본 파일 | 복사 위치 |
| --- | --- |
| PF스타더스트 3.0.ttf | `public/fonts/PF-Stardust-Regular.ttf` |
| PF스타더스트 3.0 Bold.ttf | `public/fonts/PF-Stardust-Bold.ttf` |
| PF스타더스트 3.0 ExtraBold.ttf | `public/fonts/PF-Stardust-ExtraBold.ttf` |
| Silver.ttf | `public/fonts/Silver.ttf` |
| Ramche.zip 내부 Ramche.ttf | `public/fonts/Ramche.ttf` |

아직 원본을 복사하지 않은 상태에서 PF스타더스트·Silver·램체를 선택하면 기본 NEO둥근모로 대체 표시됩니다.
NEO둥근모와 갈무리9는 별도의 파일 복사가 필요 없지만 인터넷/CDN 연결이 필요합니다.

## 검증

- 기존 테스트 35개 + 신규 화면/글꼴 설정 테스트 4개 = **39개 통과**
- JS/JSX 149개 파일의 파서 문법 검사 통과
- 실제 Vite 빌드/브라우저 시각 검증은 의존성 부재로 미실시

## 관련 파일

- `src/components/ThemeToggle.jsx`
- `src/hooks/useTheme.js`
- `src/hooks/useFont.js`
- `src/App.jsx`
- `src/index.css`
- `index.html`
- `public/fonts/README.md`
- `tests/display-settings.test.mjs`
