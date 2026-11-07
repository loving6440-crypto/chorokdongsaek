// v-B.07 탐사 장면(scene) 공용 규칙. 본관 · 별관 · 산 · 사당 탐사가 모두 이 규칙으로 글을 보여 준다.
//
// 장면(node) 하나의 모양:
//   { id, name, text, choices, when, ... }
//   - text     : 문구 목록. 각 칸은 아래 중 하나다.
//        '문자열'                     기본 문구. 여럿이면 그날의 것 하나가 나온다.
//        { when, mode, text }          조건 문구. when = { 스탯키: [최소, 최대] } (null 은 제한 없음)
//                                      mode 'append' = 기본 문구 뒤에 붙이고, 'replace' = 기본 문구를 대신한다.
//        { chance: 10, text }          볼 때마다 10% 확률로 기본 문구 대신 나온다.
//   - choices  : 글 아래에 나오는 선택지(하위 장면). 선택지가 또 선택지를 가지면 그 안으로 들어가고,
//                없으면 그 자리 아래에 결과 글만 보여 준다.
//   - when     : 이 장면이 선택지로 보이는 조건(스탯).
//   - seq      : 순서대로 한 장씩 보여 줄 글. 화면을 누를 때마다 다음 장. 다 보면 end 로.
//   - end      : 'home'(그 탐사의 첫 화면) | 'root'(지금 장소의 첫 화면) | 'back'(한 단계 위)
//   - typeAfter: 글이 뜬 뒤 화면을 한 번 누르면 이어서 타이핑되는 글. 다 쳐지면 end 로.
//   - clickExit: 화면 어디든 한 번 누르면 end 로.
//   - fx       : 'jitter' — 글 전체가 아주 조금씩 흔들린다. (글 속 ~~단어~~ 는 그 단어만 흔들린다)
//   - cost     : { mp, wait } — 의지력 mp 를 쓰거나 wait 분을 기다려야 결과(result)를 볼 수 있다.
//   - result   : cost 를 치른 뒤 보여 줄 문구.
//   - action   : cost 를 치른 뒤 Game 에 맡길 일. { kind, ... } (예: 도깨비 놀이 승패)
//   - widget   : 탐사 화면이 대신 그려 줄 기존 화면(무구 강화, 씨앗 상점, 보관함 …)
//   - npc, lines: NPC 대사. lines 중 하나를 고를 때마다 무작위로 보여 준다.
//   - night    : { from, to, closed } — from 시 ~ to 시 사이에만 열린다. 그 밖에는 closed 문구.
//   - notice   : 글 아래에 따로 띄우는 안내(시스템 메시지).
// 글자 꾸밈: **굵게**(눌러볼 수 있는 단서), *기울임*(강조), ~~흔들림~~. 'OO' 는 캐릭터 이름으로 바뀐다.
// progress.js 의 dayKey 와 같은 규칙(로컬 날짜). progress.js 는 노드에서 바로 불러올 수 없어 여기 따로 둔다.
export const dayKey = (now = Date.now()) => {
  const d = new Date(now)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const hashStr = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/** 스탯 조건: { insight: [15, null] } → 안목 15 이상 */
export const meets = (when, stats = {}) =>
  Object.entries(when ?? {}).every(([k, [lo, hi]]) => (lo == null || (stats[k] ?? 0) >= lo) && (hi == null || (stats[k] ?? 0) <= hi))

/**
 * 문구 목록 → 보여 줄 문단들. 기본 문구는 같은 날엔 같은 것, 날이 바뀌면 다른 것이 나올 수 있다.
 * 확률 문구(chance)는 볼 때마다 굴려서, 걸리면 기본 문구를 대신한다.
 * 조건 문구는 지금 스탯이 조건을 채울 때만 붙는다(replace 는 기본 문구를 대신한다).
 */
export function resolveEntries(entries = [], stats = {}, seed = '', now = Date.now(), rng = Math.random) {
  const plain = entries.filter((e) => typeof e === 'string')
  const chance = entries.filter((e) => typeof e === 'object' && e.chance != null)
  const cond = entries.filter((e) => typeof e === 'object' && e.chance == null && meets(e.when, stats))
  const base = plain.length ? plain[hashStr(`${dayKey(now)}|${seed}`) % plain.length] : null
  const lucky = chance.find((c) => rng() * 100 < c.chance)
  const replace = cond.filter((c) => c.mode === 'replace').at(-1)
  const out = []
  if (lucky) out.push(lucky.text)
  else if (replace) out.push(replace.text)
  else if (base) out.push(base)
  for (const c of cond) if (c.mode !== 'replace') out.push(c.text)
  return out
}

/** 'OO' → 캐릭터 이름 */
export const withName = (text, name) => (name ? String(text).replace(/OO/g, name) : String(text))

/** 이 장면이 지금 선택지로 보이는가 */
export const visibleChoices = (node, stats = {}) => (node?.choices ?? []).filter((c) => meets(c.when, stats))

/** 밤에만 열리는 장면인가 (from 시 ~ 다음 날 to 시) */
export function isOpenAt(night, now = Date.now()) {
  if (!night) return true
  const h = new Date(now).getHours()
  return night.from > night.to ? h >= night.from || h < night.to : h >= night.from && h < night.to
}

/** '승리 : …⏎패배 : …' 꼴의 글을 둘로 나눈다. */
export function splitWinLose(text) {
  const win = /승리\s*:\s*([^]*?)(?:\n|$)/.exec(text)?.[1]?.trim() ?? ''
  const lose = /패배\s*:\s*([^]*?)$/.exec(text)?.[1]?.trim() ?? ''
  return { win, lose }
}

/** 장면 트리 안의 모든 하위 장면 (자기 자신 제외) */
export function descendants(node) {
  const out = []
  for (const c of node?.choices ?? []) out.push(c, ...descendants(c))
  return out
}

/** 장면 트리에서 id 로 찾기 */
export function findNode(node, id) {
  if (!node) return null
  if (node.id === id) return node
  for (const c of node.choices ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return null
}
