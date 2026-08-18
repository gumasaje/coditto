const KEY = 'coditto.passedProblemIds'

export function readPassedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function markPassed(problemId: string): string[] {
  const next = Array.from(new Set([...readPassedIds(), problemId]))
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // quota/차단 예외가 채점 결과와 면접 요청을 가로채지 않게 둔다.
  }
  return next
}

export function clearPassed(): string[] {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // 진행상태 삭제도 화면 흐름과 분리한다.
  }
  return []
}
