# 秘靈 · 비령 — 초록동색 C.01 데이터 라이브러리 (v0.3)

이 자료실에는 **원본 C.01 게임 데이터를 변경하지 않고** 모은 읽기 전용 JSON 스냅샷이 있습니다. 현 비령 웹페이지(`index.html`)와 연결하지 않았습니다.

| 파일 | 내용 | 원본 정본 |
|---|---|---|
| `items.json` | 312개 최종 아이템. 패치/덮어쓰기 후의 id·이름·효과·가격·희귀도 등 원본 필드 유지 | `src/game/items.js` |
| `enemies.json` | 전체 적 57종, 스탯·특수기·보스 기믹·설명·권장치 | `src/game/battle.js`, `src/game/bestiary.js` |
| `psychics.json` | 플레이어 영능력 13종, 습득조건/액티브·패시브·의지력 소모 | `src/game/battle.js` (`PSYCHICS`) |
| `enemy-psychics.json` | 모든 적의 `special` 및 `special2` 영능력 정의 69개 | `src/game/battle.js`, `src/game/bestiary.js` |
| `item-data-layers.json` | v79 · B05 · B06 · B07 · B08 · B16 원본 아이템 시트/효과 패치 | 각 `items*.js`, `itemEffectsB16.js` 등 |
| `pioneer-tables.json` | 10×10 개척 장소 23곳, 채집·수렵·동물·보상 테이블 | `huntSites.js`, `huntTrails.js`, `gather.js`, `hunt.js` |
| `crafting-tables.json` | 73 기본 제작법, B08 추가 공방·조리 레시피 각 50개 | `crafting.js`, `recipesB08.js` |
| `battle-stat-tables.json` | 육조·장비·기본 적·플레이어 영능력 등 핵심 테이블 | `constants.js`, `battle.js`, `items.js` |
| `hike-tables.json` | 산길/길목/도깨비 미니게임 관련 데이터 | `hike.js` |
| `catalog-manifest.json` | 데이터 개수, 파일 SHA-256 및 생성 근거 | 이 폴더의 생성 결과 |
| `build-catalogs.mjs` | 현재의 원본 C.01 소스에서 JSON을 다시 만드는 스크립트 | `node systems/data/build-catalogs.mjs` |
| `index.mjs` | 후속 구현에서 사용할 원본 JS 데이터의 안정적인 import 경로 | C.01 소스 |

`systems/chorokdongsaek-C01/src/game/` 경로는 위 표에서 파일명 앞에 붙여 읽으면 됩니다.

## 주의

- **JSON은 읽기 전용 스냅샷입니다.** 데이터에 포함된 동적 JS 함수, 계산 수식, 각종 상태 전이는 원본의 게임 엔진 파일을 사용해야 합니다. JSON만으로 전투/개척 프로그램이 동작하는 것은 아닙니다.
- 기존 비령 HTML·CSS·JS를 이번 버전에서는 변경하지 않았습니다. 전투 UI, 개척 UI, DB, 서버, 로그인과 아직 연결되지 않았습니다.
- 중복 ID는 아이템·적·플레이어 영능력 모두 0개로 검증했습니다.
- 새 비령 세계관 전용 데이터는 추후 별도 파일로 추가하는 편이 안전합니다. 이 C.01 정본을 임의로 수정하지 마세요.
- 새 원본 스냅샷에는 사용자 제공 폰트/BGM 바이너리를 복제하지 않았습니다.
