import { PointerEvent } from 'react'

export function SplitHandle({
  axis,
  onDrag,
}: {
  axis: 'x' | 'y'
  onDrag: (client: number) => void
}) {
  function start(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onDrag(axis === 'x' ? event.clientX : event.clientY)
  }

  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      className={
        axis === 'x'
          ? 'split-col w-1.5 shrink-0 bg-line hover:bg-acid'
          : 'split-row h-1.5 shrink-0 bg-line hover:bg-acid'
      }
      onPointerDown={start}
      onPointerMove={move}
    />
  )
}
