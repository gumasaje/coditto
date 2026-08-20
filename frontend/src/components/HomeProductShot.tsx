import { ReactNode } from 'react'
import {
  LANDING_FAILED_RESULT,
  LANDING_INTERVIEW_QUESTIONS,
  LANDING_PROBLEM,
  ROLE_SERVICE_BUGGY,
} from '../landingExample'
import { JudgeResponse } from '../types'
import { FileKindIcon } from './FileKindIcon'
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

/** 작업공간의 수정 가능 파일 배지를 조작할 수 없는 형태로만 옮긴다. */
function ShotEditableFiles() {
  return (
    <div className="lp-shot-files">
      <p className="editable-files-label">수정 가능한 파일</p>
      <div className="editable-files-list">
        <span className="file-badge">
          <FileKindIcon name={LANDING_PROBLEM.fileName} />
          <span>{LANDING_PROBLEM.fileName}</span>
        </span>
      </div>
    </div>
  )
}

function ShotEditor({ source, markLine }: { source: string; markLine?: number }) {
  return (
    <div className="editor-pane">
      <div className="editor-head">
        <span className="editor-path">{LANDING_PROBLEM.fileName}</span>
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

/**
 * 랜딩 샷은 실제 작업공간 UI를 섹션 역할에 맞게 crop한다.
 * `live`인 샷만 접근성 트리에 남긴다. 읽는 사람이 조작할 수 있는 채점 미리보기가 그 경우다.
 */
export function HomeProductShot({
  kind,
  source,
  markLine = 6,
  result,
  live = false,
  showEditableFiles = false,
}: {
  kind: 'hero' | 'editor' | 'judge' | 'interview'
  source?: string
  markLine?: number
  result?: JudgeResponse
  live?: boolean
  showEditableFiles?: boolean
}) {
  const className = `workspace lp-shot lp-shot--${kind}`
  const hidden = live ? undefined : true

  if (kind === 'hero' || kind === 'editor') {
    return (
      <div className={className} aria-hidden={hidden}>
        {showEditableFiles ? <ShotEditableFiles /> : null}
        <ShotEditor source={source ?? ROLE_SERVICE_BUGGY} markLine={markLine} />
      </div>
    )
  }

  if (kind === 'judge') {
    return (
      <div className={className} aria-hidden={hidden}>
        <div className="result-pane">
          <JudgeResult result={result ?? LANDING_FAILED_RESULT} />
        </div>
      </div>
    )
  }

  return (
    <div className={className} aria-hidden={hidden}>
      <div className="result-pane">
        <InterviewCards status="generated" questions={LANDING_INTERVIEW_QUESTIONS} />
      </div>
    </div>
  )
}
