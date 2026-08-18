import { categoryLabel, difficultyLabel } from '../copy'
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
    <table className="table">
      <caption className="visually-hidden">문제 목록</caption>
      <thead>
        <tr className="row thead">
          <th scope="col"><span className="visually-hidden">번호</span></th>
          <th scope="col">문제</th>
          <th className="p-meta" scope="col">오류 유형</th>
          <th className="p-level" scope="col">난이도</th>
          <th className="p-state" scope="col">상태</th>
          <th scope="col"><span className="visually-hidden">이동</span></th>
        </tr>
      </thead>
      <tbody>
        {problems.map((problem, index) => {
          const passed = passedIds.includes(problem.id)
          return (
            <tr className="row trow" key={problem.id}>
              <td className="p-no">{String(index + 1).padStart(2, '0')}</td>
              <td>
                <a className="p-title p-row-link" href={`#/problems/${problem.id}`}>
                  {problem.title}
                </a>
                <p className="p-sub">{categoryLabel(problem.category)} · {problem.stack} · 약 {problem.estimatedMinutes}분</p>
              </td>
              <td className="p-meta">{problem.bugType}</td>
              <td className="p-level">{difficultyLabel(problem.difficulty)}</td>
              <td className="p-state">{passed ? '해결' : '미해결'}</td>
              <td className="p-go">{passed ? '다시 풀기' : '풀어보기'} <span className="arrow" aria-hidden="true">→</span></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
