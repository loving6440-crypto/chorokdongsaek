// 과목별 설명 · 최소 조건 · 보상. 문구는 기획 문서(‘고칠 것들’ 탭)의 것을 그대로 옮겼다.
export const LESSON_DAILY_ATTEMPTS = 3 // 하루 시도 횟수
export const LESSON_WAIT_MINUTES = 30 // 수업 대기 시간
export const LESSON_SPIRIT_REWARD = 15 // 점복학을 뺀 과목을 마칠 때 영력

export const COURSE_INFO = {
  'talisman-2048': {
    short: '부적의 나열을 가지런히 하여 수를 끌어올려보자.',
    long: '수를 적재하여 부적의 기초적인 형태부터 심오한 형상까지 덧대어 그려보자. 단, 부적의 칸이 한정되어 있음을 잊지 말자.',
    death: '수를 적을 부적의 칸이 모자라다!',
    success: '부적 안에서 기적이 일어났다!',
    minLabel: '3000점 넘기기',
    minValue: 3000,
    metricLabel: '점수',
    scoreLabel: '점수',
    ranked: true,
  },
  'spell-typing': {
    short: '끊어진 부분이 없게끔 주문을 이어 적어보자.',
    long: '단어나 획 하나 잘못 그려져도 다른 형상으로 주술이 튀는 만큼, 반복해서 글자를 적어나가며 정확도를 올리자.',
    death: '종이가 구겨지고 말았다!',
    minLabel: '300타 넘기기',
    minValue: 300,
    metricLabel: '평균 타수',
    scoreLabel: '평균 타수',
    ranked: true,
  },
  'ward-tetris': {
    short: '결계의 주춧돌을 직접 놓아보며 감을 익혀보자.',
    long: '뿌리가 엉성하면 줄기도 부실한 법, 직접 결계 조각을 짜맞추며 어느 형상이 어떤 조각과 조화롭게 들어맞나 확인하자.',
    death: '결계가 무너지고 말았다!',
    minLabel: '5000점 넘기기',
    minValue: 5000,
    metricLabel: '점수',
    scoreLabel: '점수',
    ranked: true,
  },
  'folklore-spot': {
    short: '똑같은 쌍의 상징물을 골라내며 기억을 시험해보자.',
    long: '바깥 세상이나 여기나 암기가 중요하다는 건 변하지 않는다. 같은 그림이 그려진 카드를 골라 곧장 건져내보자.',
    death: '카드의 패가 화나서 당신을 습격했다!',
    minLabel: '3판 완료하기',
    minValue: 3,
    metricLabel: '완료한 판',
    scoreLabel: '점수',
    ranked: true,
  },
  'divination-fortune': {
    short: '구슬을 맞춰 그곳에 반사된 상을 건져내보자.',
    long: '원이라는 기초적인 시작에 맞춰 이를 불려나가며 운세를 어디까지 인간인 우리가 조정할 수 있는 지 시험을 해보자.',
    death: '지나가던 신이 당신의 구슬을 깨트렸다!',
    minLabel: '운세를 뽑기만 하면 완료',
    minValue: 1,
    metricLabel: '뽑기',
    scoreLabel: '',
    ranked: false,
  },
  'exorcism-space': {
    short: '어디까지 뛰어나갈 수 있는 지 자신을 한계에 몰아보자.',
    long: '장애물을 뛰어넘고 고개를 숙이며 눈이 인식함과 동시에 몸이 곧장 움직여지게끔 팽이를 선 위에 올려 돌려보자.',
    death: '우당탕 넘어지고 말았다!',
    minLabel: '7000점 넘기기',
    minValue: 7000,
    metricLabel: '점수',
    scoreLabel: '점수',
    ranked: true,
  },
}

export const rewardText = (courseId) =>
  courseId === 'divination-fortune'
    ? '원하는 스탯 1을 바로 올린다 (데일리 보너스)'
    : `영력 +${LESSON_SPIRIT_REWARD}`
