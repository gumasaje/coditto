import { categoryLabel } from '../copy'

/**
 * 캡처 1 카테고리 탭. 활성 표시는 라임 밑줄만 남긴다.
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
    <div role="tablist" aria-label="카테고리" className="tabs">
      {tabs.map((name) => (
        <button
          key={name}
          type="button"
          role="tab"
          aria-selected={name === selected}
          className={name === selected ? 'tab is-active' : 'tab'}
          onClick={() => onSelect(name)}
        >
          {categoryLabel(name)}
        </button>
      ))}
    </div>
  )
}
