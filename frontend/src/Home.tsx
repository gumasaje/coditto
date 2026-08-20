import { ReactNode } from 'react'
import { HomeProductShot } from './components/HomeProductShot'
import { SiteHeader } from './components/SiteHeader'
import { LANDING_PROBLEM } from './landingExample'

/**
 * 팀명 타바코를 그대로 그린 푸터 마크. 불붙은 끝, 몸통, 필터, 연기 두 줄.
 */
function TabacoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 56" aria-hidden="true">
      <path
        d="M15 30c0-5 5-5 5-10"
        fill="none"
        stroke="#778da9"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M25 28c0-5 5-5 5-10"
        fill="none"
        stroke="#778da9"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path d="M15 35h-1a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h1z" fill="#e07070" />
      <path d="M42 35h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-8z" fill="#778da9" />
      <rect
        x="10"
        y="35"
        width="44"
        height="12"
        rx="4"
        fill="none"
        stroke="#415a77"
        strokeWidth="3"
      />
    </svg>
  )
}

/** GitHub 공식 마크(octicons mark-github). 저장소로 연결하는 용도로만 쓴다. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  )
}

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
 * 섹션마다 다른 사실을 맡고, 뒤 섹션이 앞 섹션 설명을 되풀이하지 않는다.
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
              <h1 className="lp-hero-title">코드를 검증하는 훈련</h1>
              <p className="lp-hero-lead">
                Coditto는 이미 작성된 코드에서 버그를 찾고 고치는 훈련 서비스입니다. AI가
                만든 코드가 맞는지 판단하는 감각을 기릅니다.
              </p>
              <a className="lp-hero-link" href="#/problems">문제 풀어보기 <span className="arrow">→</span></a>
            </div>
          </div>
        </section>

        <section className="lp-intro" aria-labelledby="lp-intro-title">
          <div className="lp-wrap lp-intro-grid">
            <div className="lp-intro-copy">
              <div className="lp-intro-head">
                <h2 id="lp-intro-title">작업공간</h2>
                <HexIcon>
                  <path d="M3 5h18v14H3zM10 5v14M13 10h5" />
                </HexIcon>
              </div>
              <p>
                문제를 열면 프로젝트의 소스 파일이 표시됩니다. 수정할 수 있는 파일은 따로
                안내되며, 나머지 파일은 내용을 참고할 수 있지만 읽기 전용으로 제공됩니다.
              </p>
              <a className="lp-simple-link" href={`#/problems/${LANDING_PROBLEM.id}`}>
                이 문제 열기 <span className="arrow">›</span>
              </a>
            </div>
            <div className="lp-intro-preview">
              <HomeProductShot kind="editor" showEditableFiles />
              <div className="lp-intro-note" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12l4 4L19 6" />
                </svg>
                수정 가능
              </div>
            </div>
          </div>
        </section>

        <section className="lp-workspace" aria-labelledby="lp-workspace-title">
          <div className="lp-wrap">
            <HexIcon>
              <path d="M9 3v6l-5 9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-5-9V3M8 3h8M7 15h10" />
            </HexIcon>
            <h2 id="lp-workspace-title">채점</h2>
            <p>
              제출한 코드로 프로젝트를 빌드하고, 문제의 테스트를 실행한 결과를 표시합니다.
            </p>
            <p>
              테스트는 두 종류로 나뉩니다. 목표 테스트는 문제에서 요구한 동작을 확인하고,
              회귀 테스트는 수정 때문에 기존 동작이 깨지지 않았는지 확인합니다. 아래
              예시에서 6번 줄을 고치면 결과가 어떻게 달라지는지 볼 수 있습니다.
            </p>
            <HomeProductShot kind="judge" />
          </div>
        </section>

        <section className="lp-interview" aria-labelledby="lp-interview-title">
          <div className="lp-wrap lp-interview-grid">
            <div className="lp-interview-copy">
              <h2 id="lp-interview-title">면접 질문</h2>
              <p>
                테스트를 통과하면 문제 설명과 수정한 코드를 바탕으로 질문 3개가 생성됩니다.
                수정 방식에 따라 질문도 달라지며, 점수는 매기지 않습니다.
              </p>
            </div>
            <HomeProductShot kind="interview" />
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-wrap">
            <TabacoMark className="lp-footer-symbol" />
            <p className="lp-footer-sign">Built by Tabaco.</p>
            <p className="lp-footer-note">
              타바코는 ‘타도 바이브 코딩’의 줄임말입니다. 바이브 코딩을 지양하자는
              이름이지만, 바이브 코딩은 담배처럼 쉽게 끊기지 않습니다.
            </p>
            <p className="lp-footer-note">
              Coditto는 <em>Cogito</em>(나는 생각한다)와 <em>code</em> + <em>ditto</em>(동감)에서
              가져온 이름입니다. AI가 제안한 코드에 그대로 <em>ditto</em>를 찍기보다, 직접
              고치고 테스트하며 내 것으로 만드는 경험을 지향합니다.
            </p>

            <hr className="lp-footer-rule" />

            <p className="lp-footer-note">
              프로젝트는 아직 진행 중입니다. 코드와 문제, 이슈는 모두 공개되어 있습니다.
            </p>
            <p>
              <a
                className="lp-footer-github"
                href="https://github.com/gumasaje/coditto"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub 저장소"
              >
                <GitHubMark />
              </a>
            </p>

            <hr className="lp-footer-rule" />

            <p className="lp-footer-copy">Copyright © 2026 Tabaco</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
