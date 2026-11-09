import { useEffect, useState } from 'react'
import { HUNT_KINDS, HUNT_PATHS, HUNT_SITES, HUNT_SIZE, HUNT_SPECIES, siteMissingData } from '../../game/huntSites'
import { huntBuffsOf, huntCooldownLeft, huntOddsNow } from '../../game/huntField'
import { isHuntItem, itemOf } from '../../game/items'
import ItemIcon from '../ItemIcon'

const same = (a, b) => a?.x === b?.x && a?.y === b?.y
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const cellName = p => `${String.fromCharCode(65 + p.x)}${p.y + 1}`
const timeLeft = ms => `${Math.floor(Math.ceil(ms / 1000) / 60)}분 ${String(Math.ceil(ms / 1000) % 60).padStart(2, '0')}초`
const nameOf = node => node.name ?? HUNT_SPECIES[node.species]?.name ?? HUNT_KINDS[node.kind].label
const liveNode = node => node.kind === 'ghost' || (node.attemptsLeft ?? 3) > 0

export default function HuntField({ player, stats, onAction, disabledActions = false, showItems = true }) {
  const expedition = player.huntExpedition
  const running = expedition?.status === 'active'
  const [pathId, setPathId] = useState(() => {
    const saved = expedition?.siteId?.split('-')[0]
    return HUNT_PATHS.some(path => path.id === saved) ? saved : 'left'
  })
  const [siteId, setSiteId] = useState(() => HUNT_SITES[expedition?.siteId] ? expedition.siteId : 'left-trail-1')
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [now, setNow] = useState(Date.now)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pickItem, setPickItem] = useState(null) // v-B.16 개척 아이템 칸에서 고른 아이템 id
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
  const hasInformation = points.length > 0 || (active && same(focusCell, position))
  const cooldown = huntCooldownLeft(player, siteId, now)
  const missing = siteMissingData(site)
  const act = action => !disabledActions && onAction?.(action)
  // v-B.16: 소지품의 #개척 아이템은 이동 버튼 아래 칸에 저절로 들어간다(개수 제한 없음).
  const huntItems = showItems ? Object.entries(player.inventory ?? {}).filter(([id, n]) => n > 0 && isHuntItem(itemOf(id))).map(([id, n]) => ({ item: itemOf(id), n })) : []
  const pickedItem = huntItems.find(x => x.item.id === pickItem) ?? null
  const huntBuffs = huntBuffsOf(current)
  const oddsOf = node => huntOddsNow(current ? player : { ...player, huntExpedition: null }, node.kind, node.level, stats)
  const choosePath = id => {
    setPathId(id)
    setSiteId(`${id}-trail-1`)
    setSelected(null)
    setHovered(null)
  }
  const actionNodes = nodes.filter(node => liveNode(node) && node.kind !== 'ghost' &&
    (node.kind === 'obstacle' ? same(node, selected) && distance(node, position) === 1 : same(node, position)))
  const chooseCell = p => {
    // 타일 클릭은 정보 선택만 처리한다. 플레이어 이동은 반드시 방향 버튼에서만 발생한다.
    setSelected(p)
  }
  const move = (dx, dy) => {
    if (disabledActions || !active || current.encounter) return
    const p = { x: position.x + dx, y: position.y + dy }
    if (p.x < 0 || p.y < 0 || p.x >= HUNT_SIZE || p.y >= HUNT_SIZE) return
    setSelected(p)
    act({ type: 'move', position: p })
  }


  return (
    <section className="mt-4" aria-label="타일 수렵">
      <div className="flex flex-wrap gap-2" role="group" aria-label="개척 구역 선택">
        {HUNT_PATHS.map(path => <button type="button" key={path.id} className="flat-chip border border-edge/20 px-4 py-2 text-sm disabled:opacity-40" aria-pressed={path.id === pathId} disabled={running && !expedition.siteId.startsWith(path.id + '-')} onClick={() => choosePath(path.id)}>{path.name}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="개척 터 선택">
        {HUNT_PATHS.find(path => path.id === pathId).sites.map(spot => {
          const left = huntCooldownLeft(player, spot.id, now)
          const available = !!HUNT_SITES[spot.id]
          return <button type="button" key={spot.id} aria-pressed={spot.id === siteId} disabled={(running && spot.id !== expedition.siteId)} title={available ? spot.name : '아직 접근할 수 없습니다.'} onClick={() => { setSiteId(spot.id); setSelected(null); setHovered(null) }} className="flat-chip border border-edge/20 px-4 py-2 text-xs disabled:opacity-40">
            {spot.name}{!available ? ' · 접근 불가' : left > 0 ? ` · ${timeLeft(left)} 후` : ''}
          </button>
        })}
      </div>

      {site && <div className="ink-panel mt-4 rounded-md p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg text-gold">{HUNT_PATHS.find(path => path.id === pathId).name} · {site.name}</h3>
          {current && <p className="text-sm tabular-nums text-paper" aria-live="polite">남은 행동 <b>{Math.max(0, current.maxTurns - current.turn)}</b> / {current.maxTurns}턴{!active ? ' · 종료' : ''}</p>}
        </div>
        {site.theme && <p className="mt-1 text-xs leading-relaxed text-paper/65" data-site-note>{site.theme} — {site.note} <span className="text-paper/45">(관련 스탯 평균 {site.targetStat} 안팎이면 수월하다. 영물: {(site.spirits ?? []).map((sp) => `${sp.name} ${Math.round(sp.chance * 100)}%`).join(' · ')} · 요괴: {site.ghost?.name})</span></p>}
        <p className="mt-2 text-xs leading-relaxed text-paper/70">상하좌우로 한 칸 이동하거나 채집·수렵을 시도할 때 1턴을 씁니다. 각 대상은 성공·실패를 합쳐 3회 시도할 수 있습니다. 장애물은 옆 칸에서 채집합니다.</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-paper/80" aria-label="타일 범례">
          {Object.entries(HUNT_KINDS).map(([kind, style]) => <span className="inline-flex items-center gap-1" key={kind}><span className="inline-flex h-5 w-5 items-center justify-center border border-black/15" style={{ background: style.background, color: style.color }} aria-hidden="true">{style.symbol}</span>{style.label}</span>)}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-w-0">
            <div className="hunt-grid mx-auto w-full max-w-lg" role="group" aria-label="10 곱하기 10 개척 지도">
              {Array.from({ length: HUNT_SIZE * HUNT_SIZE }, (_, index) => {
                const p = { x: index % HUNT_SIZE, y: Math.floor(index / HUNT_SIZE) }
                const occupants = nodes.filter(node => liveNode(node) && same(node, p)).sort((a, b) => ['ghost', 'spirit', 'animal', 'obstacle', 'plant'].indexOf(a.kind) - ['ghost', 'spirit', 'animal', 'obstacle', 'plant'].indexOf(b.kind))
                const node = occupants[0]
                const isPlayer = active && same(position, p)
                const style = HUNT_KINDS[isPlayer ? 'player' : node?.kind ?? 'empty']
                const label = occupants.map(n => `${nameOf(n)} · 적정 레벨 ${n.level ?? '미정'} · 남은 시도 ${n.kind === 'ghost' ? '전투' : n.attemptsLeft ?? 3}`).join(', ')
                return <button key={index} type="button" className="hunt-tile" data-hunt-cell={cellName(p)} data-kind={isPlayer ? 'player' : node?.kind ?? 'empty'} aria-label={`${cellName(p)} ${isPlayer ? '플레이어, ' : ''}${label || '빈 칸'}`} aria-pressed={same(selected, p)} title={(node || isPlayer) ? `${cellName(p)} · ${isPlayer && active ? '플레이어 / ' : ''}${label}` : undefined} style={{ background: style.background, color: style.color }} onPointerEnter={() => setHovered(p)} onMouseLeave={() => setHovered(null)} onFocus={() => { setSelected(p); setHovered(null) }} onClick={() => chooseCell(p)}>
                  <span aria-hidden="true">{style.symbol}</span>
                  {isPlayer && active && node && <span className="hunt-tile-under" aria-hidden="true">{HUNT_KINDS[node.kind].symbol}</span>}
                  {occupants.length > 1 && <span className="hunt-tile-under" aria-hidden="true">+{occupants.length - 1}</span>}
                </button>
              })}
            </div>
            <p className="mt-2 text-[11px] text-paper/60">이동은 오른쪽 방향 버튼으로만 가능 · 타일 클릭/마우스오버는 정보 확인</p>
          </div>
          <div>

            {active && <>
              <div className="mx-auto grid w-36 grid-cols-3 gap-1" role="group" aria-label="개척 방향 버튼">
                {[[0, -1, '↑', '위', 2], [-1, 0, '←', '왼쪽', 1], [0, 1, '↓', '아래', 2], [1, 0, '→', '오른쪽', 3]].map(([dx, dy, symbol, name, col], i) => <button key={name} type="button" className="flat-btn justify-center" style={{ gridColumn: col, gridRow: i === 0 ? 1 : 2 }} aria-label={`${name}로 한 칸 이동`} disabled={disabledActions || !!current.encounter} onClick={() => move(dx, dy)}>{symbol}</button>)}
              </div>
              {showItems && <div className="mt-3 rounded border border-edge/15 p-2" aria-label="개척 아이템" data-hunt-items>
                <p className="text-[11px] text-paper/65">개척 아이템 <span className="text-paper/40">· #개척 · 쓸 때 턴을 쓰지 않는다</span></p>
                {huntBuffs.length > 0 && <p className="mt-1 text-[10px] leading-snug text-gold" data-hunt-buffs>{huntBuffs.map(b => b.text).join(' · ')}</p>}
                {huntItems.length ? <ul className="mt-1.5 grid grid-cols-4 gap-1">{huntItems.map(({ item, n }) => <li key={item.id}>
                  <button type="button" data-hunt-item={item.id} aria-pressed={pickItem === item.id} title={`${item.name} ×${n} — ${item.effectText}`} aria-label={`${item.name} ${n}개`} disabled={disabledActions || !!current.encounter} onClick={() => setPickItem(pickItem === item.id ? null : item.id)} className={`relative flex w-full flex-col items-center rounded p-1 disabled:opacity-40 ${pickItem === item.id ? 'bg-gold-fill/20 ring-1 ring-gold/60' : 'hover:bg-gold-fill/10'}`}>
                    <ItemIcon item={item} size={30} />
                    <span className="mt-0.5 w-full truncate text-center text-[9px] text-paper/75">{item.name}</span>
                    <span className="absolute right-0 top-0 rounded bg-shade/85 px-1 text-[9px] tabular-nums text-paper">{n}</span>
                  </button>
                </li>)}</ul> : <p className="mt-1 text-[11px] text-paper/45">소지품에 #개척 아이템이 없다. (공작소 · 조리실에서 만든다)</p>}
                {pickedItem && <div className="mt-2 border-t border-edge/15 pt-2" data-hunt-item-detail>
                  <p className="text-xs text-paper">{pickedItem.item.name} <span className="text-paper/50">×{pickedItem.n}</span></p>
                  <p className="mt-0.5 text-[11px] leading-snug text-paper/70">{pickedItem.item.effectText}</p>
                  <button type="button" className="flat-btn mt-1.5 w-full justify-center text-xs" data-hunt-item-use disabled={disabledActions || !!current.encounter} onClick={() => { act({ type: 'item', itemId: pickedItem.item.id }); if (pickedItem.n <= 1) setPickItem(null) }}>사용하기</button>
                </div>}
              </div>}
              <div className="mt-3 h-[5.5rem] overflow-y-auto flex flex-col justify-start gap-1" aria-label="개척 채집 버튼">{actionNodes.length ? actionNodes.map(node => <button key={node.id} type="button" className="flat-btn mt-3 w-full justify-center text-xs disabled:opacity-40" disabled={disabledActions || !!current.encounter || oddsOf(node).blocked} onClick={() => act({ type: 'attempt', nodeId: node.id })}>{nameOf(node)} {node.kind === 'animal' || node.kind === 'spirit' ? '수렵' : '채집'} (1턴)</button>) : <button type="button" className="flat-btn mt-3 w-full justify-center text-xs disabled:opacity-40" disabled>채집·수렵 대상 없음</button>}
              </div><button type="button" className="flat-btn mt-2 w-full justify-center text-xs" disabled={disabledActions || !!current.encounter} onClick={() => setConfirmLeave(true)}>개척 그만두기</button>
            </>}
            {!active && <button type="button" className="flat-btn w-full justify-center text-sm disabled:opacity-40" disabled={disabledActions || missing.length > 0 || running || player.mp < 10} onClick={() => act({ type: 'enter', siteId })}>{missing.length ? '개방 준비 중' : player.mp < 10 ? '의지력 10이 필요합니다' : '개척 시작하기 (의지력 10)'}</button>}
            <div className="mt-4 border-t border-edge/15 pt-3"><div className="min-h-28 rounded border border-edge/15 p-3 text-xs leading-relaxed text-paper/80" aria-live="polite" aria-label="타일 정보">
              {hasInformation && <p className="font-bold text-paper">{focusCell ? cellName(focusCell) : '타일 정보'}</p>}
              {hasInformation && (points.length ? points.map(node => {
                const odds = Number.isFinite(node.level) && node.kind !== 'ghost' ? oddsOf(node) : null
                return <div key={node.id} className="mt-2"><p>{nameOf(node)} · {HUNT_KINDS[node.kind].label}</p><p>적정 레벨 {node.level ?? '미정'}</p>{node.kind === 'ghost' ? <p>만나면 별도 전투가 시작됩니다.</p> : <><p>남은 시도 {node.attemptsLeft ?? 3}회</p>{odds && <p>내 산출값 {odds.value} <span className="text-paper/60">({odds.formula})</span><br />{odds.blocked ? '수렵 불가 (레벨 차이 15 이상)' : `성공 ${odds.success}%${odds.extra ? ` (보정 +${odds.extra}%)` : ''}`}{odds.fixed && <><br />수렵 레벨이 많이 차이납니다.</>}{node.kind !== 'spirit' && <> · 보너스 {odds.bonus}%</>}</p>}</>}</div>
              }) : <p className="mt-2">현재 내 위치입니다.</p>)}
            </div></div>
          </div>
        </div>
        {current && <>
          <p className="mt-4 text-xs text-gold">획득: {Object.entries(current.rewards).map(([id, qty]) => `${itemOf(id)?.name ?? id} ${qty}개`).join(', ') || '아직 없음'}{current.spiritGained > 0 ? ` · 영력 +${current.spiritGained}` : ''}</p>
          <ol className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-paper/70" aria-label="개척 기록" aria-live="polite">{current.log.map((text, i) => <li key={i}>{text}</li>)}</ol>
        </>}
      </div>}
      {confirmLeave && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4" role="alertdialog" aria-modal="true"><div className="ink-panel w-full max-w-sm rounded-xl p-5 text-center"><p>개척을 종료하시겠습니까?</p><div className="mt-4 flex justify-center gap-3"><button type="button" className="flat-btn" onClick={()=>{setConfirmLeave(false);act({type:'leave'})}}>종료</button><button type="button" className="flat-btn" onClick={()=>setConfirmLeave(false)}>취소</button></div></div></div>}
      {!site && <p className="mt-4 text-sm text-paper/65">아직 접근할 수 없습니다.</p>}
    </section>
  )
}
