import { useEffect, useState } from 'react'
import { Catalog } from './Catalog'
import { InterviewPreview } from './InterviewPreview'
import { Workspace } from './Workspace'
import { isInterviewPreview, readProblemId } from './routes'

export function App() {
  const [problemId, setProblemId] = useState(readProblemId)
  const [interviewPreview, setInterviewPreview] = useState(isInterviewPreview)

  useEffect(() => {
    const sync = () => {
      setProblemId(readProblemId())
      setInterviewPreview(isInterviewPreview())
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (interviewPreview) return <InterviewPreview />
  return problemId ? <Workspace problemId={problemId} /> : <Catalog />
}
