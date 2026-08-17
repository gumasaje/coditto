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
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearPassed(): string[] {
  window.localStorage.removeItem(KEY)
  return []
}
