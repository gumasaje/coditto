import '@testing-library/jest-dom/vitest'
import { createElement, useEffect, useRef, type ChangeEvent, type DependencyList } from 'react'
import { vi } from 'vitest'

/**
 * Monaco 대역. 다음 두 성질을 실제 에디터와 맞춘다.
 *
 * - 모델은 경로 기준 전역 캐시라 컴포넌트가 언마운트돼도 내용이 남는다.
 * - 읽기 전용 편집기에 값을 동기화할 때 `setValue`를 쓰므로 콘텐츠 변경이 통지되며,
 *   그 통지를 받는 콜백은 값 동기화보다 늦게 재바인딩돼 직전 렌더의 것이다.
 *
 * 이 둘을 재현하지 않으면 파일 전환 시 내용이 뒤섞이는 회귀를 잡을 수 없다.
 */
vi.mock('@monaco-editor/react', () => {
  type FakeModel = {
    uri: { toString(): string }
    value: string
    disposed: boolean
    getValue(): string
    isDisposed(): boolean
    dispose(): void
  }

  const models = new Map<string, FakeModel>()

  function getOrCreateModel(path: string, value: string): FakeModel {
    const found = models.get(path)
    if (found) return found
    const model: FakeModel = {
      uri: { toString: () => `file:///${path}` },
      value,
      disposed: false,
      getValue() {
        return this.value
      },
      isDisposed() {
        return this.disposed
      },
      dispose() {
        this.disposed = true
        models.delete(path)
      },
    }
    models.set(path, model)
    return model
  }

  const monaco = {
    Uri: { parse: (path: string) => ({ toString: () => `file:///${path}` }) },
    editor: {
      defineTheme: vi.fn(),
      getModels: () => [...models.values()],
    },
    languages: {
      registerFoldingRangeProvider: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      FoldingRangeKind: { Imports: 'imports' },
      CompletionItemKind: { Class: 'class' },
    },
  }

  function useUpdateEffect(effect: () => void, deps: DependencyList) {
    const first = useRef(true)
    useEffect(() => {
      if (first.current) {
        first.current = false
        return
      }
      effect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  }

  type StubProps = {
    path?: string
    value?: string
    onChange?: (value?: string) => void
    options?: { readOnly?: boolean; ariaLabel?: string }
    beforeMount?: (monaco: unknown) => void
    onMount?: (editor: { focus: () => void }, monaco: unknown) => void
  }

  return {
    loader: { config: vi.fn(), init: vi.fn() },
    default: function MonacoStub(props: StubProps) {
      const path = props.path ?? ''
      const locked = Boolean(props.options?.readOnly)
      const fieldRef = useRef<HTMLTextAreaElement>(null)
      const mounted = useRef(false)
      const notify = useRef(props.onChange)

      if (!mounted.current) {
        props.beforeMount?.(monaco)
        getOrCreateModel(path, props.value ?? '')
      }

      useEffect(() => {
        if (mounted.current) return
        mounted.current = true
        props.onMount?.({
          focus() {
            fieldRef.current?.focus()
          },
        }, monaco)
      }, [props.onMount])

      useUpdateEffect(() => {
        getOrCreateModel(path, props.value ?? '')
      }, [path])

      useUpdateEffect(() => {
        const model = models.get(path)
        if (!model) return
        if (locked) {
          model.value = props.value ?? ''
          notify.current?.(model.value)
          return
        }
        if (props.value !== model.value) model.value = props.value ?? ''
      }, [props.value])

      useEffect(() => {
        notify.current = props.onChange
      })

      return createElement('textarea', {
        ref: fieldRef,
        'aria-label': props.options?.ariaLabel ?? path,
        value: models.get(path)?.value ?? props.value ?? '',
        disabled: locked,
        readOnly: locked,
        onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
          if (locked) return
          const model = models.get(path)
          if (model) model.value = event.target.value
          props.onChange?.(event.target.value)
        },
      })
    },
  }
})
