import { useState } from 'react'
import NpcDialog from './NpcDialog'
import { Rich } from './Scene'
import { AbandonButton, QuestGoal } from './QuestParts'
import { NPC_IDLE, QUEST_NPCS, RELAY_TARGETS, goalLine, npcActive, npcOffer, questExpired, questLine, questProgress, questReady, questState, relayPending, rewardLine } from '../game/quests'

const leftText = (ms) => {
  const h = Math.max(0, Math.floor(ms / 3600000))
  return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간 남음` : `${Math.max(1, h)}시간 남음`
}
const faceOf = (npc, face) => npc.faces[face] ?? npc.faces.plain ?? Object.values(npc.faces)[0]

/**
 * 메뉴 [의뢰]: 학교 사람들이 맡긴 부탁.
 *  - 위: NPC 다섯 명(단애 · 유민 · 해님 · 신아 · 이시). 한 사람이 하루에 한 건씩 부탁한다(매일 0시에 새로).
 *  - 아래: 받은 부탁 전부(바리 · NPC · 엑스트라). NPC · 엑스트라의 부탁은 여기서 건넨다. 바리의 부탁은 밤에 캠핑장에서.
 */
export default function QuestBoard({ player, onAct }) {
  const now = Date.now()
  const [npcId, setNpcId] = useState(QUEST_NPCS[0].id)
  const [said, setSaid] = useState({})
  const [err, setErr] = useState('')
  const [notes, setNotes] = useState({}) // last: 엑스트라 부탁을 끝낸 뒤의 지문
  const active = questState(player).active.filter((q) => !questExpired(q, now))
  const npc = QUEST_NPCS.find((n) => n.id === npcId)
  const mine = npcActive(player, npcId)
  const offer = mine ? null : npcOffer(player, npcId, now)
  const line = said[npcId] ?? (mine ? questLine(mine, player, 'progress') : offer ? questLine(offer, player, 'offer') : NPC_IDLE[npcId])

  const run = (op, payload, onOk) => {
    setErr('')
    const r = onAct(op, payload)
    if (r?.error) return setErr(r.error)
    onOk?.(r)
  }
  const say = (id, l) => setSaid((s) => ({ ...s, [id]: l }))
  const statusOf = (id) => {
    const m = npcActive(player, id)
    if (m && relayPending(m)) return { text: `${RELAY_TARGETS[m.relay.to]?.name ?? ''}에게 전하는 중` }
    if (m) return questReady(m, player) ? { text: m.relay ? '보고할 수 있다' : '건넬 수 있다', on: true } : { text: '진행 중' }
    return npcOffer(player, id, now) ? { text: '새 부탁', on: true } : { text: '오늘은 끝' }
  }
  const fromOf = (q) => (q.src === 'bari' ? '바리' : q.src === 'npc' ? QUEST_NPCS.find((n) => n.id === q.npc)?.name ?? '' : q.who)

  return (
    <section aria-label="의뢰" data-quest-board>
      <h2 className="font-serif text-2xl text-gold">의뢰</h2>
      <p className="mt-1 text-sm text-paper/65">학교 사람들이 맡기는 부탁. 한 사람이 하루에 한 건씩 부탁하고, 매일 0시에 새 부탁이 온다. 받은 부탁은 아래 목록에서 건넨다.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="부탁하는 사람">
        {QUEST_NPCS.map((n) => {
          const st = statusOf(n.id)
          return (
            <button
              key={n.id}
              type="button"
              data-quest-npc={n.id}
              aria-pressed={n.id === npcId}
              onClick={() => { setNpcId(n.id); setErr('') }}
              className={`tilt flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left ${n.id === npcId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/15'}`}
            >
              <img src={faceOf(n, 'plain')} alt="" className="npc-portrait size-9 shrink-0 rounded-lg bg-edge/10 object-cover object-top" draggable={false} />
              <span className="min-w-0">
                <span className="block text-sm text-paper">{n.name}</span>
                <span className={`block text-[10px] ${st.on ? 'text-gold' : 'text-paper/45'}`}>{st.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div data-quest-npc-panel={npcId}>
        <NpcDialog npc={npc.name} src={faceOf(npc, line?.face)} face={line?.face} dataNpc={npc.id}>
          <Rich text={line?.text ?? ''} />
        </NpcDialog>
        <p className="mt-1 text-[11px] text-paper/45">{npc.where}</p>
        {mine && <QuestGoal quest={mine} player={player} />}
        {!mine && offer && <QuestGoal quest={offer} player={player} />}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!mine && offer && (
            <button type="button" className="flat-btn" data-quest-accept={npcId} onClick={() => run('acceptNpc', { npc: npcId }, (r) => say(npcId, questLine(r.quest, r.player, 'accept')))}>
              부탁을 받는다
            </button>
          )}
          {mine && questReady(mine, player) && (
            <button type="button" className="flat-btn" data-quest-turnin={mine.uid} onClick={() => run('turnIn', { uid: mine.uid }, (r) => say(npcId, r.line))}>
              {mine.relay ? '보고한다' : '건넨다'}
            </button>
          )}
          {mine && <AbandonButton onConfirm={() => run('abandon', { uid: mine.uid }, () => say(npcId, NPC_IDLE[npcId]))} />}
        </div>
        {err && <p className="mt-2 text-xs text-crimson" role="alert">{err}</p>}
      </div>

      <h3 className="mt-6 font-serif text-lg text-gold">받은 부탁 <span className="font-sans text-xs text-paper/50">({active.length})</span></h3>
      {active.length === 0 && <p className="mt-2 text-sm text-paper/55">아직 받은 부탁이 없다. 위의 사람들이나 밤의 캠핑장에서 부탁을 받을 수 있다.</p>}
      <ul className="mt-2 space-y-2" data-quest-list>
        {active.map((q) => {
          const [have, n] = questProgress(q, player)
          const ready = questReady(q, player)
          return (
            <li key={q.uid} data-quest-uid={q.uid} data-quest-src={q.src} className="ink-panel rounded-xl px-3 py-2.5 text-xs leading-relaxed">
              <p className="text-paper/90">
                <span className="mr-1.5 rounded-full bg-gold/15 px-2 py-px text-[10px] text-gold">{fromOf(q)}</span>
                <span className="text-sm">{q.title}</span>
              </p>
              <p className="mt-1 text-paper/75">{goalLine(q.goal, q.relay)}</p>
              <p className="mt-0.5 text-paper/55">
                <span className={ready ? 'text-gold' : ''}>{q.relay && q.relayed ? '전했다' : `진행 ${have}/${n}`}</span> · 보상 {rewardLine(q.reward)}
                {q.until != null && <> · {leftText(q.until - now)}</>}
              </p>
              {q.src === 'bari' && <p className="mt-0.5 text-[11px] text-paper/45">캠핑장의 바리에게 건넨다 · 뒷산 · 산 탐사 · 오른길 · 오후 6시 ~ 오전 6시</p>}
              {relayPending(q) && <p className="mt-0.5 text-[11px] text-paper/45" data-relay-hint={q.relay.to}>{RELAY_TARGETS[q.relay.to]?.name}에게 직접 전한 뒤, 여기서 {fromOf(q)}에게 보고한다 · {RELAY_TARGETS[q.relay.to]?.where}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {q.src !== 'bari' && ready && (
                  <button
                    type="button"
                    className="flat-btn"
                    data-quest-turnin={q.uid}
                    onClick={() => run('turnIn', { uid: q.uid }, (r) => (q.src === 'npc' ? (setNpcId(q.npc), say(q.npc, r.line)) : setNotes((m) => ({ ...m, last: r.line?.text }))))}
                  >
                    {q.relay ? '보고한다' : '건넨다'}
                  </button>
                )}
                <AbandonButton onConfirm={() => run('abandon', { uid: q.uid })} />
              </div>
            </li>
          )
        })}
      </ul>
      {notes.last && <p className="mt-3 rounded-lg border border-gold/30 px-3 py-2 text-xs text-paper/85" data-quest-done-note>{notes.last}</p>}
    </section>
  )
}
