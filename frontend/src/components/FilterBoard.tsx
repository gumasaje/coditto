import { FilterPicker } from './FilterPicker'

export type FilterGroup = {
  id: string
  label: string
  options: string[]
  selected: string | null
}

/**
 * 기술 스택·오류 유형·난이도를 유형 선택기로 두고, 클릭하면 선택지가 펼쳐지게 한다.
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
    <>
      {visible.map((group) => (
        <FilterPicker
          key={group.id}
          label={group.label}
          valueLabel={group.selected ?? '전체'}
          options={group.options.map((option) => ({ value: option, label: option }))}
          selected={group.selected}
          onSelect={(value) => onToggle(group.id, value)}
        />
      ))}
    </>
  )
}
