/**
 * 캡처 1의 보조 필터 칩. API 쿼리가 아니라 목록에 실제로 있는 값만 그린다.
 */
export function FilterChips({
  chips,
  selected,
  onToggle,
}: {
  chips: string[]
  selected: string | null
  onToggle: (chip: string) => void
}) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 pt-6">
      {chips.map((chip) => {
        const active = chip === selected
        return (
          <button
            key={chip}
            type="button"
            aria-pressed={active}
            className={
              active
                ? 'border border-acid px-2.5 py-1 text-[12px] text-acid'
                : 'border border-line px-2.5 py-1 text-[12px] text-mute hover:border-line-strong hover:text-ink'
            }
            onClick={() => onToggle(chip)}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
