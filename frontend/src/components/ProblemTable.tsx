import { categoryLabel, difficultyLabel } from '../copy'
import { ProblemSummary } from '../types'

/**
 * 캡처 1 메인 리스트를 테이블로 옮겼다. 카드 그리드와 큰 radius는 쓰지 않고 행 보더만 남긴다.
 */
export function ProblemTable({
  problems,
  passedIds,
}: {
  problems: ProblemSummary[]
  passedIds: string[]
}) {
  if (problems.length === 0) {
    return <p className="py-10 text-[14px] text-mute">이 카테고리에 준비된 문제가 없습니다.</p>
  }

  return (
    <div className="mt-6 overflow-x-auto pb-6">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[11px] font-medium tracking-[0.14em] text-mute">
            <th className="py-3 pr-4 font-medium">문제</th>
            <th className="py-3 pr-4 font-medium">기술 스택</th>
            <th className="py-3 pr-4 font-medium">오류 유형</th>
            <th className="py-3 pr-4 font-medium">예상 시간</th>
            <th className="py-3 pr-4 font-medium">난이도</th>
            <th className="py-3 font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => {
            const passed = passedIds.includes(problem.id)
            return (
              <tr key={problem.id} className="border-b border-line text-[14px] transition-colors hover:bg-panel">
                <td className="py-5 pr-4">
                  <a href={`#/problems/${problem.id}`} className="block text-[15px] font-medium tracking-[-0.02em] text-ink no-underline hover:text-acid">
                    {problem.title}
                  </a>
                  <p className="mt-1.5 text-[12px] text-mute">{categoryLabel(problem.category)}</p>
                </td>
                <td className="py-5 pr-4 text-mute">{problem.stack}</td>
                <td className="py-5 pr-4 text-mute">{problem.bugType}</td>
                <td className="py-5 pr-4 text-mute">약 {problem.estimatedMinutes}분</td>
                <td className="py-5 pr-4 font-medium text-acid">{difficultyLabel(problem.difficulty)}</td>
                <td className="py-5">
                  <a href={`#/problems/${problem.id}`} className="text-[13px] font-medium tracking-[-0.02em] text-acid no-underline">
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
