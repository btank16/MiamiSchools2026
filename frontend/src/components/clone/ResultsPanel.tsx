import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { places, sectors, type Sector } from './data'
import { ListingCard, SpotlightCard } from './ListingCard'
import { SectorPin } from './SectorPin'

export function ResultsPanel({ className }: { className?: string }) {
  const [active, setActive] = useState<Sector[]>([])
  const toggle = (s: Sector) => setActive((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]))
  const shown = places.filter((p) => !active.length || active.includes(p.sector))
  const spotlight = shown.filter((p) => p.featured)
  const rest = shown.filter((p) => !p.featured)

  return (
    <section className={cn('px-6 pb-12 pt-8', className)}>
      <h1 className="max-w-[18ch] text-[40px] font-semibold leading-[1.05] tracking-tight">Schools and childcare in Miami, FL</h1>
      <p className="mt-3 text-text-secondary">3,382 places, from official county, state and federal records</p>

      <div role="group" aria-label="Filter by kind of place" className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(sectors) as Sector[]).map((s) => {
          const on = active.includes(s)
          return (
            <button
              key={s}
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={cn(
                'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition',
                on ? 'border-primary bg-selected text-primary-700' : 'border-border bg-white text-foreground hover:bg-muted',
              )}
            >
              <SectorPin sector={s} size={16} />
              {sectors[s].label}
              <span className="text-muted-foreground tabular-nums">{sectors[s].count.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-5 mt-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All places</h2>
        <button className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-foreground">
          Sort by: Relevance <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {spotlight.map((p) => (
          <SpotlightCard key={p.id} place={p} />
        ))}
        {rest.map((p) => (
          <ListingCard key={p.id} place={p} />
        ))}
      </div>
      {!shown.length && <p className="py-12 text-text-secondary">No places match these filters. Clear a filter to see more.</p>}
    </section>
  )
}
