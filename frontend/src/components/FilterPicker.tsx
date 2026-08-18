import { useEffect, useId, useRef, useState } from 'react'

export type FilterPickerOption = {
  value: string
  label: string
}

/**
 * 카탈로그 유형 선택: 닫힌 트리거를 누르면 선택지가 펼쳐진다.
 */
export function FilterPicker({
  label,
  valueLabel,
  options,
  selected,
  filled = selected != null,
  onSelect,
}: {
  label: string
  valueLabel: string
  options: FilterPickerOption[]
  selected: string | null
  filled?: boolean
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const triggerClass = [
    'filter-picker-trigger',
    open ? 'is-open' : '',
    filled ? 'is-active' : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={rootRef} className="filter-picker">
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-label={`${label}, ${valueLabel}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="filter-picker-label">{label}</span>
        <span className="filter-picker-value">{valueLabel}</span>
        <svg className="filter-picker-chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open ? (
        <div id={menuId} role="listbox" aria-label={label} className="filter-picker-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selected}
              className={option.value === selected ? 'filter-picker-option is-active' : 'filter-picker-option'}
              onClick={() => {
                onSelect(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
