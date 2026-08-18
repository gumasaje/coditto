import { ReactNode } from 'react'

function focusMain() {
  const main = document.getElementById('main')
  if (!(main instanceof HTMLElement)) return
  main.tabIndex = -1
  main.focus()
  window.setTimeout(() => {
    if (document.activeElement !== main) main.focus()
  }, 0)
}

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
  return (
    <>
      <button type="button" className="skip" onClick={focusMain}>본문으로 건너뛰기</button>
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
