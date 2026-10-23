import { useEffect, useState } from 'react'
import { Moon, Square } from 'lucide-react'
import LocationIntro from '../LocationIntro'
import {
  TRAIN_MAX,
  TRAIN_MIN,
  TRAIN_SPIRIT_PER_UNIT,
  TRAIN_UNIT_MIN,
} from '../../game/progress'

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`
}
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)

const PRESETS = [5, 30, 60, 120, 300]

export default function Dormitory({ view, agility, spiritRate, training, onStartTraining, onStopTraining }) {
  const [minutes, setMinutes] = useState(30)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!training) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [training])

  const total = training ? training.minutes / TRAIN_UNIT_MIN : 0
  const endAt = training ? training.startedAt + training.minutes * 60000 : 0
  const progress = training ? Math.min(1, (now - training.startedAt) / (training.minutes * 60000)) : 0

  if (view === 'intro') return <LocationIntro id="dorm" />

  return (
    <section>
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.2em] text-zinc-400 light:text-zinc-500">
          {training ? '수련 중' : '휴식 중'}
        </p>
        <p className="mt-2 font-serif text-xl text-paper">{training ? '좌정 · 숨 고르기' : '자연 회복'}</p>

        {!training ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              가만히 있으면 신속 {agility}에 맞춰 1분에 영력 +{spiritRate.toFixed(1)}이 쌓인다.
              수련을 시작하면 자연 회복은 멈추고, 끝까지 마쳤을 때 영력이 한 번에 들어온다. 중간에 나가면 보상은 없다.
              수련은 방치해도 된다. 탭을 백그라운드에 두거나 창을 내려 다른 프로그램을 봐도, 소지품·로그를 보거나 영력으로 스탯을 올려도 이어진다. 다만 다른 구역·활동으로 옮기거나 새 동작을 시작하면(확인 창이 뜬다) 수련을 포기하게 된다.
            </p>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <label htmlFor="train-min" className="text-xs text-paper/70">
                  수련 시간
                </label>
                <span className="font-serif text-lg text-gold">
                  {fmtMin(minutes)}
                  <span className="ml-2 text-xs text-paper/55">
                    영력 +{(minutes / TRAIN_UNIT_MIN) * TRAIN_SPIRIT_PER_UNIT}
                  </span>
                </span>
              </div>
              <input
                id="train-min"
                type="range"
                min={TRAIN_MIN}
                max={TRAIN_MAX}
                step={TRAIN_UNIT_MIN}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="flat-range mt-2 w-full"
                style={{ '--p': `${((minutes - TRAIN_MIN) / (TRAIN_MAX - TRAIN_MIN)) * 100}%` }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    aria-pressed={minutes === m}
                    className="flat-chip tilt"
                  >
                    {fmtMin(m)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-paper/40">
                {TRAIN_MIN}분 ~ {TRAIN_MAX}분, {TRAIN_UNIT_MIN}분 단위로 고를 수 있다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onStartTraining(minutes)}
              className="flat-btn mt-4"
            >
              <Moon size={15} />
              수련 시작
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              {fmtMin(training.minutes)} 수련 중. 끝까지 마치면 영력 +{total * TRAIN_SPIRIT_PER_UNIT}이 한 번에 들어온다.
              자연 회복은 멈춰 있다. 중간에 나가면 보상은 없다.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-shade/50" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full bg-gold-fill transition-[width] duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs text-paper/70">
              <span>
                완료 시 영력 +{total * TRAIN_SPIRIT_PER_UNIT}
              </span>
              <span className="font-serif text-lg text-gold">남은 시간 {fmtTime(endAt - now)}</span>
            </div>
            <button
              type="button"
              onClick={onStopTraining}
              className="flat-btn-ghost mt-4 !text-crimson"
            >
              <Square size={13} />
              수련 포기
            </button>
          </>
        )}
      </div>
    </section>
  )
}
