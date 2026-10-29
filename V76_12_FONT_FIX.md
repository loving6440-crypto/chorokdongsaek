# v76.0.12 글꼴 포함 배포 ZIP 생성 안내

최종 접속자는 폰트 설치가 필요 없습니다. 게임의 `public/fonts/`에 아래 5개 글꼴을 넣고 프로젝트를 배포하면 브라우저가 글꼴을 자동으로 내려받습니다.

## 한 번에 묶기 (Windows)

1. 이 프로젝트 압축을 풉니다.
2. 기존에 제공했던 원본 `PF스타더스트 3.0.ttf`, `PF스타더스트 3.0 Bold.ttf`, `PF스타더스트 3.0 ExtraBold.ttf`, `Silver.ttf`, `Ramche.zip` 파일을 압축을 푼 프로젝트 폴더, 프로젝트의 `font-source` 폴더 또는 Windows **다운로드** 폴더에 둡니다.
3. 프로젝트 최상위의 `PACK_FONTS.cmd`를 실행합니다. (Python/npm 설치 필요 없음.)
4. 상위 폴더에 **`chorokdongsaek-v76.0.13-with-fonts.zip`**이 생성됩니다.
5. 이 ZIP을 배포하면 접속자의 컴퓨터에 해당 폰트가 설치돼 있지 않아도 게임 내에서 선택할 수 있습니다.

이미 코드에는 `/fonts/PF-Stardust-Regular.ttf`, `/fonts/PF-Stardust-Bold.ttf`, `/fonts/PF-Stardust-ExtraBold.ttf`, `/fonts/Silver.ttf`, `/fonts/Ramche.ttf` 경로와 `@font-face`가 지정되어 있습니다. 이 다섯 파일이 배포 패키지에 존재하면 정상 로드됩니다. 갈무리9와 NEO둥근모는 기존 웹폰트 설정을 그대로 유지합니다.

**주의:** 폰트를 게임 이용자에게 웹폰트로 제공하는 것은 폰트 사용 및 재배포 라이선스의 허용 범위 내에서 진행해야 합니다. 업로드된 폰트 파일은 이 안내 프로젝트 ZIP 안에 포함되어 있지 않으며, `PACK_FONTS.cmd`가 사용자 로컬의 원본에서 직접 배포 ZIP을 생성합니다.
