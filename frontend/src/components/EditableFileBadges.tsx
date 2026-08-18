import { FileKindIcon } from './FileKindIcon'
import { fileNameFromPath } from '../editableFiles'

/**
 * 수정 가능 파일을 파일명 배지로 보여 주고, 클릭하면 에디터에서 연다.
 */
export function EditableFileBadges({
  paths,
  onOpen,
}: {
  paths: string[]
  onOpen: (path: string) => void
}) {
  if (paths.length === 0) return null

  return (
    <div className="editable-files">
      <p className="editable-files-label">수정 가능한 파일</p>
      <div role="group" aria-label="수정 가능한 파일" className="editable-files-list">
        {paths.map((path) => {
          const name = fileNameFromPath(path)
          return (
            <button
              key={path}
              type="button"
              className="file-badge"
              title={path}
              onClick={() => onOpen(path)}
            >
              <FileKindIcon name={name} />
              <span>{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
