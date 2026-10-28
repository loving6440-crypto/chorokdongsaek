import { useState } from 'react'
import { Gift } from 'lucide-react'
import { countOf, ITEMS } from '../game/items'

// 선물로 건넬 수 있는 아이템(giftNpc: true) 전부. 새로 추가한 아이템도 giftNpc만 true면 자동으로 여기 나온다.
const GIFT_ITEMS = ITEMS.filter((it) => it.giftNpc)

/** NPC 대화창 아래: 호감도 표시 + 선물 건네기(마이쮸 등). (전투 중이 아닐 때만 여기서 줄 수 있다) */
export default function NpcGift({ npcId, player, onGive }) {
  const [msg, setMsg] = useState('')
  if (!onGive) return null
  const lv = player.affinity?.[npcId] || 0
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-npc-gift={npcId}>
      <span className="rounded-full border border-edge/25 px-2.5 py-0.5 text-paper/75" data-affinity>
        호감도 <b className="text-gold">{lv}</b>
      </span>
      {GIFT_ITEMS.map((it) => {
        const n = countOf(player, it.id)
        return (
          <button
            key={it.id}
            type="button"
            disabled={n < 1}
            onClick={() => setMsg(onGive(npcId, it.id)?.error || `${it.name}을(를) 건넸다. 호감도가 올랐다!`)}
            className="flat-btn !py-1 text-xs disabled:opacity-40"
          >
            <Gift size={13} aria-hidden />
            {it.name} 주기 ({n})
          </button>
        )
      })}
      {msg && <span className="text-[11px] text-gold" role="status">{msg}</span>}
    </div>
  )
}
