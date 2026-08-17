import { UIEvent, useMemo, useRef } from 'react'
import { languageFromPath } from '../copy'
import { highlightSource } from '../highlight'

/**
 * 투명 textarea 아래에 토큰 색을 깔아 가독성을 높인다.
 */
export function EditorPane({
  path,
  value,
  disabled,
  onChange,
}: {
  path: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const gutterRef = useRef<HTMLPreElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineCount = Math.max(1, value.split('\n').length)
  const gutter = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n'),
    [lineCount],
  )
  const highlighted = useMemo(() => highlightSource(value), [value])

  function sync(event: UIEvent<HTMLTextAreaElement>) {
    const top = event.currentTarget.scrollTop
    const left = event.currentTarget.scrollLeft
    if (gutterRef.current) gutterRef.current.scrollTop = top
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top
      highlightRef.current.scrollLeft = left
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-void">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[12px]">
        <label htmlFor="source" className="truncate font-mono text-[12px] text-ink">{path}</label>
        <span className="tracking-[0.08em] text-mute">{languageFromPath(path)}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <pre ref={gutterRef} aria-hidden="true" className="gutter editor-scroll min-w-10 overflow-hidden border-r border-line px-2 py-3 text-right font-mono text-[12px] leading-6 text-mute">
          {gutter}
        </pre>
        <div className="relative min-h-0 min-w-0 flex-1">
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="editor-surface editor-scroll pointer-events-none absolute inset-0 overflow-auto text-ink"
          >
            {highlighted}
            {value.endsWith('\n') ? '\n' : null}
          </pre>
          <textarea
            id="source"
            value={value}
            disabled={disabled}
            spellCheck={false}
            onScroll={sync}
            onChange={(event) => onChange(event.target.value)}
            className="editor-surface editor-scroll absolute inset-0 resize-none border-0 bg-transparent text-transparent caret-acid outline-none disabled:opacity-55"
          />
        </div>
      </div>
    </div>
  )
}
