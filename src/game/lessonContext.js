import { createContext, useContext } from 'react'

const noop = () => {}
/** 미니게임이 수업 시스템에 판 시작/점수/종료를 알리는 통로. 제공자가 없으면 아무 일도 하지 않는다. */
export const LessonContext = createContext({
  start: noop, // 판을 시작했다 (시도 1회 사용)
  metric: noop, // 최소 조건 지표가 바뀌었다 (예: 가장 큰 수, 점수)
  submit: noop, // 랭킹에 점수를 올린다 (최고 기록만 남는다)
  finish: noop, // 판이 끝났다: finish(score, { dead, won })
  won: noop, // 이어서 할 수 있는 성공 (2048 달성)
  abandon: noop, // 도중에 포기하고 다시 시작
})
export const useLesson = () => useContext(LessonContext)

/** 채팅창 등 입력칸에 글을 쓰는 중이면 게임 단축키를 무시한다. */
export const isTypingTarget = (e) => {
  const t = e.target
  return t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]')
}
