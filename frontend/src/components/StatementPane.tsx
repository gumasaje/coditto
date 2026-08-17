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
    <section aria-label="문제 설명" className="flex h-full min-h-0 flex-col bg-panel text-ink">
      <div className="border-b border-line px-5 py-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-acid">INCIDENT</p>
        <h1 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        <p className="mt-1 text-[12px] text-mute">{meta}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        <StatementMarkdown source={statement} />
      </div>
    </section>
  )
}
