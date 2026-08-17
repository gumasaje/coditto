import { useEffect, useMemo, useState } from 'react'
import { CatalogHero } from './components/CatalogHero'
import { CategoryTabs } from './components/CategoryTabs'
import { FilterChips } from './components/FilterChips'
import { ProblemTable } from './components/ProblemTable'
import { SiteHeader } from './components/SiteHeader'
import { ALL_CATEGORY, NETWORK_ERROR, difficultyLabel } from './copy'
import { clearPassed, readPassedIds } from './progress'
import { ProblemCatalog } from './types'

/**
 * 캡처 1 메인 페이지 골격: 헤더 → 비대칭 히어로 → 탭/칩 → 테이블.
 * 존재하지 않는 "준비 중" 행은 API 계약에 맞게 그리지 않는다.
 */
export function Catalog() {
  const [catalog, setCatalog] = useState<ProblemCatalog | null>(null)
  const [category, setCategory] = useState(ALL_CATEGORY)
  const [chip, setChip] = useState<string | null>(null)
  const [passedIds, setPassedIds] = useState(readPassedIds)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/problems')
      .then(async (response) => {
        if (!response.ok) throw new Error('catalog')
        const body = await response.json() as ProblemCatalog
        if (cancelled) return
        setCatalog(body)
      })
      .catch(() => {
        if (!cancelled) setError(NETWORK_ERROR)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = catalog ? [ALL_CATEGORY, ...catalog.categories] : [ALL_CATEGORY]
  const chips = useMemo(() => {
    if (!catalog) return []
    const values = new Set<string>()
    for (const problem of catalog.problems) {
      values.add(problem.stack)
      values.add(problem.bugType)
      values.add(difficultyLabel(problem.difficulty))
    }
    return Array.from(values)
  }, [catalog])

  const visible = (catalog?.problems ?? []).filter((problem) => {
    if (category !== ALL_CATEGORY && problem.category !== category) return false
    if (!chip) return true
    return problem.stack === chip || problem.bugType === chip || difficultyLabel(problem.difficulty) === chip
  })

  return (
    <div className="min-h-dvh bg-void text-ink">
      <SiteHeader
        center="한 번 맞히는 시험이 아니라, 안전하게 고치는 습관을 반복하는 훈련장"
        trailing={
          <button
            type="button"
            className="text-mute hover:text-ink"
            onClick={() => setPassedIds(clearPassed())}
          >
            처음부터
          </button>
        }
      />
      {error ? (
        <p role="alert" className="px-5 py-10 text-[14px] text-danger">{error}</p>
      ) : !catalog ? (
        <p className="px-5 py-10 text-[14px] text-mute">문제를 불러오는 중…</p>
      ) : (
        <>
          <CatalogHero passed={passedIds.filter((id) => catalog.problems.some((problem) => problem.id === id)).length} total={catalog.problems.length} />
          <div className="px-5 py-6">
            <CategoryTabs tabs={tabs} selected={category} onSelect={(next) => { setCategory(next); setChip(null) }} />
            <FilterChips chips={chips} selected={chip} onToggle={(next) => setChip((current) => current === next ? null : next)} />
            <ProblemTable problems={visible} passedIds={passedIds} />
          </div>
        </>
      )}
    </div>
  )
}
