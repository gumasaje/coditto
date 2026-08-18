import { ReactNode } from 'react'
import { withoutEditableFileGuidance } from '../editableFiles'
import { StatementMarkdown } from '../markdown'
import { EditableFileBadges } from './EditableFileBadges'

/**
 * 문제 설명 패널을 목록/에디터와 같은 다크 크롬으로 맞춘다.
 * 수정 가능 파일 안내는 지문 원문을 바꾸지 않고 공통 배지로 표시한다.
 */
export function StatementPane({
  title,
  meta,
  statement,
  editablePaths = [],
  onOpenFile,
}: {
  title: string
  meta: ReactNode
  statement: string
  editablePaths?: string[]
  onOpenFile?: (path: string) => void
}) {
  const displayed = withoutEditableFileGuidance(statement, editablePaths)

  return (
    <section aria-label="문제 설명" className="statement">
      <div className="statement-head">
        <p className="kicker-sm">INCIDENT</p>
        <h1>{title}</h1>
        <p className="meta">{meta}</p>
        {onOpenFile ? <EditableFileBadges paths={editablePaths} onOpen={onOpenFile} /> : null}
      </div>
      <div className="statement-body">
        <StatementMarkdown source={displayed} />
      </div>
    </section>
  )
}
