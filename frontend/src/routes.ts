import { ALL_CATEGORY } from './copy'

const PROBLEM_ROUTE = /^#\/problems\/([^/?#]+)$/

export function readProblemId(hash = window.location.hash): string | null {
  const match = PROBLEM_ROUTE.exec(hash)
  return match ? decodeURIComponent(match[1]) : null
}

export function isInterviewPreview(hash = window.location.hash): boolean {
  return hash === '#/preview/interview'
}

export function catalogHash(category: string): string {
  if (!category || category === ALL_CATEGORY) return '#/'
  return `#/?category=${encodeURIComponent(category)}`
}

export function readCatalogCategory(hash = window.location.hash): string {
  if (readProblemId(hash)) return ALL_CATEGORY
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  return new URLSearchParams(query).get('category') || ALL_CATEGORY
}
