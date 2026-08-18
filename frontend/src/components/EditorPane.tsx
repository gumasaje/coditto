import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import { useMemo, useRef, useState } from 'react'
import { languageFromPath, monacoLanguage } from '../copy'
import { buildFileTree } from '../fileTree'
import { findJavaImportFoldRange } from '../javaImportFolding'
import { ProblemFile } from '../types'
import { FileTreeView } from './FileTreeView'
import { SplitHandle } from './SplitHandle'

const THEME = 'coditto'

let javaImportFoldingRegistered = false

function registerJavaImportFolding(monaco: Monaco) {
  if (javaImportFoldingRegistered) return
  javaImportFoldingRegistered = true
  monaco.languages.registerFoldingRangeProvider('java', {
    provideFoldingRanges(model: { getValue(): string }) {
      const range = findJavaImportFoldRange(model.getValue())
      if (!range) return []
      return [{
        start: range.start,
        end: range.end,
        kind: monaco.languages.FoldingRangeKind.Imports,
      }]
    },
  })
}

function applyTheme(monaco: Monaco) {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6f6d66' },
      { token: 'string', foreground: 'd4b483' },
      { token: 'keyword', foreground: '778da9' },
      { token: 'number', foreground: 'e8a07a' },
      { token: 'type', foreground: '8fb9a8' },
      { token: 'annotation', foreground: 'c4a574' },
    ],
    colors: {
      'editor.background': '#0d1b2a',
      'editor.foreground': '#e0e1dd',
      'editorLineNumber.foreground': '#778da9',
      'editorLineNumber.activeForeground': '#e0e1dd',
      'editorCursor.foreground': '#e0e1dd',
      'editor.selectionBackground': '#415a77',
      'editor.inactiveSelectionBackground': '#1b263b',
      'editor.lineHighlightBackground': '#1b263b',
      'editorGutter.background': '#0d1b2a',
      'editorWidget.background': '#1b263b',
      'editorWidget.border': '#2a3d54',
      'editorIndentGuide.background': '#2a3d54',
      'editorOverviewRuler.background': '#0d1b2a',
      'editorOverviewRuler.border': '#0d1b2a',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#415a7799',
      'scrollbarSlider.hoverBackground': '#778da9cc',
      'scrollbarSlider.activeBackground': '#778da999',
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
  const editorRef = useRef<{ focus: () => void } | null>(null)
  const [treeWidth, setTreeWidth] = useState(216)
  const locked = disabled || readOnly

  function dragTree(clientX: number) {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    setTreeWidth(Math.min(380, Math.max(132, clientX - rect.left)))
  }

  const bindEditor: OnMount = (editor) => {
    editorRef.current = editor
  }

  return (
    <div className="editor-pane">
      <div className="editor-head">
        <button type="button" className="editor-path" onClick={() => editorRef.current?.focus()}>
          {activePath}
        </button>
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
            beforeMount={(monaco) => {
              applyTheme(monaco)
              registerJavaImportFolding(monaco)
            }}
            onMount={bindEditor}
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
              foldingStrategy: 'auto',
              foldingImportsByDefault: true,
              contextmenu: false,
            }}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
