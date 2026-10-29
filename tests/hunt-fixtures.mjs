// Test-only balance/placement data. These names and levels do not claim to be the sheet's notes.
import { LEFT_TRAIL_ONE, clockwiseRoute } from '../src/game/huntSites.js'

export const stats = value => ({ insight: value, aggression: value, endurance: value, control: value, agility: value, comprehension: value })
export const player = () => ({ stats: stats(10), hp: 100, hpMax: 100, mp: 100, mpMax: 100, spirit: 100, money: 50, inventory: {} })
export function fixtureSite(overrides = {}) {
  const species = ['snakeBerry', 'mushroom', 'poisonMushroom', 'mugwort', 'mugwort', 'mushroom', 'snakeBerry', 'stoneTower', 'stonePillar', 'stonePillar', 'bush', 'snake', 'fox']
  return {
    ...LEFT_TRAIL_ONE, maxTurns: 80,
    nodes: LEFT_TRAIL_ONE.nodes.map((node, index) => ({
      ...node, species: species[index], level: 17,
      ...(node.kind === 'animal' ? { route: clockwiseRoute(0, node.x === 0 ? 2 : 1, node.x === 0 ? 4 : 9) } : {}),
    })),
    spirit: { ...LEFT_TRAIL_ONE.spirit, level: 20, rewards: [{ item: 'fine-woodchip', amount: 1 }] },
    ...overrides,
  }
}
