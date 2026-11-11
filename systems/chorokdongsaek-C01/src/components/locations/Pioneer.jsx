import { useEffect, useRef, useState } from 'react'
import HuntField from './HuntField'
import { useVerifiedLocationEconomy } from '../../hooks/useVerifiedLocationEconomy'
import { VERIFIED_EXPEDITION_STATS, VERIFIED_EXPEDITION_COST, VERIFIED_EXPEDITION_MAX_ENERGY } from '../../game/verifiedExpeditionRules'
export default function Pioneer({player, stats, onHuntAction, online = false}) {
  const economy = useVerifiedLocationEconomy(online)
  if (economy.mode === 'verified') return <VerifiedPioneer player={player} economy={economy} />
  if (economy.mode === 'pending' || economy.mode === 'error') return <section className="ink-panel mt-4 rounded-xl p-4" aria-label="검증 개척 상태"><p className="text-sm text-gold">{economy.mode === 'pending' ? '서버 개척 상태를 확인하는 중…' : '서버 장부에 연결하지 못했습니다. 기존 소지품으로 우회하지 않습니다.'}</p></section>
  return <LegacyPioneer player={player} stats={stats} onHuntAction={onHuntAction} />
}

function VerifiedPioneer({player, economy}) {
  const { wallet, transact, busy, message } = economy
  const session = wallet?.expedition ?? null
  const action = async (request) => {
    const kind = { enter: 'enter', move: 'move', attempt: 'attempt', leave: 'leave' }[request.type]
    if (!kind) return
    await transact(`expedition/${kind}`, request.type === 'enter' ? { siteId: request.siteId } : request.type === 'move' ? { position: request.position } : request.type === 'attempt' ? { nodeId: request.nodeId } : {})
  }
  return <section aria-label="검증 개척"><h2 className="font-serif text-2xl text-gold">서버 검증 개척</h2>
    <p className="mt-2 text-sm text-paper/70">거래 가능한 보상은 서버가 이동·성공 확률·아이템 수량을 판정합니다. 기존 캐릭터 소지품과 분리되며, 테스트용 고정 스탯(각 10)을 사용합니다.</p>
    <p className="mt-2 text-sm text-gold" data-expedition-energy>서버 개척 의지력: {wallet?.expeditionEnergy ?? 0}/{VERIFIED_EXPEDITION_MAX_ENERGY} · 입장 {VERIFIED_EXPEDITION_COST} 소모 · 1분마다 1 회복</p>
    <p className="mt-2 text-xs text-paper/65">요괴와 마주쳐도 서버 전투 검증 전까지는 보상 없이 회피하며, 요괴 처치 보상은 지급하지 않습니다.</p>
    <div aria-busy={busy}><HuntField player={{...player, equip: {}, mp: wallet?.expeditionEnergy ?? 0, huntExpedition: session}} stats={VERIFIED_EXPEDITION_STATS} onAction={action} disabledActions={busy} showItems={false} /></div>
    {message && <p role="status" className="mt-3 text-xs text-gold">{message}</p>}
  </section>
}

function LegacyPioneer({player, stats, onHuntAction}) {
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
