import { HomeWalkthrough } from './components/HomeWalkthrough'
import { SiteHeader } from './components/SiteHeader'

/**
 * 프로토타입 홈: 네이비 히어로와 문제 해결 4단계, 이어서 화면 흐름.
 */
export function Home() {
  return (
    <div className="page">
      <SiteHeader current="home" />
      <main id="main" tabIndex={-1}>
        <section className="band" aria-label="홈">
          <div className="shell hero">
            <h1 className="hero-title">코드를 읽는 것에서 끝나지 않고,<br />직접 수정합니다.</h1>
            <p className="hero-body">
              문제가 있는 코드를 확인하고 원인을 찾아 직접 수정합니다.
              <br />
              수정한 코드를 실행해 결과를 확인한 뒤 제출할 수 있습니다.
            </p>
            <a className="cta" href="#/problems">문제 보기 <span className="arrow">→</span></a>
          </div>
        </section>
        <div className="shell">
          <div className="section-head">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2 className="section-title">문제를 해결하는 과정</h2>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step-no">01</span>
              <div className="step-text">
                <p className="step-title">문제 확인</p>
                <p className="step-body">문제 상황과 주어진 코드를 확인합니다.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-no">02</span>
              <div className="step-text">
                <p className="step-title">코드 수정</p>
                <p className="step-body">문제의 원인을 찾고 직접 코드를 수정합니다.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-no">03</span>
              <div className="step-text">
                <p className="step-title">실행 및 제출</p>
                <p className="step-body">수정한 코드를 실행해 결과를 확인하고 제출합니다.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-no">04</span>
              <div className="step-text">
                <p className="step-title">면접 질문</p>
                <p className="step-body">문제의 유형과 코드를 확인한 뒤, 면접 카드를 보여줍니다.</p>
              </div>
            </li>
          </ol>
          <HomeWalkthrough />
          <div className="tail-link">
            <a className="underlink" href="#/problems">문제 풀어보기 <span className="arrow">→</span></a>
          </div>
        </div>
      </main>
    </div>
  )
}
