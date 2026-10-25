import { useEffect, useMemo, useState } from 'react'
import { Footprints } from 'lucide-react'
import { LOCATIONS } from '../game/constants'

const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

// 이동하는 동안 랜덤으로 뜨는 한 줄 대사. 이동을 시작할 때 하나를 골라 도착할 때까지 그대로 보여 준다.
const TRAVEL_LINES = [
  '끝까지 기다려야 도착한다. 달리 말 하자면, 기다림엔 끝이 있단 소리다.',
  '걸으면서 현학적인 생각을 하는 건 지루한가? 그렇다면 지나가는 귀신을 세어보자.',
  '걷고 있다. 기어가고 있진 않다. 어쩌면 날고 있을 수도 있다.',
  '교내 부지가 넓은 건 이래서 좋지 못하다. 건물을 돌아다니기만 해도 지구력이 붙는 기분이다.',
  "지나가다가 도깨비 '이시'를 만났다. 폴짝폴짝 뛰어와 당신을 방해하다가 사라진다.",
  "도깨비 '이시'가 튀어나온다. 옷에 먼지가 묻었다며 털어주는데, 분필가루가 덕지덕지 묻고 만다.",
  '시간은 언젠가 흐른다. 마찬가지로 걷다 보면 반드시 도착한다.',
  '뒷산쪽에서 바리가 두리번거리며 내려오는 게 보인다. 한 손을 흔들어 인사를 건네 온다.',
  '기숙사 앞 매점에서 강유민이 한숨과 함께 고개를 설레설레 내젓고 있다. 손에 화분이 들려 있다.',
  '단애가 직접 요리한 도시락을 싸들고 본관으로 향하고 있다. 오늘의 메뉴는 맛이 없는 모양이다.',
  '신아가 사당 근처에서 도깨비와 잡다한 말꼬리잡기를 하고 있다. 일상인 일이다.',
]

/** 건물이 아예 바뀌는 이동 중일 때, 그 구역의 화면 대신 보여 주는 대기 패널. */
export default function TravelPanel({ traveling }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const loc = LOCATIONS[traveling.toId]
  const left = traveling.startedAt + traveling.minutes * 60000 - Date.now()
  // 이동을 시작한 시각을 씨앗 삼아 하나를 고른다 — 도착할 때까지(재렌더링돼도) 같은 대사가 유지된다.
  const line = useMemo(() => TRAVEL_LINES[Math.abs(Math.floor(traveling.startedAt)) % TRAVEL_LINES.length], [traveling.startedAt])
  return (
    <section aria-label="이동 중" className="grid min-h-[16rem] place-items-center py-10 text-center">
      <Footprints size={28} className="text-gold/70" aria-hidden />
      <p className="mt-3 font-serif text-xl text-gold">{loc?.name ?? ''}(으)로 이동하는 중이다</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed break-keep text-paper/70" data-travel-line>
        {line}
      </p>
      <p className="mt-3 text-lg text-gold" data-travel-left>
        남은 시간: {left > 0 ? leftText(left) : '거의 다 됐다'}
      </p>
    </section>
  )
}
