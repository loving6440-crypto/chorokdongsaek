// 전투 튜토리얼 v72 — '직접 플레이하는 방식'. 대사 데이터는 BattleTutorialRun.jsx(및 하위 #1~#4 러너)에 있고,
// 여기엔 튜토리얼 전용으로 쓰는 연습 상대(허수아비)와 공용 상수만 둔다.
// 연출(초상화·대사창 흐름)은 v70을 참고했지만 수치/메커니즘은 전부 지금(v71/v72) 전투 엔진 그대로 따른다.
import { newBattle } from './battle'
import { makeMember } from './mbattle'

export const TUTORIAL_META = [
  { id: 'basic', label: '#1 기본 전투' },
  { id: 'psychic', label: '#2 영능력' },
  { id: 'gear', label: '#3 무구와 아이템' },
  { id: 'group', label: '#4 단체 전투' },
]

/** #1·#3에서 쓰는, 아무 비기도 없는 평범한 연습용 허수아비. */
export const TUTOR_DUMMY = {
  id: 'tutor-dummy',
  name: '연습용 허수아비',
  blurb: '무구보관소 구석에 세워 둔, 전투를 가르칠 때만 쓰는 짚으로 엮은 허수아비.',
  hp: 46,
  atk: 6,
  act: 5,
  spirit: 4,
}

/** #2에서 바리가 혼자 상대하는 허수아비. 영능력(비기) 시연을 위해 영력을 조금 더 갖고 있다. */
export const TUTOR_DUMMY_PSY = {
  id: 'tutor-dummy-psy',
  name: '허수아비',
  blurb: '바리가 영능력을 가르칠 때 늘 데려오는, 낡고 이골이 난 허수아비.',
  hp: 70,
  atk: 5,
  act: 4,
  spirit: 6,
  special: { label: '허수아비의 손짓', note: '짚으로 된 손이 가볍게 스치고 지나간다.' },
}

/** #4 단체 전투 연습에서 상대할 허수아비. 체력을 조금 넉넉히 둬서 2인이 같이 때려도 금방 끝나지 않게 한다. */
export const TUTOR_DUMMY_GROUP = {
  id: 'tutor-dummy-group',
  name: '허수아비',
  blurb: '단체 전투 연습을 위해 세워 둔, 짚으로 엮은 허수아비.',
  hp: 90,
  atk: 6,
  act: 5,
  spirit: 5,
}

/** 상대의 행동을 강제로 고정한다(cycle 을 반복). 기본은 약공→기 모으기→강공→방어 태세의 반복. */
export function forcedQueue(cycle = ['jab', 'charge', 'smash', 'guard'], length = 40) {
  const q = []
  while (q.length < length) q.push(...cycle)
  return q.slice(0, length)
}

/**
 * createMB 와 똑같지만, enemy 를 ENEMIES 목록에서 찾지 않고 직접 객체로 받는다(= newBattle 처럼
 * 연습용 허수아비를 바로 넣을 수 있게). mbattle.js 내부 전용인 addLog 는 건드리지 않고(= 초기 로그 한
 * 줄은 호출하는 쪽에서 직접 pushLog 하면 된다), 나머지 필드 구성은 createMB 그대로 따른다.
 */
export function createDummyMB(enemy, rawMembers, rng = Math.random) {
  const members = rawMembers.map(makeMember)
  const base = newBattle(enemy, members[0].stats, rng, undefined, undefined, { party: true })
  return {
    enemy,
    ehp: enemy.hp,
    espirit: enemy.spirit,
    party: true,
    queue: base.queue,
    known: 0,
    order: [],
    turn: null,
    turnIdx: -1,
    round: 1,
    phase: 'input',
    members,
    over: null,
    log: [],
    fallingLight: null,
    karmicTarget: null,
  }
}
