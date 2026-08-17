import { FormEvent, useEffect, useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { JudgeResult } from './components/JudgeResult'
import { SiteHeader } from './components/SiteHeader'
import { SplitHandle } from './components/SplitHandle'
import { StatementPane } from './components/StatementPane'
import { NETWORK_ERROR, categoryLabel, difficultyLabel } from './copy'
import { markPassed } from './progress'
import { ApiError, JudgeResponse, ProblemDetail } from './types'

/**
 * 캡처 2의 스플릿 워크스페이스. 지문과 에디터를 같은 다크 크롬 안에서 나눈다.
 */
export function Workspace({ problemId }: { problemId: string }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [source, setSource] = useState('')
  const [result, setResult] = useState<JudgeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [leftWidth, setLeftWidth] = useState(42)
  const [resultHeight, setResultHeight] = useState(168)

  useEffect(() => {
    let cancelled = false
    setProblem(null)
    setSource('')
    setResult(null)
    setError(null)
    fetch(`/api/problems/${encodeURIComponent(problemId)}`)
      .then(async (response) => {
        const body = await response.json() as ProblemDetail & ApiError
        if (cancelled) return
        if (!response.ok || !body.id) {
          setError(body.error?.kind ? `error.kind: ${body.error.kind}` : '문제를 불러오지 못했습니다.')
          return
        }
        const editable = body.files.find((file) => file.editable) ?? body.files[0]
        setProblem(body)
        setSource(editable?.content ?? '')
      })
      .catch(() => {
        if (!cancelled) setError(NETWORK_ERROR)
      })
    return () => {
      cancelled = true
    }
  }, [problemId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting || !problem) return
    setIsSubmitting(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          version: problem.version,
          source,
        }),
      })
      const body = await response.json() as JudgeResponse
      setResult(body)
      if (body.check?.execution === 'TESTS_PASSED') markPassed(problem.id)
    } catch {
      setError(NETWORK_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }

  function dragX(clientX: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = ((clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.min(62, Math.max(28, next)))
  }

  function dragY(clientY: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    setResultHeight(Math.min(320, Math.max(96, rect.bottom - clientY)))
  }

  if (error && !problem) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteHeader center={<a href="#/" className="text-mute no-underline hover:text-ink">문제 목록</a>} />
        <p role="alert" className="px-5 py-10 text-[14px] text-danger">{error}</p>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteHeader center={<a href="#/" className="text-mute no-underline hover:text-ink">문제 목록</a>} />
        <p className="px-5 py-10 text-[14px] text-mute">작업공간을 불러오는 중…</p>
      </div>
    )
  }

  const editable = problem.files.find((file) => file.editable) ?? problem.files[0]
  const editorLabel = editable?.path ?? '소스 코드'

  return (
    <form className="flex h-dvh flex-col bg-void text-ink" onSubmit={submit}>
      <SiteHeader
        center={
          <nav className="flex items-center gap-2 text-[12px] text-mute">
            <a href="#/" className="text-mute no-underline hover:text-ink">문제 목록</a>
            <span>/</span>
            <span>{categoryLabel(problem.category)}</span>
            <span>/</span>
            <span className="max-w-[28rem] truncate text-ink">{problem.title}</span>
          </nav>
        }
        trailing={
          <span>{difficultyLabel(problem.difficulty)} · {problem.estimatedMinutes}분</span>
        }
      />
      <div ref={shellRef} className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0" style={{ width: `${leftWidth}%` }}>
          <StatementPane
            title={problem.title}
            meta={`${difficultyLabel(problem.difficulty)} · ${problem.estimatedMinutes}분 · v${problem.version}`}
            statement={problem.statement}
          />
        </div>
        <SplitHandle axis="x" onDrag={dragX} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorPane path={editorLabel} value={source} disabled={isSubmitting} onChange={setSource} />
          <SplitHandle axis="y" onDrag={dragY} />
          <div style={{ height: resultHeight }}>
            <JudgeResult result={result} />
          </div>
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-line bg-panel px-5 py-2.5">
        <a href="#/" className="text-[13px] text-mute no-underline hover:text-ink">문제 목록</a>
        <div className="flex items-center gap-4">
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-acid px-4 py-2 text-[13px] font-semibold tracking-[-0.02em] text-acid-ink disabled:opacity-55"
          >
            {isSubmitting ? '채점 중…' : '제출하기'}
          </button>
        </div>
      </footer>
    </form>
  )
}
