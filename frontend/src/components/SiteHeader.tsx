import { MouseEvent, ReactNode } from 'react'

/**
 * 프로토타입 내비: 워드마크, 문제 링크, 작업공간에서는 크럼을 오른쪽에 둔다.
 */
export function SiteHeader({
  current,
  center,
  trailing,
}: {
  current?: 'home' | 'problems' | 'workspace'
  center?: ReactNode
  trailing?: ReactNode
}) {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById('main')?.focus()
  }

  return (
    <>
      <a className="skip" href="#main" onClick={skip}>본문으로 건너뛰기</a>
      <header className="nav">
        <div className="nav-inner">
          <a className="wordmark" href="#/">
            <span className="wordmark-tile" />
            <span className="wordmark-text">Coditto</span>
          </a>
          <span className="nav-sep" />
          <a
            className="nav-link"
            href="#/problems"
            aria-current={current === 'problems' || current === 'workspace' ? 'page' : undefined}
          >
            문제
          </a>
          {center ? <div className="nav-center">{center}</div> : null}
          {trailing ? <div className="nav-trailing">{trailing}</div> : null}
        </div>
      </header>
      <div className="nav-rule" />
    </>
  )
}
