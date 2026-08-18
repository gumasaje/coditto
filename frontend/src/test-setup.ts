import '@testing-library/jest-dom/vitest'
import { createElement, type ChangeEvent } from 'react'
import { vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn(), init: vi.fn() },
  default: function MonacoStub(props: {
    path?: string
    value?: string
    onChange?: (value?: string) => void
    options?: { readOnly?: boolean }
  }) {
    const locked = Boolean(props.options?.readOnly)
    return createElement('textarea', {
      id: 'source',
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
