import { useEffect, useMemo, useState } from 'react'
import { Flag, Layers, Swords } from 'lucide-react'
import { closeRummi, commitRummi, endRummiTurn, inviteRummi, resignRummi, respondRummi, useOnline } from '../../net/online'
import { COLOR_LABEL, COLORS } from '../../game/rummikub'

const COLOR_CLASS = {
  red: 'bg-red-600 text-white',
  blue: 'bg-blue-600 text-white',
  black: 'bg-neutral-900 text-white',
  yellow: 'bg-yellow-400 text-black',
}

function Tile({ tile, selected, onClick, small }) {
  const cls = tile.color ? COLOR_CLASS[tile.color] : 'bg-edge/30 text-paper'
  return (
    <button
      type="button"
      data-tile={tile.id}
      aria-pressed={!!selected}
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-md font-serif ${small ? 'size-7 text-xs' : 'size-9 text-sm'} ${cls} ${selected ? 'ring-2 ring-gold' : ''} ${onClick ? '' : 'cursor-default'}`}
    >
      {tile.joker ? (tile.num ? tile.num : '★') : tile.num}
    </button>
  )
}

export default function RummikubGame() {
  const net = useOnline()
  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState('')
  const inParty = !!net.party
  const mates = (net.party?.members ?? []).filter((m) => m.id !== net.me?.id)

  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p))

  const invite = async () => {
    setMsg('')
    if (!picked.length) return
    const r = await inviteRummi(picked)
    if (!r?.ok) setMsg(r?.error === 'already-in-game' ? '이미 다른 루미큐브 판에 있다.' : r?.error === 'target-busy' ? '그중 누군가는 지금 다른 루미큐브 판 중이다.' : '신청하지 못했다.')
    else setPicked([])
  }

  return (
    <div className="mt-3" data-game="rummikub">
      <div className="ink-panel rounded-xl p-4">
        <p className="flex items-center gap-1.5 font-serif text-base text-paper">
          <Layers size={15} className="text-gold" aria-hidden />
          루미큐브
        </p>
        <p className="mt-1 text-xs leading-relaxed text-paper/65">같은 일행의 1~3명을 골라 신청한다(2~4인). 모두 수락하면 시작한다.</p>

        {net.rummiInvite && (
          <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm text-paper"><b className="text-gold">{net.rummiInvite.from.name}</b>님이 루미큐브를 신청했다.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => respondRummi(net.rummiInvite.lid, true)} className="flat-btn !py-1 text-xs">수락</button>
              <button type="button" onClick={() => respondRummi(net.rummiInvite.lid, false)} className="flat-btn-ghost !py-1 text-xs">거절</button>
            </div>
          </div>
        )}

        {net.rummi ? (
          <RummiBoard game={net.rummi} me={net.me} />
        ) : net.rummiLobby ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">
            응답을 기다리는 중: {net.rummiLobby.waiting.join(', ') || '모두 응답함'}
          </p>
        ) : !inParty ? (
          <p className="mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-xs text-paper/70">일행(파티)이 있어야 루미큐브를 신청할 수 있다.</p>
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
              루미큐브 신청 ({picked.length}명)
            </button>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-gold" role="status">{msg}</p>}
      </div>
    </div>
  )
}

const freshWorkspace = (table, hand) => ({
  melds: table.map((m) => ({ key: m.id, origin: m.id, tiles: m.tiles.map((t) => ({ ...t })) })),
  hand: hand.map((t) => ({ ...t })),
})

function RummiBoard({ game, me }) {
  const { gid, players, counts, hand, poolLeft, table, turn, hasPlayed, firstMeld = [], left = [], winner, log } = game
  const myIdx = players.findIndex((p) => p.id === me?.id)
  const myTurn = myIdx === turn && !winner
  const iHaveFirstMeld = firstMeld.includes(me?.id)

  const [ws, setWs] = useState(() => freshWorkspace(table, hand))
  const oldMeldKeys = useMemo(() => new Set(table.map((m) => m.id)), [gid, myTurn]) // eslint-disable-line react-hooks/exhaustive-deps
  const originalTableIds = useMemo(() => new Set(table.flatMap((m) => m.tiles.map((t) => t.id))), [gid, myTurn]) // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState([])
  const [jokerAssign, setJokerAssign] = useState({})
  const [extendTarget, setExtendTarget] = useState('')
  const [err, setErr] = useState('')

  // 내 턴이 새로 시작할 때(혹은 새 판일 때)만 작업대를 서버 상태로 다시 맞춘다. 편집 중엔 그대로 둔다.
  useEffect(() => {
    setWs(freshWorkspace(table, hand))
    setSelected([])
    setJokerAssign({})
    setExtendTarget('')
    setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gid, myTurn])

  const canEditOldMelds = iHaveFirstMeld
  const editable = myTurn && !winner
  // 내 턴이 아닐 땐 손대는 작업대가 의미가 없으니, 매번 서버가 보낸 최신 모습을 그대로 보여 준다
  // (내 턴일 때만 로컬 작업대 ws 를 보여 주고 편집한다).
  const view = myTurn ? ws : freshWorkspace(table, hand)

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const pullFromMeld = (meldKey, tileId) => {
    if (!editable) return
    setErr('')
    setWs((w) => {
      const melds = []
      let pulled = null
      for (const m of w.melds) {
        if (m.key !== meldKey) { melds.push(m); continue }
        const tiles = m.tiles.filter((t) => {
          if (t.id === tileId) { pulled = t; return false }
          return true
        })
        if (tiles.length > 0) melds.push({ ...m, tiles })
      }
      if (!pulled) return w
      return { melds, hand: [...w.hand, pulled] }
    })
  }

  const resolvedSelected = () =>
    selected
      .map((id) => ws.hand.find((h) => h.id === id))
      .filter(Boolean)
      .map((t) => (t.joker ? { ...t, color: jokerAssign[t.id]?.color ?? t.color ?? 'red', num: jokerAssign[t.id]?.num ?? t.num ?? 1 } : t))

  const addNewMeld = () => {
    setErr('')
    if (selected.length < 3) return setErr('3장 이상 골라야 조합이 된다.')
    const tiles = resolvedSelected()
    setWs((w) => ({ melds: [...w.melds, { key: 'new' + Date.now() + Math.random(), origin: null, tiles }], hand: w.hand.filter((t) => !selected.includes(t.id)) }))
    setSelected([])
  }
  const addToMeld = () => {
    setErr('')
    if (!extendTarget) return setErr('어느 조합에 더할지 골라야 한다.')
    if (!ws.melds.some((m) => m.key === extendTarget)) return setErr('그 조합은 더 이상 없다.')
    if (!selected.length) return setErr('더할 패를 먼저 골라야 한다.')
    const tiles = resolvedSelected()
    setWs((w) => ({
      melds: w.melds.map((m) => (m.key === extendTarget ? { ...m, tiles: [...m.tiles, ...tiles] } : m)),
      hand: w.hand.filter((t) => !selected.includes(t.id)),
    }))
    setSelected([])
  }
  const revert = () => {
    setWs(freshWorkspace(table, hand))
    setSelected([])
    setJokerAssign({})
    setErr('')
  }

  const incompleteMeld = ws.melds.some((m) => m.tiles.length < 3)
  const strandedTable = ws.hand.some((t) => originalTableIds.has(t.id))
  const touched = ws.melds.length !== table.length || ws.melds.some((m, i) => m.key !== table[i]?.id) || ws.hand.length !== hand.length

  const submit = async () => {
    setErr('')
    const payload = ws.melds.map((m) => ({
      tiles: m.tiles.map((t) => t.id),
      assign: Object.fromEntries(m.tiles.filter((t) => t.joker).map((t) => [t.id, { color: t.color, num: t.num }])),
    }))
    const r = await commitRummi(payload)
    if (!r?.ok) {
      setErr(
        r?.error === 'need-30'
          ? `첫 조합은 30점 이상이어야 한다(지금 ${r.value ?? 0}점).`
          : r?.error === 'need-first-meld'
            ? '첫 조합(30점 이상)을 내기 전엔 기존 조합에 손댈 수 없다.'
            : '그 모양으로는 테이블을 완성할 수 없다.',
      )
      return
    }
  }

  const extendOptions = ws.melds.filter((m) => !oldMeldKeys.has(m.key) || canEditOldMelds)

  return (
    <div className="mt-3" data-rummi-gid={gid}>
      <p className="flex flex-wrap items-center gap-2 text-sm text-paper/85">
        {players.map((p, i) => (
          <span
            key={p.id}
            className={`rounded-full px-2.5 py-0.5 ${turn === i && !winner ? 'bg-gold-fill/25 text-gold' : 'bg-edge/[0.07] text-paper/70'} ${left.includes(p.id) ? 'opacity-40 line-through' : ''}`}
          >
            {p.name} · 패 {counts[i]}장{firstMeld.includes(p.id) ? '' : ' · 첫 조합 전'}
          </span>
        ))}
        <span className="rounded-full bg-edge/[0.07] px-2.5 py-0.5 text-paper/55">더미 {poolLeft}장</span>
      </p>

      {winner ? (
        <p className="mt-2 rounded-lg bg-gold-fill/20 px-3 py-2 text-sm text-gold" role="status" data-rummi-result>
          {players.find((p) => p.id === winner)?.name}님의 승리!
        </p>
      ) : (
        <p className="mt-2 text-xs text-paper/60">
          {myTurn ? '내 차례다.' : `${players[turn]?.name}님의 차례를 기다린다.`}
          {myTurn && !iHaveFirstMeld && ' · 첫 조합은 30점 이상이어야 한다.'}
          {myTurn && iHaveFirstMeld && ' · 테이블 조합을 자유롭게 손볼 수 있다.'}
        </p>
      )}

      <div className="mt-3 space-y-2" data-rummi-table aria-label="테이블">
        <p className="text-[11px] tracking-widest text-paper/50">테이블</p>
        {!view.melds.length && <p className="text-xs text-paper/40">아직 나온 조합이 없다.</p>}
        {view.melds.map((meld) => {
          const canPull = editable && (!oldMeldKeys.has(meld.key) || canEditOldMelds)
          return (
            <div
              key={meld.key}
              className={`flex flex-wrap items-center gap-1 rounded-lg p-1.5 ${meld.tiles.length < 3 ? 'bg-crimson/10 ring-1 ring-crimson/40' : 'bg-shade/20'}`}
              data-meld={meld.key}
            >
              {meld.tiles.map((t) => (
                <Tile key={t.id} tile={t} small onClick={canPull ? () => pullFromMeld(meld.key, t.id) : undefined} />
              ))}
              {meld.tiles.length < 3 && <span className="text-[10px] text-crimson">미완성</span>}
            </div>
          )
        })}
      </div>

      {!winner && (
        <>
          <p className="mt-3 text-[11px] tracking-widest text-paper/50">내 패 (클릭으로 고르기)</p>
          <div className="mt-1.5 flex flex-wrap gap-1" data-rummi-hand>
            {view.hand.map((t) => (
              <Tile key={t.id} tile={t} selected={selected.includes(t.id)} onClick={editable ? () => toggleSelect(t.id) : undefined} />
            ))}
          </div>

          {selected.some((id) => ws.hand.find((h) => h.id === id)?.joker) && (
            <div className="mt-2 space-y-1">
              {selected
                .map((id) => ws.hand.find((h) => h.id === id))
                .filter((t) => t?.joker)
                .map((j) => (
                  <div key={j.id} className="flex items-center gap-2 text-xs text-paper/70">
                    <span>조커 {j.id} →</span>
                    <select value={jokerAssign[j.id]?.color ?? j.color ?? ''} onChange={(e) => setJokerAssign((a) => ({ ...a, [j.id]: { color: e.target.value, num: a[j.id]?.num ?? j.num ?? 1 } }))} aria-label={`${j.id} 색`}>
                      <option value="" disabled>
                        색
                      </option>
                      {COLORS.map((c) => (
                        <option key={c} value={c}>
                          {COLOR_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <select value={jokerAssign[j.id]?.num ?? j.num ?? ''} onChange={(e) => setJokerAssign((a) => ({ ...a, [j.id]: { color: a[j.id]?.color ?? j.color ?? 'red', num: Number(e.target.value) } }))} aria-label={`${j.id} 숫자`}>
                      <option value="" disabled>
                        숫자
                      </option>
                      {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          )}

          {editable && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={addNewMeld} className="flat-btn !py-1 text-xs" disabled={selected.length < 3}>
                새 조합으로 묶기
              </button>
              {extendOptions.length > 0 && (
                <>
                  <select value={extendTarget} onChange={(e) => setExtendTarget(e.target.value)} aria-label="더할 조합" className="text-xs">
                    <option value="">조합에 추가하기</option>
                    {extendOptions.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.tiles.map((t) => t.num ?? '★').join(',')}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={addToMeld} className="flat-btn !py-1 text-xs" disabled={!selected.length}>
                    고른 패 추가
                  </button>
                </>
              )}
              {touched && (
                <button type="button" onClick={revert} className="flat-btn-ghost !py-1 text-xs">
                  되돌리기
                </button>
              )}
            </div>
          )}

          {err && (
            <p className="mt-2 text-xs text-gold" role="alert">
              {err}
            </p>
          )}
          {strandedTable && <p className="mt-1 text-xs text-crimson">테이블에서 꺼낸 패가 아직 자리를 못 찾았다 — 다시 조합에 넣어야 한다.</p>}

          {editable && touched && (
            <button type="button" onClick={submit} className="flat-btn mt-2 !py-1 text-xs" disabled={incompleteMeld || strandedTable}>
              제출하기
            </button>
          )}
          {myTurn && (
            <button type="button" onClick={() => endRummiTurn()} className="flat-btn-ghost mt-3 !py-1 text-xs" disabled={touched}>
              턴 마치기{!hasPlayed ? ' (낼 게 없으면 한 장 가져온다)' : ''}
            </button>
          )}
        </>
      )}

      {log?.length > 0 && (
        <ul className="mt-3 max-h-24 space-y-0.5 overflow-auto rounded-lg bg-shade/20 p-2 text-[11px] text-paper/55" aria-label="루미큐브 기록">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        {!winner && (
          <button type="button" onClick={() => resignRummi()} className="flat-btn-ghost !py-1 text-xs">
            <Flag size={12} aria-hidden />
            포기하기
          </button>
        )}
        {winner && (
          <button type="button" onClick={() => closeRummi()} className="flat-btn !py-1 text-xs">
            판 닫기
          </button>
        )}
      </div>
    </div>
  )
}
