import { afterEach, describe, expect, it } from 'vitest'
import {
  TourStep,
  WORKSPACE_TOUR_STEPS,
  placeTourBubble,
  visibleTourSteps,
} from './workspaceTour'

const viewport = { width: 1280, height: 720, safeTop: 64 }
const bubble = { left: 0, top: 0, width: 300, height: 160 }

function mount(html: string): HTMLElement {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.appendChild(host)
  return host
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('visibleTourSteps', () => {
  const steps: TourStep[] = [
    { id: 'a', title: 'A', body: 'a', target: '.a', side: 'right' },
    { id: 'b', title: 'B', body: 'b', target: '.b', side: 'right' },
    { id: 'c', title: 'C', body: 'c', target: null, side: 'center' },
  ]

  it('drops a step whose target is hidden on the current layout', () => {
    const host = mount('<div class="a"></div><div class="b" style="display:none"></div>')
    expect(visibleTourSteps(host, steps).map((step) => step.id)).toEqual(['a', 'c'])
  })

  it('drops a step whose target is missing from the document', () => {
    const host = mount('<div class="b"></div>')
    expect(visibleTourSteps(host, steps).map((step) => step.id)).toEqual(['b', 'c'])
  })

  it('keeps every workspace step when the full desktop layout is present', () => {
    const host = mount(WORKSPACE_TOUR_STEPS
      .filter((step) => step.target)
      .map((step) => `<div class="${step.target!.slice(1)}"></div>`)
      .join(''))
    expect(visibleTourSteps(host)).toHaveLength(WORKSPACE_TOUR_STEPS.length)
  })
})

describe('placeTourBubble', () => {
  it('puts the bubble beside the target on the preferred side', () => {
    const target = { left: 0, top: 65, width: 358, height: 655 }
    const placement = placeTourBubble(target, 'right', bubble, viewport)
    expect(placement.side).toBe('right')
    expect(placement.left).toBe(372)
    expect(placement.arrow).not.toBeNull()
  })

  it('flips to the opposite side when the preferred side leaves the viewport', () => {
    const target = { left: 586, top: 100, width: 694, height: 394 }
    expect(placeTourBubble(target, 'right', bubble, viewport).side).toBe('left')
  })

  it('keeps the bubble inside the viewport for a target at the right edge', () => {
    const target = { left: 1184, top: 14, width: 76, height: 36 }
    const placement = placeTourBubble(target, 'below', bubble, viewport)
    expect(placement.side).toBe('below')
    expect(placement.left + bubble.width).toBeLessThanOrEqual(viewport.width)
  })

  it('centers a step that has no target and drops the arrow', () => {
    const placement = placeTourBubble(null, 'center', bubble, viewport)
    expect(placement).toMatchObject({ side: 'center', arrow: null })
    expect(placement.left).toBe(490)
  })

  it('pins the bubble to the bottom when a target is larger than the viewport', () => {
    const narrow = { width: 375, height: 300, safeTop: 56 }
    const target = { left: 0, top: 56, width: 375, height: 244 }
    const placement = placeTourBubble(target, 'right', bubble, narrow)
    expect(placement).toMatchObject({ side: 'cover', arrow: null })
    expect(placement.top + bubble.height).toBeLessThanOrEqual(narrow.height)
  })

  it('never lifts the bubble above the sticky header', () => {
    const target = { left: 0, top: 700, width: 358, height: 20 }
    const placement = placeTourBubble(target, 'right', bubble, viewport)
    expect(placement.top).toBeGreaterThanOrEqual(viewport.safeTop)
  })
})
