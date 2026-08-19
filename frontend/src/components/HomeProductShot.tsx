import { ReactNode } from 'react'
import {
  LANDING_INTERVIEW_QUESTIONS,
<<<<<<< Updated upstream
  LANDING_PASSED_RESULT,
=======
>>>>>>> Stashed changes
  LANDING_PROBLEM,
  ROLE_SERVICE_BUGGY,
  ROLE_SERVICE_FIXED,
} from '../landingExample'
import { InterviewCards } from './InterviewCards'
import { JudgeResult } from './JudgeResult'

function ShotCode({ source, markLine }: { source: string; markLine?: number }) {
  const lines = source.replace(/\n$/, '').split('\n')
  return (
    <div className="lp-monaco">
      {lines.map((line, index) => {
        const n = index + 1
        return (
          <div
            key={n}
            className={n === markLine ? 'lp-monaco-row is-mark' : 'lp-monaco-row'}
          >
            <span className="lp-monaco-ln">{n}</span>
            <span>{highlightJava(line)}</span>
          </div>
        )
      })}
    </div>
  )
}

function highlightJava(line: string): ReactNode {
  const parts = line.split(/(\b(?:package|public|final|class|record|return|if|boolean|String|RoleChangeRequest|RoleService)\b)/g)
  return parts.map((part, index) => {
    if (/^(package|public|final|class|record|return|if|boolean)$/.test(part)) {
      return <span key={index} className="tok-keyword">{part}</span>
    }
    if (/^(String|RoleChangeRequest|RoleService)$/.test(part)) {
      return <span key={index} className="tok-type">{part}</span>
    }
    return <span key={index}>{part}</span>
  })
}

function ShotEditor({ source, markLine }: { source: string; markLine?: number }) {
  return (
    <div className="editor-pane">
      <div className="editor-head">
        <span className="editor-path">{LANDING_PROBLEM.filePath}</span>
        <span className="lang">Java</span>
      </div>
      <div className="editor-body">
        <div className="editor-monaco">
          <ShotCode source={source} markLine={markLine} />
        </div>
      </div>
    </div>
  )
}

<<<<<<< Updated upstream
=======
const passed = {
  runStatus: 'COMPLETED' as const,
  check: { execution: 'TESTS_PASSED' as const },
  problem: { id: LANDING_PROBLEM.id, version: LANDING_PROBLEM.version },
}

>>>>>>> Stashed changes
/**
 * 랜딩 샷은 실제 작업공간 UI를 섹션 역할에 맞게 crop한다.
 */
export function HomeProductShot({
  kind,
}: {
  kind: 'hero' | 'editor' | 'judge' | 'interview'
}) {
  const className = `workspace lp-shot lp-shot--${kind}`

  if (kind === 'hero') {
    return (
      <div className={className} aria-hidden="true">
        <ShotEditor source={ROLE_SERVICE_BUGGY} markLine={6} />
      </div>
    )
  }

  if (kind === 'editor') {
    return (
      <div className={className} aria-hidden="true">
        <ShotEditor source={ROLE_SERVICE_FIXED} markLine={6} />
      </div>
    )
  }

  if (kind === 'judge') {
    return (
      <div className={className} aria-hidden="true">
        <div className="result-pane">
<<<<<<< Updated upstream
          <JudgeResult result={LANDING_PASSED_RESULT} />
=======
          <JudgeResult result={passed} />
>>>>>>> Stashed changes
        </div>
      </div>
    )
  }

  return (
    <div className={className} aria-hidden="true">
      <div className="result-pane">
        <InterviewCards status="generated" questions={LANDING_INTERVIEW_QUESTIONS} />
      </div>
    </div>
  )
}
