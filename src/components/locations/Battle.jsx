import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpenText, Dices, Eye, Flame, Hourglass, Shield, Sparkles, Swords, Zap } from 'lucide-react'
import BattleTutorialHub from '../BattleTutorial2'
import {
  specialSummary,
  mpCostOf,
  BUFF_COST,
  ACTIONS,
  ENEMIES,
  INTENTS,
  bellTick,
  enemyTurn,
  fireTurn,
  newBattle,
  playerTurn,
  ownedPsychics,
  rollRash,
  rashPercent,
  resolveSurvive,
  psychicTurn,
  revealOf,
  rollInitiative,
  scanTurns,
  recLabel,
  partyLabel,
} from '../../game/battle'
import { slowFightMinutes, SLOW_FIGHT_COST_PER_SPIRIT } from '../../game/progress'

const leftTimeText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

const ACTION_ICONS = { attack: Swords, guard: Shield, charm: Sparkles, scan: Eye, psychic: Zap }
const ACTION_ORDER = ['attack', 'guard', 'charm', 'scan', 'psychic']
const ENEMY_DELAY = 900

import { Bar, enemyHpTone, vague } from './battleUi'
import SpBanner from '../SpBanner'
import MultiBattle from './MultiBattle'
import { MULTI_TAG, isMulti } from '../../game/mbattle'
import { tierLabel } from '../../game/constants'

/** 체육관 전투: 턴제, 10면체. 상대의 능력치와 다음 행동은 가려져 있고, 안목·조우 횟수·간파로 드러난다. */
export default function Battle({ stats, mp, hp, hpMax, seen, specials, rewardLeft, onStart, onMp, onHp, onFinish, onLog, onDown, onSpecialSeen, reviveOn, onReviveUsed, boostOn, onBoostUsed, psychics = [], onActive, usedItems = [], onSpotItems, onGiveItem, onOpenItems, multi, slowFight, onStartSlow, onStopSlow, tutorialDone, tutorialRewardTaken, onTutorialDone, onClaimTutorialReward, onTutorialActive }) {
  const [phase, setPhase] = useState('pick') // pick | fight | result
  const [tutorialOpen, setTutorialOpen] = useState(false) // 바리의 전투 안내(v72: 자동으로 뜨지 않고, 이 화면에서 직접 열 때만 보여 준다)
  // 튜토리얼이 열려 있는 동안엔 사이드바(ProfileSidebar)의 체력·의지력 표시도 100으로 보여 달라는
  // 요청이 있어, 상위(Game.jsx)에 튜토리얼이 열려 있는지를 그대로 알려준다 — 실제 player 값은
  // 전혀 건드리지 않고, 화면에 보여주는 값만 Game.jsx 쪽에서 바꿔치기한다. 화면을 벗어나거나
  // 컴포넌트가 사라질 때도 반드시 꺼 줘야, 다른 화면으로 가서도 100으로 고정된 채 남지 않는다.
  useEffect(() => {
    onTutorialActive?.(tutorialOpen)
    return () => onTutorialActive?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialOpen])
  const [, setSlowTick] = useState(0)
  useEffect(() => {
    if (!slowFight) return undefined
    const t = setInterval(() => setSlowTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [slowFight])
  const [b, setB] = useState(null)
  const [fights, setFights] = useState(0)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [dice, setDice] = useState(null)
  const [psyOpen, setPsyOpen] = useState(false) // 영능력 탭
  const [scanOpen, setScanOpen] = useState(false) // 간파: 의지력을 얼마나 쓸지 고르는 칸
  const [scanN, setScanN] = useState(1)
  const [pawAmt, setPawAmt] = useState(1) // 원숭이 손: 깎을 체력
  const [spBanner, setSpBanner] = useState(null) // 상대가 영능력을 쓴 순간의 큰 알림
  useEffect(() => {
    if (!spBanner) return undefined
    const t = setTimeout(() => setSpBanner(null), 6200)
    return () => clearTimeout(t)
  }, [spBanner])
  const beginRef = useRef(null)
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
  const boostRef = useRef(false)
  boostRef.current = boostOn
  const [buffArmed, setBuffArmed] = useState(false) // 효험을 켜 두었는가(다음 공격/부적/생존본능·원숭이 손·도깨비불에 적용)

  const activeCb = useRef(onActive)
  activeCb.current = onActive
  const onLogRef = useRef(onLog)
  onLogRef.current = onLog
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
  // 전투 로그 전체(40개로 잘리지 않는다) — 전투가 끝나면 활동 로그에 통째로 남긴다. (v71)
  const fullLogRef = useRef([])
  const push = useCallback((events) => {
    events = events.map((e) => {
      if (e.kind !== 'special') return e
      const first = !knownSp.current[e.enemyId]
      if (first) {
        knownSp.current = { ...knownSp.current, [e.enemyId]: true }
        onSpecialSeen?.(e.enemyId)
      }
      return { ...e, text: specialSummary(e) }
    })
    const sp = events.find((e) => e.kind === 'special')
    if (sp) setSpBanner({ label: sp.label, note: sp.note, chance: sp.chance, effects: sp.effects, result: sp.result, k: Math.random() })
    setLog((l) => [...events.map((e) => ({ ...e, id: Math.random() })), ...l].slice(0, 40))
    fullLogRef.current = [...fullLogRef.current, ...events.map((e) => e.text).filter(Boolean)]
    // v72: 전투 로그를 실시간으로 바깥(활동 로그)에도 흘려보낸다 — 아래 전투 기록과 옆 활동 로그에서 동시에 볼 수 있게.
    const texts = events.map((e) => e.text).filter(Boolean)
    if (texts.length) onLogRef.current?.(texts)
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
      onFinish({ win: state.over === 'win', fled: state.over === 'fled', enemy: state.enemy, log: fullLogRef.current })
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
        if (st.pendingDeath || st.over === 'lose') onDown?.()
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
        else if (!st.pendingDeath) beginRef.current?.(st)
      }, delay)
    },
    [stats, push, finish, spend, onReviveUsed, onDown],
  )

  const start = (enemyId) => {
    onStart?.(enemyId)
    setPsyOpen(false)
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
    fullLogRef.current = []
    setDice(null)
    setPhase('fight')
    push(lines.reverse())
    if (!init.playerFirst) runEnemy(s)
    else beginTurn(s)
  }

  // 무당방울: 유효한 행동을 했을 때마다(매 턴) 확률적으로 체력을 회복시킨다. (1인 전투라 "파티원 전원"은 자기 자신뿐이다)
  const applyBell = (state) => {
    const t = bellTick(stats, Math.random)
    if (!t) return { state, events: [] }
    const healed = Math.min(state.phpMax, state.php + t.heal)
    if (healed === state.php) {
      return { state, events: [{ kind: 'info', text: `무당방울이 울렸지만 체력이 이미 가득해 소용이 없었다. [이해 ${t.chance}%, d100 = ${t.roll}]` }] }
    }
    return { state: { ...state, php: healed }, events: [{ kind: 'warn', text: `✦ 무당방울! [이해 ${t.chance}%, d100 = ${t.roll}] 체력 +${t.heal}.` }] }
  }

  // 내 행동 한 번을 처리하고 이어서 상대 턴으로 넘긴다.
  const resolve = useCallback(
    (cur, action, extra = {}) => {
      const buffed = buffArmed && (action === 'attack' || action === 'charm')
      const r = playerTurn(cur, action, { stats, mp: mpRef.current, boost: boostRef.current, noRash: true, buff: buffed, ...extra })
      // 의지력 부족 등으로 행동이 무효면 턴을 쓰지 않는다 — 아무것도 바꾸지 않고, 다시 고를 수 있게 그대로 둔다.
      if (r.invalid) {
        push(r.events)
        return
      }
      if (buffed) setBuffArmed(false)
      if (r.boostUsed) {
        boostRef.current = false
        onBoostUsed?.()
      }
      spend(-r.mpCost)
      const bell = applyBell(r.state)
      setB(bell.state)
      push([...r.events, ...bell.events])
      if (bell.state.over) finish(bell.state)
      else runEnemy(bell.state)
    },
    [stats, push, finish, runEnemy, spend, onBoostUsed, buffArmed],
  )

  // 내 턴이 돌아오는 시작 시점마다 돌발 판정(1d100)을 항상 굴린다. 터지면 이번 턴은 무조건 일반 공격.
  const beginTurn = useCallback(
    (state) => {
      // 도깨비불을 쓴 상태라면 내 턴은 자동으로 기를 모으거나(마지막엔) 터뜨린다 — 돌발 판정도 건너뛴다.
      if (state.fire) {
        setBusy(true)
        timer.current = setTimeout(() => {
          const f = fireTurn(state, { stats, mp: mpRef.current, boost: boostRef.current }, Math.random)
          if (f.boostUsed) {
            boostRef.current = false
            onBoostUsed?.()
          }
          const bell = applyBell(f.state)
          setB(bell.state)
          push([...f.events, ...bell.events])
          setBusy(false)
          if (bell.state.over) finish(bell.state)
          else runEnemy(bell.state)
        }, 800)
        return
      }
      const rr = rollRash(stats)
      if (rr.percent > 0) {
        push([{ kind: rr.hit ? 'rash' : 'info', text: `돌발 판정 d100 = ${rr.roll} (확률 ${rr.percent}%) → ${rr.hit ? '돌발 행동 발생!' : '이상 없음'}` }])
      }
      if (!rr.hit) return
      setBusy(true)
      push([{ kind: 'rash', text: '호전이 앞서 몸이 멋대로 튀어 나갔다! 이번 턴엔 무조건 일반 공격을 한다.' }])
      timer.current = setTimeout(() => {
        setBusy(false)
        resolve(state, 'attack')
      }, 800)
    },
    [stats, push, resolve, finish, runEnemy, onBoostUsed],
  )
  beginRef.current = beginTurn

  const act = useCallback(
    (action) => {
      if (action === 'psychic') {
        setScanOpen(false)
        return setPsyOpen((o) => !o)
      }
      if (action === 'scan') {
        const c0 = bRef.current
        if (!c0 || c0.over || c0.pendingDeath || busy || phase !== 'fight') return
        if (Math.floor(mpRef.current) < mpCostOf(stats, 1)) return
        setPsyOpen(false)
        setScanN((n) => Math.max(1, Math.min(Math.floor(mpRef.current), n)))
        return setScanOpen((o) => !o)
      }
      const cur = bRef.current
      if (!cur || cur.over || cur.pendingDeath || busy || phase !== 'fight') return
      const have = Math.floor(mpRef.current)
      if (action === 'charm' && cur.charms <= 0) return
      if (action === 'charm' && have < 1) return
      if (action === 'scan' && have < mpCostOf(stats, 1)) return
      setPsyOpen(false)
      resolve(cur, action)
    },
    [busy, phase, resolve],
  )

  // 효험(모두가 가진 영능력): 켜 두면 턴을 쓰지 않는다. 다음에 고르는 일반 공격·부적·생존본능이 두 번 굴러간다.
  // 의지력 10을 정확히 다 낼 수 있어야만 켤 수 있다(모자라면 토글 자체가 막힌다). (v70)
  const toggleBuff = () => {
    const cur = bRef.current
    if (!cur || cur.over || cur.pendingDeath || busy || phase !== 'fight' || !myTurn) return
    setBuffArmed((v) => (!v && Math.floor(mpRef.current) < mpCostOf(stats, BUFF_COST) ? v : !v))
  }

  const doScan = () => {
    const cur = bRef.current
    if (!cur || cur.over || cur.pendingDeath || busy || phase !== 'fight') return
    const amount = Math.max(1, Math.min(Math.floor(mpRef.current), scanN))
    setScanOpen(false)
    setPsyOpen(false)
    resolve(cur, 'scan', { scanAmount: amount })
  }

  const usePsychic = (id, extra = {}) => {
    const cur = bRef.current
    if (!cur || cur.over || cur.pendingDeath || busy || phase !== 'fight') return
    const buffed = buffArmed && (id === 'survival' || id === 'monkey-paw' || id === 'dokkaebi-fire')
    const r = psychicTurn(cur, id, { stats, mp: mpRef.current, boost: boostRef.current, buff: buffed, ...extra }, Math.random)
    if (r.invalid) {
      if (r.events?.length) push(r.events)
      return
    }
    setPsyOpen(false)
    if (buffed) setBuffArmed(false)
    if (r.boostUsed) {
      boostRef.current = false
      onBoostUsed?.()
    }
    spend(-r.mpCost)
    const bell = applyBell(r.state)
    setB(bell.state)
    push([...r.events, ...bell.events])
    if (bell.state.over) finish(bell.state)
    else runEnemy(bell.state)
  }

  const survive = (accept) => {
    const cur = bRef.current
    if (!cur?.pendingDeath) return
    const r = resolveSurvive(cur, accept, mpRef.current, stats)
    spend(-r.mpCost)
    setB(r.state)
    push(r.events)
    if (r.state.over) finish(r.state)
    else beginTurn(r.state)
  }

  useEffect(() => {
    if (phase !== 'fight') return
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const i = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
      if (i >= 0) act(ACTION_ORDER[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, act])

  const rash = rashPercent(stats)

  // 다인 전투가 진행 중이면 그 화면을 보여 준다. (판은 서버가 진행한다)
  if (multi?.view) {
    return (
      <MultiBattle
        meId={multi.meId}
        view={multi.view}
        stats={stats}
        seen={seen}
        specials={specials}
        psychics={psychics}
        onAct={multi.onAct}
        onSurvive={multi.onSurvive}
        onOpenItems={onOpenItems}
        onSpecialSeen={onSpecialSeen}
        onClose={multi.onClose}
      />
    )
  }

  // 전투 튜토리얼이 열려 있는 동안은 상대를 고르는 화면 대신 그 안으로 바로 들어간다 —
  // 다른 전투를 고르는 것처럼, 팝업이 아니라 화면이 그대로 바뀌는 식으로.
  if (phase === 'pick' && tutorialOpen) {
    return (
      <BattleTutorialHub
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        stats={stats}
        tutorialDone={tutorialDone}
        tutorialRewardTaken={tutorialRewardTaken}
        onTutorialDone={onTutorialDone}
        onClaimReward={onClaimTutorialReward}
        onLog={onLog}
      />
    )
  }

  if (phase === 'pick') {
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-paper/75">
            붉은 빛과 색이 떠도는 산을 뛰어다니며 실전을 흉내낸다. 상대의 정체는 가려져 있다. 안목이 높거나 몇 번 겨뤄 볼수록 더 많이 보인다.
            오늘 영력을 얻는 승리는 <b className="text-gold">{rewardLeft}회</b> 남았다. 지면 영력을 조금 잃는다. 체력과 의지력은 전투가 끝나도 그대로 이어지고, 양호실에서만 찬다.
          </p>
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="flat-btn shrink-0 !gap-1.5 text-xs whitespace-nowrap"
          >
            <BookOpenText size={13} aria-hidden />
            전투 안내
          </button>
        </div>
        {slowFight && (
          <div className="ink-panel mt-4 w-full rounded-xl p-5" data-slow-fight={slowFight.enemyId}>
            <p className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">
              <Hourglass size={12} aria-hidden />
              느린 싸움 중
            </p>
            <p className="mt-2 font-serif text-base text-paper">{ENEMIES.find((x) => x.id === slowFight.enemyId)?.name}을(를) 상대로 느린 싸움을 벌이고 있다.</p>
            <p className="mt-1 text-xs text-paper/60">끝까지 기다리면 무조건 승리 판정을 받는다. 중간에 나가면 보상 없이 취소된다.</p>
            <p className="mt-2 text-sm text-gold" data-slow-fight-left>
              남은 시간: {(() => { const left = slowFight.startedAt + slowFight.minutes * 60000 - Date.now(); return left > 0 ? leftTimeText(left) : '거의 다 됐다' })()}
            </p>
            <button type="button" onClick={() => onStopSlow?.()} className="flat-btn mt-3 text-xs">느린 싸움 그만두기</button>
          </div>
        )}
        {multi?.lobby && (
          <div className="ink-panel mt-4 rounded-xl p-4" role="status" data-mb-lobby>
            <p className="font-serif text-base text-gold">{ENEMIES.find((x) => x.id === multi.lobby.enemyId)?.name} 전투 초대를 보냈다</p>
            <p className="mt-1 text-xs text-paper/70">
              응답을 기다리는 중: {multi.lobby.waiting.length ? multi.lobby.waiting.join(', ') : '없음'}
              {multi.lobby.joined?.length > 0 && <> · 참여: {multi.lobby.joined.join(', ')}</>}
            </p>
            <button type="button" onClick={multi.onCancel} className="mt-2 rounded-lg bg-edge/10 px-3 py-1 text-xs text-paper/80 hover:bg-edge/20">초대 취소</button>
          </div>
        )}
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {ENEMIES.map((e) => {
            const rv = revealOf(e, stats, seen?.[e.id] || 0)
            const q = (ok, v) => (ok ? v : '???')
            return (
              <li key={e.id} className="ink-panel tilt flex flex-col rounded-xl p-4">
                <p className="font-serif text-lg text-paper">
                  <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle font-sans text-[11px] text-gold" aria-label={`${e.tier}단계`}>{tierLabel(e.tier)}</span>
                  {e.name}
                </p>
                <p className="mt-1 flex flex-wrap gap-1 text-[10px]" data-rec>
                  <span className="rounded-full border border-edge/25 px-2 py-px text-paper/70">{recLabel(e)}</span>
                  <span className={`rounded-full border px-2 py-px ${e.partySize > 1 ? 'border-gold/50 text-gold' : 'border-edge/25 text-paper/70'}`}>{partyLabel(e)}</span>
                  {(e.tags ?? []).map((t) => (
                    <span key={t} data-tag={t} className="rounded-full bg-gold/15 px-2 py-px text-gold">{t}</span>
                  ))}
                </p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-paper/60">{e.blurb}</p>
                <p className="mt-2 grid grid-cols-2 gap-x-3 text-[11px] tabular-nums text-paper/70">
                  <span>체력 {q(rv.hp, e.hp)}</span>
                  <span>공격력 {q(rv.atk, e.atk)}</span>
                  <span>행동력 {q(rv.act, e.act)}</span>
                  <span>영력 {q(rv.spirit, e.spirit)}</span>
                </p>
                {isMulti(e) ? (
                  <>
                    <button
                      type="button"
                      data-multi-start={e.id}
                      disabled={!multi?.canParty || !!multi?.lobby || !!slowFight}
                      onClick={() => multi.onStart(e.id)}
                      className="flat-btn flat-btn-fight mt-3 justify-center"
                    >
                      <Swords size={15} aria-hidden />
                      겨루기
                    </button>
                    <p className="mt-1 text-[10px] text-paper/50">{multi?.canParty ? `‘${MULTI_TAG}’ — 일행에게 초대가 가고, 수락한 사람들이 함께 싸운다.` : multi?.isLeader === false && multi?.hasParty ? `‘${MULTI_TAG}’ — 파티장만 신청할 수 있다. 파티장의 초대를 받으면 참여한다.` : `‘${MULTI_TAG}’ — 일행(파티) 상태로만 참여할 수 있다.`}</p>
                  </>
                ) : (
                  <button type="button" disabled={!!slowFight} onClick={() => start(e.id)} className="flat-btn flat-btn-fight mt-3 justify-center">
                    <Swords size={15} aria-hidden />
                    겨루기
                  </button>
                )}
                {!e.boss && (
                  <button
                    type="button"
                    data-slow-start={e.id}
                    disabled={!!slowFight}
                    onClick={() => onStartSlow?.(e.id)}
                    className="flat-btn flat-btn-slow mt-2 justify-center"
                  >
                    <Hourglass size={14} aria-hidden />
                    느린 싸움으로 보상 얻기
                  </button>
                )}
                {!e.boss && (
                  <p className="mt-1 text-[10px] text-paper/50">
                    직접 싸우는 대신 {slowFightMinutes(e)}분을 기다리면 무조건 승리 판정 — 대신 체력·의지력 각 {e.spirit * SLOW_FIGHT_COST_PER_SPIRIT} 소모.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-paper/50">
          내 상태 · 체력 {Math.floor(hp)} / {hpMax} · 의지력 {Math.floor(mp)} · 돌발 행동 확률 {rash}% (호전 − 절제)
        </p>
      </section>
    )
  }

  const rv = revealOf(b.enemy, stats, fights)
  const danger = b.php <= b.phpMax * 0.3 && !b.over
  const myTurn = !busy && !b.over && !b.pendingDeath && !b.fire // 도깨비불로 기를 모으는 중엔 자동으로 진행되어 입력하지 않는다
  const shown = b.over ? 0 : Math.min(b.known, b.queue.length)
  const SHOW_MAX = 14
  const have = Math.floor(mpRef.current)
  const q = (ok, v) => (ok ? v : '???')

  return (
    <section aria-label="전투" className={`relative ${spBanner ? 'sp-shake' : ''}`}>
      <SpBanner sp={spBanner} onEnd={() => setSpBanner(null)} />
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span>
          라운드 <b className="font-serif text-base text-paper">{b.round}</b>
        </span>
        <span className={`rounded-full px-3 py-0.5 ${b.over ? 'bg-edge/10' : myTurn ? 'bg-gold-fill text-ink light:text-ink' : 'bg-edge/10'}`} aria-live="polite">
          {b.over ? '전투 종료' : b.pendingDeath ? '쓰러지는 중…' : myTurn ? '내 턴' : '상대의 턴…'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="ink-panel rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">
              {b.enemy.tier && <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle font-sans text-[11px] text-gold">{tierLabel(b.enemy.tier)}</span>}
              {b.enemy.name}
              {b.enemy.tier && <span className="ml-2 align-middle font-sans text-[10px] text-paper/50">{recLabel(b.enemy)} · {partyLabel(b.enemy)}</span>}
            </p>
            <p className="text-xs tabular-nums text-paper/70">{rv.hp ? `${b.ehp} / ${b.enemy.hp}` : '체력 ???'}</p>
          </div>
          <div className="mt-2">
            <Bar value={b.ehp} max={b.enemy.hp} tone={enemyHpTone(b.ehp, b.enemy.hp, b.enemy?.gimmicks?.length > 0)} label="상대 체력" hidden={!rv.hp} />
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
                  {b.queue.slice(0, Math.min(shown, SHOW_MAX)).map((k, i) => (
                    <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${k === 'smash' ? 'bg-crimson/25 text-crimson' : k === 'special' ? 'bg-gold/20 text-gold' : 'bg-edge/10'}`}>
                      {i + 1}. {INTENTS[k].label}
                    </li>
                  ))}
                  {shown > SHOW_MAX && <li className="px-1 py-0.5 text-xs text-paper/55">… 외 {shown - SHOW_MAX}턴 더</li>}
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
              <span className="-rotate-45 font-serif text-xl text-ink light:text-ink">{dice ? dice.n : <Dices size={18} aria-hidden />}</span>
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
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" role="group" aria-label="행동 선택">
          {ACTION_ORDER.map((id, i) => {
            const Icon = ACTION_ICONS[id]
            const off =
              (id !== 'psychic' && !myTurn) ||
              (id === 'psychic' && (!!b.over || b.pendingDeath)) ||
              (id === 'charm' && (b.charms <= 0 || have < 1)) ||
              (id === 'scan' && have < mpCostOf(stats, 1)) ||
              (id === 'guard' && b.bound)
            return (
              <button
                key={id}
                type="button"
                disabled={off}
                onClick={() => act(id)}
                aria-pressed={id === 'psychic' ? psyOpen : undefined}
                className="tilt flex flex-col items-start gap-1 rounded-xl bg-edge/[0.07] p-3 text-left enabled:hover:bg-gold-fill/20 disabled:opacity-40"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-paper">
                  <Icon size={15} aria-hidden className="text-gold" />
                  {ACTIONS[id].label}
                  <span className="text-[10px] text-paper/40">{i + 1}</span>
                </span>
                <span className="text-[10.5px] leading-snug text-paper/60">
                  {id === 'scan' ? `의지력 N. 1이면 ${scanTurns(stats, b.enemy)}턴, 1 늘 때마다 1턴 더 본다.` : ACTIONS[id].note}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {buffArmed && !b.over && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gold" data-buff-armed>
          <Flame size={12} aria-hidden />
          효험이 켜져 있다 — 다음 일반 공격·부적·생존본능이 두 번 굴러 더 나은 쪽으로 들어간다.
        </p>
      )}

      {scanOpen && !b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4" role="region" aria-label="간파">
          <p className="font-serif text-base text-gold">간파</p>
          {(() => {
            const n = Math.max(1, Math.min(have, scanN))
            return (
              <>
                <p className="mt-1 text-[11px] text-paper/65">의지력을 많이 쓸수록 상대의 행동을 더 멀리까지 본다.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" aria-label="간파 의지력 줄이기" onClick={() => setScanN(Math.max(1, n - 1))} disabled={n <= 1} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">−</button>
                  <input
                    aria-label="간파에 쓸 의지력"
                    inputMode="numeric"
                    value={n}
                    onChange={(e) => setScanN(Math.max(1, Math.min(have, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1)))}
                    className="h-8 w-14 rounded-lg bg-shade/50 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
                  />
                  <button type="button" aria-label="간파 의지력 늘리기" onClick={() => setScanN(Math.min(have, n + 1))} disabled={n >= have} className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper disabled:opacity-35">+</button>
                  <button type="button" onClick={() => setScanN(have)} disabled={have <= 1} className="rounded-lg bg-edge/10 px-2 py-1.5 text-[11px] text-paper/80 disabled:opacity-35">최대</button>
                  <span className="text-xs text-gold" data-scan-turns>의지력 {n} → {scanTurns(stats, b.enemy, n)}턴</span>
                </div>
                <button type="button" onClick={doScan} disabled={!myTurn} className="flat-btn mt-3 justify-center disabled:opacity-40" data-scan-go>
                  <Eye size={14} aria-hidden />
                  간파 사용 (의지력 {n})
                </button>
              </>
            )
          })()}
        </div>
      )}

      {psyOpen && !b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4" role="region" aria-label="영능력 목록">
          <p className="font-serif text-base text-gold">영능력</p>
          {(() => {
            const mine = ownedPsychics(psychics)
            if (!mine.length) return <p className="mt-2 text-sm text-paper/65" data-psychic-empty>획득한 영능력이 없습니다.</p>
            const pawMax = Math.max(1, Math.floor(b.php) - 1)
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
                        data-psychic-toggle={s.id}
                        aria-pressed={buffArmed}
                        disabled={!myTurn || (!buffArmed && Math.floor(mp) < mpCostOf(stats, BUFF_COST))}
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
                        <button type="button" data-psychic-use="monkey-paw" disabled={!myTurn} onClick={() => usePsychic('monkey-paw', { sacrifice: pawAmt })} className="flat-btn mt-2 justify-center disabled:opacity-40">
                          사용
                        </button>
                      </>
                    ) : (
                      s.use && (
                        <button type="button" data-psychic-use={s.id} disabled={!myTurn} onClick={() => usePsychic(s.id)} className="flat-btn mt-2 justify-center disabled:opacity-40">
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

      {b.pendingDeath && !b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center" role="alertdialog" aria-label="버티기">
          <p className="font-serif text-xl text-crimson">체력이 바닥났다!</p>
          <p className="mt-1 text-sm text-paper/80">
            버티기를 쓰면 의지력 <b className="text-gold">{Math.max(0, have - 1)}</b>을(를) 전부 쏟고 체력 1로 일어선다.
            포기하면 여기서 패배하지만 남은 의지력은 지킨다.
          </p>
          <p className="mt-1 text-[11px] text-paper/60">버티기는 한 전투에 한 번뿐이다. 인내 {Math.min(100, stats.endurance * 2)}% 확률로 의지력을 쓰지 않는다.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={() => survive(true)} className="flat-btn justify-center">버티기</button>
            <button type="button" onClick={() => survive(false)} className="flat-btn justify-center !bg-crimson">쓰러진다</button>
          </div>
        </div>
      )}

      {phase === 'result' && b.over && (
        <div className="ink-panel mt-3 rounded-xl p-4 text-center">
          <p className={`font-serif text-2xl ${b.over === 'win' ? 'text-gold' : b.over === 'fled' ? 'text-paper' : 'text-crimson'}`}>{b.over === 'win' ? '승리' : b.over === 'fled' ? '도주' : '패배'}</p>
          {b.over === 'win' && <p className="mt-1 text-xs text-paper/70">쓰러진 {b.enemy.name}의 영력과 돈이 흘러든다. (영력 +{b.enemy.reward}, 돈 +{b.enemy.reward}냥) (하루 {rewardLeft <= 0 ? '보상 소진' : '보상 한도 내'})</p>}
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
