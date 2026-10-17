import { useEffect, useState } from 'react'
import { AlertTriangle, Info, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SEARCH_RADIUS_MILES } from '@/lib/api'
import type { SearchResult, SearchState } from '@/lib/useSchoolSearch'
import type { Place } from './data'
import { ListingCard, SpotlightCard } from './ListingCard'

// cards render in pages; a search returns several hundred places
const PAGE = 24

export function ResultsPanel({
  search,
  places,
  total,
  filtering,
  onClear,
  onOpen,
  className,
}: {
  search: SearchState
  places: Place[]
  total: number
  filtering: boolean
  onClear: () => void
  onOpen: (p: Place) => void
  className?: string
}) {
  return (
    <section className={cn('px-6 pb-12 pt-8', className)}>
      {search.status === 'loading' && (
        <Notice icon={Loader2} spin>
          Looking up {search.label} in GreatSchools and Miami-Dade County data.
        </Notice>
      )}
      {search.status === 'error' && (
        <Notice icon={AlertTriangle}>
          That search didn't work. {search.label}: {search.message}
        </Notice>
      )}
      {search.status === 'done' ? (
        <Results key={search.origin.placeId} result={search} places={places} filtering={filtering} onClear={onClear} onOpen={onOpen} />
      ) : (
        <Directory places={places} total={total} filtering={filtering} onClear={onClear} onOpen={onOpen} />
      )}
    </section>
  )
}

// slim strip above the list: searching never replaces what is already on screen
function Notice({ icon: Icon, spin, children }: { icon: typeof Search; spin?: boolean; children: React.ReactNode }) {
  return (
    <p className="mb-6 flex items-center gap-2 rounded-lg border border-line bg-bar px-4 py-3 text-sm">
      <Icon className={cn('size-4 shrink-0 text-brand', spin && 'animate-spin')} />
      {children}
    </p>
  )
}

// What shows before any address is searched: every place, with a nudge to search.
function Directory({
  places,
  total,
  filtering,
  onClear,
  onOpen,
}: {
  places: Place[]
  total: number
  filtering: boolean
  onClear: () => void
  onOpen: (p: Place) => void
}) {
  const [count, setCount] = useState(PAGE)
  // a new filter result starts again from the first page
  useEffect(() => setCount(PAGE), [places])
  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">Schools and childcare in</p>
      <h1 className="mt-2 text-[44px] font-bold leading-none tracking-tight">Miami, FL</h1>
      <p className="mt-4 font-semibold">
        {filtering ? `${places.length.toLocaleString()} of ${total.toLocaleString()} places match` : `${total.toLocaleString()} places available`}
      </p>
      <p className="mt-1 text-sm text-neutral-600">Search an address to see distance and your zoned schools.</p>

      <h2 className="mb-6 mt-8 text-2xl font-bold">All places</h2>
      {places.length === 0 && <NoMatches filtering={filtering} onClear={onClear} />}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {places.slice(0, count).map((p) => (
          <ListingCard key={p.id} place={p} onOpen={onOpen} />
        ))}
      </div>
      {places.length > count && <ShowMore left={places.length - count} onClick={() => setCount(count + PAGE)} />}
    </>
  )
}

function NoMatches({ filtering, onClear }: { filtering: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-line p-8 text-center">
      <p className="font-semibold">No places match these filters</p>
      {filtering && (
        <button onClick={onClear} className="mt-2 text-sm font-semibold text-primary underline">
          Clear filters
        </button>
      )}
    </div>
  )
}

function ShowMore({ left, onClick }: { left: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mx-auto mt-8 block h-12 rounded-lg border border-ink px-6 font-semibold hover:bg-neutral-50">
      Show more ({left.toLocaleString()} left)
    </button>
  )
}

function Results({
  result,
  places,
  filtering,
  onClear,
  onOpen,
}: {
  result: SearchResult
  places: Place[]
  filtering: boolean
  onClear: () => void
  onOpen: (p: Place) => void
}) {
  const [count, setCount] = useState(PAGE)
  const { origin } = result
  const zoned = places.filter((p) => p.zoned.length)
  const rest = places.filter((p) => !p.zoned.length)
  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">Schools and childcare near</p>
      <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight">{origin.street ?? origin.formattedAddress}</h1>
      <p className="mt-1 text-neutral-600">{origin.formattedAddress}</p>
      <p className="mt-4 font-semibold">
        {filtering
          ? `${places.length} of ${result.places.length} places match`
          : `${result.places.length} places within ${SEARCH_RADIUS_MILES} miles`}
      </p>

      {result.errors.map((e) => (
        <Notice key={e} icon={AlertTriangle}>
          {e}. Showing results from the other source only.
        </Notice>
      ))}
      {result.report && !result.report.withinMiamiDade && (
        <Notice icon={Info}>This address is outside Miami-Dade County, so there are no zoned schools or county listings for it.</Notice>
      )}

      {places.length === 0 && <NoMatches filtering={filtering} onClear={onClear} />}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {zoned.map((p) => (
          <SpotlightCard key={p.id} place={p} onOpen={onOpen} />
        ))}
        {rest.slice(0, count).map((p) => (
          <ListingCard key={p.id} place={p} onOpen={onOpen} />
        ))}
      </div>
      {rest.length > count && <ShowMore left={rest.length - count} onClick={() => setCount(count + PAGE)} />}
    </>
  )
}
