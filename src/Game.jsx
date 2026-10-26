import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPlayer, gradeOf } from './game/character'
import ChatPanel from './components/ChatPanel'
import GlobalBoardGames from './components/GlobalBoardGames'
import InventoryModal from './components/InventoryModal'
import CodexToast from './components/CodexToast'
import ProfileCardModal from './components/ProfileCardModal'
import { codexKnown } from './game/codex'
import Store from './components/locations/Store'
import Cafeteria from './components/locations/Cafeteria'
import { START_MONEY, WEAPONS, canUseItem, dropEnh, enhanceWeapon, giftEnhOf, giveWeapon, mergeEnh, migrateWeapons, equipItem, equipOf, isStoreOpen, itemOf, unequipSlot, weaponFx } from './game/items'
import TutorialGearPicker from './components/TutorialGearPicker'
import { bgm } from './game/bgm'
import GameModal from './components/GameModal'
import ActivityBar from './components/ActivityBar'
import MenuPanel from './components/MenuPanel'
import MailboxPanel from './components/MailboxPanel'
import EditConsent from './components/EditConsent'
import ProfileEditModal from './components/ProfileEditModal'
import GiftModal from './components/GiftModal'
import CodexModal from './components/CodexModal'
import CodexEntryModal from './components/CodexEntryModal'
import BringPicker from './components/BringPicker'
import { ACHIEVEMENTS, rewardText } from './game/achievements'
import { cancelCraft, recipeOf, startCraft, buyRecipe as buyRecipeAt } from './game/crafting'
import { cook } from './game/cooking'
import Intro from './components/Intro'
import AdminPanel from './components/AdminPanel'
import ProfileSwitchModal from './components/ProfileSwitchModal'
import ProfileSidebar from './components/ProfileSidebar'
import StatusPanel from './components/StatusPanel'
import Annex from './components/locations/Annex'
import { playHoljjak as playHoljjakGame } from './game/holjjak'
import Dormitory from './components/locations/Dormitory'
import Gym from './components/locations/Gym'
import Infirmary from './components/locations/Infirmary'
import MainHall from './components/locations/MainHall'
import Shrine from './components/locations/Shrine'
import { markLineSeen } from './game/npcLines'
import { deposit, withdraw } from './game/locker'
import {
  LOCATIONS,
  STAT_META,
  STAT_MAX,
  STAT_UPGRADE_COST_PER_POINT,
  COURSES,
} from './game/constants'
import { LESSON_WAIT_MINUTES } from './game/courseInfo'
import { ENEMIES } from './game/battle'
import { SKINS, isSkinOpen } from './game/skins2048'
import { SKINS_RUNNER, isRunnerSkinOpen } from './game/skinsRunner'
import { bumpWeekly, markWeeklySet, markDaily, claimQuest, claimMetaQuest, claimDailyQuest, claimDailyMeta, setExploreAreaSpots } from './game/clubQuests'
import { GATHER_MINUTES } from './game/gather'
import { HUNT_MINUTES } from './game/hunt'
import { travelMinutes } from './game/travel'
import TravelPanel from './components/TravelPanel'
import { HIKE_SPOT_IDS } from './game/hike'
import { FLOORS as MAINHALL_FLOORS } from './game/explore'
import { ANNEX_FLOORS } from './game/annex'
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
  startSleep,
  markNpc,
  syncCodex,
  REST_KINDS,
  acquirePsychic,
  grantSkin,
  effectiveStats,
  isWeak,
  weakLeftText,
  startSlowFight,
  cancelSlowFight,
  slowFightMinutes,
  startGather,
  cancelGather,
  startHunt,
  cancelHunt,
  dayKey,
} from './game/progress'
import { connect, disconnect, mbAct, mbCancel, mbClose, mbItem, mbRespond, mbStart, mbSurvive, sendCard, sendPartyStats, marketBuy, marketCancel, marketClaim, marketList, notify, onGift, onMarketSold, sendGift, useOnline, applyClub, fetchClubMembers, fetchRanking } from './net/online'
import ClubModal from './components/ClubModal'
import GuideModal from './components/GuideModal'
import UpdateNotesModal from './components/UpdateNotesModal'
import Market from './components/Market'

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

// 동아리 '본관·별관·산의 모든 장소를 탐사하기' 퀘스트가 확인할 전체 목록을 한 번 등록해 둔다.
setExploreAreaSpots({
  mainHall: MAINHALL_FLOORS.flatMap((f) => f.areas.flatMap((a) => [`mainHall:${f.id}:${a.id}`, ...(a.details ?? []).map((d) => `mainHall:${f.id}:${d.id}`)])),
  annex: ANNEX_FLOORS.flatMap((f) => f.rooms.map((r) => `annex:${f.id}:${r.id}`)),
  gym: HIKE_SPOT_IDS,
})

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
  joinedAt,
  admin = false,
  adminKey = '',
  onProfileAction,
}) {
  const restored = initialSave?.player

  const [player, setPlayer] = useState(() => (restored ? sanitizeRestored(restored, joinedAt, admin) : syncCodex(createPlayer(character))))
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
  const [cardTo, setCardTo] = useState(null) // 인적사항 카드로 보는 사람 { id, name }
  const [codexOpen, setCodexOpen] = useState(false)
  const [codexFocus, setCodexFocus] = useState(null) // { chapterId, id }: 알림에서 바로 보여줄 항목 하나
  const [clubOpen, setClubOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  // 도감이 새로 채워지면(처음 한 번씩) 알림을 띄운다. 전투 교육 중에는 끝난 뒤에 모아서 보여 준다.
  const [codexNew, setCodexNew] = useState([])
  const codexSeen = useRef(null)
  useEffect(() => {
    if (player.tutorialSnap) return
    const now = codexKnown(player)
    if (codexSeen.current == null) {
      codexSeen.current = now
      return
    }
    const fresh = Object.keys(now).filter((k) => !codexSeen.current[k])
    if (!fresh.length) return
    codexSeen.current = now
    setCodexNew((prev) => [...prev, ...fresh.map((k) => ({ key: k, ...now[k] }))])
  }, [player])
  const [adminOpen, setAdminOpen] = useState(false)
  const [updateNotesOpen, setUpdateNotesOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [introReplay, setIntroReplay] = useState(false)
  const [battleActive, setBattleActive] = useState(false)
  const [bgmBattle, setBgmBattle] = useState(false) // 전투 교육 과정에서도 전투 BGM
  // 전투에 들어가면 전투 BGM, 끝나면 평소 BGM
  useEffect(() => {
    bgm.setTrack(battleActive ? 'battle' : 'main')
  }, [battleActive])
  const [reviveOn, setReviveOn] = useState(false)
  const [boostOn, setBoostOn] = useState(false)
  const boostRef = useRef(false)
  boostRef.current = boostOn
  const [itemsUsed, setItemsUsed] = useState(0)
  const [battleUsedItems, setBattleUsedItems] = useState([]) // 지금 전투(1인) 중 사용한 아이템 종류 — [형상 기억]이 재활용 후보로 쓴다
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
  // [쇠약] 중에는 모든 육조 스탯이 5할. 화면과 전투·탐사에는 effStats 를 쓰고, 강화 비용·저장은 원래 스탯 기준.
  // 장비 보정(무복 등)도 여기서 더해진다.
  const effStats = useMemo(() => effectiveStats(playerRef.current), [player.stats, player.equip, player.enh, player.weakUntil, player.buffs])
  const viewPlayer = useMemo(() => (effStats === player.stats ? player : { ...player, stats: effStats }), [player, effStats])

  // 배경음악은 신입생 등록을 마치고 게임 화면에 들어선 뒤부터 흐른다.
  useEffect(() => {
    bgm.start()
    return () => {
      bgm.setTrack('main')
      bgm.stop()
    }
  }, [])

  // 온라인 서버(채팅 · 파티 · 랭킹)에 접속한다. 서버가 없으면 조용히 오프라인으로 남는다.
  useEffect(() => {
    connect(userId, player.name, admin ? adminKey : '')
    return () => disconnect()
  }, [userId, player.name, admin, adminKey])

  // [나는야 모범생]: 어느 수업이건 지난주 3위 안으로 다음 주를 맞았는지 확인한다. 접속 직후와 그 뒤 주기적으로 들여다본다.
  useEffect(() => {
    if (admin || !userId) return undefined
    const check = async () => {
      if (playerRef.current.achievements?.['model-student']) return
      for (const c of COURSES) {
        if (c.id === 'divination-fortune') continue // 점복학은 랭킹/점수 제도가 없다
        const r = await fetchRanking(c.id, userId, 'last')
        if (r?.top?.slice(0, 3).some((x) => x.id === userId)) {
          const cur = playerRef.current
          if (cur.achievements?.['model-student'] || cur.weeklyTop1At) return
          const next = { ...cur, weeklyTop1At: Date.now() }
          playerRef.current = next
          setPlayer(next)
          return
        }
      }
    }
    check()
    const t = setInterval(check, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [userId, admin])

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
      let nextPlayer = r.player
      // 이동(건물이 바뀌는 여정)이 끝났으면 실제로 그 구역에 들어선다.
      const trv = nextPlayer.traveling
      if (trv && now >= trv.startedAt + trv.minutes * 60000) {
        const { traveling: _t, ...rest } = nextPlayer
        nextPlayer = rest
        setActivity('intro')
        setLocationId(trv.toId)
        addLog(`${LOCATIONS[trv.toId].name}에 도착했다.`)
      }
      playerRef.current = nextPlayer
      setPlayer(nextPlayer)
      r.logs.forEach(addLog)
      if (r.unlocked?.length) setAchPopupQueue((q) => [...q, ...r.unlocked])
    }
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [addLog])

  // 프로필을 고치면 저장되는 character 도 같이 바뀐다.
  const charOut = useMemo(
    () => ({ ...character, name: player.name, greeting: player.greeting ?? '', age: player.age, grade: player.grade ?? null, avatar: player.avatar }),
    [character, player.name, player.greeting, player.age, player.grade, player.avatar],
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

  /** 휴식을 끊는다. 끝까지 쉬지 못했으니 회복은 없다. */
  const endRest = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.resting) return
      playerRef.current = { ...cur, resting: null }
      setPlayer((prev) => (prev.resting ? { ...prev, resting: null } : prev))
      addLog(`${why} 휴식을 그만뒀다. (회복 없음)`)
    },
    [addLog],
  )

  const beginSleep = () => {
    if (playerRef.current.sleeping) return
    endWaits('새 동작을 시작해')
    const next = startSleep(playerRef.current)
    playerRef.current = next
    setPlayer((prev) => (prev.sleeping ? prev : startSleep(prev)))
    addLog('기숙사에서 잠들었다. (6시간 · 일어나면 체력과 의지력이 가득 찬다)')
  }

  /** 자다가 일어난다. 끝까지 자지 못했으니 회복은 없다. */
  const endSleep = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.sleeping) return
      playerRef.current = { ...cur, sleeping: null }
      setPlayer((prev) => (prev.sleeping ? { ...prev, sleeping: null } : prev))
      addLog(`${why} 일어났다. (회복 없음)`)
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

  /** 제작 대기를 끊는다. 재료도 완성품도 돌아오지 않는다. */
  const endCraft = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.crafting) return
      playerRef.current = cancelCraft(cur)
      setPlayer((prev) => (prev.crafting ? cancelCraft(prev) : prev))
      addLog(`${why} 제작을 멈췄다. (재료도 완성품도 돌아오지 않는다)`)
    },
    [addLog],
  )

  /** 느린 싸움(퇴마 실습) 대기를 끊는다. 보상 없이 취소된다. */
  const endSlowFight = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.slowFight) return
      playerRef.current = cancelSlowFight(cur)
      setPlayer((prev) => (prev.slowFight ? cancelSlowFight(prev) : prev))
      addLog(`${why} 느린 싸움을 멈췄다. (보상을 받지 못한다)`)
    },
    [addLog],
  )

  /** 채집 대기를 끊는다. 아무것도 받지 못하고 취소된다. */
  const endGather = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.gathering) return
      playerRef.current = cancelGather(cur)
      setPlayer((prev) => (prev.gathering ? cancelGather(prev) : prev))
      addLog(`${why} 채집을 멈췄다. (아무것도 얻지 못한다)`)
    },
    [addLog],
  )

  /** 수렵 대기를 끊는다. 아무것도 받지 못하고 취소된다. */
  const endHunt = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.hunting) return
      playerRef.current = cancelHunt(cur)
      setPlayer((prev) => (prev.hunting ? cancelHunt(prev) : prev))
      addLog(`${why} 수렵을 멈췄다. (아무것도 얻지 못한다)`)
    },
    [addLog],
  )

  /** 이동(건물이 바뀌는 여정)을 중간에 끊는다. 도착하지 못하고 제자리로 남는다. */
  const endTravel = useCallback(
    (why) => {
      const cur = playerRef.current
      if (!cur.traveling) return
      const { traveling: _t, ...rest } = cur
      playerRef.current = rest
      setPlayer((prev) => {
        if (!prev.traveling) return prev
        const { traveling: _t2, ...r2 } = prev
        return r2
      })
      addLog(`${why} 이동을 멈췄다.`)
    },
    [addLog],
  )

  const interruptAll = useCallback(
    (why, at) => {
      endTraining(why, at)
      endRest(why)
      endSleep(why)
      endWaits(why)
      endCraft(why)
      endSlowFight(why)
      endGather(why)
      endHunt(why)
      endTravel(why)
    },
    [endTraining, endRest, endSleep, endWaits, endCraft, endSlowFight, endGather, endHunt, endTravel],
  )

  // 수련·제작 등 '대기 활동' 중에 다른 곳으로 가거나 다른 동작을 하려 하면 먼저 경고하고, 확인해야 진행한다.
  // 앞으로 새로 생기는 대기 활동도 여기 한 줄만 추가하면 같은 확인 절차를 따르게 된다.
  const [confirmQuit, setConfirmQuit] = useState(null) // { run }
  const [achPopupQueue, setAchPopupQueue] = useState([]) // 새로 달성한 업적들. 하나씩 팝업으로 보여준다.
  const guardTraining = (run) => {
    const cur = playerRef.current
    if (cur.training) setConfirmQuit({ run, kind: 'train' })
    else if (cur.sleeping) setConfirmQuit({ run, kind: 'sleep' })
    else if (cur.resting) setConfirmQuit({ run, kind: 'rest' })
    else if (Object.values(cur.lessons ?? {}).some((l) => l.waitUntil)) setConfirmQuit({ run, kind: 'wait' })
    else if (cur.crafting) setConfirmQuit({ run, kind: 'craft' })
    else if (cur.slowFight) setConfirmQuit({ run, kind: 'slowFight' })
    else if (cur.gathering) setConfirmQuit({ run, kind: 'gathering' })
    else if (cur.hunting) setConfirmQuit({ run, kind: 'hunting' })
    else if (cur.traveling) setConfirmQuit({ run, kind: 'travel' })
    else run()
  }

  const [travelConfirm, setTravelConfirm] = useState(null) // { toId, minutes }
  const moveTo = (id) => {
    if (id === locationId) return
    guardTraining(() => {
      const minutes = travelMinutes(locationId, id)
      if (minutes > 0) setTravelConfirm({ toId: id, minutes })
      else doMove(id)
    })
  }
  const confirmTravel = () => {
    const t = travelConfirm
    if (!t) return
    setTravelConfirm(null)
    interruptAll('새 이동을 시작해')
    const next = { ...playerRef.current, traveling: { toId: t.toId, startedAt: Date.now(), minutes: t.minutes } }
    playerRef.current = next
    setPlayer(next)
    addLog(`${LOCATIONS[t.toId].name}(으)로 이동을 시작했다. (${t.minutes}분)`)
  }

  // 빠른 이동: 이동 중일 때만 쓸 수 있다(휴식·수업 대기 등 다른 대기에는 없다). 이동 시간의 절반만큼 의지력을 써서 곧장 도착한다.
  const fastTravelCost = (minutes) => Math.ceil(minutes / 2)
  const fastTravel = () => {
    const cur = playerRef.current
    const trv = cur.traveling
    if (!trv) return
    const cost = fastTravelCost(trv.minutes)
    if (cur.mp < cost) return
    const { traveling: _t, ...rest } = cur
    const next = { ...rest, mp: cur.mp - cost }
    playerRef.current = next
    setPlayer(next)
    setActivity('intro')
    setLocationId(trv.toId)
    addLog(`의지력 ${cost}을 써서 ${LOCATIONS[trv.toId].name}에 곧장 이동했다.`)
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
  const setSkin2048 = useCallback(
    (id) => {
      const cur = playerRef.current
      const k = SKINS.find((x) => x.id === id)
      if (!k || !isSkinOpen(k, cur, admin)) return
      const next = { ...cur, skin2048: id }
      playerRef.current = next
      setPlayer(next)
    },
    [admin],
  )
  const setSkinRunner = useCallback(
    (id) => {
      const cur = playerRef.current
      const k = SKINS_RUNNER.find((x) => x.id === id)
      if (!k || !isRunnerSkinOpen(k, cur, admin)) return
      const next = { ...cur, skinRunner: id }
      playerRef.current = next
      setPlayer(next)
    },
    [admin],
  )

  const saveProfile = (v) => {
    setPlayer((prev) => ({ ...prev, name: v.name, greeting: v.greeting ?? '', age: v.age, grade: v.grade, avatar: v.avatar, profileEdited: true }))
    setProfileOpen(false)
    addLog('프로필을 고쳤다.')
  }

  // 동아리 주간 활동: 달성한 퀘스트의 보상을 직접 받는다.
  const claimClubQuest = (questId) => {
    const r = claimQuest(playerRef.current, questId)
    if (!r.ok) return
    playerRef.current = r.player
    setPlayer(r.player)
    if (r.log) addLog(r.log)
  }
  const claimClubMeta = (questId) => {
    const r = claimMetaQuest(playerRef.current, questId)
    if (!r.ok) return
    playerRef.current = r.player
    setPlayer(r.player)
    if (r.log) addLog(r.log)
  }
  // 오늘의 동아리 활동(일일 퀘스트): 달성한 퀘스트의 보상을 직접 받는다.
  const claimDaily = (questId) => {
    const r = claimDailyQuest(playerRef.current, questId)
    if (!r.ok) return
    playerRef.current = r.player
    setPlayer(r.player)
    if (r.log) addLog(r.log)
  }
  const claimDailyAll = () => {
    const r = claimDailyMeta(playerRef.current)
    if (!r.ok) return
    playerRef.current = r.player
    setPlayer(r.player)
    if (r.log) addLog(r.log)
  }

  const upgradeStat = (key) => {
    const current = player.stats[key]
    const cost = current * STAT_UPGRADE_COST_PER_POINT
    if (current >= STAT_MAX || player.spirit < cost) return
    setPlayer((prev) => {
      if (prev.spirit < cost || prev.stats[key] !== current || current >= STAT_MAX) return prev
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
    (id, qty = 1) => {
      const item = itemOf(id)
      const cur = playerRef.current
      const n = Math.max(1, Math.min(99, Math.floor(qty)))
      if (!item || item.price == null || (!admin && cur.money < item.price * n) || !isStoreOpen()) return
      const cost = item.price * n
      const next = bumpWeekly({ ...cur, money: admin ? cur.money : cur.money - cost, inventory: { ...cur.inventory, [id]: (cur.inventory?.[id] || 0) + n } }, 'shopBuy')
      playerRef.current = next
      setPlayer(next)
      addLog(`매점에서 ${item.name} ${n}개를 샀다. (${admin ? '관리자: 무료' : `-${cost}냥`})`)
    },
    [addLog, admin],
  )

  // 매점 · 제작법 구매
  const buyRecipe = useCallback(
    (recipeId) => {
      const cur = playerRef.current
      if (!isStoreOpen()) return
      const r = buyRecipeAt(cur, recipeId, admin)
      if (r.error) return addLog(r.error)
      const next = bumpWeekly(r.player, 'shopBuy')
      playerRef.current = next
      setPlayer(next)
      addLog(`매점에서 [${itemOf(r.recipe.result)?.name ?? r.recipe.result}] 제작법을 익혔다. (${admin ? '관리자: 무료' : `-${r.recipe.price}냥`})`)
    },
    [addLog, admin],
  )

  // 도감: 처음 만난 NPC 를 기록한다.
  const meetNpc = useCallback((id) => {
    const next = markNpc(playerRef.current, id)
    if (next === playerRef.current) return
    playerRef.current = next
    setPlayer((prev) => markNpc(prev, id))
  }, [])

  // 특수 상황 대사: 그 조건으로 처음 본 대사를 기록한다. (이후엔 평소 대사와 섞여 랜덤)
  const lineSeen = useCallback((npcId, cond) => {
    const next = markLineSeen(playerRef.current, npcId, cond)
    if (next === playerRef.current) return
    playerRef.current = next
    setPlayer((prev) => markLineSeen(prev, npcId, cond))
  }, [])

  const giveItem = useCallback((id, n = 1) => {
    const cur = playerRef.current
    const next = { ...cur, inventory: { ...cur.inventory, [id]: (cur.inventory?.[id] || 0) + n } }
    playerRef.current = next
    setPlayer(next)
  }, [])

  // ───────── 벼룩시장 ─────────
  const online = useOnline()
  // 관리자가 관리자 모드에서 등록한 배경음악(평소 곡) 재생목록이 바뀌면 반영한다. (비어 있으면 로컬 mp3)
  useEffect(() => {
    bgm.setPlaylist(online.bgmPlaylist ?? [])
  }, [online.bgmPlaylist])
  // 내 인적사항 카드를 서버에 올려 둔다. (접속할 때, 프로필을 바꿀 때)
  useEffect(() => {
    if (online.status !== 'online') return undefined
    const t = setTimeout(() => {
      // 프로필을 고친 적이 없으면 최초 입학 때의 인적사항이 보인다.
      const src = player.profileEdited || !player.profile0 ? player : player.profile0
      sendCard({ name: src.name, greeting: src.greeting ?? '', age: src.age, grade: gradeOf(src), avatar: src.avatar })
    }, 500)
    return () => clearTimeout(t)
  }, [online.status, player.name, player.greeting, player.age, player.grade, player.avatar, player.profileEdited, player.profile0])
  const claimProceeds = useCallback(async () => {
    const r = await marketClaim()
    if (!r.ok || !r.amount) return
    const cur = playerRef.current
    const next = { ...cur, money: cur.money + r.amount }
    playerRef.current = next
    setPlayer(next)
    addLog(`벼룩시장에서 물건이 팔렸다. (+${r.amount}냥)`)
    notify(`벼룩시장에서 물건이 팔렸다: +${r.amount}냥`)
  }, [addLog])
  useEffect(() => onMarketSold(claimProceeds), [claimProceeds])
  useEffect(() => {
    if (online.status === 'online') claimProceeds()
  }, [online.status, claimProceeds])

  const marketSell = useCallback(
    async (id, qty, price) => {
      const cur = playerRef.current
      if ((cur.inventory?.[id] || 0) < qty) return { ok: false, message: '가진 개수가 모자란다.' }
      const r = await marketList(id, qty, price)
      if (!r.ok) {
        const msg = r.error === 'too-many-listings' ? '한 사람이 올릴 수 있는 매물은 최대 10개다.' : r.error === 'slow-down' ? '너무 빨리 올리고 있다.' : r.error === 'bad-price' ? '가격은 1~99999냥으로 정해 주세요.' : '매물을 올리지 못했다.'
        return { ok: false, message: msg }
      }
      const now = playerRef.current
      const inv = { ...now.inventory, [id]: (now.inventory?.[id] || 0) - qty }
      if (inv[id] <= 0) delete inv[id]
      const next = { ...now, inventory: inv }
      playerRef.current = next
      setPlayer(next)
      addLog(`벼룩시장에 ${itemOf(id)?.name} ${qty}개를 개당 ${price}냥에 올렸다.`)
      return { ok: true, message: `${itemOf(id)?.name} ${qty}개를 개당 ${price}냥(합계 ${price * qty}냥)에 올렸다.` }
    },
    [addLog],
  )
  const marketBuyIt = useCallback(
    async (l) => {
      const cur = playerRef.current
      if (!admin && cur.money < l.total) return { ok: false, message: '냥이 모자란다.' }
      const r = await marketBuy(l.id)
      if (!r.ok) return { ok: false, message: r.status === 404 ? '이미 팔렸거나 내려간 매물이다.' : r.error === 'own' ? '내가 올린 매물은 살 수 없다.' : '구매하지 못했다.' }
      const now = playerRef.current
      const next = { ...now, money: admin ? now.money : now.money - r.total, inventory: { ...now.inventory, [r.item]: (now.inventory?.[r.item] || 0) + r.qty } }
      playerRef.current = next
      setPlayer(next)
      addLog(`벼룩시장에서 ${itemOf(r.item)?.name} ${r.qty}개를 샀다. (${admin ? '관리자: 무료' : `-${r.total}냥`})`)
      return { ok: true, message: `${itemOf(r.item)?.name} ${r.qty}개를 샀다.` }
    },
    [addLog, admin],
  )
  const marketCancelIt = useCallback(
    async (l) => {
      const r = await marketCancel(l.id)
      if (!r.ok) return { ok: false, message: '이미 팔렸거나 내려간 매물이다.' }
      const now = playerRef.current
      const next = { ...now, inventory: { ...now.inventory, [r.item]: (now.inventory?.[r.item] || 0) + r.qty } }
      playerRef.current = next
      setPlayer(next)
      addLog(`벼룩시장에서 ${itemOf(r.item)?.name} ${r.qty}개를 내렸다.`)
      return { ok: true, message: '매물을 내렸다. 소지품으로 돌아왔다.' }
    },
    [addLog],
  )

  // ───────── 물품보관함 ─────────
  const lockerMove = useCallback(
    (mode, grade, id, n) => {
      const cur = playerRef.current
      const r = mode === 'in' ? deposit(cur, grade, id, n) : withdraw(cur, grade, id, n)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      addLog(`${grade}학년 물품보관함에 ${itemOf(id)?.name} ${n}개를 ${mode === 'in' ? '맡겼다' : '꺼냈다'}.`)
      return {}
    },
    [addLog],
  )

  // 자기 학년 보관함을 처음 열면 무복이 한 벌 들어 있다. (그 뒤로는 평범한 아이템)
  const lockerOpen = useCallback(
    (grade) => {
      const cur = playerRef.current
      if (cur.gymwearGiven) return
      const box = cur.lockers?.[grade] ?? {}
      const next = { ...cur, gymwearGiven: true, lockers: { ...(cur.lockers ?? {}), [grade]: { ...box, gymwear: (box.gymwear || 0) + 1 } } }
      playerRef.current = next
      setPlayer(next)
      addLog(`${grade}학년 물품보관함 안에서 [무복] 한 벌을 발견했다.`)
    },
    [addLog],
  )

  // ───────── 장비 ─────────
  const equip = useCallback(
    (id) => {
      if (battleRef.current) return { error: '전투 중에는 장비를 바꿀 수 없다.' }
      const r = equipItem(playerRef.current, id)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      addLog(`[${itemOf(id).name}]을(를) 착용했다.`)
      return {}
    },
    [addLog],
  )
  const unequip = useCallback(
    (slot) => {
      if (battleRef.current) return { error: '전투 중에는 장비를 바꿀 수 없다.' }
      const cur = playerRef.current
      const was = equipOf(cur)[slot]
      const r = unequipSlot(cur, slot)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      addLog(`[${itemOf(was).name}]을(를) 벗었다.`)
      return {}
    },
    [addLog],
  )

  // 제작 (비품실 › 공작소): 몇 개 만들지 고르면 그만큼 비례한 시간(소모 재료 총개수×10분×개수)을 기다려야 완성품이 나온다.
  const craftItem = useCallback(
    (recipeId, qty = 1) => {
      if (battleRef.current) return { error: '전투 중이다.' }
      const cur = playerRef.current
      if (cur.crafting) return { error: '이미 제작 중이다.' }
      const r = startCraft(cur, recipeId, qty, admin)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      const m = r.minutes
      addLog(`공작소에서 ${recipeOf(recipeId)?.id ? itemOf(recipeOf(recipeId).result).name : ''}을(를) 만들기 시작했다. (${qty}개 · ${m}분 대기)`)
      return r
    },
    [addLog, admin],
  )

  // 조리 (별관 조리실). 요리법이 없으면 만들 수 없다.
  const cookItem = useCallback(
    (recipeId) => {
      if (battleRef.current) return { error: '전투 중이다.' }
      const r = cook(playerRef.current, recipeId, admin)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      addLog(`조리실에서 ${r.item.name}을(를) 만들었다.`)
      return r
    },
    [addLog, admin],
  )

  // 무구 강화 (무구보관소). 관리자는 재료를 쓰지 않는다.
  const enhance = useCallback(
    (weaponId, stat) => {
      if (battleRef.current) return { error: '전투 중이다.' }
      const r = enhanceWeapon(playerRef.current, weaponId, stat, admin)
      if (r.error) return r
      const bumped = bumpWeekly(r.player, 'enhance')
      playerRef.current = bumped
      setPlayer(bumped)
      addLog(`${itemOf(weaponId).name}을(를) 강화했다. (${STAT_META[stat].label} +${r.to})`)
      return { ...r, player: bumped }
    },
    [addLog, admin],
  )
  const adminGive = useCallback(
    (id) => {
      if (!admin) return
      const cur = playerRef.current
      const next = itemOf(id)?.slot === 'weapon' && !itemOf(id).inst ? giveWeapon(cur, id).player : { ...cur, inventory: { ...cur.inventory, [id]: (cur.inventory?.[id] || 0) + 1 } }
      playerRef.current = next
      setPlayer(next)
    },
    [admin],
  )

  // 창고(보관함) 등에서 종류 단위의 무구가 들어오면 한 벌씩으로 정리한다.
  useEffect(() => {
    const fixed = migrateWeapons(playerRef.current)
    if (fixed === playerRef.current) return
    playerRef.current = fixed
    setPlayer(fixed)
  }, [player.inventory])

  // 관리자: 업적은 모두 달성한 것으로 취급한다. (보상은 주지 않는다)
  useEffect(() => {
    if (!admin) return
    if (ACHIEVEMENTS.every((a) => player.achievements?.[a.id])) return
    setPlayer((prev) => ({ ...prev, achievements: { ...Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, { at: Date.now() }])), ...(prev.achievements ?? {}) } }))
  }, [admin, player.achievements])

  // 패 놀이터 오광 뽑기(화투). 시스템과 1:1로만 한다.
  const playHoljjak = useCallback(
    (bet, slots, slotIndex) => {
      if (battleRef.current) return { error: '전투 중이다.' }
      const r = playHoljjakGame(playerRef.current, bet, slots, slotIndex, admin)
      if (r.error) return r
      playerRef.current = r.player
      setPlayer(r.player)
      addLog(`오광 뽑기 : 참여비 ${r.bet}냥 → ${r.picked.month}월 광 → ${r.payout}냥 (${r.delta >= 0 ? `+${r.delta}` : r.delta}냥)`)
      return r
    },
    [addLog, admin],
  )

  // NPC 에게 마이쮸를 건네 호감도를 올린다. (전투 중엔 불가)
  const giveNpc = useCallback(
    (npcId, itemId = 'chewy') => {
      if (battleRef.current) return { error: '전투 중이다.' }
      const cur = playerRef.current
      if (!(cur.inventory?.[itemId] > 0)) return { error: '건넬 물건이 없다.' }
      const inv = { ...cur.inventory, [itemId]: cur.inventory[itemId] - 1 }
      if (inv[itemId] <= 0) delete inv[itemId]
      const lv = (cur.affinity?.[npcId] || 0) + (itemOf(itemId)?.giftAffinity || 1)
      const next = { ...cur, inventory: inv, affinity: { ...(cur.affinity ?? {}), [npcId]: lv } }
      playerRef.current = next
      setPlayer(next)
      addLog(`${itemOf(itemId).name}을(를) 건넸다. 호감도가 올랐다. (${lv})`)
      return { level: lv }
    },
    [addLog],
  )

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
        const next = mergeEnh({ ...cur, inventory: inv }, gift.enh)
        playerRef.current = next
        setPlayer(next)
        addLog(`${gift.from.name}님에게 선물을 받았다: ${itemList(gift.items)}${gift.enh ? ' (무구 강화 포함)' : ''}`)
        notify(`${gift.from.name}님이 선물을 보냈다: ${itemList(gift.items)}${gift.note ? ' (쪽지가 사물함에 있다)' : ''}`)
      }),
    [addLog],
  )

  const sendGiftTo = useCallback(
    async (target, items, note = '') => {
      const cur = playerRef.current
      for (const [id, n] of Object.entries(items)) if ((cur.inventory?.[id] || 0) < n) return { ok: false, message: '갖고 있는 개수가 모자라다.' }
      const enh = giftEnhOf(cur, items)
      const r = await sendGift(target.id, items, enh, note)
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
      const next = dropEnh({ ...now, inventory: inv }, Object.keys(enh))
      playerRef.current = next
      setPlayer(next)
      addLog(`${target.name}님에게 선물을 건넸다: ${itemList(items)}${Object.keys(enh).length ? ' (무구 강화 포함)' : ''}`)
      return { ok: true }
    },
    [addLog],
  )

  // 전투 중 사용 가능한 아이템만 쓸 수 있다. 다인 전투에서는 자기 차례에만 쓸 수 있고, 쓰면 그 즉시 내 턴이 끝난다.
  const useItem = useCallback(
    async (id, target) => {
      const item = itemOf(id)
      const cur = playerRef.current
      if (!item) return
      // 다인 전투 중: 효과는 서버가 판에 적용한다. (체력·의지력은 서버 값이 곧바로 반영된다.) 자기 차례에만 쓸 수 있고, 쓰면 턴이 넘어간다.
      if (mbLiveRef.current) {
        const ok = canUseItem(item, { inBattle: true, isParty: true, countNow: cur.inventory?.[id] || 0, reviveOn: false, boostOn: false })
        if (!ok.ok) return
        const to = target && target !== 'self' ? target : undefined
        const r = await mbItem(id, to)
        if (!r.ok) {
          notify(
            r.error === 'already'
              ? '이미 효과가 걸려 있다.'
              : r.error === 'bad-target'
                ? '그 사람에게는 쓸 수 없다.'
                : r.error === 'not-your-turn'
                  ? '아이템은 내 차례에만 쓸 수 있다.'
                  : r.error === 'busy'
                    ? '지금은(행동불능·도깨비불 충전 중) 아이템을 쓸 수 없다.'
                    : '지금은 쓸 수 없다.',
          )
          return
        }
        const now = playerRef.current
        const next = { ...now, inventory: { ...now.inventory, [id]: (now.inventory?.[id] || 0) - 1 } }
        playerRef.current = next
        setPlayer(next)
        setItemsUsed((n) => n + 1)
        addLog(`${item.name}을(를) ${to ? '일행에게 건넸다' : '사용했다'}.`)
        return
      }
      const ok = canUseItem(item, { inBattle: battleRef.current, isParty: false, countNow: cur.inventory?.[id] || 0, reviveOn: reviveRef.current, boostOn: boostRef.current })
      if (!ok.ok) return
      const e = item.effect
      const now0 = Date.now()
      const buffs = e.buff
        ? [...(cur.buffs ?? []).filter((b) => b.until > now0 && !(b.src === id)), { src: id, stat: e.buff.stat, amount: e.buff.amount, until: now0 + e.buff.hours * 3600 * 1000 }]
        : cur.buffs
      const giveHp = e.giveHp ? e.giveHp.self : 0 // 쌍쌍바 등: 혼자 쓸 때는 self 쪽 회복량
      const weakUntilNext = e.cureWeak ? 0 : e.weakCap != null ? Math.min(cur.weakUntil || 0, now0 + e.weakCap) : cur.weakUntil
      const next = {
        ...cur,
        ...(buffs ? { buffs } : {}),
        inventory: { ...cur.inventory, [id]: cur.inventory[id] - 1 },
        hp: e.hp || giveHp ? Math.min(cur.hpMax, cur.hp + (e.hp || 0) + giveHp) : cur.hp,
        mp: e.mp ? Math.min(cur.mpMax, cur.mp + e.mp) : cur.mp,
        weakUntil: weakUntilNext,
      }
      playerRef.current = next
      setPlayer(next)
      if (e.revive) {
        reviveRef.current = true
        setReviveOn(true)
      }
      if (e.boost) {
        boostRef.current = true
        setBoostOn(true)
      }
      if (battleRef.current) setBattleUsedItems((arr) => (arr.includes(id) ? arr : [...arr, id]))
      setItemsUsed((n) => n + 1)
      addLog(
        `${item.name}을(를) 사용했다. (${
          e.buff
            ? `${STAT_META[e.buff.stat].label} +${e.buff.amount} (${e.buff.hours}시간)`
            : e.revive
              ? '전투불능 시 1회 부활 대기'
              : e.boost
                ? '나의 다음 행동 피해 2배 (1턴)'
                : e.cureWeak
                  ? '[쇠약] 즉시 회복'
                  : e.weakCap != null
                    ? '[쇠약] 남은 시간이 1시간으로 줄었다'
                    : e.giveHp
                      ? `체력 +${e.giveHp.self}`
                      : item.effectText
        })`,
      )
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
      setBattleUsedItems([])
    },
    [interruptAll],
  )

  /** 퇴마 실습: 느린 싸움으로 보상 얻기. 직접 싸우는 대신 영력×5분을 기다려 무조건 승리 판정을 받는다. */
  const startSlowFightAction = useCallback(
    (enemyId) => {
      guardTraining(() => {
        interruptAll('느린 싸움을 시작해')
        const cur = playerRef.current
        const r = startSlowFight(cur, enemyId)
        if (r.error) return addLog(r.error)
        playerRef.current = r.player
        setPlayer(r.player)
        const enemy = ENEMIES.find((e) => e.id === enemyId)
        addLog(`퇴마 실습(느린 싸움): ${enemy?.name}을(를) 상대로 ${slowFightMinutes(enemy)}분을 기다리기 시작했다.`)
      })
    },
    [interruptAll, addLog],
  )

  /** 채집하기: 20분을 기다리면 확률표에 따라 무언가를 얻는다. */
  const startGatherAction = useCallback(
    (spotId) => {
      guardTraining(() => {
        interruptAll('채집을 시작해')
        const cur = playerRef.current
        const r = startGather(cur, spotId)
        if (r.error) return addLog(r.error)
        playerRef.current = r.player
        setPlayer(r.player)
        addLog(`채집을 시작했다. (${GATHER_MINUTES}분)`)
      })
    },
    [interruptAll, addLog],
  )

  /** 수렵 시도: 20분을 기다리면 1d10으로 조우한 상대가 정해지고, 승리(또는 간파) 보상을 받는다. */
  const startHuntAction = useCallback(
    (pathId) => {
      guardTraining(() => {
        interruptAll('수렵을 시작해')
        const cur = playerRef.current
        const r = startHunt(cur, pathId)
        if (r.error) return addLog(r.error)
        playerRef.current = r.player
        setPlayer(r.player)
        addLog(`수렵을 시작했다. (${HUNT_MINUTES}분)`)
      })
    },
    [interruptAll, addLog],
  )

  // 전투 중 처음으로 전투불능이 되면 영능력 [생존본능]을 얻는다.
  const downed = useCallback(() => {
    const cur = playerRef.current
    const next = acquirePsychic(cur, 'survival')
    if (next === cur) return
    playerRef.current = next
    setPlayer(next)
    addLog('✦ 영능력 《생존본능》을 얻었다. (영능력 탭에서 확인)')
  }, [addLog])

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

  // 전투 교육 과정: 들어온 시점의 체력·의지력을 맡아 두고 가득 찬 상태로 연습한다. 끝나면(중간에 나가도) 원래대로 돌려놓는다.
  const tutorialStart = useCallback(() => {
    const cur = playerRef.current
    if (cur.tutorialSnap) return
    const next = { ...cur, tutorialSnap: { hp: cur.hp, mp: cur.mp }, hp: cur.hpMax, mp: cur.mpMax }
    playerRef.current = next
    setPlayer(next)
  }, [])

  const [tutorialGearPick, setTutorialGearPick] = useState(false)
  const tutorialEnd = useCallback(
    (done) => {
      const cur = playerRef.current
      const snap = cur.tutorialSnap
      if (!snap && !done) return
      const { tutorialSnap: _s, ...rest } = cur
      const next = { ...rest, hp: snap ? Math.min(cur.hpMax, snap.hp) : cur.hp, mp: snap ? Math.min(cur.mpMax, snap.mp) : cur.mp, ...(done ? { tutorialDone: true } : {}) }
      playerRef.current = next
      setPlayer(next)
      addLog(done ? '전투 교육 과정을 마쳤다. 체력과 의지력이 들어오기 전 상태로 돌아왔다.' : '전투 교육 과정에서 나왔다. 체력과 의지력이 들어오기 전 상태로 돌아왔다.')
      // 전투 교육을 마치면(처음이든, 완료한 뒤 다시 보기든) 아직 안 받았다면 무구 하나를 공짜로 고를 수 있게 한다. (v70)
      if (done && !next.freeGearClaimed) setTutorialGearPick(true)
    },
    [addLog],
  )
  const tutorialDone = useCallback(() => tutorialEnd(true), [tutorialEnd])
  // 전투 교육 수료 기념 무구 — 딱 한 번만, 하나만 고를 수 있다. 나머지는 전부 정식 경로로 얻어야 한다. (v70)
  const claimTutorialGear = useCallback(
    (baseId) => {
      const cur = playerRef.current
      if (cur.freeGearClaimed) return setTutorialGearPick(false)
      const w = WEAPONS.find((w) => w.id === baseId)
      if (!w) return
      const { player: withGear } = giveWeapon(cur, baseId)
      const next = { ...withGear, freeGearClaimed: true }
      playerRef.current = next
      setPlayer(next)
      setTutorialGearPick(false)
      addLog(`전투 교육 수료 기념으로 ${w.name}을(를) 받았다.`)
    },
    [addLog],
  )

  const changeMp = useCallback((delta) => {
    const cur = playerRef.current
    const next = { ...cur, mp: Math.max(0, Math.min(cur.mpMax, cur.mp + delta)) }
    playerRef.current = next
    setPlayer(next)
  }, [])

  // ───────── 다인 전투 ─────────
  // 판은 서버가 진행한다. 여기서는 (1) 초대/참여, (2) 서버가 알려 주는 내 체력·의지력을 반영, (3) 끝나면 결과를 적용한다.
  const mbSnapshot = () => {
    const cur = playerRef.current
    return { stats: effectiveStats(cur), fx: weaponFx(cur), hp: Math.floor(cur.hp), hpMax: cur.hpMax, mp: Math.floor(cur.mp), mpMax: cur.mpMax, revive: reviveRef.current, boost: boostRef.current }
  }
  const [bringPick, setBringPick] = useState(null) // 보스 전투 전 가져갈 아이템 고르기 { enemyId } 또는 { invite: true }
  const mbLive = !!online.mb && !online.mb.view.over
  const mbLiveRef = useRef(false)
  mbLiveRef.current = mbLive
  const mbRef = useRef({ bid: null, downed: false, finished: false })
  const setMpAbs = useCallback((value) => {
    const cur = playerRef.current
    const mp = Math.max(0, Math.min(cur.mpMax, Math.floor(value)))
    if (mp === Math.floor(cur.mp)) return
    const next = { ...cur, mp }
    playerRef.current = next
    setPlayer(next)
  }, [])
  const mbView = online.mb?.view ?? null
  const mbBid = online.mb?.bid ?? null
  useEffect(() => {
    if (!mbView || !online.me) return
    const rec = mbRef.current
    if (rec.bid !== mbBid) {
      // 새 전투: 하던 동작을 멈추고 전투 화면으로 옮겨 간다.
      mbRef.current = { bid: mbBid, downed: false, finished: false }
      interruptAll('다인 전투에 참여해')
      const cur = playerRef.current
      const next = { ...cur, seen: { ...cur.seen, [mbView.enemyId]: (cur.seen?.[mbView.enemyId] || 0) + (mbView.over ? 0 : 1) } }
      playerRef.current = next
      setPlayer(next)
      setLocationId('gym')
      setActivity('battle')
      setPanel('world')
      addLog(`${ENEMIES.find((e) => e.id === mbView.enemyId)?.name} 다인 전투에 참여했다.`)
    }
    const me = mbView.members.find((m) => m.id === online.me.id)
    if (!me) return
    changeHp(Math.max(1, me.php))
    setMpAbs(me.mp)
    if (me.reviveUsed && reviveRef.current) {
      reviveRef.current = false
      setReviveOn(false)
    }
    const rec2 = mbRef.current
    if (!rec2.downed && (me.status === 'down' || me.pendingDeath)) {
      rec2.downed = true
      downed()
    }
    if (mbView.over && !rec2.finished) {
      rec2.finished = true
      const enemy = ENEMIES.find((e) => e.id === mbView.enemyId)
      reviveRef.current = false
      setReviveOn(false)
      boostRef.current = false
      setBoostOn(false)
      finishBattle({ win: me.result === 'win', fled: me.result === 'fled', enemy })
    }
  }, [mbView, mbBid]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mbLive || bgmBattle) bgm.setTrack('battle')
    else if (!battleActive) bgm.setTrack('main')
  }, [mbLive, battleActive, bgmBattle])
  // 일행 중일 때: 다른 일행에게 내 체력·영력·의지력·육조 스탯·장비를 주기적으로 알려 준다. (인적사항 밑에서 볼 수 있게)
  const hasPartyMates = !!online.party?.members?.some((m) => m.id !== online.me?.id)
  useEffect(() => {
    if (!hasPartyMates) return undefined
    let inFlight = false // 테스트 등에서 시간이 한꺼번에 왕창 흘러도(가짜 시계로 몰아서 흘려보내도) 요청이 쌓여 몰리지 않도록, 앞 요청이 끝나야 다음을 보낸다.
    const tick = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const cur = playerRef.current
        await sendPartyStats({
          hp: Math.floor(cur.hp),
          hpMax: cur.hpMax,
          mp: Math.floor(cur.mp),
          mpMax: cur.mpMax,
          spirit: Math.floor(cur.spirit),
          stats: effectiveStats(cur),
          equip: equipOf(cur),
        })
      } finally {
        inFlight = false
      }
    }
    tick()
    const t = setInterval(tick, 8000)
    return () => clearInterval(t)
  }, [hasPartyMates])
  const multiProps = {
    meId: online.me?.id,
    view: mbView,
    onAct: mbAct,
    onSurvive: mbSurvive,
    onClose: mbClose,
    hasParty: !!online.party?.members?.length,
    isLeader: !!online.party?.members?.length && online.party.members[0].id === online.me?.id,
    canParty: online.status === 'online' && !!online.party?.members?.some((m) => m.id !== online.me?.id && m.online) && online.party.members[0].id === online.me?.id,
    lobby: online.mbLobby,
    onStart: (enemyId) => (ENEMIES.find((e) => e.id === enemyId)?.boss ? setBringPick({ enemyId }) : mbStart(enemyId, mbSnapshot())),
    onCancel: mbCancel,
  }
  const mbMe = mbView?.members.find((m) => m.id === online.me?.id) ?? null

  const finishBattle = useCallback(
    ({ win, fled, enemy }) => {
      if (fled) {
        addLog(`퇴마 실습: 생존본능으로 ${enemy.name}에게서 도망쳤다. (보상도 손실도 없다)`)
        return
      }
      const r = applyBattleResult(playerRef.current, win, enemy.reward)
      playerRef.current = r.player
      setPlayer(r.player)
      if (win) {
        addLog(
          r.granted
            ? `퇴마 실습: ${enemy.name}을(를) 쓰러뜨렸다! 영력 +${r.granted}, 돈 +${r.granted}냥.`
            : `퇴마 실습: ${enemy.name}을(를) 쓰러뜨렸다. (오늘의 보상은 모두 받았다)`,
        )
      } else {
        addLog(`퇴마 실습: ${enemy.name}에게 패했다.${r.lost ? ` 영력 -${r.lost}.` : ''}`)
        // 전투불능 → 무조건 양호실에서 눈을 뜬다. [쇠약] 24시간.
        addLog('눈을 떠 보니 양호실이다. 몸이 말을 듣지 않는다… [쇠약] 모든 육조 스탯이 5할로 줄었다. (24시간)')
        interruptAll('쓰러져')
        setActivity('intro')
        setLocationId('infirmary')
      }
    },
    [addLog, interruptAll],
  )

  const investigate = useCallback(
    (floor, area, text) => {
      interruptAll('새 동작을 시작해')
      addLog(`본관 탐사 · ${floor} ${area}: ${text}`)
    },
    [addLog, interruptAll],
  )

  // 동아리 '모든 장소 탐사' 퀘스트: 본관/별관/산 탐사의 각 세부 장소를 클릭할 때마다 호출된다.
  const visitSpot = useCallback((key) => {
    const next = markWeeklySet(playerRef.current, 'exploreVisited', key)
    if (next !== playerRef.current) {
      playerRef.current = next
      setPlayer(next)
    }
  }, [])

  const exploreShrine = () => {
    interruptAll('새 동작을 시작해')
    addLog('사당 아래로 한 걸음을 내디뎠다. 귀문의 공기가 뼈를 적신다. (탐사 모듈 준비 중)')
  }

  // 관리자 도구: 스탯 · 체력 · 영력 · 의지력을 곧바로 고친다.
  const applyAdmin = useCallback(
    (v) => {
      let next = { ...playerRef.current, stats: { ...v.stats }, hpMax: v.hpMax, mpMax: v.mpMax, hp: v.hp, mp: v.mp, spirit: v.spirit }
      if (v.clearWeak && next.weakUntil) {
        const { weakUntil: _w, ...rest } = next
        next = rest
      }
      if (v.acquirePsychic) next = acquirePsychic(next, v.acquirePsychic)
      playerRef.current = next
      setPlayer(next)
      addLog('관리자 도구로 수치를 조정했다.')
    },
    [addLog],
  )

  // 관리자가 요청한 수정(스탯 · 쇠약 · 버프)을 당사자가 동의한 뒤에만 적용한다.
  const applyEditChanges = useCallback(
    (ch) => {
      const cur = playerRef.current
      let next = { ...cur }
      if (ch.stats) next.stats = { ...cur.stats, ...ch.stats }
      if (ch.clearWeak) {
        const { weakUntil: _w, ...rest } = next
        next = rest
      }
      if (ch.clearBuffs) next = { ...next, buffs: [] }
      if (ch.refill) next = { ...next, hp: next.hpMax, mp: next.mpMax }
      if (ch.addPsychic) next = acquirePsychic(next, ch.addPsychic)
      if (ch.addSkin2048) next = grantSkin(next, '2048', ch.addSkin2048)
      if (ch.addSkinRunner) next = grantSkin(next, 'runner', ch.addSkinRunner)
      playerRef.current = next
      setPlayer(next)
      addLog('관리자의 수정 요청에 동의해 상태가 바뀌었다.')
    },
    [addLog],
  )

  // 프로필을 바꾸기 전에 지금까지의 진행을 바로 저장한다. (자동 저장은 0.8초 늦게 돈다)
  const profileAction = (action) => {
    onSave?.({ character: charOut, player: playerRef.current, locationId, logs })
    setProfilesOpen(false)
    onProfileAction?.(action)
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
        admin={admin}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenCodex={() => setCodexOpen(true)}
        onOpenClub={() => setClubOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenUpdateNotes={() => setUpdateNotesOpen(true)}
        inClub={!!online.club}
        onReplayIntro={() => setIntroReplay(true)}
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
              (locationId === 'dorm' && id === 'train' && !!playerRef.current.training) ||
              (locationId === 'dorm' && id === 'sleep' && !!playerRef.current.sleeping) ||
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
          <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6" key={panel === 'market' || panel === 'mailbox' ? panel : `${locationId}-${activity}`}>
            {player.traveling ? (
              <TravelPanel traveling={player.traveling} mp={player.mp} onFastTravel={fastTravel} />
            ) : panel === 'mailbox' ? (
              <MailboxPanel online={online} meId={online.me?.id} />
            ) : panel === 'market' ? (
              <Market player={player} admin={admin} online={online.status === 'online'} onSell={marketSell} onBuy={marketBuyIt} onCancel={marketCancelIt} onOpen={claimProceeds} />
            ) : (
              <>
                {mbLive && !(locationId === 'gym' && activity === 'battle') && (
                  <p data-mb-away className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-crimson/20 px-3 py-1.5 text-xs text-crimson">
                    다인 전투가 진행 중이다. 행동을 고르지 않으면 막기로 처리된다.
                    <button type="button" className="flat-chip" onClick={() => { setLocationId('gym'); setActivity('battle') }}>전투로 돌아가기</button>
                  </p>
                )}
                {isWeak(player) && (
                  <p data-weak-chip className="mb-3 rounded-lg bg-crimson/20 px-3 py-1.5 text-xs text-crimson">
                    [쇠약] 모든 육조 스탯이 5할 · 남은 시간 {weakLeftText(player)} (기숙사에서 6시간 취침하면 바로 회복)
                  </p>
                )}
                {locationId === 'mainHall' && <MainHall player={viewPlayer} view={activity} onOpenCourse={setCourse} onInvestigate={investigate} onEnter={moveTo} onLockerMove={lockerMove} onLockerOpen={lockerOpen} admin={admin} onCraft={craftItem} onStopCraft={() => guardTraining(() => endCraft('스스로 멈춰'))} onVisit={visitSpot} />}
                {locationId === 'infirmary' && (
                  <Infirmary
                    view={activity}
                    player={player}
                    onStartRest={beginRest}
                    onStopRest={() => guardTraining(() => endRest('스스로 멈춰'))}
                  />
                )}
                {locationId === 'annex' && (
                  <Annex
                    view={activity}
                    player={viewPlayer}
                    admin={admin}
                    onCraft={craftItem}
                    onStopCraft={() => guardTraining(() => endCraft('스스로 멈춰'))}
                    onCook={cookItem}
                    onMeet={meetNpc}
                    onLineSeen={lineSeen}
                    onGiveNpc={giveNpc}
                    onHoljjak={playHoljjak}
                    myClub={online.club}
                    onApplyClub={applyClub}
                    onFetchMembers={fetchClubMembers}
                    onVisit={visitSpot}
                  />
                )}
                {locationId === 'dorm' && activity === 'store' && (
                  <Store player={player} onBuy={buyItem} onBuyRecipe={buyRecipe} onMeet={meetNpc} onLineSeen={lineSeen} admin={admin} onGiveNpc={giveNpc} />
                )}
                {locationId === 'dorm' && activity === 'cafeteria' && (
                  <Cafeteria
                    online={online.status === 'online'}
                    onSubmitted={() => {
                      const next = markDaily(markWeeklySet(playerRef.current, 'newsDays', dayKey()), 'newsDone')
                      if (next !== playerRef.current) {
                        playerRef.current = next
                        setPlayer(next)
                      }
                    }}
                  />
                )}
                {locationId === 'dorm' && activity !== 'store' && activity !== 'cafeteria' && (
                  <Dormitory
                    view={activity}
                    control={effStats.control}
                    spirit={player.spirit}
                    training={player.training ?? null}
                    sleeping={player.sleeping ?? null}
                    onStartTraining={beginTraining}
                    onStopTraining={() => guardTraining(() => endTraining('스스로 멈춰'))}
                    onStartSleep={beginSleep}
                    onStopSleep={() => guardTraining(() => endSleep('스스로'))}
                  />
                )}
                {locationId === 'gym' && (
                  <Gym
                    view={activity}
                    player={player}
                    admin={admin}
                    onMeet={meetNpc}
                    onEnhance={enhance}
                    onAdminGive={adminGive}
                    onGather={startGatherAction}
                    onHunt={startHuntAction}
                    onVisit={visitSpot}
                    onGiveNpc={giveNpc}
                    stats={effStats}
                    mp={player.mp}
                    hp={player.hp}
                    hpMax={player.hpMax}
                    onHp={changeHp}
                    seen={player.seen}
                    rewardLeft={Math.max(0, GYM_DAILY_REWARDS - gymToday(player).wins)}
                    onStart={startBattle}
                    slowFight={player.slowFight}
                    onStartSlow={startSlowFightAction}
                    onStopSlow={() => guardTraining(() => endSlowFight('스스로 멈춰'))}
                    onMp={changeMp}
                    onFinish={finishBattle}
                    onDown={downed}
                    specials={player.specials}
                    tutorialDone={!!player.tutorialDone}
                    onSpecialSeen={seeSpecial}
                    onTutorialStart={() => {
                      interruptAll('새 동작을 시작해')
                      tutorialStart()
                      meetNpc('bari')
                    }}
                    onTutorialDone={tutorialDone}
                    reviveOn={reviveOn}
                    onReviveUsed={() => {
                      reviveRef.current = false
                      setReviveOn(false)
                    }}
                    psychics={player.psychics ?? []}
                    boostOn={boostOn}
                    onBoostUsed={() => {
                      boostRef.current = false
                      setBoostOn(false)
                    }}
                    onTutorialEnd={tutorialEnd}
                    onActive={(on) => {
                      setBattleActive(on)
                      battleRef.current = on
                      if (!on) {
                        boostRef.current = false
                        setBoostOn(false)
                        reviveRef.current = false
                        setReviveOn(false)
                      }
                    }}
                    itemsUsed={itemsUsed}
                    usedItems={battleUsedItems}
                    onSpotItems={setSpotItems}
                    onOpenItems={() => setInvOpen(true)}
                    onGiveItem={giveItem}
                    onBgm={setBgmBattle}
                    multi={multiProps}
                  />
                )}
                {locationId === 'shrine' && (
                  <Shrine view={activity} player={player} onExplore={exploreShrine} onMeet={meetNpc} onLineSeen={lineSeen} onGiveNpc={giveNpc} />
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
        <StatusPanel player={player} eff={effStats} onUpgrade={upgradeStat} />
      </div>

      <div className="order-2 flex shrink-0 flex-col gap-3 lg:order-3 lg:min-h-0 lg:w-80">
        <MenuPanel current={panel} onSelect={selectPanel} unreadLog={!!unreadLog} unreadMail={online.mailUnread} hideLog={desktop} />
        {desktop && <ChatPanel docked logs={logs} onGift={setGiftTo} onProfile={setCardTo} />}
      </div>

      <GameModal
        course={course}
        onClose={closeCourse}
        playerKey={userId}
        playerName={player.name}
        stats={effStats}
        lesson={course ? lessonOf(player, course.id) : null}
        actions={lessonActions}
        player={player}
        onSkin={setSkin2048}
        onSkinRunner={setSkinRunner}
        admin={admin}
      />
      {confirmQuit && (
        <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4">
          <div role="alertdialog" aria-modal="true" aria-label={confirmQuit.kind === 'rest' || confirmQuit.kind === 'sleep' ? '휴식 종료 확인' : confirmQuit.kind === 'wait' ? '수업 대기 종료 확인' : confirmQuit.kind === 'craft' ? '제작 중지 확인' : confirmQuit.kind === 'slowFight' ? '느린 싸움 중지 확인' : confirmQuit.kind === 'gathering' ? '채집 중지 확인' : confirmQuit.kind === 'hunting' ? '수렵 중지 확인' : confirmQuit.kind === 'travel' ? '이동 중지 확인' : '수련 포기 확인'} className="ink-panel w-full max-w-sm rounded-2xl p-5 text-center">
            {confirmQuit.kind === 'craft' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 제작 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 기다려야 완성품이 나옵니다. 중간에 나가면 재료도 완성품도 돌아오지 않습니다.</p>
              </>
            ) : confirmQuit.kind === 'travel' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 이동 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 그만둘까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">도착하지 못하고 제자리에 남습니다.</p>
              </>
            ) : confirmQuit.kind === 'slowFight' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 느린 싸움으로 전투 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 기다려야 승리 판정과 보상이 들어옵니다. 중간에 나가면 보상 없이 취소됩니다.</p>
              </>
            ) : confirmQuit.kind === 'gathering' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 채집 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 기다려야 채집물이 들어옵니다. 중간에 나가면 아무것도 얻지 못합니다.</p>
              </>
            ) : confirmQuit.kind === 'hunting' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 수렵 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 기다려야 조우 결과가 나옵니다. 중간에 나가면 아무것도 얻지 못합니다.</p>
              </>
            ) : confirmQuit.kind === 'wait' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 수업 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 기다려야 보상이 들어옵니다. 나가면 기다리던 시간이 끊깁니다.</p>
              </>
            ) : confirmQuit.kind === 'sleep' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 휴식 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 자야 회복됩니다. 중간에 나가면 회복은 없습니다.</p>
              </>
            ) : confirmQuit.kind === 'rest' ? (
              <>
                <p className="font-serif text-lg text-gold">현재 휴식 중입니다.</p>
                <p className="mt-2 text-sm text-paper/80">정말 나갈까요?</p>
                <p className="mt-1 text-[11px] text-paper/50">끝까지 쉬어야 회복됩니다. 중간에 나가면 회복은 없습니다.</p>
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
                {confirmQuit.kind === 'rest' || confirmQuit.kind === 'sleep' || confirmQuit.kind === 'wait' || confirmQuit.kind === 'craft' || confirmQuit.kind === 'slowFight' || confirmQuit.kind === 'gathering' || confirmQuit.kind === 'hunting' || confirmQuit.kind === 'travel' ? '나간다' : '포기한다'}
              </button>
              <button type="button" onClick={() => setConfirmQuit(null)} className="flat-btn justify-center">
                {confirmQuit.kind === 'rest' || confirmQuit.kind === 'sleep' ? '계속 쉬기' : confirmQuit.kind === 'wait' ? '계속 기다리기' : confirmQuit.kind === 'craft' ? '계속 제작하기' : confirmQuit.kind === 'slowFight' || confirmQuit.kind === 'gathering' || confirmQuit.kind === 'hunting' || confirmQuit.kind === 'travel' ? '계속 기다리기' : '계속 수련'}
              </button>
            </div>
          </div>
        </div>
      )}
      {travelConfirm && (
        <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4">
          <div role="alertdialog" aria-modal="true" aria-label="이동 확인" className="ink-panel w-full max-w-sm rounded-2xl p-5 text-center">
            <p className="font-serif text-lg text-gold">{LOCATIONS[travelConfirm.toId].name}(으)로 이동하시겠습니까?</p>
            <p className="mt-2 text-sm text-paper/80">이동 시간 : {travelConfirm.minutes}분</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={confirmTravel} className="flat-btn justify-center !bg-gold !text-ink">
                이동한다
              </button>
              <button type="button" onClick={() => setTravelConfirm(null)} className="flat-btn justify-center">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {achPopupQueue.length > 0 && (
        <div className="modal-scrim fixed inset-0 z-[90] grid place-items-center p-4" onClick={() => setAchPopupQueue((q) => q.slice(1))}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="업적 달성"
            data-ach-popup={achPopupQueue[0].id}
            className="ink-panel w-full max-w-sm rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] tracking-[0.3em] text-gold">업적 달성!</p>
            <p className="mt-2 font-serif text-xl text-paper">{achPopupQueue[0].name}</p>
            <p className="mt-2 text-sm leading-relaxed text-paper/75">{achPopupQueue[0].desc}</p>
            {rewardText(achPopupQueue[0].reward) && <p className="mt-2 text-sm text-gold">{rewardText(achPopupQueue[0].reward)}</p>}
            <button type="button" onClick={() => setAchPopupQueue((q) => q.slice(1))} className="flat-btn mt-4 justify-center">
              확인
            </button>
          </div>
        </div>
      )}
      {profileOpen && (
        <ProfileEditModal
          player={player}
          admin={admin}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
          onSwitchProfile={() => {
            setProfileOpen(false)
            setProfilesOpen(true)
          }}
        />
      )}
      <GlobalBoardGames active={locationId === 'annex'} />
      {online.mbInvite && (
        <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4" data-mb-invite>
          <div role="dialog" aria-modal="true" aria-label="다인 전투 초대" className="ink-panel w-full max-w-sm rounded-xl p-5 text-center">
            <p className="font-serif text-lg text-gold">다인 전투 초대</p>
            <p className="mt-2 text-sm text-paper/85">
              <b className="text-paper">{online.mbInvite.from.name}</b> 님이 <b className="text-paper">{online.mbInvite.enemy.name}</b> 전투에 초대를 보냈습니다.
            </p>
            <p className="mt-1 text-sm text-paper">전투에 참여하시겠습니까?</p>
            <p className="mt-1 text-[11px] text-paper/55">참여하면 하던 일을 멈추고 전투 화면으로 이동한다.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => (online.mbInvite.enemy.boss ? setBringPick({ invite: true }) : mbRespond(true, mbSnapshot()))} className="rounded border border-gold bg-gold px-6 py-1.5 text-sm font-medium text-ink hover:brightness-110">
                참여
              </button>
              <button type="button" onClick={() => mbRespond(false)} className="rounded border border-gold/40 px-6 py-1.5 text-sm text-gold hover:bg-gold/10">
                거절
              </button>
            </div>
          </div>
        </div>
      )}
      {bringPick && (
        <BringPicker
          player={player}
          enemyName={bringPick.invite ? online.mbInvite?.enemy?.name : ENEMIES.find((e) => e.id === bringPick.enemyId)?.name}
          onCancel={() => setBringPick(null)}
          onConfirm={(bring) => {
            const pick = bringPick
            setBringPick(null)
            if (pick.invite) mbRespond(true, { ...mbSnapshot(), bring })
            else mbStart(pick.enemyId, { ...mbSnapshot(), bring })
          }}
        />
      )}
      <EditConsent online={online} player={player} onAccept={applyEditChanges} />
      {adminOpen && <AdminPanel player={player} userId={userId} adminKey={adminKey} online={online} onApply={applyAdmin} onClose={() => setAdminOpen(false)} />}
      {profilesOpen && (
        <ProfileSwitchModal
          userId={userId}
          onSwitch={(pid) => profileAction({ type: 'switch', pid })}
          onCreate={() => profileAction({ type: 'create' })}
          onDelete={(pid) => onProfileAction?.({ type: 'delete', pid })}
          onClose={() => setProfilesOpen(false)}
        />
      )}
      {cardTo && <ProfileCardModal target={cardTo} party={online.party} meId={online.me?.id} onClose={() => setCardTo(null)} />}
      {codexNew.length > 0 && (
        <CodexToast
          entries={codexNew}
          onClose={() => setCodexNew([])}
          onOpen={() => {
            const first = codexNew[0]
            const i = first.key.indexOf(':')
            setCodexNew([])
            setCodexFocus({ chapterId: first.key.slice(0, i), id: first.key.slice(i + 1) })
          }}
        />
      )}
      {codexFocus && (
        <CodexEntryModal
          chapterId={codexFocus.chapterId}
          id={codexFocus.id}
          player={player}
          admin={admin}
          onGet={adminGive}
          onClose={() => setCodexFocus(null)}
          onOpenFull={() => {
            setCodexFocus(null)
            setCodexOpen(true)
          }}
        />
      )}
      {codexOpen && <CodexModal player={player} admin={admin} onGet={adminGive} onClose={() => setCodexOpen(false)} />}
      {clubOpen && (
        <ClubModal
          player={player}
          onClose={() => setClubOpen(false)}
          onProfile={setCardTo}
          onFetchMembers={fetchClubMembers}
          onClaimQuest={claimClubQuest}
          onClaimMeta={claimClubMeta}
          onClaimDaily={claimDaily}
          onClaimDailyMeta={claimDailyAll}
        />
      )}
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      {tutorialGearPick && !player.freeGearClaimed && <TutorialGearPicker onPick={claimTutorialGear} />}
      {updateNotesOpen && <UpdateNotesModal onClose={() => setUpdateNotesOpen(false)} />}
      {introReplay && <Intro replay onDone={() => setIntroReplay(false)} />}
      {giftTo && <GiftModal target={giftTo} player={player} onSend={sendGiftTo} onClose={() => setGiftTo(null)} />}
      {invOpen && (
        <InventoryModal player={mbLive && mbView?.boss ? { ...player, inventory: Object.fromEntries(Object.entries(mbMe?.bring ?? {}).filter(([, n]) => n > 0)) } : player} inBattle={battleActive || mbLive} reviveOn={mbLive ? !!mbMe?.revive : reviveOn} boostOn={mbLive ? !!mbMe?.boost : boostOn} onUse={useItem} onEquip={equip} onUnequip={unequip} partyBattle={mbLive} partyMates={mbLive ? (mbView.members ?? []).filter((m) => m.id !== online.me?.id && m.status === 'alive') : (online.party?.members ?? []).filter((m) => m.id !== online.me?.id)} onClose={() => setInvOpen(false)} />
      )}
      {!desktop && <ChatPanel onGift={setGiftTo} onProfile={setCardTo} />}
    </div>
  )
}
