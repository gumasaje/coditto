import { ProblemFile } from './types'

export type FileTreeNode = {
  name: string
  path?: string
  editable?: boolean
  children?: FileTreeNode[]
}

export function buildFileTree(files: ProblemFile[]): FileTreeNode[] {
  const roots: FileTreeNode[] = []
  for (const file of files) {
    insertNode(roots, file.path.split('/').filter(Boolean), file)
  }
  return compactSingleChildFolders(roots)
}

function insertNode(nodes: FileTreeNode[], parts: string[], file: ProblemFile) {
  const [head, ...rest] = parts
  if (!head) return
  let node = nodes.find((item) => item.name === head)
  if (!node) {
    node = rest.length === 0
      ? { name: head, path: file.path, editable: file.editable }
      : { name: head, children: [] }
    nodes.push(node)
  }
  if (rest.length > 0) {
    node.children ??= []
    insertNode(node.children, rest, file)
  }
}

/** VS Code Compact Folders: 자식이 폴더 하나뿐인 디렉터리만 표시명을 한 줄로 합친다. */
export function compactSingleChildFolders(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.map((node) => compactNode(node))
}

function compactNode(node: FileTreeNode): FileTreeNode {
  if (!node.children) return node
  const children = compactSingleChildFolders(node.children)
  let name = node.name
  let next = children
  while (next.length === 1 && next[0].children) {
    name = `${name}/${next[0].name}`
    next = next[0].children
  }
  return { ...node, name, children: next }
}
