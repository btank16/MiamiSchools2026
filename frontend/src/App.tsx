import { useState } from 'react'
import { Navbar } from '@/components/clone/Navbar'
import { FilterBar, type View } from '@/components/clone/FilterBar'
import { ResultsPanel } from '@/components/clone/ResultsPanel'
import { MapPanel } from '@/components/clone/MapPanel'
import { Footer } from '@/components/clone/Footer'

export default function App() {
  const [view, setView] = useState<View>('split')
  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <FilterBar view={view} onView={setView} />
      <main className="pt-[133px]">
        <div className="flex items-start">
          {view !== 'map' && <ResultsPanel className={view === 'split' ? 'w-full lg:w-1/2' : 'w-full'} />}
          {view !== 'list' && <MapPanel className={view === 'split' ? 'hidden lg:block lg:w-1/2' : 'w-full'} />}
        </div>
        {view !== 'map' && <Footer />}
      </main>
    </div>
  )
}
