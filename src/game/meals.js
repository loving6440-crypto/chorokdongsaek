// 급식실 식단. 날짜가 같으면 누구에게나 같은 식단이 나오도록 날짜+끼니로 시드를 잡아 풀에서 뽑는다.
// 풀(POOLS)은 학교 급식 식단표(아침 · 점심 · 저녁 · 방과후 간식 · 알레르기 번호)를 보고 옮겨 적은 것이다. 메뉴를 늘리려면 여기에 적으면 된다.
// 항목: [이름, 알레르기 번호들]

export const ALLERGENS = {
  1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 8: '게', 9: '새우',
  10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류',
}

export const MEAL_SLOTS = [
  { id: 'breakfast', label: '아침', time: '07:00 ~ 08:30' },
  { id: 'lunch', label: '점심', time: '12:30 ~ 13:30' },
  { id: 'dinner', label: '저녁', time: '18:00 ~ 19:30' },
]

const POOLS = {
  breakfast: {
    rice: [['백미밥', []], ['야채죽', [5, 6]], ['흑미밥', []], ['잡곡밥', [5]], ['소고기죽', [5, 16]], ['호박죽', []]],
    soup: [['콩나물국', []], ['북어국', [1, 5]], ['미역국', [5, 6]], ['맑은 감자국', [5, 6]], ['배추된장국', [5, 6]], ['달걀국', [1]]],
    main: [['햄구이', [1, 2, 5, 6, 10]], ['달걀말이', [1, 5]], ['스크램블에그', [1, 2]], ['계란찜', [1, 5]], ['소시지야채볶음', [1, 5, 6, 10]], ['동그랑땡', [1, 5, 6, 10]]],
    side: [['김구이', []], ['콩자반', [5, 6]], ['어묵볶음', [1, 5, 6]], ['감자채볶음', [5, 6]], ['멸치볶음', [5, 6]], ['시금치나물', [5, 6]], ['단무지무침', []], ['과일 샐러드', [1, 2, 5]]],
    kimchi: [['배추김치', [9]], ['깍두기', [9]], ['포기김치', [9]]],
    extra: [['우유', [2]], ['요구르트', [2]], ['토스트', [1, 2, 5, 6]], ['시리얼', [2, 5, 6]]],
  },
  lunch: {
    rice: [['백미밥', []], ['흑미밥', []], ['잡곡밥', [5]], ['현미밥', []], ['카레라이스', [2, 5, 6, 10, 16]]],
    soup: [['소고기무국', [5, 6, 16]], ['순두부찌개', [1, 5, 9, 10]], ['미역국', [5, 6]], ['유부장국', [5, 6]], ['어묵탕', [1, 5, 6, 13]], ['육개장', [5, 6, 16]], ['시래기된장국', [5, 6]]],
    main: [['닭강정', [1, 5, 6, 13, 15]], ['제육볶음', [5, 6, 10, 13]], ['불고기', [5, 6, 13, 16]], ['돈가스', [1, 2, 5, 6, 10]], ['고등어구이', [7]], ['치킨너겟', [1, 5, 6, 15]], ['탕수육', [1, 5, 6, 10]], ['함박스테이크', [1, 2, 5, 6, 10, 16]], ['오징어볶음', [5, 6, 13, 17]]],
    side: [['깻잎무침', [5, 6]], ['도라지무침', [5, 6]], ['콩나물무침', [5, 6]], ['우엉조림', [5, 6]], ['미역줄기볶음', [5, 6]], ['잡채', [5, 6, 10]], ['브로콜리 초장무침', [5, 6]], ['마카로니 샐러드', [1, 2, 5, 6]], ['양배추 샐러드', [1, 5, 6]]],
    kimchi: [['배추김치', [9]], ['깍두기', [9]], ['열무김치', [9]], ['총각김치', [9]]],
    extra: [['과일(오렌지)', []], ['요구르트', [2]], ['식혜', []], ['샤인머스캣', []], ['사과', []]],
    afterSchool: [['꿀떡', []], ['미니 핫도그', [1, 2, 5, 6, 10]], ['치즈 스틱', [2, 5, 6]], ['과일 주스', []], ['샌드위치', [1, 2, 5, 6, 10]], ['주먹밥', [5, 6]]],
  },
  dinner: {
    rice: [['백미밥', []], ['흑미밥', []], ['잡곡밥', [5]], ['김치볶음밥', [1, 5, 6, 10]], ['참치마요덮밥', [1, 5, 6]]],
    soup: [['어묵국', [1, 5, 6, 13]], ['감자수제비', [5, 6]], ['떡국', [5, 6, 16]], ['북엇국', [1, 5]], ['콩나물김치국', [5, 9]], ['오징어국', [5, 6, 17]], ['된장찌개', [5, 6, 9]]],
    main: [['닭갈비', [5, 6, 13, 15]], ['떡갈비', [1, 5, 6, 10, 16]], ['삼겹살구이', [5, 10]], ['생선까스', [1, 2, 5, 6]], ['매운 닭볶음탕', [5, 6, 15]], ['갈비찜', [5, 6, 10, 13, 16]], ['꼬치어묵 조림', [1, 5, 6, 13]], ['고추장 불고기', [5, 6, 10, 16]]],
    side: [['숙주나물', [5, 6]], ['청경채 겉절이', [5, 6, 13]], ['감자조림', [5, 6, 13]], ['계란장조림', [1, 5, 6, 16]], ['파래무침', [5, 6]], ['부추전', [1, 5, 6]], ['쫄면 야채무침', [1, 5, 6, 13]], ['콘샐러드', [1, 2, 5, 6]], ['깍두기볶음', [5, 6, 9]]],
    kimchi: [['배추김치', [9]], ['깍두기', [9]], ['포기김치', [9]], ['오이소박이', [9]]],
    extra: [['과일(귤)', []], ['푸딩', [2, 5]], ['요구르트', [2]], ['바나나', []]],
  },
}

// 문자열 → 32비트 해시 → 난수(mulberry32). 같은 입력이면 같은 순서.
function seeded(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 한국 표준시(KST) 기준 날짜 'YYYY-MM-DD'. 서버와 화면이 같은 날짜를 보도록 둘 다 이걸 쓴다. */
export const kstDate = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10)

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)]
const pickN = (arr, n, rng) => {
  const pool = [...arr]
  const out = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return out
}

/** 그날 한 끼의 식단. { slot, rice, soup, main, sides[], kimchi, extra, afterSchool?, items[{name, allergens}], allergens[] } */
export function mealOf(date, slotId) {
  const pool = POOLS[slotId]
  const rng = seeded(`${date}|${slotId}`)
  const toItem = ([name, allergens]) => ({ name, allergens })
  const rice = toItem(pick(pool.rice, rng))
  const soup = toItem(pick(pool.soup, rng))
  const main = toItem(pick(pool.main, rng))
  const sides = pickN(pool.side, 2, rng).map(toItem)
  const kimchi = toItem(pick(pool.kimchi, rng))
  const extra = toItem(pick(pool.extra, rng))
  const afterSchool = pool.afterSchool ? toItem(pick(pool.afterSchool, rng)) : null
  const items = [rice, soup, main, ...sides, kimchi, extra, ...(afterSchool ? [afterSchool] : [])]
  const allergens = [...new Set(items.flatMap((i) => i.allergens))].sort((a, b) => a - b)
  return { slot: MEAL_SLOTS.find((s) => s.id === slotId), rice, soup, main, sides, kimchi, extra, afterSchool, items, allergens }
}

/** 그날의 식단표 전체(아침 · 점심 · 저녁). */
export const menuOf = (date) => MEAL_SLOTS.map((s) => mealOf(date, s.id))

export const CAFETERIA = {
  name: '급식실',
  oneLine: '1학년부터 3학년까지 모두가 한 자리에 모여 든든한 밥을 먹는다.',
}

export const STORY_MAX = 300
