import { categoryLabel, difficultyLabel, difficultyLevel } from '../copy'
import { ProblemSummary } from '../types'

export function ProblemTable({
  problems,
  passedIds,
  emptyMessage = '이 카테고리에 준비된 문제가 없습니다.',
}: {
  problems: ProblemSummary[]
  passedIds: string[]
  emptyMessage?: string
}) {
  if (problems.length === 0) {
    return <p className="note">{emptyMessage}</p>
  }

  return (
    <div className="table">
      <div className="row thead" aria-hidden="true">
        <div />
        <div>문제</div>
        <div>오류 유형</div>
        <div>난이도</div>
        <div>상태</div>
        <div />
      </div>
      {problems.map((problem, index) => {
        const passed = passedIds.includes(problem.id)
        return (
          <a className="row trow" key={problem.id} href={`#/problems/${problem.id}`}>
            <div className="p-no">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <div className="p-title">{problem.title}</div>
              <p className="p-sub">{categoryLabel(problem.category)} · {problem.stack} · 약 {problem.estimatedMinutes}분</p>
            </div>
            <div className="p-meta">{problem.bugType}</div>
            <div className="p-level">{difficultyLevel(problem.difficulty)}</div>
            <div className="p-state">{passed ? '해결' : '미해결'}</div>
            <div className="p-go">{passed ? '다시 풀기' : '풀어보기'} <span className="arrow">→</span></div>
            <span className="visually-hidden">{difficultyLabel(problem.difficulty)}</span>
          </a>
        )
      })}
    </div>
  )
}
