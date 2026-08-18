import { ALL_CATEGORY, categoryLabel } from '../copy'
import { FilterPicker } from './FilterPicker'

/**
 * 카테고리 유형 선택. 트리거를 누르면 카테고리가 펼쳐진다.
 */
export function CategoryTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: string[]
  selected: string
  onSelect: (tab: string) => void
}) {
  return (
    <FilterPicker
      label="카테고리"
      valueLabel={categoryLabel(selected)}
      options={tabs.map((name) => ({ value: name, label: categoryLabel(name) }))}
      selected={selected}
      filled={selected !== ALL_CATEGORY}
      onSelect={onSelect}
    />
  )
}
