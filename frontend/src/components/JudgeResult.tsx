import { JudgeResponse, SuiteResult } from '../types'

function suiteLabel(value: SuiteResult): string {
  return value === 'TESTS_PASSED' ? '통과' : '실패'
}

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

/**
 * 채점 결과 슬롯. suites가 있으면 목표/회귀를 나누고, 없으면 execution 계약 문자열을 그대로 둔다.
 */
export function JudgeResult({ result }: { result: JudgeResponse | null }) {
  const suites = readSuites(result?.check)

  return (
    <section aria-label="채점 결과" className="judge">
      <p className="kicker-mute">JUDGE RESULT</p>
      {result ? (
        <div>
          <h2>{result.runStatus}</h2>
          {suites ? (
            <div className="suites" role="group" aria-label="목표·회귀 테스트">
              <p className="execution">목표: {suiteLabel(suites.target)}</p>
              <p className="execution">회귀: {suiteLabel(suites.regression)}</p>
            </div>
          ) : result.check?.execution ? (
            <p className="execution">{result.check.execution}</p>
          ) : null}
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
