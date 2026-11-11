/**
 * 활동 로그는 오래된 항목 → 최신 항목 순서로 관리한다.
 * v77.0.1 이전 저장본은 최신 항목이 맨 앞이므로 불러올 때 한 번만 변환한다.
 * 각 id는 기록 생성 시각을 바탕으로 만들어져 있어 양 끝의 id로 저장 순서를 구별한다.
 */
export const normalizeActivityLogs = (saved) => {
  if (!Array.isArray(saved)) return []
  if (saved.length < 2) return saved.slice()
  const firstId = Number(saved[0]?.id)
  const lastId = Number(saved[saved.length - 1]?.id)
  return Number.isFinite(firstId) && Number.isFinite(lastId) && firstId > lastId
    ? saved.slice().reverse()
    : saved.slice()
}

export const appendActivityLog = (logs, entry, max = 80) => [...logs, entry].slice(-max)

/** entries는 오래된 것부터 전달한다. */
export const appendActivityLogs = (logs, entries, max = 80) => [...logs, ...entries].slice(-max)

export const latestActivityLog = (logs) => logs.length ? logs[logs.length - 1] : null
