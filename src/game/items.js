/**
 * 아이템 정의. 재화 단위는 '냥'.
 * battle: 전투 중 사용 가능하다고 명시된 것만 true. (전투 중엔 턴·상황과 상관없이 언제든 쓸 수 있고, 써도 내 턴이 끝나지 않는다.)
 * only: 'battle' 이면 전투 중에만 쓸 수 있다.  party: 일행(파티) 상태에서만 쓸 수 있다.
 */
export const START_MONEY = 50

export const ITEMS = [
  {
    id: 'picnic',
    name: '사과맛 피크닉',
    price: 5,
    desc: '평범한 사과맛 피크닉, 독은 들어있지 않다. 전투중에 마셔도 목에 걸리지 않는다.',
    effectText: '의지력 +10',
    effect: { mp: 10 },
    battle: true,
  },
  {
    id: 'chocolate',
    name: '가나다 초콜릿',
    price: 8,
    desc: '탈지분유 맛이 난다. 크래커 과자에 껴먹는게 요즘의 소소한 유행이다.',
    effectText: '의지력 +20',
    effect: { mp: 20 },
    battle: false,
  },
  {
    id: 'ramen',
    name: '컵라면',
    price: 8,
    desc: '급식이 맛없을 때면 금방 재고가 떨어진다. 미리미리 사두는 사람들도 있으니 참고할 것.',
    effectText: '체력 +20',
    effect: { hp: 20 },
    battle: false,
  },
  {
    id: 'dumpling',
    name: '만두',
    price: 12,
    desc: '고기만두로 통일됐다. 김치만두를 원한다면 매점 주인에게 문의해보자.',
    effectText: '체력 +30',
    effect: { hp: 30 },
    battle: false,
  },
  {
    id: 'chewy',
    name: '마이쭈',
    price: 5,
    desc: '친해지고 싶은 친구에게 나눠주자. 혼자 먹어도 좋고.',
    effectText: '일행(파티) 상태일 때 파티원에게 나눠주면 일시적으로 공격력을 올려준다. 1턴에 한해 2배.',
    effect: {},
    battle: false,
    party: true,
  },
  {
    id: 'energy',
    name: '에너지드링크',
    price: 20,
    desc: '날개를 달아줘요. 어쩐지 죽어도 죽지 않을 것 같다.',
    effectText:
      '1회에 한하여 전투불능 패널티 없이, 또한 전투를 종료하지 않고 HP1로 부활시킨다. 의지력은 회복되지 않는다. 전투불능이 되기 전 미리 먹어둬야 효과가 바로 발휘되며, 전투불능 이후에는 사용할 수 없다.',
    effect: { revive: true },
    battle: true,
    only: 'battle',
  },
]

export const itemOf = (id) => ITEMS.find((i) => i.id === id)
export const countOf = (player, id) => player.inventory?.[id] || 0

/** 지금 이 아이템을 쓸 수 있는가. { ok, why } */
export function canUseItem(item, { inBattle, countNow, reviveOn }) {
  if (!countNow) return { ok: false, why: '갖고 있지 않다' }
  if (item.party) return { ok: false, why: '일행(파티) 상태에서만 쓸 수 있다' }
  if (inBattle && !item.battle) return { ok: false, why: '전투 중에는 쓸 수 없다' }
  if (item.only === 'battle' && !inBattle) return { ok: false, why: '전투 중에만 쓸 수 있다' }
  if (item.effect.revive && reviveOn) return { ok: false, why: '이미 효과가 걸려 있다' }
  return { ok: true }
}
