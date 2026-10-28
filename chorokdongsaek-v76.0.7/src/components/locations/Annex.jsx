import { useEffect, useState } from 'react'
import LocationIntro from '../LocationIntro'
import { ANNEX_FLOORS } from '../../game/annex'
import { DANAE } from '../../game/danae'
import { pickNpcLine } from '../../game/npcLines'
import NpcDialog from '../NpcDialog'
import NpcGift from '../NpcGift'
import ClubRoomPanel from '../ClubRoomPanel'
import BoardGames from './BoardGames'
import Workshop from './Workshop'
import Cooking from './Cooking'

/** **굵게**(눌러볼 수 있는 단서) 표기를 꾸밈으로 바꾼다. (Explore.jsx 의 Rich 와 같은 규칙) */
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((t, i) =>
    t.startsWith('**') ? (
      <b key={i} className="font-semibold text-paper">{t.slice(2, -2)}</b>
    ) : (
      t
    ),
  )
}

const Flavor = ({ paras }) =>
  paras.map((t, i) => (
    <p key={i} className={`text-sm leading-[1.9] break-keep text-paper/90 ${i ? 'mt-3' : ''}`}>
      <Rich text={t} />
    </p>
  ))

/** 공작소: 제작 / 미술 동아리 (오단애는 조리실로 자리를 옮겼다) */
function CraftRoom({ player, admin, onCraft, onStopCraft, myClub, onApplyClub, onFetchMembers }) {
  const [tab, setTab] = useState('craft') // craft | club

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="공작소 활동">
        {[
          ['craft', '제작하기'],
          ['club', '미술 동아리'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'craft' ? (
        <Workshop player={player} admin={admin} onCraft={onCraft} onStopCraft={onStopCraft} />
      ) : (
        <ClubRoomPanel clubId="craft" myClub={myClub} onApply={onApplyClub} onFetchMembers={onFetchMembers} />
      )}
    </div>
  )
}

/** 패 놀이터: 놀이하기 / 판놀이 동아리 */
function BoardRoom({ player, admin, onHoljjak, myClub, onApplyClub, onFetchMembers }) {
  const [tab, setTab] = useState('play')
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="패 놀이터 활동">
        {[
          ['play', '놀이하기'],
          ['club', '판놀이 동아리'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'play' ? (
        <BoardGames player={player} admin={admin} onHoljjak={onHoljjak} />
      ) : (
        <ClubRoomPanel clubId="board" myClub={myClub} onApply={onApplyClub} onFetchMembers={onFetchMembers} />
      )}
    </div>
  )
}

/** 조리실: 조리(단애와 함께) / 요리 동아리 */
function CookRoom({ player, admin, onCook, onMeet, onLineSeen, onGiveNpc, myClub, onApplyClub, onFetchMembers }) {
  const [tab, setTab] = useState('cook')
  const [{ line }] = useState(() => pickNpcLine(DANAE.id, DANAE.lines, player, player.lineSeen))
  useEffect(() => {
    onMeet?.('danae')
  }, [onMeet])

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="조리실 활동">
        {[
          ['cook', '조리하기'],
          ['club', '요리 동아리'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'cook' ? (
        <>
          <NpcDialog npc={DANAE.name} src={DANAE.faces[line.face ?? 'plain']} face={line.face} dataNpc="danae">
            {line.text}
          </NpcDialog>
          <NpcGift npcId="danae" player={player} onGive={onGiveNpc} />
          <Cooking player={player} admin={admin} onCook={onCook} />
        </>
      ) : (
        <ClubRoomPanel clubId="cook" myClub={myClub} onApply={onApplyClub} onFetchMembers={onFetchMembers} />
      )}
    </div>
  )
}

/** 동아리 부실만 있는 방(음악실 · 방송실 · 서적실 · 다도실 · 정원): 방 소개 + 동아리. */
function ClubOnlyRoom({ room, myClub, onApplyClub, onFetchMembers }) {
  return <ClubRoomPanel clubId={room.club} myClub={myClub} onApply={onApplyClub} onFetchMembers={onFetchMembers} />
}

/** 별관 탐사: 층 → 방 순으로 살핀다. 2층 공작소 · 패 놀이터는 전용 화면을, 그 외 동아리 방은 공용 동아리 화면을 더 보여 준다. */
export default function Annex({ view, player, admin, onCraft, onStopCraft, onCook, onMeet, onLineSeen, onGiveNpc, onHoljjak, myClub, onApplyClub, onFetchMembers, onVisit }) {
  const [floorId, setFloorId] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const floor = ANNEX_FLOORS.find((f) => f.id === floorId)
  const room = floor?.rooms.find((r) => r.id === roomId)

  if (view === 'intro') return <LocationIntro id="annex" />

  const pickFloor = (id) => {
    setFloorId(id)
    setRoomId(null)
  }
  const pickRoom = (r) => {
    setRoomId(r.id)
    onVisit?.(`annex:${floor.id}:${r.id}`)
  }

  return (
    <section aria-label="별관 탐사">
      <h2 className="font-serif text-2xl text-gold">별관 탐사</h2>
      <p className="mt-1 text-sm text-paper/65">층을 고르고, 둘러볼 방을 누른다.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="층 선택">
        {ANNEX_FLOORS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === floorId}
            onClick={() => pickFloor(f.id)}
            className={`tilt rounded-full px-4 py-1.5 text-sm ${f.id === floorId ? 'bg-gold-fill text-ink' : 'bg-edge/[0.07] text-paper/85 hover:bg-gold-fill/20'}`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {floor && (
        <div className="mt-4">
          <p className="text-[11px] tracking-widest text-paper/55">둘러볼 방</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="방 선택">
            {floor.rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === roomId}
                onClick={() => pickRoom(r)}
                className={`tilt rounded-xl px-4 py-2 text-sm text-paper ${r.id === roomId ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {room && (
            <div className="ink-panel mt-4 w-full rounded-xl p-5" aria-live="polite">
              <p className="text-[11px] tracking-widest text-gold">{floor.name} · {room.name}</p>
              <div className="mt-2">
                <Flavor paras={room.flavor} />
              </div>

              {room.id === 'craft' && (
                <CraftRoom
                  player={player}
                  admin={admin}
                  onCraft={onCraft}
                  onStopCraft={onStopCraft}
                  myClub={myClub}
                  onApplyClub={onApplyClub}
                  onFetchMembers={onFetchMembers}
                />
              )}
              {room.id === 'board' && (
                <BoardRoom player={player} admin={admin} onHoljjak={onHoljjak} myClub={myClub} onApplyClub={onApplyClub} onFetchMembers={onFetchMembers} />
              )}
              {room.id === 'cook' && (
                <CookRoom
                  player={player}
                  admin={admin}
                  onCook={onCook}
                  onMeet={onMeet}
                  onLineSeen={onLineSeen}
                  onGiveNpc={onGiveNpc}
                  myClub={myClub}
                  onApplyClub={onApplyClub}
                  onFetchMembers={onFetchMembers}
                />
              )}
              {room.club && room.id !== 'craft' && room.id !== 'board' && room.id !== 'cook' && (
                <ClubOnlyRoom room={room} myClub={myClub} onApplyClub={onApplyClub} onFetchMembers={onFetchMembers} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
