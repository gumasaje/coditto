import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const jsonResponse = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) } as Response)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('submission flow', () => {
  it('sends the complete source in the contract request body', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } }))
    render(<App />)
    fireEvent.change(screen.getByLabelText('Java 코드'), { target: { value: 'class RoleService {}' } })
    await userEvent.click(screen.getByRole('button', { name: '제출하기' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/submissions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ source: 'class RoleService {}' }),
    })))
  })

  it.each([
    ['TESTS_PASSED'],
    ['TESTS_FAILED'],
    ['COMPILE_FAILED'],
  ])('displays execution %s exactly', async (execution) => {
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ runStatus: 'COMPLETED', check: { id: 'official', execution } }))
    render(<App />)
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText(execution)).toBeInTheDocument()
  })

  it.each([
    [{ runStatus: 'REJECTED', error: { kind: 'INVALID_SUBMISSION' } }],
    [{ runStatus: 'SYSTEM_FAILED', error: { kind: 'INFRA_ERROR' } }],
  ])('displays %s and error.kind without remapping', async (body) => {
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse(body))
    render(<App />)
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText(body.runStatus)).toBeInTheDocument()
    expect(screen.getByText(`error.kind: ${body.error.kind}`)).toBeInTheDocument()
  })

  it('shows a network error', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))
    render(<App />)
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류')
  })

  it('disables duplicate submissions while the request is pending', async () => {
    let resolveRequest!: (value: Response) => void
    const request = new Promise<Response>((resolve) => { resolveRequest = resolve })
    const fetchMock = vi.spyOn(window, 'fetch').mockReturnValue(request)
    render(<App />)
    const button = screen.getByRole('button', { name: '제출하기' })
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: '채점 중…' })).toBeDisabled()
    fireEvent.submit(button.closest('form')!)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolveRequest({ json: () => Promise.resolve({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } }) } as Response)
  })
})
