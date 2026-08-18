import '@testing-library/jest-dom/vitest'
import { createElement, useEffect, useRef, type ChangeEvent } from 'react'
import { vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn(), init: vi.fn() },
  default: function MonacoStub(props: {
    path?: string
    value?: string
    onChange?: (value?: string) => void
    options?: { readOnly?: boolean }
    onMount?: (editor: { focus: () => void }) => void
  }) {
    const locked = Boolean(props.options?.readOnly)
    const fieldRef = useRef<HTMLTextAreaElement>(null)
    useEffect(() => {
      props.onMount?.({
        focus() {
          fieldRef.current?.focus()
        },
      })
    }, [props.onMount])
    return createElement('textarea', {
      ref: fieldRef,
      'aria-label': props.path,
      value: props.value,
      disabled: locked,
      readOnly: locked,
      onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (!locked) props.onChange?.(event.target.value)
      },
    })
  },
}))
