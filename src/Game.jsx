import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPlayer } from './game/character'
import ChatPanel from './components/ChatPanel'
import InventoryModal from './components/InventoryModal'
import Store from './components/locations/Store'
import { START_MONEY, canUseItem, itemOf } from './game/items'
import { bgm } from './game/bgm'
import GameModal from './components/GameModal'
import ActivityBar from './components/ActivityBar'
import MenuPanel from './components/MenuPanel'
import ProfileEditModal from './components/ProfileEditModal'
import GiftModal from './components/GiftModal'
import ProfileSidebar from './components/ProfileSidebar'
import StatusPanel from './components/StatusPanel'
import Annex from './components/locations/Annex'
import Dormitory from './components/locations/Dormitory'
import Gym from './components/locations/Gym'
import Infirmary from './components/locations/Infirmary'
import MainHall from './components/locations/MainHall'
import Shrine from './components/locations/Shrine'
import {
  LOCATIONS,
  STAT_META,
  STAT_UPGRADE_COST_PER_POINT,
} from './game/constants'
import { LESSON_WAIT_MINUTES } from './game/courseInfo'
import {
  GYM_DAILY_REWARDS,
  applyBattleResult,
  cancelWaits,
  completeLesson,
  courseTitle,
  gymToday,
  lessonOf,
  pickFortuneStat,
  sanitizeRestored,
  spendAttempt,
  startTraining,
  startWait,
  tickPlayer,
  spiritPerMin,
  startRest,
  REST_KINDS,
} from './game/progress'
import { connect, disconnect, notify, onGift, sendGift } from './net/online'

/** 화면이 넓을 때(lg 이상)는 채팅을 오른쪽 아래에 늘 띄워 둔다. */
function useDesktop() {
  const q = '(min-width: 1024px)'
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const fn = () => setOn(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  return on
}

function stamp() {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

export default function Game({
  character,
  initialSave,
  theme,
  onToggleTheme,
  onSave,
  onLogout,
  userId,
  twitter,
}) {
  const restored = initialSave?.player

  const [player, setPlayer] = useState(() => (restored ? sanitizeRestored(restored) : createPlayer(character)))
  const [locationId, setLocationId] = useState(() => initialSave?.locationId || 'dorm')
  const battleRef = useRef(false)
  const reviveRef = useRef(false)
  const locRef = useRef(locationId)
  locRef.current = locationId
  const [logs, setLogs] = useState(() => {
    if (initialSave?.logs?.length) return initialSave.logs
    return [
      {
        id: 0,
        time: stamp(),
        message: `${character.name}(${character.age}세) — 기숙사 문이 닫힌다. 창록고에서의 첫 수련이 시작되었다.`,
      },
    ]
  })
  const desktop = useDesktop()
  const [invOpen, setInvOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [giftTo, setGiftTo] = useState(null) // { id, name }
  const [battleActive, setBattleActive] = useState(false)
  const [reviveOn, setReviveOn] = useState(false)
  const [itemsUsed, setItemsUsed] = useState(0)
  const [spotItems, setSpotItems] = useState(false)
  battleRef.current = battleActive
  reviveRef.current = reviveOn
  const [panel, setPanel] = useState('world') // world | log | items | stats  (오른쪽 메뉴)
  const [seenLog, setSeenLog] = useState(null) // 활동 로그 화면에서 마지막으로 본 기록 id
  const [activity, setActivity] = useState('intro') // 지금 구역에서 고른 활동 (구역을 옮기면 intro 로)
  const [course, setCourse] = useState(null)

  // 저장 디바운스용
  const saveTimer = useRef(null)
  const isFirstMount = useRef(true)

  const addLog = useCallback((message) => {
    setLogs((prev) => [{ id: Date.now() + Math.random(), time: stamp(), message }, ...prev].slice(0, 80))
  }, [])

  // 항상 최신 player 를 들고 있는 ref. (수업 시스템의 콜백이 늘 같은 함수로 남도록)
  const playerRef = useRef(player)
  playerRef.current = player

  // 배경음악은 신입생 등록을 마치고 게임 화면에 들어선 뒤부터 흐른다.
  useEffect(() => {
    bgm.start()
    return () => bgm.stop()
  }, [])

  // 온라인 서버(채팅 · 파티 · 랭킹)에 접속한다. 서버가 없으면 조용히 오프라인으로 남는다.
  useEffect(() => {
    connect(userId, player.name)
    return () => disconnect()
  }, [userId, player.name])

  // 1초마다: 영력 자연 회복 / 수련 진행 / 수업 대기 종료.
  // 탭을 백그라운드에 두거나 창을 내려도 시계는 계속 간다. (수련·대기는 시각 기준으로 계산하고, 돌아오면 그 사이 분량이 반영된다.)
  useEffect(() => {
    // 저장된 시각부터 이어서 센다: 탭을 닫아 둔 시간만큼도 영력이 쌓인다. (최대 30일)
    let last = Math.max(Date.now() - 30 * 86400000, initialSave?.savedAt ?? Date.now())
    const tick = () => {
      const now = Date.now()
      const dt = Math.max(0, (now - last) / 1000)
      last = now
      const r = tickPlayer(playerRef.current, now, dt)
      playerRef.current = r.player
      setPlayer((prev) => tickPlayer(prev, now, dt).player)
      r.logs.forEach(addLog)
    }
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [addLog])

  // 프로필을 고치면 저장되는 character 도 같이 바뀐다.
  const charOut = useMemo(
    () => ({ ...character, name: player.name, age: player.age, grade: player.grade ?? null, avatar: player.avatar }),
    [character, player.name, player.age, player.grade, player.avatar],
  )

  // 상태 변경 시 자동 저장 (약 0.8초 디바운스)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      // 첫 마운트 시 player가 새로 만들어진 경우 즉시 저장
      if (!restored && onSave) {
        onSave({
          character: charOut,
          player,
          locationId,
          logs,
        })
      }
      return
    }

    if (!onSave) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({
        character: charOut,
        player,
        locationId,
        logs,
      })
    }, 800)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [player, locationId, logs, charOut, onSave, restored])

  const spiritRate = useMemo(
    () => spiritPerMin(player.stats.control),
    [player.stats.control],
  )

  // ───────── 수련 · 대기: 다른 곳으로 이동하거나 새 동작을 시작하면 끊긴다 ─────────
  // (탭·창을 내리거나, 소지품·로그를 보거나, 영력으로 스탯을 올리는 것은 괜찮다.)
  const beginTraining = (minutes) => {
    if (playerRef.current.training) return
    endWaits('새 동작을 시작해')
    const next = startTraining(playerRef.current, minutes)
    playerRef.current = next
    setPlayer((prev) => (prev.training ? prev : startTraining(prev, minutes)))
    addLog(`기숙사에서 ${minutes}분 수련을 시작했다. (끝까지 마치면 영력 +${next.training.reward})`)
  }

  /** 수련을 끊는다. 끝까지 마치지 못했으니 보상은 없다. */
  const endTraining = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.training) return
      playerRef.current = { ...cur, training: null }
      setPlayer((prev) => (prev.training ? { ...prev, training: null } : prev))
      addLog(`${why} 수련을 포기했다. (보상 없음)`)
    },
    [addLog],
  )

  const beginRest = (kind, minutes) => {
    if (playerRef.current.resting) return
    endWaits('새 동작을 시작해')
    const next = startRest(playerRef.current, kind, minutes)
    playerRef.current = next
    setPlayer((prev) => (prev.resting ? prev : startRest(prev, kind, minutes)))
    addLog(`양호실에서 ${minutes}분 동안 ${REST_KINDS[kind].label}를 시작했다.`)
  }

  /** 휴식을 끊는다. 그때까지 찬 만큼은 그대로 남는다. */
  const endRest = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.resting) return
      playerRef.current = { ...cur, resting: null }
      setPlayer((prev) => (prev.resting ? { ...prev, resting: null } : prev))
      addLog(`${why} 휴식을 마쳤다.`)
    },
    [addLog],
  )

  /** 진행 중인 수업 대기를 끊는다. */
  const endWaits = useCallback(
    (why) => {
      const r = cancelWaits(playerRef.current)
      if (!r.ids.length) return
      playerRef.current = r.player
      setPlayer((prev) => cancelWaits(prev).player)
      r.ids.forEach((id) => addLog(`${why} ${courseTitle(id)} 수업 대기가 끊겼다.`))
    },
    [addLog],
  )

  const interruptAll = useCallback(
    (why, at) => {
      endTraining(why, at)
      endRest(why)
      endWaits(why)
    },
    [endTraining, endRest, endWaits],
  )

  // 수련 중에 다른 곳으로 가거나 다른 동작을 하려 하면 먼저 경고하고, 확인해야 진행한다.
  const [confirmQuit, setConfirmQuit] = useState(null) // { run }
  const guardTraining = (run) => {
    const cur = playerRef.current
    if (cur.training) setConfirmQuit({ run, kind: 'train' })
    else if (cur.resting) setConfirmQuit({ run, kind: 'rest' })
    else run()
  }

  const moveTo = (id) => {
    if (id === locationId) return
    guardTraining(() => doMove(id))
  }

  const doMove = (id) => {
    interruptAll('다른 곳으로 이동해')
    setActivity('intro') // 들어서면 묘사부터
    setLocationId(id)
    const nm = LOCATIONS[id].name
    const last = nm.charCodeAt(nm.length - 1) - 0xac00
    const jong = last >= 0 && last % 28
    addLog(`${nm}${!jong || jong === 8 ? '로' : '으로'} 이동했다.`)
  }

  const closeCourse = () => setCourse(null)

  const saveProfile = (v) => {
    setPlayer((prev) => ({ ...prev, name: v.name, age: v.age, grade: v.grade, avatar: v.avatar }))
    setProfileOpen(false)
    addLog('프로필을 고쳤다.')
  }

  const upgradeStat = (key) => {
    const current = player.stats[key]
    const cost = current * STAT_UPGRADE_COST_PER_POINT
    if (player.spirit < cost) return
    setPlayer((prev) => {
      if (prev.spirit < cost || prev.stats[key] !== current) return prev
      return {
        ...prev,
        spirit: prev.spirit - cost,
        stats: { ...prev.stats, [key]: current + 1 },
      }
    })
    addLog(`${STAT_META[key].label}이(가) ${current} → ${current + 1}로 올랐다. (영력 -${cost})`)
  }

  // ───────── 수업 ─────────
  const lessonActions = useMemo(
    () => ({
      // 판을 시작할 때 오늘의 시도 1회를 쓴다. 쓸 수 없으면 false.
      spendAttempt: (id) => {
        interruptAll('새 동작을 시작해')
        const next = spendAttempt(playerRef.current, id)
        if (!next) return false
        playerRef.current = next
        setPlayer((prev) => spendAttempt(prev, id) ?? prev)
        return true
      },
      complete: (id) => {
        const r = completeLesson(playerRef.current, id)
        if (!r.logs.length) return
        playerRef.current = r.player
        setPlayer((prev) => completeLesson(prev, id).player)
        r.logs.forEach(addLog)
      },
      wait: (id) => {
        interruptAll('새 동작을 시작해')
        const next = startWait(playerRef.current, id)
        if (!next) return
        playerRef.current = next
        setPlayer((prev) => startWait(prev, id) ?? prev)
        addLog(`${courseTitle(id)}: 수업을 기다리기 시작했다. (${LESSON_WAIT_MINUTES}분)`)
      },
      pickStat: (key) => {
        const next = pickFortuneStat(playerRef.current, key)
        if (!next) return
        playerRef.current = next
        setPlayer((prev) => pickFortuneStat(prev, key) ?? prev)
        addLog(`점복학 보너스: ${STAT_META[key].label}이(가) 1 올랐다.`)
      },
    }),
    [addLog, interruptAll],
  )

  // ───────── 매점 · 아이템 ─────────
  const buyItem = useCallback(
    (id) => {
      const item = itemOf(id)
      const cur = playerRef.current
      if (!item || cur.money < item.price) return
      const next = { ...cur, money: cur.money - item.price, inventory: { ...cur.inventory, [id]: (cur.inventory?.[id] || 0) + 1 } }
      playerRef.current = next
      setPlayer(next)
      addLog(`매점에서 ${item.name}을(를) 샀다. (-${item.price}냥)`)
    },
    [addLog],
  )

  const giveItem = useCallback((id, n = 1) => {
    const cur = playerRef.current
    const next = { ...cur, inventory: { ...cur.inventory, [id]: (cur.inventory?.[id] || 0) + n } }
    playerRef.current = next
    setPlayer(next)
  }, [])

  // ───────── 선물 ─────────
  const itemList = (items) =>
    Object.entries(items)
      .map(([id, n]) => `${itemOf(id)?.name ?? id}${n > 1 ? ` ×${n}` : ''}`)
      .join(', ')

  // 받은 선물은 곧바로 소지품에 들어온다.
  useEffect(
    () =>
      onGift((gift) => {
        const cur = playerRef.current
        const inv = { ...(cur.inventory ?? {}) }
        for (const [id, n] of Object.entries(gift.items)) if (itemOf(id)) inv[id] = (inv[id] || 0) + n
        const next = { ...cur, inventory: inv }
        playerRef.current = next
        setPlayer(next)
        addLog(`${gift.from.name}님에게 선물을 받았다: ${itemList(gift.items)}`)
        notify(`${gift.from.name}님이 선물을 보냈다: ${itemList(gift.items)}`)
      }),
    [addLog],
  )

  const sendGiftTo = useCallback(
    async (target, items) => {
      const cur = playerRef.current
      for (const [id, n] of Object.entries(items)) if ((cur.inventory?.[id] || 0) < n) return { ok: false, message: '갖고 있는 개수가 모자라다.' }
      const r = await sendGift(target.id, items)
      if (!r.ok) {
        const msg = r.error === 'no-target' || r.status === 409 ? '상대가 접속 중이 아니다.' : r.error === 'slow-down' ? '너무 빨리 보내고 있다.' : '선물을 보내지 못했다.'
        return { ok: false, message: msg }
      }
      const now = playerRef.current
      const inv = { ...now.inventory }
      for (const [id, n] of Object.entries(items)) {
        inv[id] = (inv[id] || 0) - n
        if (inv[id] <= 0) delete inv[id]
      }
      const next = { ...now, inventory: inv }
      playerRef.current = next
      setPlayer(next)
      addLog(`${target.name}님에게 선물을 건넸다: ${itemList(items)}`)
      return { ok: true }
    },
    [addLog],
  )

  // 전투 중에도 턴·상황과 상관없이 쓸 수 있고, 써도 내 턴이 끝나지 않는다. (전투 중 사용 가능한 아이템만)
  const useItem = useCallback(
    (id) => {
      const item = itemOf(id)
      const cur = playerRef.current
      if (!item) return
      const ok = canUseItem(item, { inBattle: battleRef.current, countNow: cur.inventory?.[id] || 0, reviveOn: reviveRef.current })
      if (!ok.ok) return
      const e = item.effect
      const next = {
        ...cur,
        inventory: { ...cur.inventory, [id]: cur.inventory[id] - 1 },
        hp: e.hp ? Math.min(cur.hpMax, cur.hp + e.hp) : cur.hp,
        mp: e.mp ? Math.min(cur.mpMax, cur.mp + e.mp) : cur.mp,
      }
      playerRef.current = next
      setPlayer(next)
      if (e.revive) {
        reviveRef.current = true
        setReviveOn(true)
      }
      setItemsUsed((n) => n + 1)
      addLog(`${item.name}을(를) 사용했다. (${e.revive ? '전투불능 시 1회 부활 대기' : item.effectText})`)
    },
    [addLog],
  )

  const startBattle = useCallback(
    (enemyId) => {
      interruptAll('새 동작을 시작해')
      const cur = playerRef.current
      const next = { ...cur, seen: { ...cur.seen, [enemyId]: (cur.seen?.[enemyId] || 0) + 1 } }
      playerRef.current = next
      setPlayer(next)
    },
    [interruptAll],
  )

  const changeHp = useCallback((value) => {
    const cur = playerRef.current
    const hp = Math.max(1, Math.min(cur.hpMax, Math.ceil(value)))
    if (hp === Math.floor(cur.hp)) return
    const next = { ...cur, hp }
    playerRef.current = next
    setPlayer(next)
  }, [])

  const seeSpecial = useCallback((enemyId) => {
    const cur = playerRef.current
    if (cur.specials?.[enemyId]) return
    const next = { ...cur, specials: { ...cur.specials, [enemyId]: true } }
    playerRef.current = next
    setPlayer(next)
  }, [])

  // 전투 교육 과정을 마치면 체력과 의지력이 모두 회복된다.
  const tutorialDone = useCallback(() => {
    const cur = playerRef.current
    const next = { ...cur, hp: cur.hpMax, mp: cur.mpMax, tutorialDone: true }
    playerRef.current = next
    setPlayer(next)
    addLog('전투 교육 과정을 마쳤다. 바리가 체력과 의지력을 모두 채워 주었다.')
  }, [addLog])

  const changeMp = useCallback((delta) => {
    const cur = playerRef.current
    const next = { ...cur, mp: Math.max(0, Math.min(cur.mpMax, cur.mp + delta)) }
    playerRef.current = next
    setPlayer(next)
  }, [])

  const finishBattle = useCallback(
    ({ win, enemy }) => {
      const r = applyBattleResult(playerRef.current, win, enemy.reward)
      playerRef.current = r.player
      setPlayer(r.player)
      if (win) {
        addLog(
          r.granted
            ? `퇴마 실습: ${enemy.name}을(를) 쓰러뜨렸다! 영력 +${r.granted}.`
            : `퇴마 실습: ${enemy.name}을(를) 쓰러뜨렸다. (오늘의 보상은 모두 받았다)`,
        )
      } else {
        addLog(`퇴마 실습: ${enemy.name}에게 패했다.${r.lost ? ` 영력 -${r.lost}.` : ''}`)
      }
    },
    [addLog],
  )

  const investigate = useCallback(
    (floor, area, text) => {
      interruptAll('새 동작을 시작해')
      addLog(`본관 탐사 · ${floor} ${area}: ${text}`)
    },
    [addLog, interruptAll],
  )

  const exploreShrine = () => {
    interruptAll('새 동작을 시작해')
    addLog('사당 아래로 한 걸음을 내디뎠다. 귀문의 공기가 뼈를 적신다. (탐사 모듈 준비 중)')
  }

  const latestLog = logs[0]
  const unreadLog = panel !== 'log' && latestLog && latestLog.id !== seenLog
  const selectPanel = (id) => {
    setPanel(id)
    if (id === 'log') setSeenLog(latestLog?.id ?? null)
  }
  useEffect(() => {
    if (desktop && panel === 'log') setPanel('world')
  }, [desktop, panel])
  useEffect(() => {
    if (panel === 'log') setSeenLog(latestLog?.id ?? null)
  }, [panel, latestLog?.id])

  return (
    <div
      className="stage-bg flex h-full min-h-0 flex-col gap-3 overflow-auto p-3 pb-24 text-paper lg:flex-row lg:overflow-hidden lg:pb-3"
      data-spirit={player.spirit.toFixed(3)}
    >
      <ProfileSidebar
        player={player}
        locationId={locationId}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        userId={userId}
        twitter={twitter}
        onOpenItems={() => setInvOpen(true)}
        onEditProfile={() => setProfileOpen(true)}
        spotItems={spotItems}
      />

      <div className="order-3 flex min-w-0 flex-1 flex-col gap-3 lg:order-2 lg:min-h-0">
        <ActivityBar
          panel={panel}
          locationId={locationId}
          onMove={moveTo}
          activity={activity}
          logs={logs}
          onSelect={(id, action) => {
            if (action) return
            // 진행 중인 수련·대기를 보여 주는 화면(기숙사의 휴식·수련, 본관의 수업)으로 들어가는 건 '새 동작'이 아니다.
            const viewsRunning =
              (locationId === 'dorm' && id === 'rest' && !!playerRef.current.training) ||
              (locationId === 'infirmary' && id === 'rest' && !!playerRef.current.resting) ||
              (locationId === 'mainHall' && id === 'class')
            if (id === activity) return
            if (viewsRunning) return setActivity(id)
            guardTraining(() => {
              interruptAll('다른 활동으로 옮겨')
              setActivity(id)
            })
          }}
        />
        <main className="ink-panel flex min-h-[16rem] min-w-0 flex-1 lg:min-h-0 flex-col overflow-hidden rounded-2xl" aria-label="활동 화면">
          <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6" key={`${locationId}-${activity}`}>
            {(
              <>
                {locationId === 'mainHall' && <MainHall player={player} view={activity} onOpenCourse={setCourse} onInvestigate={investigate} onEnter={moveTo} />}
                {locationId === 'infirmary' && (
                  <Infirmary
                    view={activity}
                    player={player}
                    onStartRest={beginRest}
                    onStopRest={() => guardTraining(() => endRest('스스로 멈춰'))}
                  />
                )}
                {locationId === 'annex' && <Annex view={activity} />}
                {locationId === 'dorm' && activity === 'store' && <Store player={player} onBuy={buyItem} />}
                {locationId === 'dorm' && activity !== 'store' && (
                  <Dormitory
                    view={activity}
                    control={player.stats.control}
                    spiritRate={spiritRate}
                    training={player.training ?? null}
                    onStartTraining={beginTraining}
                    onStopTraining={() => guardTraining(() => endTraining('스스로 멈춰'))}
                  />
                )}
                {locationId === 'gym' && (
                  <Gym
                    view={activity}
                    stats={player.stats}
                    mp={player.mp}
                    hp={player.hp}
                    hpMax={player.hpMax}
                    onHp={changeHp}
                    seen={player.seen}
                    rewardLeft={Math.max(0, GYM_DAILY_REWARDS - gymToday(player).wins)}
                    onStart={startBattle}
                    onMp={changeMp}
                    onFinish={finishBattle}
                    specials={player.specials}
                    tutorialDone={!!player.tutorialDone}
                    onSpecialSeen={seeSpecial}
                    onTutorialStart={() => interruptAll('새 동작을 시작해')}
                    onTutorialDone={tutorialDone}
                    reviveOn={reviveOn}
                    onReviveUsed={() => {
                      reviveRef.current = false
                      setReviveOn(false)
                    }}
                    onActive={(on) => {
                      setBattleActive(on)
                      battleRef.current = on
                      if (!on) {
                        reviveRef.current = false
                        setReviveOn(false)
                      }
                    }}
                    itemsUsed={itemsUsed}
                    onSpotItems={setSpotItems}
                    onOpenItems={() => setInvOpen(true)}
                    onGiveItem={giveItem}
                  />
                )}
                {locationId === 'shrine' && (
                  <Shrine view={activity} insight={player.stats.insight} onExplore={exploreShrine} />
                )}
              </>
            )}
          </div>
          {!desktop && panel !== 'log' && latestLog && (
            <button
              type="button"
              data-sfx="none"
              onClick={() => selectPanel('log')}
              className="flex shrink-0 items-center gap-2 border-t border-edge/15 bg-shade/25 px-4 py-2 text-left font-mono text-[11px] text-paper/70 hover:text-paper"
              title="활동 로그 열기"
            >
              <span className="text-gold/70">[{latestLog.time}]</span>
              <span className="truncate">{latestLog.message}</span>
            </button>
          )}
        </main>
        <StatusPanel player={player} onUpgrade={upgradeStat} />
      </div>

      <div className="order-2 flex shrink-0 flex-col gap-3 lg:order-3 lg:min-h-0 lg:w-80">
        <MenuPanel current={panel} onSelect={selectPanel} unreadLog={!!unreadLog} hideLog={desktop} />
        {desktop && <ChatPanel docked logs={logs} onGift={setGiftTo} />}
      </div>

      <GameModal
        course={course}
        onClose={closeCourse}
        playerKey={userId}
        playerName={player.name}
        stats={player.stats}
        lesson={course ? lessonOf(player, course.id) : null}
        actions={lessonActions}
      />
      {confirmQuit && (
        <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4">
          <div role="alertdialog" aria-modal="true" aria-label={confirmQuit.kind === 'rest' ? '휴식 종료 확인' : '수련 포기 확인'} className="ink-panel w-full max-w-sm rounded-2xl p-5 text-center">
            {confirmQuit.kind === 'rest' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 휴식 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">그때까지 회복된 만큼은 그대로 남습니다.</p>
              </>
            ) : (
              <>
                <p className="font-serif text-lg text-gold">현재 수련 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">보상을 포기할까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">수련은 끝까지 마쳐야 영력이 들어옵니다.</p>
              </>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const run = confirmQuit.run
                  setConfirmQuit(null)
                  run()
                }}
                className="flat-btn justify-center !bg-crimson"
              >
                {confirmQuit.kind === 'rest' ? '나간다' : '포기한다'}
              </button>
              <button type="button" onClick={() => setConfirmQuit(null)} className="flat-btn justify-center">
                {confirmQuit.kind === 'rest' ? '계속 쉬기' : '계속 수련'}
              </button>
            </div>
          </div>
        </div>
      )}
      {profileOpen && <ProfileEditModal player={player} onSave={saveProfile} onClose={() => setProfileOpen(false)} />}
      {giftTo && <GiftModal target={giftTo} player={player} onSend={sendGiftTo} onClose={() => setGiftTo(null)} />}
      {invOpen && (
        <InventoryModal player={player} inBattle={battleActive} reviveOn={reviveOn} onUse={useItem} onClose={() => setInvOpen(false)} />
      )}
      {!desktop && <ChatPanel onGift={setGiftTo} />}
    </div>
  )
}
