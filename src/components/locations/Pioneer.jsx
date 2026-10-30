import { useEffect, useRef, useState } from 'react'
import HuntField from './HuntField'
export default function Pioneer({player, stats, onHuntAction}) {
  const [showEnd, setShowEnd] = useState(false)
  const previous = useRef(player.huntExpedition?.status)
  useEffect(() => {
    const session = player.huntExpedition
    if (previous.current === 'active' && session?.status === 'finished' && session.turn >= session.maxTurns) setShowEnd(true)
    previous.current = session?.status
  }, [player.huntExpedition?.status, player.huntExpedition?.turn, player.huntExpedition?.maxTurns])
  return <section aria-label="개척"><h2 className="font-serif text-2xl text-gold">개척</h2>
    <p className="mt-1 text-sm text-paper/70">채집과 수렵, 조사 등 개척 활동을 진행한다. 터에 입장할 때 의지력 10이 든다.</p>
    <HuntField player={player} stats={stats} onAction={onHuntAction}/>
    {showEnd && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4" data-pioneer-ended>
      <div className="ink-panel w-full max-w-sm rounded-xl p-5 text-center" role="alertdialog" aria-modal="true">
        <p>행동 가능한 턴을 소진했습니다. 채집을 종료합니다.</p>
        <button type="button" className="flat-btn mt-5 justify-center" onClick={()=>setShowEnd(false)}>확인</button>
      </div>
    </div>}
  </section>
}
