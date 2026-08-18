export type FilterGroup = {
  id: string
  label: string
  options: string[]
  selected: string | null
}

/**
 * 필터를 기술 스택·오류 유형·난이도로 나눠, 한 줄에 섞인 칩보다 구분이 보이게 한다.
 */
export function FilterBoard({
  groups,
  onToggle,
}: {
  groups: FilterGroup[]
  onToggle: (id: string, value: string) => void
}) {
  const visible = groups.filter((group) => group.options.length > 0)
  if (visible.length === 0) return null

  return (
    <div className="filter-board">
      {visible.map((group) => (
        <fieldset key={group.id} className="filter-section">
          <legend>{group.label}</legend>
          <div className="chips">
            {group.options.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === group.selected}
                className={option === group.selected ? 'chip is-active' : 'chip'}
                onClick={() => onToggle(group.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
