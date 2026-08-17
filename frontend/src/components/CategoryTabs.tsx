import { categoryLabel } from '../copy'

/**
 * 캡처 1 카테고리 탭. 활성 표시는 배경 필이 아니라 라임 밑줄만 남긴다.
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
    <div role="tablist" aria-label="카테고리" className="flex gap-7 border-b border-line">
      {tabs.map((name) => {
        const active = name === selected
        return (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active
                ? '-mb-px border-b-2 border-acid py-3 text-[14px] font-medium tracking-[-0.02em] text-ink'
                : '-mb-px border-b-2 border-transparent py-3 text-[14px] tracking-[-0.02em] text-mute hover:text-ink'
            }
            onClick={() => onSelect(name)}
          >
            {categoryLabel(name)}
          </button>
        )
      })}
    </div>
  )
}
