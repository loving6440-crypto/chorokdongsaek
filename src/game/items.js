/**
 * 아이템 정의. 재화 단위는 '냥'.
 *
 * ★ 아이템을 새로 추가할 때:
 *   1) 아래 ITEMS 에 항목만 넣으면 된다. (id · name · desc · kind 는 꼭)
 *   2) 아이콘은 자동으로 붙는다. 플랫 디자인 원형 아이콘이 kind 에 맞춰 만들어진다.
 *      마음에 드는 그림으로 바꾸고 싶으면 src/components/ItemIcon.jsx 의 CUSTOM_ICONS 에 같은 id 로 그려 넣는다.
 *   3) 도감(src/game/codex.js)에는 ITEMS 가 그대로 올라간다. 설명(desc)이 도감 설명이다.
 *
 * price: 숫자이면 기숙사 매점에서 판다. 없으면(null) 아직 파는 곳이 정해지지 않은 아이템.
 * kind: 'food' 먹는 것 · 'drink' 마시는 것 · 'material' 재료 · 'tool' 도구
 * tags: 화면에 칩으로 붙는 분류. ('재료', '완성품', '선물' ...) 재료/완성품은 아래 ITEMS 에서 자동으로 붙는다.
 * battle: 전투 중 사용 가능하다고 명시된 것만 true. (tags 에 '전투 중 사용 가능' 칩도 함께 붙인다.) (전투 중엔 턴·상황과 상관없이 언제든 쓸 수 있고, 써도 내 턴이 끝나지 않는다.)
 * only: 'battle' 이면 전투 중에만 쓸 수 있다.  party: 일행(파티) 상태에서만 쓸 수 있다.
 */
export const START_MONEY = 50

const RAW_ITEMS = [
  {
    id: 'picnic',
    kind: 'drink',
    name: '사과맛 피크닉',
    price: 5,
    desc: '평범한 사과맛 피크닉, 독은 들어있지 않다. 전투중에 마셔도 목에 걸리지 않는다.',
    tags: ['전투 중 사용 가능'],
    effectText: '의지력 +10',
    effect: { mp: 10 },
    battle: true,
  },
  {
    id: 'chocolate',
    kind: 'food',
    name: '가나다 초콜릿',
    price: 8,
    desc: '탈지분유 맛이 난다. 크래커 과자에 껴먹는게 요즘의 소소한 유행이다.',
    effectText: '의지력 +20',
    effect: { mp: 20 },
    battle: false,
  },
  {
    id: 'ramen',
    kind: 'food',
    name: '컵라면',
    price: 8,
    desc: '급식이 맛없을 때면 금방 재고가 떨어진다. 미리미리 사두는 사람들도 있으니 참고할 것.',
    effectText: '체력 +20',
    effect: { hp: 20 },
    battle: false,
  },
  {
    id: 'dumpling',
    kind: 'food',
    name: '만두',
    price: 12,
    desc: '고기만두로 통일됐다. 김치만두를 원한다면 매점 주인에게 문의해보자.',
    effectText: '체력 +30',
    effect: { hp: 30 },
    battle: false,
  },
  {
    id: 'chewy',
    kind: 'food',
    name: '마이쭈',
    price: 5,
    desc: '친해지고 싶은 친구에게 나눠주자. 혼자 먹어도 좋고.',
    tags: ['전투 중 사용 가능'],
    effectText: '일행(파티) 상태일 때 파티원에게 나눠주면 일시적으로 공격력을 올려준다. 1턴에 한해 2배. (전투 중에 직접 먹으면 내 다음 행동의 피해가 1턴 동안 2배가 된다.)',
    effect: { boost: true },
    battle: true,
    party: true,
  },
  {
    id: 'energy',
    kind: 'drink',
    name: '에너지드링크',
    price: 20,
    desc: '날개를 달아줘요. 어쩐지 죽어도 죽지 않을 것 같다.',
    tags: ['전투 중 사용 가능'],
    effectText:
      '1회에 한하여 전투불능 패널티 없이, 또한 전투를 종료하지 않고 HP1로 부활시킨다. 의지력은 회복되지 않는다. 전투불능이 되기 전 미리 먹어둬야 효과가 바로 발휘되며, 전투불능 이후에는 사용할 수 없다.',
    effect: { revive: true },
    battle: true,
    only: 'battle',
  },
  // ───────── 재료 · 먹을거리 (아직 어디서 나오는지는 정해지지 않았다) ─────────
  {
    id: 'dove-feather',
    kind: 'material',
    tags: ['재료'],
    name: '멧비둘기 깃털',
    price: null,
    desc: '고개를 둘러보니 빈 둥지가 있었다. 새들이 떠난 걸까?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'raccoon-claw',
    kind: 'material',
    tags: ['재료'],
    name: '너구리 발톱',
    price: null,
    desc: '나무에 박혀있었다. 발톱을 갈다가 빠진 거면 다행일 텐데.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'deer-tooth',
    kind: 'material',
    tags: ['재료'],
    name: '고라니 이빨',
    price: null,
    desc: '이갈이라도 한 건가?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'snake-skin',
    kind: 'material',
    tags: ['재료'],
    name: '뱀 허물',
    price: null,
    desc: '뒷산에 뱀이 나와 새알을 죄다 먹어치웠다고 애들이 떠들고 다녔다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'fox-fur',
    kind: 'material',
    tags: ['재료'],
    name: '여우 꼬리털',
    price: null,
    desc: '부드럽고 폭신하다. 뒷산에 여우도 나온다고?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'mugwort',
    kind: 'material',
    tags: ['재료'],
    name: '쑥',
    price: null,
    desc: '가끔 근처 사시는 어르신들이 뒷산에 몰래 들어와서 캐다가 경비원 아저씨에게 잡혀 나가시곤 한다. 정확히 효과가 있어 이곳저곳에 쓰인다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'snake-berry',
    kind: 'food',
    tags: [],
    name: '뱀딸기',
    price: null,
    desc: '먹어도 죽지는 않지만 맛은 없다. 진짜 먹게?',
    effectText: '의지력 +1',
    effect: { mp: 1 },
    battle: false,
  },
  {
    id: 'ginseng-candy',
    kind: 'food',
    tags: [],
    name: '홍삼사탕',
    price: null,
    desc: '가끔 선생님들이 나눠주신다. 시판용과는 묘하게 다른 느낌이 든다. 왜일까?',
    effectText: '의지력 +20',
    effect: { mp: 20 },
    battle: false,
  },
  {
    id: 'charm-scrap',
    kind: 'material',
    tags: ['재료'],
    name: '부적 조각',
    price: null,
    desc: '정체불명의 부적 조각, 오래되어 바스라지기 일보 직전이다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'crumpled-hanji',
    kind: 'material',
    tags: ['재료'],
    name: '구겨진 한지',
    price: null,
    desc: '오래됐고, 낡았고, 누리끼리하지만 튼튼하다. 뭐라도 적어보는 건 어때?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'broken-inkstick',
    kind: 'material',
    tags: ['재료', '선물'],
    name: '부러진 먹',
    price: null,
    desc: '손은 더러워질 것 같지만 아직 쓸 수 있다. 이 학교 다니면서 먹 하나 못 가는 건 아니지?',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'split-brush',
    kind: 'material',
    tags: ['재료'],
    name: '갈라진 붓',
    price: null,
    desc: '관리가 엉망으로 된 건지 갈라졌다. 사용 자체는 가능해보인다.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'jangseung-piece',
    kind: 'material',
    tags: ['재료'],
    name: '장승 조각',
    price: null,
    desc: '옛날에는 영험했을지도 모른다. 지금은 나무토막일 뿐이지만.',
    effectText: '',
    effect: {},
    battle: false,
  },
  {
    id: 'five-color-thread',
    kind: 'material',
    tags: ['재료'],
    name: '오색실',
    price: null,
    desc: '결계를 만드는 데 사용되는 재료. 삐끗하면 엉켜버린다.',
    effectText: '',
    effect: {},
    battle: false,
  },
]

/**
 * 분류 태그: [완성품] 바로 사용할 수 있는 아이템 / [재료] 다른 것의 재료로 쓰이는 것. 둘 다 붙을 수도 있다.
 * tags 에 둘 중 하나라도 직접 적어 두면 그대로 따르고, 안 적으면 kind 로 정한다. (재료 kind → [재료], 그 밖 → [완성품])
 */
export const CAT_ITEM = '완성품'
export const CAT_MATERIAL = '재료'
export const ITEMS = RAW_ITEMS.map((it) => {
  const tags = it.tags ?? []
  if (tags.includes(CAT_ITEM) || tags.includes(CAT_MATERIAL)) return it
  return { ...it, tags: [it.kind === 'material' ? CAT_MATERIAL : CAT_ITEM, ...tags] }
})

export const itemOf = (id) => ITEMS.find((i) => i.id === id)
/** 매점에서 파는 아이템 (price 가 있는 것) */
export const STORE_ITEMS = ITEMS.filter((i) => i.price != null)
export const isMaterial = (item) => item.kind === 'material'

/** 매점 영업시간: 오전 8시 ~ 밤 10시 (기기의 현재 시각 기준). 지금은 enforce:false 라 늘 열려 있다. true 로 바꾸면 영업시간에만 연다. */
export const STORE_HOURS = { enforce: false, open: 8, close: 22 }
export const isStoreOpen = (now = Date.now()) => {
  if (!STORE_HOURS.enforce) return true
  const h = new Date(now).getHours()
  return h >= STORE_HOURS.open && h < STORE_HOURS.close
}

export const countOf = (player, id) => player.inventory?.[id] || 0

/** 지금 이 아이템을 쓸 수 있는가. { ok, why } */
export function canUseItem(item, { inBattle, countNow, reviveOn, boostOn }) {
  if (!countNow) return { ok: false, why: '갖고 있지 않다' }
  if (isMaterial(item)) return { ok: false, why: '재료 아이템이다. 직접 쓰는 물건이 아니다' }
  if (item.party && !inBattle) return { ok: false, why: '일행(파티) 상태에서만 쓸 수 있다' }
  if (inBattle && !item.battle) return { ok: false, why: '전투 중에는 쓸 수 없다' }
  if (item.only === 'battle' && !inBattle) return { ok: false, why: '전투 중에만 쓸 수 있다' }
  if (item.effect.revive && reviveOn) return { ok: false, why: '이미 효과가 걸려 있다' }
  if (item.effect.boost && boostOn) return { ok: false, why: '이미 효과가 걸려 있다' }
  return { ok: true }
}
