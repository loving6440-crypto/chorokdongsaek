import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { SHRINE_AREAS, SHRINE_SIGN_INSIGHT, SIGN_READ, SIGN_UNREADABLE, canReadSign, shrineOpen } from '../../game/shrineExplore'
import Scene from '../Scene'
import { pickNpcLine } from '../../game/npcLines'
import { ISHI } from '../../game/shrine'
import LocationIntro from '../LocationIntro'
import NpcDialog from '../NpcDialog'
import NpcGift from '../NpcGift'

/** 사당 문지기 이시와의 대화. 말을 걸 때마다 대사가 하나씩 나온다. */
function Guard({ player, onMeet, onLineSeen, onGiveNpc }) {
  const [talk, setTalk] = useState(null) // { line, firstOf }
  const speak = () => {
    const r = pickNpcLine(ISHI.id, ISHI.lines, player, player.lineSeen)
    setTalk(r)
    onMeet?.(ISHI.id)
    if (r.firstOf) onLineSeen?.(ISHI.id, r.firstOf)
  }
  return (
    <section aria-label="문지기와 대화">
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">문지기와 대화</p>
        <p className="mt-3 text-sm leading-[1.9] break-keep text-paper/85" data-ishi-intro>
          {ISHI.intro}
        </p>
        <button type="button" onClick={speak} className="flat-btn mt-4">
          <MessageCircle size={15} aria-hidden />
          {talk ? '다시 말을 건다' : ISHI.button}
        </button>
      </div>
      {talk && (
        <>
          <p className="mt-4 text-xs leading-relaxed text-paper/60 italic" data-ishi-appear>
            {ISHI.appear}
          </p>
          <NpcDialog npc={ISHI.name} src={ISHI.portrait} dataNpc="ishi">
            {talk.line.text}
          </NpcDialog>
          <NpcGift npcId={ISHI.id} player={player} onGive={onGiveNpc} />
        </>
      )}
    </section>
  )
}

/** 표지판: 안목 20 이상이면 아래 글자가 읽히고, 읽은 그때부터 [사당 탐사]가 열린다. */
function Sign({ player, onExploreAct }) {
  const insight = player.stats.insight
  const readable = canReadSign(player.stats)
  const [opened, setOpened] = useState(false)
  useEffect(() => {
    if (!readable) return
    const r = onExploreAct?.('shrineSign', {})
    if (r?.first) setOpened(true)
  }, [readable]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section>
      <div className="ink-panel w-full rounded-md p-5" data-shrine-sign={readable ? 'read' : 'locked'}>
        <p className="text-[10px] tracking-[0.25em] text-yellow-500/80 light:text-yellow-700">표지판</p>
        <p className="mt-3 text-sm leading-[1.9] break-keep text-paper/85">{readable ? SIGN_READ : `⚠️ ${SIGN_UNREADABLE}`}</p>
        {readable && (
          <p className="mt-3 rounded-lg border border-gold/30 px-3 py-2 text-xs text-gold" data-shrine-open>
            {opened ? '[사당 탐사]가 열렸다. 위쪽 활동 칸에서 들어갈 수 있다.' : '[사당 탐사]에서 문전부터 봉인각까지 둘러볼 수 있다.'}
          </p>
        )}
        <p className="mt-4 text-[11px] text-paper/40">
          안목 {insight} / 해금 {SHRINE_SIGN_INSIGHT}
        </p>
      </div>
    </section>
  )
}

/** 사당 탐사: 문전 → 내당 → 뒤뜰 → 봉인각. */
function ShrineExplore({ player, onExploreAct, onEnter, onInvestigate, onVisit }) {
  const [areaId, setAreaId] = useState(null)
  const [visit, setVisit] = useState(0)
  const area = SHRINE_AREAS.find((a) => a.id === areaId)
  if (!shrineOpen(player)) {
    return (
      <div className="ink-panel w-full rounded-md p-5">
        <p className="text-sm leading-relaxed text-paper/80">아직 표지판의 글자를 읽지 못했다. 이시가 앞을 가로막는다.</p>
      </div>
    )
  }
  const act = (kind, payload) => {
    if (kind === 'goto') return onEnter?.(payload.location)
    return onExploreAct?.(kind, payload) ?? {}
  }
  const ctx = { stats: player.stats, player, name: player.name, act }
  return (
    <section aria-label="사당 탐사" data-shrine-explore>
      <h2 className="font-serif text-2xl text-gold">사당 탐사</h2>
      <p className="mt-1 text-sm text-paper/65">이시가 한 발 물러서 준 길. 둘러볼 곳을 고른다.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="사당 구역">
        {SHRINE_AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={a.id === areaId}
            data-shrine-area={a.id}
            onClick={() => {
              setAreaId(a.id)
              setVisit((v) => v + 1)
              onVisit?.(`shrine:${a.id}`)
            }}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${a.id === areaId ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {a.name}
          </button>
        ))}
      </div>
      {area && (
        <div className="ink-panel mt-4 w-full rounded-xl p-5" aria-live="polite">
          <p className="mb-2 text-[11px] tracking-widest text-gold">사당 · {area.name}</p>
          <Scene
            key={`${area.id}:${visit}`}
            root={area}
            ctx={ctx}
            scope={`shrine:${area.id}`}
            onHome={() => setAreaId(null)}
            onOpen={(c, depth) => depth === 1 && onVisit?.(`shrine:${area.id}:${c.id}`)}
            onShow={(node, paras) => paras.length && onInvestigate?.(area.name, node.name, paras.join(' ').replace(/\*+|~~/g, ''))}
          />
        </div>
      )}
    </section>
  )
}

export default function Shrine({ view, player, onMeet, onLineSeen, onGiveNpc, onExploreAct, onEnter, onInvestigate, onVisit }) {
  if (view === 'intro') return <LocationIntro id="shrine" />
  if (view === 'guard') return <Guard key="guard" player={player} onMeet={onMeet} onLineSeen={onLineSeen} onGiveNpc={onGiveNpc} />
  if (view === 'explore') return <ShrineExplore player={player} onExploreAct={onExploreAct} onEnter={onEnter} onInvestigate={onInvestigate} onVisit={onVisit} />
  return <Sign player={player} onExploreAct={onExploreAct} />
}
