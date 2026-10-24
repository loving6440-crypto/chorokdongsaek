// 민속학: 화투 신경쇠약 (순수 로직)
// 규칙: 뒤집힌 화투패를 두 장씩 열어 "같은 월"끼리 짝을 맞춘다.
//  - 화투는 한 달에 4장(광·열끗·띠·피)이라, 같은 월이면 종류가 달라도 짝이다.
//  - 한 판은 월마다 2장씩 깔린다. 시작 직전에 잠깐 패를 모두 펼쳐 보여 준다.
//  - 틀리면 기회가 줄고, 기회가 0이 되면 끝. 모두 맞히면 다음 판(월 수 증가)으로.

// kind: gwang(광) | yeol(열끗) | tti(띠) | pi(피) | ssang(쌍피)
// band: 띠 색 — hong(홍단) | cho(초단) | cheong(청단)
export const MONTHS = [
  { n: 1, name: '솔', cards: [{ kind: 'gwang' }, { kind: 'tti', band: 'hong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 2, name: '매화', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'hong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 3, name: '벚꽃', cards: [{ kind: 'gwang' }, { kind: 'tti', band: 'hong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 4, name: '흑싸리', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cho' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 5, name: '난초', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cho' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 6, name: '모란', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cheong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 7, name: '홍싸리', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cho' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 8, name: '공산', cards: [{ kind: 'gwang' }, { kind: 'yeol' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 9, name: '국화', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cheong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 10, name: '단풍', cards: [{ kind: 'yeol' }, { kind: 'tti', band: 'cheong' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 11, name: '오동', cards: [{ kind: 'gwang' }, { kind: 'ssang' }, { kind: 'pi' }, { kind: 'pi' }] },
  { n: 12, name: '비', cards: [{ kind: 'gwang' }, { kind: 'yeol' }, { kind: 'tti', band: 'hong' }, { kind: 'ssang' }] },
]

export const KIND_LABEL = { gwang: '광', yeol: '열끗', tti: '띠', pi: '피', ssang: '쌍피' }

/** 판(stage, 1부터)별 설정. 월 수는 6 → 8 → 10 → 12 로 늘고, 이후는 12 유지. */
export function stageConfig(stage) {
  const months = Math.min(12, 4 + stage * 2)
  const cards = months * 2
  return {
    months,
    cards,
    cols: cards <= 16 ? 4 : cards <= 20 ? 5 : 6,
    chances: Math.ceil(months * 0.9) + 2, // 틀려도 되는 횟수
    peekSeconds: 5, // 패를 펼쳐 보여 주는 시간: 판이 올라가도 5초로 그대로
    parSeconds: months * 7, // 보너스 기준 시간
  }
}

function shuffle(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 이번 판의 패: 무작위 N개 월에서 월마다 서로 다른 2장. */
export function buildDeck(stage, rand = Math.random) {
  const { months } = stageConfig(stage)
  const picked = shuffle(MONTHS, rand).slice(0, months)
  const deck = []
  for (const m of picked) {
    const two = shuffle(m.cards, rand).slice(0, 2)
    two.forEach((c, i) => deck.push({ id: `${m.n}-${i}`, month: m.n, ...c }))
  }
  return shuffle(deck, rand)
}

export const isMatch = (a, b) => !!a && !!b && a.id !== b.id && a.month === b.month

export const PAIR_SCORE = 100
export const comboBonus = (combo) => (combo > 1 ? (combo - 1) * 50 : 0)
export const clearBonus = (stage, chancesLeft, seconds) => {
  const { parSeconds } = stageConfig(stage)
  return stage * 200 + chancesLeft * 50 + Math.max(0, parSeconds - Math.floor(seconds)) * 5
}
