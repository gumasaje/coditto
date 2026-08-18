import { useEffect, useState } from 'react'
import { Catalog } from './Catalog'
import { Home } from './Home'
import { InterviewPreview } from './InterviewPreview'
import { Workspace } from './Workspace'
import { isCatalogRoute, isInterviewPreview, readProblemId } from './routes'

export function App() {
  const [problemId, setProblemId] = useState(readProblemId)
  const [interviewPreview, setInterviewPreview] = useState(isInterviewPreview)
  const [catalogRoute, setCatalogRoute] = useState(isCatalogRoute)

  useEffect(() => {
    const sync = () => {
      setProblemId(readProblemId())
      setInterviewPreview(isInterviewPreview())
      setCatalogRoute(isCatalogRoute())
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (interviewPreview) return <InterviewPreview />
  if (problemId) return <Workspace problemId={problemId} />
  if (catalogRoute) return <Catalog />
  return <Home />
}
