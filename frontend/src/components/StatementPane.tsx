import { ReactNode } from 'react'
import { StatementMarkdown } from '../markdown'

/**
 * 문제 설명 패널을 목록/에디터와 같은 다크 크롬으로 맞춘다.
 */
export function StatementPane({
  title,
  meta,
  statement,
}: {
  title: string
  meta: ReactNode
  statement: string
}) {
  return (
    <section aria-label="문제 설명" className="statement">
      <div className="statement-head">
        <p className="kicker-sm">INCIDENT</p>
        <h1>{title}</h1>
        <p className="meta">{meta}</p>
      </div>
      <div className="statement-body">
        <StatementMarkdown source={statement} />
      </div>
    </section>
  )
}
