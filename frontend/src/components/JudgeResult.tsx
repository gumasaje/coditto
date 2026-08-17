import { JudgeResponse } from '../types'

/**
 * 캡처 2 하단 실행 결과 슬롯. 판정 값은 계약 문자열 그대로 두고, 꾸밈 배지는 넣지 않는다.
 */
export function JudgeResult({ result }: { result: JudgeResponse | null }) {
  return (
    <section aria-label="채점 결과" className="judge">
      <p className="kicker-mute">JUDGE RESULT</p>
      {result ? (
        <div>
          <h2>{result.runStatus}</h2>
          {result.check?.execution && (
            <p className="execution">{result.check.execution}</p>
          )}
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
