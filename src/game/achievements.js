// 업적. 새 업적은 ACHIEVEMENTS 에 항목만 추가하면 된다.
//  - name:   업적 이름. (아직 달성하지 못했으면 화면에는 이름만 보인다.)
//  - desc:   달성한 뒤에 보이는 설명.
//  - hint:   달성하기 전에는 보이지 않는다. 달성한 뒤 '달성 조건'으로 보인다.
//  - reward: { spirit } 달성하는 순간 자동으로 들어온다.
//  - at(player, now): 달성 조건을 채운 시각(ms)을 돌려준다. 아직이면 null.
import { SKINS } from './skins2048'

const SKIN_NAME = Object.fromEntries(SKINS.map((k) => [k.id, k.name]))
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
]

export const rewardText = (r) =>
  [r?.spirit ? `영력 +${r.spirit}` : '', r?.skin ? `2048 스킨 [${SKIN_NAME[r.skin] ?? r.skin}] 해금` : ''].filter(Boolean).join(' · ')

/** 새로 달성한 업적이 있으면 기록하고 보상을 준다. 바뀐 게 없으면 같은 player 를 돌려준다. */
export function checkAchievements(player, now = Date.now()) {
  let p = player
  const logs = []
  for (const a of ACHIEVEMENTS) {
    if (p.achievements?.[a.id]) continue
    const t = a.at(p, now)
    if (t == null) continue
    p = {
      ...p,
      spirit: p.spirit + (a.reward?.spirit ?? 0),
      achievements: { ...(p.achievements ?? {}), [a.id]: { at: t } },
    }
    logs.push(`업적 달성! [${a.name}] ${rewardText(a.reward)}`.trim())
  }
  return { player: p, logs }
}
