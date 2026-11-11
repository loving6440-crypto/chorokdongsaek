import { useEffect, useRef, useState } from 'react'
import { Coins, Dices } from 'lucide-react'
import HwatuFace, { HwatuBack } from '../minigames/HwatuFace'
import { HOLJJAK_MAX_BET, HOLJJAK_MAX_PER_DAY, HOLJJAK_SLOTS, holjjakStateOf, shuffleHoljjak } from '../../game/holjjak'

const multLabel = (m) => (m === 0 ? '0배(전부 잃음)' : m === 0.5 ? '0.5배' : m === 1 ? '1배(본전)' : m === 1.5 ? '1.5배' : '2배')

const REVEAL_MS = 2200
const SHUFFLE_MS = 5000
const SHUFFLE_STEP_MS = 450

/** 패 놀이터 '오광 뽑기'. 참여비를 걸고 화투 광 다섯 장 중 하나를 고르면, 어느 패가 나오느냐에 따라 배수로 돌려받는다. 하루 3회. */
export default function HoljjakGame({ player, admin, onPlay }) {
  const st = holjjakStateOf(player)
  const left = Math.max(0, HOLJJAK_MAX_PER_DAY - st.count)
  const maxBet = Math.min(HOLJJAK_MAX_BET, admin ? HOLJJAK_MAX_BET : Math.floor(player.money))

  const [bet, setBet] = useState(10)
  const [phase, setPhase] = useState('bet') // 'bet' | 'reveal' | 'shuffle' | 'pick' | 'result'
  const [slots, setSlots] = useState(HOLJJAK_SLOTS)
  const [picked, setPicked] = useState(null)
  const [result, setResult] = useState(null)
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => () => clearTimers(), [])

  const clampBet = (n) => Math.max(2, Math.min(maxBet || 2, Math.round(n / 2) * 2))

  const runShuffle = () => {
    setPhase('shuffle')
    const steps = Math.max(3, Math.round(SHUFFLE_MS / SHUFFLE_STEP_MS))
    for (let i = 1; i <= steps; i++) {
      timers.current.push(
        setTimeout(() => {
          setSlots(shuffleHoljjak())
          if (i === steps) setPhase('pick')
        }, i * SHUFFLE_STEP_MS),
      )
    }
  }

  const start = () => {
    if (left <= 0 || maxBet < 2) return
    clearTimers()
    setResult(null)
    setPicked(null)
    setSlots(HOLJJAK_SLOTS) // 1광-12광 순서로 배수를 먼저 보여 준다
    setPhase('reveal')
    timers.current.push(setTimeout(runShuffle, REVEAL_MS))
  }

  const pick = (i) => {
    if (phase !== 'pick') return
    const r = onPlay(bet, slots, i)
    if (r?.error) {
      clearTimers()
      setResult({ error: r.error })
      setPhase('bet')
      return
    }
    setPicked(i)
    setResult(r)
    setPhase('result')
  }

  const again = () => {
    clearTimers()
    setResult(null)
    setPicked(null)
    setSlots(HOLJJAK_SLOTS)
    setPhase('bet')
  }

  return (
    <div className="ink-panel mt-3 w-full rounded-xl p-4" data-game="holjjak">
      <p className="flex items-center gap-1.5 font-serif text-base text-paper">
        <Dices size={15} className="text-gold" aria-hidden />
        오광 뽑기
      </p>
      <p className="mt-1 text-xs leading-relaxed text-paper/65">
        참여비(2의 배수)를 낸 뒤 화투 광 다섯 장 중 하나를 고른다. 1광 2배 · 3광 1.5배 · 8광 1배(본전) · 11광 0.5배 · 12광 0배(전부 잃음). 하루 {HOLJJAK_MAX_PER_DAY}
        회까지, 언제나 시스템과 1:1로만 한다.
      </p>
      <p className="mt-2 text-xs text-paper/50">
        오늘 남은 횟수 <b className="text-gold">{left}</b>회
      </p>

      {phase === 'bet' && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <Coins size={14} className="text-gold" aria-hidden />
            <input
              type="number"
              min={2}
              step={2}
              max={maxBet || 2}
              value={bet}
              onChange={(e) => setBet(clampBet(parseInt(e.target.value, 10) || 2))}
              className="h-8 w-24 rounded-lg bg-shade/50 px-3 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
              aria-label="참여비"
            />
            <span className="text-xs text-paper/55">냥 (2의 배수, 최대 {maxBet || 0})</span>
          </div>
          <button type="button" disabled={left <= 0 || maxBet < 2} onClick={start} className="flat-btn mt-3 w-full justify-center disabled:opacity-40">
            패 펼치기
          </button>
          {result?.error && (
            <p className="mt-3 rounded-lg bg-crimson/15 px-3 py-2 text-center text-sm text-crimson" role="status">
              {result.error}
            </p>
          )}
        </>
      )}

      {(phase === 'reveal' || phase === 'shuffle' || phase === 'pick') && (
        <div className="mt-3">
          <p className="mb-2 text-center text-xs text-paper/55">
            {phase === 'reveal' ? '다섯 장과 배수를 잘 봐 두어라…' : phase === 'shuffle' ? '패가 뒤섞이는 중…' : '한 장을 골라라'}
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {slots.map((card, i) => {
              const up = phase === 'reveal'
              return (
                <div key={phase === 'reveal' ? card.month : `s${i}`} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    disabled={phase !== 'pick'}
                    onClick={() => pick(i)}
                    aria-label={up ? `${card.month}월 광, ${multLabel(card.mult)}` : `패 ${i + 1}번째`}
                    className="hwatu-card aspect-[2/3] w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-default"
                  >
                    <span className="hwatu-inner" data-up={up}>
                      <span className="hwatu-back">
                        <HwatuBack />
                      </span>
                      <span className="hwatu-face">
                        <HwatuFace card={{ month: card.month, kind: 'gwang' }} />
                      </span>
                    </span>
                  </button>
                  {phase === 'reveal' && <span className="text-[10px] text-paper/55">{multLabel(card.mult)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'result' && result && !result.error && (
        <div className="mt-3">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {slots.map((card, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`hwatu-card aspect-[2/3] w-full rounded-md ${i === picked ? '' : 'opacity-40'}`}>
                  <span className="hwatu-inner" data-up="true">
                    <span className="hwatu-back">
                      <HwatuBack />
                    </span>
                    <span className="hwatu-face">
                      <HwatuFace card={{ month: card.month, kind: 'gwang' }} />
                    </span>
                  </span>
                </div>
                {i === picked && <span className="text-[10px] font-bold text-gold">{multLabel(card.mult)}</span>}
              </div>
            ))}
          </div>
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-center text-sm ${
              result.payout > result.bet ? 'bg-gold-fill/20 text-gold' : result.payout === result.bet ? 'bg-shade/30 text-paper/80' : 'bg-crimson/15 text-crimson'
            }`}
            role="status"
          >
            {result.picked.month}월 광({multLabel(result.picked.mult)}) → 참여비 {result.bet}냥에 {result.payout}냥을 돌려받음 (
            {result.delta >= 0 ? `+${result.delta}` : result.delta}냥)
          </p>
          <button type="button" onClick={again} className="flat-btn mt-3 w-full justify-center">
            다시 하기
          </button>
        </div>
      )}
    </div>
  )
}
