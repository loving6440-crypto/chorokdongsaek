import { useId, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import logo from '../assets/logo.png'
import Avatar from './Avatar'
import SoundToggle from './SoundToggle'
import ThemeToggle from './ThemeToggle'
import StatTooltip from './StatTooltip'
import { STAT_ICONS } from './statIcons'
import { fileToAvatarDataUrl, normalizeHex } from '../game/avatarImage'
import {
  allocationToStats,
  cleanName,
  emptyAllocation,
  remainingPoints,
} from '../game/character'
import {
  AGE_MAX,
  AGE_MIN,
  DEFAULT_AVATAR_COLOR,
  NAME_MAX_LENGTH,
  SPIRIT_START,
  STAT_KEYS,
  STAT_META,
  STAT_MIN,
  STAT_START_POINTS,
} from '../game/constants'

const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i)

const sectionLabel = 'font-serif text-xs tracking-[0.2em] text-gold/80'
const stepButton =
  'grid size-7 place-items-center rounded border border-gold/30 text-gold transition enabled:hover:bg-gold/10 disabled:cursor-not-allowed disabled:border-edge/10 disabled:text-paper/30'
const subtleButton =
  'inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10'

function swatchClass(selected) {
  return `size-10 shrink-0 overflow-hidden rounded-full border transition ${
    selected
      ? 'border-transparent outline-2 outline-offset-2 outline-gold'
      : 'border-edge/30 hover:border-edge/60'
  }`
}

export default function CharacterCreation({ theme, onToggleTheme, onComplete }) {
  const nameId = useId()
  const hexId = useId()
  const fileRef = useRef(null)

  const [name, setName] = useState('')
  const [age, setAge] = useState(AGE_MIN)
  const [avatar, setAvatar] = useState({ kind: 'color', color: DEFAULT_AVATAR_COLOR })
  const [color, setColor] = useState(DEFAULT_AVATAR_COLOR) // 마지막으로 유효했던 단색
  const [hexText, setHexText] = useState(DEFAULT_AVATAR_COLOR.slice(1)) // '#' 없이 입력창에 보이는 값
  const [uploaded, setUploaded] = useState(null) // 업로드한 이미지(data URL)
  const [uploadError, setUploadError] = useState('')
  const [allocation, setAllocation] = useState(emptyAllocation)

  const cleanedName = cleanName(name)
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
      if (next < 0) return prev // 스탯은 최소값(STAT_MIN) 아래로 내릴 수 없다.
      if (delta > 0 && remainingPoints(prev) <= 0) return prev // 최대값은 없지만 포인트는 한정되어 있다.
      return { ...prev, [key]: next }
    })
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // 같은 파일을 다시 골라도 change 가 발생하도록
    if (!file) return
    try {
      const src = await fileToAvatarDataUrl(file)
      setUploaded(src)
      setAvatar({ kind: 'image', src })
      setUploadError('')
    } catch (err) {
      setUploadError(err.message)
    }
  }

  const removeUpload = () => {
    setUploaded(null)
    setUploadError('')
    if (avatar.kind === 'image') setAvatar({ kind: 'color', color })
  }

  const hexValid = normalizeHex(hexText) !== null

  // #코드 입력: '#' 은 붙여넣어도 되고, 유효한 값이면 바로 미리보기에 반영한다.
  const handleHexChange = (event) => {
    const value = event.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHexText(value)
    const next = normalizeHex(value)
    if (next) {
      setColor(next)
      setAvatar({ kind: 'color', color: next })
    }
  }

  const handleHexBlur = () => {
    const next = normalizeHex(hexText)
    if (next) setHexText(next.slice(1)) // 3자리 → 6자리로 정리
  }

  const handlePickColor = (event) => {
    const next = normalizeHex(event.target.value)
    if (!next) return
    setColor(next)
    setHexText(next.slice(1))
    setAvatar({ kind: 'color', color: next })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canStart) return
    onComplete({
      name: cleanedName,
      age,
      avatar,
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
            <SoundToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
        >
          {/* ───── 인적 사항 ───── */}
          <section className="ink-panel space-y-5 rounded-md p-5">
            <p className={sectionLabel}>인적 사항</p>

            <div className="flex items-center gap-4">
              <Avatar avatar={avatar} name={cleanedName} size={84} />
              <div className="min-w-0">
                <p className="truncate font-serif text-lg text-paper">
                  {cleanedName || <span className="text-paper/45">이름 미정</span>}
                </p>
                <p className="mt-0.5 text-xs text-paper/65">창록고 1학년 · {age}세</p>
              </div>
            </div>

            <div>
              <label htmlFor={nameId} className="mb-1.5 flex justify-between text-xs text-paper/70">
                <span>이름</span>
                <span className="text-paper/45">
                  {name.length} / {NAME_MAX_LENGTH}
                </span>
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoComplete="off"
                className="w-full rounded border border-edge/20 bg-shade/20 px-3 py-2 text-sm text-paper placeholder:text-paper/70 focus-visible:border-gold focus-visible:outline-none"
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs text-paper/70">나이</p>
              <div role="radiogroup" aria-label="나이" className="flex gap-2">
                {AGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={age === value}
                    onClick={() => setAge(value)}
                    className={`flex-1 rounded border py-1.5 text-sm transition ${
                      age === value
                        ? 'border-gold bg-gold text-ink'
                        : 'border-gold/30 text-paper/80 hover:bg-gold/10'
                    }`}
                  >
                    {value}세
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs text-paper/70">모습</p>
              <div className="flex flex-wrap gap-2.5 p-1">
                {uploaded && (
                  <button
                    type="button"
                    aria-label="업로드한 이미지"
                    aria-pressed={avatar.kind === 'image'}
                    onClick={() => setAvatar({ kind: 'image', src: uploaded })}
                    className={swatchClass(avatar.kind === 'image')}
                  >
                    <img src={uploaded} alt="" className="size-full object-cover" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="단색 프로필"
                  aria-pressed={avatar.kind === 'color'}
                  onClick={() => setAvatar({ kind: 'color', color })}
                  className={swatchClass(avatar.kind === 'color')}
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="mt-2">
                <label htmlFor={hexId} className="mb-1.5 block text-[11px] text-paper/55">
                  단색 코드 (#코드)
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex flex-1 items-center rounded border bg-shade/20 px-3 py-2 text-sm text-paper focus-within:border-gold ${
                      hexValid ? 'border-edge/20' : 'border-red-400/60 light:border-red-700/60'
                    }`}
                  >
                    <span className="mr-0.5 text-paper/50 select-none">#</span>
                    <input
                      id={hexId}
                      type="text"
                      value={hexText}
                      onChange={handleHexChange}
                      onBlur={handleHexBlur}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="1f7a4d"
                      aria-invalid={!hexValid}
                      className="w-full bg-transparent font-mono uppercase outline-none placeholder:text-paper/35"
                    />
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={handlePickColor}
                    aria-label="색상 선택기"
                    title="색상 선택기"
                    className="size-9 shrink-0 cursor-pointer rounded border border-gold/30 bg-transparent p-0.5"
                  />
                </div>
                {!hexValid && (
                  <p role="alert" className="mt-1.5 text-xs text-red-400 light:text-red-700">
                    3자리 또는 6자리 16진수 코드를 입력해 주세요. (예: #1f7a4d)
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className={subtleButton}>
                  <Upload size={13} />
                  이미지 업로드
                </button>
                {uploaded && (
                  <button type="button" onClick={removeUpload} className={subtleButton}>
                    <Trash2 size={13} />
                    이미지 제거
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
              {uploadError && (
                <p role="alert" className="mt-2 text-xs text-red-400 light:text-red-700">
                  {uploadError}
                </p>
              )}
            </div>
          </section>

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
