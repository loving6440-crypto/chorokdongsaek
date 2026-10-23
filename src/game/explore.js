import { dayKey } from './progress'

/**
 * 본관 탐사 데이터. 층마다 둘러보기 문구(intro)와 조사 가능 구역(areas)이 있고,
 * 구역마다 스크립트(SCRIPTS)가 여러 개 있다. 구역을 조사하면 그날의 스크립트 하나가 나온다.
 * ▶ 스크립트는 SCRIPTS[층id][구역id] 배열에 문자열을 추가하면 된다. (비어 있으면 '준비 중' 문구)
 */
export const FLOORS = [
  {
    id: 'b1',
    name: '지하 1층',
    intro: '',
    areas: [
      { id: 'archiveB', name: '문헌보관소(지하)' },
      { id: 'supply', name: '비품실' },
      { id: 'escape', name: '비상통로', note: '별관 혹은 뒷산으로 이어진다.' },
    ],
  },
  {
    id: 'f1',
    name: '1층',
    intro: '',
    areas: [
      { id: 'lobby', name: '로비' },
      { id: 'principal', name: '교장실' },
      { id: 'awards', name: '상장 거치대' },
      { id: 'archiveG', name: '문헌보관소(지상)' },
    ],
  },
  {
    id: 'f2',
    name: '2층',
    intro: '',
    areas: [
      { id: 'books', name: '서적실' },
      { id: 'staff', name: '교무실' },
      { id: 'beasts', name: '신수보관소' },
      { id: 'nurse', name: '양호실', goto: 'infirmary', note: '직접 찾아가 쉴 수 있다.' },
      { id: 'meditation', name: '명상실' },
    ],
  },
  {
    id: 'f3',
    name: '3층',
    intro: '',
    areas: [
      { id: 'class1', name: '교실(1학년)' },
      { id: 'class2', name: '교실(2학년)' },
      { id: 'class3', name: '교실(3학년)' },
      { id: 'locker1', name: '물품보관함(1학년)' },
      { id: 'locker2', name: '물품보관함(2학년)' },
      { id: 'locker3', name: '물품보관함(3학년)' },
    ],
  },
  {
    id: 'roof',
    name: '옥상',
    intro:
      '이곳은 본래 정원이었다. 갈 곳 없는 자그마한 신이 이곳에 깃들어 이것저것 꾸미곤 했다. 그러나 그것도 옛말. 두 번째 *검은 안개*가 찾아오게 될 거라고 무속인들이 말을 모아 결론을 내릴 쯤 부터 그들 모두가 학교를 떠나고 말았다.',
    areas: [{ id: 'door', name: '문' }],
  },
]

export const SCRIPTS = {
  roof: {
    door: [
      '최근 벌어진 소동의 잔해가 아직도 옥상에 남아있다. 수습할 사람이 없는 건 아니나, 적당히 흉악한 것이 교내에 있다면 자연스레 퇴마의 감도 날카로워질 것이라는 어른들의 대처 하에 ‘무언가’가 옥상에 방치되어 있다.',
      '당신은 문 손잡이를 돌려 밀어본다. 순간 바람이 거세게 들이닥치며 쾅 하고 철문이 닫히는데, 그 틈 사이로 샛노란 눈이 보였던 것 같다.',
    ],
  },
}

export const EMPTY_SCRIPT = '(스크립트 준비 중)'

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/** 같은 날엔 같은 구역에서 같은 스크립트, 날이 바뀌면 다른 것이 나올 수 있다. */
export function scriptOfDay(floorId, areaId, now = Date.now()) {
  const list = SCRIPTS[floorId]?.[areaId] ?? []
  if (!list.length) return EMPTY_SCRIPT
  return list[hash(`${dayKey(now)}|${floorId}|${areaId}`) % list.length]
}
