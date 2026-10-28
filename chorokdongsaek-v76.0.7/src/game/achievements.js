// 업적. 새 업적은 ACHIEVEMENTS 에 항목만 추가하면 된다.
//  - name:   업적 이름. (아직 달성하지 못했으면 화면에는 이름만 보인다.)
//  - desc:   달성한 뒤에 보이는 설명.
//  - hint:   달성하기 전에는 보이지 않는다. 달성한 뒤 '달성 조건'으로 보인다.
//  - reward: { spirit } 달성하는 순간 자동으로 들어온다.
//  - at(player, now): 달성 조건을 채운 시각(ms)을 돌려준다. 아직이면 null.
import { SKINS, LAUNCH_SKIN_IDS } from './skins2048'
import { SKINS_RUNNER } from './skinsRunner'

const SKIN_NAME = Object.fromEntries(SKINS.map((k) => [k.id, k.name]))
const RUNNER_SKIN_NAME = Object.fromEntries(SKINS_RUNNER.map((k) => [k.id, k.name]))
const DAY = 24 * 60 * 60 * 1000

export const ACHIEVEMENTS = [
  {
    id: 'gods-gaze',
    name: '신의 주시',
    desc: '오늘은 국립 창록고등학교에 전학을 온 기념비적인 날이다. 이제부터 평범한 나날은 안녕이라고 봐도 좋겠지.',
    hint: '캐릭터를 생성하고 24시간이 지난다.',
    reward: { spirit: 20 },
    at: (p, now) => (p.createdAt && now - p.createdAt >= DAY ? p.createdAt + DAY : null),
  },
  {
    id: 'first-talisman',
    name: '첫 부적',
    desc: '삐뚤빼뚤하지만 첫 부적 한 장을 완성했다. 칸이 가득 차기 전에 수를 끌어올리는 요령이 조금 붙었다.',
    hint: '부적학 수업을 처음으로 마친다.',
    reward: { spirit: 10, skin: 'changnok' },
    at: (p) => p.cleared?.['talisman-2048'] ?? null,
  },
  {
    id: 'first-practice',
    name: '첫 실습',
    desc: '엉성했지만 첫 퇴마 실습을 무사히 마쳤다. 다음번엔 조금 더 멀리 달려 보자.',
    hint: '퇴마 실습 수업을 처음으로 마친다.',
    reward: { spirit: 10, skinRunner: 'changnok-bloom' },
    at: (p) => p.cleared?.['exorcism-space'] ?? null,
  },
  {
    id: 'model-student',
    name: '나는야 모범생',
    desc: '한 주 내내 어느 수업에서건 주간 랭킹 3위 안의 자리를 지켜냈다. 다음 주로 넘어가는 순간까지 그 자리는 흔들리지 않았다.',
    hint: '어느 수업이건 주간 랭킹 3위 안에 든 채로 다음 주로 넘어간다.',
    reward: { money: 20, skin: 'golden-dream' },
    at: (p) => p.weeklyTop1At ?? null,
  },
  {
    id: 'skin-master',
    name: '부적 만들기의 달인',
    desc: '최초 게임이 열리는 시점부터 얻을 수 있는 모든 2048 타일 스킨을 모았다.',
    hint: '최초 게임이 열리는 시점에 얻을 수 있는 2048 타일 스킨을 모두 해금한다.',
    reward: { money: 20 },
    at: (p, now) => (LAUNCH_SKIN_IDS.every((id) => p.achievements?.[SKINS.find((s) => s.id === id)?.unlock] || !SKINS.find((s) => s.id === id)?.unlock) ? now : null),
  },
]

export const rewardText = (r) =>
  [
    r?.spirit ? `영력 +${r.spirit}` : '',
    r?.money ? `돈 +${r.money}냥` : '',
    r?.skin ? `2048 스킨 [${SKIN_NAME[r.skin] ?? r.skin}] 해금` : '',
    r?.skinRunner ? `퇴마 실습 스킨 [${RUNNER_SKIN_NAME[r.skinRunner] ?? r.skinRunner}] 해금` : '',
  ]
    .filter(Boolean)
    .join(' · ')

/** 새로 달성한 업적이 있으면 기록하고 보상을 준다. 바뀐 게 없으면 같은 player 를 돌려준다.
 *  반환의 unlocked: 이번에 새로 달성한 업적 객체들. (화면에서 팝업으로 띄우는 용도) */
export function checkAchievements(player, now = Date.now()) {
  let p = player
  const logs = []
  const unlocked = []
  for (const a of ACHIEVEMENTS) {
    if (p.achievements?.[a.id]) continue
    const t = a.at(p, now)
    if (t == null) continue
    p = {
      ...p,
      spirit: p.spirit + (a.reward?.spirit ?? 0),
      money: p.money + (a.reward?.money ?? 0),
      achievements: { ...(p.achievements ?? {}), [a.id]: { at: t } },
    }
    logs.push(`업적 달성! [${a.name}] ${rewardText(a.reward)}`.trim())
    unlocked.push(a)
  }
  return { player: p, logs, unlocked }
}
