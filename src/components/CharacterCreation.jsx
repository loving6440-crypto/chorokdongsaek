import { useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import logo from '../assets/logo.png'
import ProfileForm from './ProfileForm'
import SoundToggle from './SoundToggle'
import ThemeToggle from './ThemeToggle'
import StatTooltip from './StatTooltip'
import { STAT_ICONS } from './statIcons'
import {
  allocationToStats,
  cleanGreeting,
  cleanName,
  emptyAllocation,
  remainingPoints,
} from '../game/character'
import {
  AGE_MIN,
  DEFAULT_AVATAR_COLOR,
  SPIRIT_START,
  STAT_KEYS,
  STAT_META,
  STAT_MIN,
  STAT_START_POINTS,
} from '../game/constants'

const sectionLabel = 'font-serif text-xs tracking-[0.2em] text-gold/80'
const stepButton =
  'grid size-7 place-items-center rounded border border-gold/30 text-gold transition enabled:hover:bg-gold/10 disabled:cursor-not-allowed disabled:border-edge/10 disabled:text-paper/30'
const subtleButton =
  'inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10'

export default function CharacterCreation({ theme, onToggleTheme, onComplete, onCancel }) {
  const [profile, setProfile] = useState({
    name: '',
    greeting: '',
    age: AGE_MIN,
    grade: null, // null = 나이에 맞춰 자동
    avatar: { kind: 'color', color: DEFAULT_AVATAR_COLOR },
  })
  const [allocation, setAllocation] = useState(emptyAllocation)

  const cleanedName = cleanName(profile.name)
  const remaining = remainingPoints(allocation)
  const nameOk = cleanedName.length > 0
  const canStart = nameOk && remaining === 0

  const blocker = !nameOk
    ? '이름을 입력해 주세요.'
    : remaining > 0
      ? `남은 포인트 ${remaining}을(를) 모두 투자해 주세요.`
      : ''

  const changeStat = (key, delta) => {
    setAllocation((prev) => {
      const next = prev[key] + delta
      if (next < 0) return prev
      if (delta > 0 && remainingPoints(prev) <= 0) return prev
      return { ...prev, [key]: next }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canStart) return
    onComplete({
      name: cleanedName,
      greeting: cleanGreeting(profile.greeting),
      age: profile.age,
      grade: profile.grade,
      avatar: profile.avatar,
      stats: allocationToStats(allocation),
    })
  }

  return (
    <div className="stage-bg ui-arrive h-full overflow-auto px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="logo-tag relative mb-3 inline-block px-3 py-1.5">
              <img src={logo} alt="草綠同色 초록동색" className="block h-12 w-auto select-none" draggable={false} />
              <span className="sparkle absolute -top-2 -right-2 text-lg" aria-hidden="true" />
            </div>
            <h1 className="mt-1 font-serif text-2xl text-gold">신입생 등록</h1>
            <p className="mt-1 text-sm text-paper/65">
              입학할 학생의 모습과 타고난 기질을 정한다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded border border-edge/25 px-3 py-1.5 text-xs text-paper/80 hover:bg-edge/10">
                돌아가기
              </button>
            )}
            <SoundToggle />
            <ThemeToggle theme={theme} onSelect={onToggleTheme} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
        >
          {/* ───── 인적 사항 ───── */}
          <ProfileForm value={profile} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} />

          {/* ───── 스탯 ───── */}
          <section className="ink-panel rounded-md p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className={sectionLabel}>육조 스탯</p>
              <span
                className="rounded-full border border-gold/40 px-3 py-0.5 text-xs text-gold"
                aria-live="polite"
              >
                남은 포인트 {remaining} / {STAT_START_POINTS}
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-paper/55">
              모든 스탯은 {STAT_MIN}에서 시작한다. 포인트 {STAT_START_POINTS}개를 원하는 대로
              나눠 투자하자. 스탯에는 최대치가 없다.
            </p>

            <ul className="space-y-2">
              {STAT_KEYS.map((key) => {
                const meta = STAT_META[key]
                const Icon = STAT_ICONS[key]
                const extra = allocation[key]
                return (
                  <li key={key} className="rounded-md border border-edge/8 bg-shade/20 p-3">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-paper">
                          <StatTooltip statKey={key} side="below">
                            {meta.label}
                          </StatTooltip>
                          <span className="ml-1 text-[10px] text-paper/40">{meta.en}</span>
                        </p>
                        <p className="text-[11px] leading-snug text-paper/55">{meta.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          className={stepButton}
                          aria-label={`${meta.label} 낮추기`}
                          disabled={extra === 0}
                          onClick={() => changeStat(key, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          className="w-8 text-center font-serif text-xl text-gold"
                          aria-label={`${meta.label} ${STAT_MIN + extra}`}
                        >
                          {STAT_MIN + extra}
                        </span>
                        <button
                          type="button"
                          className={stepButton}
                          aria-label={`${meta.label} 올리기`}
                          disabled={remaining === 0}
                          onClick={() => changeStat(key, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              onClick={() => setAllocation(emptyAllocation())}
              disabled={remaining === STAT_START_POINTS}
              className={`${subtleButton} mt-3 disabled:cursor-not-allowed disabled:border-edge/10 disabled:text-paper/30 disabled:hover:bg-transparent`}
            >
              <RotateCcw size={13} />
              투자 초기화
            </button>
          </section>

          {/* ───── 시작 ───── */}
          <div className="ink-panel flex flex-wrap items-center justify-between gap-3 rounded-md px-5 py-3 md:col-span-2">
            <div className="min-w-0 text-xs text-paper/70">
              <p>
                시작 상태 · 영력 {SPIRIT_START} (중앙값) · 체력 100% · 의지력 100%
              </p>
              <p className="mt-0.5 min-h-4 text-gold" aria-live="polite">
                {blocker}
              </p>
            </div>
            <button
              type="submit"
              disabled={!canStart}
              className="rounded border border-gold bg-gold px-6 py-2 text-sm font-medium text-ink transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:border-edge/15 disabled:bg-transparent disabled:text-paper/40"
            >
              입학하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
