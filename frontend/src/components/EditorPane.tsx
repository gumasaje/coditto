import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEffect, useMemo, useRef, useState } from 'react'
import { languageFromPath, monacoLanguage } from '../copy'
import { buildFileTree } from '../fileTree'
import {
  applyMissingJavaImports,
  catalogForFiles,
  insertJavaImports,
  isJavaImportNeeded,
  JavaImportCatalog,
  shouldAttemptJavaAutoImport,
  textEditBetween,
} from '../javaAutoImport'
import { findJavaImportFoldRange } from '../javaImportFolding'
import { ProblemFile } from '../types'
import { FileTreeView } from './FileTreeView'
import { SplitHandle } from './SplitHandle'

const THEME = 'coditto'
const MOBILE_EDITOR_QUERY = '(max-width: 860px)'
const DESKTOP_EDITOR_FONT = { fontSize: 13, lineHeight: 24 }
const MOBILE_EDITOR_FONT = { fontSize: 11, lineHeight: 18 }

function editorFontOptions() {
  const mobile = typeof window.matchMedia === 'function'
    && window.matchMedia(MOBILE_EDITOR_QUERY).matches
  return mobile ? MOBILE_EDITOR_FONT : DESKTOP_EDITOR_FONT
}

let javaImportFoldingRegistered = false
let javaAutoImportRegistered = false
const javaAutoImportCatalogRef: { current: JavaImportCatalog } = { current: catalogForFiles([]) }
let javaAutoImportListener: { dispose: () => void } | null = null

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

function foldJavaImports(instance: editor.IStandaloneCodeEditor) {
  if (typeof instance.getModel !== 'function' || typeof instance.trigger !== 'function') return
  const model = instance.getModel()
  if (!model) return
  const range = findJavaImportFoldRange(model.getValue())
  if (!range) return
  instance.trigger('fold', 'editor.fold', { selectionLines: [range.start - 1] })
}

function isJavaModel(model: editor.ITextModel, path: string) {
  if (typeof model.getLanguageId === 'function') return model.getLanguageId() === 'java'
  return path.endsWith('.java')
}

function registerJavaAutoImport(monaco: Monaco) {
  if (javaAutoImportRegistered) return
  javaAutoImportRegistered = true
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems(model: editor.ITextModel, position: { lineNumber: number; column: number }) {
      const word = model.getWordUntilPosition(position)
      const prefix = word.word
      if (!prefix) return { suggestions: [] }
      const source = model.getValue()
      const catalog = javaAutoImportCatalogRef.current
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      }
      const lowered = prefix.toLowerCase()
      const suggestions = []
      for (const [simpleName, qualifiedName] of catalog) {
        if (!simpleName.toLowerCase().startsWith(lowered)) continue
        const importEdit = isJavaImportNeeded(source, qualifiedName)
          ? textEditBetween(source, insertJavaImports(source, [qualifiedName]))
          : null
        suggestions.push({
          label: simpleName,
          kind: monaco.languages.CompletionItemKind.Class,
          detail: qualifiedName,
          insertText: simpleName,
          range,
          sortText: `0_${simpleName}`,
          additionalTextEdits: importEdit ? [{
            range: {
              startLineNumber: importEdit.startLineNumber,
              startColumn: importEdit.startColumn,
              endLineNumber: importEdit.endLineNumber,
              endColumn: importEdit.endColumn,
            },
            text: importEdit.text,
          }] : [],
        })
      }
      return { suggestions }
    },
  })
}

function bindJavaAutoImport(
  instance: editor.IStandaloneCodeEditor,
  monaco: Monaco | undefined,
  locked: { current: boolean },
  path: { current: string },
) {
  javaAutoImportListener?.dispose()
  javaAutoImportListener = null
  if (
    !monaco?.Range
    || typeof instance.getModel !== 'function'
    || typeof instance.onDidChangeModelContent !== 'function'
    || typeof instance.executeEdits !== 'function'
  ) return

  let applying = false
  let debounceTimer: number | undefined
  const sub = instance.onDidChangeModelContent((event) => {
    if (applying || locked.current || event.isUndoing || event.isRedoing) return
    const catalog = javaAutoImportCatalogRef.current
    if (!event.changes.some((change) => shouldAttemptJavaAutoImport(change.text, catalog))) return
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      const model = instance.getModel()
      if (!model || locked.current || !isJavaModel(model, path.current)) return
      const source = model.getValue()
      const next = applyMissingJavaImports(source, javaAutoImportCatalogRef.current)
      const edit = textEditBetween(source, next)
      if (!edit) return
      applying = true
      instance.executeEdits('java-auto-import', [{
        range: new monaco.Range(
          edit.startLineNumber,
          edit.startColumn,
          edit.endLineNumber,
          edit.endColumn,
        ),
        text: edit.text,
        forceMoveMarkers: true,
      }])
      applying = false
    }, 250)
  })
  javaAutoImportListener = {
    dispose() {
      window.clearTimeout(debounceTimer)
      sub.dispose()
    },
  }
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
      focusBorder: '#00000000',
      contrastBorder: '#00000000',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#415a7799',
      'scrollbarSlider.hoverBackground': '#778da9cc',
      'scrollbarSlider.activeBackground': '#778da999',
    },
  })
}

/**
 * Monaco 모델은 경로 기준 전역 캐시라 문제끼리 같은 경로를 쓰면 이전 문제의 코드가 재사용된다.
 * 화면에 보이는 경로는 그대로 두고 모델 경로에만 문제 ID를 붙여 캐시를 문제 단위로 가른다.
 */
function modelPath(problemId: string, path: string) {
  return problemId ? `${problemId}/${path}` : path
}

/** 작업공간을 벗어날 때 이 문제가 만든 모델을 정리한다. 열려 있던 모델은 에디터가 직접 정리한다. */
function disposeModels(monaco: Monaco | null, paths: string[]) {
  if (!monaco) return
  const targets = new Set(paths.map((path) => monaco.Uri.parse(path).toString()))
  for (const model of monaco.editor.getModels()) {
    if (!model.isDisposed() && targets.has(model.uri.toString())) model.dispose()
  }
}

/**
 * 작업공간 크롬을 유지한 채 Monaco로 소스를 표시한다.
 * 제출 계약은 수정 가능 파일 하나의 source만 사용한다.
 */
export function EditorPane({
  problemId,
  files,
  activePath,
  value,
  disabled,
  readOnly,
  onSelectPath,
  onChange,
}: {
  problemId: string
  files: ProblemFile[]
  activePath: string
  value: string
  disabled: boolean
  readOnly: boolean
  onSelectPath: (path: string) => void
  onChange: (path: string, value: string) => void
}) {
  const tree = useMemo(() => buildFileTree(files), [files])
  const bodyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<{
    focus: () => void
    updateOptions?: (options: { fontSize: number; lineHeight: number }) => void
  } | null>(null)
  const lockedRef = useRef(false)
  const pathRef = useRef(activePath)
  const monacoRef = useRef<Monaco | null>(null)
  const modelPathsRef = useRef<string[]>([])
  const [treeWidth, setTreeWidth] = useState(216)
  const [fontOptions, setFontOptions] = useState(editorFontOptions)
  const locked = disabled || readOnly
  lockedRef.current = locked
  pathRef.current = activePath
  modelPathsRef.current = files.map((file) => modelPath(problemId, file.path))

  useEffect(() => {
    javaAutoImportCatalogRef.current = catalogForFiles(files)
  }, [files])

  useEffect(() => () => disposeModels(monacoRef.current, modelPathsRef.current), [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(MOBILE_EDITOR_QUERY)
    const sync = () => {
      const next = editorFontOptions()
      setFontOptions(next)
      editorRef.current?.updateOptions?.(next)
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function dragTree(clientX: number) {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    setTreeWidth(Math.min(380, Math.max(132, clientX - rect.left)))
  }

  const bindEditor: OnMount = (instance, monaco) => {
    editorRef.current = instance
    window.setTimeout(() => foldJavaImports(instance), 0)
    bindJavaAutoImport(instance, monaco, lockedRef, pathRef)
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
            path={modelPath(problemId, activePath)}
            language={monacoLanguage(activePath)}
            value={value}
            onChange={(next) => {
              if (!lockedRef.current && next != null) onChange(pathRef.current, next)
            }}
            beforeMount={(monaco) => {
              monacoRef.current = monaco
              applyTheme(monaco)
              registerJavaImportFolding(monaco)
              registerJavaAutoImport(monaco)
            }}
            onMount={bindEditor}
            loading={<p className="editor-loading">에디터를 불러오는 중…</p>}
            options={{
              readOnly: locked,
              domReadOnly: locked,
              ariaLabel: activePath,
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: fontOptions.fontSize,
              lineHeight: fontOptions.lineHeight,
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
              quickSuggestions: { other: 'on', comments: 'off', strings: 'off' },
              suggestOnTriggerCharacters: true,
              wordBasedSuggestions: 'currentDocument',
              snippetSuggestions: 'inline',
              suggest: { showIcons: true, preview: false, filterGraceful: true },
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              renderValidationDecorations: 'off',
              folding: true,
              foldingStrategy: 'auto',
              foldingImportsByDefault: true,
              showFoldingControls: 'always',
              contextmenu: false,
            }}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
