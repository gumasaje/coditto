import { useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { InterviewCards } from './components/InterviewCards'
import { JudgeResult } from './components/JudgeResult'
import { SiteHeader } from './components/SiteHeader'
import { SplitHandle } from './components/SplitHandle'
import { StatementPane } from './components/StatementPane'
import { catalogHash } from './routes'

const PREVIEW_SOURCE = `public Set<Role> updateRole(String memberId, Role requested) {
    Member member = members.get(memberId);
    if (requested == null) {
        return member.getRoles();
    }
    Set<Role> next = new HashSet<>(member.getRoles());
    next.add(requested);
    member.setRoles(next);
    return next;
}`

export const PREVIEW_QUESTIONS = [
  {
    question: '역할이 생략된 경우를 왜 구분해야 합니까?',
    rationale: '제출 코드가 두 경로를 같은 분기로 처리합니다.',
  },
  {
    question: '기존 권한을 보존하려면 무엇을 확인해야 합니까?',
    rationale: 'diff가 컬렉션을 바로 대체합니다.',
  },
  {
    question: 'null 입력이 안전한 이유를 설명해 보세요.',
    rationale: '추가된 조건이 null 경로를 처리합니다.',
  },
]

/**
 * 통과 후 채점 슬롯 아래에 붙는 면접 카드를 작업공간 레이아웃 그대로 보여 준다.
 */
export function InterviewPreview() {
  const shellRef = useRef<HTMLDivElement>(null)
  const [source, setSource] = useState(PREVIEW_SOURCE)
  const [leftWidth, setLeftWidth] = useState(42)
  const [resultHeight, setResultHeight] = useState(360)

  function dragX(clientX: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    setLeftWidth(Math.min(62, Math.max(28, ((clientX - rect.left) / rect.width) * 100)))
  }

  function dragY(clientY: number) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    setResultHeight(Math.min(520, Math.max(160, rect.bottom - clientY)))
  }

  return (
    <div className="workspace">
      <SiteHeader
        center={
          <nav className="crumb">
            <a href="#/">문제 목록</a>
            <span>/</span>
            <a href={catalogHash('Backend')}>Back-End</a>
            <span>/</span>
            <span className="crumb-current">회원 권한 수정 시 기존 관리자 권한이 사라져요</span>
          </nav>
        }
        trailing={<span>Easy · 30분</span>}
      />
      <div ref={shellRef} className="workspace-body">
        <div className="pane-left" style={{ width: `${leftWidth}%` }}>
          <StatementPane
            title="회원 권한 수정 시 기존 관리자 권한이 사라져요"
            meta="Easy · 30분 · v1"
            statement={'# 역할 변경 승인 버그\n\n테스트가 통과하면 채점 결과 아래에 면접 카드 세 장이 붙습니다. 질문은 제출 diff와 문제 지문으로만 만듭니다.'}
          />
        </div>
        <SplitHandle axis="x" onDrag={dragX} />
        <div className="editor-col">
          <EditorPane
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
            onChange={setSource}
          />
          <SplitHandle axis="y" onDrag={dragY} />
          <div className="result-pane" style={{ height: resultHeight }}>
            <JudgeResult
              result={{
                runStatus: 'COMPLETED',
                check: { execution: 'TESTS_PASSED' },
                problem: { id: 'role-update-001', version: 1 },
              }}
            />
            <InterviewCards status="generated" questions={PREVIEW_QUESTIONS} />
          </div>
        </div>
      </div>
      <footer className="workspace-footer">
        <a href="#/">문제 목록</a>
        <p className="mute">미리보기 · 실제 제출 없이 통과 후 카드를 보여 줍니다</p>
      </footer>
    </div>
  )
}
