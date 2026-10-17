import { useMemo, useState } from 'react'
import { Navbar } from '@/components/clone/Navbar'
import { FilterBar, type View } from '@/components/clone/FilterBar'
import { ResultsPanel } from '@/components/clone/ResultsPanel'
import { MapPanel } from '@/components/clone/MapPanel'
import { SchoolPage } from '@/components/clone/SchoolPage'
import { Footer } from '@/components/clone/Footer'
import { places, type Place } from '@/components/clone/data'
import { emptyFilters, isFiltering, matches, type Filters } from '@/components/clone/filters'

export default function App() {
  const [view, setView] = useState<View>('split')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [open, setOpen] = useState<Place | null>(null)
  const shown = useMemo(() => places.filter((p) => matches(p, filters)), [filters])
  const filtering = isFiltering(filters)
  // the school page replaces the results; going back remounts them with filters intact
  if (open) {
    return (
      <div className="min-h-screen bg-white text-ink">
        <Navbar />
        <main className="pt-[70px]">
          <SchoolPage place={open} onBack={() => setOpen(null)} />
          <Footer />
        </main>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <FilterBar view={view} onView={setView} filters={filters} onFilters={setFilters} />
      <main className="pt-[133px]">
        <div className="flex items-start">
          {view !== 'map' && (
            <ResultsPanel
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
              showDots={!filtering}
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
