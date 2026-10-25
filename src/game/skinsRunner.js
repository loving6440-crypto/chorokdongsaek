// 퇴마 실습(러닝 게임) 캐릭터 스킨. 새 스킨은 SKINS_RUNNER 에 항목만 추가하면 된다.
//  - unlock: 해금에 필요한 업적 id (없으면 처음부터 쓸 수 있다)
//  - 실제 그림은 RunnerGame.jsx 의 drawPlayer 가 id 별로 따로 그린다.
export const SKINS_RUNNER = [
  {
    id: 'fox',
    name: '여우',
    desc: '이마에 부적을 붙인 여우. 기본 스킨.',
    unlock: null,
  },
  {
    id: 'changnok-bloom',
    name: '창록 교화',
    desc: '데굴데굴 굴러가는 분홍빛 벚꽃 한 송이.',
    unlock: 'first-practice',
  },
  {
    id: 'dokkaebi-fire',
    name: '도깨비불',
    desc: '눈코입 없이 그저 활활 타오르는 청록빛 불.',
    unlock: 'unset-dokkaebi-fire-runner', // 취득 경로 아직 미설정 — 존재하지 않는 업적 id라, 관리자가 선물해 주지 않으면 아무도 열 수 없다.
  },
  {
    id: 'wheat-rabbit',
    name: '황금빛 밀밭',
    desc: '귀가 축 늘어진 갈색 롭이어 토끼.',
    unlock: 'unset-wheat-rabbit',
  },
  {
    id: 'ugly-duckling',
    name: '미운 오리',
    desc: '아장아장 뛰어다니는 새까만 새끼 오리.',
    unlock: 'unset-ugly-duckling',
  },
  {
    id: 'walking-plant',
    name: '걷는 식물',
    desc: '짧고 동그란 발(신발?)이 달려 뛰어다니는 화분.',
    unlock: 'unset-walking-plant',
  },
]

export const skinRunnerOf = (id) => SKINS_RUNNER.find((s) => s.id === id) ?? SKINS_RUNNER[0]
/** 관리자 계정은 퇴마 실습 스킨도 모두 자동으로 쓸 수 있다. */
export const isRunnerSkinOpen = (skin, player, admin = false) => admin || !skin.unlock || !!player?.achievements?.[skin.unlock]
