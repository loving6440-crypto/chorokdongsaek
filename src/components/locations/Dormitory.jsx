import { useEffect, useState } from 'react'
import { BedDouble, Moon, Square } from 'lucide-react'
import LocationIntro from '../LocationIntro'
import {
  SLEEP_MIN,
  SLEEP_SPIRIT,
  TRAIN_MAX,
  TRAIN_MIN,
  TRAIN_UNIT_MIN,
  sleepSpiritGain,
  spiritGaugeMax,
  spiritIntervalSec,
  trainReward,
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

/** 기숙사 · 휴식: 6시간을 푹 잔다. 일어나면 체력·의지력이 가득 차고 영력이 +100(게이지 최댓값까지). */
function Sleep({ spirit, sleeping, onStartSleep, onStopSleep }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!sleeping) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sleeping])

  const gain = sleepSpiritGain(spirit)
  const gainText = Math.round(gain * 10) / 10
  const endAt = sleeping ? sleeping.startedAt + sleeping.minutes * 60000 : 0
  const progress = sleeping ? Math.min(1, (now - sleeping.startedAt) / (sleeping.minutes * 60000)) : 0

  return (
    <section>
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.2em] text-zinc-400 light:text-zinc-500">{sleeping ? '휴식 중' : '휴식'}</p>
        <p className="mt-2 font-serif text-xl text-paper">{sleeping ? '깊이 잠든 중' : '푹 자기'}</p>
        {!sleeping ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              침대에 누워 {fmtMin(SLEEP_MIN)}을 푹 잔다. 시간은 정해져 있다. 자고 일어나면 체력과 의지력이 가득 차고, 영력이 +{SLEEP_SPIRIT} 오른다. (영력 게이지의 최댓값은 넘지 않는다.)
              자는 동안에는 자연 회복이 멈추고, 끝까지 자야 회복된다. 중간에 일어나거나 다른 곳으로 가면 회복은 없다.
              자는 중에도 탭을 닫아 두거나 창을 내려 놓아도 이어진다.
            </p>
            <div className="mt-4 rounded-xl bg-shade/25 p-3 text-sm text-paper/85">
              <p className="text-[11px] text-paper/50">일어나면</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                <li>체력 · 의지력 <b className="text-gold">가득 참</b></li>
                <li>[쇠약]에 걸려 있다면 <b className="text-gold">함께 회복</b></li>
                <li>
                  영력 <b className="text-gold">+{gainText}</b>
                  <span className="ml-1.5 text-[11px] text-paper/55">
                    {gain < SLEEP_SPIRIT ? `(게이지 최댓값 ${spiritGaugeMax(spirit)}까지)` : ''}
                  </span>
                </li>
              </ul>
            </div>
            <button type="button" onClick={onStartSleep} className="flat-btn mt-4">
              <BedDouble size={15} />
              자기 시작 ({fmtMin(SLEEP_MIN)})
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              {fmtMin(sleeping.minutes)} 동안 잔다. 일어나면 체력과 의지력이 가득 차고 영력이 오른다. 자는 동안 영력 자연 회복은 멈춰 있다. 중간에 일어나면 회복은 없다.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-shade/50" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-gold-fill transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs text-paper/70">
              <span>일어나면 체력·의지력 가득, 영력 +{gainText}</span>
              <span className="font-serif text-lg text-gold">남은 시간 {fmtTime(endAt - now)}</span>
            </div>
            <button type="button" onClick={onStopSleep} className="flat-btn-ghost mt-4 !text-crimson">
              <Square size={13} />
              일어나기
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export default function Dormitory({ view, control, spirit = 0, training, sleeping, onStartTraining, onStopTraining, onStartSleep, onStopSleep }) {
  const [minutes, setMinutes] = useState(30)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!training) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [training])

  const total = training ? (training.reward ?? training.minutes / TRAIN_UNIT_MIN) : 0
  const endAt = training ? training.startedAt + training.minutes * 60000 : 0
  const progress = training ? Math.min(1, (now - training.startedAt) / (training.minutes * 60000)) : 0

  if (view === 'intro') return <LocationIntro id="dorm" />
  if (view === 'sleep') return <Sleep spirit={spirit} sleeping={sleeping} onStartSleep={onStartSleep} onStopSleep={onStopSleep} />

  return (
    <section>
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.2em] text-zinc-400 light:text-zinc-500">
          {training ? '수련 중' : '수련'}
        </p>
        <p className="mt-2 font-serif text-xl text-paper">좌정 · 숨 고르기</p>

        {!training ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              가만히 있어도 절제 {control}에 맞춰 {spiritIntervalSec(control)}초에 영력 +0.1이 저절로 쌓인다.
              수련은 그 자연 회복의 2배(소수점은 내림)로, 시작하면 자연 회복은 멈추고 끝까지 마쳤을 때 영력이 한 번에 들어온다. 중간에 나가면 보상은 없다.
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
                    영력 +{trainReward(minutes, control)}
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
              {fmtMin(training.minutes)} 수련 중. 끝까지 마치면 영력 +{total}이 한 번에 들어온다.
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
                완료 시 영력 +{total}
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
