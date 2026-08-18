import { FileTreeNode } from '../fileTree'
import { FileKindIcon } from './FileKindIcon'

export function FileTreeView({
  nodes,
  activePath,
  onSelect,
}: {
  nodes: FileTreeNode[]
  activePath: string
  onSelect: (path: string) => void
}) {
  return (
    <nav aria-label="프로젝트 파일" className="file-tree">
      {nodes.map((node) => (
        <TreeItem key={node.path ?? node.name} node={node} depth={0} activePath={activePath} onSelect={onSelect} />
      ))}
    </nav>
  )
}

function TreeItem({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: FileTreeNode
  depth: number
  activePath: string
  onSelect: (path: string) => void
}) {
  if (node.children) {
    return (
      <div>
        <p className="file-tree-folder" style={{ paddingLeft: 12 + depth * 12 }}>
          <FileKindIcon kind="folder" />
          <span>{node.name}</span>
        </p>
        {node.children.map((child) => (
          <TreeItem key={child.path ?? `${node.name}/${child.name}`} node={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  const active = node.path === activePath
  return (
    <button
      type="button"
      className={active ? 'file-tree-item is-active' : 'file-tree-item'}
      style={{ paddingLeft: 12 + depth * 12 }}
      aria-current={active ? 'page' : undefined}
      onClick={() => node.path && onSelect(node.path)}
    >
      <span className="file-tree-label">
        <FileKindIcon name={node.name} />
        <span>{node.name}</span>
      </span>
      {node.editable === false ? <span className="file-tree-lock">읽기 전용</span> : null}
    </button>
  )
}
