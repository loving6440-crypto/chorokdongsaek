// 도감: 장(章) 4개. 아직 모르는 자리는 화면에 '???'로 나온다.
//  1. 재료 및 아이템 / 2. 적 / 3. NPC / 4. 영능력(=특수 행동=스킬. 일반 공격~효험 같은 기본 행동은 넣지 않는다)
//
// 설명은 여기서 고친다.
//  - 아이템: src/game/items.js 의 desc 가 그대로 도감 설명이다. (효과 문구는 effectText)
//  - 적: src/game/battle.js 의 blurb
//  - NPC: 아래 NPC_ENTRIES 의 desc (비워 두면 '(설명 준비 중)')
//  - 영능력: 적 special 의 note (src/game/battle.js)
import { ENEMIES, PSYCHICS, specialEffects, SPECIAL_PERCENT } from './battle'
import { ITEMS } from './items'
import { ISHI } from './shrine'
import { SHINAH } from './armory'
import { DANAE } from './danae'

export const CODEX_CHAPTERS = [
  { id: 'items', no: 1, title: '재료 및 아이템' },
  { id: 'enemies', no: 2, title: '적' },
  { id: 'npcs', no: 3, title: 'NPC' },
  { id: 'skills', no: 4, title: '영능력' },
]

// NPC 도감. portrait 는 /public 의 이미지.
// NPC를 새로 추가할 때는: (1) 아래 목록에 한 줄 추가 (2) 그 NPC가 있는 방·화면에서 onMeet(id) 를 호출하면,
// Game.jsx 의 meetNpc → progress.js 의 markNpc 가 자동으로 도감에 등록해 준다. (추가 작업 불필요)
export const NPC_ENTRIES = [
  { id: 'bari', name: '바리', portrait: '/bari.png', where: '뒷산 · 교외', desc: '' },
  { id: 'yumin', name: '강유민', portrait: '/yumin-smile.webp', where: '기숙사 · 매점', desc: '' },
  { id: 'shinah', name: SHINAH.name, portrait: SHINAH.portrait, where: SHINAH.where, desc: SHINAH.codex },
  { id: 'ishi', name: ISHI.name, portrait: ISHI.portrait, where: '사당 · 문지기', desc: ISHI.codex },
  { id: 'danae', name: DANAE.name, portrait: DANAE.faces.plain, where: '별관 2층 · 조리실', desc: '' },
]

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
    return ENEMIES.map((e) => ({
      id: e.id,
      kind: 'enemy',
      enemy: e,
      known: admin || (p.seen?.[e.id] || 0) > 0,
      name: e.name,
      desc: e.blurb,
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
    ...ENEMIES.map((e) => ({
      id: `sp-${e.id}`,
      kind: 'skill',
      group: '상대의 영능력',
      known: admin || !!p.specials?.[e.id],
      name: e.special.label,
      desc: e.special.note,
      extra: `발동 확률 ${SPECIAL_PERCENT}% (상대 턴마다 d10 = 10)\n${specialEffects(e).join('\n')}`,
      from: e.name,
    })),
    ...ENEMIES.filter((e) => e.special2).map((e) => ({
      id: `sp-${e.id}-2`,
      kind: 'skill',
      group: '상대의 영능력',
      known: admin || !!p.specials?.[`${e.id}-2`],
      name: e.special2.label,
      desc: e.special2.note,
      extra: `발동 확률 ${SPECIAL_PERCENT}% (상대 턴마다 d10 = 10, 영능력은 두 종류 중 하나)\n${specialEffects(e).join('\n')}`,
      from: e.name,
    })),
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
