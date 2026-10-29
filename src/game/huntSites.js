// 좌표는 사진 기준 0부터 센다. x=열(A~J), y=행(1~10).
// 출처: Google 시트 '채집 터' (gid=1845354668)의 셀 메모.
// 쑥 13레벨, 최대 20턴, 영물·산귀신 설정은 사용자가 추가로 지정한 값이다.
export const HUNT_SIZE = 10
export const HUNT_COOLDOWN_MS = 50 * 60 * 1000
export const HUNT_ATTEMPTS = 3

export const HUNT_KINDS = {
  player: { label: '플레이어', symbol: '●', background: '#dc0000', color: '#ffffff' },
  plant: { label: '식물', symbol: '♣', background: '#d8ead2', color: '#111111' },
  obstacle: { label: '장애물', symbol: '◆', background: '#cccccc', color: '#111111' },
  animal: { label: '동물', symbol: '♥', background: '#dac1a9', color: '#111111' },
  spirit: { label: '영물', symbol: '♥', background: '#70452b', color: '#ffffff' },
  ghost: { label: '귀신', symbol: '♠', background: '#111111', color: '#ffffff' },
  empty: { label: '빈 칸', symbol: '', background: '#ffffff', color: '#111111' },
}

export const HUNT_SPECIES = {
  snake: { name: '뱀', kind: 'animal', rewards: [{ item: 'snake-skin', dice: 2 }] },
  fox: { name: '여우', kind: 'animal', rewards: [{ item: 'fox-fur', amount: 1 }] },
  snakeBerry: { name: '뱀딸기', kind: 'plant', rewards: [{ item: 'snake-berry', dice: 2 }] },
  mushroom: { name: '버섯', kind: 'plant', rewards: [{ item: 'mushroom', dice: 2 }] },
  poisonMushroom: { name: '독버섯', kind: 'plant', rewards: [{ item: 'poison-mushroom', amount: 1 }] },
  stoneTower: { name: '돌탑', kind: 'obstacle', rewards: [{ item: 'rock', dice: 3 }] },
  bush: { name: '덤불', kind: 'obstacle', rewards: [{ item: 'raspberry', amount: 1 }] },
  stonePillar: { name: '바위 기둥', kind: 'obstacle', rewards: [{ item: 'rock', dice: 2 }] },
  mugwort: { name: '쑥', kind: 'plant', rewards: [{ item: 'mugwort', amount: 1 }] },
  brokenJangseung: { name: '부러진 장승', kind: 'spirit', rewards: [{ item: 'jangseung-piece', dice: 3 }] },
}

export const HUNT_BONUSES = {
  plant: { item: 'fine-woodchip', amount: 1 },
  obstacle: { item: 'whetstone', dice: 2 },
  animal: { item: 'trap-scrap', amount: 1 },
}

// 종류별로 영향을 주는 스탯을 단순 합산한다. 영물은 여섯 스탯 모두의 합을 쓴다.
export const HUNT_STAT_KEYS = {
  plant: ['insight', 'endurance'],
  obstacle: ['insight', 'control'],
  animal: ['comprehension', 'agility'],
  spirit: ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension'],
}

const point = (cell, species, level) => ({
  id: cell, x: cell.charCodeAt(0) - 65, y: Number(cell.slice(1)) - 1,
  kind: HUNT_SPECIES[species].kind, species, level,
})

export const LEFT_TRAIL_ONE = {
  id: 'left-trail-1', path: 'left', name: '산길-1',
  start: { x: 0, y: 9 },
  maxTurns: 20,
  nodes: [
    point('J1', 'mugwort', 13),
    point('C2', 'poisonMushroom', 10),
    point('F4', 'snakeBerry', 8),
    point('C5', 'mushroom', 5),
    point('C6', 'poisonMushroom', 10),
    point('H6', 'snakeBerry', 8),
    point('I10', 'mushroom', 5),
    point('E2', 'stoneTower', 7),
    point('G6', 'stonePillar', 5),
    point('E8', 'stonePillar', 5),
    point('C10', 'bush', 2),
    { ...point('A3', 'snake', 10), route: clockwiseRoute(0, 2, 4) },
    { ...point('I3', 'fox', 15), route: clockwiseRoute(0, 1, 9) },
  ],
  // 입장 시 독립적으로 한 번씩 판정. 위치는 비어 있는 흰 타일 중 무작위.
  spirit: { ...HUNT_SPECIES.brokenJangseung, species: 'brokenJangseung', chance: 0.2, level: 30 },
  ghost: {
    chance: 0.2, kind: 'ghost', name: '산귀신', level: 2,
    // 기존 원귀의 저주 패턴, 능력치는 2단계 먹구렁이 기준(평균 스탯 5~6).
    // 일반 퇴마 실습 목록에는 추가하지 않으며 영력 20만 별도 지급한다.
    enemy: { id: 'mountain-ghost', name: '산귀신', tier: 2, partySize: 1, hp: 90, atk: 10, act: 9, spirit: 8, reward: 20,
      special: { label: '원한의 저주', note: '세 번의 상대 턴 동안 매번 피해가 스며든다.' } },
    rewardSpirit: 20,
  },
}

export const HUNT_PATHS = [
  { id: 'left', name: '왼길', last: '동굴' },
  { id: 'center', name: '중앙길', last: '묘소' },
  { id: 'right', name: '오른길', last: '호수' },
].map(path => ({ ...path, sites: [
  ...[1, 2, 3].map(n => ({ id: `${path.id}-trail-${n}`, name: `산길-${n}` })),
  { id: `${path.id}-end`, name: path.last },
] }))

export const HUNT_SITES = { [LEFT_TRAIL_ONE.id]: LEFT_TRAIL_ONE }

export function siteMissingData(site) {
  if (!site) return ['장소 데이터']
  const missing = []
  if (!Number.isInteger(site.maxTurns) || site.maxTurns < 1) missing.push('최대 행동 턴 수')
  for (const node of site.nodes) {
    const species = HUNT_SPECIES[node.species]
    if (!species || species.kind !== node.kind || !Number.isFinite(node.level) || node.level < 1) missing.push(`${node.id} 이름·적정 레벨`)
    if (node.kind === 'animal' && !node.route?.length) missing.push(`${node.id} 이동 경로`)
  }
  if (site.spirit?.chance > 0 && (!Number.isFinite(site.spirit.level) || site.spirit.level < 1 || !site.spirit.rewards?.length)) missing.push('영물 적정 레벨·보상')
  return missing
}

/** 시계 방향 사각 테두리. 시작점을 마지막에 중복하지 않는다. */
export function clockwiseRoute(x, y, width, height = width) {
  const route = []
  for (let dx = 0; dx < width; dx++) route.push({ x: x + dx, y })
  for (let dy = 1; dy < height; dy++) route.push({ x: x + width - 1, y: y + dy })
  for (let dx = width - 2; dx >= 0; dx--) route.push({ x: x + dx, y: y + height - 1 })
  for (let dy = height - 2; dy > 0; dy--) route.push({ x, y: y + dy })
  return route
}
