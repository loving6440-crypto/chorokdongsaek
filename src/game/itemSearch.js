// 소지품·물품보관함 아이템 검색 (v79.0.7). 이름·분류 태그·효과 문구에서 찾고, 한글 초성 검색도 지원한다.
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const norm = (text) => String(text ?? '').toLowerCase().replace(/\s+/g, '')
/** '고라니 이빨' → 'ㄱㄹㄴㅇㅃ' */
export const choseongOf = (text) => [...norm(text)].map((ch) => {
  const code = ch.charCodeAt(0) - 0xac00
  return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch
}).join('')
const isChoseongQuery = (q) => /^[ㄱ-ㅎ]+$/.test(q)

/** 검색어가 비었으면 항상 참. */
export function itemMatches(item, query) {
  const q = norm(query)
  if (!q) return true
  if (!item) return false
  if (isChoseongQuery(q)) return choseongOf(item.name).includes(q)
  return [item.name, ...(item.tags ?? []), item.effectText, item.id].some((field) => norm(field).includes(q))
}

export const filterItems = (items, query) => (norm(query) ? items.filter((item) => itemMatches(item, query)) : items)
