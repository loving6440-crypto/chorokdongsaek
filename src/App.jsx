import { useCallback, useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import CharacterCreation from './components/CharacterCreation'
import Intro from './components/Intro'
import Game from './Game'
import { hasSeenIntro, markIntroSeen } from './game/intro'
import { sfx } from './game/sfx'
import {
  activeProfileId,
  cancelNewProfile,
  createProfile,
  deleteProfile,
  getAdminKey,
  isAdminUser,
  loadGameState,
  onRemoteUpdate,
  saveGameState,
  serverLogout,
  switchProfile,
  syncOnStart,
} from './game/auth'
import { useTheme } from './hooks/useTheme'

/**
 * 흐름:
 * 1. 세션 없음 → AuthScreen (로그인/회원가입)
 * 2. 로그인 됐는데 저장 데이터 없음 → (처음이면 Intro) → CharacterCreation
 * 3. 저장 데이터 있음 → Game (이어서 플레이)
 */
export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState(null) // { id, twitter, save, ... }
  const [ready, setReady] = useState(false) // 초기 세션 확인 완료 여부
  const [creating, setCreating] = useState(false) // 캐릭터 생성 중
  const [introPlaying, setIntroPlaying] = useState(false) // 첫 캐릭터 생성 전 인트로 재생 중
  const [introLeaving, setIntroLeaving] = useState(false) // 인트로가 끝나가는 중 (뒤에 생성 화면을 미리 깐다)
  const [relogin, setRelogin] = useState(null) // 서버 저장으로 바뀌어 다시 로그인해야 하는 아이디
  const [syncKey, setSyncKey] = useState(0) // 다른 기기의 최신 기록을 받으면 올려서 게임 화면을 새로 그린다

  // 효과음: 첫 입력에서 오디오를 깨우고, 모든 버튼 클릭에 공통 클릭음을 낸다.
  // 버튼에 data-sfx="none" 을 달면 소리를 끄고, data-sfx="nav" 처럼 다른 소리 이름을 줄 수도 있다.
  useEffect(() => {
    const unlock = () => sfx.unlock()
    const onClick = (e) => {
      const el = e.target instanceof Element ? e.target.closest('button, a, [role="radio"], [role="switch"]') : null
      if (!el || el.disabled || el.dataset.sfx === 'none') return
      sfx.play(el.dataset.sfx || 'click')
    }
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  // 앱 시작 시 세션 복원: 서버의 최신 기록을 먼저 받아 온다. (서버가 없으면 이 브라우저의 기록으로)
  useEffect(() => {
    let alive = true
    syncOnStart().then((r) => {
      if (!alive) return
      if (r.needLogin) setRelogin(r.id)
      const current = r.user ?? null
      if (current) {
        setUser(current)
        // 저장 데이터가 없으면 생성 화면으로 (처음이면 인트로부터)
        if (!current.save) {
          setCreating(true)
          setIntroPlaying(!hasSeenIntro(current.id))
        }
      }
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // 다른 기기에서 더 최근에 저장한 기록이 들어오면 그 기록으로 게임을 다시 연다.
  useEffect(
    () =>
      onRemoteUpdate((fresh) => {
        setUser(fresh)
        setCreating(!fresh.save?.character)
        setSyncKey((k) => k + 1)
      }),
    [],
  )

  const handleAuthSuccess = useCallback((loggedInUser) => {
    setRelogin(null)
    setUser(loggedInUser)
    if (!loggedInUser.save) {
      setCreating(true)
      setIntroPlaying(!hasSeenIntro(loggedInUser.id))
    } else {
      setCreating(false)
      setIntroPlaying(false)
    }
  }, [])

  const handleIntroDone = useCallback(() => {
    if (user) markIntroSeen(user.id)
    setIntroPlaying(false)
    setIntroLeaving(false)
  }, [user])

  const handleCharacterComplete = useCallback(
    (character) => {
      if (!user) return
      // 초기 저장 데이터 구성
      const initialSave = {
        character,
        player: null, // Game 이 생성 후 채움
        locationId: 'dorm',
        logs: null,
      }
      saveGameState(user.id, initialSave)
      setUser((prev) => (prev ? { ...prev, save: { ...initialSave, savedAt: Date.now() } } : prev))
      setCreating(false)
    },
    [user],
  )

  const handleSave = useCallback(
    (saveData) => {
      if (!user) return
      saveGameState(user.id, saveData)
      setUser((prev) =>
        prev ? { ...prev, save: { ...saveData, savedAt: Date.now() } } : prev,
      )
    },
    [user],
  )

  // 관리자 프로필 전환: 바꾸기 · 새로 만들기 · 지우기
  const handleProfileAction = useCallback(
    (action) => {
      if (!user) return
      if (action.type === 'switch') {
        const r = switchProfile(user.id, action.pid)
        if (r.ok) {
          setUser(r.user)
          setCreating(false)
        }
      } else if (action.type === 'create') {
        const r = createProfile(user.id)
        if (r.ok) {
          setUser(r.user)
          setIntroPlaying(false)
          setCreating(true)
        }
      } else if (action.type === 'delete') {
        const r = deleteProfile(user.id, action.pid)
        if (r.ok) setUser(r.user)
      }
    },
    [user],
  )

  const handleCancelCreate = useCallback(() => {
    if (!user) return
    const r = cancelNewProfile(user.id)
    if (r.ok) {
      setUser(r.user)
      setCreating(false)
    }
  }, [user])

  const handleLogout = useCallback(() => {
    serverLogout()
    setUser(null)
    setCreating(false)
    setIntroPlaying(false)
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink text-paper/50">
        불러오는 중…
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onSuccess={handleAuthSuccess}
        presetId={relogin ?? undefined}
        notice={relogin ? '이제 기록이 서버에 저장돼 어느 기기에서든 이어서 할 수 있어요. 이 브라우저의 기록을 옮기기 위해 한 번만 다시 로그인해 주세요.' : undefined}
      />
    )
  }

  if (creating || !user.save?.character) {
    // 인트로 위에서 빛이 번지는 동안 생성 화면이 뒤에서 올라오도록, 같은 자리(첫 번째 자식)를 유지한다.
    return (
      <>
        {(!introPlaying || introLeaving) && (
          <CharacterCreation
            theme={theme}
            onToggleTheme={toggleTheme}
            onComplete={handleCharacterComplete}
            onCancel={isAdminUser(user) && user.profiles && Object.keys(user.profiles).length > 1 ? handleCancelCreate : undefined}
          />
        )}
        {introPlaying && <Intro onDone={handleIntroDone} onLeaveStart={() => setIntroLeaving(true)} />}
      </>
    )
  }

  // 저장된 상태가 있으면 그대로 복원
  const saved = loadGameState(user.id) || user.save

  return (
    <Game
      key={`${activeProfileId(user)}:${syncKey}`}
      character={saved.character}
      initialSave={saved}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSave={handleSave}
      onLogout={handleLogout}
      userId={user.id}
      twitter={user.twitter}
      joinedAt={user.createdAt}
      admin={isAdminUser(user)}
      adminKey={getAdminKey()}
      onProfileAction={handleProfileAction}
    />
  )
}
