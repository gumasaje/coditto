import { useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { InterviewCards } from './components/InterviewCards'
import { JudgeResult } from './components/JudgeResult'
import { SiteHeader } from './components/SiteHeader'
import { SplitHandle } from './components/SplitHandle'
import { StatementPane } from './components/StatementPane'
import { LANDING_INTERVIEW_QUESTIONS, LANDING_PASSED_RESULT, LANDING_PROBLEM, ROLE_SERVICE_FIXED } from './landingExample'
import { catalogHash } from './routes'

export const PREVIEW_QUESTIONS = LANDING_INTERVIEW_QUESTIONS

/**
 * 통과 후 채점 슬롯 아래에 붙는 면접 카드를 작업공간 레이아웃 그대로 보여 준다.
 */
export function InterviewPreview() {
  const shellRef = useRef<HTMLDivElement>(null)
  const [source, setSource] = useState(ROLE_SERVICE_FIXED)
  const [leftWidth, setLeftWidth] = useState(28)
  const [resultHeight, setResultHeight] = useState(360)

  function dragX(clientX: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    setLeftWidth(Math.min(48, Math.max(22, ((clientX - rect.left) / rect.width) * 100)))
  }

  function dragY(clientY: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    setResultHeight(Math.min(520, Math.max(160, rect.bottom - clientY)))
  }

  return (
    <div className="workspace">
      <SiteHeader
        current="workspace"
        center={
          <nav className="crumb">
            <a href="#/problems">문제 목록</a>
            <span>/</span>
            <a href={catalogHash('Backend')}>Back-End</a>
            <span>/</span>
            <span className="crumb-current">{LANDING_PROBLEM.title}</span>
          </nav>
        }
      />
      <main id="main" tabIndex={-1} ref={shellRef} className="workspace-body">
        <div className="pane-left" style={{ width: `${leftWidth}%` }}>
          <StatementPane
            title={LANDING_PROBLEM.title}
            meta="Easy · 15분 · v1"
            statement={'# 역할 변경 승인 버그\n\n테스트가 통과하면 채점 결과 아래에 면접 카드 세 장이 붙습니다. 질문은 제출 diff와 문제 지문으로만 만듭니다.'}
            editablePaths={[LANDING_PROBLEM.filePath]}
            onOpenFile={() => undefined}
          />
        </div>
        <SplitHandle axis="x" onDrag={dragX} />
        <div className="editor-col">
          <EditorPane
            problemId="interview-preview"
            files={[{
              path: 'src/main/java/com/coditto/demo/RoleService.java',
              editable: true,
              content: source,
            }]}
            activePath="src/main/java/com/coditto/demo/RoleService.java"
            value={source}
            disabled={false}
            readOnly={false}
            onSelectPath={() => undefined}
            onChange={(_path, next) => setSource(next)}
          />
          <SplitHandle axis="y" onDrag={dragY} />
          <div className="result-pane" style={{ height: resultHeight }}>
            <JudgeResult result={LANDING_PASSED_RESULT} />
            <InterviewCards status="generated" questions={PREVIEW_QUESTIONS} />
          </div>
        </div>
      </main>
    </div>
  )
}
