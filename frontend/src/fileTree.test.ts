import { describe, expect, it } from 'vitest'
import { buildFileTree } from './fileTree'

describe('buildFileTree compact folders', () => {
  it('joins consecutive single-child directories into one folder label', () => {
    const tree = buildFileTree([
      {
        path: 'src/main/java/com/coditto/demo/RoleService.java',
        editable: true,
        content: '',
      },
      {
        path: 'src/main/java/com/coditto/demo/RoleChangeRequest.java',
        editable: false,
        content: '',
      },
    ])
    expect(tree).toEqual([
      {
        name: 'src/main/java/com/coditto/demo',
        children: [
          {
            name: 'RoleService.java',
            path: 'src/main/java/com/coditto/demo/RoleService.java',
            editable: true,
          },
          {
            name: 'RoleChangeRequest.java',
            path: 'src/main/java/com/coditto/demo/RoleChangeRequest.java',
            editable: false,
          },
        ],
      },
    ])
  })

  it('does not compact a folder whose only child is a file', () => {
    const tree = buildFileTree([
      { path: 'src/App.java', editable: true, content: '' },
    ])
    expect(tree).toEqual([
      {
        name: 'src',
        children: [
          { name: 'App.java', path: 'src/App.java', editable: true },
        ],
      },
    ])
  })

  it('stops compacting when a directory has more than one child folder', () => {
    const tree = buildFileTree([
      { path: 'src/main/A.java', editable: true, content: '' },
      { path: 'src/test/B.java', editable: true, content: '' },
    ])
    expect(tree).toEqual([
      {
        name: 'src',
        children: [
          {
            name: 'main',
            children: [{ name: 'A.java', path: 'src/main/A.java', editable: true }],
          },
          {
            name: 'test',
            children: [{ name: 'B.java', path: 'src/test/B.java', editable: true }],
          },
        ],
      },
    ])
  })
})
