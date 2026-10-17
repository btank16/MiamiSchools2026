import { useMemo, useState } from 'react'
import { Navbar } from '@/components/clone/Navbar'
import { FilterBar, type View } from '@/components/clone/FilterBar'
import { ResultsPanel } from '@/components/clone/ResultsPanel'
import { MapPanel } from '@/components/clone/MapPanel'
import { SchoolPage } from '@/components/clone/SchoolPage'
import { Footer } from '@/components/clone/Footer'
import { directory, type Place } from '@/components/clone/data'
import { emptyFilters, hasProgramFilters, isFiltering, matches, sortPlaces, type Filters, type Sort } from '@/components/clone/filters'
import { SEARCH_RADIUS_MILES, type PlaceSuggestion } from '@/lib/api'
import { useSchoolSearch } from '@/lib/useSchoolSearch'
import { getAcademics } from '@/lib/academics'

export default function App() {
  const [view, setView] = useState<View>('split')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [open, setOpen] = useState<Place | null>(null)
  const [sort, setSort] = useState<Sort>('default')
  const [search, runSearch] = useSchoolSearch()
  const result = search.status === 'done' ? search : null
  // every place until an address is searched, then the places near that address
  const base = result ? result.places : directory
  const academicFirst = !result && sort === 'default'
  const shown = useMemo(() => {
    const filtered = base.filter((p) => matches(p, filters))
    if (!academicFirst) return sortPlaces(filtered, sort)
    const hasResults = (p: Place) => {
      const academic = getAcademics(p)
      return academic?.math != null || academic?.english != null
    }
    // Availability first, keeping the existing order within each group. This is not a ranking.
    return filtered.sort((a, b) => Number(hasResults(b)) - Number(hasResults(a)))
  }, [base, filters, sort, academicFirst])
  const filtering = isFiltering(filters)

  const onSearch = (s: PlaceSuggestion, session: string) => {
    setOpen(null)
    runSearch(s, session)
  }
  const navbar = <Navbar busy={search.status === 'loading'} onSearch={onSearch} />

  // the school page replaces the results; going back remounts them with filters intact
  if (open) {
    return (
      <div className="min-h-screen bg-white text-ink">
        {navbar}
        <main className="pt-[70px]">
          <SchoolPage place={open} origin={result?.origin ?? null} onBack={() => setOpen(null)} />
          <Footer />
        </main>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-white text-ink">
      {navbar}
      <FilterBar view={view} onView={setView} filters={filters} onFilters={setFilters} sort={sort} onSort={setSort} hasOrigin={!!result} />
      <main className="pt-[var(--header-h,133px)]">
        {hasProgramFilters(filters) && <p role="status" className="border-b border-line bg-bar px-6 py-3 text-xs leading-relaxed text-neutral-600">Showing schools with matching after-school information. A listing does not guarantee a place; programs with unknown prices or hours won’t match a specific price or time filter.</p>}
        <div className="flex items-start">
          {view !== 'map' && (
            <ResultsPanel
              search={search}
              places={shown}
              total={base.length}
              filtering={filtering}
              academicFirst={academicFirst && shown.some((p) => getAcademics(p)?.math != null || getAcademics(p)?.english != null)}
              onClear={() => setFilters(emptyFilters)}
              onOpen={setOpen}
              className={view === 'split' ? 'w-full lg:w-1/2' : 'w-full'}
            />
          )}
          {view !== 'list' && (
            <MapPanel
              places={shown}
              origin={result?.origin ?? null}
              radiusMiles={filters.distance ?? SEARCH_RADIUS_MILES}
              onOpen={setOpen}
              className={view === 'split' ? 'hidden lg:block lg:w-1/2' : 'w-full'}
            />
          )}
        </div>
        {view !== 'map' && <Footer />}
      </main>
    </div>
  )
}
