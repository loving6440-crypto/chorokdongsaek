import { useState } from 'react'
import NpcDialog from './NpcDialog'
import { Rich } from './Scene'
import { BARI_LINES, BARI_NPC, RELAY_TARGETS, bariActive, bariOffer, canRelay, goalLine, questLine, questProgress, questReady, relayButton, relayCaption, relayPending, relaysFor, rewardLine } from '../game/quests'

/** 부탁 내용 칸: 목표 · 진행 · 보상 */
export function QuestGoal({ quest, player, note }) {
  const [have, n] = quest.uid ? questProgress(quest, player) : [null, quest.goal?.n ?? 1]
  return (
    <div className="mt-3 rounded-xl bg-shade/25 px-3 py-2 text-xs leading-relaxed" data-quest-goal={quest.tpl}>
      <p className="text-paper/90">
        <span className="mr-1.5 text-gold">[{quest.title}]</span>
        {goalLine(quest.goal, quest.relay)}
      </p>
      <p className="mt-0.5 text-paper/60">
        {have != null && <span data-quest-have className={have >= n ? 'text-gold' : ''}>{quest.relay && quest.relayed ? '전했다' : `진행 ${have}/${n}`} · </span>}
        보상 {rewardLine(quest.reward)}
      </p>
      {note && <p className="mt-0.5 text-[11px] text-paper/45">{note}</p>}
    </div>
  )
}

/** 두 번 눌러야 그만두는 버튼(브라우저 확인 창을 쓰지 않는다) */
export function AbandonButton({ onConfirm, label = '그만둔다' }) {
  const [ask, setAsk] = useState(false)
  if (!ask) return <button type="button" data-quest-abandon className="flat-chip" onClick={() => setAsk(true)}>{label}</button>
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-paper/70" data-quest-abandon-ask>
      정말 그만둘까?
      <button type="button" className="flat-chip !text-crimson" data-quest-abandon-yes onClick={() => { setAsk(false); onConfirm() }}>그만둔다</button>
      <button type="button" className="flat-chip" onClick={() => setAsk(false)}>아니</button>
    </span>
  )
}

/**
 * 전하기: 다른 사람이 맡긴 물건을 이 사람(to)에게 직접 건넨다. (해님 → 바리, 신아 → 단애)
 * 건네면 받은 사람의 반응 대사를 onDone(line)으로 넘긴다. 그 뒤 [의뢰]에서 부탁한 사람에게 보고한다.
 */
export function RelayButtons({ player, to, act, onDone }) {
  const [err, setErr] = useState('')
  const list = relaysFor(player, to)
  if (!list.length) return null
  return (
    <div className="mt-3 space-y-2" data-relay={to}>
      {list.map((q) => {
        const ok = canRelay(q, player)
        const [have, n] = questProgress(q, player)
        return (
          <div key={q.uid} className="rounded-xl bg-gold/10 px-3 py-2 text-xs leading-relaxed">
            <p className="text-paper/70">{relayCaption(q)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flat-btn"
                data-relay-give={q.uid}
                disabled={!ok}
                onClick={() => {
                  setErr('')
                  const r = act('relay', { uid: q.uid, to })
                  if (r?.error) return setErr(r.error)
                  onDone?.(r.line)
                }}
              >
                {relayButton(q, player)}
              </button>
              {!ok && <span className="text-paper/50">가진 개수 {have}/{n} · 모자란다</span>}
            </div>
          </div>
        )
      })}
      {err && <p className="text-xs text-crimson" role="alert">{err}</p>}
    </div>
  )
}

const bariSrc = (face) => BARI_NPC.faces[face] ?? BARI_NPC.faces.plain

/**
 * 캠핑장 · 바리에게 말을 건다 → 도깨비 퀘스트.
 * 하룻밤(오후 6시 ~ 오전 6시)에 한 건. 받은 부탁은 바리에게 직접 건넨다.
 */
export function BariQuest({ player, act }) {
  const [said, setSaid] = useState(null)
  const [err, setErr] = useState('')
  const now = Date.now()
  const active = bariActive(player)
  const offer = active ? null : bariOffer(player, now)
  const ready = !!active && questReady(active, player)
  const line =
    said ??
    (active
      ? ready
        ? { face: 'surprise', text: '“앗, 벌써 해 주셨어요? 정말요?”' }
        : questLine(active, player, 'progress')
      : offer
        ? questLine(offer, player, 'offer')
        : BARI_LINES.doneTonight)
  const run = (op, payload, onOk) => {
    setErr('')
    const r = act('quest', { op, ...payload })
    if (r?.error) {
      if (/소지품이 가득/.test(r.error)) setSaid(BARI_LINES.full)
      setErr(r.error)
      return
    }
    onOk(r)
  }
  return (
    <div data-bari-quest={active ? (ready ? 'ready' : 'active') : offer ? 'offer' : 'done'}>
      <NpcDialog npc={BARI_NPC.name} src={bariSrc(line?.face)} face={line?.face} dataNpc="bari">
        <Rich text={line?.text ?? ''} />
      </NpcDialog>
      {active && <QuestGoal quest={active} player={player} note="바리의 부탁은 캠핑장의 바리에게 건넨다. (오후 6시 ~ 오전 6시)" />}
      {!active && offer && <QuestGoal quest={offer} player={player} note="하룻밤에 한 건. 도깨비 증표 10개는 무구보관소에서 무구 한 벌로 바꿀 수 있다." />}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!active && offer && (
          <>
            <button type="button" className="flat-btn" data-bari-accept onClick={() => run('acceptBari', {}, (r) => setSaid(questLine(r.quest, r.player, 'accept')))}>
              맡는다
            </button>
            <button type="button" className="flat-chip" data-bari-decline onClick={() => setSaid(BARI_LINES.declined)}>
              다음에요
            </button>
          </>
        )}
        {ready && (
          <button type="button" className="flat-btn" data-bari-turnin onClick={() => run('turnIn', { uid: active.uid, via: 'bari' }, (r) => setSaid(r.line))}>
            부탁을 마친다
          </button>
        )}
        {active && <AbandonButton onConfirm={() => run('abandon', { uid: active.uid }, () => setSaid(BARI_LINES.abandoned))} />}
      </div>
      <RelayButtons player={player} to="bari" act={(op, payload) => act('quest', { op, ...payload })} onDone={(l) => l && setSaid(l)} />
      {err && <p className="mt-2 text-xs text-crimson" role="alert">{err}</p>}
    </div>
  )
}
