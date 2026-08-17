/**
 * 캡처 1 히어로: 카피는 왼쪽, 진행 위젯은 오른쪽.
 * 위·아래 패딩을 같게 두고, 설명은 한 줄로 유지한다.
 */
export function CatalogHero({ passed, total }: { passed: number; total: number }) {
  const ratio = total === 0 ? 0 : passed / total

  return (
    <section className="rise grid items-center gap-10 border-b border-line px-5 py-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.7fr)]">
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-acid">DEBUG · VERIFY · HARDEN</p>
        <h1 className="mt-4 max-w-[38rem] text-[clamp(2.1rem,5vw,3.35rem)] font-semibold leading-[1.12] tracking-[-0.045em] text-ink">
          AI와 함께 고치고,
          <br />
          테스트로 증명하세요.
        </h1>
        <p className="mt-5 whitespace-nowrap text-[15px] leading-7 text-mute">
          이미 깨져 있는 코드를 진단하고, 고치고, 다시 검증합니다. 점수가 아니라 통과한 수정만 남습니다.
        </p>
      </div>
      <aside className="w-full max-w-[16.5rem] justify-self-start border border-line bg-panel p-4 lg:justify-self-end">
        <div className="h-px w-full bg-line">
          <div className="h-px bg-acid" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <p className="mt-3 text-[11px] tracking-[0.16em] text-mute">MVP 문제 진행</p>
        <p className="mt-1 font-mono text-[28px] font-medium tracking-[-0.04em] text-ink">
          {passed}
          <span className="text-mute"> / {total}</span>
        </p>
        <p className="mt-2 text-[12px] leading-5 text-mute">점수가 아니라 검증 횟수를 기록합니다.</p>
      </aside>
    </section>
  )
}
