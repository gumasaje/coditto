import { FormEvent, useEffect, useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { InterviewCards } from './components/InterviewCards'
import { JudgeResult } from './components/JudgeResult'
import { SiteHeader } from './components/SiteHeader'
import { SplitHandle } from './components/SplitHandle'
import { StatementPane } from './components/StatementPane'
import { NETWORK_ERROR, categoryLabel, difficultyLabel } from './copy'
import { catalogHash } from './routes'
import { markPassed } from './progress'
import {
  ApiError,
  InterviewQuestion,
  InterviewResponse,
  JudgeResponse,
  ProblemDetail,
  shouldRequestInterview,
} from './types'

type InterviewStatus = 'idle' | 'loading' | 'generated' | 'unavailable'

/**
 * 캡처 2의 스플릿 워크스페이스. 지문과 에디터를 같은 다크 크롬 안에서 나눈다.
 * 면접 카드는 판정과 분리된 후속 호출이며, 생성 실패 시 카드만 접는다.
 */
export function Workspace({ problemId }: { problemId: string }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const interviewSeq = useRef(0)
  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [source, setSource] = useState('')
  const [result, setResult] = useState<JudgeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('idle')
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [leftWidth, setLeftWidth] = useState(42)
  const [resultHeight, setResultHeight] = useState(220)

  useEffect(() => {
    let cancelled = false
    setProblem(null)
    setSource('')
    setResult(null)
    setError(null)
    setInterviewStatus('idle')
    setQuestions([])
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

  async function loadInterview(seq: number, next: ProblemDetail, submittedSource: string) {
    setInterviewStatus('loading')
    setQuestions([])
    try {
      const response = await fetch('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: next.id,
          version: next.version,
          source: submittedSource,
        }),
      })
      const body = await response.json() as InterviewResponse
      if (seq !== interviewSeq.current) return
      if (body.status === 'GENERATED' && body.questions?.length === 3) {
        setQuestions(body.questions)
        setInterviewStatus('generated')
        return
      }
      setInterviewStatus('unavailable')
    } catch {
      if (seq !== interviewSeq.current) return
      setInterviewStatus('unavailable')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting || !problem) return
    const seq = interviewSeq.current + 1
    interviewSeq.current = seq
    setIsSubmitting(true)
    setResult(null)
    setError(null)
    setInterviewStatus('idle')
    setQuestions([])
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
      if (shouldRequestInterview(body)) {
        void loadInterview(seq, problem, source)
      }
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
    setResultHeight(Math.min(420, Math.max(96, rect.bottom - clientY)))
  }

  if (error && !problem) {
    return (
      <div className="page">
        <SiteHeader center={<a href="#/">문제 목록</a>} />
        <p role="alert" className="note note-error">{error}</p>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="page">
        <SiteHeader center={<a href="#/">문제 목록</a>} />
        <p className="note">작업공간을 불러오는 중…</p>
      </div>
    )
  }

  const editable = problem.files.find((file) => file.editable) ?? problem.files[0]
  const editorLabel = editable?.path ?? '소스 코드'

  return (
    <form className="workspace" onSubmit={submit}>
      <SiteHeader
        center={
          <nav className="crumb">
            <a href="#/">문제 목록</a>
            <span>/</span>
            <a href={catalogHash(problem.category)}>{categoryLabel(problem.category)}</a>
            <span>/</span>
            <span className="crumb-current">{problem.title}</span>
          </nav>
        }
        trailing={
          <span>{difficultyLabel(problem.difficulty)} · {problem.estimatedMinutes}분</span>
        }
      />
      <div ref={shellRef} className="workspace-body">
        <div className="pane-left" style={{ width: `${leftWidth}%` }}>
          <StatementPane
            title={problem.title}
            meta={`${difficultyLabel(problem.difficulty)} · ${problem.estimatedMinutes}분 · v${problem.version}`}
            statement={problem.statement}
          />
        </div>
        <SplitHandle axis="x" onDrag={dragX} />
        <div className="editor-col">
          <EditorPane path={editorLabel} value={source} disabled={isSubmitting} onChange={setSource} />
          <SplitHandle axis="y" onDrag={dragY} />
          <div className="result-pane" style={{ height: resultHeight }}>
            <JudgeResult result={result} />
            <InterviewCards status={interviewStatus} questions={questions} />
          </div>
        </div>
      </div>
      <footer className="workspace-footer">
        <a href="#/">문제 목록</a>
        <div className="footer-actions">
          {error && <p role="alert" className="danger">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="submit">
            {isSubmitting ? '채점 중…' : '제출하기'}
          </button>
        </div>
      </footer>
    </form>
  )
}
