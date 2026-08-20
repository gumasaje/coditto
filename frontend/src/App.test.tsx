import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { PROBLEM_NOT_FOUND_ERROR, RATE_LIMITED_ERROR } from './copy'

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
  statement: '# 역할 변경 승인 버그\n\n`RoleService.updateRole`은 승인된 요청을 반영해야 합니다.\n\n수정 가능한 파일은 `RoleService.java` 하나뿐입니다.\n',
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

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 400) => Promise.resolve({
  ok,
  status,
  json: () => Promise.resolve(body),
} as Response)

const passedJudgeCheck = {
  execution: 'TESTS_PASSED' as const,
  suites: {
    target: 'TESTS_PASSED' as const,
    regression: 'TESTS_PASSED' as const,
  },
}

const passedSubmission = {
  runStatus: 'COMPLETED' as const,
  check: passedJudgeCheck,
  problem: { id: 'role-update-001', version: 1 },
}

function mockApi() {
  return vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url === '/api/problems') return jsonResponse(catalog)
    if (url === '/api/problems/role-update-001') return jsonResponse(detail)
    if (url === '/api/submissions' && init?.method === 'POST') {
      return jsonResponse(passedSubmission)
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
  vi.unstubAllGlobals()
})

describe('home', () => {
  it('sends the reader from the landing page to the problem catalog', async () => {
    mockApi()
    render(<App />)
    expect(screen.getByRole('heading', { name: '코드를 검증하는 훈련' })).toBeInTheDocument()
    expect(screen.getAllByText('RoleService.java').length).toBeGreaterThan(0)
    expect(screen.queryByText('입력값')).not.toBeInTheDocument()
    expect(screen.queryByText('기댓값')).not.toBeInTheDocument()
    expect(screen.getByText('승인된 요청에서 currentRole을 반환하면 역할이 왜 바뀌지 않나요?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: '문제 풀어보기 →' }))
    expect(await screen.findByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
  })

  it('gives each of the four sections its own subject', () => {
    mockApi()
    render(<App />)
    const sections = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)
    expect(sections).toEqual(['작업공간', '채점', '면접 질문'])
    expect(screen.getAllByText(/수정할 수 있는 파일은 따로 안내되며/).length).toBe(1)
    expect(screen.getAllByText(/목표 테스트는/).length).toBe(1)
    expect(screen.getAllByText(/질문 3개/).length).toBe(1)
  })

  // 샷 안의 INTERVIEW·INCIDENT·JUDGE RESULT는 작업공간 컴포넌트가 소유하므로 여기서 다루지 않는다.
  it('drops the decorative all-caps labels the landing sections owned', () => {
    mockApi()
    render(<App />)
    for (const label of ['CODE REVIEW, BY DOING', 'CONTEXT', 'JUDGE', 'AFTER JUDGE']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('closes with the team signature and the public repository', () => {
    mockApi()
    render(<App />)
    expect(screen.getByText('Built by Tabaco.')).toBeInTheDocument()
    const repo = screen.getByRole('link', { name: 'GitHub 저장소' })
    expect(repo).toHaveAttribute('href', 'https://github.com/gumasaje/coditto')
    expect(repo).toHaveAttribute('rel', 'noreferrer')
  })

  it('lets the reader fix the demo line and watch the target suite flip', async () => {
    mockApi()
    render(<App />)
    // 강조된 줄은 문법 강조 때문에 span으로 쪼개지므로 텍스트 조회 대신 행 자체를 읽는다.
    const markedLine = () => document.querySelector('.lp-demo .lp-monaco-row.is-mark')?.textContent ?? ''
    const fix = screen.getByRole('button', { name: '6번 줄 고치기' })
    expect(fix).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('테스트 실패 (목표)')).toBeInTheDocument()
    expect(markedLine()).toContain('request.currentRole()')

    await userEvent.click(fix)
    expect(await screen.findByText('테스트 성공')).toBeInTheDocument()
    expect(markedLine()).toContain('request.requestedRole()')
    expect(screen.queryByText('테스트 실패 (목표)')).not.toBeInTheDocument()

    const revert = screen.getByRole('button', { name: '6번 줄 되돌리기' })
    expect(revert).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(revert)
    expect(await screen.findByText('테스트 실패 (목표)')).toBeInTheDocument()
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
    expect(screen.getByText(/Java · Spring/)).toBeInTheDocument()
    expect(screen.getAllByText('상태 보존').length).toBeGreaterThan(0)
    expect(screen.getByText(/약 30분/)).toBeInTheDocument()
    expect(screen.getAllByText('Easy').length).toBeGreaterThan(0)
  })

  it('renders only categories returned by the catalog', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    await userEvent.click(screen.getByRole('button', { name: '카테고리, 전체' }))
    expect(screen.getByRole('option', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Back-End' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Front-End' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Data·AI' })).not.toBeInTheDocument()
  })

  it('groups catalog filters into stack, bug type, and difficulty', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    await userEvent.click(screen.getByRole('button', { name: '기술 스택, 전체' }))
    expect(screen.getByRole('listbox', { name: '기술 스택' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Java · Spring' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '오류 유형, 전체' }))
    expect(screen.getByRole('listbox', { name: '오류 유형' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '상태 보존' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '난이도, 전체' }))
    expect(screen.getByRole('option', { name: 'Easy' })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: '기술 스택, 전체' }))
    await userEvent.click(screen.getByRole('option', { name: /^Java$/ }))
    expect(screen.queryByRole('link', { name: /회원 권한 수정/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /전체 멤버 조회/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '난이도, 전체' }))
    expect(screen.getByRole('option', { name: 'Normal' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Easy' }))
    expect(screen.getByText('선택한 조건에 맞는 문제가 없습니다.')).toBeInTheDocument()
  })

  it('clears the category when the selected value is chosen again', async () => {
    mockApi()
    render(<App />)
    await screen.findByRole('link', { name: /회원 권한 수정/ })
    await userEvent.click(screen.getByRole('button', { name: '카테고리, 전체' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back-End' }))
    expect(screen.getByRole('button', { name: '카테고리, Back-End' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/problems?category=Backend')
    await userEvent.click(screen.getByRole('button', { name: '카테고리, Back-End' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back-End' }))
    expect(screen.getByRole('button', { name: '카테고리, 전체' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/problems')
  })

  it('opens a category from the workspace crumb', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    await userEvent.click(screen.getByRole('link', { name: 'Back-End' }))
    expect(await screen.findByRole('button', { name: '카테고리, Back-End' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /회원 권한 수정/ })).toBeInTheDocument()
  })

  it('shows generated interview cards on the preview route', async () => {
    window.location.hash = '#/preview/interview'
    render(<App />)
    expect(await screen.findByLabelText('면접 질문')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByText('테스트 성공')).toBeInTheDocument()
    expect(screen.getByText('승인된 요청에서 currentRole을 반환하면 역할이 왜 바뀌지 않나요?')).toBeInTheDocument()
    expect(screen.getByText('approved가 false일 때 반환값을 바꾸면 안 되는 이유는 무엇인가요?')).toBeInTheDocument()
    expect(screen.getByText('두 분기가 같은 값을 반환하면 조건문은 어떤 의미가 없나요?')).toBeInTheDocument()
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
    expect(screen.queryByText(/수정 가능한 파일은/)).not.toBeInTheDocument()
    expect(screen.queryByText('src/main/java/com/coditto/demo/RoleService.java', { selector: 'code' })).not.toBeInTheDocument()
  })

  it('stacks the statement above the editor and result slot', async () => {
    window.location.hash = '#/problems/role-update-001'
    mockApi()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    const main = screen.getByRole('main')
    const statement = within(main).getByRole('region', { name: '문제 설명' })
    const editor = within(main).getByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    const result = within(main).getByRole('region', { name: '채점 결과' })
    expect(statement.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(editor.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
        return jsonResponse({
          runStatus: 'COMPLETED',
          check: {
            execution: 'TESTS_FAILED',
            suites: { target: 'TESTS_FAILED', regression: 'TESTS_PASSED' },
          },
        })
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

  it('keeps every file on its own source while switching across read-only files', async () => {
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
            {
              path: 'src/main/java/com/coditto/demo/RoleType.java',
              editable: false,
              content: 'enum RoleType {}',
            },
          ],
        })
      }
      if (url === '/api/submissions' && init?.method === 'POST') return jsonResponse(passedSubmission)
      if (url === '/api/interview-questions' && init?.method === 'POST') {
        return jsonResponse({ status: 'UNAVAILABLE', questions: [] })
      }
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await screen.findByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    const tree = () => within(screen.getByRole('navigation', { name: '프로젝트 파일' }))

    await userEvent.click(tree().getByRole('button', { name: /Member\.java/ }))
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/Member.java')).toHaveValue('class Member {}')
    await userEvent.click(tree().getByRole('button', { name: /RoleType\.java/ }))
    expect(screen.getByLabelText('src/main/java/com/coditto/demo/RoleType.java')).toHaveValue('enum RoleType {}')
    await userEvent.click(tree().getByRole('button', { name: /RoleService\.java/ }))

    expect(screen.getByLabelText('src/main/java/com/coditto/demo/RoleService.java')).toHaveValue('class RoleService {}')
    await userEvent.click(screen.getByRole('button', { name: '제출하기' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/submissions', expect.objectContaining({
      body: JSON.stringify({
        problemId: 'role-update-001',
        version: 1,
        source: 'class RoleService {}',
      }),
    })))
  })

  it('does not reuse another problem source for a shared file path', async () => {
    const shared = 'src/main/java/com/coditto/demo/Member.java'
    const problem = (id: string, marker: string) => ({
      ...detail,
      id,
      files: [
        { path: shared, editable: true, content: `class Member { /* ${marker} */ }` },
        {
          path: 'src/main/java/com/coditto/demo/RoleService.java',
          editable: false,
          content: `class RoleService { /* ${marker} */ }`,
        },
      ],
      candidate: { ...detail.candidate, allowedPaths: [shared] },
    })
    window.location.hash = '#/problems/first-problem'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/first-problem') return jsonResponse(problem('first-problem', 'FIRST'))
      if (url === '/api/problems/second-problem') return jsonResponse(problem('second-problem', 'SECOND'))
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await screen.findByLabelText(shared)
    expect(screen.getByLabelText(shared)).toHaveValue('class Member { /* FIRST */ }')
    await userEvent.click(within(screen.getByRole('navigation', { name: '프로젝트 파일' }))
      .getByRole('button', { name: /RoleService\.java/ }))

    window.location.hash = '#/problems/second-problem'
    fireEvent(window, new HashChangeEvent('hashchange'))

    await waitFor(() => expect(screen.getByLabelText(shared)).toHaveValue('class Member { /* SECOND */ }'))
  })

  it('explains PROBLEM_NOT_FOUND in Korean instead of echoing the contract value', async () => {
    window.location.hash = '#/problems/unknown-problem'
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false))
    render(<App />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(PROBLEM_NOT_FOUND_ERROR)
    expect(alert).not.toHaveTextContent('PROBLEM_NOT_FOUND')
  })

  it('keeps an unknown error kind visible as a reportable code', async () => {
    window.location.hash = '#/problems/unknown-problem'
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ error: { kind: 'CONTENT_ERROR' } }, false))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('문제를 불러오지 못했습니다. (오류 코드 CONTENT_ERROR)')
  })

  it('shows a rate-limit notice instead of a judge result when a submission is throttled', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ error: { kind: 'RATE_LIMITED' } }, false, 429)
      }
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent(RATE_LIMITED_ERROR)
    expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument()
  })

  it('shows a rate-limit notice when the problem request is throttled', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockReturnValue(jsonResponse({ error: { kind: 'RATE_LIMITED' } }, false, 429))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(RATE_LIMITED_ERROR)
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
    ['TIMED_OUT', '시간 초과'],
    ['RESOURCE_LIMITED', '자원 한도 초과'],
  ])('reads execution %s back in Korean instead of the contract value', async (execution, text) => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse({ runStatus: 'COMPLETED', check: { id: 'official', execution } })
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByText(execution)).not.toBeInTheDocument()
  })

  it('splits target and regression suite results when present', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse({
        runStatus: 'COMPLETED',
        check: {
          execution: 'TESTS_FAILED',
          suites: { target: 'TESTS_PASSED', regression: 'TESTS_FAILED' },
        },
      })
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText('테스트 실패 (회귀)')).toBeInTheDocument()
    expect(screen.getByText('테스트 실패 (회귀)')).toHaveClass('is-fail')
    expect(screen.getByRole('group', { name: '목표·회귀 테스트' })).toBeInTheDocument()
    expect(screen.queryByText('TESTS_FAILED')).not.toBeInTheDocument()
  })

  it('names both failed suites in the execution result', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse({
        runStatus: 'COMPLETED',
        check: {
          execution: 'TESTS_FAILED',
          suites: { target: 'TESTS_FAILED', regression: 'TESTS_FAILED' },
        },
      })
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText('테스트 실패 (목표·회귀)')).toBeInTheDocument()
    expect(screen.getByText('테스트 실패 (목표·회귀)')).toHaveClass('is-fail')
    expect(screen.queryByText('TESTS_FAILED')).not.toBeInTheDocument()
  })

  it('keeps execution-only display when suites are omitted', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse({ runStatus: 'COMPLETED', check: { execution: 'COMPILE_FAILED' } })
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByText('컴파일 실패')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '목표·회귀 테스트' })).not.toBeInTheDocument()
  })

  it.each([
    [{ runStatus: 'REJECTED', error: { kind: 'INVALID_SUBMISSION' } }, '제출이 접수되지 않았습니다'],
    [{ runStatus: 'SYSTEM_FAILED', error: { kind: 'INFRA_ERROR' } }, '채점을 끝내지 못했습니다'],
  ])('explains %s in Korean and keeps the error code for reporting', async (body, heading) => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      return jsonResponse(body)
    })
    render(<App />)
    await screen.findByRole('button', { name: '제출하기' })
    fireEvent.submit(screen.getByRole('button', { name: '제출하기' }).closest('form')!)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByText(`오류 코드 ${body.error.kind}`)).toBeInTheDocument()
    expect(screen.queryByText(body.runStatus)).not.toBeInTheDocument()
    expect(screen.queryByText(`error.kind: ${body.error.kind}`)).not.toBeInTheDocument()
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
    resolveRequest({ ok: true, json: () => Promise.resolve(passedSubmission) } as Response)
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
        return jsonResponse(passedSubmission)
      }
      if (url === '/api/interview-questions' && init?.method === 'POST') return jsonResponse(generatedQuestions)
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('테스트 성공')).toBeInTheDocument()
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

  it('renders backtick spans in generated questions as code', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') return jsonResponse(passedSubmission)
      if (url === '/api/interview-questions' && init?.method === 'POST') {
        return jsonResponse({
          status: 'GENERATED',
          questions: [
            { question: '`approved()` 는 무엇을 확인하나요?', rationale: '`currentRole()` 반환이 왜 문제인지 확인합니다.' },
            generatedQuestions.questions[1],
            generatedQuestions.questions[2],
          ],
        })
      }
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    const question = await screen.findByText(/는 무엇을 확인하나요\?/)
    expect(question).toHaveTextContent('approved() 는 무엇을 확인하나요?')
    expect(question.querySelector('code')).toHaveTextContent('approved()')
    expect(screen.getByText(/반환이 왜 문제인지/).querySelector('code')).toHaveTextContent('currentRole()')
    expect(screen.queryByText(/`/)).not.toBeInTheDocument()
  })

  it.each([
    ['TESTS_FAILED', { execution: 'TESTS_FAILED', suites: { target: 'TESTS_FAILED', regression: 'TESTS_PASSED' } }, '테스트 실패 (목표)'],
    ['COMPILE_FAILED', { execution: 'COMPILE_FAILED' }, '컴파일 실패'],
  ] as const)('does not call interview questions after %s', async (_execution, check, visible) => {
    window.location.hash = '#/problems/role-update-001'
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse({ runStatus: 'COMPLETED', check })
      }
      return jsonResponse({ status: 'GENERATED', questions: generatedQuestions.questions })
    })
    render(<App />)
    fireEvent.submit((await screen.findByRole('button', { name: '제출하기' })).closest('form')!)
    expect(await screen.findByText(visible)).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/interview-questions')).toHaveLength(0)
    expect(screen.queryByLabelText('면접 질문')).not.toBeInTheDocument()
  })

  it('keeps the judge result when interview questions are UNAVAILABLE', async () => {
    window.location.hash = '#/problems/role-update-001'
    vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/problems/role-update-001') return jsonResponse(detail)
      if (url === '/api/submissions' && init?.method === 'POST') {
        return jsonResponse(passedSubmission)
      }
      return jsonResponse({ status: 'UNAVAILABLE', questions: [] })
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('테스트 성공')).toBeInTheDocument()
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
        return jsonResponse(passedSubmission)
      }
      if (url === '/api/interview-questions' && init?.method === 'POST') return jsonResponse(generatedQuestions)
      return jsonResponse({ error: { kind: 'PROBLEM_NOT_FOUND' } }, false)
    })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '제출하기' }))
    expect(await screen.findByText('테스트 성공')).toBeInTheDocument()
    expect(screen.queryByText(/네트워크 오류/)).not.toBeInTheDocument()
    expect(await screen.findByText('역할이 생략된 경우를 왜 구분해야 합니까?')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/interview-questions', expect.objectContaining({
      method: 'POST',
    }))
  })
})

describe('workspace tour', () => {
  beforeEach(() => {
    window.location.hash = '#/problems/role-update-001'
  })

  const openTour = () => screen.findByRole('dialog', { name: '작업공간 둘러보기' })
  const closedTour = () => screen.queryByRole('dialog', { name: '작업공간 둘러보기' })

  it('opens on the first visit and walks the workspace step by step', async () => {
    mockApi()
    render(<App />)
    const tour = await openTour()
    expect(within(tour).getByRole('heading', { name: '문제 지문' })).toBeInTheDocument()
    expect(within(tour).getByText('1 / 7')).toBeInTheDocument()
    expect(within(tour).getByRole('button', { name: '〈 이전' })).toBeDisabled()

    await userEvent.click(within(tour).getByRole('button', { name: '다음 〉' }))
    expect(await screen.findByRole('heading', { name: '수정 가능 파일' })).toBeInTheDocument()
    expect(screen.getByText('2 / 7')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '〈 이전' }))
    expect(await screen.findByRole('heading', { name: '문제 지문' })).toBeInTheDocument()
  })

  it('does not open again once it has been closed', async () => {
    mockApi()
    render(<App />)
    const tour = await openTour()
    await userEvent.click(within(tour).getByRole('button', { name: '둘러보기 닫기' }))
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())

    cleanup()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    expect(closedTour()).not.toBeInTheDocument()
  })

  it('runs again from the header control after it was closed', async () => {
    mockApi()
    render(<App />)
    await userEvent.click(within(await openTour()).getByRole('button', { name: '다음 〉' }))
    await userEvent.click(screen.getByRole('button', { name: '둘러보기 닫기' }))
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '둘러보기' }))
    const reopened = await openTour()
    expect(within(reopened).getByRole('heading', { name: '문제 지문' })).toBeInTheDocument()
    expect(within(reopened).getByText('1 / 7')).toBeInTheDocument()
  })

  it('ends the tour from the skip control and keeps it closed afterwards', async () => {
    mockApi()
    render(<App />)
    const tour = await openTour()
    await userEvent.click(within(tour).getByRole('button', { name: '건너뛰기' }))
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())

    cleanup()
    render(<App />)
    await screen.findByRole('heading', { name: '역할 변경 승인 버그' })
    expect(closedTour()).not.toBeInTheDocument()
  })

  it('drops the skip control on the last step, where finishing is the same action', async () => {
    mockApi()
    render(<App />)
    await openTour()
    for (let step = 1; step < 7; step += 1) {
      await userEvent.click(screen.getByRole('button', { name: '다음 〉' }))
    }
    const tour = await openTour()
    expect(within(tour).getByText('7 / 7')).toBeInTheDocument()
    expect(within(tour).queryByRole('button', { name: '건너뛰기' })).not.toBeInTheDocument()
    expect(within(tour).getByRole('button', { name: '마치기' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the control that started it', async () => {
    mockApi()
    render(<App />)
    await userEvent.click(within(await openTour()).getByRole('button', { name: '둘러보기 닫기' }))
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())

    const restart = screen.getByRole('button', { name: '둘러보기' })
    await userEvent.click(restart)
    await openTour()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())
    expect(restart).toHaveFocus()
  })

  it('leaves the editor and the submit button usable while it is open', async () => {
    mockApi()
    render(<App />)
    await openTour()
    const editor = screen.getByLabelText('src/main/java/com/coditto/demo/RoleService.java')
    fireEvent.change(editor, { target: { value: 'class RoleService { void fixed() {} }' } })
    expect(editor).toHaveValue('class RoleService { void fixed() {} }')
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()
  })

  it('does not pull focus away from a control the reader used before it opened', async () => {
    mockApi()
    render(<App />)
    const path = 'src/main/java/com/coditto/demo/RoleService.java'
    const editor = await screen.findByLabelText(path)
    await userEvent.click(screen.getByRole('button', { name: path }))
    expect(editor).toHaveFocus()
    expect(await openTour()).toBeInTheDocument()
    expect(editor).toHaveFocus()
  })

  it('re-measures the highlight when the target is resized by a splitter drag', async () => {
    const observed: Element[] = []
    let notify = () => {}
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        notify = callback
      }
      observe(element: Element) {
        observed.push(element)
      }
      disconnect() {}
    })
    let width = 300
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      left: 0, top: 64, width, height: 200, right: width, bottom: 264, x: 0, y: 64,
      toJSON: () => ({}),
    }) as DOMRect)

    mockApi()
    render(<App />)
    await openTour()
    expect(observed).toContain(document.querySelector('.pane-left'))
    expect(document.querySelector('.tour-spot')).toHaveStyle({ width: '312px' })

    width = 620
    act(() => notify())
    expect(document.querySelector('.tour-spot')).toHaveStyle({ width: '632px' })
  })

  it('opens even when the seen flag cannot be read from storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mockApi()
    render(<App />)
    expect(await openTour()).toBeInTheDocument()
  })

  it('still closes when the seen flag cannot be written to storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    mockApi()
    render(<App />)
    await userEvent.click(within(await openTour()).getByRole('button', { name: '둘러보기 닫기' }))
    await waitFor(() => expect(closedTour()).not.toBeInTheDocument())
  })
})
