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
    <div className="editor-pane">
      <div className="editor-head">
        <label htmlFor="source" className="editor-path">{path}</label>
        <span className="lang">{languageFromPath(path)}</span>
      </div>
      <div className="editor-body">
        <pre ref={gutterRef} aria-hidden="true" className="gutter editor-scroll">
          {gutter}
        </pre>
        <div className="editor-stage">
          <pre ref={highlightRef} aria-hidden="true" className="editor-surface editor-scroll">
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
            className="editor-surface editor-input editor-scroll"
          />
        </div>
      </div>
    </div>
  )
}
