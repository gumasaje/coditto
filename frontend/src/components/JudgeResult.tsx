import { Execution, JudgeResponse, SuiteResult } from '../types'

const EXECUTION_TEXT: Record<Execution, string> = {
  TESTS_PASSED: '테스트 성공',
  TESTS_FAILED: '테스트 실패',
  COMPILE_FAILED: '컴파일 실패',
  TIMED_OUT: '시간 초과',
  RESOURCE_LIMITED: '자원 한도 초과',
}

/** 정상 채점은 실행 결과 줄이 대신하므로 표시하지 않는다. */
const RUN_STATUS_TEXT: Record<JudgeResponse['runStatus'], string | null> = {
  COMPLETED: null,
  REJECTED: '제출이 접수되지 않았습니다',
  SYSTEM_FAILED: '채점을 끝내지 못했습니다',
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
      return { text: EXECUTION_TEXT.TESTS_PASSED, kind: 'pass' }
    }
    return { text: `테스트 실패 (${failedSuites(suites.target, suites.regression)})`, kind: 'fail' }
  }
  const execution = check?.execution as Execution | undefined
  if (!execution) return null
  const text = EXECUTION_TEXT[execution]
  if (!text) return null
  return { text, kind: execution === 'TESTS_PASSED' ? 'pass' : 'fail' }
}

/**
 * 채점 결과 슬롯. 입력·기댓값 없이 컴파일 실패와 목표/회귀 테스트 결과만 표시한다.
 * Judge 응답의 enum은 화면에 그대로 내보내지 않고 한국어 표기로만 옮긴다.
 */
export function JudgeResult({ result }: { result: JudgeResponse | null }) {
  const suites = result ? readSuites(result.check) : null
  const found = result ? outcome(result.check) : null
  const runStatusText = result ? RUN_STATUS_TEXT[result.runStatus] ?? null : null

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
          {runStatusText && <h2>{runStatusText}</h2>}
          {suites ? (
            <div role="group" aria-label="목표·회귀 테스트">{message}</div>
          ) : message}
          {result.error?.kind && (
            <p className="error-kind">오류 코드 {result.error.kind}</p>
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
