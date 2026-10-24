// 별관 탐사 데이터. 층 → 방. 방 중 일부는 동아리 부실을 겸하고(club), 일부는 그 방 고유의 활동(activityLabel)을 가진다.
export const ANNEX_FLOORS = [
  {
    id: 'f1',
    name: '1층',
    rooms: [
      {
        id: 'auditorium',
        name: '강당',
        flavor: ['넓은 강당. 접이식 의자가 벽을 따라 가지런히 쌓여 있다. 특별한 행사가 없는 날은 조용히 비어 있다. (준비 중)'],
      },
    ],
  },
  {
    id: 'f2',
    name: '2층',
    rooms: [
      {
        id: 'craft',
        name: '공작소',
        club: 'craft',
        activityLabel: '제작하기',
        flavor: [
          '본관 지하 1층 비품실에 있던 공작소를 그대로 옮겨 온 곳. 손때 묻은 작업대와 오래된 도구들이 가지런히 걸려 있다. 공작소 담당 **오단애**가 이곳에 늘 머문다.',
        ],
      },
      {
        id: 'music',
        name: '음악실',
        club: 'music',
        flavor: ['방음이 된 음악실. 낡은 피아노와 악보대가 창가에 놓여 있다. (준비 중)'],
      },
      {
        id: 'board',
        name: '패 놀이터',
        club: 'board',
        activityLabel: '놀이하기',
        flavor: ['여럿이 둘러앉아 놀 수 있게 꾸며진 공간. 낮은 탁자와 방석, 각종 패와 윳가지가 상자에 담겨 있다.'],
      },
      {
        id: 'broadcast',
        name: '방송실',
        club: 'broadcast',
        flavor: ['교내 방송 장비가 놓인 좁은 방. 마이크와 믹서가 먼지를 뒤집어쓴 채 놓여 있다. (준비 중)'],
      },
      {
        id: 'cook',
        name: '조리실',
        club: 'cook',
        flavor: ['조리 도구와 식자재가 갖춰진 공간. 가스불과 커다란 조리대가 보인다. (준비 중)'],
      },
    ],
  },
  {
    id: 'f3',
    name: '3층',
    rooms: [
      {
        id: 'books',
        name: '서적실',
        club: 'read',
        flavor: ['책장이 늘어선 조용한 방. 종이 냄새가 은은하게 떠돈다. (준비 중)'],
      },
      {
        id: 'archive',
        name: '자료실',
        flavor: [
          '창록고 연혁 : 위장된 공립 기숙학교. 실제로는 무속 전승을 잇는 국립 기관이다.',
          '오방색 배치 : 본관-청, 별관-백, 기숙사-흑, 뒷산-적, 사당-황. 방위와 제례가 겹친다.',
          '영력 수련 요결 : 신속에 비례해 영력이 쌓인다. 환산하면 육조 스탯을 키울 수 있다.',
        ],
      },
      {
        id: 'tea',
        name: '다도실',
        club: 'tea',
        flavor: ['다도 용품이 가지런히 갖춰진 다실. 찻잔 부딛는 소리가 날 법한데 지금은 고요하다. (준비 중)'],
      },
    ],
  },
  {
    id: 'roof',
    name: '옥상',
    rooms: [
      {
        id: 'garden',
        name: '정원',
        flavor: ['전통적인 정원이 가꾸어져 있다. 손질이 잘 된 소나무와 돌다리, 작은 연못이 옛스러운 분위기를 자아낸다.'],
      },
    ],
  },
]

export const annexRoomOf = (id) => ANNEX_FLOORS.flatMap((f) => f.rooms).find((r) => r.id === id) ?? null
