// 좌표는 사진 기준 0부터 센다. x=열(A~J), y=행(1~10).
// 출처: Google 시트 '채집 터' (gid=1845354668)의 셀 메모.
// 쑥 13레벨, 최대 20턴, 영물·산귀신 설정은 사용자가 추가로 지정한 값이다.
export const HUNT_SIZE = 10
export const HUNT_COOLDOWN_MS = 0
export const HUNT_ATTEMPTS = 3

export const HUNT_KINDS = {
  player: { label: '플레이어', symbol: '●', background: '#dc0000', color: '#ffffff' },
  plant: { label: '식물', symbol: '♣', background: '#d8ead2', color: '#111111' },
  obstacle: { label: '장애물', symbol: '◆', background: '#cccccc', color: '#111111' },
  animal: { label: '동물', symbol: '♥', background: '#dac1a9', color: '#111111' },
  spirit: { label: '영물', symbol: '♥', background: '#70452b', color: '#ffffff' },
  ghost: { label: '요괴', symbol: '♠', background: '#111111', color: '#ffffff' },
  empty: { label: '빈 칸', symbol: '', background: '#ffffff', color: '#111111' },
}

export const HUNT_SPECIES = {
  snake: { name: '뱀', kind: 'animal', rewards: [{ item: 'snake-skin', dice: 2 }] },
  fox: { name: '여우', kind: 'animal', rewards: [{ item: 'fox-fur', amount: 1 }] },
  snakeBerry: { name: '뱀딸기', kind: 'plant', rewards: [{ item: 'snake-berry', dice: 2 }] },
  mushroom: { name: '버섯', kind: 'plant', rewards: [{ item: 'mushroom', dice: 2 }] },
  poisonMushroom: { name: '독버섯', kind: 'plant', rewards: [{ item: 'poison-mushroom', amount: 1 }] },
  stoneTower: { name: '돌탑', kind: 'obstacle', rewards: [{ item: 'stone', dice: 3 }] },
  bush: { name: '덤불', kind: 'obstacle', rewards: [{ item: 'wild-raspberry', amount: 1 }] },
  stonePillar: { name: '바위 기둥', kind: 'obstacle', rewards: [{ item: 'stone', dice: 2 }] },
  mugwort: { name: '쑥', kind: 'plant', rewards: [{ item: 'mugwort', amount: 1 }] },
  brokenJangseung: { name: '부러진 장승', kind: 'spirit', rewards: [{ item: 'jangseung-piece', dice: 3 }] },
}


// 시트 [개척 터]의 장소별 셀 메모를 바탕으로 보상·적정 레벨을 정의한다.
const EXTRA_SPECIES = {
  cloverPlant: { name: '토끼풀', kind: 'plant', rewards: [{ item: 'clover-leaf', dice: 2 }] },
  dandelion: { name: '민들레', kind: 'plant', rewards: [{ item: 'dandelion', dice: 2 }] },
  dove: { name: '멧비둘기', kind: 'animal', rewards: [{ item: 'dove-feather', dice: 2 }] },
  raccoon: { name: '너구리', kind: 'animal', rewards: [{ item: 'raccoon-claw', dice: 2 }] },
  deer: { name: '고라니', kind: 'animal', rewards: [{ item: 'deer-tooth', amount: 1 }] },
  kingMushroom: { name: '거대 버섯 군락', kind: 'obstacle', rewards: [{ item: 'king-mushroom', dice: 2 }] },
  gravel: { name: '자갈더미', kind: 'obstacle', rewards: [{ item: 'pebble', amount: 1 }] },
  fern: { name: '고사리', kind: 'plant', rewards: [{ item: 'fern', amount: 1 }] },
  pineTree: { name: '소나무', kind: 'plant', rewards: [{ item: 'pinecone', dice: 2 }] },
  well: { name: '폐우물', kind: 'obstacle', rewards: [{ item: 'brick', amount: 1 }] },
  herb: { name: '감초 터', kind: 'plant', rewards: [{ item: 'licorice', dice: 2 }] },
  azalea: { name: '진달래', kind: 'plant', rewards: [{ item: 'azalea', amount: 1 }] },
  willowTree: { name: '버드나무', kind: 'plant', rewards: [{ item: 'oyster-mushroom', amount: 1 }] },
  sotdae: { name: '솟대', kind: 'obstacle', rewards: [{ item: 'rice-seeds', amount: 1 }] },
  lettuce: { name: '상추', kind: 'plant', rewards: [{ item: 'lettuce', dice: 2 }] },
  chwinamul: { name: '취나물', kind: 'plant', rewards: [{ item: 'chwinamul', dice: 2 }] },
  rabbit: { name: '토끼', kind: 'animal', rewards: [{ item: 'rabbit-fur', dice: 2 }] },
  boar: { name: '멧돼지', kind: 'animal', rewards: [{ item: 'boar-tusk', dice: 2 }] },
  ginseng: { name: '산삼', kind: 'plant', rewards: [{ item: 'ginseng', amount: 1 }] },
  luckyClover: { name: '토끼풀 덤불', kind: 'plant', rewards: [{ item: 'clover', amount: 1 }] },
  rat: { name: '들쥐', kind: 'animal', rewards: [{ item: 'sewer-rat', amount: 1 }] },
  carp: { name: '잉어', kind: 'animal', rewards: [{ item: 'carp', amount: 1 }] },
  altar: { name: '용왕제단', kind: 'obstacle', rewards: [{ item: 'pearl', amount: 1 }] },
  lakeshore: { name: '물가 풀숲', kind: 'plant', rewards: [{ item: 'creek-orchid', dice: 2 }] },
  lantern: { name: '장명등', kind: 'obstacle', rewards: [{ item: 'dokkaebi-flame', amount: 1 }] },
  pondRock: { name: '물길 바위', kind: 'obstacle', rewards: [{ item: 'centipede', amount: 1 }] },
  mossRock: { name: '이끼바위', kind: 'obstacle', rewards: [{ item: 'water-moss', dice: 2 }] },
  spring: { name: '물', kind: 'obstacle', rewards: [{ item: 'lake-water', dice: 2 }] },
  pond: { name: '웅덩이', kind: 'obstacle', rewards: [{ item: 'loofah-fruit', dice: 2 }] },
  graveRock: { name: '혼유석', kind: 'obstacle', rewards: [{ item: 'stone', dice: 5 }] },
  sarcophagus: { name: '봉인된 석관', kind: 'obstacle', rewards: [{ item: 'gogok', dice: 2 }] },
  scentRock: { name: '향로석', kind: 'obstacle', rewards: [{ item: 'whetstone', amount: 1 }] },
  monument: { name: '망주석', kind: 'obstacle', rewards: [{ item: 'polishing-stone', amount: 1 }] },
  animalBones: { name: '동물 유해', kind: 'obstacle', rewards: [{ item: 'bone-fragment', dice: 3 }] },
  bat: { name: '박쥐', kind: 'animal', rewards: [{ item: 'bat-wing', dice: 2 }] },
  starAltar: { name: '제단', kind: 'obstacle', rewards: [{ item: 'starlight', dice: 2 }] },
  crystalPillar: { name: '수정기둥', kind: 'obstacle', rewards: [{ item: 'crystal', amount: 1 }] },
  moonFlower: { name: '달꽃터', kind: 'plant', rewards: [{ item: 'waning-flower', dice: 3 }] },
  stalactite: { name: '종유석', kind: 'obstacle', rewards: [{ item: 'cinnabar', dice: 2 }] },
  stoneGate: { name: '봉인된 석문', kind: 'obstacle', rewards: [{ item: 'web', dice: 2 }] },
}
Object.assign(HUNT_SPECIES, EXTRA_SPECIES)

export const HUNT_BONUSES = {
  plant: { item: 'fine-woodchip', amount: 1 },
  obstacle: { item: 'polishing-stone', dice: 2 },
  animal: { item: 'trap-scraps', amount: 1 },
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
  maxTurns: 30,
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
    { ...point('A3', 'snake', 10), route: clockwiseRoute(0, 2, 2) },
    { ...point('I3', 'fox', 15), route: clockwiseRoute(7, 2, 3) },
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

// 위치는 A~J/1~10 기준. 지도는 각 장소에 독립적인 10×10 판을 사용한다.
const tile = (cell, species, level, routeSize = 0, routeWidth = routeSize) => {
  const p = point(cell, species, level)
  if (routeSize > 0) {
    // 시작 칸을 포함하는 사각형의 가장 가까운 유효 앵커를 찾는다.
    const sx = Math.min(p.x, 10 - routeWidth), sy = Math.min(p.y, 10 - routeSize)
    const path = clockwiseRoute(sx, sy, routeWidth, routeSize)
    p.route = path
  }
  return p
}
const site = (id, name, nodes, ghostName = '산귀신', reward = 20) => ({
  id, path: 'left', name, start: {x:0,y:9}, maxTurns:30, nodes,
  spirit: { ...HUNT_SPECIES.brokenJangseung, species:'brokenJangseung',chance:0.15,level:30 },
  ghost: { chance:0.15,kind:'ghost',name:ghostName,level:2,enemy:{...LEFT_TRAIL_ONE.ghost.enemy,name:ghostName,reward},rewardSpirit:reward },
})
// 길 1 원래 배치를 유지하고, 메모에 추가된 두 번째 산길부터 확장.
const TRAIL_TWO=site('left-trail-2','산길 2',[
  tile('E1','cloverPlant',12),tile('J1','kingMushroom',17),tile('B2','stonePillar',5),tile('G2','deer',15,2,4),
  tile('B3','dandelion',10),tile('F3','dandelion',10),tile('B5','dove',15,3),tile('I5','stonePillar',5),
  tile('F7','mushroom',5),tile('G7','poisonMushroom',10),tile('J7','cloverPlant',12),
  tile('C8','bush',2),tile('E9','deer',15,2,4),
])
const TRAIL_THREE=site('left-trail-3','산길 3',[
  tile('A1','rabbit',20,5),tile('J1','ginseng',22),tile('H2','gravel',16),tile('I2','fern',20),
  tile('H3','fern',20),tile('I3','well',17),tile('G4','azalea',18),tile('F5','azalea',18),
  tile('D6','well',17),tile('E6','lettuce',16),tile('D7','lettuce',16),tile('E7','gravel',16),
  tile('C8','chwinamul',13),tile('B9','chwinamul',13),tile('F6','rabbit',20,5),
])
const TRAIL_FOUR=site('left-trail-4','산길 4',[
  tile('I1','bush',2),tile('J1','luckyClover',25),tile('A2','boar',22,4,3),tile('F2','pineTree',19),
  tile('J2','bush',2),tile('I3','herb',20),tile('D4','willowTree',24),tile('F5','sotdae',18),
  tile('J5','fox',27,3),tile('B6','pineTree',19),tile('G7','herb',20),tile('D8','sotdae',18),
  tile('H10','willowTree',24),
], '목신', 30)
const CEMETERY=site('left-cemetery','묘소',[
  tile('B2','rat',22,8),tile('D3','stoneTower',7),tile('E3','lantern',28),tile('F3','lantern',28),
  tile('G3','stoneTower',7),tile('C4','stoneTower',7),tile('H4','stoneTower',7),
  tile('C5','lantern',28),tile('E5','graveRock',35),tile('F5','sarcophagus',40),tile('H5','lantern',28),
  tile('C6','lantern',28),tile('E6','scentRock',35),tile('F6','monument',35),tile('H6','lantern',28),
  tile('D8','stoneTower',7),tile('G8','stoneTower',7),
], '앙괭이', 50)
const LAKE=site('left-lake','호수',[
  tile('B1','carp',15,4,2),tile('J1','altar',20),tile('E2','lakeshore',16),
  tile('F4','carp',15,4,2),tile('I4','pondRock',14),tile('B6','lakeshore',16),
  tile('D7','mossRock',15),tile('I7','mossRock',15),tile('A8','spring',10),tile('F9','pond',15),
  tile('C10','spring',10),tile('J10','pondRock',14),
], '물귀신', 20)
const CAVE=site('left-cave','동굴',[
  tile('A1','animalBones',30),tile('E1','bat',30,10,1),tile('I1','bat',30,10,1),tile('J1','starAltar',35),
  tile('F2','crystalPillar',27),tile('H2','animalBones',30),tile('B3','moonFlower',27),
  tile('C4','stalactite',23),tile('J5','moonFlower',27),tile('D6','crystalPillar',27),
  tile('G6','stalactite',23),tile('G8','crystalPillar',27),tile('A9','stoneGate',20),
  tile('B9','stoneGate',20),tile('B10','stoneGate',20),tile('J10','stalactite',23),
], '동굴귀', 40)

export const HUNT_PATHS = [
  { id: 'left', name: '뒷산', sites: [
    ...[1,2,3,4].map(n=>({id:`left-trail-${n}`,name:`산길 ${n}`})),
    {id:'left-lake',name:'호수'}, {id:'left-cemetery',name:'묘소'},
    {id:'left-cave',name:'동굴'}, {id:'left-archive',name:'?? 보관소'},
  ]},
]

export const HUNT_SITES = {
  [LEFT_TRAIL_ONE.id]:LEFT_TRAIL_ONE,
  [TRAIL_TWO.id]:TRAIL_TWO,[TRAIL_THREE.id]:TRAIL_THREE,[TRAIL_FOUR.id]:TRAIL_FOUR,
  [LAKE.id]:LAKE,[CEMETERY.id]:CEMETERY,[CAVE.id]:CAVE,
}

/* 구형 길 분할 목록은 v79부터 사용하지 않는다. 아래는 호환용 주석.

  { id: 'left', name: '왼길', last: '동굴' },
  { id: 'center', name: '중앙길', last: '묘소' },
  { id: 'right', name: '오른길', last: '호수' },
].map(path => ({ ...path, sites: [
  ...[1, 2, 3].map(n => ({ id: `${path.id}-trail-${n}`, name: `산길-${n}` })),
  { id: `${path.id}-end`, name: path.last },
] }))

*/

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
