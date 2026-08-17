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
    <div className="table-wrap">
      <table className="problem-table">
        <thead>
          <tr>
            <th>문제</th>
            <th>기술 스택</th>
            <th>오류 유형</th>
            <th>예상 시간</th>
            <th>난이도</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => {
            const passed = passedIds.includes(problem.id)
            return (
              <tr key={problem.id}>
                <td>
                  <a className="problem-title" href={`#/problems/${problem.id}`}>{problem.title}</a>
                  <p className="problem-cat">{categoryLabel(problem.category)}</p>
                </td>
                <td>{problem.stack}</td>
                <td>{problem.bugType}</td>
                <td>약 {problem.estimatedMinutes}분</td>
                <td className="diff-easy">{difficultyLabel(problem.difficulty)}</td>
                <td>
                  <a className="status-link" href={`#/problems/${problem.id}`}>
                    {passed ? '다시 풀기 →' : '문제 시작 →'}
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
