// 도감: 장(章) 4개. 아직 모르는 자리는 화면에 '???'로 나온다.
//  1. 재료 및 아이템 / 2. 적 / 3. NPC / 4. 영능력(특수 행동)
//
// 설명은 여기서 고친다.
//  - 아이템: src/game/items.js 의 desc 가 그대로 도감 설명이다. (효과 문구는 effectText)
//  - 적: src/game/battle.js 의 blurb
//  - NPC: 아래 NPC_ENTRIES 의 desc (비워 두면 '(설명 준비 중)')
//  - 영능력: src/game/battle.js 의 ACTIONS / 적 special 의 note
import { ACTIONS, ENEMIES } from './battle'
import { ITEMS } from './items'

export const CODEX_CHAPTERS = [
  { id: 'items', no: 1, title: '재료 및 아이템' },
  { id: 'enemies', no: 2, title: '적' },
  { id: 'npcs', no: 3, title: 'NPC' },
  { id: 'skills', no: 4, title: '영능력' },
]

// NPC 도감. portrait 는 /public 의 이미지.
export const NPC_ENTRIES = [
  { id: 'bari', name: '바리', portrait: '/bari.png', where: '뒷산 · 퇴마 실습 교육', desc: '' },
  { id: 'yumin', name: '강유민', portrait: '/yumin-smile.webp', where: '기숙사 · 매점', desc: '' },
]

const SKILL_ORDER = ['attack', 'guard', 'charm', 'scan', 'buff']

/**
 * 장 하나의 칸들을 만든다. known=false 이면 화면에서 '???'.
 * 각 칸: { id, known, name, desc, extra?, tags?, kind, ... }
 */
export function codexEntries(chapterId, player) {
  const p = player ?? {}
  if (chapterId === 'items') {
    return ITEMS.map((it) => ({
      id: it.id,
      kind: 'item',
      item: it,
      known: !!p.codex?.items?.[it.id],
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
      known: (p.seen?.[e.id] || 0) > 0,
      name: e.name,
      desc: e.blurb,
      tier: e.tier,
    }))
  }
  if (chapterId === 'npcs') {
    return NPC_ENTRIES.map((n) => ({
      id: n.id,
      kind: 'npc',
      npc: n,
      known: !!p.codex?.npcs?.[n.id],
      name: n.name,
      desc: n.desc,
      where: n.where,
    }))
  }
  // 영능력: 내가 쓰는 행동(교육에서 배운다) + 상대의 특수 행동(실제로 당해 봐야 안다)
  const taught = !!p.tutorialDone || Object.keys(p.seen ?? {}).length > 0
  return [
    ...SKILL_ORDER.map((k) => ({
      id: `my-${k}`,
      kind: 'skill',
      group: '내 행동',
      known: taught,
      name: ACTIONS[k].label,
      desc: ACTIONS[k].note,
    })),
    ...ENEMIES.map((e) => ({
      id: `sp-${e.id}`,
      kind: 'skill',
      group: '상대의 특수 행동',
      known: !!p.specials?.[e.id],
      name: e.special.label,
      desc: e.special.note,
      from: e.name,
    })),
  ]
}

/** 장별 진행도 { got, total } */
export function codexProgress(chapterId, player) {
  const list = codexEntries(chapterId, player)
  return { got: list.filter((e) => e.known).length, total: list.length }
}
