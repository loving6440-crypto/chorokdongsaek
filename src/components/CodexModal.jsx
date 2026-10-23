import { useEffect, useState } from 'react'
import { BookMarked, Check, Lock, Trophy, X } from 'lucide-react'
import { ACHIEVEMENTS, rewardText } from '../game/achievements'
import { CODEX_CHAPTERS, codexEntries, codexProgress } from '../game/codex'
import { tierLabel } from '../game/constants'
import ItemIcon from './ItemIcon'

const EMPTY_DESC = '(설명 준비 중)'
const fmtDate = (t) => {
  const d = new Date(t)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

/** 아직 모르는 자리의 동그란 표시 */
function Unknown({ size = 44 }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-edge/15 font-serif text-lg text-paper/55" style={{ width: size, height: size }} aria-hidden>
      ?
    </span>
  )
}

function Entry({ e }) {
  if (!e.known) {
    return (
      <li className="flex items-center gap-3 rounded-xl bg-edge/[0.05] p-3" data-codex={e.id} data-known="0">
        {e.kind === 'item' ? <ItemIcon locked size={44} className="shrink-0" /> : <Unknown />}
        <p className="font-serif text-base tracking-widest text-paper/45">???</p>
      </li>
    )
  }
  return (
    <li className="flex items-start gap-3 rounded-xl bg-edge/[0.07] p-3" data-codex={e.id} data-known="1">
      {e.kind === 'item' && <ItemIcon item={e.item} size={44} className="shrink-0" />}
      {e.kind === 'npc' && <img src={e.npc.portrait} alt={e.name} className="size-11 shrink-0 rounded-full bg-edge/15 object-cover object-top" draggable={false} />}
      {e.kind === 'enemy' && (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-crimson/80 font-myeongjo text-lg font-bold text-[#fbf6e9]" aria-hidden>
          {tierLabel(e.tier)[0]}
        </span>
      )}
      {e.kind === 'skill' && (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mana/70 font-myeongjo text-base font-bold text-[#fbf6e9]" aria-hidden>
          術
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-serif text-base text-paper">
          {e.name}
          {e.kind === 'enemy' && <span className="ml-2 rounded-full bg-crimson/25 px-2 py-px font-sans text-[10px] text-crimson">{tierLabel(e.tier)}</span>}
          {(e.tags ?? []).map((t) => (
            <span key={t} className="ml-1.5 rounded-full border border-edge/25 px-1.5 py-px align-middle font-sans text-[10px] text-paper/60">
              {t}
            </span>
          ))}
        </p>
        {e.where && <p className="text-[11px] text-paper/50">{e.where}</p>}
        {e.from && <p className="text-[11px] text-paper/50">{e.from}의 특수 행동</p>}
        <p className={`mt-1 text-xs leading-relaxed ${e.desc ? 'text-paper/75' : 'text-paper/40'}`}>{e.desc || EMPTY_DESC}</p>
        {e.extra && <p className="mt-1 text-xs leading-relaxed text-gold">{e.extra}</p>}
      </div>
    </li>
  )
}

function Codex({ player }) {
  const [chapter, setChapter] = useState(CODEX_CHAPTERS[0].id)
  const list = codexEntries(chapter, player)
  const groups = [...new Set(list.map((e) => e.group).filter(Boolean))]
  const cur = codexProgress(chapter, player)
  return (
    <div>
      <div role="tablist" aria-label="도감 장" className="flex flex-wrap gap-1.5">
        {CODEX_CHAPTERS.map((c) => {
          const pr = codexProgress(c.id, player)
          return (
            <button key={c.id} type="button" role="tab" aria-selected={chapter === c.id} aria-pressed={chapter === c.id} onClick={() => setChapter(c.id)} className="flat-chip tilt">
              {c.no}. {c.title}
              <span className="ml-1.5 text-[10px] opacity-70">
                {pr.got}/{pr.total}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-paper/50">
        {CODEX_CHAPTERS.find((c) => c.id === chapter).title} · {cur.got} / {cur.total}
      </p>
      {groups.length ? (
        groups.map((g) => (
          <div key={g} className="mt-2">
            <p className="text-xs tracking-widest text-paper/55">{g}</p>
            <ul className="mt-1.5 space-y-2" aria-label={g}>
              {list.filter((e) => e.group === g).map((e) => (
                <Entry key={e.id} e={e} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="mt-2 space-y-2" aria-label="도감 목록">
          {list.map((e) => (
            <Entry key={e.id} e={e} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** 업적: 아직 달성하지 못한 업적은 이름만 보인다. */
function Achievements({ player }) {
  const got = ACHIEVEMENTS.filter((a) => player.achievements?.[a.id]).length
  return (
    <div>
      <p className="text-[11px] text-paper/50">
        달성 {got} / {ACHIEVEMENTS.length}
      </p>
      <ul className="mt-2 space-y-2" aria-label="업적 목록">
        {ACHIEVEMENTS.map((a) => {
          const rec = player.achievements?.[a.id]
          return rec ? (
            <li key={a.id} data-ach={a.id} data-done="1" className="flex items-start gap-3 rounded-xl bg-edge/[0.07] p-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-fill text-ink light:text-ink">
                <Check size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base text-paper">[{a.name}]</p>
                <p className="mt-1 text-xs leading-relaxed text-paper/80">{a.desc}</p>
                <p className="mt-1.5 text-[11px] text-paper/55">달성 조건 · {a.hint}</p>
                <p className="mt-0.5 text-xs text-gold">
                  보상 · {rewardText(a.reward)} <span className="ml-2 text-[10px] text-paper/45">{fmtDate(rec.at)} 달성</span>
                </p>
              </div>
            </li>
          ) : (
            <li key={a.id} data-ach={a.id} data-done="0" className="flex items-center gap-3 rounded-xl bg-edge/[0.05] p-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-edge/15 text-paper/50">
                <Lock size={18} aria-hidden />
              </span>
              <p className="font-serif text-base text-paper/55">[{a.name}]</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 업적 · 도감 팝업. */
export default function CodexModal({ player, onClose }) {
  const [tab, setTab] = useState('ach')
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const TABS = [
    { id: 'ach', label: '업적', icon: Trophy },
    { id: 'codex', label: '도감', icon: BookMarked },
  ]
  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="업적과 도감" className="ink-panel flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <div role="tablist" aria-label="업적 · 도감" className="flex gap-1.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`tilt inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-serif text-base ${
                  tab === id ? 'bg-gold-fill text-ink light:text-ink' : 'bg-edge/[0.07] text-paper/80 hover:bg-edge/[0.14]'
                }`}
              >
                <Icon size={15} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="업적과 도감 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{tab === 'ach' ? <Achievements player={player} /> : <Codex player={player} />}</div>
      </div>
    </div>
  )
}
