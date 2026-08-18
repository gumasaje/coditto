/**
 * 캡처 1 히어로: 카피는 왼쪽, 진행 위젯은 오른쪽.
 */
export function CatalogHero({ passed, total }: { passed: number; total: number }) {
  const ratio = total === 0 ? 0 : passed / total

  return (
    <section className="hero rise">
      <div>
        <p className="kicker">DEBUG · VERIFY · HARDEN</p>
        <h1>
          AI와 함께 고치고,
          <br />
          테스트로 증명하세요.
        </h1>
        <p className="hero-copy">
          이미 깨져 있는 코드를 진단하고, 고치고, 다시 검증합니다. 점수가 아니라 통과한 수정만 남습니다.
        </p>
      </div>
      <aside className="progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <p className="progress-label">MVP 문제 진행</p>
        <p className="progress-count">
          {passed}
          <span className="text-mute"> / {total}</span>
        </p>
        <p>점수가 아니라 검증 횟수를 기록합니다.</p>
      </aside>
    </section>
  )
}
