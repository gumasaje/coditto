export type Execution = 'TESTS_PASSED' | 'TESTS_FAILED' | 'COMPILE_FAILED' | 'TIMED_OUT' | 'RESOURCE_LIMITED'
export type SuiteResult = 'TESTS_PASSED' | 'TESTS_FAILED'

export type JudgeSuites = {
  target: SuiteResult
  regression: SuiteResult
}

export type JudgeResponse = {
  schemaVersion?: string
  problem?: { id?: string; version?: number }
  runStatus: 'COMPLETED' | 'REJECTED' | 'SYSTEM_FAILED'
  check?: { id?: string; execution?: Execution; suites?: JudgeSuites }
  error?: { kind?: string }
}

export type ProblemSummary = {
  id: string
  version: number
  title: string
  category: string
  stack: string
  bugType: string
  estimatedMinutes: number
  difficulty: string
}

export type ProblemCatalog = {
  categories: string[]
  problems: ProblemSummary[]
}

export type ProblemFile = {
  path: string
  editable: boolean
  content: string
}

export type ProblemDetail = {
  id: string
  version: number
  title: string
  category: string
  difficulty: string
  estimatedMinutes: number
  statement: string
  files: ProblemFile[]
  candidate: {
    allowedPaths: string[]
    maxFiles: number
    maxBytes: number
  }
}

export type ApiError = {
  error?: { kind?: string }
}

export type InterviewQuestion = {
  question: string
  rationale: string
}

export type InterviewResponse = {
  status: 'GENERATED' | 'UNAVAILABLE'
  questions: InterviewQuestion[]
}

export function shouldRequestInterview(result: JudgeResponse): boolean {
  return result.runStatus === 'COMPLETED' && result.check?.execution === 'TESTS_PASSED'
}
