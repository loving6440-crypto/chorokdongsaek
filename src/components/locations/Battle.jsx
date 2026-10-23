import { useCallback, useEffect, useRef, useState } from 'react'
import { Dices, Eye, Flame, Shield, Sparkles, Swords } from 'lucide-react'
import {
  ACTIONS,
  ENEMIES,
  INTENTS,
  enemyTurn,
  newBattle,
  playerTurn,
  rashPercent,
  resolveSurvive,
  revealOf,
  rollInitiative,
  scanTurns,
} from '../../game/battle'

const ACTION_ICONS = { attack: Swords, guard: Shield, charm: Sparkles, scan: Eye, buff: Flame }
const ACTION_ORDER = ['attack', 'guard', 'charm', 'scan', 'buff']
const ENEMY_DELAY = 900

import { Bar, vague } from './battleUi'
import Tutorial from './Tutorial'

/** 체육관 전투: 턴제, 10면체. 상대의 능력치와 다음 행동은 가려져 있고, 안목·조우 횟수·간파로 드러난다. */
export default function Battle({ stats, mp, hp, hpMax, seen, specials, tutorialDone, rewardLeft, onStart, onMp, onHp, onFinish, onSpecialSeen, onTutorialStart, onTutorialDone, reviveOn, onReviveUsed, onActive, itemsUsed, onSpotItems, onGiveItem, onOpenItems }) {
  const [phase, setPhase] = useState('pick') // pick | fight | result
  const [b, setB] = useState(null)
  const [fights, setFights] = useState(0)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [dice, setDice] = useState(null)
  const timer = useRef(null)
  const reported = useRef(false)
  const bRef = useRef(null)
  bRef.current = b
  const mpRef = useRef(mp)
  const mpProp = useRef(mp)
  mpProp.current = mp
  const fightingRef = useRef(false)
  mpRef.current = mp // 의지력은 항상 바깥(게임)의 값을 따른다. 아이템으로 바뀔 수 있다.
  const reviveRef = useRef(false)
  reviveRef.current = reviveOn

  const activeCb = useRef(onActive)
  activeCb.current = onActive
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      activeCb.current?.(false)
    },
    [],
  )

  // 전투 중 아이템으로 체력이 오르면 전투 체력에도 반영한다.
  useEffect(() => {
    if (!fightingRef.current) return
    setB((cur) => {
      if (!cur || cur.over || cur.pendingDeath || cur.php <= 0) return cur
      const h = Math.floor(hp)
      return h > cur.php ? { ...cur, php: Math.min(cur.phpMax, h) } : cur
    })
  }, [hp])

  // 체력은 전투 후에도 이어진다: 바뀔 때마다 몸 상태(비율)를 바깥에 알린다.
  const lastHp = useRef(null)
  useEffect(() => {
    if (!b || phase === 'pick') return
    const key = b.php + '/' + b.phpMax
    if (lastHp.current === key) return
    lastHp.current = key
    onHp?.(b.php)
  }, [b, phase, onHp])

  const spend = useCallback(
    (delta) => {
      if (!delta) return
      mpRef.current = Math.max(0, mpRef.current + delta)
      onMp?.(delta)
    },
    [onMp],
  )

  const knownSp = useRef({})
  knownSp.current = { ...specials, ...knownSp.current }
  const push = useCallback((events) => {
    events = events.map((e) => {
      if (e.kind !== 'special') return e
      const first = !knownSp.current[e.enemyId]
      if (first) {
        knownSp.current = { ...knownSp.current, [e.enemyId]: true }
        onSpecialSeen?.(e.enemyId)
        return { ...e, text: `✦ 특수 행동 《${e.label}》 — ${e.note} (처음 본 비기는 이렇게 설명이 붙는다.)` }
      }
      return { ...e, text: `✦ 특수 행동 《${e.label}》` }
    })
    setLog((l) => [...events.map((e) => ({ ...e, id: Math.random() })), ...l].slice(0, 40))
    const last = [...events].reverse().find((e) => e.roll)
    if (last) setDice({ n: last.roll, kind: last.kind, k: Math.random() })
  }, [])

  const finish = useCallback(
    (state) => {
      if (reported.current) return
      reported.current = true
      fightingRef.current = false
      onActive?.(false)
      setPhase('result')
      onFinish({ win: state.over === 'win', enemy: state.enemy })
    },
    [onFinish, onActive],
  )

  const runEnemy = useCallback(
    (state, delay = ENEMY_DELAY) => {
      setBusy(true)
      timer.current = setTimeout(() => {
        const r = enemyTurn(state, { stats, mp: mpRef.current })
        spend(-r.mpDrain)
        let st = r.state
        let evs = r.events
        // 에너지드링크: 전투불능이 되는 순간 1회 체력 1로 부활, 전투는 계속된다.
        if ((st.pendingDeath || st.over === 'lose') && reviveRef.current) {
          st = { ...st, php: 1, pendingDeath: false, over: null }
          evs = [...evs.filter((e) => e.kind !== 'end' && !/버티기를 쓸 수 있다/.test(e.text || '')), { kind: 'warn', text: '에너지드링크의 힘으로 체력 1로 다시 일어섰다!' }]
          reviveRef.current = false
          onReviveUsed?.()
        }
        setB(st)
        push(evs)
        setBusy(false)
        if (st.over) finish(st)
      }, delay)
    },
    [stats, push, finish, spend, onReviveUsed],
  )

  const start = (enemyId) => {
    onStart?.(enemyId)
    onActive?.(true)
    reported.current = false
    fightingRef.current = true
    mpRef.current = mpProp.current
    const s = newBattle(enemyId, stats, Math.random, hp, hpMax)
    const n = seen?.[enemyId] || 0
    setFights(n)
    const init = rollInitiative(s.enemy, stats)
    const lines = [{ kind: 'info', text: `${s.enemy.name}이(가) 나타났다.` }]
    if (init.auto) {
      lines.push({ kind: 'info', text: `선공 판정: 신속 ${stats.agility} ≥ 행동력이라 내가 먼저 움직인다.` })
    } else {
      lines.push({
        kind: 'info',
        roll: init.a,
        text: `선공 판정: d10 ${init.a} + d${stats.agility} ${init.b} = ${init.total} → ${init.playerFirst ? '내가 먼저 움직인다.' : '상대가 먼저 움직인다!'}`,
      })
    }
    setB(s)
    setLog([])
    setDice(null)
    setPhase('fight')
    push(lines.reverse())
    if (!init.playerFirst) runEnemy(s)
  }

  const act = useCallback(
    (action) => {
      const cur = bRef.current
      if (!cur || cur.over || cur.pendingDeath || busy || phase !== 'fight') return
      const have = Math.floor(mpRef.current)
      if (action === 'charm' && cur.charms <= 0) return
      if ((action === 'buff' || action === 'scan' || action === 'charm') && have < 1) return
      const r = playerTurn(cur, action, { stats, mp: mpRef.current })
      spend(-r.mpCost)
      setB(r.state)
      push(r.events)
      if (r.state.over) finish(r.state)
      else runEnemy(r.state)
    },
    [busy, phase, stats, push, finish, runEnemy, spend],
  )

  const survive = (accept) => {
    const cur = bRef.current
    if (!cur?.pendingDeath) return
    const r = resolveSurvive(cur, accept, mpRef.current)
    spend(-r.mpCost)
    setB(r.state)
    push(r.events)
    if (r.state.over) finish(r.state)
  }

  useEffect(() => {
    if (phase !== 'fight') return
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const i = ['1', '2', '3', '4', '5'].indexOf(e.key)
      if (i >= 0) act(ACTION_ORDER[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, act])

  const rash = rashPercent(stats)

  if (phase === 'tutorial') {
    return (
      <Tutorial
        stats={stats}
        hp={hp}
        hpMax={hpMax}
        mp={mp}
        onMp={onMp}
        onHp={onHp}
        itemsUsed={itemsUsed}
        onSpotItems={onSpotItems}
        onGiveItem={onGiveItem}
        onExit={() => setPhase('pick')}
        onDone={() => {
          onTutorialDone?.()
          setPhase('pick')
        }}
      />
    )
  }

  if (phase === 'pick') {
    return (
      <section>
        <p className="text-sm leading-relaxed text-paper/75">
          붉은 마루 위에서 10면체 주사위로 퇴마 실전을 흉내 낸다. 상대의 정체는 가려져 있다. 안목이 높거나 몇 번 겨뤄 볼수록 더 많이 보인다.
          오늘 영력을 얻는 승리는 <b className="text-gold">{rewardLeft}회</b> 남았다. 지면 영력을 조금 잃는다. 체력과 의지력은 전투가 끝나도 그대로 이어지고, 양호실에서만 찬다.
        </p>
        <button
          type="button"
          onClick={() => {
            onTutorialStart?.()
            setPhase('tutorial')
          }}
          className="ink-panel tilt mt-4 flex w-full items-center gap-3 rounded-xl p-4 text-left hover:bg-gold-fill/15"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-fill/25 font-serif text-lg text-gold" aria-hidden>
            ?
          </span>
          <span className="flex-1">
            <span className="block font-serif text-base text-paper">전투 교육 과정</span>
            <span className="block text-xs text-paper/60">
              바리와 함께 전투 규칙을 하나씩 익힌다. {tutorialDone ? '(수료함 · 다시 볼 수 있다)' : '처음이라면 먼저 들어 보자.'}
            </span>
          </span>
        </button>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {ENEMIES.map((e) => {
            const rv = revealOf(e, stats, seen?.[e.id] || 0)
            const q = (ok, v) => (ok ? v : '???')
            return (
              <li key={e.id} className="ink-panel tilt flex flex-col rounded-xl p-4">
                <p className="font-serif text-lg text-paper">{e.name}</p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-paper/60">{e.blurb}</p>
                <p className="mt-2 grid grid-cols-2 gap-x-3 text-[11px] tabular-nums text-paper/70">
                  <span>체력 {q(rv.hp, e.hp)}</span>
                  <span>공격력 {q(rv.atk, e.atk)}</span>
                  <span>행동력 {q(rv.act, e.act)}</span>
                  <span>영력 {q(rv.spirit, e.spirit)}</span>
                </p>
                <button type="button" onClick={() => start(e.id)} className="flat-btn mt-3 justify-center !bg-crimson">
                  <Swords size={15} aria-hidden />
                  {e.name}과 겨루기
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-paper/50">
          내 상태 · 체력 {Math.floor(hp)} / {hpMax} · 의지력 {Math.floor(mp)} · 돌발 행동 확률 {rash}% (호전이 절제보다 높을수록 커진다)
        </p>
      </section>
    )
  }

  const rv = revealOf(b.enemy, stats, fights)
  const danger = b.php <= b.phpMax * 0.3 && !b.over
  const myTurn = !busy && !b.over && !b.pendingDeath
  const shown = b.over ? 0 : Math.min(b.known, 3)
  const have = Math.floor(mpRef.current)
  const q = (ok, v) => (ok ? v : '???')

  return (
    <section aria-label="전투" className="relative">
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span>
          라운드 <b className="font-serif text-base text-paper">{b.round}</b>
        </span>
        <span className={`rounded-full px-3 py-0.5 ${b.over ? 'bg-edge/10' : myTurn ? 'bg-gold-fill text-ink light:text-paper' : 'bg-edge/10'}`} aria-live="polite">
          {b.over ? '전투 종료' : b.pendingDeath ? '쓰러지는 중…' : myTurn ? '내 턴' : '상대의 턴…'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="ink-panel rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">{b.enemy.name}</p>
            <p className="text-xs tabular-nums text-paper/70">{rv.hp ? `${b.ehp} / ${b.enemy.hp}` : '체력 ???'}</p>
          </div>
          <div className="mt-2">
            <Bar value={b.ehp} max={b.enemy.hp} tone="bg-crimson" label="상대 체력" hidden={!rv.hp} />
          </div>
          {!rv.hp && <p className="mt-1 text-[11px] text-paper/55">{vague(b.ehp, b.enemy.hp)}</p>}
          <p className="mt-2 grid grid-cols-3 gap-x-2 text-[11px] tabular-nums text-paper/70">
            <span>공격력 {q(rv.atk, b.enemy.atk)}</span>
            <span>행동력 {q(rv.act, b.enemy.act)}</span>
            <span>영력 {q(rv.spirit, b.enemy.spirit)}</span>
          </p>
          {!b.over && (
            <div className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-sm text-paper/85" aria-label="상대의 다음 행동">
              <p className="text-[11px] text-paper/55">상대의 다음 행동</p>
              {shown > 0 ? (
                <ol className="mt-1 flex flex-wrap gap-1.5">
                  {b.queue.slice(0, shown).map((k, i) => (
                    <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${k === 'smash' ? 'bg-crimson/25 text-crimson' : 'bg-edge/10'}`}>
                      {i + 1}. {INTENTS[k].label}
                      {k === 'special' && ` · ${knownSp.current[b.enemy.id] ? b.enemy.special.label : '???'}`}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-xs text-paper/60">알 수 없다. 간파로 읽을 수 있다.</p>
              )}
              {b.queue[0] === 'guard' && b.known > 0 && <p className="mt-1 text-[11px] text-gold">방어 태세 중엔 일반 공격이 절반이다. 부적은 막지 못한다.</p>}
            </div>
          )}
        </div>

        <div className={`ink-panel rounded-xl p-4 ${danger ? 'ring-2 ring-crimson/70' : ''}`}>
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">나{danger && <span className="ml-2 animate-pulse text-sm text-crimson">위험!</span>}</p>
            <p className="text-xs tabular-nums text-paper/70">
              체력 {b.php} / {b.phpMax}
            </p>
          </div>
          <div className="mt-2">
            <Bar value={b.php} max={b.phpMax} tone={danger ? 'bg-crimson' : 'bg-mana'} label="내 체력" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="flat-chip">의지력 {have}</span>
            <span className="flat-chip">부적 {b.charms}장</span>
            {b.bound && <span className="flat-chip">휘감김: 막기 불가</span>}
            {b.curse > 0 && <span className="flat-chip">저주 {b.curse}턴</span>}
            {rash > 0 && <span className="flat-chip">돌발 {rash}%</span>}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div
              key={dice?.k}
              className={`grid size-12 shrink-0 place-items-center rounded-lg ${dice ? (dice.kind === 'enemy' ? 'bg-crimson/80' : 'bg-gold-fill') : 'bg-edge/10'} ${dice ? 'dice-pop' : ''}`}
              style={{ transform: 'rotate(45deg)' }}
              aria-label="마지막 주사위"
            >
              <span className="-rotate-45 font-serif text-xl text-ink light:text-paper">{dice ? dice.n : <Dices size={18} aria-hidden />}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-paper/60">d10 (10면체)<br />마지막 굴림</p>
          </div>
        </div>
      </div>

      {!b.over && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-paper/55">
          <span>아이템은 턴과 상관없이 쓸 수 있고, 써도 내 턴이 끝나지 않는다. (전투 중 사용 가능한 것만)</span>
          <button type="button" onClick={onOpenItems} className="flat-chip tilt shrink-0">
            소지품
          </button>
        </div>
      )}

      {!b.over && (
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5" role="group" aria-label="행동 선택">
          {ACTION_ORDER.map((id, i) => {
            const Icon = ACTION_ICONS[id]
            const off =
              !myTurn ||
              (id === 'charm' && (b.charms <= 0 || have < 1)) ||
              (id === 'buff' && have < 1) ||
              (id === 'scan' && have < 1) ||
              (id === 'guard' && b.bound)
            return (
              <button
                key={id}
                type="button"
                disabled={off}
                onClick={() => act(id)}
                className="tilt flex flex-col items-start gap-1 rounded-xl bg-edge/[0.07] p-3 text-left enabled:hover:bg-gold-fill/20 disabled:opacity-40"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-paper">
                  <Icon size={15} aria-hidden className="text-gold" />
                  {ACTIONS[id].label}
                  <span className="text-[10px] text-paper/40">{i + 1}</span>
                </span>
                <span className="text-[10.5px] leading-snug text-paper/60">
                  {id === 'scan' ? `의지력 1. 다음 ${scanTurns(stats, b.enemy)}턴의 행동을 본다.` : ACTIONS[id].note}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {b.pendingDeath && !b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center" role="alertdialog" aria-label="버티기">
          <p className="font-serif text-xl text-crimson">체력이 바닥났다!</p>
          <p className="mt-1 text-sm text-paper/80">
            버티기를 쓰면 의지력 <b className="text-gold">{Math.max(0, have - 1)}</b>을(를) 전부 쏟고 체력 1로 일어선다.
            포기하면 여기서 패배하지만 남은 의지력은 지킨다.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={() => survive(true)} className="flat-btn justify-center">버티기</button>
            <button type="button" onClick={() => survive(false)} className="flat-btn justify-center !bg-crimson">쓰러진다</button>
          </div>
        </div>
      )}

      {phase === 'result' && b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center">
          <p className={`font-serif text-2xl ${b.over === 'win' ? 'text-gold' : 'text-crimson'}`}>{b.over === 'win' ? '승리' : '패배'}</p>
          {b.over === 'win' && <p className="mt-1 text-xs text-paper/70">쓰러진 {b.enemy.name}의 영력 {b.enemy.spirit}이(가) 흘러든다. (하루 {rewardLeft <= 0 ? '보상 소진' : '보상 한도 내'})</p>}
          <button type="button" onClick={() => setPhase('pick')} className="flat-btn mt-3 justify-center">
            상대 고르기
          </button>
        </div>
      )}

      <ul className="mt-3 max-h-44 space-y-1 overflow-auto rounded-xl bg-shade/30 p-3 font-mono text-[11px] leading-relaxed" aria-live="polite" aria-label="전투 기록">
        {log.map((l) => (
          <li
            key={l.id}
            className={l.kind === 'enemy' ? 'text-crimson' : l.kind === 'warn' || l.kind === 'end' || l.kind === 'rash' || l.kind === 'special' ? 'text-gold' : 'text-paper/80'}
          >
            {l.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
