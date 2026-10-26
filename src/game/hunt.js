// 수렵 시스템(산 탐색). 채집과 마찬가지로 20분을 기다리면 결과가 정해진다.
// 1d10을 굴려 조우할 상대를 정하고, 보상을 얻는다.
// [이해]가 상대의 영력보다 높으면 전투를 생략하고, 상대의 영력만큼 내 영력을 소모한 채 보상을 바로 받는다.
// 지금은 왼길만 구현돼 있다. 중앙길·오른길은 앞으로 각자 다른 조우표로 채워 넣을 자리다.
export const HUNT_MINUTES = 20

const d = (n, rng) => 1 + Math.floor(rng() * n) // 1d(n)

/** 수렵 상대(야생 동물). hp/atk/act/spirit 은 전투 시의 능력치, spirit 은 생략(간파) 판정의 기준이기도 하다. */
export const HUNT_ENEMIES = {
  wildFox: {
    name: '야생 여우',
    hp: 40,
    atk: 5,
    act: 7,
    spirit: 5,
    reward: { spirit: 5, items: [{ item: 'fox-fur', name: '여우 꼬리털', amount: 1 }] },
    winText: '여우를 마구 복실하게 만들어줬다! 저러다 꼬리가 홀쭉해지지 않으면 다행인데.',
  },
  wildSnake: {
    name: '야생 뱀',
    hp: 35,
    atk: 6,
    act: 5,
    spirit: 3,
    reward: { spirit: 3, items: [{ item: 'snake-skin', name: '뱀 허물', dice: 2 }] },
    winText: '산뱀은 체감상 하루종일 허물을 벗고 있는 것 같다.',
  },
  wildDeer: {
    name: '야생 고라니',
    hp: 45,
    atk: 7,
    act: 6,
    spirit: 3,
    reward: { spirit: 3, items: [{ item: 'deer-tooth', name: '고라니 이빨', dice: 2 }] },
    winText: '신명나게 이갈이를 했으니 당분간 고함을 지르지 않을지도 모른다. 그럴까? 그래줬으면 좋겠는데.',
  },
  wildRaccoon: {
    name: '야생 너구리',
    hp: 38,
    atk: 5,
    act: 6,
    spirit: 2,
    reward: { items: [{ item: 'raccoon-claw', name: '너구리 발톱', dice: 3 }] },
    winText: '나무를 박박 긁던 발톱 몇 개가 부러졌다. 사실 저 중 몇 개는 당신도 긁었다.',
  },
}

/** 길(path)별 조우표. d10 굴림 → 상대. */
export const HUNT_TABLES = {
  left: {
    label: '왼길',
    rolls: [
      { range: [1, 1], enemy: 'wildFox' },
      { range: [2, 3], enemy: 'wildSnake' },
      { range: [4, 6], enemy: 'wildDeer' },
      { range: [7, 9], enemy: 'wildRaccoon' },
      { range: [10, 10], enemy: 'wildFox' },
    ],
  },
}

function rollEncounter(pathId, rng) {
  const table = HUNT_TABLES[pathId]
  if (!table) return null
  const r = d(10, rng)
  const hit = table.rolls.find((s) => r >= s.range[0] && r <= s.range[1])
  return hit ? HUNT_ENEMIES[hit.enemy] : null
}

export function startHunt(player, pathId, now = Date.now()) {
  if (player.gathering || player.hunting) return { error: '이미 다른 일로 바쁘다.' }
  if (!HUNT_TABLES[pathId]) return { error: '이 길에서는 아직 수렵할 수 없다.' }
  return { player: { ...player, hunting: { pathId, startedAt: now, minutes: HUNT_MINUTES } } }
}

export function cancelHunt(player) {
  const { hunting: _h, ...rest } = player
  return rest
}

/** 대기가 끝난 수렵을 마무리한다. (tickPlayer 에서 호출) */
export function finishHunt(player, now = Date.now(), rng = Math.random) {
  const h = player.hunting
  const { hunting: _h, ...rest } = player
  if (!h) return { player: rest, logs: [] }
  const enemy = rollEncounter(h.pathId, rng)
  if (!enemy) return { player: rest, logs: ['수렵: 아무 기척도 느끼지 못했다.'] }

  const comp = rest.stats?.comprehension ?? 0
  const skip = comp > enemy.spirit // 간파: [이해]가 상대의 영력보다 높으면 전투 없이 제압한다.
  let spirit = rest.spirit ?? 0
  if (skip) spirit = Math.max(0, spirit - enemy.spirit)

  let inv = { ...rest.inventory }
  const gained = []
  for (const it of enemy.reward.items ?? []) {
    const amount = it.dice ? d(it.dice, rng) : it.amount ?? 1
    inv[it.item] = (inv[it.item] || 0) + amount
    gained.push(`[${it.name}] ${amount}개`)
  }
  const spiritGain = enemy.reward.spirit ?? 0
  if (spiritGain) {
    spirit += spiritGain
    gained.push(`영력 +${spiritGain}`)
  }

  const text = `수렵: ${enemy.name}와 조우${skip ? ' → 간파하여 전투 없이 제압' : ' → 승리'}. ${enemy.winText} (${gained.join(', ') || '얻은 것 없음'})`
  return { player: { ...rest, inventory: inv, spirit }, logs: [text] }
}
