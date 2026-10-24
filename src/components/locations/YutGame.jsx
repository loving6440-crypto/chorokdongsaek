import { useMemo, useState } from 'react'
import { Dice5, Flag, Swords } from 'lucide-react'
import { applyYutThrow, chooseYutBranch, closeYut, inviteYut, resignYut, respondYut, rollYutDice, useOnline } from '../../net/online'
import YutRules from './YutRules'

// 29칸(바깥 테두리 20칸 + 지름길 9칸)의 화면 좌표. src/game/yut.js 의 말판 구조와 그대로 맞춰 둔 값이다.
const NODE_XY = {
  0: [280, 280], 1: [280, 232], 2: [280, 184], 3: [280, 136], 4: [280, 88], 5: [280, 40],
  6: [232, 40], 7: [184, 40], 8: [136, 40], 9: [88, 40], 10: [40, 40],
  11: [40, 88], 12: [40, 136], 13: [40, 184], 14: [40, 232], 15: [40, 280],
  16: [88, 280], 17: [136, 280], 18: [184, 280], 19: [232, 280],
  20: [240, 80], 21: [200, 120], 22: [160, 160], 23: [120, 200], 24: [80, 240],
  25: [80, 80], 26: [120, 120], 27: [200, 200], 28: [240, 240],
}
const CORNERS = new Set([0, 5, 10, 15, 22])
const PLAYER_COLORS = ['#e23d3d', '#2a7fd6', '#2fa35a', '#c98a1f']

export default function YutGame() {
  const net = useOnline()
  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState('')
  const inParty = !!net.party
  const mates = (net.party?.members ?? []).filter((m) => m.id !== net.me?.id)

  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p))

  const invite = async () => {
    setMsg('')
    if (!picked.length) return
    const r = await inviteYut(picked)
    if (!r?.ok) setMsg(r?.error === 'already-in-game' ? '이미 다른 윷놀이 판에 있다.' : r?.error === 'target-busy' ? '그중 누군가는 지금 다른 윷놀이 판 중이다.' : '신청하지 못했다.')
    else setPicked([])
  }

  return (
    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start" data-game="yut">
      <div className="ink-panel w-full min-w-0 flex-1 rounded-xl p-4">
        <p className="flex items-center gap-1.5 font-serif text-base text-paper">
          <Dice5 size={15} className="text-gold" aria-hidden />
          윷놀이
        </p>
        <p className="mt-1 text-xs leading-relaxed text-paper/65">같은 일행의 1~3명을 골라 신청한다(2~4인). 모두 수락하면 시작한다.</p>

        {net.yutInvite && (
          <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm text-paper"><b className="text-gold">{net.yutInvite.from.name}</b>님이 윷놀이를 신청했다.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => respondYut(net.yutInvite.lid, true)} className="flat-btn !py-1 text-xs">수락</button>
              <button type="button" onClick={() => respondYut(net.yutInvite.lid, false)} className="flat-btn-ghost !py-1 text-xs">거절</button>
            </div>
          </div>
        )}

        {net.yut ? (
          <YutBoard game={net.yut} me={net.me} />
        ) : net.yutLobby ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">
            응답을 기다리는 중: {net.yutLobby.waiting.join(', ') || '모두 응답함'}
          </p>
        ) : !inParty ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">일행(파티)이 있어야 윷놀이를 신청할 수 있다.</p>
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
              윷놀이 신청 ({picked.length}명)
            </button>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-gold" role="status">{msg}</p>}
      </div>
      <YutRules />
    </div>
  )
}

function YutBoard({ game, me }) {
  const { gid, players, pieces, left = [], turn, phase, throws, pendingBranch, lastRoll, winner, log } = game
  const myIdx = players.findIndex((p) => p.id === me?.id)
  const myTurn = myIdx === turn && !winner
  const [selectedThrow, setSelectedThrow] = useState(null)

  const myGroups = useMemo(() => {
    if (myIdx < 0) return []
    const mine = pieces[myIdx]
    const groups = []
    const startN = mine.filter((p) => p.pos === -1).length
    if (startN) groups.push({ key: 'start', label: `대기 중인 말 (${startN})`, count: startN })
    const byPos = new Map()
    for (const p of mine) if (p.pos !== -1 && p.pos !== 'done') byPos.set(p.pos, (byPos.get(p.pos) || 0) + 1)
    for (const [pos, count] of byPos) groups.push({ key: String(pos), label: `${pos}번 자리의 말 (${count}개)`, count })
    return groups
  }, [pieces, myIdx])

  // 칸별로 어느 플레이어의 말이 몇 개 있는지
  const onCell = useMemo(() => {
    const m = new Map()
    pieces.forEach((pl, pi) => {
      const counts = new Map()
      for (const p of pl) if (p.pos !== -1 && p.pos !== 'done') counts.set(p.pos, (counts.get(p.pos) || 0) + 1)
      for (const [pos, n] of counts) {
        if (!m.has(pos)) m.set(pos, [])
        m.get(pos).push({ pi, n })
      }
    })
    return m
  }, [pieces])

  const apply = (target) => {
    if (selectedThrow == null) return
    applyYutThrow(selectedThrow, target === 'start' ? 'start' : Number(target))
    setSelectedThrow(null)
  }

  return (
    <div className="mt-3" data-yut-gid={gid}>
      <p className="flex flex-wrap items-center gap-2 text-sm text-paper/85">
        {players.map((p, i) => (
          <span
            key={p.id}
            className={`rounded-full px-2.5 py-0.5 ${turn === i && !winner ? 'bg-gold-fill/25 text-gold' : 'bg-edge/[0.07] text-paper/70'} ${left.includes(p.id) ? 'opacity-40 line-through' : ''}`}
            style={{ boxShadow: `inset 0 -2px 0 ${PLAYER_COLORS[i]}` }}
          >
            {p.name}
            {' · '}완주 {pieces[i].filter((x) => x.pos === 'done').length}/4
          </span>
        ))}
      </p>

      {winner ? (
        <p className="mt-2 rounded-lg bg-gold-fill/20 px-3 py-2 text-sm text-gold" role="status" data-yut-result>
          {players.find((p) => p.id === winner)?.name}님의 승리!
        </p>
      ) : (
        <p className="mt-2 text-xs text-paper/60">
          {myTurn ? '내 차례다.' : `${players[turn]?.name}님의 차례를 기다린다.`}
          {lastRoll && ` · 방금 ${lastRoll.name}`}
        </p>
      )}

      <svg viewBox="0 0 320 320" className="mt-3 w-full max-w-[320px]" role="img" aria-label="윷판" data-yut-board>
        <rect x="8" y="8" width="304" height="304" rx="8" fill="#dcb77a" />
        <path d="M280,280 L280,40 L40,40 L40,280 Z" fill="none" stroke="#8a6a3a" strokeWidth="2" />
        <line x1="280" y1="40" x2="40" y2="280" stroke="#8a6a3a" strokeWidth="2" />
        <line x1="40" y1="40" x2="280" y2="280" stroke="#8a6a3a" strokeWidth="2" />
        {Object.entries(NODE_XY).map(([id, [x, y]]) => (
          <circle key={id} cx={x} cy={y} r={CORNERS.has(Number(id)) ? 7 : 4} fill={id === '22' ? '#fff3cf' : '#f5ead0'} stroke="#8a6a3a" strokeWidth="1.5" />
        ))}
        {[...onCell.entries()].map(([pos, list]) =>
          list.map(({ pi, n }, k) => {
            const [x, y] = NODE_XY[pos]
            const dx = (k - (list.length - 1) / 2) * 11
            return (
              <g key={`${pos}-${pi}`} transform={`translate(${dx},0)`} data-yut-piece={`${pi}:${pos}`}>
                <circle cx={x} cy={y} r={9} fill={PLAYER_COLORS[pi]} stroke="#1a1a1a" strokeWidth="1" />
                {n > 1 && (
                  <text x={x} y={y + 3} textAnchor="middle" fontSize="10" fill="#fff">
                    {n}
                  </text>
                )}
              </g>
            )
          }),
        )}
      </svg>

      {myTurn && phase === 'roll' && (
        <button type="button" onClick={() => rollYutDice()} className="flat-btn mt-3 !py-1 text-xs">
          <Dice5 size={13} aria-hidden />
          윳 던지기
        </button>
      )}

      {myTurn && phase === 'branch' && pendingBranch && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
          <p className="text-sm text-paper">갈림길이다. 어느 쪽으로 갈까?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingBranch.options.map((o) => (
              <button key={o.id} type="button" onClick={() => chooseYutBranch(o.id)} className="flat-btn !py-1 text-xs">
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {myTurn && phase === 'apply' && (
        <div className="mt-3">
          <p className="text-[11px] tracking-widest text-paper/50">쓸 수 있는 던지기</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {throws.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={selectedThrow === s}
                onClick={() => setSelectedThrow(s)}
                className={`rounded-full px-3 py-1 text-xs ${selectedThrow === s ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
              >
                {s === -1 ? '빽도' : s}칸
              </button>
            ))}
          </div>
          {selectedThrow != null && (
            <>
              <p className="mt-2 text-[11px] tracking-widest text-paper/50">어느 말을 움직일까?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {myGroups.map((g) => (
                  <button key={g.key} type="button" onClick={() => apply(g.key)} className="tilt rounded-lg bg-edge/[0.07] px-3 py-1.5 text-xs text-paper hover:bg-gold-fill/20">
                    {g.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {log?.length > 0 && (
        <ul className="mt-3 max-h-24 space-y-0.5 overflow-auto rounded-lg bg-shade/20 p-2 text-[11px] text-paper/55" aria-label="윷놀이 기록">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        {!winner && (
          <button type="button" onClick={() => resignYut()} className="flat-btn-ghost !py-1 text-xs">
            <Flag size={12} aria-hidden />
            포기하기
          </button>
        )}
        {winner && (
          <button type="button" onClick={() => closeYut()} className="flat-btn !py-1 text-xs">
            판 닫기
          </button>
        )}
      </div>
    </div>
  )
}
