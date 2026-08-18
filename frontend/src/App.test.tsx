import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const catalog = {
  categories: ['Backend'],
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
    if (url === '/api/interview-questions' && init?.method === 'POST') {
      return jsonResponse({ status: 'UNAVAILABLE', questions: [] })
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

describe('home', () => {
  it('sends the reader from the landing page to the problem catalog', async () => {
    mockApi()
    render(<App />)
    expect(screen.getByRole('heading', { name: /코드를 읽는 것에서 끝나지 않고/ })).toBeInTheDocument()
    expect(screen.getByText('문제의 유형과 코드를 확인한 뒤, 면접 카드를 보여줍니다.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '화면으로 보는 진행' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: '문제 보기 →' }))
    expect(await screen.findByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
  })
})

describe('catalog', () => {
  beforeEach(() => {
    window.location.hash = '#/problems'
  })

  it('lists published problems from GET /api/problems', async () => {
    mockApi()
    render(<App />)
    expect(await screen.findByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '문제 목록' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '오류 유형' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '난이도' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '상태' })).toBeInTheDocument()
    expect(screen.getAllByText('Java · Spring').length).toBeGreaterThan(0)
    expect(screen.getAllByText('상태 보존').length).toBeGreaterThan(0)
    expect(screen.getByText(/약 30분/)).toBeInTheDocument()
    expect(screen.getAllByText('Easy').length).toBeGreaterThan(0)
  })

  it('renders only categories returned by the catalog', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    expect(screen.getByRole('tab', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Back-End' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Front-End' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Data·AI' })).not.toBeInTheDocument()
  })

  it('groups catalog filters into stack, bug type, and difficulty', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    expect(screen.getByRole('group', { name: '기술 스택' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '오류 유형' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '난이도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Java · Spring' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '상태 보존' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument()
  })

  it('applies section filters independently', async () => {
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      if (String(input) !== '/api/problems') return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
      return jsonResponse({
        categories: ['Backend'],
        problems: [
          catalog.problems[0],
          {
            ...catalog.problems[0],
            id: 'member-query-001',
            title: '전체 멤버 조회 후 저장된 멤버가 사라져요',
            stack: 'Java',
            bugType: '상태 노출',
            difficulty: 'MEDIUM',
          },
        ],
      })
    })
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    await userEvent.click(screen.getByRole('button', { name: /^Java$/ }))
    expect(screen.queryByRole('link', { name: /회원 권한 수정/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /전체 멤버 조회/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Easy' }))
    expect(screen.getByText('선택한 조건에 맞는 문제가 없습니다.')).toBeInTheDocument()
  })

  it('opens a category from the workspace crumb', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    await userEvent.click(screen.getByRole('link', { name: 'Back-End' }))
    expect(await screen.findByRole('tab', { name: 'Back-End' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
  })

  it('shows generated interview cards on the preview route', async () => {
    window.location.hash = '#/preview/interview'
    render(<App />)
    expect(await screen.findByLabelText('면접 질문')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByText('TESTS_PASSED')).toBeInTheDocument()
    expect(screen.getByText('역할이 생략된 경우를 왜 구분해야 합니까?')).toBeInTheDocument()
    expect(screen.getByText('기존 권한을 보존하려면 무엇을 확인해야 합니까?')).toBeInTheDocument()
    expect(screen.getByText('null 입력이 안전한 이유를 설명해 보세요.')).toBeInTheDocument()
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
    const badge = within(screen.getByRole('group', { name: '수정 가능한 파일' })).getByRole('button', { name: 'RoleService.java' })
    expect(badge).toHaveAttribute('title', 'src/main/java/com/coditto/demo/RoleService.java')
    expect(screen.queryByText('src/main/java/com/coditto/demo/RoleService.java', { selector: 'code' })).not.toBeInTheDocument()
  })

  it('moves focus to the workspace main landmark from the skip link', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    await userEvent.click(screen.getByRole('button', { name: '본문으로 건너뛰기' }))
    await waitFor(() => expect(main).toHaveFocus())
  })

  it('moves focus to the interview preview main landmark from the skip control', async () => {
    window.location.hash = '#/preview/interview'
    render(<App />)
    await screen.findByLabelText('면접 질문')
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    await userEvent.keyboard('{Tab}{Enter}')
    await waitFor(() => expect(main).toHaveFocus())
  })

  it('focuses the editor when the file path control is clicked', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    const editor = await screen.findByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    await userEvent.click(screen.getByRole('button', { name: 'src/main/java/com/coditto/demo/RoleService.java' }))
    expect(editor).toHaveFocus()
  })

  it('switches files and keeps read-only context out of the submission source', async () => {
    window.location.hash = '#/problems/role-update-001'
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') {
        return jsonResponse({
          ...detail,
          files: [
            detail.files[0],
            {
              path: 'src/main/java/com/coditto/demo/Member.java',
              editable: false,
              content: 'class Member {}',
            },
          ],
        })
      }
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_FAILED' } })
      }
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await screen.findByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    expect(screen.getByRole('navigation', { name: '프로젝트 파일' })).toBeInTheDocument()
    expect(screen.getByRole('separator', { name: '파일 트리 너비' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '프로젝트 파일' }).parentElement).toHaveStyle({ width: '216px' })
    expect(screen.getByText('src/main/java/com/coditto/demo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Member\.java/ }))
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/Member.java')).toHaveValue('class Member {}')
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/Member.java')).toBeDisabled()
    const badge = within(screen.getByRole('group', { name: '수정 가능한 파일' })).getByRole('button', { name: 'RoleService.java' })
    await userEvent.click(badge)
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/RoleService.java')).toHaveValue('class RoleService {}')
    expect(
      within(screen.getByRole('navigation', { name: '프로젝트 파일' })).getByRole('button', { name: 'RoleService.java' }),
    ).toHaveAttribute('aria-current', 'page')
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

const generatedQuestions = {
  status: 'GENERATED',
  questions: [
    { question: '역할이 생략된 경우를 왜 구분해야 합니까?', rationale: '제출 코드가 두 경로를 같은 분기로 처리합니다.' },
    { question: '기존 권한을 보존하려면 무엇을 확인해야 합니까?', rationale: 'diff가 컬렉션을 바로 대체합니다.' },
    { question: 'null 입력이 안전한 이유를 설명해 보세요.', rationale: '추가된 조건이 null 경로를 처리합니다.' },
  ],
}

describe('interview cards', () => {
  it('loads three questions only after TESTS_PASSED', async () => {
    window.location.hash = '#/problems/role-update-001'
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } })
      }
      if (url === '/api/interview-questions' && init?.method === 'POST') return jsonResponse(generatedQuestions)
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('역할이 생략된 경우를 왜 구분해야 합니까?')).toBeInTheDocument()
    expect(screen.getByText('기존 권한을 보존하려면 무엇을 확인해야 합니까?')).toBeInTheDocument()
    expect(screen.getByText('null 입력이 안전한 이유를 설명해 보세요.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/interview-questions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        problemId: 'role-update-001',
        version: 1,
        source: 'class RoleService {}',
      }),
    }))
  })

  it.each(['TESTS_FAILED', 'COMPILE_FAILED'])('does not call interview questions after %s', async (execution) => {
    window.location.hash = '#/problems/role-update-001'
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check: { execution } })
      }
      return jsonResponse({ status: 'GENERATED', questions: generatedQuestions.questions })
    })
    render(<App />)
    fireEvent.submit((await screen.findByRole('button', { name: '제출하기' })).closest('form')!)
    expect(await screen.findByText(execution)).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/interview-questions')).toHaveLength(0)
    expect(screen.queryByLabelText('면접 질문')).not.toBeInTheDocument()
  })

  it('keeps the judge result when interview questions are UNAVAILABLE', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } })
      }
      return jsonResponse({ status: 'UNAVAILABLE', questions: [] })
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('TESTS_PASSED')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('질문을 만드는 중…')).not.toBeInTheDocument())
    expect(screen.queryByLabelText('면접 질문')).not.toBeInTheDocument()
  })

  it('keeps TESTS_PASSED and interview request when progress storage write fails', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'TESTS_PASSED' } })
      }
      if (url === '/api/interview-questions' && init?.method === 'POST') return jsonResponse(generatedQuestions)
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('TESTS_PASSED')).toBeInTheDocument()
    expect(screen.queryByText(/네트워크 오류/)).not.toBeInTheDocument()
    expect(await screen.findByText('역할이 생략된 경우를 왜 구분해야 합니까?')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/interview-questions', expect.objectContaining({
      method: 'POST',
    }))
  })
})
