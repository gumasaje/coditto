import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Box,
  Placement,
  SPOTLIGHT_PAD,
  TourStep,
  placeTourBubble,
  visibleTourSteps,
} from '../workspaceTour'

const FOCUSABLE = 'button:not([disabled])'

function safeTop(): number {
  const nav = document.querySelector('.nav')
  if (!nav) return 0
  return Math.max(0, nav.getBoundingClientRect().bottom)
}

function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect()
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

/**
 * 첫 진입 안내. 대상 요소를 도려낸 덮개 위에 단계별 말풍선을 띄운다.
 *
 * 덮개와 강조 영역은 `pointer-events: none`이라 스플리터 드래그와 에디터 입력을
 * 가로채지 않는다. 대신 Tab은 말풍선 안에서 순환시켜 포커스만 붙잡는다.
 */
export function WorkspaceTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [index, setIndex] = useState(0)
  const [spot, setSpot] = useState<Box | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const close = useCallback(() => {
    const restore = restoreRef.current
    restoreRef.current = null
    onClose()
    if (restore && restore.isConnected) restore.focus()
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setSteps([])
      setPlacement(null)
      setSpot(null)
      return
    }
    const active = document.activeElement
    restoreRef.current = active instanceof HTMLElement && active !== document.body ? active : null
    setSteps(visibleTourSteps(document))
    setIndex(0)
  }, [open])

  const step: TourStep | undefined = steps[index]

  useLayoutEffect(() => {
    if (!open || !step) return
    const target = step.target ? document.querySelector(step.target) : null
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'center', inline: 'nearest' })
    }
    const measure = () => {
      const bubble = bubbleRef.current
      if (!bubble) return
      const size = { left: 0, top: 0, width: bubble.offsetWidth, height: bubble.offsetHeight }
      const viewport = { width: window.innerWidth, height: window.innerHeight, safeTop: safeTop() }
      const box = target ? boxOf(target) : null
      setSpot(box)
      setPlacement(placeTourBubble(box, step.side, size, viewport))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    /*
     * 스플리터를 끌면 대상만 커지고 창 크기는 그대로라 resize 이벤트로는 잡히지 않는다.
     * 대상 크기를 직접 관찰해 강조 영역이 대상에서 떨어지지 않게 한다.
     */
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (target) observer?.observe(target)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, step])

  /**
   * 투어는 화면을 가로막지 않으므로 사용자가 이미 잡고 있는 포커스를 뺏지 않는다.
   * 갓 열린 화면(body), 투어를 연 버튼, 투어 안에서 옮겨 온 포커스일 때만 가져온다.
   */
  useEffect(() => {
    if (!open || !step) return
    const bubble = bubbleRef.current
    if (!bubble) return
    const active = document.activeElement
    const opener = restoreRef.current
    const idle = !active || active === document.body
    if (idle || active === opener || bubble.contains(active)) bubble.focus()
  }, [open, step])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open || !step) return null

  const first = index === 0
  const last = index === steps.length - 1

  /** 덮개가 포커스를 막지 않으므로 Tab만 말풍선 안에서 돌린다. */
  function trapTab(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const bubble = bubbleRef.current
    if (!bubble) return
    const targets = [...bubble.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (targets.length === 0) return
    const edge = event.shiftKey ? targets[0] : targets[targets.length - 1]
    if (document.activeElement !== edge && document.activeElement !== bubble) return
    event.preventDefault()
    ;(event.shiftKey ? targets[targets.length - 1] : targets[0]).focus()
  }

  return (
    <div className="tour" aria-hidden={false}>
      {spot ? (
        <div
          className="tour-spot"
          style={{
            left: spot.left - SPOTLIGHT_PAD,
            top: spot.top - SPOTLIGHT_PAD,
            width: spot.width + SPOTLIGHT_PAD * 2,
            height: spot.height + SPOTLIGHT_PAD * 2,
          }}
        />
      ) : (
        <div className="tour-scrim" />
      )}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="false"
        aria-label="작업공간 둘러보기"
        tabIndex={-1}
        className={`tour-bubble tour-bubble--${placement?.side ?? 'center'}`}
        style={placement ? { left: placement.left, top: placement.top } : { visibility: 'hidden' }}
        onKeyDown={trapTab}
      >
        {placement?.arrow ? (
          <span aria-hidden="true" className="tour-arrow" style={placement.arrow} />
        ) : null}
        <button type="button" className="tour-close" aria-label="둘러보기 닫기" onClick={close}>
          <span aria-hidden="true">✕</span>
        </button>
        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-foot">
          <span className="tour-progress">
            <span className="tour-step">{index + 1} / {steps.length}</span>
            {last ? null : (
              <button type="button" className="tour-skip" onClick={close}>건너뛰기</button>
            )}
          </span>
          <span className="tour-nav">
            <button
              type="button"
              className="tour-prev"
              disabled={first}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              〈 이전
            </button>
            <button
              type="button"
              className="tour-next"
              onClick={() => (last ? close() : setIndex((current) => current + 1))}
            >
              {last ? '마치기' : '다음 〉'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
