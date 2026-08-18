/**
 * 홈 하단: 문제 확인부터 면접 카드까지 실제 화면 흐름을 축소해 보여 준다.
 */
export function HomeWalkthrough() {
  return (
    <section className="walkthrough" aria-label="화면으로 보는 진행">
      <div className="section-head">
        <p className="eyebrow">WALKTHROUGH</p>
        <h2 className="section-title">화면으로 보는 진행</h2>
        <p className="walkthrough-lead">
          목록에서 문제를 고른 뒤 코드를 고치고 제출하면, 통과 후에 면접 카드가 붙습니다.
        </p>
      </div>
      <ol className="flow-rail">
        <li><span className="flow-rail-no">01</span> 문제 확인</li>
        <li className="flow-rail-arrow" aria-hidden="true">→</li>
        <li><span className="flow-rail-no">02</span> 코드 수정</li>
        <li className="flow-rail-arrow" aria-hidden="true">→</li>
        <li><span className="flow-rail-no">03</span> 실행 및 제출</li>
        <li className="flow-rail-arrow" aria-hidden="true">→</li>
        <li><span className="flow-rail-no">04</span> 면접 질문</li>
      </ol>
      <ol className="flow">
        <li className="flow-item">
          <div className="flow-copy">
            <span className="flow-no">01</span>
            <h3 className="flow-title">문제 확인</h3>
            <p className="flow-body">목록에서 문제를 고르면 지문과 주어진 코드를 확인할 수 있습니다.</p>
          </div>
          <div className="flow-frame" aria-hidden="true">
            <div className="flow-chrome">
              <span className="flow-dot" />
              <span className="flow-chrome-label">Coditto</span>
              <span className="flow-chrome-sep" />
              <span>문제</span>
            </div>
            <div className="flow-band">
              <p className="flow-page-title">문제</p>
            </div>
            <div className="flow-catalog">
              <div className="flow-row-head">
                <span />
                <span>문제</span>
                <span>오류 유형</span>
                <span>난이도</span>
              </div>
              <div className="flow-row">
                <span className="flow-num">01</span>
                <span>
                  <span className="flow-row-title">회원 권한 수정 시 기존 관리자 권한이 사라져요</span>
                  <span className="flow-row-sub">Back-End · Java · Spring</span>
                </span>
                <span>상태 보존</span>
                <span className="flow-num">Easy</span>
              </div>
            </div>
          </div>
        </li>
        <li className="flow-item">
          <div className="flow-copy">
            <span className="flow-no">02</span>
            <h3 className="flow-title">코드 수정</h3>
            <p className="flow-body">작업공간에서 원인을 찾고, 지정된 파일을 직접 수정합니다.</p>
          </div>
          <div className="flow-frame flow-frame-dark" aria-hidden="true">
            <div className="flow-chrome">
              <span className="flow-dot" />
              <span className="flow-chrome-label">Coditto</span>
              <span className="flow-chrome-sep" />
              <span>문제 목록 / Back-End</span>
            </div>
            <div className="flow-split">
              <div className="flow-pane">
                <p className="flow-kicker">INCIDENT</p>
                <p className="flow-pane-title">역할 변경 승인 버그</p>
                <p className="flow-pane-body">RoleService.updateRole은 승인된 요청을 반영해야 합니다.</p>
              </div>
              <div className="flow-pane flow-pane-editor">
                <p className="flow-path">RoleService.java</p>
                <pre className="flow-code">{`Set<Role> next = requested;
member.setRoles(next);`}</pre>
              </div>
            </div>
          </div>
        </li>
        <li className="flow-item">
          <div className="flow-copy">
            <span className="flow-no">03</span>
            <h3 className="flow-title">실행 및 제출</h3>
            <p className="flow-body">수정한 코드를 제출하면 채점 결과가 하단에 그대로 표시됩니다.</p>
          </div>
          <div className="flow-frame flow-frame-dark" aria-hidden="true">
            <div className="flow-chrome">
              <span className="flow-dot" />
              <span className="flow-chrome-label">Coditto</span>
              <span className="flow-chrome-sep" />
              <span>제출하기</span>
            </div>
            <div className="flow-result">
              <p className="flow-kicker flow-kicker-mute">JUDGE RESULT</p>
              <p className="flow-status">COMPLETED</p>
              <p className="flow-execution">TESTS_PASSED</p>
            </div>
          </div>
        </li>
        <li className="flow-item">
          <div className="flow-copy">
            <span className="flow-no">04</span>
            <h3 className="flow-title">면접 질문</h3>
            <p className="flow-body">통과하면 문제 유형과 코드를 바탕으로 면접 카드가 이어서 붙습니다.</p>
          </div>
          <div className="flow-frame flow-frame-dark" aria-hidden="true">
            <div className="flow-chrome">
              <span className="flow-dot" />
              <span className="flow-chrome-label">Coditto</span>
              <span className="flow-chrome-sep" />
              <span>면접 카드</span>
            </div>
            <div className="flow-cards">
              <p className="flow-kicker">INTERVIEW</p>
              <div className="flow-card">
                <p className="flow-num">01</p>
                <p className="flow-card-q">역할이 생략된 경우를 왜 구분해야 합니까?</p>
                <p className="flow-card-why">제출 코드가 두 경로를 같은 분기로 처리합니다.</p>
              </div>
              <div className="flow-card">
                <p className="flow-num">02</p>
                <p className="flow-card-q">기존 권한을 보존하려면 무엇을 확인해야 합니까?</p>
                <p className="flow-card-why">diff가 컬렉션을 바로 대체합니다.</p>
              </div>
            </div>
          </div>
        </li>
      </ol>
    </section>
  )
}
