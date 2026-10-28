import { useEffect, useState } from 'react'

/** 초대 카운트다운만 독립 갱신해 Game 전체 렌더링을 방지한다. */
export default function InviteCountdown({ expires }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!Number.isFinite(expires)) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expires])
  if (!Number.isFinite(expires)) return '참여 수락 가능'
  return <>참여 수락 가능 · 초대 만료까지 {Math.max(0, Math.ceil((expires - now) / 1000))}초</>
}
