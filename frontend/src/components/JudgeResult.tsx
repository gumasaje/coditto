import { JudgeResponse } from '../types'

/**
 * 캡처 2 하단 실행 결과 슬롯. 판정 값은 계약 문자열 그대로 두고, 꾸밈 배지는 넣지 않는다.
 */
export function JudgeResult({ result }: { result: JudgeResponse | null }) {
  return (
    <section aria-label="채점 결과" className="h-full overflow-auto bg-panel px-4 py-3">
      <p className="text-[11px] font-medium tracking-[0.16em] text-mute">JUDGE RESULT</p>
      {result ? (
        <div className="mt-2">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">{result.runStatus}</h2>
          {result.check?.execution && (
            <p className="mt-1 font-mono text-[16px] font-medium text-acid">{result.check.execution}</p>
          )}
          {result.error?.kind && (
            <p className="error-kind mt-1 text-[13px] text-danger">error.kind: {result.error.kind}</p>
          )}
          {result.problem?.id && (
            <p className="mt-2 text-[12px] text-mute">{result.problem.id} · v{result.problem.version}</p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-mute">채점 결과가 이 영역에 표시됩니다.</p>
      )}
    </section>
  )
}
