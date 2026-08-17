import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const catalog = {
  categories: ['Backend', 'Frontend', 'Data·AI'],
  problems: [
    {
      id: 'role-update-001',
      version: 1,
      title: '회원 권한 수정 시 기존 관리자 권한이 사라져요',
      category: 'Backend',
      stack: 'Java · Spring',
      bugType: '상태 보존',
      estimatedMinutes: 30,
      difficulty: 'EASY',
    },
  ],
}

const detail = {
  id: 'role-update-001',
  version: 1,
  title: '회원 권한 수정 시 기존 관리자 권한이 사라져요',
  category: 'Backend',
  difficulty: 'EASY',
  estimatedMinutes: 30,
  statement: '# 역할 변경 승인 버그\n\n`RoleService.updateRole`은 승인된 요청을 반영해야 합니다.\n\n```text\nsrc/main/java/com/coditto/demo/RoleService.java\n```\n',
  files: [{
    path: 'src/main/java/com/coditto/demo/RoleService.java',
    editable: true,
    content: 'class RoleService {}',
  }],
  candidate: {
    allowedPaths: ['src/main/java/com/coditto/demo/RoleService.java'],
    maxFiles: 1,
    maxBytes: 16384,
  },
}

const jsonResponse = (body: unknown, ok = true) => Promise.resolve({
  ok,
  json: () => Promise.resolve(body),
} as Response)

function mockApi() {
  return vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url === '/api/problems') return jsonResponse(catalog)
    if (url === '/api/problems/role-update-001') return jsonResponse(detail)
    if (url === '/api/submissions' && init?.method === 'POST') {
      return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' }, problem: { id: 'role-update-001', version: 1 } })
    }
    return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
  })
}

afterEach(() => {
  window.location.hash = ''
  window.localStorage.clear()
  cleanup()
  vi.restoreAllMocks()
})

describe('catalog', () => {
  it('lists published problems from GET /api/problems', async () => {
    mockApi()
    render(<App />)
    expect(await screen.findByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
    expect(screen.getAllByText('Java · Spring').length).toBeGreaterThan(0)
    expect(screen.getAllByText('상태 보존').length).toBeGreaterThan(0)
    expect(screen.getByText('약 30분')).toBeInTheDocument()
    expect(screen.getAllByText('Easy').length).toBeGreaterThan(0)
  })

  it('filters by category tabs and shows an empty state', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    await userEvent.click(screen.getByRole('tab', { name: 'Front-End' }))
    expect(screen.getByText('이 카테고리에 준비된 문제가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /회원 권한 수정/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Back-End' }))
    expect(screen.getByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
  })

  it('opens the workspace for the selected problem', async () => {
    const fetchMock = mockApi()
    render(<App />)
    await userEvent.click(await screen.findByRole('link', { name: /회원 권한 수정/ }))
    expect(await screen.findByRole('heading', { name: '역할 변경 승인 버그' })).toBeInTheDocument()
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/RoleService.java')).toHaveValue('class RoleService {}')
    expect(fetchMock).toHaveBeenCalledWith('/api/problems/role-update-001')
  })

  it('shows a network error when the catalog cannot be loaded', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류')
  })
})

describe('workspace', () => {
  it('prefills the editable file and renders the statement', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    expect(await screen.findByRole('heading', { name: '역할 변경 승인 버그' })).toBeInTheDocument()
    expect(screen.getByText('은 승인된 요청을 반영해야 합니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/RoleService.java')).toHaveValue('class RoleService {}')
  })

  it('displays PROBLEM_NOT_FOUND without remapping', async () => {
    window.location.hash = '#/problems/unknown-problem'
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('error.kind: PROBLEM_NOT_FOUND')
  })

  it('sends problemId, version, and source in the contract request body', async () => {
    window.location.hash = '#/problems/role-update-001'
    const fetchMock = mockApi()
    render(<App />)
    await screen.findByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    await userEvent.click(screen.getByRole('button', { name: '제출하기' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/submissions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        problemId: 'role-update-001',
        version: 1,
        source: 'class RoleService {}',
      }),
    })))
  })

  it.each([
    ['TESTS_PASSED'],
    ['TESTS_FAILED'],
    ['COMPILE_FAILED'],
  ])('displays execution %s exactly', async (execution) => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse({ runStatus: 'COMPLETED', check: { id: 'official', execution } })
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText(execution)).toBeInTheDocument()
  })

  it.each([
    [{ runStatus: 'REJECTED', error: { kind: 'INVALID_SUBMISSION' } }],
    [{ runStatus: 'SYSTEM_FAILED', error: { kind: 'INFRA_ERROR' } }],
  ])('displays %s and error.kind without remapping', async (body) => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse(body)
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText(body.runStatus)).toBeInTheDocument()
    expect(screen.getByText(`error.kind: ${body.error.kind}`)).toBeInTheDocument()
  })

  it('shows a network error when submit fails', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return Promise.reject(new Error('offline'))
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류')
  })

  it('disables duplicate submissions while the request is pending', async () => {
    window.location.hash = '#/problems/role-update-001'
    let resolveRequest!: (value: Response) => void
    const request = new Promise<Response>((resolve) => { resolveRequest = resolve })
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return request
    })
    render(<App />)
    const button = await screen.findByRole('button', { name: '제출하기' })
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: '채점 중…' })).toBeDisabled()
    fireEvent.submit(button.closest('form')!)
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/submissions')).toHaveLength(1)
    resolveRequest({ ok: true, json: () => Promise.resolve({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } }) } as Response)
  })
})
