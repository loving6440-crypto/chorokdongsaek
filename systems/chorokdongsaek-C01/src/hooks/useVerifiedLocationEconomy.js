// B.12: 기존 장소 화면이 서버 소유 거래 장부만 참조할 수 있도록 하는 공통 경계.
// 플래그가 꺼졌을 때만 기존 로컬 플레이를 사용한다. 네트워크 오류는 로컬 전환이 아니라 차단으로 처리한다.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getVerifiedEconomyStatus, getVerifiedWallet, verifiedEconomyAction } from '../net/online'

const messages = {
  'insufficient-items': '검증 소지품에 재료가 부족합니다.',
  'insufficient-money': '검증 소지금이 부족합니다.',
  'inventory-full': '검증 소지품 30칸이 가득 찼습니다.',
  'unknown-seed': '구매하거나 심을 수 없는 씨앗입니다.',
  'unknown-recipe': '알 수 없는 제작법입니다.',
  'plot-occupied': '이미 씨앗을 심은 칸입니다.',
  'plot-empty': '빈 밭입니다.',
  'garden-not-ready': '아직 수확할 때가 아닙니다.',
  'gather-not-ready': '채집이 끝나지 않았습니다.',
  'gather-already-active': '이미 채집 중입니다.',
  'verified-economy-not-activated': '서버 검증 경제 기능이 비활성화되어 있습니다.',
  'network': '서버 연결이 끊어졌습니다. 다시 확인해 주세요.',
}

export function useVerifiedLocationEconomy(online) {
  const [mode, setMode] = useState(online ? 'pending' : 'legacy')
  const [wallet, setWallet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(null)
  const busyRef = useRef(false)
  const refresh = useCallback(async () => {
    if (!online) { setMode('legacy'); setWallet(null); return null }
    const status = await getVerifiedEconomyStatus()
    if (status.ok && !status.tradingEnabled) {
      setMode('legacy')
      setWallet(null)
      return status
    }
    if (!status.ok) {
      setMode('error')
      setWallet(null)
      return status
    }
    const result = await getVerifiedWallet()
    if (result.ok) {
      setMode('verified')
      setWallet(result.wallet)
    } else {
      // 장부 조회 실패 시 로컬 인벤토리로 결제를 우회하지 않는다.
      setMode('error')
      setWallet(null)
    }
    return result
  }, [online])
  useEffect(() => {
    if (!online) { setMode('legacy'); setWallet(null); return undefined }
    setMode('pending')
    // Only poll while enabled, visible and connected. An OFF server never
    // requests the player's wallet and never starts a repeating timer.
    let active = true
    let timer = null
    const check = async () => {
      if (!active || document.visibilityState === 'hidden') return
      const result = await refresh()
      if (!active || !result?.ok || !result.tradingEnabled) {
        if (timer) { clearInterval(timer); timer = null }
      } else if (!timer) timer = setInterval(check, 30000)
    }
    check()
    const visibility = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', visibility)
    return () => { active = false; if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [online, refresh])
  const transact = useCallback(async (route, payload = {}) => {
    if (busyRef.current || mode !== 'verified') return { ok: false, error: 'not-ready' }
    busyRef.current = true
    setBusy(true)
    const identity = JSON.stringify([route, payload])
    if (pending.current?.identity !== identity) pending.current = { identity, requestId: crypto.randomUUID() }
    try {
      const result = await verifiedEconomyAction(route, { ...payload, requestId: pending.current.requestId })
      // 통신 실패면 원래 키를 보존하여 재시도해도 중복 지급되지 않도록 한다.
      if (result.status !== 0) pending.current = null
      setMessage(result.ok ? '서버 장부에 반영했습니다.' : (messages[result.error] ?? `처리하지 못했습니다. (${result.error ?? result.status})`))
      await refresh()
      return result
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [mode, refresh])
  return { mode, wallet, busy, message, refresh, transact }
}
