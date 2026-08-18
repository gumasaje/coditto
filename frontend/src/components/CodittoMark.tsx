/**
 * 첨부 심볼(coditto-symbol.svg)을 그대로 그린다.
 */
export function CodittoSymbol({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 56" aria-hidden="true">
      <path
        d="M26 6 8 28l18 22"
        fill="none"
        stroke="#778da9"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 6 56 28 38 50"
        fill="none"
        stroke="#415a77"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 28h16"
        fill="none"
        stroke="#e0e1dd"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * 첨부 워드마크: 심볼 + Pretendard Codi(tt)o. 메인 헤더 크기를 기준으로 쓴다.
 */
export function CodittoWordmark({
  onLight = false,
}: {
  onLight?: boolean
}) {
  return (
    <>
      <CodittoSymbol className="wordmark-symbol" />
      <span className={onLight ? 'wordmark-text wordmark-text--light' : 'wordmark-text'}>
        Codi<span className="wordmark-accent">tt</span>o
      </span>
    </>
  )
}
