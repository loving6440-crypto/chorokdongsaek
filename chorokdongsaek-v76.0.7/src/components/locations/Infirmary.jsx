import { useEffect, useState } from 'react'
import { BedDouble, MessageCircle, Square } from 'lucide-react'
import LocationIntro from '../LocationIntro'
import { REST_KINDS, REST_MAX, REST_MIN, REST_UNIT_MIN } from '../../game/progress'

function Meter({ label, value, max, tone }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-paper/75">
        <span>{label}</span>
        <span className="tabular-nums">{Math.floor(value)} / {max}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-shade/60" role="meter" aria-label={label} aria-valuenow={Math.floor(value)} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full transition-[width] duration-500 ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  )
}

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 60))}:${p(s % 60)}`
}
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)
const PRESETS = [5, 10, 30, 60, 100]

const KIND_INFO = {
  bed: { icon: BedDouble, gain: '체력', note: '끝까지 쉬면 1분에 1씩, 한꺼번에 체력이 찬다.', doing: '이불을 끌어당기고 가만히 누워 있다…' },
  counsel: { icon: MessageCircle, gain: '의지력', note: '끝까지 쉬면 1분에 1씩, 한꺼번에 의지력이 찬다.', doing: '선생님과 마주 앉아 오래 이야기를 나누고 있다…' },
}

export default function Infirmary({ view, player, onStartRest, onStopRest }) {
  const [kind, setKind] = useState('bed')
  const [minutes, setMinutes] = useState(30)
  const [now, setNow] = useState(() => Date.now())
  const resting = player.resting ?? null
  useEffect(() => {
    if (!resting) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [resting])

  if (view === 'intro') return <LocationIntro id="infirmary" />

  const k = resting?.kind ?? kind
  const info = KIND_INFO[k]
  const stat = REST_KINDS[k].stat
  const cur = stat === 'hp' ? player.hp : player.mp
  const max = stat === 'hp' ? player.hpMax : player.mpMax
  const full = cur >= max
  const need = Math.max(REST_MIN, Math.ceil(max - cur))
  const endAt = resting ? resting.startedAt + resting.minutes * 60000 : 0
  const progress = resting ? Math.min(1, (now - resting.startedAt) / (resting.minutes * 60000)) : 0

  return (
    <section aria-label="양호실">
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.2em] text-zinc-400 light:text-zinc-500">{resting ? '휴식 중' : '양호실'}</p>
        <p className="mt-2 font-serif text-xl text-paper">{REST_KINDS[k].label}</p>

        <div className="mt-3 space-y-3 rounded-xl bg-shade/25 p-4">
          <Meter label="체력" value={player.hp} max={player.hpMax} tone="bg-crimson" />
          <Meter label="의지력" value={player.mp} max={player.mpMax} tone="bg-mana" />
        </div>

        {!resting ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="양호실 활동">
              {Object.entries(REST_KINDS).map(([id, v]) => {
                const Icon = KIND_INFO[id].icon
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={kind === id}
                    onClick={() => setKind(id)}
                    className="flat-chip tilt inline-flex items-center gap-1.5"
                    aria-pressed={kind === id}
                  >
                    <Icon size={13} />
                    {v.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              {kind === 'bed' ? '체력을 회복한다. ' : '의지력을 회복한다. '}
              {info.note} 쉬는 동안엔 탭을 닫아도 이어지지만, 끝나기 전까지는 아무것도 들어오지 않고 중간에 나가면 받을 수 없다.
            </p>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <label htmlFor="rest-min" className="text-xs text-paper/70">쉴 시간</label>
                <span className="font-serif text-lg text-gold">
                  {fmtMin(minutes)}
                  <span className="ml-2 text-xs text-paper/55">{info.gain} +{minutes}</span>
                </span>
              </div>
              <input
                id="rest-min"
                type="range"
                min={REST_MIN}
                max={REST_MAX}
                step={REST_UNIT_MIN}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="flat-range mt-2 w-full"
                style={{ '--p': `${((minutes - REST_MIN) / (REST_MAX - REST_MIN)) * 100}%` }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((m) => (
                  <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m} className="flat-chip tilt">
                    {fmtMin(m)}
                  </button>
                ))}
                {!full && (
                  <button type="button" onClick={() => setMinutes(Math.min(REST_MAX, need))} className="flat-chip tilt">
                    가득 찰 때까지 ({need}분)
                  </button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-paper/40">{REST_MIN}분 ~ {REST_MAX}분, {REST_UNIT_MIN}분 단위로 고를 수 있다.</p>
            </div>

            <button type="button" disabled={full} onClick={() => onStartRest(kind, minutes)} className="flat-btn mt-4 disabled:cursor-not-allowed disabled:opacity-40">
              <info.icon size={15} />
              {full ? (stat === 'hp' ? '체력이 이미 가득하다' : '의지력이 이미 가득하다') : '쉬기 시작'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-paper/65">
              {fmtMin(resting.minutes)} 동안 {REST_KINDS[k].label} 중. {info.note} 끝나기 전까지는 아무것도 들어오지 않고, 중간에 나가면 받을 수 없다.
            </p>
            <p className="mt-1 text-[11px] text-paper/55">{info.doing}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-shade/50" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-gold-fill transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs text-paper/70">
              <span>{info.gain} +{resting.minutes} (완료 시)</span>
              <span className="font-serif text-lg text-gold">남은 시간 {fmtTime(endAt - now)}</span>
            </div>
            <button type="button" onClick={onStopRest} className="flat-btn-ghost mt-4 !text-crimson">
              <Square size={13} />
              쉬기 그만두기
            </button>
          </>
        )}
      </div>
    </section>
  )
}
