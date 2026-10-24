import { useId, useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import Avatar from './Avatar'
import AvatarCropper from './AvatarCropper'
import { loadAvatarImageFile, normalizeHex } from '../game/avatarImage'
import { cleanName, gradeOf } from '../game/character'
import { AGE_MAX, AGE_MIN, DEFAULT_AVATAR_COLOR, GRADES, GREETING_MAX_LENGTH, NAME_MAX_LENGTH } from '../game/constants'

const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i)
const sectionLabel = 'font-serif text-xs tracking-[0.2em] text-gold/80'
const subtleButton =
  'inline-flex items-center gap-1.5 rounded border border-gold/30 px-3 py-1.5 text-xs text-gold transition hover:bg-gold/10'

function swatchClass(selected) {
  return `size-10 shrink-0 overflow-hidden rounded-full border transition ${
    selected
      ? 'border-transparent outline-2 outline-offset-2 outline-gold'
      : 'border-edge/30 hover:border-edge/60'
  }`
}

/**
 * 이름 · 나이 · 학년 · 모습을 고르는 칸. 캐릭터 생성과 프로필 수정이 함께 쓴다.
 * value: { name, age, grade(null=자동), avatar }  /  onChange(부분 변경)
 */
export default function ProfileForm({ value, onChange, title = '인적 사항', className = '' }) {
  const nameId = useId()
  const hexId = useId()
  const greetId = useId()
  const fileRef = useRef(null)
  const set = (patch) => onChange(patch)
  const initColor = value.avatar?.kind === 'color' ? value.avatar.color : DEFAULT_AVATAR_COLOR
  const [color, setColor] = useState(initColor)
  const [hexText, setHexText] = useState(initColor.slice(1))
  const [uploaded, setUploaded] = useState(value.avatar?.kind === 'image' ? value.avatar.src : null)
  const [uploadError, setUploadError] = useState('')
  const [cropping, setCropping] = useState(null) // { img, url } | null — 자르기 모달을 띄울 때 쓴다
  const cleanedName = cleanName(value.name)
  const gradeNow = gradeOf(value)

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const loaded = await loadAvatarImageFile(file)
      setCropping(loaded)
      setUploadError('')
    } catch (err) {
      setUploadError(err.message)
    }
  }

  const finishCrop = (src) => {
    URL.revokeObjectURL(cropping.url)
    setCropping(null)
    setUploaded(src)
    set({ avatar: { kind: 'image', src } })
  }

  const cancelCrop = () => {
    URL.revokeObjectURL(cropping.url)
    setCropping(null)
  }

  const removeUpload = () => {
    setUploaded(null)
    setUploadError('')
    if (value.avatar.kind === 'image') set({ avatar: { kind: 'color', color } })
  }

  const hexValid = normalizeHex(hexText) !== null

  const handleHexChange = (event) => {
    const v = event.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHexText(v)
    const next = normalizeHex(v)
    if (next) {
      setColor(next)
      set({ avatar: { kind: 'color', color: next } })
    }
  }

  const handleHexBlur = () => {
    const next = normalizeHex(hexText)
    if (next) setHexText(next.slice(1))
  }

  const handlePickColor = (event) => {
    const next = normalizeHex(event.target.value)
    if (!next) return
    setColor(next)
    setHexText(next.slice(1))
    set({ avatar: { kind: 'color', color: next } })
  }

  return (
    <section className={`ink-panel space-y-5 rounded-md p-5 ${className}`}>
      <p className={sectionLabel}>{title}</p>

      <div className="flex items-center gap-4">
        <Avatar avatar={value.avatar} name={cleanedName} size={84} />
        <div className="min-w-0">
          <p className="truncate font-serif text-lg text-paper">
            {cleanedName || <span className="text-paper/45">이름 미정</span>}
          </p>
          <p className="mt-0.5 text-xs text-paper/65">창록고 {gradeNow}학년 · {value.age}세</p>
          {value.greeting ? <p className="mt-1 truncate text-xs italic text-paper/55">“{value.greeting}”</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor={nameId} className="mb-1.5 flex justify-between text-xs text-paper/70">
          <span>이름</span>
          <span className="text-paper/45">
            {value.name.length} / {NAME_MAX_LENGTH}
          </span>
        </label>
        <input
          id={nameId}
          type="text"
          value={value.name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="이름을 입력하세요"
          autoComplete="off"
          className="w-full rounded border border-edge/20 bg-shade/20 px-3 py-2 text-sm text-paper placeholder:text-paper/70 focus-visible:border-gold focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor={greetId} className="mb-1.5 flex justify-between text-xs text-paper/70">
          <span>한 줄 인사</span>
          <span className="text-paper/45">
            {(value.greeting ?? '').length} / {GREETING_MAX_LENGTH}
          </span>
        </label>
        <input
          id={greetId}
          type="text"
          value={value.greeting ?? ''}
          maxLength={GREETING_MAX_LENGTH}
          onChange={(e) => set({ greeting: e.target.value })}
          placeholder="예: 잘 부탁드립니다 / 수련하기 너무 귀찮다"
          autoComplete="off"
          className="w-full rounded border border-edge/20 bg-shade/20 px-3 py-2 text-sm text-paper placeholder:text-paper/50 focus-visible:border-gold focus-visible:outline-none"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs text-paper/70">나이</p>
        <div role="radiogroup" aria-label="나이" className="flex gap-2">
          {AGES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value.age === v}
              onClick={() => set({ age: v })}
              className={`flex-1 rounded border py-1.5 text-sm transition ${
                value.age === v
                  ? 'border-gold bg-gold text-ink'
                  : 'border-gold/30 text-paper/80 hover:bg-gold/10'
              }`}
            >
              {v}세
            </button>
          ))}
        </div>
      </div>


      <div>
        <p className="mb-1.5 text-xs text-paper/70">학년</p>
        <div role="radiogroup" aria-label="학년" className="flex gap-2">
          {[null, ...GRADES].map((g) => (
            <button
              key={g ?? 'auto'}
              type="button"
              role="radio"
              aria-checked={value.grade === g}
              onClick={() => set({ grade: g })}
              className={`flex-1 rounded border py-1.5 text-sm transition ${
                value.grade === g
                  ? 'border-gold bg-gold text-ink'
                  : 'border-gold/30 text-paper/80 hover:bg-gold/10'
              }`}
            >
              {g === null ? '자동' : `${g}학년`}
            </button>
          ))}
        </div>
        {value.grade === null && (
          <p className="mt-1 text-[11px] text-paper/50">고르지 않으면 나이에 맞춰 정해진다. (17세 1학년 · 18세 2학년 · 19세 3학년)</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs text-paper/70">모습</p>
        <div className="flex flex-wrap gap-2.5 p-1">
          {uploaded && (
            <button
              type="button"
              aria-label="업로드한 이미지"
              aria-pressed={value.avatar.kind === 'image'}
              onClick={() => set({ avatar: { kind: 'image', src: uploaded } })}
              className={swatchClass(value.avatar.kind === 'image')}
            >
              <img src={uploaded} alt="" className="size-full object-cover" />
            </button>
          )}
          <button
            type="button"
            aria-label="단색 프로필"
            aria-pressed={value.avatar.kind === 'color'}
            onClick={() => set({ avatar: { kind: 'color', color } })}
            className={swatchClass(value.avatar.kind === 'color')}
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
      {cropping && <AvatarCropper img={cropping.img} onDone={finishCrop} onCancel={cancelCrop} />}
    </section>
  )
}
