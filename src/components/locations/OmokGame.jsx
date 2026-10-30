import { useMemo, useState } from 'react'
import { Flag, Grid3x3, Swords } from 'lucide-react'
import { closeOmok, inviteOmok, moveOmok, resignOmok, respondOmok, useOnline } from '../../net/online'
import RulesButton from '../RulesButton'
import OmokRules from './OmokRules'
import { useTurnPing } from '../../game/useTurnPing'

const CELL = 24 // 줄 사이 간격(px)
const PAD = 14 // 테두리 줄과 판 가장자리 사이 여백(px)
const HIT = 22 // 교차점 하나를 누르는 클릭 영역(px) — 돌 자체보다 넉넉하게 잡는다.

/** 바둑판의 화점(귀·변·천원) 표시. 15줄 기준(귀 4, 중앙 1)이고, 다른 크기는 중앙에만 하나 찍는다. */
function hoshi(size) {
  if (size === 15) return [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]]
  if (size % 2 === 1) return [[(size - 1) / 2, (size - 1) / 2]]
  return []
}

/** 패 놀이터 '오목'. 2인, 같은 일행(파티)의 다른 멤버에게 신청해서 시작한다. */
export default function OmokGame() {
  const net = useOnline()
  const [msg, setMsg] = useState('')
  const inParty = !!net.party
  const mates = (net.party?.members ?? []).filter((m) => m.id !== net.me?.id)

  const invite = async (to) => {
    setMsg('')
    const r = await inviteOmok(to)
    if (!r?.ok) setMsg(r?.error === 'already-in-game' ? '이미 다른 오목 판에 있다.' : r?.error === 'target-busy' ? '그 사람은 지금 다른 오목 판 중이다.' : '신청하지 못했다.')
    else setMsg(`${mates.find((m) => m.id === to)?.name ?? to}님에게 오목을 신청했다.`)
  }

  if (net.omok) return <OmokBoard game={net.omok} me={net.me} />

  return (
    <div className="ink-panel mt-3 w-full rounded-xl p-4" data-game="omok">
      <p className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-serif text-base text-paper">
          <Grid3x3 size={15} className="text-gold" aria-hidden />
          오목
        </span>
        <RulesButton title="오목 규칙">
          <OmokRules />
        </RulesButton>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-paper/65">같은 일행의 한 명에게 신청해서 2인이 번갈아 돌을 놓는다. 가로·세로·대각선 중 하나로 5개를 먼저 이으면 이긴다.</p>

      {net.omokInvite && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
          <p className="text-sm text-paper"><b className="text-gold">{net.omokInvite.from.name}</b>님이 오목을 신청했다.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => respondOmok(net.omokInvite.from.id, true)} className="flat-btn !py-1 text-xs">수락</button>
            <button type="button" onClick={() => respondOmok(net.omokInvite.from.id, false)} className="flat-btn-ghost !py-1 text-xs">거절</button>
          </div>
        </div>
      )}

      {!inParty ? (
        <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">일행(파티)이 있어야 오목을 신청할 수 있다.</p>
      ) : mates.length === 0 ? (
        <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">신청할 일행 멤버가 없다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {mates.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 px-3 py-1.5 text-sm">
              <span className="text-paper">{m.name}</span>
              <button type="button" onClick={() => invite(m.id)} className="flat-btn !py-1 text-xs">
                <Swords size={12} aria-hidden />
                오목 신청
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-2 text-xs text-gold" role="status">{msg}</p>}
    </div>
  )
}

function OmokBoard({ game, me }) {
  const { gid, size, board, turn, players, winner, win } = game
  const myIdx = players.findIndex((p) => p.id === me?.id)
  const myTurn = !winner && myIdx === turn
  const turnPulse = useTurnPing(myTurn, `${gid}:${turn}`)
  const winSet = useMemo(() => new Set((win ?? []).map(([x, y]) => `${x},${y}`)), [win])
  const place = (x, y) => {
    if (!myTurn || board[y * size + x] != null) return
    moveOmok(x, y)
  }
  const colorText = (i) => (i === 0 ? '흑돌' : '백돌')

  return (
    <div className="mt-3" data-omok-gid={gid}>
      <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-paper/85">
        <span className="flex flex-wrap items-center gap-2">
          {players.map((p, i) => (
            <span key={p.id} className={`rounded-full px-2.5 py-0.5 ${turn === i && !winner ? 'bg-gold-fill/25 text-gold' : 'bg-edge/[0.07] text-paper/70'}`}>
              {p.name} · {colorText(i)}
            </span>
          ))}
        </span>
        <RulesButton title="오목 규칙">
          <OmokRules />
        </RulesButton>
      </p>
      {winner ? (
        <p className="mt-2 rounded-lg bg-gold-fill/20 px-3 py-2 text-sm text-gold" role="status" data-omok-result>
          {players.find((p) => p.id === winner)?.name}님의 승리!
        </p>
      ) : (
        <p
          key={myTurn ? turnPulse : 'wait'}
          className={`mt-2 inline-block rounded px-1 text-xs text-paper/60 ${myTurn ? 'turn-ping' : ''}`}
        >
          {myTurn ? '내 차례다.' : `${players[turn]?.name}님의 차례를 기다린다.`}
        </p>
      )}

      {/* 바둑판처럼: 돌은 칸 안이 아니라 줄이 교차하는 점(모서리) 위에 놓는다. */}
      <div
        className="relative mt-3 rounded-lg bg-[#dcb77a]"
        style={{ width: (size - 1) * CELL + PAD * 2, height: (size - 1) * CELL + PAD * 2 }}
        role="grid"
        aria-label="오목판"
      >
        <svg className="absolute inset-0" width="100%" height="100%" aria-hidden>
          {Array.from({ length: size }, (_, k) => (
            <line key={`h${k}`} x1={PAD} y1={PAD + k * CELL} x2={PAD + (size - 1) * CELL} y2={PAD + k * CELL} stroke="#8a6a3a" strokeOpacity="0.55" strokeWidth="1" />
          ))}
          {Array.from({ length: size }, (_, k) => (
            <line key={`v${k}`} x1={PAD + k * CELL} y1={PAD} x2={PAD + k * CELL} y2={PAD + (size - 1) * CELL} stroke="#8a6a3a" strokeOpacity="0.55" strokeWidth="1" />
          ))}
          {hoshi(size).map(([hx, hy]) => (
            <circle key={`${hx},${hy}`} cx={PAD + hx * CELL} cy={PAD + hy * CELL} r="2.5" fill="#8a6a3a" fillOpacity="0.6" />
          ))}
        </svg>
        {board.map((cell, i) => {
          const x = i % size
          const y = Math.floor(i / size)
          const isWin = winSet.has(`${x},${y}`)
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={`${x + 1},${y + 1}${cell != null ? `, ${colorText(cell)}` : ''}`}
              disabled={!myTurn || cell != null}
              onClick={() => place(x, y)}
              className="absolute flex items-center justify-center"
              style={{ left: PAD + x * CELL - HIT / 2, top: PAD + y * CELL - HIT / 2, width: HIT, height: HIT }}
            >
              {cell != null && (
                <span
                  data-stone={cell}
                  className={`size-[1.15rem] rounded-full shadow ${cell === 0 ? 'bg-[#1a1a1a]' : 'bg-[#f5f0e6]'} ${isWin ? 'ring-2 ring-crimson' : ''}`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex gap-2">
        {!winner && (
          <button type="button" onClick={() => resignOmok()} className="flat-btn-ghost !border-rose-500/70 !bg-rose-950/40 !text-rose-200 hover:!bg-rose-900/60 !py-1 text-xs">
            <Flag size={12} aria-hidden />
            포기하기
          </button>
        )}
        {winner && (
          <button type="button" onClick={() => closeOmok()} className="flat-btn !py-1 text-xs">
            판 닫기
          </button>
        )}
      </div>
    </div>
  )
}
