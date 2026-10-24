// 부적학(2048) 스킨. 새 스킨은 SKINS 에 항목만 추가하면 된다.
//  - unlock: 해금에 필요한 업적 id (없으면 처음부터 쓸 수 있다)
//  - tiles:  값 → [바탕, 글자] 색
//  - board:  보드 둘레 · 빈 칸 · 틀 색
export const SKINS = [
  {
    id: 'talisman',
    name: '부적',
    desc: '머스타드 바탕에 진빨강 글씨. 기본 스킨.',
    unlock: null,
  },
  {
    id: 'changnok',
    name: '창록 교화',
    desc: '연분홍 벚꽃과 딸기빛 붉음이 번지는 아기자기한 스킨.',
    unlock: 'first-talisman',
    // 벚꽃봄색(#ec94ab) → 사랑에빠진딸기색(#d63e4c)
    tiles: {
      2: ['#fdeaf0', '#c04561'],
      4: ['#fbd9e3', '#b73c58'],
      8: ['#f8c4d4', '#a8304d'],
      16: ['#f4adc3', '#8f2340'],
      32: ['#ee93ad', '#fff7f9'],
      64: ['#ea7f9d', '#ffffff'],
      128: ['#e56a8b', '#ffffff'],
      256: ['#e05577', '#ffffff'],
      512: ['#db4569', '#ffffff'],
      1024: ['#d63e4c', '#fff1f3'],
      2048: ['#c42a40', '#ffe7a3'],
    },
    over: ['#a81f34', '#ffe7a3'],
    board: { frame: '#f6b6c8', cell: '#fadbe5', panel: '#fff0f4', ink: '#b73c58' },
  },
]

export const skinOf = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0]
export const isSkinOpen = (skin, player) => !skin.unlock || !!player?.achievements?.[skin.unlock]
