// 업적. 새 업적은 ACHIEVEMENTS 에 항목만 추가하면 된다.
//  - name:   업적 이름. (아직 달성하지 못했으면 화면에는 이름만 보인다.)
//  - desc:   달성한 뒤에 보이는 설명.
//  - hint:   달성하기 전에는 보이지 않는다. 달성한 뒤 '달성 조건'으로 보인다.
//  - reward: { spirit } 달성하는 순간 자동으로 들어온다.
//  - at(player, now): 달성 조건을 채운 시각(ms)을 돌려준다. 아직이면 null.
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
]

export const rewardText = (r) => (r?.spirit ? `영력 +${r.spirit}` : '')

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
