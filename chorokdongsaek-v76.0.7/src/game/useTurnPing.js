import { useEffect, useRef, useState } from 'react'
import { sfx } from './sfx'

/**
 * 오목·루미큐브·요트 다이스·윷놀이처럼 차례가 도는 게임에서, 내 차례가 막 시작됐을 때
 * 한 번만 짧은 효과음("myTurn")을 울리고 화면에 가볍게 표시할 펄스 번호를 돌려준다.
 *
 * myTurn: 지금이 내 차례인가. turnKey: 턴이 바뀔 때마다 값이 달라지는 식별자(turn 인덱스 등) —
 * 이 값이 바뀌지 않으면(같은 차례가 계속되면) 다시 울리지 않는다.
 *
 * 반환값(pulse)은 매번 다른 숫자라, 그 자체를 어떤 요소의 key 로 쓰면 그 요소가 다시 마운트되어
 * CSS 애니메이션(.turn-ping)이 한 번 더 재생된다.
 */
export function useTurnPing(myTurn, turnKey) {
  const announced = useRef(undefined)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (myTurn && announced.current !== turnKey) {
      announced.current = turnKey
      sfx.play('myTurn')
      setPulse((p) => p + 1)
    } else if (!myTurn) {
      announced.current = undefined
    }
  }, [myTurn, turnKey])

  return pulse
}
