// 산 탐색(뒷산) 데이터. 왼길 / 중앙길 / 오른길 세 갈래, 중앙길은 산 오르기 / 둘레길로 한 번 더 갈라진다.
// 각 스팟의 key 는 exploreVisited 에 쓰는 고유 id (항상 'gym:' 로 시작)로, 동아리 '모든 장소 탐사' 퀘스트가 그대로 쓴다.
export const HIKE_PATHS = [
  {
    id: 'left',
    name: '왼길',
    spots: [
      { id: 'armory', name: '무구보관소' },
      { id: 'garden', name: '텃밭' },
      { id: 'goblinFarm', name: '도깨비 농장' },
      { id: 'beastGround', name: '신수들의 터' },
    ],
  },
  {
    id: 'center',
    name: '중앙길',
    branches: [
      {
        id: 'climb',
        name: '산 오르기',
        spots: [
          { id: 'peak', name: '산꼭대기' },
          { id: 'temple', name: '사찰' },
          { id: 'tomb', name: '묘소' },
          { id: 'mysteryStorage', name: '?? 보관소' },
        ],
      },
      {
        id: 'loop',
        name: '둘레길',
        spots: [{ id: 'outside', name: '교외' }],
      },
    ],
  },
  {
    id: 'right',
    name: '오른길',
    spots: [
      { id: 'river', name: '청화강' },
      { id: 'lake', name: '청화호수' },
      { id: 'campsite', name: '캠핑장' },
    ],
  },
]

export const hikeSpotKey = (pathId, spotId, branchId = null) => (branchId ? `gym:${pathId}:${branchId}:${spotId}` : `gym:${pathId}:${spotId}`)

/** 산 탐색의 모든 (하위) 장소의 exploreVisited key 목록. */
export const HIKE_SPOT_IDS = (() => {
  const ids = []
  for (const p of HIKE_PATHS) {
    if (p.spots) for (const s of p.spots) ids.push(hikeSpotKey(p.id, s.id))
    if (p.branches) for (const b of p.branches) for (const s of b.spots) ids.push(hikeSpotKey(p.id, s.id, b.id))
  }
  return ids
})()

// 교외의 NPC 바리: 학교 밖으로 나가려 하면 말을 걸어온다. 매번 이 중 하나를 무작위로 보여 준다.
export const OUTSIDE_BARI_LINES = [
  '조심해요! 여러분에게 바깥은 위험해요. 갑갑하겠지만 학교로 돌아가주실 수 없을까요?',
  '안개가 바로 앞까지 찾아오고 있어⋯ 안개가, ⋯⋯아, 네? 아뇨, 아무 말도 안 했어요!',
  '무언가 밖에서 사고 싶은 게 있다면 현장체험학습날을 기다려보는 건 어떨까요? 혹시 학교 밖에 전해야 할 서신이나 물건이 있다면 제가 전해드릴게요.',
  '무속의 길은 외로운 길이에요. 여러분이 잘 이겨내시길 바라요.',
  '아, 몰래 나가시려 하면 안 돼요! 잠시만요! 다 보인다구요!',
  '저도 어릴 적에는 귀신이 무서웠답니다. 아직도 어리긴 하지만⋯ 뭐어, 자주 보면 익숙해지는 건 뭐든 비슷하더라고요.',
  '학교를 돌아다니다 불길한 느낌이 들면 바로 멈춰야 해요. 아시겠죠?',
]
