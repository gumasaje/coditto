import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  default: function MonacoStub() {
    return null
  },
}))
