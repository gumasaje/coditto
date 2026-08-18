export function fileNameFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

/**
 * 수정 가능 파일은 candidate.allowedPaths를 우선하고, 없으면 files[].editable을 쓴다.
 * 클릭으로 에디터를 열 수 있게 표시 중인 파일만 남긴다.
 */
export function editableFilePaths(detail: {
  files: { path: string; editable: boolean }[]
  candidate?: { allowedPaths?: string[] }
}): string[] {
  const displayed = new Set(detail.files.map((file) => file.path))
  const fromAllowed = (detail.candidate?.allowedPaths ?? []).filter((path) => displayed.has(path))
  if (fromAllowed.length > 0) return unique(fromAllowed)
  return unique(detail.files.filter((file) => file.editable).map((file) => file.path))
}

const GUIDANCE_LINE = /^수정 가능한 파일은.+$/

/**
 * 지문 원문은 바꾸지 않고, 화면에서만 인라인 파일명 안내와 경로 fence를 공통 배지 UI에 맡긴다.
 */
export function withoutEditableFileGuidance(source: string, paths: string[]): string {
  if (paths.length === 0) return source
  const pathSet = new Set(paths)
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let index = 0

  const names = new Set(paths.map(fileNameFromPath))

  while (index < lines.length) {
    const trimmed = lines[index].trim()
    if (GUIDANCE_LINE.test(trimmed)) {
      const skipped = skipGuidanceFence(lines, index + 1, pathSet)
      if (skipped != null) {
        index = skipped
        continue
      }
      if (isInlineEditableFileGuidance(trimmed, names, pathSet)) {
        index += 1
        continue
      }
    }
    if (lines[index].startsWith('```')) {
      const skipped = skipPathFence(lines, index, pathSet)
      if (skipped != null) {
        index = skipped
        continue
      }
    }
    out.push(lines[index])
    index += 1
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, (match, offset) => (
    offset === 0 ? match : '\n'
  ))
}

function isInlineEditableFileGuidance(line: string, names: Set<string>, pathSet: Set<string>): boolean {
  const mentioned = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1])
  return mentioned.length > 0 && mentioned.every((name) => names.has(name) || pathSet.has(name))
}

function skipGuidanceFence(lines: string[], start: number, pathSet: Set<string>): number | null {
  let index = start
  while (index < lines.length && lines[index].trim() === '') index += 1
  return skipPathFence(lines, index, pathSet)
}

function skipPathFence(lines: string[], start: number, pathSet: Set<string>): number | null {
  if (start >= lines.length || !lines[start].startsWith('```')) return null
  const body: string[] = []
  let index = start + 1
  while (index < lines.length && !lines[index].startsWith('```')) {
    if (lines[index].trim() !== '') body.push(lines[index].trim())
    index += 1
  }
  if (index >= lines.length || !lines[index].startsWith('```')) return null
  if (body.length === 0 || body.some((line) => !pathSet.has(line))) return null
  return index + 1
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}
