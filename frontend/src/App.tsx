import { useMemo, useState } from 'react'
import { Navbar } from '@/components/clone/Navbar'
import { FilterBar, type View } from '@/components/clone/FilterBar'
import { ResultsPanel } from '@/components/clone/ResultsPanel'
import { MapPanel } from '@/components/clone/MapPanel'
import { SchoolPage } from '@/components/clone/SchoolPage'
import { Footer } from '@/components/clone/Footer'
import type { Place } from '@/components/clone/data'
import { emptyFilters, isFiltering, matches, type Filters } from '@/components/clone/filters'
import { SEARCH_RADIUS_MILES, type PlaceSuggestion } from '@/lib/api'
import { useSchoolSearch } from '@/lib/useSchoolSearch'

export default function App() {
  const [view, setView] = useState<View>('split')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [open, setOpen] = useState<Place | null>(null)
  const [search, runSearch] = useSchoolSearch()
  const result = search.status === 'done' ? search : null
  const shown = useMemo(() => (result?.places ?? []).filter((p) => matches(p, filters)), [result, filters])
  const filtering = isFiltering(filters)

  const onSearch = (s: PlaceSuggestion, session: string) => {
    setOpen(null)
    runSearch(s, session)
  }
  const navbar = <Navbar busy={search.status === 'loading'} onSearch={onSearch} />

  // the school page replaces the results; going back remounts them with filters intact
  if (open && result) {
    return (
      <div className="min-h-screen bg-white text-ink">
        {navbar}
        <main className="pt-[70px]">
          <SchoolPage place={open} origin={result.origin} onBack={() => setOpen(null)} />
          <Footer />
        </main>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-white text-ink">
      {navbar}
      <FilterBar view={view} onView={setView} filters={filters} onFilters={setFilters} />
      <main className="pt-[133px]">
        <div className="flex items-start">
          {view !== 'map' && (
            <ResultsPanel
              search={search}
              places={shown}
              filtering={filtering}
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
