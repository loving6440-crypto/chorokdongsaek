import { useEffect, useState } from 'react'
import { Footprints } from 'lucide-react'
import { LOCATIONS } from '../game/constants'

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

/** 건물이 아예 바뀌는 이동 중일 때, 그 구역의 화면 대신 보여 주는 대기 패널. */
export default function TravelPanel({ traveling }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const loc = LOCATIONS[traveling.toId]
  const left = traveling.startedAt + traveling.minutes * 60000 - Date.now()
  return (
    <section aria-label="이동 중" className="grid min-h-[16rem] place-items-center py-10 text-center">
      <Footprints size={28} className="text-gold/70" aria-hidden />
      <p className="mt-3 font-serif text-xl text-gold">{loc?.name ?? ''}(으)로 이동하는 중이다</p>
      <p className="mt-2 text-sm text-paper/70">끝까지 기다려야 도착한다.</p>
      <p className="mt-3 text-lg text-gold" data-travel-left>
        남은 시간: {left > 0 ? leftText(left) : '거의 다 됐다'}
      </p>
    </section>
  )
}
