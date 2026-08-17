import { useEffect, useState } from 'react'
import { Catalog } from './Catalog'
import { Workspace } from './Workspace'

const PROBLEM_ROUTE = /^#\/problems\/([^/]+)$/

function readProblemId(): string | null {
  const match = PROBLEM_ROUTE.exec(window.location.hash)
  return match ? decodeURIComponent(match[1]) : null
}

export function App() {
  const [problemId, setProblemId] = useState(readProblemId)

  useEffect(() => {
    const sync = () => setProblemId(readProblemId())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return problemId ? <Workspace problemId={problemId} /> : <Catalog />
}
