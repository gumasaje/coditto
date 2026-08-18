export type FoldLineRange = {
  start: number
  end: number
}

const JAVA_IMPORT_LINE =
  /^\s*import\s+(?:static\s+)?(?:[A-Za-z_$][\w$]*\s*\.\s*)*[A-Za-z_$][\w$]*(?:\s*\.\s*\*)?\s*;\s*(?:\/\/.*)?$/

/**
 * 파일 앞쪽의 연속된 Java import 문을 하나의 접기 범위로 찾는다.
 * 줄 번호는 Monaco FoldingRange와 같이 1부터 시작한다.
 */
export function findJavaImportFoldRange(source: string): FoldLineRange | null {
  const lines = source.split('\n')
  let start = -1
  let end = -1

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (JAVA_IMPORT_LINE.test(line)) {
      if (start === -1) start = index + 1
      end = index + 1
      continue
    }
    if (start !== -1 && /^\s*$/.test(line)) continue
    if (start !== -1) break
  }

  if (start === -1 || end <= start) return null
  return { start, end }
}
