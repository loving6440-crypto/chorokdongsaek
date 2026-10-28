import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Gift, Lock, Swords, X } from 'lucide-react'
import {
  ACTIONS,
  enemyTurn,
  fireTurn,
  maxSurvives,
  newBattle,
  playerTurn,
  psychicTurn,
  PSYCHICS,
  rashPercent,
  scanTurns,
} from '../game/battle'
import { ENH_MAX, ITEMS } from '../game/items'
import { TUTOR_DUMMY, TUTOR_DUMMY_GROUP, TUTOR_DUMMY_PSY, TUTORIAL_META, createDummyMB, forcedQueue } from '../game/battleTutorial2'
import { afterEnemy, beginRound, openingInitiative, resolveTurn, submit, useItemMB } from '../game/mbattle'
import { WEAPONS } from '../game/items'
import { Bar } from './locations/battleUi'
import { AllyPsychicBanner } from './AllyPopup'

const FACE_SRC = { bari: '/bari.png', 'bari-smile': '/bari-smile.png', 'bari-surprise': '/bari-surprise.png' }

/** **강조**로 감싼 부분을 밑줄+금색으로 바꿔 준다. */
function Emph({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <b key={i} className="text-gold underline decoration-gold/70 underline-offset-2">{p}</b> : <span key={i}>{p}</span>))}
    </>
  )
}

/** GuideModal 과 같은 스포트라이트 패턴: selector 가 가리키는 요소에 핑크빛 테를 두르고 나머지를 어둡게. */
function useHighlightRect(selector) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!selector) {
      setRect(null)
      return undefined
    }
    const update = () => {
      const el = document.querySelector(selector)
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    update()
    const t = setInterval(update, 250)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [selector])
  return rect
}

/** 화면 어딘가를 짚어주는 스포트라이트만 — 고정 오버레이지만 pointer-events-none 이라 그 아래 버튼을 가리지 않는다. */
function Spotlight({ selector }) {
  const rect = useHighlightRect(selector)
  if (!rect) return null
  return (
    <div
      className="pointer-events-none fixed z-[96] rounded-xl ring-4 ring-[#ff8fb3] transition-all duration-300"
      style={{
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 22px 4px rgba(255,143,179,0.85)',
      }}
    />
  )
}

/**
 * 바리의 대사창. 예전엔 화면 바닥에 고정돼 떠 있어서, 짧은 화면에서는 아래 행동 버튼과 겹쳐
 * 버튼이 눌리지 않는 문제가 있었다. 이제는 일반 전투 화면과 똑같은 흐름 안에 들어가는 보통의
 * 패널이라(= 떠 있지 않고 다른 내용과 같이 스크롤된다), 무엇도 가리지 않는다.
 */
function BariCard({ face = 'bari', lines = [], note, hint, onNext, nextLabel = '다음', hideNext }) {
  if (!lines.length) return null
  return (
    <div className="ink-panel mt-3 flex items-start gap-3 rounded-2xl border-2 border-gold/70 p-3.5 shadow-lg sm:p-4">
      <img src={FACE_SRC[face] ?? FACE_SRC.bari} alt="바리" className="size-14 shrink-0 rounded-xl bg-edge/10 object-cover object-top sm:size-16" draggable={false} />
      <div className="min-w-0 flex-1">
        <p className="inline-block rounded-full bg-gold-fill px-2.5 py-0.5 text-[11px] font-medium text-ink light:text-ink">바리</p>
        <div className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-paper/95 sm:text-sm">
          {lines.map((l, i) => (
            <p key={i}><Emph text={l} /></p>
          ))}
        </div>
        {note && <p className="mt-2 rounded-lg border border-gold/30 bg-gold-fill/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-gold">{note}</p>}
        {hint && <p className="mt-2 text-[11px] text-paper/55">{hint}</p>}
      </div>
      {!hideNext && (
        <button type="button" onClick={onNext} className="flat-btn shrink-0 self-end text-xs">
          {nextLabel}
        </button>
      )}
    </div>
  )
}

function ActionBtn({ children, active, onClick, disabled, dataAttr }) {
  return (
    <button
      type="button"
      {...dataAttr}
      disabled={disabled}
      onClick={onClick}
      className={`tilt rounded-xl px-3 py-2 text-xs font-medium transition ${
        active ? 'bg-gold-fill text-ink light:text-ink ring-2 ring-gold animate-pulse' : disabled ? 'bg-edge/[0.06] text-paper/35' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * 공용 "직접 플레이하는" 연습 전투 엔진. steps 배열을 순서대로 넘기며,
 * - 순수 대사 단계는 '다음' 버튼으로,
 * - allow 가 있는 단계는 그 행동 버튼만 눌러지게 해서 실제로 플레이하게 하고,
 * - auto 단계(적 턴·도깨비불 자동진행·전투 시작)는 스스로 흘러간다.
 */
function ScriptedBattle({ dummy, queue, steps, stats, onLog, onDone, onClose, title }) {
  const [i, setI] = useState(0)
  const [b, setB] = useState(null)
  const [mp, setMp] = useState(100)
  const [log, setLog] = useState([])
  const [buffArmed, setBuffArmed] = useState(false)
  const [psyOpen, setPsyOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const bRef = useRef(null)
  bRef.current = b
  const mpRef = useRef(mp)
  mpRef.current = mp

  const step = steps[i]
  const next = () => setI((n) => Math.min(steps.length - 1, n + 1))

  // 연습 허수아비는 절대 쓰러지지도, 우리를 쓰러뜨리지도 않는다. 실제 캐릭터 스탯을 그대로 써서
  // 데미지를 굴리다 보니, 이미 강해진 캐릭터면 허수아비 체력(46~70)이 몇 번만에 바닥나 전투가
  // 끝나버리고(= over: 'win') 그 뒤의 모든 행동 버튼이 "내 턴 아님" 취급으로 영원히 비활성화되는
  // 문제가 있었다 — "눌러도 안 눌리고 안 넘어간다"로 보이던 버그의 실제 원인이었다.
  const clampAlive = (st) => {
    if (!st) return st
    if (st.ehp <= 0 || st.php <= 0 || st.over) {
      const ehpFloor = Math.max(1, Math.ceil((st.enemy?.hp ?? 10) * 0.35))
      const phpFloor = Math.max(1, Math.ceil((st.phpMax ?? 100) * 0.5))
      return { ...st, ehp: Math.max(st.ehp, ehpFloor), php: Math.max(st.php, phpFloor), over: false }
    }
    return st
  }
  // 체력이 0 밑으로 떨어져 전투가 끝났다는 로그 줄은, 실제로는 끝내지 않을 거라 보여주지 않는다.
  const filterEndLog = (events, wasFinished) => (wasFinished ? (events ?? []).filter((e) => e.kind !== 'end') : events)

  const pushLog = (events) => {
    const texts = (events ?? []).map((e) => e.text).filter(Boolean)
    if (!texts.length) return
    setLog((l) => [...texts.map((t) => ({ id: Math.random(), text: t })), ...l].slice(0, 30))
    onLog?.(texts)
  }

  // 전투 시작 — 이 단계에 대사가 있으면 자동으로 넘기지 않고, 플레이어가 '다음'을 눌러야 넘어간다.
  useEffect(() => {
    if (step?.auto !== 'start' || b) return
    const s = newBattle(dummy, stats, Math.random, 100, 100)
    s.queue = queue
    setB(s)
    pushLog([{ text: `${dummy.name}이(가) 나타났다.` }])
    if (!step.lines?.length) timer.current = setTimeout(next, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 적 턴 자동 진행 — b 를 의존성에 넣으면 setB 가 일어날 때마다 이 effect 가 다시 돌아 같은 단계에서
  // 두 번째 setTimeout 이 또 걸리는 문제가 있었다(강제해 둔 큐를 이중으로 소비해 버그처럼 보였다).
  // i 에만 반응하고, 실제 값은 ref 로 최신 것을 읽는다.
  useEffect(() => {
    if (step?.auto !== 'enemy' || !bRef.current) return
    setBusy(true)
    timer.current = setTimeout(() => {
      const r = enemyTurn(bRef.current, { stats, mp: mpRef.current })
      setMp((m) => Math.max(0, m - r.mpDrain))
      const wasFinished = r.state?.over || r.state?.ehp <= 0 || r.state?.php <= 0
      setB(clampAlive(r.state))
      pushLog(filterEndLog(r.events, wasFinished))
      setBusy(false)
      if (!step.lines?.length) next()
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 도깨비불: 자동으로 기 모으기/폭발 진행 (같은 이유로 i 에만 반응한다)
  useEffect(() => {
    if (step?.auto !== 'fire' || !bRef.current) return
    setBusy(true)
    timer.current = setTimeout(() => {
      const r = fireTurn(bRef.current, { stats, mp: mpRef.current, boost: false }, Math.random)
      const wasFinished = r.state?.over || r.state?.ehp <= 0 || r.state?.php <= 0
      setB(clampAlive(r.state))
      pushLog(filterEndLog(r.events, wasFinished))
      setBusy(false)
      if (!step.lines?.length) next()
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 현재 단계가 영능력/소지품 패널 안의 행동을 요구하면, 그 패널이 반드시 열려 있도록 강제한다.
  // (이전엔 공격 등 다른 행동을 쓰면 패널이 자동으로 닫혀서, 그 다음 단계에서 패널 속 버튼이
  // 아예 화면에 없어 "눌러도 반응이 없다"는 문제가 있었다.)
  useEffect(() => {
    const need = step?.allow
    const has = (k) => (Array.isArray(need) ? need.includes(k) : need === k)
    if (has('toggleBuff') || has('dokkaebi-fire')) setPsyOpen(true)
    if (has('useItem')) setItemsOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 이 단계가 '진짜' 사이드바의 [내 소지품 확인하기] 버튼을 눌러보라고 할 때는, 그 버튼이
  // 화면의 다른 위치(ProfileSidebar)에 있어 이 컴포넌트가 직접 다룰 수 없으므로, 문서 전체에
  // 클릭을 듣고 있다가 실제 버튼이 눌리면 다음 단계로 넘긴다. 실제 버튼을 누른 거라 평소처럼
  // 진짜 소지품 화면도 그대로 열린다.
  useEffect(() => {
    if (step?.allow !== 'realItems') return undefined
    const onDocClick = (e) => {
      if (e.target.closest?.('[data-tutorial-real-items-btn]')) next()
    }
    document.addEventListener('click', onDocClick, true)
    return () => document.removeEventListener('click', onDocClick, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const doAction = (action, extra = {}) => {
    if (busy || !b) return
    setBusy(true)
    const buffed = buffArmed && (action === 'attack' || action === 'charm')
    const r = playerTurn(b, action, { stats, mp, boost: false, noRash: true, buff: buffed, ...extra }, Math.random)
    if (r.invalid) {
      pushLog(r.events)
      setBusy(false)
      return
    }
    if (buffed) setBuffArmed(false)
    setMp((m) => Math.max(0, m - r.mpCost))
    const wasFinished = r.state?.over || r.state?.ehp <= 0 || r.state?.php <= 0
    setB(clampAlive(r.state))
    pushLog(filterEndLog(r.events, wasFinished))
    setBusy(false)
    next()
  }

  const doPsychic = (id, extra = {}) => {
    if (busy || !b) return
    setBusy(true)
    const r = psychicTurn(b, id, { stats, mp, boost: false, buff: false, ...extra }, Math.random)
    if (r.invalid) {
      pushLog(r.events)
      setBusy(false)
      return
    }
    setMp((m) => Math.max(0, m - r.mpCost))
    const wasFinished = r.state?.over || r.state?.ehp <= 0 || r.state?.php <= 0
    setB(clampAlive(r.state))
    pushLog(filterEndLog(r.events, wasFinished))
    setBusy(false)
    next()
  }

  const toggleBuff = () => {
    if (busy) return
    setBuffArmed((v) => !v)
    next()
  }
  const useItem = () => {
    if (busy) return
    setMp((m) => Math.min(100, m + 15))
    pushLog([{ text: '사과맛 피크닉을 사용했다. 의지력 +15.' }])
    setItemsOpen(false)
    next()
  }
  const openPsychic = () => {
    setPsyOpen(true)
    setItemsOpen(false)
    next()
  }
  const openItems = () => {
    setItemsOpen(true)
    setPsyOpen(false)
    next()
  }

  const allow = step?.allow
  const allowed = (k) => Array.isArray(allow) ? allow.includes(k) : allow === k
  const myTurn = !busy && b && !b.over && !b.fire

  return (
    <section aria-label={title} className="relative">
      {step?.highlight && <Spotlight selector={step.highlight} />}
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span className="rounded-full bg-gold-fill px-3 py-0.5 text-ink light:text-ink">{title} (연습)</span>
        <button type="button" onClick={onClose} className="flat-chip tilt shrink-0" aria-label="튜토리얼 닫기">
          <X size={13} aria-hidden /> 닫기
        </button>
      </div>

      {step && step.lines?.length > 0 && (
          <BariCard
            face={step.face}
            lines={step.lines}
            note={step.note}
            hint={step.allow ? '해당하는 행동 버튼을 직접 눌러 보세요.' : undefined}
            hideNext={!!step.allow}
            onNext={() => {
              if (step.end) return onDone()
              next()
            }}
            nextLabel={step.end ? '마치기' : '다음'}
          />
        )}

        {b && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="ink-panel rounded-xl p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-serif text-base text-paper">{b.enemy.name}</p>
                <p className="text-xs tabular-nums text-paper/70">{b.ehp} / {b.enemy.hp}</p>
              </div>
              <div className="mt-1.5"><Bar value={b.ehp} max={b.enemy.hp} tone="bg-crimson" label="상대 체력" /></div>
              <p className="mt-2 rounded-lg bg-edge/[0.07] px-2.5 py-1.5 text-[11px] text-paper/70" aria-label="상대의 다음 행동" data-tutorial-enemy-intent>
                상대의 다음 행동: <b className="text-gold">{INTENT_LABEL[b.queue[0]] ?? '???'}</b>
              </p>
            </div>
            <div className="ink-panel rounded-xl p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-serif text-base text-paper">나 (튜토리얼: 100으로 고정)</p>
                <p className="text-xs tabular-nums text-paper/70">{b.php} / {b.phpMax}</p>
              </div>
              <div className="mt-1.5"><Bar value={b.php} max={b.phpMax} tone="bg-mana" label="내 체력" /></div>
              <p className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="flat-chip">의지력 {Math.floor(mp)}</span>
                <span className="flat-chip">부적 {b.charms}장</span>
              </p>
            </div>
          </div>
        )}

        {b && (
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="연습 행동 선택">
            <ActionBtn active={allowed('attack')} disabled={!myTurn || !allowed('attack')} onClick={() => doAction('attack')} dataAttr={{ 'data-tutorial-attack-btn': true }}>일반 공격</ActionBtn>
            <ActionBtn active={allowed('guard')} disabled={!myTurn || !allowed('guard')} onClick={() => doAction('guard')} dataAttr={{ 'data-tutorial-guard-btn': true }}>막기</ActionBtn>
            <ActionBtn active={allowed('charm')} disabled={!myTurn || !allowed('charm') || b.charms <= 0} onClick={() => doAction('charm')} dataAttr={{ 'data-tutorial-charm-btn': true }}>부적</ActionBtn>
            <ActionBtn active={allowed('scan')} disabled={!myTurn || !allowed('scan')} onClick={() => doAction('scan', { scanAmount: step?.scanAmount ?? 5 })} dataAttr={{ 'data-tutorial-scan-btn': true }}>간파 (의지력 {step?.scanAmount ?? 5})</ActionBtn>
            <ActionBtn active={allowed('openPsychic')} disabled={!myTurn || !allowed('openPsychic')} onClick={openPsychic} dataAttr={{ 'data-tutorial-psychic-btn': true }}>영능력</ActionBtn>
            <ActionBtn active={allowed('openItems')} disabled={!myTurn || !allowed('openItems')} onClick={openItems} dataAttr={{ 'data-tutorial-items-btn': true }}>소지품</ActionBtn>
          </div>
        )}

        {psyOpen && b && (
          <div className="ink-panel mt-2 rounded-xl p-3" role="region" aria-label="영능력 목록(연습)">
            <p className="font-serif text-sm text-gold">영능력</p>
            <ul className="mt-2 space-y-2">
              <li className="rounded-lg bg-edge/[0.07] px-3 py-2">
                <p className="text-sm text-paper">효험</p>
                <p className="text-[11px] text-paper/60">다음 공격·부적·영능력을 두 번 굴려 더 나은 쪽을 쓴다. (의지력 10)</p>
                <ActionBtn active={allowed('toggleBuff')} disabled={!allowed('toggleBuff')} onClick={toggleBuff} dataAttr={{ 'data-tutorial-buff-btn': true }}>{buffArmed ? '켜짐 (끄기)' : '켜기'}</ActionBtn>
              </li>
              <li className="rounded-lg bg-edge/[0.07] px-3 py-2">
                <p className="text-sm text-paper">도깨비불</p>
                <p className="text-[11px] text-paper/60">3턴 동안 기를 모은 뒤 일반 공격의 4배 피해. 무조건 명중. (의지력 20)</p>
                <ActionBtn active={allowed('dokkaebi-fire')} disabled={!allowed('dokkaebi-fire')} onClick={() => doPsychic('dokkaebi-fire')} dataAttr={{ 'data-tutorial-fire-btn': true }}>사용</ActionBtn>
              </li>
            </ul>
          </div>
        )}

        {itemsOpen && (
          <div className="ink-panel mt-2 rounded-xl p-3" role="region" aria-label="소지품(연습)" data-tutorial-items-panel>
            <p className="font-serif text-sm text-gold">소지품</p>
            {b ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-edge/[0.07] px-3 py-2">
                <div>
                  <p className="text-sm text-paper">사과맛 피크닉</p>
                  <p className="text-[11px] text-paper/60">의지력 +15. 턴을 소모하지 않는다.</p>
                </div>
                <ActionBtn active={allowed('useItem')} disabled={!allowed('useItem')} onClick={useItem} dataAttr={{ 'data-tutorial-picnic-btn': true }}>사용</ActionBtn>
              </div>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {WEAPONS.map((w) => (
                  <li key={w.id} className="rounded-lg bg-edge/[0.07] px-2 py-2 text-center">
                    <p className="text-xs text-paper">{w.name}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-paper/55">{w.effectText}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      {log.length > 0 && (
        <ul className="mt-2 max-h-28 space-y-1 overflow-auto rounded-xl bg-shade/30 p-2.5 font-mono text-[11px] leading-relaxed" aria-label="연습 전투 기록" data-tutorial-log>
          {log.map((l) => <li key={l.id} className="text-paper/80">{l.text}</li>)}
        </ul>
      )}
    </section>
  )
}

const INTENT_LABEL = { jab: '약공', smash: '강공', charge: '기 모으기', guard: '방어 태세', special: '영능력' }

/** #1 기본 전투 */
function tutorialBasicSteps(stats) {
  const atkNote = ACTIONS.attack.note
  const guardNote = ACTIONS.guard.note
  const charmNote = ACTIONS.charm.note
  const scanNote = ACTIONS.scan.note
  const rash = rashPercent(stats)
  return [
    { face: 'bari-smile', lines: ['안녕하세요! 저는 창록고등학교와 연합을 맺고 있는 자유계약 퇴마사, **바리**라고 해요.', '전투는 처음이시죠? 어쩌면 \'싸워야 한다\'는 사실 자체가 생소할 수도 있고요. 하지만 생각만큼 어렵지 않으니까, 느리게 잘 따라와보세요!'] },
    { face: 'bari', lines: ['우선 전투의 기본을 설명드릴게요. 전투는 기본적으로 **턴제**라 나의 턴, 상대의 턴으로 나뉘어요.', '모든 적은 \'체력\' \'공격력\' \'행동력\' \'영력\'이라는 스탯을 가져요. 영력은 전체적인 난이도를 결정하고, 공격력과 행동력은 전투 중에 영향을 줘요. 적의 체력이 0이 되면 적을 이길 수 있어요.'] },
    { face: 'bari', lines: ['반면 우리는 \'체력\'과 \'의지력\'으로 모든 것을 결정할 거예요.', '우리의 체력이 0이 되면 쓰러져 양호실에서 눈을 뜨게 돼요. 본관에서 다른 곳까지 다시 이동해야 하니 주의하세요.', '우리의 **의지력**은 0이 되어도 상관 없지만, 각종 영능력을 사용할 수 없게 돼요. 최대한 전투 중 0이 되는 상황은 피하는 게 좋아요.'] },
    { face: 'bari', lines: ['먼저 적의 행동부터 확인해볼게요. 적의 행동은 \'약공\', \'강공\', \'방어 태세\', \'영능력\'으로 나뉘어요. 행동 순서는 기본적으로 주사위값 난수에 따른 랜덤이에요.'] },
    { face: 'bari', lines: ['**약공**은 적의 공격력에 영향을 받는, 일반 공격이에요. 우리가 맞는 데미지이기도 하죠.'], note: '약공 피해 = 1d공격력 + 1d영력 (영력 굴림이 1이면 그 공격은 빗나간다).' },
    { face: 'bari', lines: ['**강공**은 보통 먼저 \'기 모으기\'를 한 다음 턴에 와요. 다음 턴이 강공인 경우 무조건 미리 보여져요.'], note: '강공 피해 = 1d공격력×2 + 영력 (d10 굴림이 1~2면 빗나간다).' },
    { face: 'bari', lines: ['**방어 태세**는 말 그대로예요. 내 공격 다음 적의 턴이 방어 태세인 경우, 방어 태세를 무시하는 부적이나 특수한 영능력이 아닌 이상 공격력이 무조건 절반으로 들어가요.'] },
    { face: 'bari', lines: ['**영능력**은 다음에 다른 튜토리얼에서 확인해요! 우선은 넘어갈게요.'] },
    { face: 'bari', lines: ['다음은 우리의 턴을 확인해볼게요. 우리의 행동 목록에는 \'일반 공격\' \'막기\' \'부적\' \'간파\' 그리고 \'영능력\'이 있어요. 영능력은 나중에 다른 튜토리얼에서 만날 테니 오늘은 네 개만 알아볼게요.'] },
    { face: 'bari', lines: ['**일반 공격**은 아무런 자원을 소모하지 않는 가장 기본적인 공격이에요. 명중률은 안목에, 공격력은 \'호전\'에 영향을 받아요.'], note: `${atkNote} (명중 = 1d(안목+1), 피해 = 1d호전×2 + 명중 굴림값)` },
    { face: 'bari', lines: ['**막기**는 적의 공격 직전 방어를 시도하는 행동이에요. 막기를 시도한 턴의 다음 공격은 훨씬 덜 아픈 공격을 받을 수 있어요. 호전이 많이 높은 사람은 가끔 반격이 들어가기도 해요.'], note: `${guardNote} · 무구가 [칼]이면 막기 성공 시 1d호전×2(완전 방어·호전 우위 시 ×3) 반격이 들어간다.` },
    { face: 'bari', lines: ['**부적**은 일반 공격의 두 배 데미지가 절대 빗나가지 않고 들어가요. 한 전투에 3회까지만 쓸 수 있어요. 그 대신, 의지력을 많이, 그 때마다 다르게 써요.'], note: `${charmNote} (피해 = 일반 공격 피해×2, 명중 굴림은 항상 성공 처리 · 의지력 소모 = 1d(50−절제), 최소 1 — 모자라면 있는 만큼만 쓰고 터진다)` },
    { face: 'bari', lines: ['**간파**는 사용하면 원래는 보이지 않는 상대의 다음 턴 행동을 볼 수 있어요. 안목이 높으면 더 멀리 볼 수 있어요.'], note: scanNote },
    { face: 'bari', lines: ['인내는 받는 피해에 영향을 줘요. 높을 수록 덜 아프게 맞을 확률이 늘어나요.'], note: `인내 피해 감소 발동 확률 = 인내 ÷ 2% (최대 100%). 발동 시 피해를 1d인내(1~인내)만큼 줄이며, 최종 피해는 최소 0. 인내가 0이면 발동하지 않는다. 현재 인내 ${Math.max(0, Math.floor(stats.endurance || 0))} → 발동 확률 ${Math.min(100, Math.max(0, Math.floor(stats.endurance || 0)) / 2)}%.` },
    { face: 'bari-smile', lines: ['여기까지 배웠으면 직접 싸워가면서 해볼까요?'], auto: 'start' },
    {
      face: 'bari',
      lines: ['\'간파\'는 초반부에 써두는 게 좋아요. 그래야 상대의 행동을 파악하고 대책을 세울 수 있거든요. 우선 가볍게 의지력 5 정도만 써서 확인해보실래요?'],
      allow: 'scan', scanAmount: 5, highlight: '[data-tutorial-scan-btn]',
    },
    { face: 'bari', lines: ['잘 하셨어요. 적은 이제 \'약공\'을 할 거예요.'] },
    { auto: 'enemy' },
    { face: 'bari', lines: ['데미지가 어느 정도 들어왔는지, 내가 무슨 행동을 했는지 등은 **아래 안내**에서도 볼 수 있고, 옆의 채팅창 **\'활동 로그\'**에서도 볼 수 있어요.'], highlight: '[data-tutorial-log]' },
    { face: 'bari', lines: ['이제 반격해볼까요? 우리도 일반 공격을 해봅시다.'], allow: 'attack', highlight: '[data-tutorial-attack-btn]' },
    { face: 'bari', lines: ['잘 하셨어요. 상대는 이제 기 모으기-강공을 준비할 거예요. 기 모으기 턴 동안에는 우리에게 들어오는 데미지가 없으니 자유롭게 원하는 행동을 할 수 있어요. 우리는 일반 공격을 한 번 더 해볼까요?'] },
    { auto: 'enemy' },
    { allow: 'attack', face: 'bari', lines: ['지금이에요, 한 번 더!'], highlight: '[data-tutorial-attack-btn]' },
    { face: 'bari', lines: ['좋아요. 다음 턴은 이제 강공이네요. 강공은 방심할 수 없는 공격이기 때문에, 우리는 \'막기\'로 방어하는 게 좋겠어요. 한 번 해보세요!'], allow: 'guard', highlight: '[data-tutorial-guard-btn]' },
    { auto: 'enemy' },
    { face: 'bari', lines: ['확실히 버틸만한 느낌이 되었죠? 그대로 맞았으면 엄청 아팠을 거예요⋯!'] },
    { face: 'bari', lines: ['다음 상대의 행동을 봅시다. \'방어 태세\'네요. 일반 공격을 하면 상대는 가볍게 흘려내버리고 말 거예요. 이럴 때에는 상대의 방어 태세를 무시하는 부적을 사용하는 게 좋겠어요. 한 번 써볼까요?'], allow: 'charm', highlight: '[data-tutorial-charm-btn]' },
    { auto: 'enemy' },
    { face: 'bari', lines: ['이러면 상대의 방어가 의미가 없어지죠! 부적은 횟수 제한이 있으니까, 방어 태세에 맞춰 최대한 아껴두는 것이 기본적으로 베스트예요.'] },
    { face: 'bari', lines: ['여기까지 했으면 여러분은 기본적인 공격 순서에 대해서는 모두 익히신 거예요.'] },
    {
      face: 'bari',
      lines: ['한 가지 알아둬야 할 게 있어요. 바로 \'돌발 행동\'이에요. \'호전\'이 전투에 사용되는 비중이 높았죠? 그런데 이 호전이 무조건 높다고 좋진 않아요. 호전이 다른 스탯에 비해 너무 높으면 무조건 턴을 \'일반 공격\'으로 넘기는 돌발 행동이 나오거든요.'],
      note: `돌발 행동 확률 = max(0, 호전 − 절제)%. 지금 내 돌발 행동 확률은 ${rash}%.`,
    },
    {
      face: 'bari',
      lines: ['덧붙여, 전투 중 체력이 0이 되었을 때 의지력이 2 이상인 경우, \'버티기\'라는 것을 시도할 수 있어요. 자신의 의지력을 거의 다 소모하는 대신, 무조건 한 턴을 버티게 해주는 거예요.', '의지가 모자라면 버티기는 할 수 없어요. 확인하세요!'],
      note: `버티기: 체력 1로 일어나고, 가진 의지력을 1만 남기고 전부 쓴다. 인내×2(${Math.min(100, (stats.endurance || 0) * 2)}%) 확률로 의지력을 쓰지 않는다. 한 전투에 ${maxSurvives(stats)}회까지.`,
    },
    { face: 'bari-smile', lines: ['여기까지 기본 전투였어요. 어때요, 생각보다 할만하죠? 그럼 다음 튜토리얼에서 만나요!'], end: true },
  ]
}

/** #2 영능력 */
function tutorialPsychicSteps() {
  return [
    { face: 'bari-smile', lines: ['안녕하세요! 이번 전투에서는 \'영능력\'이라는 특수한 힘에 대해서 알아볼 거예요.'] },
    { face: 'bari', lines: ['이번 전투는 여러분이 직접 싸우시는 게 아니라, 제가 직접 허수아비와 싸우면서 시연을 보여드릴게요. 아직 여러분은 기본적으로 배우는 영능력 외에는 습득하지 못하셨거든요. 하지만 자라날수록, 주변을 탐사할수록 많은 힘을 얻게 될 거예요.'] },
    { face: 'bari', lines: ['영능력은 의지력을 소모하고, 전투를 유리하게 만들어주는 게 기본이에요. 예를 들어 제가 가지고 있는 영능력 두 개를 소개해드릴게요.'] },
    { face: 'bari', lines: ['저는 모든 영능력자가 기본적으로 가지고 있는 영능력인 \'효험\', 그리고 제가 가지고 있는 고유 영능력인 \'도깨비불\' 이렇게 두 개를 가지고 있어요. 여러분에게도 \'효험\' 자체는 있을 거예요. 그건 정말 모두가 날 때부터 얻는 선천적 요령이거든요.'], auto: 'start' },
    { face: 'bari', lines: ['우선 제 턴에서 \'영능력\' 버튼을 누르면, 아래에서 영능력 목록을 볼 수 있게 돼요. 혹시 저 대신 한 번 눌러보실래요?'], allow: 'openPsychic', highlight: '[data-tutorial-psychic-btn]' },
    { face: 'bari', lines: ['고마워요! 이 목록에서 영능력의 효과를 확인할 수 있어요. 미리 파악해두면 큰 도움이 되겠죠? 전투 밖에서는 \'도감\'에서 획득한 영능력들을 다시 열람할 수 있으니 참고하세요.'] },
    { face: 'bari', lines: ['우선 저는 \'효험\'을 사용해볼게요. 우리의 공격은 빗나가거나 공격력이 극단적으로 낮게 나올 수도 있어요. 하지만 \'효험\'을 사용하면 상당한 보험이 되어요. 굴림 자체를 두 번 할 수 있으니까요. 효험을 대신 눌러 주시겠어요?'], allow: 'toggleBuff', highlight: '[data-tutorial-buff-btn]' },
    { face: 'bari', lines: ['고마워요. 그 다음은 일반 공격을 해볼까 해요. 이걸 누르면 일반 공격이 자동으로 두 번 굴러지고, 그 중 더 강한 공격이 자동으로 상대에게 들어갈 거예요.'], allow: 'attack', highlight: '[data-tutorial-attack-btn]' },
    { face: 'bari', lines: ['보셨죠? 좀 더 안정적이고 확정적인 데미지가 필요할 경우에 사용하면 도움이 될 거예요.'] },
    { auto: 'enemy' },
    { face: 'bari', lines: ['영능력은 여러 가지가 있어요. 여러분은 활동하면서 다양한 순간에 다양한 영능력을 사용하게 될 거예요. 영능력은 기본적으로 자신의 턴을 소모하기도 하고, \'맨 첫 턴\'이 아니면 사용할 수 없을 정도로 중요한 것도 있어요.', '그런데 한 가지 더 알아둘 건, \'적\'도 영능력을 쓴다는 거예요.'] },
    { face: 'bari', lines: ['저는 지금부터 도깨비불을 쓸 거예요. 대신 눌러주실 수 있나요?'], allow: 'dokkaebi-fire', highlight: '[data-tutorial-fire-btn]' },
    { auto: 'enemy' },
    { face: 'bari', lines: ['적이 영능력을 사용하면 이런 식으로 뜨는데요, \'간파\'로 확인하더라도 영능력의 자세한 데이터는 뜨지 않아요. 그냥 \'영능력\'이라고만 떠요. 무조건 처음 마주하기 전까지는 그 적이 무슨 영능력을 사용하는지 효과를 알 수 없어요.'] },
    { face: 'bari', lines: ['이런 영능력을 어떻게 사용하는지가 제법 전투에 큰 영향을 미치겠죠? 이제 남은 전투는 자동으로 진행할게요! 어차피 저는 도깨비불에 명시된 효과 때문에 행동을 못 하거든요.'] },
    { auto: 'enemy' },
    { auto: 'fire' },
    { auto: 'enemy' },
    { auto: 'fire' },
    { auto: 'enemy' },
    { auto: 'fire' },
    { face: 'bari', lines: ['한 방이 묵직하고 좋죠? 여기에 아이템이나, 다른 무구의 버프 등을 바를 수도 있으니 잘 계산해봐요. \'상대의 방어 태세를 무시한다\'라고 적혀 있지 않은 이상 영능력도 타이밍을 잘 재야 하거든요.'] },
    { face: 'bari', lines: ['그럼 다음 튜토리얼에서 만나요! 수고하셨어요!'], end: true },
  ]
}

/** #3 무구와 아이템 */
function tutorialGearSteps() {
  return [
    { face: 'bari-smile', lines: ['안녕하세요! 이번엔 무구와 아이템을 쓰는 법을 알려드릴 거예요.'] },
    { face: 'bari', lines: ['모바일 기준 상단, PC/탭 기준 왼쪽 하단에 \'내 소지품 확인하기\' 버튼이 있어요. 지금 저기를 직접 한 번 눌러 보실래요?'], allow: 'realItems', highlight: '[data-tutorial-real-items-btn]' },
    { face: 'bari', lines: ['그 안에 무구/신체/장신구, 그리고 아이템 목록란이 있어요. 무구와 신체와 장신구는 몸에 착용할 수 있는 장비예요. 그 중에서도 무구가 다양한 전투 효과를 가져요.'] },
    { face: 'bari', lines: ['무구의 종류는 다음과 같아요. (부채·창·단검·칼·활·무당방울·악기·낫·석장·철퇴) 보시다시피 각 무기는 무기 자체에 고유 효과가 붙어 있어요. 여기에 원하는 대로 스탯을 넣어 커스텀이 가능한 구조예요. 그건 뒷산의 무구보관소에 가서 다른 분께 여쭤봐주세요! 저는 일단 스탯이 없는 상태로 들어갈게요.'], highlight: '[data-tutorial-items-panel]' },
    { face: 'bari', lines: [`하나 더 말씀드리자면, 우리의 전투는 기본적으로 무구가 아예 없는 상태로도 거의 모든 전투가 가능하게 만들어져 있는 시스템이에요. 어차피 스탯이 오르는 방식은 다 동일(스탯 하나당 최대 +${ENH_MAX})하니, 마음 놓고 원하는 무기를 컨셉으로만 골라도 충분히 스토리를 진행할 수 있어요.`] },
    { face: 'bari', lines: ['아이템도 볼까요? 아이템은 전투 중 소지품 목록에서 활용할 수 있어요. 제가 의지력을 회복시키는 아이템 하나를 넣어드릴게요. 전투 중 언제 써야 할지 직접 봅시다. 우선 싸우러 가보죠!'], auto: 'start' },
    { face: 'bari', lines: ['첫 턴에 간파나 부적을 한 번 써보세요! 의지력을 소모해봅시다.'], allow: ['scan', 'charm'], scanAmount: 5, highlight: '[data-tutorial-scan-btn]' },
    { face: 'bari', lines: ['이 상태에서 의지력을 채우는 아이템을 사용하면 좋겠죠? (안에는 사과맛 피크닉 하나가 들어 있어요) 피크닉을 하나 드셔 보시겠어요?'], allow: 'openItems', highlight: '[data-tutorial-items-btn]' },
    { face: 'bari', lines: ['피크닉을 사용해볼까요?'], allow: 'useItem', highlight: '[data-tutorial-picnic-btn]' },
    { face: 'bari', lines: ['의지력이 회복된 게 보이시나요?'] },
    { face: 'bari', lines: ['이런 식으로 전투 중 단일 대상의 아이템 사용은 \'기본적으로\' 턴을 소모하지 않아요. 아이템에도 #턴소모無 등으로 태그가 붙어 있을 거예요. 하지만 단체 전투로 가면 달라질 수 있으니 참고해요.'] },
    { face: 'bari-smile', lines: ['수고하셨습니다! 그럼 다음, 마지막 튜토리얼에서 만나요!'], end: true },
  ]
}

function TutorialScripted({ tutorialId, stats, onLog, onDone, onClose }) {
  const dummy = tutorialId === 'psychic' ? TUTOR_DUMMY_PSY : TUTOR_DUMMY
  const queue = useMemo(() => {
    if (tutorialId === 'basic') return forcedQueue(['jab', 'charge', 'smash', 'guard'], 20)
    if (tutorialId === 'psychic') return ['jab', 'special', 'jab', 'jab', 'jab', 'jab', 'jab']
    return forcedQueue(['jab', 'guard'], 10) // gear
  }, [tutorialId])
  const steps = useMemo(() => {
    if (tutorialId === 'basic') return tutorialBasicSteps(stats)
    if (tutorialId === 'psychic') return tutorialPsychicSteps()
    return tutorialGearSteps()
  }, [tutorialId, stats])
  const meta = TUTORIAL_META.find((t) => t.id === tutorialId)
  return <ScriptedBattle key={tutorialId} dummy={dummy} queue={queue} steps={steps} stats={stats} onLog={onLog} onDone={onDone} onClose={onClose} title={meta?.label ?? ''} />
}

/**
 * #4 단체 전투 연습 대사·순서. 바리(봇, 신속을 아주 높게 둬서 실제 캐릭터가 얼마나 빠르든
 * 항상 바리가 먼저 움직인다)와 당신, 둘이서 허수아비 한 마리를 실제로(mbattle.js 엔진 그대로) 상대한다.
 * 라운드1: 바리가 폭죽(단체 버프, #턴소모有) 사용 → 당신이 일반 공격. 폭죽의 selfStun 은 1이라, 쓴 턴 바로 다음
 *   한 라운드만 행동불능이다.
 * 라운드2: 바리가 폭죽 때문에 행동불능(자동으로 넘어감) → 당신이 막기.
 * 라운드3: 바리는 다시 움직일 수 있어 일반 공격 → 당신이 부적(이때 상대가 강제로 '단체 공격'을 쓰도록 큐를 맞춰 둔다).
 */
function tutorialGroupSteps() {
  return [
    { face: 'bari-smile', lines: ['안녕하세요! 이번엔 단체 전투를 해볼 거예요. 저와 당신이 한 팀, 적은 한 명(가끔 둘 이상이 나올 가능성도 있음)이에요.'] },
    { face: 'bari', lines: ['우리 팀 중에서 신속이 가장 높은 사람을 통해 선공 판정을 하고요, 그렇게 적-아군의 순서가 정해져요.', '적보다 내 신속이 낮더라도, 신속이 높은 친구가 선공 판정을 성공하면 적보다 먼저 행동할 수 있답니다! 아군 자체에 턴이 돌아오니까요.'] },
    { face: 'bari', lines: ['아군 내의 턴 순서는 신속 순서예요. 별도의 판정은 없이 무조건 신속이 높은 순서로 행동해요. 이번엔 제가 신속이 가장 높아서, 제가 먼저 움직일게요. 직접 싸워 볼까요?'], auto: 'start' },
    { face: 'bari', lines: ['한 가지 더 알아두셔야 할 건, 아이템을 사용할 때 \'단체\' 대상인 경우에는 턴을 사용하는 경우가 많다는 거예요. 저는 우선 단체 대상 아이템인 \'폭죽\'을 사용해볼게요. 대신 저는 쓴 다음 한 턴 동안 움직일 수 없게 돼요.'], auto: 'bari', bariItem: 'firecracker' },
    { face: 'bari', lines: ['제 턴이 넘어가버렸죠? 그 대신 파티원인 당신은 폭죽의 공격력 추가 보정을 받게 될 거예요. 이제 당신 차례예요 — 일반 공격을 한 번 해보시겠어요?'], allow: 'attack', highlight: '[data-tutorial-mb-attack-btn]' },
    { face: 'bari', lines: ['느껴지나요? 폭죽의 버프 덕분에 공격력이 두 배가 됐을 거예요.'] },
    { face: 'bari', lines: ['저는 아직 폭죽 때문에 움직일 수 없어요. 제 턴은 자동으로 넘어가요 — 아래 제 체력 칸에 \'행동불능\' 표시가 보이실 거예요.'], auto: 'bari' },
    { face: 'bari', lines: ['적의 약공과 강공은 특수한 적이나 영능력의 영향을 받지 않는 이상 기본적으로 무조건 체력이 많은 사람을 단일로 노려요. 이번엔 당신이 \'막기\'를 해보실래요?'], allow: 'guard', highlight: '[data-tutorial-mb-guard-btn]' },
    { face: 'bari', lines: ['다른 건 일반 전투와 똑같아요! 하지만 적이 가끔 난수에 \'단체 공격\'을 추가하는 경우도 있으니 조심하세요. 단체 공격은 체력이 높은 사람에게만 가지 않고, 모두를 공격해요. 마침 다음 상대 턴이 단체 공격일 거예요 — 잘 보세요.'] },
    { face: 'bari', lines: ['이제 저도 다시 움직일 수 있어요 — 저도 한 번 더 공격해볼게요!'], auto: 'bari', bariAct: { action: 'attack' } },
    { face: 'bari', lines: ['한 번 더 가볼까요? 이번엔 부적을 써보세요.'], allow: 'charm', highlight: '[data-tutorial-mb-charm-btn]' },
    { face: 'bari', lines: ['보셨죠? 단체 공격은 모두에게 들어가니, 아껴둔 체력 회복 아이템이나 영능력으로 대비하는 게 좋아요.'] },
    { face: 'bari', lines: ['영능력은 단체 대상이 되기도, 한 명 대상이 되기도 해요. 기본적으로 한 명 대상인 경우 체력이 높은 사람을 노리는 게 보통이지만, 영능력에 따라 일부러 체력이 적은 사람을 점사하기도 하니, 상대의 영능력을 만난 후에는 그 영능력도 잘 분석해봐요.'] },
    { face: 'bari', lines: ['마지막으로 제 고유 영능력인 **도깨비불**도 단체 전투에서 어떻게 보이는지 보여드릴게요. 쓰는 턴부터 3턴 동안 아무 행동도 못하고 기를 모으는 대신, 그 다음 턴에 일반 공격의 4배 피해를 터뜨려요. 의지력 20을 소모해요.'] },
    { face: 'bari', lines: ['자, 한 번 써볼게요!'], auto: 'bari', bariAct: { action: 'psychic', psychic: 'dokkaebi-fire' } },
    { face: 'bari', lines: ['제가 영능력을 쓰면, 이렇게 화면 위쪽에 적의 비기와 똑같이 꾸며진 큰 팝업이 뜨면서 누가 어떤 영능력을 썼는지 알려줘요. 다인 전투에서는 같은 편이 뭘 했는지 놓치기 쉬우니까, 이런 식으로 크게 알려주는 거예요.'] },
    { face: 'bari', lines: ['이제 당신 차례예요 — 한 번 더 공격해 볼까요?'], allow: 'attack', highlight: '[data-tutorial-mb-attack-btn]' },
    { face: 'bari', lines: ['저는 아직 기를 모으는 중이에요. 이번 턴도 아무것도 못해요 — 한 턴만 더 기다려 주세요.'], auto: 'bari' },
    { face: 'bari', lines: ['이번엔 막기를 한 번 해보시겠어요?'], allow: 'guard', highlight: '[data-tutorial-mb-guard-btn]' },
    { face: 'bari', lines: ['거의 다 모았어요. 한 턴만 더요!'], auto: 'bari' },
    { face: 'bari', lines: ['한 번 더 공격해 볼까요?'], allow: 'attack', highlight: '[data-tutorial-mb-attack-btn]' },
    { face: 'bari-surprise', lines: ['드디어 다 모았어요 — 터뜨려 볼게요!'], auto: 'bari' },
    { face: 'bari-smile', lines: ['보셨죠? 일반 공격의 4배 피해가 한 번에 들어가요. 그만큼 3턴이나 아무것도 못 하게 되니, 상대가 그 틈에 단체 공격 같은 걸 쓰지 않을 때를 노려서 쓰는 게 좋아요.'] },
    { face: 'bari-smile', lines: ['이제 밖으로 나가면 무구 하나를 드릴 거예요. 앞선 3개의 튜토리얼을 모두 마쳤으면 받을 수 있어요. 아직 완료하지 않았으면 하러 가보세요! 나머지 무구들은 직접 학교 주변을 돌아다니며 얻어 보세요.'] },
    { face: 'bari-smile', lines: ['여기까지에요! 이걸로 튜토리얼은 모두 마쳤어요. 고생하셨습니다!'], end: true },
  ]
}

/** #4 단체 전투 — mbattle.js(실제 다인 전투 엔진)를 그대로 써서, 바리(봇)와 2인 파티로 허수아비를 실제로 상대한다. */
function ScriptedGroupBattle({ stats, onLog, onDone, onClose }) {
  const steps = useMemo(() => tutorialGroupSteps(), [])
  const [i, setI] = useState(0)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [, setTick] = useState(0)
  const [allyBanner, setAllyBanner] = useState(null)
  const mbRef = useRef(null)
  const rerender = () => setTick((t) => t + 1)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const step = steps[i]
  const next = () => setI((n) => Math.min(steps.length - 1, n + 1))

  const pushLog = (events) => {
    const texts = (events ?? []).map((e) => e.text).filter(Boolean)
    if (!texts.length) return
    setLog((l) => [...texts.map((t) => ({ id: Math.random(), text: t })), ...l].slice(0, 30))
    onLog?.(texts)
  }

  // 아군(바리)이 영능력을 쓰면, 실제 다인 전투와 똑같이 적 비기처럼 꾸며진 큰 팝업으로 알려준다.
  const announceAllyPsychic = (events) => {
    const psy = (events ?? []).find((e) => e.popup?.type === 'psychic')
    if (!psy) return
    const def = PSYCHICS.find((p) => p.id === psy.popup.psychic)
    setAllyBanner({ name: psy.popup.name, label: def?.label ?? psy.popup.psychic, note: def?.note, k: Math.random() })
  }
  useEffect(() => {
    if (!allyBanner) return undefined
    const t = setTimeout(() => setAllyBanner(null), 6200)
    return () => clearTimeout(t)
  }, [allyBanner])

  // 연습용이라 허수아비도 바리도 당신도 쓰러지지 않는다 — 실제 스탯으로 데미지를 굴리다 보니
  // 생기는 조로종료 문제(위 솔로 튜토리얼과 같은 원인)를 막는다. '버티기 대기' 단계에서도 멈추지 않게
  // 바로 되살리고 다음 라운드로 넘긴다.
  const clampMB = (mb) => {
    if (!mb) return
    if (mb.phase === 'survive') {
      for (const m of mb.members) {
        if (m.pendingDeath) {
          m.pendingDeath = false
          m.php = Math.max(1, Math.ceil(m.phpMax * 0.5))
          m.status = 'alive'
        }
      }
      afterEnemy(mb, Math.random)
    }
    for (const m of mb.members) {
      if (m.status !== 'alive') m.status = 'alive'
      if (m.php <= 0) m.php = Math.max(1, Math.ceil(m.phpMax * 0.5))
    }
    // preserveEnemyHp 가 매 턴 ehp 를 999_999 까지 미리 끌어올려 두기 때문에, 공격이 끝난 뒤에도
    // ehp 가 그대로 그 거대한 값 근처(예: 999,850)에 남아 화면에 말도 안 되는 숫자로 보일 수 있다.
    // ehp 가 0 이하이거나 허수아비의 최대 체력보다 커졌으면(= 비정상 범위) 항상 35%로 되돌린다.
    if (mb.ehp <= 0 || mb.over || mb.ehp > mb.enemy.hp) {
      mb.ehp = Math.max(1, Math.min(mb.enemy.hp, Math.ceil(mb.enemy.hp * 0.35)))
      mb.over = null
      if (mb.phase === 'over') mb.phase = 'input'
      if (!mb.turn) beginRound(mb, Math.random)
    }
  }

  // 데미지를 굴리기 '전'에 미리 체력을 넉넉히 채워 둔다 — 그래야 한 방에 쓰러져서 그 라운드 안에서
  // 상대(허수아비)의 차례가 통째로 건너뛰어지는 일이 없다(쓰러지면 그 라운드엔 상대가 반응하지 않고
  // 다음 라운드로 바로 넘어가 버린다 — 예고해 둔 '단체 공격' 시연이 조용히 스킵될 수 있었다).
  // 끝나고는 clampMB 가 다시 보기 좋은 수치로 되돌린다.
  const preserveEnemyHp = (mb) => {
    if (mb) mb.ehp = Math.max(mb.ehp, 999_999)
  }

  // 전투 시작: 바리 + 당신 2인 파티를 만들고 선공 판정을 한다.
  useEffect(() => {
    if (step?.auto !== 'start' || mbRef.current) return
    const bari = {
      id: 'bari',
      name: '바리',
      stats: { insight: 14, aggression: 14, endurance: 12, control: 12, agility: 300, comprehension: 12 },
      fx: null,
      hp: 100, hpMax: 100, mp: 100, mpMax: 100,
    }
    const me = { id: 'me', name: '당신', stats, fx: stats.fx ?? null, hp: 100, hpMax: 100, mp: 100, mpMax: 100 }
    const mb = createDummyMB(TUTOR_DUMMY_GROUP, [bari, me], Math.random)
    mb.queue = forcedQueue(['jab', 'jab', 'group', 'smash'], 20)
    mbRef.current = mb
    const evs = openingInitiative(mb, Math.random)
    if (!mb.turn) evs.push(...beginRound(mb, Math.random))
    pushLog([{ text: `${TUTOR_DUMMY_GROUP.name}이(가) 나타났다. (2인 전투: 바리, 당신)` }, ...evs])
    rerender()
    if (!step.lines?.length) timer.current = setTimeout(next, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 바리(봇)의 자동 턴 — i 에만 반응해서 같은 단계가 두 번 실행되지 않게 한다(솔로 튜토리얼과 같은 이유).
  useEffect(() => {
    if (step?.auto !== 'bari' || !mbRef.current || mbRef.current.turn !== 'bari') return
    setBusy(true)
    timer.current = setTimeout(() => {
      const mb = mbRef.current
      const barM = mb.members.find((x) => x.id === 'bari')
      // 돌발 행동(낮은 확률로 턴이 시작되기 전에 미리 '무조건 공격'이 정해져 있을 수 있다)이 이미
      // 걸려 있으면 지운다 — 튜토리얼 대사와 다른 행동이 나가면 안내가 어긋나 보이기 때문이다.
      if (barM?.act?.forced) barM.act = null
      // 아이템 사용(useItemMB)의 안내 문구는 resolveTurn 의 반환값이 아니라 mb.log 에 바로 쌓인다 —
      // 그래서 쓰기 전 길이를 기억해 두고, 쓴 뒤 새로 늘어난 만큼만 떼어내 로그로 보여 준다.
      let itemEvs = []
      if (step.bariItem) {
        const item = ITEMS.find((it) => it.id === step.bariItem)
        const before = mb.log.length
        useItemMB(mb, 'bari', item, null)
        itemEvs = mb.log.slice(before)
      } else if (step.bariAct) {
        submit(mb, 'bari', step.bariAct)
      }
      // bariItem/bariAct 가 둘 다 없으면(= 폭죽으로 행동불능인 턴) 아무것도 제출하지 않는다 —
      // resolveTurn 이 stun 을 보고 스스로 건너뛴다.
      preserveEnemyHp(mb)
      const evs = resolveTurn(mb, Math.random)
      clampMB(mb)
      announceAllyPsychic(evs)
      pushLog([...itemEvs, ...evs])
      setBusy(false)
      rerender()
      if (!step.lines?.length) next()
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const doMe = (action) => {
    const mb = mbRef.current
    if (busy || !mb || mb.turn !== 'me' || mb.phase !== 'input') return
    setBusy(true)
    const meM = mb.members.find((x) => x.id === 'me')
    if (meM?.act?.forced) meM.act = null // 돌발로 미리 정해진 행동이 있었다면 지우고, 실제로 누른 행동을 쓴다
    const r = submit(mb, 'me', { action })
    if (r.error) {
      setBusy(false)
      return
    }
    preserveEnemyHp(mb)
    const evs = resolveTurn(mb, Math.random)
    clampMB(mb)
    pushLog(evs)
    setBusy(false)
    rerender()
    next()
  }

  const mb = mbRef.current
  const me = mb?.members.find((m) => m.id === 'me')
  const bari = mb?.members.find((m) => m.id === 'bari')
  const allow = step?.allow
  const allowed = (k) => allow === k
  const myTurn = !busy && mb && mb.phase === 'input' && mb.turn === 'me'

  return (
    <section aria-label="#4 단체 전투" className="relative">
      {step?.highlight && <Spotlight selector={step.highlight} />}
      <AllyPsychicBanner sp={allyBanner} onEnd={() => setAllyBanner(null)} />
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span className="rounded-full bg-gold-fill px-3 py-0.5 text-ink light:text-ink">#4 단체 전투 (연습)</span>
        <button type="button" onClick={onClose} className="flat-chip tilt shrink-0" aria-label="튜토리얼 닫기">
          <X size={13} aria-hidden /> 닫기
        </button>
      </div>

      {step && step.lines?.length > 0 && (
        <BariCard
          face={step.face}
          lines={step.lines}
          hint={step.allow ? '해당하는 행동 버튼을 직접 눌러 보세요.' : undefined}
          hideNext={!!step.allow}
          onNext={() => (step.end ? onDone() : next())}
          nextLabel={step.end ? '마치기' : '다음'}
        />
      )}

      {mb && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="ink-panel rounded-xl p-3">
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-base text-paper">{mb.enemy.name}</p>
              <p className="text-xs tabular-nums text-paper/70">{mb.ehp} / {mb.enemy.hp}</p>
            </div>
            <div className="mt-1.5"><Bar value={mb.ehp} max={mb.enemy.hp} tone="bg-crimson" label="상대 체력" /></div>
            <p className="mt-2 text-[11px] text-paper/60">라운드 {mb.round}</p>
          </div>
          <div className="grid gap-2">
            {[bari, me].map((m) => m && (
              <div key={m.id} className={`ink-panel rounded-xl p-2.5 ${mb.turn === m.id && mb.phase === 'input' ? 'ring-2 ring-gold' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-paper">{m.name}{mb.turn === m.id && mb.phase === 'input' ? <span className="ml-1.5 text-[10px] text-gold">(이번 턴)</span> : ''}</p>
                  <p className="text-[11px] tabular-nums text-paper/70">{m.php} / {m.phpMax}</p>
                </div>
                <div className="mt-1"><Bar value={m.php} max={m.phpMax} tone="bg-mana" label={`${m.name} 체력`} /></div>
                <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                  <span className="flat-chip">의지력 {Math.floor(m.mp)}</span>
                  <span className="flat-chip">부적 {m.charms}장</span>
                  {m.boost && <span className="flat-chip text-gold">공격력 ×2</span>}
                  {m.stun > 0 && <span className="flat-chip">행동불능 {m.stun}턴</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mb && (
        <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="연습 행동 선택">
          <ActionBtn active={allowed('attack')} disabled={!myTurn || !allowed('attack')} onClick={() => doMe('attack')} dataAttr={{ 'data-tutorial-mb-attack-btn': true }}>일반 공격</ActionBtn>
          <ActionBtn active={allowed('guard')} disabled={!myTurn || !allowed('guard')} onClick={() => doMe('guard')} dataAttr={{ 'data-tutorial-mb-guard-btn': true }}>막기</ActionBtn>
          <ActionBtn active={allowed('charm')} disabled={!myTurn || !allowed('charm') || (me?.charms ?? 0) <= 0} onClick={() => doMe('charm')} dataAttr={{ 'data-tutorial-mb-charm-btn': true }}>부적</ActionBtn>
        </div>
      )}

      {log.length > 0 && (
        <ul className="mt-2 max-h-28 space-y-1 overflow-auto rounded-xl bg-shade/30 p-2.5 font-mono text-[11px] leading-relaxed" data-tutorial-log>
          {log.map((l) => <li key={l.id} className="text-paper/80">{l.text}</li>)}
        </ul>
      )}
    </section>
  )
}

/** 뒷산 > 퇴마실습 화면에서 여는 튜토리얼 허브: 4개 중 하나를 골라 실행하고, 완료 상태 + 완주 보상(무구 1개 선택)을 관리한다. */
export default function BattleTutorialHub({ open, onClose, stats, tutorialDone = {}, tutorialRewardTaken, onTutorialDone, onClaimReward, onLog }) {
  const [running, setRunning] = useState(null) // 'basic' | 'psychic' | 'gear' | 'group' | null
  const [pickWeapon, setPickWeapon] = useState(false)
  const [selWeapon, setSelWeapon] = useState(WEAPONS[0]?.id ?? null) // 보상으로 고를 무구 미리보기(효과를 보고 고를 수 있도록)
  useEffect(() => {
    if (!open) {
      setRunning(null)
      setPickWeapon(false)
    }
  }, [open])
  if (!open) return null

  const allDone = TUTORIAL_META.every((t) => tutorialDone?.[t.id])

  if (running === 'group') {
    return <ScriptedGroupBattle stats={stats} onLog={onLog} onClose={() => setRunning(null)} onDone={() => { onTutorialDone?.('group'); setRunning(null) }} />
  }
  if (running) {
    return (
      <TutorialScripted
        tutorialId={running}
        stats={stats}
        onLog={onLog}
        onClose={() => setRunning(null)}
        onDone={() => { onTutorialDone?.(running); setRunning(null) }}
      />
    )
  }

  // 목록도 모달 팝업이 아니라, 실제 전투처럼 페이지 흐름 안에 그냥 나온다 — 여기서 하나를 누르면
  // 곧바로 그 전투 화면(위의 ScriptedBattle/ScriptedGroupBattle)으로 들어간다. 다른 전투를 고를 때처럼.
  return (
    <section aria-label="전투 튜토리얼" className="relative">
      <div className="flex items-center justify-between gap-2 text-xs text-paper/60">
        <span className="flex items-center gap-1.5 font-serif text-base text-gold">
          <Swords size={16} aria-hidden />
          전투 튜토리얼
        </span>
        <button type="button" onClick={onClose} className="flat-chip tilt shrink-0" aria-label="닫기">
          <X size={13} aria-hidden /> 닫기
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-paper/65">바리가 직접 플레이로 전투를 알려 줍니다. 아래에서 하나를 고르면 바로 그 전투가 시작돼요. 튜토리얼 중에는 체력·영력·의지력이 모두 100으로 표시되고, 실제 상태는 바뀌지 않아요. 순서는 자유예요.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {TUTORIAL_META.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setRunning(t.id)}
              className="ink-panel tilt flex w-full items-center justify-between gap-2 rounded-xl p-3 text-left hover:bg-gold-fill/15"
            >
              <span className="text-sm text-paper">{t.label}</span>
              {tutorialDone?.[t.id] ? <CheckCircle2 size={16} className="text-gold" aria-label="완료" /> : <span className="text-[10px] text-paper/45">미완료</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl border border-gold/30 bg-gold-fill/10 px-3 py-2.5">
        {tutorialRewardTaken ? (
          <p className="flex items-center gap-1.5 text-xs text-gold"><Gift size={13} aria-hidden /> 튜토리얼 완주 보상을 이미 받았어요.</p>
        ) : allDone ? (
          pickWeapon ? (
            <>
              <p className="text-xs text-gold">네 개를 모두 마쳤어요! 아래에서 하나씩 눌러 효과를 보고, 마음에 드는 무구를 받아가세요.</p>
              <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="받을 무구 고르기">
                {WEAPONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    role="tab"
                    aria-selected={selWeapon === w.id}
                    onClick={() => setSelWeapon(w.id)}
                    className={`rounded-full px-3 py-1 text-xs ${selWeapon === w.id ? 'bg-gold-fill text-ink' : 'bg-edge/10 text-paper/80 hover:bg-gold-fill/20'}`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
              {(() => {
                const w = WEAPONS.find((x) => x.id === selWeapon) ?? WEAPONS[0]
                if (!w) return null
                return (
                  <div className="mt-2.5 rounded-lg bg-edge/[0.07] px-3 py-2.5">
                    <p className="font-serif text-sm text-paper">{w.name}</p>
                    {w.desc && <p className="mt-1 text-[11px] leading-relaxed text-paper/60">{w.desc}</p>}
                    {w.effectText && <p className="mt-1.5 text-[11px] leading-relaxed text-gold">{w.effectText}</p>}
                    <button type="button" onClick={() => onClaimReward?.(w.id)} className="flat-btn mt-2.5 w-full justify-center text-xs">
                      <Gift size={13} aria-hidden /> {w.name} 받기
                    </button>
                  </div>
                )
              })()}
            </>
          ) : (
            <button type="button" onClick={() => setPickWeapon(true)} className="flat-btn w-full justify-center text-xs">
              <Gift size={13} aria-hidden /> 네 개를 모두 마쳤어요 — 무구 받으러 가기
            </button>
          )
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-paper/55"><Lock size={13} aria-hidden /> 네 개를 모두 마치면 무구 10개 중 하나를 바로 받을 수 있어요.</p>
        )}
      </div>
    </section>
  )
}
