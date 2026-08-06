import { FormEvent, useState } from 'react'

type Execution = 'TESTS_PASSED' | 'TESTS_FAILED' | 'COMPILE_FAILED' | 'TIMED_OUT' | 'RESOURCE_LIMITED'
type JudgeResponse = {
  schemaVersion?: string
  problem?: { id?: string; version?: number }
  runStatus: 'COMPLETED' | 'REJECTED' | 'SYSTEM_FAILED'
  check?: { id?: string; execution?: Execution }
  error?: { kind?: string }
}

export function App() {
  const [source, setSource] = useState('')
  const [result, setResult] = useState<JudgeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const body = await response.json() as JudgeResponse
      setResult(body)
    } catch {
      setError('네트워크 오류가 발생했습니다. Backend가 실행 중인지 확인해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">CODITTO · ROLE UPDATE</p>
        <h1>코드를 제출하고 실행 결과를 확인하세요.</h1>
        <p className="intro">Java 코드는 격리된 Docker Judge에서 컴파일하고 테스트합니다.</p>
      </header>
      <form onSubmit={submit}>
        <label htmlFor="source">Java 코드</label>
        <textarea id="source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="RoleService.java 내용을 입력하세요." disabled={isSubmitting} />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? '채점 중…' : '제출하기'}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {result && <Result result={result} />}
    </main>
  )
}

function Result({ result }: { result: JudgeResponse }) {
  return (
    <section aria-label="채점 결과" className="result">
      <p className="eyebrow">JUDGE RESULT</p>
      <h2>{result.runStatus}</h2>
      {result.check?.execution && <p className="execution">{result.check.execution}</p>}
      {result.error?.kind && <p className="error-kind">error.kind: {result.error.kind}</p>}
      {result.problem?.id && <p className="meta">{result.problem.id} · v{result.problem.version}</p>}
    </section>
  )
}
