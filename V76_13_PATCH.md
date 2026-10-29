# 초록동색 v76.0.13 — Silver 글씨 크기 조정

- `src/index.css`의 Silver `@font-face`에 `size-adjust: 115%`를 적용했습니다.
- Silver를 선택하면 글리프가 기존보다 약 15% 더 크게 보입니다. 다른 서체의 크기는 변경하지 않습니다.
- 기존 글꼴 선택 및 브라우저 저장 방식은 유지됩니다.
- Silver.ttf 자체는 변형하지 않으며, 배포 시 `public/fonts/Silver.ttf`가 있어야 적용됩니다.
- 기존 `PACK_FONTS.cmd`를 사용해 폰트 포함 배포 ZIP을 만들 수 있습니다.
- 브라우저 화면에서는 글자 겹침 여부를 확인해 주세요.
