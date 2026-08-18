import { describe, expect, it } from 'vitest'
import { editableFilePaths, fileNameFromPath, withoutEditableFileGuidance } from './editableFiles'

describe('editableFilePaths', () => {
  const files = [
    { path: 'src/main/java/demo/RoleService.java', editable: true },
    { path: 'src/main/java/demo/RoleChangeRequest.java', editable: false },
  ]

  it('prefers candidate.allowedPaths that are in files', () => {
    expect(editableFilePaths({
      files,
      candidate: { allowedPaths: ['src/main/java/demo/RoleService.java'] },
    })).toEqual(['src/main/java/demo/RoleService.java'])
  })

  it('falls back to files marked editable', () => {
    expect(editableFilePaths({ files })).toEqual(['src/main/java/demo/RoleService.java'])
  })

  it('ignores allowed paths that are not in the displayed files', () => {
    expect(editableFilePaths({
      files,
      candidate: { allowedPaths: ['src/hidden/Secret.java'] },
    })).toEqual(['src/main/java/demo/RoleService.java'])
  })
})

describe('fileNameFromPath', () => {
  it('returns the last path segment', () => {
    expect(fileNameFromPath('src/main/java/demo/RoleService.java')).toBe('RoleService.java')
  })
})

describe('withoutEditableFileGuidance', () => {
  const path = 'src/main/java/com/coditto/demo/RoleService.java'

  it('removes the conventional Korean guidance and matching fence from display', () => {
    const source = [
      '# 역할 변경 승인 버그',
      '',
      '서비스를 수정하세요.',
      '',
      '수정 가능한 파일은 다음 하나뿐입니다.',
      '',
      '```text',
      path,
      '```',
      '',
      'Java 21로 검증하세요.',
      '',
    ].join('\n')

    expect(withoutEditableFileGuidance(source, [path])).toBe([
      '# 역할 변경 승인 버그',
      '',
      '서비스를 수정하세요.',
      '',
      'Java 21로 검증하세요.',
      '',
    ].join('\n'))
  })

  it('leaves unrelated code fences in place', () => {
    const source = '# 제목\n\n```text\nnot-a-path\n```\n'
    expect(withoutEditableFileGuidance(source, [path])).toBe(source)
  })
})
