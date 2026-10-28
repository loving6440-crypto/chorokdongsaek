// 퇴마 실습(러닝 게임) 캐릭터 스킨. 새 스킨은 SKINS_RUNNER 에 항목만 추가하면 된다.
//  - unlock: 해금에 필요한 업적 id (없으면 처음부터 쓸 수 있다)
//  - 실제 그림은 RunnerGame.jsx 의 drawPlayer 가 id 별로 따로 그린다.
export const SKINS_RUNNER = [
  {
    id: 'fox',
    name: '여우',
    desc: '이마에 부적을 붙인 여우. 열심히 뛰고 있지만 다리가 짧다.',
    unlock: null,
  },
  {
    id: 'changnok-bloom',
    name: '창록 교화',
    desc: '꽃이 왜 굴러다니고 있어? 벌써 황사 시즌이야?',
    unlock: 'first-practice',
  },
  {
    id: 'dokkaebi-fire',
    name: '도깨비불',
    desc: '청록색 불꽃. 놀라지 마시라. 사특한 존재는 아니니까.',
    unlock: 'unset-dokkaebi-fire-runner', // 취득 경로 아직 미설정 — 존재하지 않는 업적 id라, 관리자가 선물해 주지 않으면 아무도 열 수 없다.
  },
  {
    id: 'wheat-rabbit',
    name: '황금빛 밀밭',
    desc: '이 토끼는 원래 롭이어였다. 귀신을 너무 많이 봐서 쫑긋귀가 되었다고 한다.',
    unlock: 'unset-wheat-rabbit',
  },
  {
    id: 'ugly-duckling',
    name: '미운 오리',
    desc: '미운 오리는 왜 다리가 4개일까? 이거 미운 오리 아니고 미친 오리 아냐?',
    unlock: 'unset-ugly-duckling',
  },
  {
    id: 'walking-plant',
    name: '걷는 식물',
    desc: '뭘 봐? 식물이 걷는 거 처음 봐?',
    unlock: 'unset-walking-plant',
  },
]

export const skinRunnerOf = (id) => SKINS_RUNNER.find((s) => s.id === id) ?? SKINS_RUNNER[0]
/** 관리자 계정은 퇴마 실습 스킨도 모두 자동으로 쓸 수 있다. */
export const isRunnerSkinOpen = (skin, player, admin = false) => admin || !skin.unlock || !!player?.achievements?.[skin.unlock]
