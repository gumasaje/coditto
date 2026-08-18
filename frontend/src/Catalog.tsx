import { useEffect, useMemo, useState } from 'react'
import { CategoryTabs } from './components/CategoryTabs'
import { FilterBoard } from './components/FilterBoard'
import { ProblemTable } from './components/ProblemTable'
import { SiteHeader } from './components/SiteHeader'
import { ALL_CATEGORY, NETWORK_ERROR, difficultyLabel } from './copy'
import { clearPassed, readPassedIds } from './progress'
import { catalogHash, readCatalogCategory } from './routes'
import { ProblemCatalog, ProblemSummary } from './types'

const DIFFICULTY_ORDER = ['Easy', 'Normal', 'Hard']

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
 * 프로토타입 문제 목록: 네이비 페이지 헤더와 밝은 본문의 필터·행 목록.
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
        current="problems"
        trailing={
          <button type="button" className="nav-reset" onClick={() => setPassedIds(clearPassed())}>
            처음부터
          </button>
        }
      />
      <main id="main" tabIndex={-1}>
        <section className="band">
          <div className="shell page-head">
            <h1 className="page-title">문제</h1>
            <p className="page-body">문제가 있는 코드를 직접 수정하고, 실행 결과를 확인한 뒤 제출합니다.</p>
          </div>
        </section>
        {error ? (
          <p role="alert" className="note note-error">{error}</p>
        ) : !catalog ? (
          <p className="note">문제를 불러오는 중…</p>
        ) : (
          <div className="shell catalog-body">
            <div className="catalog-filters">
              <CategoryTabs tabs={tabs} selected={activeCategory} onSelect={selectCategory} />
              <FilterBoard groups={groups} onToggle={toggleFilter} />
            </div>
            <ProblemTable
              problems={visible}
              passedIds={passedIds}
              emptyMessage={filteredOut ? '선택한 조건에 맞는 문제가 없습니다.' : '이 카테고리에 준비된 문제가 없습니다.'}
            />
          </div>
        )}
      </main>
    </div>
  )
}
