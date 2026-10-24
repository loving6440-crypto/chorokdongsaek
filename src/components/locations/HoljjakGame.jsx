import { useState } from 'react'
import { Coins, Dices } from 'lucide-react'
import { HOLJJAK_MAX_BET, HOLJJAK_MAX_PER_DAY, holjjakStateOf } from '../../game/holjjak'

const LABEL = { odd: '홀', even: '짝' }

/** 패 놀이터 '홀/짝'. 돈을 걸고 홀/짝 중 하나를 고르면 시스템과 1:1로 맞춰 본다. 하루 3회. */
export default function HoljjakGame({ player, admin, onPlay }) {
  const st = holjjakStateOf(player)
  const left = Math.max(0, HOLJJAK_MAX_PER_DAY - st.count)
  const [bet, setBet] = useState(10)
  const [result, setResult] = useState(null)

  const maxBet = Math.min(HOLJJAK_MAX_BET, admin ? HOLJJAK_MAX_BET : Math.floor(player.money))
  const clamp = (n) => Math.max(1, Math.min(maxBet || 1, n))

  const play = (pick) => {
    const r = onPlay(bet, pick)
    if (r?.error) return setResult({ error: r.error })
    setResult({ pick, sysPick: r.sysPick, win: r.win, bet: r.bet })
  }

  return (
    <div className="ink-panel mt-3 w-full rounded-xl p-4" data-game="holjjak">
      <p className="flex items-center gap-1.5 font-serif text-base text-paper">
        <Dices size={15} className="text-gold" aria-hidden />
        홀/짝
      </p>
      <p className="mt-1 text-xs leading-relaxed text-paper/65">
        돈(냥)을 건 뒤 홀 또는 짝을 고른다. 시스템의 선택과 같으면 건 돈의 2배를 얻고, 다르면 건 돈을 그대로 잃는다. 하루 {HOLJJAK_MAX_PER_DAY}회까지 가능하며, 언제나 시스템과 1:1로만 한다.
      </p>
      <p className="mt-2 text-xs text-paper/50">오늘 남은 횟수 <b className="text-gold">{left}</b>회</p>

      <div className="mt-3 flex items-center gap-2">
        <Coins size={14} className="text-gold" aria-hidden />
        <input
          type="number"
          min={1}
          max={maxBet || 1}
          value={bet}
          onChange={(e) => setBet(clamp(parseInt(e.target.value, 10) || 1))}
          className="h-8 w-24 rounded-lg bg-shade/50 px-3 text-center text-sm text-paper outline-none ring-1 ring-edge/20 focus:ring-gold/50"
          aria-label="걸 돈"
        />
        <span className="text-xs text-paper/55">냥 (최대 {maxBet || 0})</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" disabled={left <= 0 || maxBet < 1} onClick={() => play('odd')} className="flat-btn flex-1 justify-center disabled:opacity-40">
          홀
        </button>
        <button type="button" disabled={left <= 0 || maxBet < 1} onClick={() => play('even')} className="flat-btn flex-1 justify-center disabled:opacity-40">
          짝
        </button>
      </div>

      {result && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-center text-sm ${result.error ? 'bg-crimson/15 text-crimson' : result.win ? 'bg-gold-fill/20 text-gold' : 'bg-crimson/15 text-crimson'}`} role="status">
          {result.error
            ? result.error
            : `나는 ${LABEL[result.pick]}, 시스템은 ${LABEL[result.sysPick]} → ${result.win ? `승리! +${result.bet}냥` : `패배… -${result.bet}냥`}`}
        </p>
      )}
    </div>
  )
}
