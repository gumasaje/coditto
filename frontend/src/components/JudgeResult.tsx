import { Execution, JudgeResponse, SuiteResult } from '../types'

function readSuites(check: JudgeResponse['check']) {
  const target = check?.suites?.target
  const regression = check?.suites?.regression
  if (
    (target === 'TESTS_PASSED' || target === 'TESTS_FAILED')
    && (regression === 'TESTS_PASSED' || regression === 'TESTS_FAILED')
  ) {
    return { target, regression }
  }
  return null
}

function failedSuites(target: SuiteResult, regression: SuiteResult): string {
  const failed = [
    target === 'TESTS_FAILED' ? '목표' : null,
    regression === 'TESTS_FAILED' ? '회귀' : null,
  ].filter(Boolean)
  return failed.join('·')
}

function outcome(check: JudgeResponse['check']): { text: string; kind: 'pass' | 'fail' } | null {
  const suites = readSuites(check)
  if (suites) {
    if (suites.target === 'TESTS_PASSED' && suites.regression === 'TESTS_PASSED') {
      return { text: '테스트 성공', kind: 'pass' }
    }
    return { text: `테스트 실패 (${failedSuites(suites.target, suites.regression)})`, kind: 'fail' }
  }
  const execution = check?.execution as Execution | undefined
  if (execution === 'COMPILE_FAILED') return { text: '컴파일 실패', kind: 'fail' }
  if (execution === 'TESTS_PASSED') return { text: '테스트 성공', kind: 'pass' }
  if (execution === 'TESTS_FAILED') return { text: '테스트 실패', kind: 'fail' }
  if (execution) return { text: execution, kind: 'fail' }
  return null
}

/**
 * 채점 결과 슬롯. 입력·기댓값 없이 컴파일 실패와 목표/회귀 테스트 결과만 표시한다.
 */
export function JudgeResult({ result }: { result: JudgeResponse | null }) {
  const suites = result ? readSuites(result.check) : null
  const found = result ? outcome(result.check) : null

  const message = found ? (
    <p className="test-row">
      <span className="test-label">실행 결과 <span aria-hidden="true">&gt;</span></span>
      <span className={`test-msg ${found.kind === 'pass' ? 'is-pass' : 'is-fail'}`}>{found.text}</span>
    </p>
  ) : null

  return (
    <section aria-label="채점 결과" className="judge">
      <p className="kicker-mute">JUDGE RESULT</p>
      {result ? (
        <div>
          <h2>{result.runStatus}</h2>
          {suites ? (
            <div role="group" aria-label="목표·회귀 테스트">{message}</div>
          ) : message}
          {result.error?.kind && (
            <p className="error-kind">error.kind: {result.error.kind}</p>
          )}
          {result.problem?.id && (
            <p className="meta">{result.problem.id} · v{result.problem.version}</p>
          )}
        </div>
      ) : (
        <p className="meta">채점 결과가 이 영역에 표시됩니다.</p>
      )}
    </section>
  )
}
