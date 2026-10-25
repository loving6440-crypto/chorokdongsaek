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
  {
    id: 'winter-snow',
    name: '흩날리는 눈의 겨울',
    desc: '흰빛에서 짙은 겨울 하늘색까지, 눈이 휘날리듯 번지는 스킨.',
    unlock: 'unset', // 취득 경로 아직 미설정 — 존재하지 않는 업적 id라 지금은 아무도 열 수 없다.
    tiles: {
      2: ['#f8fbff', '#355d82'],
      4: ['#eef6ff', '#2c5374'],
      8: ['#def0fe', '#254a67'],
      16: ['#cbe6fc', '#1e405c'],
      32: ['#b2dafb', '#ffffff'],
      64: ['#95caf8', '#ffffff'],
      128: ['#77baf5', '#ffffff'],
      256: ['#58a8f0', '#ffffff'],
      512: ['#3d93e8', '#ffffff'],
      1024: ['#2c78d6', '#eaf6ff'],
      2048: ['#1c5bb8', '#eaf6ff'],
    },
    over: ['#123f87', '#eaf6ff'],
    board: { frame: '#bfe0fa', cell: '#eaf6ff', panel: '#f7fbff', ink: '#2c5374' },
  },
  {
    id: 'dokkaebi-fire',
    name: '도깨비불',
    desc: '베이지에서 짙은 청록까지, 불이 타오르듯 번지는 스킨.',
    unlock: 'unset', // 취득 경로 아직 미설정 — 존재하지 않는 업적 id라 지금은 아무도 열 수 없다.
    tiles: {
      2: ['#e9e2d0', '#2e2a24'],
      4: ['#e2d8c0', '#2e2a24'],
      8: ['#d8caa9', '#2e2a24'],
      16: ['#bda27e', '#2e2a24'],
      32: ['#a68f6c', '#f5efe2'],
      64: ['#8c7b5e', '#f5efe2'],
      128: ['#6b8a85', '#f5efe2'],
      256: ['#4f8482', '#f5efe2'],
      512: ['#3f8f8a', '#102020'],
      1024: ['#1f7a75', '#e9e2d0'],
      2048: ['#0b6a6a', '#e9e2d0'],
    },
    over: ['#083f3f', '#e9e2d0'],
    board: { frame: '#0b6a6a', cell: '#e9e2d0', panel: '#f5efe2', ink: '#2e2a24' },
  },
]

export const skinOf = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0]
export const isSkinOpen = (skin, player) => !skin.unlock || !!player?.achievements?.[skin.unlock]
// 최초 게임이 열리는 시점(현재 버전)부터 얻을 수 있는 스킨들. [부적 만들기의 달인] 업적이 기준으로 쓴다.
// 취득 경로가 아직 정해지지 않은 스킨(흩날리는 눈의 겨울 · 도깨비불)은 나중에 경로가 생기면 여기에도 추가한다.
export const LAUNCH_SKIN_IDS = ['talisman', 'changnok']
