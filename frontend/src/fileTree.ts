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
  return roots
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
