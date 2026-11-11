// 좌표는 사진 기준 0부터 센다. x=열(A~J), y=행(1~10).
// 출처: Google 시트 '채집 터' (gid=1845354668)의 셀 메모.
// 쑥 13레벨, 최대 20턴, 영물·산귀신 설정은 사용자가 추가로 지정한 값이다.
import { TRAIL_SPECIES, TRAILS } from './huntTrails.js'
import { enemyById } from './battle.js'

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
  stoneTower: { name: '돌탑', kind: 'obstacle', rewards: [{ item: 'stone', dice: 2, plus: 1 }] }, // 시트: 바위 1d2+1
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
  mossRock: { name: '이끼바위', kind: 'plant', rewards: [{ item: 'water-moss', dice: 2 }] }, // 시트 ♣
  spring: { name: '물', kind: 'obstacle', rewards: [{ item: 'lake-water', dice: 2 }] },
  pond: { name: '웅덩이', kind: 'plant', rewards: [{ item: 'loofah-fruit', dice: 2 }] }, // 시트 ♣
  graveRock: { name: '혼유석', kind: 'obstacle', rewards: [{ item: 'stone', dice: 5 }, { item: 'sealing-stone', chance: 0.10, amount: 1 }] },
  sarcophagus: { name: '봉인된 석관', kind: 'obstacle', rewards: [{ item: 'gold-crown', chance: 0.05, amount: 1 }, { item: 'gogok', chance: 0.10, dice: 2 }] },
  scentRock: { name: '향로석', kind: 'obstacle', rewards: [{ item: 'whetstone', amount: 1 }, { item: 'sealing-stone', chance: 0.10, amount: 1 }] },
  monument: { name: '망주석', kind: 'obstacle', rewards: [{ item: 'polishing-stone', amount: 1 }, { item: 'sealing-stone', chance: 0.10, amount: 1 }] },
  soulButterfly: { name: '혼백나비', kind: 'spirit', rewards: [{ item: 'spirit-orb', amount: 1 }] },
  animalBones: { name: '동물 유해', kind: 'obstacle', rewards: [{ item: 'bone-fragment', dice: 3 }] },
  bat: { name: '박쥐', kind: 'animal', rewards: [{ item: 'bat-wing', dice: 2 }] },
  starAltar: { name: '제단', kind: 'obstacle', rewards: [{ item: 'starlight', dice: 2 }] },
  crystalPillar: { name: '수정기둥', kind: 'obstacle', rewards: [{ item: 'crystal', amount: 1 }] },
  // 시트: 개척 시간이 오전(00~12시, KST)이면 그믐꽃 1d3, 오후(12~24시)면 초승꽃 1d3
  moonFlower: { name: '달꽃터', kind: 'plant', rewards: [{ item: 'waning-flower', am: 'waning-flower', pm: 'crescent-flower', dice: 3 }] },
  stalactite: { name: '종유석', kind: 'obstacle', rewards: [{ item: 'cinnabar', dice: 2 }] },
  stoneGate: { name: '봉인된 석문', kind: 'obstacle', rewards: [{ item: 'web', dice: 2 }] },
  // v79.0.7: 시트 [개척 터] 장소 메모의 영물
  blueDeer: { name: '청록사슴', kind: 'spirit', rewards: [{ item: 'antler', dice: 3 }] },
  imugi: { name: '이무기', kind: 'spirit', rewards: [{ item: 'imugi-scale', amount: 1 }] },
  darkSpirit: { name: '암령', kind: 'spirit', rewards: [{ item: 'darkness', dice: 3 }] },
}
Object.assign(HUNT_SPECIES, EXTRA_SPECIES)
// v-B.05: 산길 5~20 의 식물·장애물·동물·영물 47종 (huntTrails.js)
for (const [k, v] of Object.entries(TRAIL_SPECIES)) if (!HUNT_SPECIES[k]) HUNT_SPECIES[k] = v

export const HUNT_BONUSES = {
  plant: { item: 'fine-woodchip', amount: 1 },
  obstacle: { item: 'pebble', dice: 2 }, // v-B.06: 연마석 1d2 → 자갈돌 1d2 (연마석은 이제 공작소에서 만든다)
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
    // 시트 K5: 너구리 15레벨, 3×3 왼쪽(반시계)으로 돌기
    { ...point('J3', 'raccoon', 15), route: counterClockwiseRoute(7, 2, 3) },
  ],
  // 입장 시 독립적으로 한 번씩 판정. 위치는 비어 있는 흰 타일 중 무작위.
  spirit: { ...HUNT_SPECIES.brokenJangseung, species: 'brokenJangseung', chance: 0.2, level: 30 },
  ghost: {
    chance: 0.2, kind: 'ghost', name: '산귀신', level: 2,
    // 기존 원귀의 저주 패턴, 능력치는 2단계 먹구렁이 기준(평균 스탯 5~6).
    // 일반 퇴마 실습 목록에는 추가하지 않으며 영력 20만 별도 지급한다.
    enemy: { id: 'mountain-ghost', name: '산귀신', tier: 2, partySize: 1, hp: 90, atk: 10, act: 9, spirit: 8, reward: 20,
      curse: true, special: { label: '원한의 저주', note: '세 번의 상대 턴 동안 매번 피해가 스며든다.' } },
    rewardSpirit: 20,
    rewardItems: [{ item: 'charm-scrap', chance: 0.5, amount: 1 }],
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
// 요괴 능력치: 시트의 '평균 스탯'을 기존 같은 단계 적의 능력치에 맞춘 값.
//  5~6 → 먹구렁이(90/10/9/8), 8~10 → 묵은 원귀(130/15/14/13), 15~17 → 중간값(180/18/17/17), 20~22 → 앙괭이(220/21/21/21)
const GHOST_STATS = {
  2: { hp: 90, atk: 10, act: 9, spirit: 8 },
  3: { hp: 130, atk: 15, act: 14, spirit: 13 },
  4: { hp: 180, atk: 18, act: 17, spirit: 17 },
  5: { hp: 220, atk: 21, act: 21, spirit: 21 },
}
const ghostOf = ({ id, name, level, reward, items }) => ({
  chance: 0.15, kind: 'ghost', name, level,
  enemy: { id, name, tier: level, partySize: 1, ...GHOST_STATS[level], reward, curse: true,
    special: { label: '원한의 저주', note: '세 번의 상대 턴 동안 매번 피해가 스며든다.' } },
  rewardSpirit: reward,
  rewardItems: items,
})
const spiritOf = (species, level) => ({ ...HUNT_SPECIES[species], species, chance: 0.15, level })
// 시트 [개척 터] 장소 메모 기준 랜덤 인카운터
const ENCOUNTERS = {
  trail: { spirit: spiritOf('brokenJangseung', 30), ghost: ghostOf({ id: 'mountain-ghost', name: '산귀신', level: 2, reward: 20, items: [{ item: 'charm-scrap', chance: 0.5, amount: 1 }] }) },
  deepTrail: { spirit: spiritOf('blueDeer', 50), ghost: ghostOf({ id: 'tree-spirit', name: '목신', level: 3, reward: 30, items: [{ item: 'charm-scrap', chance: 0.5, dice: 3 }] }) },
  cemetery: { spirit: spiritOf('soulButterfly', 100), ghost: ghostOf({ id: 'ang-gwaengi', name: '앙괭이', level: 5, reward: 50, items: [{ item: 'silver-inlay', chance: 0.5, amount: 1 }] }) },
  lake: { spirit: spiritOf('imugi', 40), ghost: ghostOf({ id: 'water-ghost', name: '물귀신', level: 2, reward: 20, items: [{ item: 'charm-scrap', chance: 0.5, amount: 1 }] }) },
  cave: { spirit: spiritOf('darkSpirit', 100), ghost: ghostOf({ id: 'eodukssini', name: '어둑시니', level: 4, reward: 40, items: [{ item: 'charm-scrap', chance: 0.5, dice: 3, plus: 1 }] }) },
}
const site = (id, name, nodes, encounter) => ({
  id, path: 'left', name, start: {x:0,y:9}, maxTurns:30, nodes, ...ENCOUNTERS[encounter],
})
// 길 1 원래 배치를 유지하고, 메모에 추가된 두 번째 산길부터 확장.
const TRAIL_TWO=site('left-trail-2','산길 2',[
  tile('E1','cloverPlant',12),tile('J1','kingMushroom',17),tile('B2','stonePillar',5),tile('G2','deer',15,2,4),
  tile('B3','dandelion',10),tile('F3','dandelion',10),tile('B5','dove',15,3),tile('I5','stonePillar',5),
  tile('F7','mushroom',5),tile('G7','poisonMushroom',10),tile('J7','cloverPlant',12),
  tile('C8','bush',2),tile('E9','deer',15,2,4),
], 'trail')
const TRAIL_THREE=site('left-trail-3','산길 3',[
  tile('A1','rabbit',20,5),tile('J1','ginseng',22),tile('H2','gravel',16),tile('I2','fern',20),
  tile('H3','fern',20),tile('I3','well',17),tile('G4','azalea',18),tile('F5','azalea',18),
  tile('D6','well',17),tile('E6','lettuce',16),tile('D7','lettuce',16),tile('E7','gravel',16),
  tile('C8','chwinamul',13),tile('B9','chwinamul',13),tile('F6','rabbit',20,5),
], 'deepTrail')
const TRAIL_FOUR=site('left-trail-4','산길 4',[
  tile('I1','bush',2),tile('J1','luckyClover',25),tile('A2','boar',22,4,3),tile('F2','pineTree',19),
  tile('J2','bush',2),tile('I3','herb',20),tile('D4','willowTree',24),tile('F5','sotdae',18),
  // 시트 V19: 여우 27레벨, 3×3을 S자로 돌고 다시 원래 자리로 돌아가기를 반복
  { ...point('J5','fox',27), route: snakeRoute(9, 4, 3) },tile('B6','pineTree',19),tile('G7','herb',20),tile('D8','sotdae',18),
  tile('H10','willowTree',24),
], 'deepTrail')
const CEMETERY=site('left-cemetery','묘소',[
  tile('B2','rat',22,8),tile('D3','stoneTower',7),tile('E3','lantern',28),tile('F3','lantern',28),
  tile('G3','stoneTower',7),tile('C4','stoneTower',7),tile('H4','stoneTower',7),
  tile('C5','lantern',28),tile('E5','graveRock',35),tile('F5','sarcophagus',40),tile('H5','lantern',28),
  tile('C6','lantern',28),tile('E6','scentRock',35),tile('F6','monument',35),tile('H6','lantern',28),
  tile('C7','stoneTower',7),tile('H7','stoneTower',7),
  tile('D8','stoneTower',7),tile('E8','lantern',28),tile('F8','lantern',28),tile('G8','stoneTower',7),
], 'cemetery')
const LAKE=site('left-lake','호수',[
  tile('B1','carp',15,4,2),tile('J1','altar',20),tile('E2','lakeshore',16),
  tile('F4','carp',15,4,2),tile('I4','pondRock',14),tile('B6','lakeshore',16),
  tile('D7','mossRock',15),tile('I7','mossRock',15),tile('A8','spring',10),tile('F9','pond',15),
  tile('C10','spring',10),tile('J10','pondRock',14),
], 'lake')
const CAVE=site('left-cave','동굴',[
  tile('A1','animalBones',30),tile('E1','bat',30,10,1),tile('I1','bat',30,10,1),tile('J1','starAltar',35),
  tile('F2','crystalPillar',27),tile('H2','animalBones',30),tile('B3','moonFlower',27),
  tile('C4','stalactite',23),tile('J5','moonFlower',27),tile('D6','crystalPillar',27),
  tile('G6','stalactite',23),tile('G8','crystalPillar',27),tile('A9','stoneGate',20),
  tile('B9','stoneGate',20),tile('B10','stoneGate',20),tile('J10','stalactite',23),
], 'cave')

// v-B.05: 산길 5~20 — huntTrails.js 의 데이터로 터를 만든다. 영물이 둘(귀한 15% · 흔한 20%)이라 spirits 배열을 쓴다.
const routeOf = (cell, [type, a, b]) => {
  const x = cell.charCodeAt(0) - 65, y = Number(cell.slice(1)) - 1
  if (type === 'rect' || type === 'ccw') {
    const sx = Math.min(x, 10 - b), sy = Math.min(y, 10 - a)
    return type === 'rect' ? clockwiseRoute(sx, sy, b, a) : counterClockwiseRoute(sx, sy, b, a)
  }
  if (type === 'snake') return snakeRoute(x, y, a)
  if (type === 'line') return b === 'v' ? clockwiseRoute(x, Math.min(y, 10 - a), 1, a) : clockwiseRoute(Math.min(x, 10 - a), y, a, 1)
  throw new Error(`알 수 없는 이동 경로: ${type}`)
}
const bestiaryGhost = ({ id, items }) => {
  const enemy = enemyById(id)
  return { chance: 0.15, kind: 'ghost', name: enemy.name, level: enemy.tier ?? 3, enemy, rewardSpirit: Math.min(500, enemy.spirit * 2), rewardItems: items }
}
const trailSite = (t) => {
  const spirits = t.spirits.map(([species, level, chance]) => ({ ...spiritOf(species, level), chance }))
  return {
    id: `left-trail-${t.n}`, path: 'left', name: `산길 ${t.n}`, theme: t.theme, note: t.note, targetStat: t.S,
    start: { x: 0, y: 9 }, maxTurns: 30,
    nodes: t.nodes.map(([cell, species, level, route]) => (route ? { ...point(cell, species, level), route: routeOf(cell, route) } : point(cell, species, level))),
    spirits,
    spirit: spirits[0], // 예전 코드(한 마리만 보는 곳)를 위한 대표 영물
    ghost: bestiaryGhost(t.ghost),
  }
}
export const TRAIL_SITES = TRAILS.map(trailSite)

export const HUNT_PATHS = [
  { id: 'left', name: '뒷산', sites: [
    ...[1,2,3,4].map(n=>({id:`left-trail-${n}`,name:`산길 ${n}`})),
    ...TRAIL_SITES.map((t) => ({ id: t.id, name: t.name })),
    {id:'left-lake',name:'호수'}, {id:'left-cemetery',name:'묘소'},
    {id:'left-cave',name:'동굴'}, {id:'left-archive',name:'?? 보관소'},
  ]},
]

export const HUNT_SITES = {
  [LEFT_TRAIL_ONE.id]:LEFT_TRAIL_ONE,
  [TRAIL_TWO.id]:TRAIL_TWO,[TRAIL_THREE.id]:TRAIL_THREE,[TRAIL_FOUR.id]:TRAIL_FOUR,
  [LAKE.id]:LAKE,[CEMETERY.id]:CEMETERY,[CAVE.id]:CAVE,
  ...Object.fromEntries(TRAIL_SITES.map((t) => [t.id, t])),
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
  for (const sp of site.spirits ?? (site.spirit ? [site.spirit] : [])) if (sp.chance > 0 && (!Number.isFinite(sp.level) || sp.level < 1 || !sp.rewards?.length)) missing.push('영물 적정 레벨·보상')
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

/** 반시계 방향 사각 테두리(시계 방향 경로를 뒤집은 것). */
export function counterClockwiseRoute(x, y, width, height = width) {
  const route = clockwiseRoute(x, y, width, height)
  return [route[0], ...route.slice(1).reverse()]
}

/**
 * S자 왕복 경로. (sx, sy)에서 시작해 size×size 칸을 지그재그로 훑은 뒤 같은 길로 되돌아온다.
 * 같은 칸이 두 번 나오므로 이동은 routeIndex(경로상의 순번)로 추적한다.
 */
export function snakeRoute(sx, sy, size) {
  const forward = []
  const leftward = sx + size > HUNT_SIZE // 오른쪽 끝에서 시작하면 왼쪽으로 훑는다
  for (let row = 0; row < size; row++) {
    const cols = Array.from({ length: size }, (_, i) => (leftward ? sx - i : sx + i))
    if (row % 2) cols.reverse()
    for (const x of cols) forward.push({ x, y: sy + row })
  }
  return [...forward, ...forward.slice(1, -1).reverse()]
}
