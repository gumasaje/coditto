import { useEffect, useMemo, useState } from 'react'
import { CatalogHero } from './components/CatalogHero'
import { CategoryTabs } from './components/CategoryTabs'
import { FilterBoard } from './components/FilterBoard'
import { ProblemTable } from './components/ProblemTable'
import { SiteHeader } from './components/SiteHeader'
import { ALL_CATEGORY, NETWORK_ERROR, difficultyLabel } from './copy'
import { clearPassed, readPassedIds } from './progress'
import { catalogHash, readCatalogCategory } from './routes'
import { ProblemCatalog, ProblemSummary } from './types'

const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard']

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function sortDifficulties(values: string[]): string[] {
  const rest = values.filter((value) => !DIFFICULTY_ORDER.includes(value))
  return [...DIFFICULTY_ORDER.filter((value) => values.includes(value)), ...rest]
}

function scopedProblems(catalog: ProblemCatalog, category: string): ProblemSummary[] {
  if (category === ALL_CATEGORY) return catalog.problems
  return catalog.problems.filter((problem) => problem.category === category)
}

/**
 * 캡처 1 메인 페이지 골격: 헤더 → 비대칭 히어로 → 탭/칩 → 테이블.
 * 존재하지 않는 "준비 중" 행은 API 계약에 맞게 그리지 않는다.
 */
export function Catalog() {
  const [catalog, setCatalog] = useState<ProblemCatalog | null>(null)
  const [category, setCategory] = useState(readCatalogCategory)
  const [stack, setStack] = useState<string | null>(null)
  const [bugType, setBugType] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string | null>(null)
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

  useEffect(() => {
    const sync = () => {
      setCategory(readCatalogCategory())
      setStack(null)
      setBugType(null)
      setDifficulty(null)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const tabs = catalog ? [ALL_CATEGORY, ...catalog.categories] : [ALL_CATEGORY]
  const activeCategory = catalog && category !== ALL_CATEGORY && !catalog.categories.includes(category)
    ? ALL_CATEGORY
    : category
  const scoped = catalog ? scopedProblems(catalog, activeCategory) : []
  const groups = useMemo(() => [
    { id: 'stack', label: '기술 스택', options: unique(scoped.map((problem) => problem.stack)).sort((a, b) => a.localeCompare(b, 'ko')), selected: stack },
    { id: 'bugType', label: '오류 유형', options: unique(scoped.map((problem) => problem.bugType)).sort((a, b) => a.localeCompare(b, 'ko')), selected: bugType },
    { id: 'difficulty', label: '난이도', options: sortDifficulties(unique(scoped.map((problem) => difficultyLabel(problem.difficulty)))), selected: difficulty },
  ], [scoped, stack, bugType, difficulty])

  const visible = scoped.filter((problem) => {
    if (stack && problem.stack !== stack) return false
    if (bugType && problem.bugType !== bugType) return false
    if (difficulty && difficultyLabel(problem.difficulty) !== difficulty) return false
    return true
  })
  const filteredOut = visible.length === 0 && scoped.length > 0 && Boolean(stack || bugType || difficulty)

  function selectCategory(next: string) {
    setStack(null)
    setBugType(null)
    setDifficulty(null)
    setCategory(next)
    const nextHash = catalogHash(next)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
  }

  function toggleFilter(id: string, value: string) {
    const update = (current: string | null) => current === value ? null : value
    if (id === 'stack') setStack(update)
    if (id === 'bugType') setBugType(update)
    if (id === 'difficulty') setDifficulty(update)
  }

  return (
    <div className="page">
      <SiteHeader
        center="한 번 맞히는 시험이 아니라, 안전하게 고치는 습관을 반복하는 훈련장"
        trailing={
          <button type="button" onClick={() => setPassedIds(clearPassed())}>
            처음부터
          </button>
        }
      />
      {error ? (
        <p role="alert" className="note note-error">{error}</p>
      ) : !catalog ? (
        <p className="note">문제를 불러오는 중…</p>
      ) : (
        <>
          <CatalogHero passed={passedIds.filter((id) => catalog.problems.some((problem) => problem.id === id)).length} total={catalog.problems.length} />
          <div className="catalog-body">
            <CategoryTabs tabs={tabs} selected={activeCategory} onSelect={selectCategory} />
            <FilterBoard groups={groups} onToggle={toggleFilter} />
            <ProblemTable
              problems={visible}
              passedIds={passedIds}
              emptyMessage={filteredOut ? '선택한 조건에 맞는 문제가 없습니다.' : '이 카테고리에 준비된 문제가 없습니다.'}
            />
          </div>
        </>
      )}
    </div>
  )
}
