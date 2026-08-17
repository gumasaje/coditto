import { ReactNode } from 'react'

/**
 * 캡처 1의 워드마크+슬로건 헤더를 뼈대로 두고, 높이와 1px 보더는 캡처 2의 IDE 크롬에서 가져왔다.
 */
export function SiteHeader({ center, trailing }: { center?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="site-header">
      <a href="#/" className="brand">
        <span className="brand-mark">C</span>
        <span className="brand-name">Coditto</span>
      </a>
      <div className="site-center">{center}</div>
      <div className="site-trailing">{trailing}</div>
    </header>
  )
}
