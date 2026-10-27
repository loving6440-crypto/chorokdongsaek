import { useEffect, useRef, useState } from 'react'
import { Dices, Eye, Flame, Shield, Sparkles, Swords, Users, Zap } from 'lucide-react'
import { specialSummary, BUFF_COST, mpCostOf, ACTIONS, ENEMIES, INTENTS, ownedPsychics, partyLabel, PSYCHICS, rashPercent, recLabel, revealOf, scanTurns } from '../../game/battle'
import { MULTI_TAG } from '../../game/mbattle'
import { tierLabel } from '../../game/constants'
import { Bar, enemyHpTone, vague } from './battleUi'
import SpBanner from '../SpBanner'
import { AllyPsychicBanner, AllyToastStack } from '../AllyPopup'

const ACTION_ICONS = { attack: Swords, guard: Shield, charm: Sparkles, scan: Eye, psychic: Zap }
const ACTION_ORDER = ['attack', 'guard', 'charm', 'scan', 'psychic']
const STATUS_LABEL = { alive: '', down: '전투불능', fled: '이탈' }

/**
 * 다인 전투 화면. 판은 서버가 진행하고, 여기서는 상태를 보여 주고 내 행동을 보낸다.
 * view: 서버가 보낸 판 상태. 라운드마다 살아 있는 모두가 행동을 고르면 한꺼번에 해결된다.
 */
export default function MultiBattle({ meId, view, stats, seen, specials, psychics = [], onAct, onSurvive, onOpenItems, onSpecialSeen, onClose }) {
  const enemy = ENEMIES.find((e) => e.id === view.enemyId)
  const me = view.members.find((m) => m.id === meId)
  const [psyOpen, setPsyOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanN, setScanN] = useState(1)
  const [buffArmed, setBuffArmed] = useState(false) // 효험을 켜 두었는가(다음 공격/부적/생존본능·원숭이 손·도깨비불에 적용)
  const [pawAmt, setPawAmt] = useState(1) // 원숭이 손: 깎을 체력
  const [echoTarget, setEchoTarget] = useState(meId) // 형상 기억: 체력을 회복시킬 대상(기본값은 자기 자신)
  const [karmicTarget, setKarmicTarget] = useState(meId) // 업인과보: 지정할 대상(기본값은 자기 자신)
  const [sending, setSending] = useState(false)
  const [spBanner, setSpBanner] = useState(null)
  const [allyBanner, setAllyBanner] = useState(null)
  const [toasts, setToasts] = useState([])
  const [dice, setDice] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const lastLog = useRef(0)
  const seenSp = useRef({ ...specials })
  const spText = useRef({}) // 영능력 로그 id → 보여 줄 문구(처음 본 비기만 설명이 붙는다)

  // 새 로그가 오면: 영능력 발동 연출 · 도감 반영 · 내 마지막 주사위
  useEffect(() => {
    const fresh = view.log.filter((l) => l.id > lastLog.current)
    if (!fresh.length) return
    const first = lastLog.current === 0
    lastLog.current = view.log[view.log.length - 1].id
    if (first) return // 다시 접속했을 때 지난 기록으로는 연출하지 않는다
    for (const e of fresh) {
      if (e.kind !== 'special') continue
      spText.current[e.id] = specialSummary(e)
    }
    const sp = [...fresh].reverse().find((e) => e.kind === 'special')
    if (sp) {
      setSpBanner({ label: sp.label, note: sp.note, chance: sp.chance, effects: sp.effects, result: sp.result, k: Math.random() })
      if (!seenSp.current[sp.enemyId]) {
        seenSp.current = { ...seenSp.current, [sp.enemyId]: true }
        onSpecialSeen?.(sp.enemyId)
      }
    }
    const mine = [...fresh].reverse().find((e) => e.roll && e.by === meId)
    if (mine) setDice({ n: mine.roll, kind: mine.kind, k: Math.random() })
    // 아군 영능력 사용: 적군 영능력처럼 큼직하게 꾸며진 팝업으로
    const psy = [...fresh].reverse().find((e) => e.popup?.type === 'psychic')
    if (psy) {
      const def = PSYCHICS.find((p) => p.id === psy.popup.psychic)
      setAllyBanner({ name: psy.popup.name, label: def?.label ?? psy.popup.psychic, note: def?.note, k: Math.random() })
    }
    // 아이템 사용 · 전투불능 · 부활: 짧은 토스트로
    const toastEvs = fresh.filter((e) => e.popup && e.popup.type !== 'psychic')
    if (toastEvs.length) {
      const made = toastEvs.map((e) => {
        const p = e.popup
        const text =
          p.type === 'downed'
            ? `${p.name} 전투불능!`
            : p.type === 'revived'
              ? `${p.name} 다시 일어섰다!`
              : `${p.name}이(가) ${p.item}을(를) 사용${p.target ? ` (${p.target})` : ''}`
        return { k: `${e.id}-${Math.random()}`, type: p.type, text }
      })
      setToasts((prev) => [...prev, ...made])
      made.forEach((t) => setTimeout(() => setToasts((prev) => prev.filter((x) => x.k !== t.k)), 2700))
    }
  }, [view.log, meId, onSpecialSeen])
  useEffect(() => {
    if (!spBanner) return undefined
    const t = setTimeout(() => setSpBanner(null), 6200)
    return () => clearTimeout(t)
  }, [spBanner])
  useEffect(() => {
    if (!allyBanner) return undefined
    const t = setTimeout(() => setAllyBanner(null), 6200)
    return () => clearTimeout(t)
  }, [allyBanner])
  // 새 라운드가 시작되거나, 서버가 새 로그를 보내오면(의지력 부족 등으로 행동이 무효가 되어 내 턴이 그대로 유지되는
  // 경우도 포함) 보냈다는 표시를 푼다. view.turn 등은 그대로인데 로그만 새로 온 경우를 놓치면, 유효한 행동을
  // 고를 때까지 턴은 넘어가지 않지만 '보내는 중' 표시가 풀리지 않아 아무 행동도 못 하게 되는 문제가 있었다.
  const lastLogId = view.log?.[view.log.length - 1]?.id
  useEffect(() => {
    setSending(false)
    setPsyOpen(false)
    setScanOpen(false)
    setBuffArmed(false)
  }, [view.round, view.phase, view.turn, lastLogId])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const have = me ? Math.floor(me.mp) : 0
  const fighting = me?.status === 'alive'
  const inputPhase = view.phase === 'input' && fighting && !view.over
  const acted = !!me?.acted || sending
  const myTurn = !!me && view.turn === me.id
  const canAct = inputPhase && !acted && myTurn && !me?.fire // 한 사람씩 차례대로: 내 차례일 때만 (도깨비불로 기를 모으는 중엔 자동으로 진행되어 입력하지 않는다)
  const turnName = view.members.find((m) => m.id === view.turn)?.name
  const rv = revealOf(enemy, stats, seen?.[enemy.id] || 0)
  const q = (ok, v) => (ok ? v : '???')
  const left = view.deadline ? Math.max(0, Math.ceil((view.deadline - now) / 1000)) : null
  const waiting = view.members.filter((m) => m.status === 'alive' && !m.acted && view.phase === 'input')
  const shown = Math.min(view.known, view.queue.length)
  const rash = rashPercent(stats)

  const send = async (act) => {
    if (!canAct) return
    const buffed =
      buffArmed &&
      (act.action === 'attack' ||
        act.action === 'charm' ||
        (act.action === 'psychic' && (act.psychic === 'survival' || act.psychic === 'monkey-paw' || act.psychic === 'dokkaebi-fire')))
    setSending(true)
    setPsyOpen(false)
    setScanOpen(false)
    if (buffed) setBuffArmed(false)
    const r = await onAct(buffed ? { ...act, buff: true } : act)
    if (!r?.ok) setSending(false)
  }
  const pick = (id) => {
    if (id === 'psychic') {
      setScanOpen(false)
      return setPsyOpen((o) => !o)
    }
    if (id === 'scan') {
      if (!canAct || have < mpCostOf(stats, 1)) return
      setPsyOpen(false)
      setScanN((n) => Math.max(1, Math.min(have, n)))
      return setScanOpen((o) => !o)
    }
    if (id === 'charm' && (me.charms <= 0 || have < 1)) return // 부적은 의지력이 모자라도 쓸 수 있지만, 0일 때는 쓸 수 없다
    if (id === 'guard' && me.bound) return
    send({ action: id })
  }
  // 효험(모두가 가진 영능력): 켜 두면 차례를 쓰지 않는다. 다음에 고르는 일반 공격·부적·생존본능이 두 번 굴러간다.
  // 의지력 10을 정확히 다 낼 수 있어야만 켤 수 있다(모자라면 토글 자체가 막힌다). (v70)
  const toggleBuff = () => {
    if (!canAct) return
    setBuffArmed((v) => (!v && have < mpCostOf(stats, BUFF_COST) ? v : !v))
  }
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const i = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
      if (i >= 0) pick(ACTION_ORDER[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const danger = me && me.php <= me.phpMax * 0.3 && me.status === 'alive'
  const textOf = (l) => {
    if (l.kind !== 'special') return l.text
    return spText.current[l.id] ?? specialSummary(l)
  }

  return (
    <section aria-label="다인 전투" data-mb className={`relative ${spBanner ? 'sp-shake' : ''}`}>
      <SpBanner sp={spBanner} onEnd={() => setSpBanner(null)} />
      <AllyPsychicBanner sp={allyBanner} onEnd={() => setAllyBanner(null)} />
      <AllyToastStack toasts={toasts} className={allyBanner || spBanner ? 'top-[11.5rem]' : 'top-10'} />
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span>
          <Users size={13} className="mr-1 inline align-[-2px]" aria-hidden />
          다인 전투 · 라운드 <b className="font-serif text-base text-paper">{view.round}</b>
        </span>
        <span className={`rounded-full px-3 py-0.5 ${canAct ? 'bg-gold-fill text-ink light:text-ink' : 'bg-edge/10'}`} aria-live="polite" data-mb-status>
          {view.over
            ? '전투 종료'
            : view.phase === 'survive'
              ? '쓰러지는 중…'
              : !fighting
                ? '관전 중'
                : myTurn && me?.fire
                  ? '✦ 도깨비불에 기를 모으는 중…'
                  : canAct
                    ? `내 차례 — 행동을 고른다${left != null ? ` · ${left}초` : ''}`
                    : turnName && view.members.find((x) => x.id === view.turn)?.fire
                      ? `${turnName} 님이 도깨비불에 기를 모으는 중…`
                      : `${turnName ? `${turnName} 님의 차례` : '상대의 차례'}를 기다리는 중${left != null && turnName ? ` · ${left}초` : ''}`}
        </span>
      </div>

      {view.log.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-shade/20 px-3 py-1.5 font-mono text-[11px] leading-relaxed" aria-live="polite" aria-label="방금 일어난 일" data-mb-recent>
          {[...view.log].slice(-2).reverse().map((l) => (
            <li key={l.id} className={l.kind === 'enemy' ? 'text-crimson' : l.kind === 'warn' || l.kind === 'end' || l.kind === 'rash' || l.kind === 'special' ? 'text-gold' : 'text-paper/85'}>
              {textOf(l)}
            </li>
          ))}
        </ul>
      )}

      {view.boss && (
        <p className="mt-2 rounded-lg bg-crimson/15 px-3 py-1.5 text-[11px] text-paper/80" data-boss-note>
          보스 전투 — 가져온 아이템만 쓸 수 있다{me?.bring ? ` (남은 ${Object.values(me.bring).reduce((a, b) => a + b, 0)}개)` : ''}.
          {view.rage ? <b className="ml-1 text-crimson" data-rage={view.rage}>{view.rage >= 2 ? '광분 — 약공이 모두 단체 공격!' : '분노 — 3라운드마다 반드시 영능력!'}</b> : null}
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="ink-panel rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">
              <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle font-sans text-[11px] text-gold">{tierLabel(enemy.tier)}</span>
              {enemy.name}
              <span className="ml-2 rounded-full border border-gold/50 px-1.5 py-px align-middle font-sans text-[10px] text-gold">{MULTI_TAG}</span>
              {view.boss && <span data-boss-tag className="ml-1 rounded-full bg-crimson/80 px-1.5 py-px align-middle font-sans text-[10px] text-[#fbf6e9]">보스</span>}
            </p>
            <p className="text-xs tabular-nums text-paper/70">{rv.hp ? `${view.ehp} / ${enemy.hp}` : '체력 ???'}</p>
          </div>
          <p className="mt-0.5 text-[10px] text-paper/50">{recLabel(enemy)} · {partyLabel(enemy)}</p>
          <div className="mt-2">
            <Bar value={view.ehp} max={enemy.hp} tone={enemyHpTone(view.ehp, enemy.hp, enemy?.gimmicks?.length > 0)} label="상대 체력" hidden={!rv.hp} />
          </div>
          {!rv.hp && <p className="mt-1 text-[11px] text-paper/55">{vague(view.ehp, enemy.hp)}</p>}
          <p className="mt-2 grid grid-cols-3 gap-x-2 text-[11px] tabular-nums text-paper/70">
            <span>공격력 {q(rv.atk, enemy.atk)}</span>
            <span>행동력 {q(rv.act, enemy.act)}</span>
            <span>영력 {q(rv.spirit, enemy.spirit)}</span>
          </p>
          {!view.over && (
            <div className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-sm text-paper/85" aria-label="상대의 다음 행동">
              <p className="text-[11px] text-paper/55">상대의 다음 행동 (일행 누구든 간파하면 모두에게 보인다)</p>
              {shown > 0 ? (
                <ol className="mt-1 flex flex-wrap gap-1.5">
                  {view.queue.slice(0, Math.min(shown, 14)).map((k, i) => (
                    <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${k === 'smash' ? 'bg-crimson/25 text-crimson' : k === 'special' ? 'bg-gold/20 text-gold' : 'bg-edge/10'}`}>
                      {i + 1}. {INTENTS[k].label}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-xs text-paper/60">알 수 없다. 간파로 읽을 수 있다.</p>
              )}
              <p className="mt-1 text-[11px] text-paper/50">상대는 일행 중 체력이 가장 많은 사람을 노린다. (단체 공격이면 일행 전원)</p>
            </div>
          )}
        </div>

        <div className={`ink-panel rounded-xl p-4 ${danger ? 'ring-2 ring-crimson/70' : ''}`}>
          <p className="font-serif text-lg text-paper">일행</p>
          <ul className="mt-2 space-y-2" aria-label="일행 상태">
            {view.members.map((m) => (
              <li key={m.id} data-mb-member={m.id} data-current-turn={m.id === view.turn && view.phase === 'input' && !view.over && m.status === 'alive' ? '1' : '0'} className={`rounded-lg px-3 py-2 transition-shadow ${m.id === view.turn && view.phase === 'input' && !view.over && m.status === 'alive' ? 'bg-gold-fill/35 ring-2 ring-gold shadow-[0_0_14px_rgba(250,204,21,0.45)]' : m.id === meId ? 'bg-gold-fill/15' : 'bg-edge/[0.07]'} ${m.status !== 'alive' ? 'opacity-60' : ''}`}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-paper">
                    {m.name}
                    {m.id === meId && <span className="ml-1 text-gold">(나)</span>}
                    {STATUS_LABEL[m.status] && <span className="ml-1.5 rounded-full bg-crimson/25 px-1.5 text-[10px] text-crimson">{STATUS_LABEL[m.status]}</span>}
                    {m.pendingDeath && <span className="ml-1.5 text-[10px] text-crimson">쓰러지는 중</span>}
                    {m.status === 'alive' && view.phase === 'input' && !view.over && <span className={`ml-1.5 text-[10px] ${m.id === view.turn ? 'text-gold' : 'text-paper/45'}`} data-turn-mark={m.id === view.turn ? '1' : '0'}>{m.id === view.turn ? '▶ 지금 차례' : `${(view.order ?? []).indexOf(m.id) + 1 > 0 ? `${(view.order ?? []).indexOf(m.id) + 1}번째` : ''}`}</span>}
                  </span>
                  <span className="tabular-nums text-paper/70">
                    {m.php} / {m.phpMax}
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={m.php} max={m.phpMax} tone={m.php <= m.phpMax * 0.3 ? 'bg-crimson' : 'bg-mana'} label={`${m.name} 체력`} />
                </div>
                <p className="mt-1 flex flex-wrap gap-1 text-[10px] text-paper/60">
                  <span>의지력 {Math.floor(m.mp)}</span>
                  <span>· 부적 {m.charms}장</span>
                  {m.bound && <span className="text-crimson">· 막기 불가</span>}
                  {m.boost && <span className="text-gold">· 마이쮸 대기</span>}
                  {m.revive && <span className="text-gold">· 부활 대기</span>}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <div
              key={dice?.k}
              className={`grid size-12 shrink-0 place-items-center rounded-lg ${dice ? (dice.kind === 'enemy' ? 'bg-crimson/80' : 'bg-gold-fill') : 'bg-edge/10'} ${dice ? 'dice-pop' : ''}`}
              style={{ transform: 'rotate(45deg)' }}
              aria-label="마지막 주사위"
            >
              <span className="-rotate-45 font-serif text-xl text-ink light:text-ink">{dice ? dice.n : <Dices size={18} aria-hidden />}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-paper/60">
              내 마지막 굴림 · 돌발 {rash}%
            </p>
          </div>
        </div>
      </div>

      {!view.over && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-paper/55">
          <span>소지품: 회복 아이템은 나에게, 마이쮸는 일행 누구에게든 건넬 수 있다. (턴을 쓰지 않는다)</span>
          <button type="button" onClick={onOpenItems} className="flat-chip tilt shrink-0">
            소지품
          </button>
        </div>
      )}

      {!view.over && view.phase === 'input' && (
        <p className={`mt-2 rounded-lg px-3 py-1.5 text-center text-xs ${canAct ? 'bg-gold-fill/30 text-gold ring-1 ring-gold' : 'bg-edge/[0.07] text-paper/60'}`} data-mb-turn-note>
          {canAct ? '지금은 내 차례다. 행동을 고르면 차례가 끝난다.' : `${turnName ? `${turnName} 님` : '다른 사람'}의 차례가 끝날 때까지는 행동을 고를 수 없다.`}
        </p>
      )}
      {!view.over && (
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" role="group" aria-label="행동 선택">
          {ACTION_ORDER.map((id, i) => {
            const Icon = ACTION_ICONS[id]
            const off =
              !canAct && id !== 'psychic'
                ? true
                : id === 'psychic'
                  ? !canAct
                  : (id === 'charm' && (me.charms <= 0 || have < 1)) || (id === 'scan' && have < mpCostOf(stats, 1)) || (id === 'guard' && me.bound)
            return (
              <button
                key={id}
                type="button"
                disabled={off}
                onClick={() => pick(id)}
                aria-pressed={id === 'psychic' ? psyOpen : undefined}
                data-mb-act={id}
                className="tilt flex flex-col items-start gap-1 rounded-xl bg-edge/[0.07] p-3 text-left enabled:hover:bg-gold-fill/20 disabled:opacity-40"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-paper">
                  <Icon size={15} aria-hidden className="text-gold" />
                  {ACTIONS[id].label}
                  <span className="text-[10px] text-paper/40">{i + 1}</span>
                </span>
                <span className="text-[10.5px] leading-snug text-paper/60">{id === 'scan' ? `의지력 N. 1이면 ${scanTurns(stats, enemy)}턴, 1 늘 때마다 1턴 더 본다.` : ACTIONS[id].note}</span>
              </button>
            )
          })}
        </div>
      )}

      {buffArmed && !view.over && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gold" data-buff-armed>
          <Flame size={12} aria-hidden />
          효험이 켜져 있다 — 다음 일반 공격·부적·생존본능이 두 번 굴러 더 나은 쪽으로 들어간다.
        </p>
      )}

      {scanOpen && !view.over && (
        <div className="ink-panel mt-3 rounded-xl p-4" role="region" aria-label="간파">
          <p className="font-serif text-base text-gold">간파</p>
          {(() => {
            const n = Math.max(1, Math.min(have, scanN))
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" aria-label="간파 의지력 줄이기" onClick={() => setScanN(Math.max(1, n - 1))} disabled={n <= 1} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">−</button>
                <span className="w-10 text-center text-sm text-paper">{n}</span>
                <button type="button" aria-label="간파 의지력 늘리기" onClick={() => setScanN(Math.min(have, n + 1))} disabled={n >= have} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">+</button>
                <span className="text-xs text-gold">의지력 {n} → {scanTurns(stats, enemy, n)}턴</span>
                <button type="button" onClick={() => send({ action: 'scan', scanAmount: n })} disabled={!canAct} className="flat-btn justify-center disabled:opacity-40" data-scan-go>
                  <Eye size={14} aria-hidden />
                  간파 사용
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {psyOpen && !view.over && (
        <div className="ink-panel mt-3 rounded-xl p-4" role="region" aria-label="영능력 목록">
          <p className="font-serif text-base text-gold">영능력</p>
          {(() => {
            // 보스 전투에서는 미리 가져가기로 고른 영능력(최대 2개, 효험은 제외)만 쓸 수 있다. (v71)
            const mine = ownedPsychics(psychics).filter((p) => p.default || !view.boss || !Array.isArray(me?.psychicBring) || me.psychicBring.includes(p.id))
            if (!mine.length) return <p className="mt-2 text-sm text-paper/65">획득한 영능력이 없습니다.</p>
            const pawMax = Math.max(1, Math.floor(me?.php ?? 1) - 1)
            const aliveMates = view.members.filter((x) => x.status === 'alive')
            return (
              <ul className="mt-2 space-y-2">
                {mine.map((s) => (
                  <li key={s.id} data-psychic={s.id} className="rounded-lg bg-edge/[0.07] px-3 py-2">
                    <p className="text-sm text-paper">{s.label}</p>
                    <p className="text-[11px] text-paper/60">{s.note}</p>
                    {s.detail && <p className="mt-1 text-[11px] text-gold/80">{s.detail}</p>}
                    {s.toggle ? (
                      <button
                        type="button"
                        aria-pressed={buffArmed}
                        disabled={!canAct || (!buffArmed && have < mpCostOf(stats, BUFF_COST))}
                        onClick={toggleBuff}
                        className={`flat-btn mt-2 justify-center disabled:opacity-40 ${buffArmed ? 'bg-gold-fill text-ink' : ''}`}
                      >
                        {buffArmed ? '켜짐 (끄기)' : `켜기 (의지력 ${mpCostOf(stats, BUFF_COST)})`}
                      </button>
                    ) : s.id === 'monkey-paw' ? (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button type="button" aria-label="깎을 체력 줄이기" onClick={() => setPawAmt((n) => Math.max(1, n - 1))} disabled={pawAmt <= 1} className="grid size-7 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">−</button>
                          <input
                            aria-label="깎을 체력"
                            inputMode="numeric"
                            value={pawAmt}
                            onChange={(e) => setPawAmt(Math.max(1, Math.min(pawMax, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)))}
                            className="h-7 w-14 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
                          />
                          <button type="button" aria-label="깎을 체력 늘리기" onClick={() => setPawAmt((n) => Math.min(pawMax, n + 1))} disabled={pawAmt >= pawMax} className="grid size-7 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">+</button>
                          <span className="text-[11px] text-paper/60">의지력 {Math.ceil(Math.min(pawMax, pawAmt) / 2)} 소모</span>
                        </div>
                        <button type="button" data-psychic-use="monkey-paw" disabled={!canAct} onClick={() => send({ action: 'psychic', psychic: 'monkey-paw', sacrifice: pawAmt })} className="flat-btn mt-2 justify-center disabled:opacity-40">
                          사용
                        </button>
                      </>
                    ) : s.id === 'echo-form' ? (
                      <>
                        <select
                          data-echo-target-pick
                          aria-label="체력을 회복시킬 대상"
                          value={echoTarget || meId}
                          onChange={(e) => setEchoTarget(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper"
                        >
                          {aliveMates.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}{x.id === meId ? ' (나)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-psychic-use="echo-form"
                          disabled={!canAct}
                          onClick={() => send({ action: 'psychic', psychic: 'echo-form', target: echoTarget || meId })}
                          className="flat-btn mt-2 justify-center disabled:opacity-40"
                        >
                          사용
                        </button>
                      </>
                    ) : s.id === 'karmic-recompense' ? (
                      <>
                        <select
                          data-karmic-target-pick
                          aria-label="지정할 대상"
                          value={karmicTarget || meId}
                          onChange={(e) => setKarmicTarget(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper"
                        >
                          {aliveMates.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}{x.id === meId ? ' (나)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-psychic-use="karmic-recompense"
                          disabled={!canAct}
                          onClick={() => send({ action: 'psychic', psychic: 'karmic-recompense', target: karmicTarget || meId })}
                          className="flat-btn mt-2 justify-center disabled:opacity-40"
                        >
                          사용
                        </button>
                      </>
                    ) : (
                      s.use && (
                        <button type="button" data-psychic-use={s.id} disabled={!canAct} onClick={() => send({ action: 'psychic', psychic: s.id })} className="flat-btn mt-2 justify-center disabled:opacity-40">
                          사용
                        </button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )
          })()}
        </div>
      )}

      {me?.pendingDeath && !view.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center" role="alertdialog" aria-label="버티기" data-mb-survive>
          <p className="font-serif text-xl text-crimson">체력이 바닥났다!</p>
          <p className="mt-1 text-sm text-paper/80">
            버티기를 쓰면 의지력 <b className="text-gold">{Math.max(0, have - 1)}</b>을(를) 전부 쏟고 체력 1로 일어선다. 포기하면 이 전투에서 쓰러진다. (일행은 계속 싸운다)
          </p>
          <p className="mt-1 text-[11px] text-paper/60">버티기는 한 전투에 한 번뿐이다. 인내 {Math.min(100, stats.endurance * 2)}% 확률로 의지력을 쓰지 않는다.{left != null && ` · ${left}초 안에 고르지 않으면 쓰러진다.`}</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={() => onSurvive(true)} disabled={have < 2} className="flat-btn justify-center disabled:opacity-40">버티기</button>
            <button type="button" onClick={() => onSurvive(false)} className="flat-btn justify-center !bg-crimson">쓰러진다</button>
          </div>
        </div>
      )}
      {view.phase === 'survive' && !me?.pendingDeath && !view.over && <p className="mt-3 text-center text-xs text-paper/60">일행이 버틸지 정하고 있다…</p>}

      {view.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center" data-mb-result>
          {(() => {
            const r = me?.result
            return (
              <>
                <p className={`font-serif text-2xl ${r === 'win' ? 'text-gold' : r === 'fled' ? 'text-paper' : 'text-crimson'}`}>{r === 'win' ? '승리' : r === 'fled' ? '이탈' : '패배'}</p>
                {r === 'win' && <p className="mt-1 text-xs text-paper/70">일행이 함께 {enemy.name}을(를) 쓰러뜨렸다. (영력 +{enemy.reward}, 하루 보상 한도 안에서)</p>}
                {r === 'lose' && <p className="mt-1 text-xs text-paper/70">일행이 모두 쓰러졌다.</p>}
                <button type="button" onClick={onClose} className="flat-btn mt-3 justify-center">
                  상대 고르기
                </button>
              </>
            )
          })()}
        </div>
      )}

      <ul className="mt-3 max-h-48 space-y-1 overflow-auto rounded-xl bg-shade/30 p-3 font-mono text-[11px] leading-relaxed" aria-label="전체 전투 기록">
        {[...view.log].reverse().map((l) => (
          <li key={l.id} className={l.kind === 'enemy' ? 'text-crimson' : l.kind === 'warn' || l.kind === 'end' || l.kind === 'rash' || l.kind === 'special' ? 'text-gold' : 'text-paper/80'}>
            {textOf(l)}
          </li>
        ))}
      </ul>
    </section>
  )
}
