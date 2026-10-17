import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Place } from './data'
import { ListingCard, SpotlightCard } from './ListingCard'

// only this many cards are drawn at a time; the rest come with "Show more", so thousands of places stay fast
const PAGE = 24

export function ResultsPanel({
  places,
  filtering,
  onClear,
  onOpen,
  className,
}: {
  places: Place[]
  filtering: boolean
  onClear: () => void
  onOpen: (p: Place) => void
  className?: string
}) {
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => {
    setLimit(PAGE)
  }, [places])
  // the zoned school always comes first
  const ordered = [...places].sort((a, b) => Number(!!b.zoned) - Number(!!a.zoned))
  const spotlight = ordered.filter((p) => p.spotlight)
  const rest = ordered.filter((p) => !p.spotlight)
  return (
    <section className={cn('px-6 pb-12 pt-8', className)}>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">Schools and childcare in</p>
      <h1 className="mt-2 text-[44px] font-bold leading-none tracking-tight">Miami, FL</h1>
      <p className="mt-4 font-semibold">
        {filtering ? `${places.length.toLocaleString()} matching places` : `${places.length.toLocaleString()} places available`}
      </p>

      <div className="mb-6 mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold">All places</h2>
        <button className="flex items-center gap-1 text-sm font-semibold">
          Sort by: Relevance <ChevronDown className="size-4" />
        </button>
      </div>

      {places.length === 0 && (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="font-semibold">No places match these filters yet</p>
          <button onClick={onClear} className="mt-2 text-sm font-semibold text-primary underline">
            Clear filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {spotlight.map((p) => (
          <SpotlightCard key={p.id} place={p} onOpen={onOpen} />
        ))}
        {rest.slice(0, limit).map((p) => (
          <ListingCard key={p.id} place={p} onOpen={onOpen} />
        ))}
      </div>
      {rest.length > limit && (
        <button
          onClick={() => setLimit(limit + PAGE)}
          className="mx-auto mt-8 block h-12 rounded-lg border border-ink px-8 text-base font-semibold hover:bg-neutral-50"
        >
          Show more ({(rest.length - limit).toLocaleString()} left)
        </button>
      )}
    </section>
  )
}
