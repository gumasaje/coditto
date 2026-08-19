export const NETWORK_ERROR = '네트워크 오류가 발생했습니다. Backend가 실행 중인지 확인해 주세요.'
export const RATE_LIMITED_ERROR = '제출 요청이 잠시 제한됐습니다. 잠시 후 다시 시도해 주세요.'
export const ALL_CATEGORY = '전체'

export function difficultyLabel(value: string): string {
  if (value === 'EASY') return 'Easy'
  if (value === 'MEDIUM') return 'Normal'
  if (value === 'HARD') return 'Hard'
  return value
}

export function categoryLabel(value: string): string {
  if (value === 'Backend') return 'Back-End'
  if (value === 'Frontend') return 'Front-End'
  return value
}

export function languageFromPath(path: string): string {
  if (path.endsWith('.java')) return 'Java'
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'TypeScript'
  if (path.endsWith('.js')) return 'JavaScript'
  return 'Source'
}

export function monacoLanguage(path: string): string {
  if (path.endsWith('.java')) return 'java'
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  if (path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.xml') || path.endsWith('.html')) return 'xml'
  return 'plaintext'
}
