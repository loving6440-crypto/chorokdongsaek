import { useEffect, useState } from 'react'
import { HUNT_KINDS, HUNT_PATHS, HUNT_SITES, HUNT_SIZE, HUNT_SPECIES, siteMissingData } from '../../game/huntSites'
import { huntCooldownLeft, huntOdds } from '../../game/huntField'
import { itemOf } from '../../game/items'

const same = (a, b) => a?.x === b?.x && a?.y === b?.y
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const cellName = p => `${String.fromCharCode(65 + p.x)}${p.y + 1}`
const timeLeft = ms => `${Math.floor(Math.ceil(ms / 1000) / 60)}분 ${String(Math.ceil(ms / 1000) % 60).padStart(2, '0')}초`
const nameOf = node => node.name ?? HUNT_SPECIES[node.species]?.name ?? HUNT_KINDS[node.kind].label
const liveNode = node => node.kind === 'ghost' || (node.attemptsLeft ?? 3) > 0

export default function HuntField({ player, stats, onAction }) {
  const expedition = player.huntExpedition
  const running = expedition?.status === 'active'
  const [pathId, setPathId] = useState(() => expedition?.siteId.split('-')[0] ?? 'left')
  const [siteId, setSiteId] = useState(() => expedition?.siteId ?? 'left-trail-1')
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const site = HUNT_SITES[siteId]
  const current = expedition?.siteId === siteId ? expedition : null
  const active = current?.status === 'active'
  const nodes = current?.nodes ?? site?.nodes ?? []
  const position = current?.position ?? site?.start
  const focusCell = hovered ?? selected ?? position
  const points = nodes.filter(node => liveNode(node) && same(node, focusCell))
  const cooldown = huntCooldownLeft(player, siteId, now)
  const missing = siteMissingData(site)
  const act = action => onAction?.(action)
  const choosePath = id => {
    setPathId(id)
    setSiteId(`${id}-trail-1`)
    setSelected(null)
    setHovered(null)
  }
  const actionNodes = nodes.filter(node => liveNode(node) && node.kind !== 'ghost' &&
    (node.kind === 'obstacle' ? same(node, selected) && distance(node, position) === 1 : same(node, position)))
  const chooseCell = p => {
    setSelected(p)
    if (active && !current.encounter && distance(position, p) === 1 && !nodes.some(node => liveNode(node) && node.kind === 'obstacle' && same(node, p))) act({ type: 'move', position: p })
  }
  const move = (dx, dy) => {
    if (!active || current.encounter) return
    const p = { x: position.x + dx, y: position.y + dy }
    if (p.x < 0 || p.y < 0 || p.x >= HUNT_SIZE || p.y >= HUNT_SIZE) return
    setSelected(p)
    act({ type: 'move', position: p })
  }
  const onKey = event => {
    const delta = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[event.key]
    if (delta && !event.altKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      if (!event.repeat) move(...delta)
    }
  }

  return (
    <section className="mt-4" aria-label="타일 수렵">
      <div className="flex flex-wrap gap-2" role="group" aria-label="수렵 길 선택">
        {HUNT_PATHS.map(path => <button type="button" key={path.id} className="flat-chip border border-edge/20 px-4 py-2 text-sm disabled:opacity-40" aria-pressed={path.id === pathId} disabled={running && !expedition.siteId.startsWith(path.id + '-')} onClick={() => choosePath(path.id)}>{path.name}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="수렵 터 선택">
        {HUNT_PATHS.find(path => path.id === pathId).sites.map(spot => {
          const left = huntCooldownLeft(player, spot.id, now)
          const available = !!HUNT_SITES[spot.id]
          return <button type="button" key={spot.id} aria-pressed={spot.id === siteId} disabled={(running && spot.id !== expedition.siteId) || left > 0 || !available} title={left > 0 ? `${timeLeft(left)} 후에 다시 갈 수 있습니다` : available ? spot.name : '준비 중'} onClick={() => { setSiteId(spot.id); setSelected(null); setHovered(null) }} className="flat-chip border border-edge/20 px-4 py-2 text-xs disabled:opacity-40">
            {spot.name}{!available ? ' · 준비 중' : left > 0 ? ` · ${timeLeft(left)} 후` : ''}
          </button>
        })}
      </div>

      {site && <div className="ink-panel mt-4 rounded-md p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg text-gold">{HUNT_PATHS.find(path => path.id === pathId).name} · {site.name}</h3>
          {current && <p className="text-sm tabular-nums text-paper" aria-live="polite">남은 행동 <b>{Math.max(0, current.maxTurns - current.turn)}</b> / {current.maxTurns}턴{!active ? ' · 종료' : ''}</p>}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-paper/70">상하좌우로 한 칸 이동하거나 채집·수렵을 시도할 때 1턴을 씁니다. 각 대상은 성공·실패를 합쳐 3회 시도할 수 있습니다. 장애물은 옆 칸에서 채집합니다.</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-paper/80" aria-label="타일 범례">
          {Object.entries(HUNT_KINDS).map(([kind, style]) => <span className="inline-flex items-center gap-1" key={kind}><span className="inline-flex h-5 w-5 items-center justify-center border border-black/15" style={{ background: style.background, color: style.color }} aria-hidden="true">{style.symbol}</span>{style.label}</span>)}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-w-0">
            <div className="hunt-grid mx-auto w-full max-w-lg" role="group" aria-label="10 곱하기 10 수렵 지도" onKeyDown={onKey}>
              {Array.from({ length: HUNT_SIZE * HUNT_SIZE }, (_, index) => {
                const p = { x: index % HUNT_SIZE, y: Math.floor(index / HUNT_SIZE) }
                const occupants = nodes.filter(node => liveNode(node) && same(node, p)).sort((a, b) => ['ghost', 'spirit', 'animal', 'obstacle', 'plant'].indexOf(a.kind) - ['ghost', 'spirit', 'animal', 'obstacle', 'plant'].indexOf(b.kind))
                const node = occupants[0]
                const isPlayer = same(position, p)
                const style = HUNT_KINDS[isPlayer ? 'player' : node?.kind ?? 'empty']
                const label = occupants.map(n => `${nameOf(n)} · 적정 레벨 ${n.level ?? '미정'} · 남은 시도 ${n.kind === 'ghost' ? '전투' : n.attemptsLeft ?? 3}`).join(', ')
                return <button key={index} type="button" className="hunt-tile" data-hunt-cell={cellName(p)} data-kind={isPlayer ? 'player' : node?.kind ?? 'empty'} aria-label={`${cellName(p)} ${isPlayer ? '플레이어, ' : ''}${label || '빈 칸'}`} aria-pressed={same(selected, p)} title={`${cellName(p)} · ${isPlayer ? '플레이어 / ' : ''}${label || '빈 칸'}`} style={{ background: style.background, color: style.color }} onPointerMove={() => setHovered(p)} onMouseLeave={() => setHovered(null)} onFocus={() => { setSelected(p); setHovered(null) }} onClick={() => chooseCell(p)}>
                  <span aria-hidden="true">{style.symbol}</span>
                  {isPlayer && node && <span className="hunt-tile-under" aria-hidden="true">{HUNT_KINDS[node.kind].symbol}</span>}
                  {occupants.length > 1 && <span className="hunt-tile-under" aria-hidden="true">+{occupants.length - 1}</span>}
                </button>
              })}
            </div>
            <p className="mt-2 text-[11px] text-paper/60">인접한 칸 클릭 · 방향키 또는 WASD · 타일에 마우스를 올리거나 선택하면 상세 표시</p>
          </div>
          <div>
            <div className="min-h-28 rounded border border-edge/15 p-3 text-xs leading-relaxed text-paper/80" aria-live="polite" aria-label="타일 정보">
              <p className="font-bold text-paper">{focusCell ? cellName(focusCell) : '타일 정보'}</p>
              {points.length ? points.map(node => {
                const odds = Number.isFinite(node.level) && node.kind !== 'ghost' ? huntOdds(node.kind, node.level, stats) : null
                return <div key={node.id} className="mt-2"><p>{nameOf(node)} · {HUNT_KINDS[node.kind].label}</p><p>적정 레벨 {node.level ?? '미정'}</p>{node.kind === 'ghost' ? <p>만나면 별도 전투가 시작됩니다.</p> : <><p>남은 시도 {node.attemptsLeft ?? 3}회</p>{odds && <p>내 산출값 {odds.value}<br />성공 {odds.success}%{node.kind !== 'spirit' && <> · 보너스 {odds.bonus}%</>}</p>}</>}</div>
              }) : <p className="mt-2">{same(focusCell, position) ? '현재 내 위치입니다.' : '아무것도 없는 빈 칸입니다.'}</p>}
            </div>
            {active && <>
              <div className="mx-auto mt-3 grid w-36 grid-cols-3 gap-1" role="group" aria-label="수렵 이동">
                {[[0, -1, '↑', '위', 2], [-1, 0, '←', '왼쪽', 1], [0, 1, '↓', '아래', 2], [1, 0, '→', '오른쪽', 3]].map(([dx, dy, symbol, name, col], i) => <button key={name} type="button" className="flat-btn justify-center" style={{ gridColumn: col, gridRow: i === 0 ? 1 : 2 }} aria-label={`${name}로 한 칸 이동`} disabled={!!current.encounter} onClick={() => move(dx, dy)}>{symbol}</button>)}
              </div>
              {actionNodes.length ? actionNodes.map(node => <button key={node.id} type="button" className="flat-btn mt-3 w-full justify-center text-xs disabled:opacity-40" disabled={!!current.encounter} onClick={() => act({ type: 'attempt', nodeId: node.id })}>{nameOf(node)} {node.kind === 'animal' || node.kind === 'spirit' ? '수렵' : '채집'} (1턴)</button>) : <button type="button" className="flat-btn mt-3 w-full justify-center text-xs disabled:opacity-40" disabled>대상 칸으로 이동 (1턴)</button>}
              <button type="button" className="flat-btn mt-2 w-full justify-center text-xs" disabled={!!current.encounter} onClick={() => act({ type: 'leave' })}>수렵 마치기</button>
            </>}
            {!active && <button type="button" className="flat-btn mt-3 w-full justify-center text-sm disabled:opacity-40" disabled={missing.length > 0 || cooldown > 0 || running} onClick={() => act({ type: 'enter', siteId })}>{cooldown > 0 ? `${timeLeft(cooldown)} 후에 다시 갈 수 있습니다` : missing.length ? '개방 준비 중' : '터에 들어가기'}</button>}
          </div>
        </div>
        {current && <>
          <p className="mt-4 text-xs text-gold">획득: {Object.entries(current.rewards).map(([id, qty]) => `${itemOf(id)?.name ?? id} ${qty}개`).join(', ') || '아직 없음'}{current.spiritGained > 0 ? ` · 영력 +${current.spiritGained}` : ''}</p>
          <ol className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-paper/70" aria-label="수렵 기록" aria-live="polite">{current.log.map((text, i) => <li key={i}>{text}</li>)}</ol>
        </>}
      </div>}
      {!site && <p className="mt-4 text-sm text-paper/65">이 길의 수렵 터는 준비 중입니다.</p>}
    </section>
  )
}
