// 도감: 장(章) 4개. 아직 모르는 자리는 화면에 '???'로 나온다.
//  1. 재료 및 아이템 / 2. 요괴 / 3. NPC / 4. 영능력(=특수 행동=스킬. 일반 공격~효험 같은 기본 행동은 넣지 않는다)
//  v-B.05: 2장 '요괴'에 퇴마 실습 7종 · 개척 요괴 5종 · 추가전투(전투 데이터) 50종을 모두 담는다. 4장에는 그 요괴들의 영능력이 모두 들어간다.
//
// 설명은 여기서 고친다.
//  - 아이템: src/game/items.js 의 desc 가 그대로 도감 설명이다. (효과 문구는 effectText)
//  - 적: src/game/battle.js 의 blurb
//  - NPC: 아래 NPC_ENTRIES 의 desc (비워 두면 '(설명 준비 중)')
//  - 영능력: 적 special 의 note (src/game/battle.js)
import { ENEMIES, BESTIARY_ENEMIES, PSYCHICS, REC_STATS, specialEffects, SPECIAL_PERCENT } from './battle'
import { HUNT_SITES } from './huntSites'
import { TIER_HANJA } from './constants'
import { ITEMS } from './items'
import { ISHI } from './shrine'
import { SHINAH } from './armory'
import { DANAE } from './danae'

export const CODEX_CHAPTERS = [
  { id: 'items', no: 1, title: '재료 및 아이템' },
  { id: 'enemies', no: 2, title: '요괴' },
  { id: 'npcs', no: 3, title: 'NPC' },
  { id: 'skills', no: 4, title: '영능력' },
]

// NPC 도감. portrait 는 /public 의 이미지.
// NPC를 새로 추가할 때는: (1) 아래 목록에 한 줄 추가 (2) 그 NPC가 있는 방·화면에서 onMeet(id) 를 호출하면,
// Game.jsx 의 meetNpc → progress.js 의 markNpc 가 자동으로 도감에 등록해 준다. (추가 작업 불필요)
export const NPC_ENTRIES = [
  { id: 'bari', name: '바리', portrait: '/bari.png', where: '뒷산 · 교외', desc: '' },
  { id: 'yumin', name: '강유민', portrait: '/yumin-smile.webp', where: '기숙사 · 매점', desc: '' },
  { id: 'shinyoung', name: '강신영', portrait: '/shinyoung.svg', where: '뒷산 · 텃밭 씨앗 상점', desc: '뒷산 깊숙한 텃밭에서 씨앗을 판매한다.' },
  { id: 'shinah', name: SHINAH.name, portrait: SHINAH.portrait, where: SHINAH.where, desc: SHINAH.codex },
  { id: 'ishi', name: ISHI.name, portrait: ISHI.portrait, where: '사당 · 문지기', desc: ISHI.codex },
  { id: 'danae', name: DANAE.name, portrait: DANAE.faces.plain, where: '별관 2층 · 조리실', desc: '' },
]

// ───────── 요괴 (v-B.05) ─────────
/** 개척 터에서 나오는 요괴: { 적 id: { enemy, sites: ['산길 1', …] } } */
function huntGhosts() {
  const out = {}
  for (const site of Object.values(HUNT_SITES)) {
    const e = site.ghost?.enemy
    if (!e) continue
    ;(out[e.id] ??= { enemy: e, sites: [] }).sites.push(site.name)
  }
  return out
}
const GHOSTS = huntGhosts()
const recOf = (t) => BESTIARY_ENEMIES.find((e) => e.tier === t)?.rec ?? REC_STATS[t]
const tierGroup = (t) => `추가전투 · ${TIER_HANJA[t - 1] ?? t}단계 (모든 스탯 ${recOf(t)})`
const ROLE_TEXT = { 단독: '혼자', 파티: '일행 2명', 보스: '보스 · 일행 3명' }
/** 도감에 실을 요괴 전부: 퇴마 실습 → 개척 요괴(개척에만 나오는 것) → 추가전투 단계별 */
export function yogoeList() {
  const bestiaryIds = new Set(BESTIARY_ENEMIES.map((e) => e.id))
  const gymIds = new Set(ENEMIES.map((e) => e.id))
  const where = (id, base) => [base, GHOSTS[id] ? `개척 ${GHOSTS[id].sites.join('·')}` : ''].filter(Boolean).join(' · ')
  return [
    ...ENEMIES.map((e) => ({ enemy: e, group: '퇴마 실습 (뒷산 · 전투 실습)', where: where(e.id, '뒷산 · 전투 실습') })),
    ...Object.values(GHOSTS).filter((g) => !bestiaryIds.has(g.enemy.id) && !gymIds.has(g.enemy.id)).map((g) => ({ enemy: g.enemy, group: '개척 요괴', where: `개척 ${g.sites.join('·')}` })),
    ...BESTIARY_ENEMIES.map((e) => ({ enemy: e, group: tierGroup(e.tier), where: where(e.id, `둘레길 · 추가전투 · ${ROLE_TEXT[e.role] ?? ''}`) })),
  ]
}
// 개척 요괴는 적 데이터에 blurb 가 없어 여기서 적는다.
const GHOST_BLURBS = {
  'mountain-ghost': '얕은 산길을 떠도는 산귀신. 발소리를 내며 뒤를 밟다가, 돌아보는 순간 원한의 저주를 건다.',
  'tree-spirit': '깊은 산길의 늙은 나무에 깃든 목신. 제 터를 함부로 헤집는 사람을 끝까지 쫓아온다.',
  'water-ghost': '호숫가 물속에서 발목을 잡아끄는 물귀신. 물 밖까지 축축한 원한을 끌고 나온다.',
  'ang-gwaengi': '설날 밤 신을 훔쳐 간다는 앙괭이. 묘소 사이를 서성이며 잠들지 못한 넋을 부른다.',
  'eodukssini': '동굴 어둠이 뭉쳐 생긴 어둑시니. 올려다볼수록 커지고, 무서워할수록 더 짙어진다.',
}
const blurbOf = (e) => e.blurb ?? GHOST_BLURBS[e.id] ?? (e.curse ? '개척 터를 떠돌다 사람을 쫓아오는 요괴. 원한의 저주를 건다.' : '')

/**
 * 장 하나의 칸들을 만든다. known=false 이면 화면에서 '???'.
 * 각 칸: { id, known, name, desc, extra?, tags?, kind, ... }
 */
export function codexEntries(chapterId, player, admin = false) {
  const p = player ?? {}
  if (chapterId === 'items') {
    return ITEMS.map((it) => ({
      id: it.id,
      kind: 'item',
      item: it,
      known: admin || !!p.codex?.items?.[it.id],
      name: it.name,
      desc: it.desc,
      extra: it.effectText,
      tags: it.tags ?? [],
    }))
  }
  if (chapterId === 'enemies') {
    return yogoeList().map(({ enemy: e, group, where }) => ({
      id: e.id,
      kind: 'enemy',
      enemy: e,
      group,
      where,
      known: admin || (p.seen?.[e.id] || 0) > 0,
      name: e.name,
      desc: blurbOf(e),
      tags: e.tags,
      tier: e.tier,
    }))
  }
  if (chapterId === 'npcs') {
    return NPC_ENTRIES.map((n) => ({
      id: n.id,
      kind: 'npc',
      npc: n,
      known: admin || !!p.codex?.npcs?.[n.id],
      name: n.name,
      desc: n.desc,
      where: n.where,
    }))
  }
  // 영능력(= 특수 행동 = 스킬)만 담는다. 일반 공격·막기·부적·간파는 그냥 '행동'이라 여기에 없다.
  // 나의 영능력은 조건을 채워 익혀야 알고(단, '효험'처럼 default 로 표시된 건 모두가 처음부터 안다), 상대의 영능력은 실제로 당해 봐야 안다.
  return [
    ...PSYCHICS.map((x) => ({
      id: `my-${x.id}`,
      kind: 'skill',
      group: '나의 영능력',
      known: admin || x.default || !!p.psychics?.includes(x.id),
      name: x.label,
      desc: x.note,
      extra: `${x.detail}\n취득 조건: ${x.cond}`,
    })),
    // v-B.05: 퇴마 실습 · 개척 요괴 · 추가전투 요괴의 영능력 전부(보스는 두 가지). 요괴 장과 같은 묶음으로 나눈다.
    ...yogoeList().flatMap(({ enemy: e, group }) => [
      {
        id: `sp-${e.id}`,
        kind: 'skill',
        group: `상대의 영능력 · ${group.replace(/ \(.*\)$/, '')}`,
        known: admin || !!p.specials?.[e.id],
        name: e.special.label,
        desc: e.special.note,
        extra: `발동 확률 ${SPECIAL_PERCENT}% (상대 턴마다 d10 = 10${e.special2 ? ', 영능력은 두 종류 중 하나' : ''})\n${specialEffects(e).join('\n')}`,
        from: e.name,
      },
      ...(e.special2
        ? [{
            id: `sp-${e.id}-2`,
            kind: 'skill',
            group: `상대의 영능력 · ${group.replace(/ \(.*\)$/, '')}`,
            known: admin || !!p.specials?.[`${e.id}-2`],
            name: e.special2.label,
            desc: e.special2.note,
            extra: `발동 확률 ${SPECIAL_PERCENT}% (상대 턴마다 d10 = 10, 영능력은 두 종류 중 하나)\n${specialEffects(e).join('\n')}`,
            from: e.name,
          }]
        : []),
    ]),
  ]
}

/** 도감에서 지금 알려진 칸 전부: { 'items:picnic': { chapter: '재료 및 아이템', name: '사과맛 피크닉' }, ... } */
export function codexKnown(player) {
  const out = {}
  for (const ch of CODEX_CHAPTERS) {
    for (const e of codexEntries(ch.id, player)) if (e.known) out[`${ch.id}:${e.id}`] = { chapter: ch.title, chapterId: ch.id, name: e.name, kind: e.kind }
  }
  return out
}

/** 장별 진행도 { got, total } */
export function codexProgress(chapterId, player, admin = false) {
  const list = codexEntries(chapterId, player, admin)
  return { got: list.filter((e) => e.known).length, total: list.length }
}
