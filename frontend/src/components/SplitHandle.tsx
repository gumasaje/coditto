import { PointerEvent } from 'react'

export function SplitHandle({
  axis,
  onDrag,
  label,
}: {
  axis: 'x' | 'y'
  onDrag: (client: number) => void
  label?: string
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
      aria-label={label}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      className={axis === 'x' ? 'split-col' : 'split-row'}
      onPointerDown={start}
      onPointerMove={move}
    />
  )
}
