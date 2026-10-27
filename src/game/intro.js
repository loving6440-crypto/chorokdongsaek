// 첫 캐릭터 생성 때 한 문단씩 출력되는 인트로 스크립트.
// lines: 문장 하나가 곧 한 줄이다. (화면에서는 절대 줄바꿈하지 않고, 폭에 맞춰 글자 크기를 줄인다.)
// style: 'normal' | 'big' (짧은 한 줄 강조) | 'italic'
export const INTRO_PARAGRAPHS = [
  {
    lines: [
      '신은 인간을 빚었고 인간은 신을 빚었다.',
      '시작이 어디인지 알 수 없다면 끝이 어디인지도 알 수 없다.',
    ],
  },
  {
    lines: [
      '거대한 원이 그려진 문이 맞물리며 열린다.',
      '교복을 맞춰 입은 학생과 그런 학생을 통솔하는 교육자들이 각자만의 무구와 복장을 갖춘 채 자리에 서있다.',
    ],
  },
  {
    lines: [
      '1900년대 말.',
      '한 차례 ‘우리’가 알던 한반도가 뒤바뀌었다.',
      '신앙이 현실이 됐으며 믿음이 권한을 가지게 됐다.',
    ],
  },
  {
    lines: [
      '한때는 재앙을 몰고 온 검은 구름도 있었다는데, 이제 와선 죄다 옛 이야기 아니냐며 쑥덕거리는 사람들이 가득한 어느 시대…….',
    ],
  },
  {
    lines: [
      '당신이 훗날 이 지점에서 회상할 수 있는 것은, 문을 열며 들어선 순간 눈이 부시다는 감각만이 머리 안을 가득 채워버렸단 사실 뿐.',
    ],
  },
  { lines: ['앞으로 어떻게 살아가게 될까?'], style: 'big' },
  { lines: ['아니다.'], style: 'big' },
  { lines: ['앞으로, 어떻게 살아있을 수 있을까?'], style: 'italic' },
]

// 쉼표(, 또는 ，) 뒤에서 줄을 나눈다. 쉼표는 앞 줄 끝에 남긴다.
export const splitAtCommas = (lines) =>
  lines.flatMap((line) =>
    line
      .split(/(?<=[,，])\s+/)
      .map((s) => s.trim())
      .filter(Boolean),
  )

export const INTRO_AUTO_ADVANCE_MS = 10000 // 자동으로 다음 문단으로 넘어가는 간격

const seenKey = (userId) => `chorok-intro-seen:${userId}`

export function hasSeenIntro(userId) {
  try {
    return localStorage.getItem(seenKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(userId) {
  try {
    localStorage.setItem(seenKey(userId), '1')
  } catch {
    /* 저장 불가 환경이면 다음에 다시 보여주면 그만 */
  }
}

// 전투 안내(바리의 전투 튜토리얼): 계정마다 한 번만 자동으로 띄운다. 언제든 메뉴에서 다시 볼 수 있다. (v71)
const battleTutorialKey = (userId) => `chorok-battle-tutorial-seen:${userId}`

export function hasSeenBattleTutorial(userId) {
  try {
    return localStorage.getItem(battleTutorialKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markBattleTutorialSeen(userId) {
  try {
    localStorage.setItem(battleTutorialKey(userId), '1')
  } catch {
    /* 저장 불가 환경이면 다음에 다시 보여주면 그만 */
  }
}
