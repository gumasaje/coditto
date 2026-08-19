import { ReactNode } from 'react'
import { HomeProductShot } from './components/HomeProductShot'
import { SiteHeader } from './components/SiteHeader'
import { CodittoWordmark } from './components/CodittoMark'
import { LANDING_PROBLEM } from './landingExample'

function HexIcon({
  children,
  className = 'lp-hex',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24">{children}</svg>
    </span>
  )
}

/**
 * 프로토타입 홈을 실제 role-update-001 작업공간 샷에 맞춘 editorial 랜딩으로 유지한다.
 */
export function Home() {
  return (
    <div className="page lp-page">
      <SiteHeader current="home" />
      <main id="main" tabIndex={-1}>
        <section className="lp-hero" aria-label="홈">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-visual">
              <div className="lp-orb" />
              <HomeProductShot kind="hero" />
            </div>
            <div className="lp-hero-copy">
              <p className="lp-kicker">CODE REVIEW, BY DOING</p>
              <h1 className="lp-hero-title">읽고,<br />고치고,<br />검증하세요.</h1>
              <p className="lp-hero-lead">깨진 코드를 열고, 제출로 확인.</p>
              <a className="lp-hero-link" href="#/problems">문제 보기 <span className="arrow">→</span></a>
            </div>
          </div>
        </section>

        <section className="lp-intro" aria-labelledby="lp-intro-title">
          <div className="lp-wrap lp-intro-grid">
            <div className="lp-intro-copy">
              <HexIcon>
                <path d="M8 17l-5-5 5-5M16 7l5 5-5 5M14 4l-4 16" />
              </HexIcon>
              <h2 id="lp-intro-title">코드를 직접 고쳐보세요</h2>
              <p>설명을 고르는 대신, 실제 파일을 열어 수정.</p>
              <a className="lp-simple-link" href={`#/problems/${LANDING_PROBLEM.id}`}>
                이 문제 열기 <span className="arrow">›</span>
              </a>
            </div>
            <div className="lp-intro-preview">
              <HomeProductShot kind="editor" />
              <div className="lp-intro-note" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12l4 4L19 6" />
                </svg>
                직접 수정
              </div>
            </div>
          </div>
        </section>

        <section className="lp-features" aria-label="문제에서 면접까지">
          <div className="lp-wrap lp-feature-grid">
            <article className="lp-feature">
              <HexIcon className="lp-mini-hex">
                <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
              </HexIcon>
              <p className="lp-feature-label">CONTEXT</p>
              <h3>문제는 실제 코드로</h3>
              <p>증상과 제약을 읽고, 수정 가능한 파일만 엽니다.</p>
            </article>
            <article className="lp-feature">
              <HexIcon className="lp-mini-hex lp-mini-hex--denim">
                <path d="M8 12l3 3 5-6M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
              </HexIcon>
              <p className="lp-feature-label">JUDGE</p>
              <h3>제출하면 테스트로 판정</h3>
              <p>
                실행 결과는 컴파일 실패, 테스트 성공, 테스트 실패입니다.
                실패하면 목표와 회귀 중 어느 쪽이 깨졌는지 붙습니다.
              </p>
            </article>
            <article className="lp-feature">
              <HexIcon className="lp-mini-hex lp-mini-hex--navy">
                <path d="M4 5h16v11H9l-5 4V5zM8 9h8M8 12h5" />
              </HexIcon>
              <p className="lp-feature-label">INTERVIEW</p>
              <h3>통과 뒤엔 질문 세 장</h3>
              <p>지문과 제출 diff로 다음 질문을 만듭니다.</p>
            </article>
          </div>
        </section>

        <section className="lp-workspace" aria-labelledby="lp-workspace-title">
          <div className="lp-wrap">
            <HexIcon>
              <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 6l-4 12" />
            </HexIcon>
            <h2 id="lp-workspace-title">제출하면 테스트로 판정</h2>
            <p>실행 결과에 컴파일 실패, 테스트 성공, 테스트 실패가 붙습니다.</p>
            <HomeProductShot kind="judge" />
          </div>
        </section>

        <section className="lp-interview" aria-labelledby="lp-interview-title">
          <div className="lp-wrap lp-interview-grid">
            <div className="lp-interview-copy">
              <p className="lp-interview-eyebrow">AFTER JUDGE</p>
              <h2 id="lp-interview-title">고친 이유까지<br />설명해보세요</h2>
              <p>통과한 제출의 지문과 diff로 질문 세 장이 붙습니다.</p>
            </div>
            <HomeProductShot kind="interview" />
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-wrap">
            <a className="wordmark wordmark--footer" href="#/" aria-label="Coditto">
              <CodittoWordmark onLight />
            </a>
            <h2>읽고, 고치고, 설명.</h2>
            <p>
              <a className="lp-simple-link" href="#/problems">문제 목록 <span className="arrow">→</span></a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
