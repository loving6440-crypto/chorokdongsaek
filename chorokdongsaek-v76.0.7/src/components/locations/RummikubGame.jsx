import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag, Layers, Swords } from 'lucide-react'
import { closeRummi, commitRummi, endRummiTurn, inviteRummi, resignRummi, respondRummi, useOnline } from '../../net/online'
import { COLOR_LABEL, COLORS } from '../../game/rummikub'
import RulesButton from '../RulesButton'
import RummikubRules from './RummikubRules'
import { useTurnPing } from '../../game/useTurnPing'

const COLOR_CLASS = {
  red: 'bg-red-600 text-white',
  blue: 'bg-blue-600 text-white',
  black: 'bg-neutral-900 text-white',
  yellow: 'bg-yellow-400 text-black',
}
const COLOR_ORDER = { red: 0, blue: 1, black: 2, yellow: 3 }

/** 조합 하나(그룹 또는 런)를 보기 좋은 순서로 줄 세운다 — 그룹(숫자가 전부 같음)은 색 순서로, 런은 숫자 오름차순으로. */
function sortMeldTiles(tiles) {
  if (tiles.length < 2) return tiles
  const nums = new Set(tiles.map((t) => t.num).filter((n) => n != null))
  const isGroup = nums.size === 1
  return [...tiles].sort((a, b) =>
    isGroup ? (COLOR_ORDER[a.color] ?? 9) - (COLOR_ORDER[b.color] ?? 9) : (a.num ?? 99) - (b.num ?? 99),
  )
}

/** 손패 정렬: 이미 3장 이상으로 완성되는 런/그룹을 욕심쟁이로 찾아 앞에 붙이고, 나머지는 숫자(→색) 오름차순으로 둔다.
 *  조커는 임의로 값을 끼워 맞추지 않고(엉뚱한 색·숫자로 자동 지정되는 걸 막기 위해) 맨 뒤에 그대로 둔다. */
function autoSortHand(hand) {
  const jokers = hand.filter((t) => t.joker)
  const normal = hand.filter((t) => !t.joker)
  const melds = []
  let leftover = []
  for (const c of COLORS) {
    const arr = normal.filter((t) => t.color === c).sort((a, b) => a.num - b.num)
    let i = 0
    while (i < arr.length) {
      let j = i
      while (j + 1 < arr.length && arr[j + 1].num === arr[j].num + 1) j++
      const run = arr.slice(i, j + 1)
      if (run.length >= 3) melds.push(run)
      else leftover.push(...run)
      i = j + 1
    }
  }
  const byNum = {}
  for (const t of leftover) (byNum[t.num] ??= []).push(t)
  leftover = []
  for (const n of Object.keys(byNum).sort((a, b) => Number(a) - Number(b))) {
    const seen = new Set()
    const groupTiles = []
    for (const t of byNum[n]) {
      if (!seen.has(t.color)) { seen.add(t.color); groupTiles.push(t) }
      else leftover.push(t)
    }
    if (groupTiles.length >= 3) melds.push(groupTiles)
    else leftover.push(...groupTiles)
  }
  leftover.sort((a, b) => a.num - b.num || COLOR_ORDER[a.color] - COLOR_ORDER[b.color])
  return [...melds.flat(), ...leftover, ...jokers]
}

/** 타일 하나. draggable 이면 마우스/터치로 눌러서 바로 끌 수 있다(onDragStart(e, tile)). */
function Tile({ tile, small, draggable, onDragStart, hidden }) {
  const cls = tile.color ? COLOR_CLASS[tile.color] : 'bg-edge/30 text-paper'
  return (
    <div
      data-tile={tile.id}
      role={draggable ? 'button' : undefined}
      tabIndex={draggable ? 0 : undefined}
      aria-label={draggable ? `${tile.joker ? '조커' : tile.num} 타일, 끌어서 옮기기` : undefined}
      onMouseDown={draggable ? (e) => onDragStart(e, tile) : undefined}
      onTouchStart={draggable ? (e) => onDragStart(e, tile) : undefined}
      title={tile.joker ? '조커' : undefined}
      className={`relative flex items-center justify-center rounded-md font-serif select-none ${small ? 'size-7 text-xs' : 'size-9 text-sm'} ${cls} ${draggable ? 'touch-none cursor-grab active:cursor-grabbing' : 'cursor-default'} ${hidden ? 'opacity-0' : ''}`}
    >
      {tile.joker && (
        <span className={`absolute ${small ? '-top-1.5 -right-1.5 text-[8px]' : '-top-2 -right-2 text-[10px]'} leading-none text-gold drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]`} aria-hidden>
          ★
        </span>
      )}
      {tile.joker ? (tile.num ?? '★') : tile.num}
    </div>
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
        <p className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-serif text-base text-paper">
            <Layers size={15} className="text-gold" aria-hidden />
            루미큐브
          </span>
          <RulesButton title="루미큐브 규칙">
            <RummikubRules />
          </RulesButton>
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
  const turnPulse = useTurnPing(myTurn, `${gid}:${turn}`)
  const iHaveFirstMeld = firstMeld.includes(me?.id)

  const [ws, setWs] = useState(() => freshWorkspace(table, hand))
  // 작업대를 건드렸는지는 서버 조합 id 와 비교해서 판단하지 않는다 — 서버는 제출할 때마다
  // (내용이 그대로인 조합까지) id 를 전부 새로 발급하므로, 그걸로 비교하면 제출에 성공한 뒤에도
  // "아직 안 건드림"으로 되돌아오지 못해 "턴 마치기"가 영영 안 눌리게 된다. 그래서 직접 상태로 관리한다.
  const [touched, setTouched] = useState(false)
  const oldMeldKeys = useMemo(() => new Set(table.map((m) => m.id)), [gid, myTurn]) // eslint-disable-line react-hooks/exhaustive-deps
  const originalTableIds = useMemo(() => new Set(table.flatMap((m) => m.tiles.map((t) => t.id))), [gid, myTurn]) // eslint-disable-line react-hooks/exhaustive-deps
  const [jokerAssign, setJokerAssign] = useState({})
  const [err, setErr] = useState('')

  // 내 턴이 새로 시작할 때(혹은 새 판일 때)만 작업대를 서버 상태로 다시 맞춘다. 편집 중엔 그대로 둔다.
  useEffect(() => {
    setWs(freshWorkspace(table, hand))
    setTouched(false)
    setJokerAssign({})
    setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gid, myTurn])

  const canEditOldMelds = iHaveFirstMeld
  const editable = myTurn && !winner
  // 내 턴이 아닐 땐 손대는 작업대가 의미가 없으니, 매번 서버가 보낸 최신 모습을 그대로 보여 준다
  // (내 턴일 때만 로컬 작업대 ws 를 보여 주고 편집한다).
  const view = myTurn ? ws : freshWorkspace(table, hand)

  // ── 드래그로 타일 옮기기 ──
  // 네이티브 HTML5 드래그는 터치에서 믿을 수 없어서, 포인터 좌표를 직접 추적해
  // 손을 떼는 지점이 어느 영역(손패·조합·새 조합 칸) 위인지로 판정한다.
  const guard = useRef({ editable, oldMeldKeys, canEditOldMelds })
  guard.current = { editable, oldMeldKeys, canEditOldMelds }
  const dragRef = useRef(null)
  const [dragVisual, setDragVisual] = useState(null)
  const zoneRefs = useRef(new Map())
  const setZoneRef = (id) => (el) => {
    if (el) zoneRefs.current.set(id, el)
    else zoneRefs.current.delete(id)
  }

  const beginDrag = (e, tile) => {
    if (!editable) return
    e.preventDefault()
    const p = e.touches ? e.touches[0] : e
    dragRef.current = { id: tile.id }
    setDragVisual({ tile, x: p.clientX, y: p.clientY })
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      const p = e.touches ? e.touches[0] : e
      setDragVisual((d) => d && { ...d, x: p.clientX, y: p.clientY })
    }
    const onUp = (e) => {
      if (!dragRef.current) return
      const p = e.changedTouches ? e.changedTouches[0] : e
      const { id } = dragRef.current
      dragRef.current = null
      setDragVisual(null)
      if (!guard.current.editable) return
      let target = null
      for (const [zid, el] of zoneRefs.current) {
        const r = el.getBoundingClientRect()
        if (p.clientX >= r.left && p.clientX <= r.right && p.clientY >= r.top && p.clientY <= r.bottom) {
          target = zid
          break
        }
      }
      if (!target) return
      setErr('')
      setWs((w) => {
        let tile = null
        let hand = w.hand
        let melds = w.melds
        const fromHand = w.hand.find((t) => t.id === id)
        if (fromHand) {
          tile = fromHand
          hand = w.hand.filter((t) => t.id !== id)
        } else {
          melds = []
          for (const m of w.melds) {
            const found = m.tiles.find((t) => t.id === id)
            if (!found) { melds.push(m); continue }
            tile = found
            const tiles = m.tiles.filter((t) => t.id !== id)
            if (tiles.length > 0) melds.push({ ...m, tiles })
          }
        }
        if (!tile) return w
        if (target === 'hand') return { hand: [...hand, tile], melds }
        if (target === 'new') return { hand, melds: [...melds, { key: 'new' + Date.now() + Math.random(), origin: null, tiles: [tile] }] }
        const { oldMeldKeys: ok, canEditOldMelds: cem } = guard.current
        if (ok.has(target) && !cem) return w // 아직 손댈 수 없는(첫 조합 전) 기존 조합
        const exists = melds.some((m) => m.key === target)
        const next = exists
          ? melds.map((m) => (m.key === target ? { ...m, tiles: [...m.tiles, tile] } : m))
          : [...melds, { key: target, origin: null, tiles: [tile] }]
        return { hand, melds: next }
      })
      setTouched(true)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  // 조커는 테이블에 낼 때 무엇을 대신하는지(색·숫자) 정해야 한다. 한 번 정했거나(이전 턴에 이미 쓰던 값)
  // jokerAssign 에 골라 둔 값이 있으면 그 값을, 둘 다 없으면 "아직 못 정함"으로 본다.
  const resolveTile = (t) => (t.joker ? { ...t, color: jokerAssign[t.id]?.color ?? t.color, num: jokerAssign[t.id]?.num ?? t.num } : t)
  const meldUnassignedJokers = (m) => m.tiles.filter((t) => t.joker && resolveTile(t).color == null)

  const revert = () => {
    setWs(freshWorkspace(table, hand))
    setTouched(false)
    setJokerAssign({})
    setErr('')
  }

  const incompleteMeld = ws.melds.some((m) => m.tiles.length < 3)
  const strandedTable = ws.hand.some((t) => originalTableIds.has(t.id))
  const needsJokerAssign = ws.melds.some((m) => meldUnassignedJokers(m).length > 0)

  const submit = async () => {
    setErr('')
    const payload = ws.melds.map((m) => ({
      tiles: m.tiles.map((t) => t.id),
      assign: Object.fromEntries(m.tiles.filter((t) => t.joker).map((t) => [t.id, { color: resolveTile(t).color, num: resolveTile(t).num }])),
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
    // 제출에 성공하면 서버가 모든 조합 id 를 새로 발급해 내려준다 — 지금 작업대 내용과 같은 모습이니
    // "손댄 상태"를 풀어서 턴 마치기를 다시 누를 수 있게 한다. (서버가 새 모습을 push 하면 위쪽 view 에도 반영된다)
    setTouched(false)
  }

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
        <p
          key={myTurn ? turnPulse : 'wait'}
          className={`mt-2 inline-block rounded px-1 text-xs text-paper/60 ${myTurn ? 'turn-ping' : ''}`}
        >
          {myTurn ? '내 차례다.' : `${players[turn]?.name}님의 차례를 기다린다.`}
          {myTurn && !iHaveFirstMeld && ' · 첫 조합은 30점 이상이어야 한다.'}
          {myTurn && iHaveFirstMeld && ' · 테이블 조합을 자유롭게 손볼 수 있다.'}
        </p>
      )}

      <div className="mt-3 space-y-2" data-rummi-table aria-label="테이블">
        <p className="text-[11px] tracking-widest text-paper/50">테이블{editable && ' (타일을 끌어서 조합을 만든다)'}</p>
        {!view.melds.length && <p className="text-xs text-paper/40">아직 나온 조합이 없다.</p>}
        {view.melds.map((meld) => {
          const canPull = editable && (!oldMeldKeys.has(meld.key) || canEditOldMelds)
          const unassigned = meldUnassignedJokers(meld)
          return (
            <div key={meld.key}>
              <div
                ref={canPull ? setZoneRef(meld.key) : undefined}
                className={`flex min-h-[2.25rem] flex-wrap items-center gap-1 rounded-lg p-1.5 ${meld.tiles.length < 3 ? 'bg-crimson/10 ring-1 ring-crimson/40' : 'bg-shade/20'} ${canPull ? 'ring-1 ring-dashed ring-gold/20' : ''}`}
                data-meld={meld.key}
              >
                {sortMeldTiles(meld.tiles).map((t) => (
                  <Tile key={t.id} tile={t} small draggable={canPull} onDragStart={beginDrag} hidden={dragVisual?.tile.id === t.id} />
                ))}
                {meld.tiles.length < 3 && <span className="text-[10px] text-crimson">미완성</span>}
              </div>
              {unassigned.length > 0 && (
                <div className="mt-1 space-y-1">
                  {unassigned.map((j) => (
                    <div key={j.id} className="flex items-center gap-2 text-xs text-paper/70">
                      <span>조커 →</span>
                      <select
                        value={jokerAssign[j.id]?.color ?? ''}
                        onChange={(e) => setJokerAssign((a) => ({ ...a, [j.id]: { color: e.target.value, num: a[j.id]?.num ?? 1 } }))}
                        aria-label={`${j.id} 색`}
                        className="rounded-lg bg-shade/50 px-1.5 py-0.5 text-xs text-paper ring-1 ring-edge/20"
                      >
                        <option value="" disabled className="bg-ink text-paper">
                          색
                        </option>
                        {COLORS.map((c) => (
                          <option key={c} value={c} className="bg-ink text-paper">
                            {COLOR_LABEL[c]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={jokerAssign[j.id]?.num ?? ''}
                        onChange={(e) => setJokerAssign((a) => ({ ...a, [j.id]: { color: a[j.id]?.color ?? 'red', num: Number(e.target.value) } }))}
                        aria-label={`${j.id} 숫자`}
                        className="rounded-lg bg-shade/50 px-1.5 py-0.5 text-xs text-paper ring-1 ring-edge/20"
                      >
                        <option value="" disabled className="bg-ink text-paper">
                          숫자
                        </option>
                        {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n} className="bg-ink text-paper">
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {editable && (
          <div
            ref={setZoneRef('new')}
            data-rummi-newzone
            className="flex h-10 items-center justify-center rounded-lg border border-dashed border-gold/25 text-[11px] text-paper/40"
          >
            여기로 끌어와 새 조합 만들기
          </div>
        )}
      </div>

      {!winner && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] tracking-widest text-paper/50">내 패{editable && ' (끌어서 테이블에 올리기)'}</p>
            {editable && (
              <button type="button" onClick={() => setWs((w) => ({ ...w, hand: autoSortHand(w.hand) }))} className="flat-btn-ghost !py-0.5 text-[11px]">
                <Layers size={11} aria-hidden />
                손패 정렬
              </button>
            )}
          </div>
          <div ref={editable ? setZoneRef('hand') : undefined} className="mt-1.5 flex min-h-[2.5rem] flex-wrap gap-1 rounded-lg p-1" data-rummi-hand>
            {view.hand.map((t) => (
              <Tile key={t.id} tile={t} draggable={editable} onDragStart={beginDrag} hidden={dragVisual?.tile.id === t.id} />
            ))}
          </div>

          {touched && (
            <div className="mt-2">
              <button type="button" onClick={revert} className="flat-btn-ghost !py-1 text-xs">
                되돌리기
              </button>
            </div>
          )}

          {err && (
            <p className="mt-2 text-xs text-gold" role="alert">
              {err}
            </p>
          )}
          {strandedTable && <p className="mt-1 text-xs text-crimson">테이블에서 꺼낸 패가 아직 자리를 못 찾았다 — 다시 조합에 넣어야 한다.</p>}

          {editable && touched && (
            <button type="button" onClick={submit} className="flat-btn mt-2 !py-1 text-xs" disabled={incompleteMeld || strandedTable || needsJokerAssign}>
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

      {dragVisual && (
        <div className="pointer-events-none fixed z-[90]" style={{ left: dragVisual.x - 18, top: dragVisual.y - 18 }}>
          <Tile tile={dragVisual.tile} />
        </div>
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
