export type TourSide = 'right' | 'left' | 'above' | 'below' | 'center' | 'cover'

export type TourStep = {
  id: string
  title: string
  body: string
  /** 가리킬 요소. `null`이면 대상 없이 화면 중앙에 놓는다. */
  target: string | null
  side: TourSide
}

export type Box = { left: number; top: number; width: number; height: number }
export type Viewport = { width: number; height: number; safeTop: number }
export type Placement = { left: number; top: number; side: TourSide; arrow: { left: number; top: number } | null }

/** 대상과 말풍선 사이 간격, 강조 여백, 뷰포트 가장자리 여백. */
const GAP = 14
export const SPOTLIGHT_PAD = 6
const MARGIN = 12
const ARROW = 9

/**
 * 작업공간 투어 단계. 마지막 단계는 대상이 없다.
 * 면접 카드는 통과 이전에 렌더링되지 않아 가리킬 요소가 없고,
 * 파일 트리는 860px 이하에서 숨겨진다. 두 경우 모두 `visibleTourSteps`가 정리한다.
 */
export const WORKSPACE_TOUR_STEPS: TourStep[] = [
  {
    id: 'statement',
    title: '문제 지문',
    body: '해결해야 할 기능과 수정 조건을 설명합니다. 내용을 잘 읽고 요구사항에 맞게 코드를 수정하세요.',
    target: '.pane-left',
    side: 'right',
  },
  {
    id: 'editable-files',
    title: '수정 가능 파일',
    body: '제출에 반영되는 파일입니다. 배지를 눌러 에디터에서 열 수 있습니다.',
    target: '.editable-files',
    side: 'right',
  },
  {
    id: 'file-tree',
    title: '파일 트리',
    body: '문제에 포함된 전체 파일 구조입니다. 읽기 전용 파일은 수정할 수 없지만, 문제를 이해하는 데 참고할 수 있습니다.',
    target: '.file-tree-pane',
    side: 'right',
  },
  {
    id: 'editor',
    title: '코드 에디터',
    body: '수정 가능 파일을 편집하는 공간입니다. 자동 완성 등 편집 기능을 활용해 코드를 작성하세요.',
    target: '.editor-monaco',
    side: 'left',
  },
  {
    id: 'submit',
    title: '제출',
    body: '수정한 코드를 제출하는 버튼입니다. 작업을 마친 뒤 눌러 결과를 확인하세요.',
    target: '.header-actions',
    side: 'below',
  },
  {
    id: 'judge',
    title: '채점 결과',
    body: '컴파일 성공 여부와 테스트 결과가 표시됩니다. 실패했다면 목표(새로 구현한 기능)와 회귀(기존 기능) 중 어느 쪽이 실패했는지 확인하세요.',
    target: '.result-pane',
    side: 'above',
  },
  {
    id: 'interview',
    title: '면접 질문',
    body: '모든 테스트를 통과하면 채점 결과 아래에 질문 카드가 표시됩니다. 이 안내를 다시 보고 싶다면 헤더의 둘러보기를 눌러주세요.',
    target: null,
    side: 'center',
  },
]

/**
 * 레이아웃 없이 판정한다. `getBoundingClientRect`는 jsdom에서 항상 0이라
 * 표시 여부 판정에 쓸 수 없고, 숨김은 모두 `display: none`으로 걸려 있다.
 */
export function isTourTargetVisible(element: Element | null): boolean {
  if (!element) return false
  if (element instanceof HTMLElement && element.hidden) return false
  const view = element.ownerDocument.defaultView
  if (!view || typeof view.getComputedStyle !== 'function') return true
  return view.getComputedStyle(element).display !== 'none'
}

/** 대상이 실제로 표시되는 단계만 남긴다. 진행 표시의 분모는 이 결과의 길이다. */
export function visibleTourSteps(root: ParentNode, steps: TourStep[] = WORKSPACE_TOUR_STEPS): TourStep[] {
  return steps.filter((step) => step.target === null || isTourTargetVisible(root.querySelector(step.target)))
}

/**
 * 표시되는 단계 목록이 바뀌었을 때 볼 단계를 고른다.
 * 보고 있던 단계가 남아 있으면 그대로 따라가고, 사라졌으면 그 앞의 가장 가까운 남은 단계로 물러난다.
 * 뷰포트가 좁아져 파일 트리 단계가 사라지는 경우가 여기에 해당한다.
 */
export function remapTourIndex(previous: TourStep[], index: number, next: TourStep[]): number {
  for (let at = Math.min(index, previous.length - 1); at >= 0; at -= 1) {
    const found = next.findIndex((step) => step.id === previous[at].id)
    if (found >= 0) return found
  }
  return 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function fits(side: TourSide, target: Box, bubble: Box, viewport: Viewport): boolean {
  const right = target.left + target.width
  const bottom = target.top + target.height
  if (side === 'right') return right + GAP + bubble.width + MARGIN <= viewport.width
  if (side === 'left') return target.left - GAP - bubble.width - MARGIN >= 0
  if (side === 'below') return bottom + GAP + bubble.height + MARGIN <= viewport.height
  if (side === 'above') return target.top - GAP - bubble.height - MARGIN >= viewport.safeTop
  return true
}

const FLIP: Record<Exclude<TourSide, 'center' | 'cover'>, TourSide> = {
  right: 'left',
  left: 'right',
  above: 'below',
  below: 'above',
}

/**
 * 선호 방향이 뷰포트를 벗어나면 반대쪽, 아래, 위 순으로 물러난다.
 * 어느 쪽도 맞지 않으면 화면 아래에 붙인다. 좁은 화면에서 대상이 뷰포트보다 클 때인데,
 * 중앙에 두면 설명 중인 내용을 정통으로 가리므로 읽는 순서상 뒤쪽을 덮는다.
 */
export function placeTourBubble(
  target: Box | null,
  preferred: TourSide,
  bubble: Box,
  viewport: Viewport,
): Placement {
  const maxLeft = Math.max(MARGIN, viewport.width - bubble.width - MARGIN)
  const maxTop = Math.max(viewport.safeTop, viewport.height - bubble.height - MARGIN)

  if (!target || preferred === 'center' || preferred === 'cover') {
    return {
      left: clamp((viewport.width - bubble.width) / 2, MARGIN, maxLeft),
      top: clamp((viewport.height - bubble.height) / 2, viewport.safeTop, maxTop),
      side: 'center',
      arrow: null,
    }
  }

  const order: TourSide[] = [preferred, FLIP[preferred], 'below', 'above']
  const side = order.find((candidate) => fits(candidate, target, bubble, viewport))
  if (!side) {
    return {
      left: clamp((viewport.width - bubble.width) / 2, MARGIN, maxLeft),
      top: maxTop,
      side: 'cover',
      arrow: null,
    }
  }

  const right = target.left + target.width
  const bottom = target.top + target.height
  let left: number
  let top: number
  if (side === 'right') {
    left = right + GAP
    top = clamp(target.top, viewport.safeTop, maxTop)
  } else if (side === 'left') {
    left = target.left - GAP - bubble.width
    top = clamp(target.top, viewport.safeTop, maxTop)
  } else if (side === 'below') {
    left = clamp(right - bubble.width, MARGIN, maxLeft)
    top = bottom + GAP
  } else {
    left = clamp(target.left, MARGIN, maxLeft)
    top = target.top - GAP - bubble.height
  }

  return { left, top, side, arrow: arrowAt(side, target, { ...bubble, left, top }) }
}

/** 화살표는 대상 중심을 향하되 말풍선 모서리를 넘지 않는다. */
function arrowAt(side: TourSide, target: Box, bubble: Box): { left: number; top: number } {
  const half = ARROW / 2
  const edge = ARROW * 2
  if (side === 'right' || side === 'left') {
    const centerY = target.top + target.height / 2 - bubble.top - half
    return {
      left: side === 'right' ? -half : bubble.width - half,
      top: clamp(centerY, edge, Math.max(edge, bubble.height - edge)),
    }
  }
  const centerX = target.left + target.width / 2 - bubble.left - half
  return {
    left: clamp(centerX, edge, Math.max(edge, bubble.width - edge)),
    top: side === 'below' ? -half : bubble.height - half,
  }
}
