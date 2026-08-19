/**
 * 랜딩·미리보기 공통 예제. 공개 fixture `role-update-001` v1의 실제 파일·카탈로그 값만 둔다.
 */
export const LANDING_PROBLEM = {
  id: 'role-update-001',
  version: 1,
  title: '회원 권한 수정 시 기존 관리자 권한이 사라져요',
  categoryLabel: 'Back-End',
  difficultyLabel: 'Easy',
  estimatedMinutes: 15,
  fileName: 'RoleService.java',
  filePath: 'src/main/java/com/coditto/demo/RoleService.java',
  statement: `# 역할 변경 승인 버그

\`RoleService.updateRole\`은 \`RoleChangeRequest\`가 승인된 역할 변경이면 요청한 새 역할을 반환하고, 승인되지 않았으면 기존 역할을 유지해야 합니다. 현재 구현은 승인된 요청도 기존 역할로 되돌려 실제 역할이 바뀌지 않습니다.

수정 가능한 파일은 다음 하나뿐입니다.

\`\`\`text
src/main/java/com/coditto/demo/RoleService.java
\`\`\`
`,
} as const

export const LANDING_PASSED_RESULT = {
  runStatus: 'COMPLETED' as const,
  check: {
    execution: 'TESTS_PASSED' as const,
    suites: {
      target: 'TESTS_PASSED' as const,
      regression: 'TESTS_PASSED' as const,
    },
  },
  problem: { id: LANDING_PROBLEM.id, version: LANDING_PROBLEM.version },
}

export const ROLE_CHANGE_REQUEST = `package com.coditto.demo;

public record RoleChangeRequest(String currentRole, String requestedRole, boolean approved) {
}
`

export const ROLE_SERVICE_BUGGY = `package com.coditto.demo;

public final class RoleService {
    public String updateRole(RoleChangeRequest request) {
        if (request.approved()) {
            return request.currentRole();
        }
        return request.currentRole();
    }
}
`

export const ROLE_SERVICE_FIXED = `package com.coditto.demo;

public final class RoleService {
    public String updateRole(RoleChangeRequest request) {
        if (request.approved()) {
            return request.requestedRole();
        }
        return request.currentRole();
    }
}
`

export function landingFiles(source: string) {
  return [
    { path: LANDING_PROBLEM.filePath, editable: true, content: source },
    {
      path: 'src/main/java/com/coditto/demo/RoleChangeRequest.java',
      editable: false,
      content: ROLE_CHANGE_REQUEST,
    },
  ]
}

/** 지문 + 한 줄 diff에서 나올 수 있는 질문·근거. 필드 계약은 question / rationale 만. */
export const LANDING_INTERVIEW_QUESTIONS = [
  {
    question: '승인된 요청에서 currentRole을 반환하면 역할이 왜 바뀌지 않나요?',
    rationale: '지문은 승인 시 requestedRole을 반환하라고 합니다.',
  },
  {
    question: 'approved가 false일 때 반환값을 바꾸면 안 되는 이유는 무엇인가요?',
    rationale: '미승인 경로는 기존 역할을 유지해야 합니다.',
  },
  {
    question: '두 분기가 같은 값을 반환하면 조건문은 어떤 의미가 없나요?',
    rationale: '수정 전 코드는 두 경로가 모두 currentRole을 반환합니다.',
  },
]
