import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import { useMemo, useRef, useState } from 'react'
import { languageFromPath, monacoLanguage } from '../copy'
import { buildFileTree } from '../fileTree'
import { ProblemFile } from '../types'
import { FileTreeView } from './FileTreeView'
import { SplitHandle } from './SplitHandle'

const THEME = 'coditto'

function applyTheme(monaco: Monaco) {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6f6d66' },
      { token: 'string', foreground: 'd4b483' },
      { token: 'keyword', foreground: 'c8f000' },
      { token: 'number', foreground: 'e8a07a' },
      { token: 'type', foreground: '8fb9a8' },
      { token: 'annotation', foreground: 'c4a574' },
    ],
    colors: {
      'editor.background': '#10110f',
      'editor.foreground': '#eceae3',
      'editorLineNumber.foreground': '#8d8b82',
      'editorLineNumber.activeForeground': '#eceae3',
      'editorCursor.foreground': '#c8f000',
      'editor.selectionBackground': '#2c2e29',
      'editor.inactiveSelectionBackground': '#23251f',
      'editor.lineHighlightBackground': '#171816',
      'editorGutter.background': '#10110f',
      'editorWidget.background': '#171816',
      'editorWidget.border': '#2c2e29',
      'editorIndentGuide.background': '#2c2e29',
      'editorOverviewRuler.background': '#10110f',
      'editorOverviewRuler.border': '#10110f',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#4a4d4599',
      'scrollbarSlider.hoverBackground': '#8d8b82cc',
      'scrollbarSlider.activeBackground': '#c8f00099',
    },
  })
}

/**
 * 작업공간 크롬을 유지한 채 Monaco로 소스를 표시한다.
 * 제출 계약은 수정 가능 파일 하나의 source만 사용한다.
 */
export function EditorPane({
  files,
  activePath,
  value,
  disabled,
  readOnly,
  onSelectPath,
  onChange,
}: {
  files: ProblemFile[]
  activePath: string
  value: string
  disabled: boolean
  readOnly: boolean
  onSelectPath: (path: string) => void
  onChange: (value: string) => void
}) {
  const tree = useMemo(() => buildFileTree(files), [files])
  const bodyRef = useRef<HTMLDivElement>(null)
  const [treeWidth, setTreeWidth] = useState(216)
  const locked = disabled || readOnly

  function dragTree(clientX: number) {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    setTreeWidth(Math.min(380, Math.max(132, clientX - rect.left)))
  }

  const bindSourceField: OnMount = (editor) => {
    const textarea = editor.getDomNode()?.querySelector('textarea.inputarea')
    if (textarea instanceof HTMLTextAreaElement) textarea.id = 'source'
  }

  return (
    <div className="editor-pane">
      <div className="editor-head">
        <label htmlFor="source" className="editor-path">{activePath}</label>
        <span className="lang">{languageFromPath(activePath)}{readOnly ? ' · 읽기 전용' : ''}</span>
      </div>
      <div ref={bodyRef} className="editor-body">
        {files.length > 0 ? (
          <>
            <div className="file-tree-pane" style={{ width: treeWidth }}>
              <FileTreeView nodes={tree} activePath={activePath} onSelect={onSelectPath} />
            </div>
            <SplitHandle axis="x" label="파일 트리 너비" onDrag={dragTree} />
          </>
        ) : null}
        <div className="editor-monaco">
          <Editor
            theme={THEME}
            path={activePath}
            language={monacoLanguage(activePath)}
            value={value}
            onChange={(next) => {
              if (!locked && next != null) onChange(next)
            }}
            beforeMount={applyTheme}
            onMount={bindSourceField}
            loading={<p className="editor-loading">에디터를 불러오는 중…</p>}
            options={{
              readOnly: locked,
              domReadOnly: locked,
              ariaLabel: activePath,
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              lineHeight: 24,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              renderLineHighlight: 'line',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              padding: { top: 12, bottom: 12 },
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                verticalSliderSize: 8,
                horizontalSliderSize: 8,
              },
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              wordBasedSuggestions: 'off',
              renderValidationDecorations: 'off',
              folding: true,
              contextmenu: false,
            }}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
