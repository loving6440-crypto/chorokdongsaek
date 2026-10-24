import { useEffect, useState } from 'react'
import { Dice5, Flag, Swords } from 'lucide-react'
import { closeYacht, inviteYacht, resignYacht, respondYacht, rollYacht, scoreYacht, useOnline } from '../../net/online'
import { CATEGORIES, scoreFor, totalScore } from '../../game/yacht'
import RulesButton from '../RulesButton'
import YachtRules from './YachtRules'
import { useTurnPing } from '../../game/useTurnPing'

const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function YachtGame() {
  const net = useOnline()
  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState('')
  const inParty = !!net.party
  const mates = (net.party?.members ?? []).filter((m) => m.id !== net.me?.id)

  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p))

  const invite = async () => {
    setMsg('')
    if (!picked.length) return
    const r = await inviteYacht(picked)
    if (!r?.ok) setMsg(r?.error === 'already-in-game' ? '이미 다른 요트 다이스 판에 있다.' : r?.error === 'target-busy' ? '그중 누군가는 지금 다른 요트 다이스 판 중이다.' : '신청하지 못했다.')
    else setPicked([])
  }

  return (
    <div className="mt-3" data-game="yacht">
      <div className="ink-panel rounded-xl p-4">
        <p className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-serif text-base text-paper">
            <Dice5 size={15} className="text-gold" aria-hidden />
            요트 다이스
          </span>
          <RulesButton title="요트 다이스 규칙">
            <YachtRules />
          </RulesButton>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-paper/65">같은 일행의 1~3명을 골라 신청한다(2~4인). 모두 수락하면 시작한다.</p>

        {net.yachtInvite && (
          <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm text-paper"><b className="text-gold">{net.yachtInvite.from.name}</b>님이 요트 다이스를 신청했다.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => respondYacht(net.yachtInvite.lid, true)} className="flat-btn !py-1 text-xs">수락</button>
              <button type="button" onClick={() => respondYacht(net.yachtInvite.lid, false)} className="flat-btn-ghost !py-1 text-xs">거절</button>
            </div>
          </div>
        )}

        {net.yacht ? (
          <YachtBoard game={net.yacht} me={net.me} />
        ) : net.yachtLobby ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">
            응답을 기다리는 중: {net.yachtLobby.waiting.join(', ') || '모두 응답함'}
          </p>
        ) : !inParty ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">일행(파티)이 있어야 요트 다이스를 신청할 수 있다.</p>
        ) : mates.length === 0 ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">신청할 일행 멤버가 없다.</p>
        ) : (
          <div className="mt-3">
            <ul className="space-y-1.5">
              {mates.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2 rounded-lg bg-shade/25 px-3 py-1.5 text-sm">
                    <input type="checkbox" checked={picked.includes(m.id)} onChange={() => togglePick(m.id)} />
                    <span className="text-paper">{m.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" disabled={!picked.length} onClick={invite} className="flat-btn mt-2 !py-1 text-xs disabled:opacity-40">
              <Swords size={12} aria-hidden />
              요트 다이스 신청 ({picked.length}명)
            </button>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-gold" role="status">{msg}</p>}
      </div>
    </div>
  )
}

function YachtBoard({ game, me }) {
  const { gid, players, scorecards, dice, rollsLeft, turn, left = [], winner, tie, log } = game
  const myIdx = players.findIndex((p) => p.id === me?.id)
  const myTurn = myIdx === turn && !winner
  const turnPulse = useTurnPing(myTurn, `${gid}:${turn}`)
  const canScore = myTurn && rollsLeft < 3

  const [keep, setKeep] = useState([false, false, false, false, false])
  useEffect(() => setKeep([false, false, false, false, false]), [gid, turn])

  const toggleKeep = (i) => dice[i] && setKeep((k) => k.map((v, j) => (j === i ? !v : v)))

  return (
    <div className="mt-3" data-yacht-gid={gid}>
      <p className="flex flex-wrap items-center gap-2 text-sm text-paper/85">
        {players.map((p, i) => (
          <span
            key={p.id}
            className={`rounded-full px-2.5 py-0.5 ${turn === i && !winner ? 'bg-gold-fill/25 text-gold' : 'bg-edge/[0.07] text-paper/70'} ${left.includes(p.id) ? 'opacity-40 line-through' : ''}`}
          >
            {p.name} · {totalScore(scorecards[i])}점
          </span>
        ))}
      </p>

      {winner || tie ? (
        <p className="mt-2 rounded-lg bg-gold-fill/20 px-3 py-2 text-sm text-gold" role="status" data-yacht-result>
          {tie ? `${tie.map((id) => players.find((p) => p.id === id)?.name).join(', ')}님의 동점 우승!` : `${players.find((p) => p.id === winner)?.name}님의 승리!`}
        </p>
      ) : (
        <p
          key={myTurn ? turnPulse : 'wait'}
          className={`mt-2 inline-block rounded px-1 text-xs text-paper/60 ${myTurn ? 'turn-ping' : ''}`}
        >
          {myTurn ? `내 차례다. (남은 던지기 ${rollsLeft}번)` : `${players[turn]?.name}님의 차례를 기다린다.`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2" data-yacht-dice>
        {dice.map((d, i) => (
          <button
            key={i}
            type="button"
            data-die={i}
            aria-pressed={keep[i]}
            onClick={myTurn && d ? () => toggleKeep(i) : undefined}
            className={`flex size-11 items-center justify-center rounded-lg border text-2xl ${d ? 'bg-paper text-ink' : 'bg-edge/[0.07] text-paper/30'} ${keep[i] ? 'ring-2 ring-gold' : 'border-edge/20'}`}
          >
            {d ? PIPS[d] : '?'}
          </button>
        ))}
      </div>
      {myTurn && dice.some(Boolean) && <p className="mt-1 text-[11px] text-paper/50">주사위를 눌러 남길 것을 고른 뒤 다시 던진다.</p>}

      {myTurn && !winner && (
        <button type="button" onClick={() => rollYacht(keep)} disabled={rollsLeft <= 0} className="flat-btn mt-2 !py-1 text-xs disabled:opacity-40">
          <Dice5 size={13} aria-hidden />
          던지기 ({rollsLeft}번 남음)
        </button>
      )}

      <div className="mt-3 overflow-x-auto" data-yacht-scorecard>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-paper/50">
              <th className="text-left font-normal">칸</th>
              {players.map((p) => (
                <th key={p.id} className="px-1.5 text-right font-normal">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.id} className="border-t border-edge/10">
                <td className="py-1 text-paper/75">{c.label}</td>
                {players.map((p, i) => {
                  const filled = scorecards[i][c.id]
                  const isMine = i === myIdx
                  if (filled != null) return <td key={p.id} className="px-1.5 text-right text-paper/60">{filled}</td>
                  if (isMine && canScore) {
                    const preview = scoreFor(c.id, dice)
                    return (
                      <td key={p.id} className="px-1.5 text-right">
                        <button type="button" data-category={c.id} onClick={() => scoreYacht(c.id)} className="rounded px-1 text-gold hover:bg-gold-fill/20">
                          {preview}
                        </button>
                      </td>
                    )
                  }
                  return <td key={p.id} className="px-1.5 text-right text-paper/25">-</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {log?.length > 0 && (
        <ul className="mt-3 max-h-24 space-y-0.5 overflow-auto rounded-lg bg-shade/20 p-2 text-[11px] text-paper/55" aria-label="요트 다이스 기록">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        {!winner && !tie && (
          <button type="button" onClick={() => resignYacht()} className="flat-btn-ghost !py-1 text-xs">
            <Flag size={12} aria-hidden />
            포기하기
          </button>
        )}
        {(winner || tie) && (
          <button type="button" onClick={() => closeYacht()} className="flat-btn !py-1 text-xs">
            판 닫기
          </button>
        )}
      </div>
    </div>
  )
}
