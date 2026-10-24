import { useState } from 'react'
import { Gift } from 'lucide-react'
import { countOf } from '../game/items'

/** NPC 대화창 아래: 호감도 표시 + 마이쮸 건네기. (전투 중이 아닐 때만 여기서 줄 수 있다) */
export default function NpcGift({ npcId, player, onGive }) {
  const [msg, setMsg] = useState('')
  if (!onGive) return null
  const n = countOf(player, 'chewy')
  const lv = player.affinity?.[npcId] || 0
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-npc-gift={npcId}>
      <span className="rounded-full border border-edge/25 px-2.5 py-0.5 text-paper/75" data-affinity>
        호감도 <b className="text-gold">{lv}</b>
      </span>
      <button
        type="button"
        disabled={n < 1}
        onClick={() => setMsg(onGive(npcId, 'chewy')?.error || '마이쮸를 건넸다. 호감도가 올랐다!')}
        className="flat-btn !py-1 text-xs disabled:opacity-40"
      >
        <Gift size={13} aria-hidden />
        마이쮸 주기 ({n})
      </button>
      {msg && <span className="text-[11px] text-gold" role="status">{msg}</span>}
    </div>
  )
}
