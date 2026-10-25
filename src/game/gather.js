// 채집 시스템 범용 틀. 20분을 기다리면(player.gathering), 정해진 확률표에 따라 무엇을 얼마나 얻었는지가 정해진다.
// 수련·제작·느린 싸움과 같은 '대기 활동' 패턴을 그대로 따른다.
export const GATHER_MINUTES = 20

const d = (n, rng) => 1 + Math.floor(rng() * n) // 1d(n)
const d10 = (rng) => d(10, rng)

/**
 * 채집 확률표. 각 step 은 d10을 한 번 굴려 판정하고, 맞으면 item 을 1d(dice)개 준다.
 * bonus 가 있으면 같은 굴림이 bonus.range 에 들면(주로 '10이 나오면') 대신 bonus 의 아이템을 준다.
 * 모든 step 이 다 빗나가면(아무것도 못 얻으면) fallback 아이템을 하나 준다.
 */
export const GATHER_TABLES = {
  garden: {
    label: '텃밭',
    steps: [
      { range: [1, 5], item: 'snake-berry', name: '뱀딸기', dice: 5 },
      { range: [1, 5], item: 'mugwort', name: '쑥', dice: 3 },
      { range: [1, 5], item: 'clover-leaf', name: '토끼풀', dice: 3, bonus: { range: [10, 10], item: 'clover', name: '네잎클로버', amount: 1 } },
    ],
    fallback: { item: 'fine-woodchip', name: '절묘한 나무조각', amount: 1 },
  },
}

/** 한 지점(spotId)에서 채집을 한 번 굴린다. { items: [{item,name,amount}], text } 를 돌려준다. */
export function rollGather(spotId, rng = Math.random) {
  const table = GATHER_TABLES[spotId]
  if (!table) return { items: [], text: '이곳에서는 아직 채집할 것이 없다.' }
  const items = []
  for (const step of table.steps) {
    const r = d10(rng)
    if (step.bonus && r >= step.bonus.range[0] && r <= step.bonus.range[1]) {
      items.push({ item: step.bonus.item, name: step.bonus.name, amount: step.bonus.amount })
    } else if (r >= step.range[0] && r <= step.range[1]) {
      items.push({ item: step.item, name: step.name, amount: d(step.dice, rng) })
    }
  }
  if (items.length === 0 && table.fallback) {
    items.push({ item: table.fallback.item, name: table.fallback.name, amount: table.fallback.amount })
  }
  const text = items.length
    ? `채집 결과: ${items.map((i) => `[${i.name}] ${i.amount}개`).join(', ')} 를 얻었다.`
    : '채집 결과: 아무것도 얻지 못했다.'
  return { items, text }
}

export function startGather(player, spotId, now = Date.now()) {
  if (player.gathering) return { error: '이미 채집을 하는 중이다.' }
  if (!GATHER_TABLES[spotId]) return { error: '이곳에서는 채집할 수 없다.' }
  return { player: { ...player, gathering: { spotId, startedAt: now, minutes: GATHER_MINUTES } } }
}

export function cancelGather(player) {
  const { gathering: _g, ...rest } = player
  return rest
}

/** 대기가 끝난 채집을 마무리한다. (tickPlayer 에서 호출) */
export function finishGather(player, now = Date.now(), rng = Math.random) {
  const g = player.gathering
  const { gathering: _g, ...rest } = player
  if (!g) return { player: rest, logs: [] }
  const r = rollGather(g.spotId, rng)
  let inv = { ...rest.inventory }
  for (const it of r.items) inv[it.item] = (inv[it.item] || 0) + it.amount
  const table = GATHER_TABLES[g.spotId]
  return { player: { ...rest, inventory: inv }, logs: [`채집(${table?.label ?? g.spotId}): ${r.text}`] }
}
