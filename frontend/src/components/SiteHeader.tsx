import { ReactNode } from 'react'

/**
 * 캡처 1의 워드마크+슬로건 헤더를 뼈대로 두고, 높이와 1px 보더는 캡처 2의 IDE 크롬에서 가져왔다.
 * 원형 뱃지 로고 대신 각진 마크를 써서 장식 아이콘처럼 보이지 않게 했다.
 */
export function SiteHeader({ center, trailing }: { center?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line px-5 py-3">
      <a href="#/" className="flex items-center gap-2.5 justify-self-start no-underline">
        <span className="grid h-7 w-7 place-items-center bg-acid text-[13px] font-bold tracking-[-0.04em] text-acid-ink">C</span>
        <span className="text-[15px] font-semibold tracking-[-0.03em] text-ink">Coditto</span>
      </a>
      <div className="hidden justify-self-center text-center text-[12px] tracking-[-0.01em] text-mute sm:block">
        {center}
      </div>
      <div className="justify-self-end text-[12px] text-mute">{trailing}</div>
    </header>
  )
}
