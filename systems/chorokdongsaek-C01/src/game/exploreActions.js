// v-B.07 탐사 중에 일어나는 일(순수 함수). Game.jsx 의 exploreAct 가 이걸 불러 저장한다.
//  - 대기: 10분을 기다리거나 의지력 5를 써야 결과가 나오는 선택지 (문헌보관소 강제 개봉 · 분석, 도깨비 놀이)
//  - 도깨비들과 놀아주기: 승리 확률 (1d30 + 스탯)%. 이기면 하루 한 번 도깨비 증표 1개.
//  - 볍씨 주머니 열기: 주머니 o개 → o d o 개의 볍씨. (3개면 3d3)
//  - 사당 표지판: 안목 20 이상이면 읽히고, 읽은 뒤부터 [사당 탐사]가 열린다.
import { dayKey } from './scene.js'
import { GOBLIN_TOKEN, ITEMS, countOf } from './items.js'
import { SOMEONES_BAG_ID } from './itemsB17.js'
import { canAddInventory } from './inventoryCapacity.js'
import { canReadSign } from './shrineExplore.js'
import { LOST_KEY } from './itemsB07.js'

export const RICE_POUCH = 'rice-seeds' // 볍씨 주머니
export const RICE_GRAIN = 'rice-grain' // 볍씨
const die = (n, rng) => 1 + Math.floor(rng() * n)

const addItem = (inv, id, n) => {
  const next = { ...inv, [id]: (inv?.[id] || 0) + n }
  if (next[id] <= 0) delete next[id]
  return next
}

/** 기다리기 시작. player.exploreWaits[key] = 끝나는 시각 */
export function startWait(player, key, minutes, now = Date.now()) {
  if (!key || !(minutes > 0)) return { error: '기다릴 수 없다.' }
  if (player.exploreWaits?.[key] > 0) return { error: '이미 기다리는 중이다.' }
  return { player: { ...player, exploreWaits: { ...(player.exploreWaits ?? {}), [key]: now + minutes * 60000 } } }
}

/** 다 기다렸으면 결과를 보러 간다(타이머를 지운다). */
export function claimWait(player, key, now = Date.now()) {
  const until = player.exploreWaits?.[key] ?? 0
  if (!until) return { error: '기다린 적이 없다.' }
  if (until > now) return { error: '아직 기다리는 중이다.' }
  const waits = { ...player.exploreWaits }
  delete waits[key]
  return { player: { ...player, exploreWaits: waits } }
}

/** 의지력을 써서 바로 한다. */
export function spendMp(player, amount) {
  if ((player.mp ?? 0) < amount) return { error: `의지력이 모자란다. (의지력 ${amount} 필요)` }
  return { player: { ...player, mp: (player.mp ?? 0) - amount } }
}

export const goblinTokenToday = (player, now = Date.now()) => player.goblinTokenDay === dayKey(now)

/** 도깨비들과 놀아주기 한 판. { player, win, chance, roll, notice } */
export function goblinPlay(player, { stat }, stats = {}, now = Date.now(), rng = Math.random) {
  const chance = die(30, rng) + (stats[stat] ?? 0)
  const roll = die(100, rng)
  const win = roll <= chance
  let next = player
  let notice = `승리 확률 ${chance}% · 굴림 ${roll}`
  if (win) {
    if (goblinTokenToday(player, now)) notice += ' · 오늘의 도깨비 증표는 이미 받았다.'
    else if (!canAddInventory(player.inventory ?? {}, { [GOBLIN_TOKEN]: 1 })) notice += ' · 소지품이 가득 차 도깨비 증표를 받지 못했다.'
    else {
      next = { ...player, inventory: addItem(player.inventory, GOBLIN_TOKEN, 1), goblinTokenDay: dayKey(now) }
      notice += ' · 도깨비 증표 1개를 받았다!'
    }
  }
  return { player: next, win, chance, roll, notice }
}

/** 볍씨 주머니를 모두 연다. { player, pouches, grains } */
export function openRicePouches(player, rng = Math.random) {
  const o = countOf(player, RICE_POUCH)
  if (o <= 0) return { error: '열어 볼 볍씨 주머니가 없다.' }
  let grains = 0
  for (let i = 0; i < o; i++) grains += die(o, rng)
  const without = addItem(player.inventory, RICE_POUCH, -o)
  if (!canAddInventory(without, { [RICE_GRAIN]: grains })) return { error: '소지품이 가득 차 볍씨를 담을 수 없다.' }
  return { player: { ...player, inventory: addItem(without, RICE_GRAIN, grains) }, pouches: o, grains }
}

/** 볍씨 주머니 o개 에서 n개의 볍씨가 나왔다! */
export const ricePouchText = (o, n) => `볍씨 주머니 ${o}개 에서 ${n}개의 볍씨가 나왔다!`

/** 사당 표지판을 읽는다. 읽을 수 있으면 [사당 탐사]가 열린다. { player, read, first } */
export function readShrineSign(player, stats = {}) {
  if (!canReadSign(stats)) return { player, read: false, first: false }
  if (player.shrineSignRead) return { player, read: true, first: false }
  return { player: { ...player, shrineSignRead: true }, read: true, first: true }
}

/** 다른 학년 물품보관소를 몰래 열어볼 수 있는가 */
export const hasLostKey = (player) => countOf(player, LOST_KEY) > 0

// ───────── v-B.18 열쇠 · 누군가의 가방 ─────────
/** 다른 학년 물품보관소를 열쇠로 연다: 열쇠 1개가 사라지고 [누군가의 가방] 1개. { player } 또는 { error } */
export function sneakLocker(player) {
  if (!hasLostKey(player)) return { error: '쓸만한 도구가 없다. 이 자물쇠를 열 만한 무언가가 있다면…' }
  const inv = { ...(player.inventory ?? {}) }
  inv[LOST_KEY] -= 1
  if (inv[LOST_KEY] <= 0) delete inv[LOST_KEY]
  if (!canAddInventory(inv, { [SOMEONES_BAG_ID]: 1 })) return { error: '소지품이 가득 차 아무것도 꺼낼 수 없다.' }
  inv[SOMEONES_BAG_ID] = (inv[SOMEONES_BAG_ID] || 0) + 1
  return { player: { ...player, inventory: inv } }
}
/** [누군가의 가방]에서 나올 수 있는 것: 모든 완성품 + 쓰레기 */
export const SOMEONES_BAG_POOL = () => ITEMS.filter((it) => (it.tags?.includes('완성품') || it.id === 'trash') && it.id !== SOMEONES_BAG_ID && !it.id.includes('#')).map((it) => it.id)
/** [누군가의 가방]을 연다: 가방 1개가 사라지고 무작위 완성품 하나. { player, got } 또는 { error } */
export function openSomeonesBag(player, rng = Math.random) {
  if (countOf(player, SOMEONES_BAG_ID) < 1) return { error: '누군가의 가방이 없다.' }
  const pool = SOMEONES_BAG_POOL()
  const got = pool[Math.floor(rng() * pool.length)]
  const inv = { ...(player.inventory ?? {}) }
  inv[SOMEONES_BAG_ID] -= 1
  if (inv[SOMEONES_BAG_ID] <= 0) delete inv[SOMEONES_BAG_ID]
  if (!canAddInventory(inv, { [got]: 1 })) return { error: '소지품이 가득 차 가방을 열 수 없다. 빈 칸을 만든 뒤 열어 주세요.' }
  inv[got] = (inv[got] || 0) + 1
  return { player: { ...player, inventory: inv }, got }
}
