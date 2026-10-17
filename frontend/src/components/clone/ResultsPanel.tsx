import { useState } from 'react'
import { AlertTriangle, Bus, Info, Landmark, Loader2, Search, Stethoscope } from 'lucide-react'
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
  filtering,
  onClear,
  onOpen,
  className,
}: {
  search: SearchState
  places: Place[]
  filtering: boolean
  onClear: () => void
  onOpen: (p: Place) => void
  className?: string
}) {
  return (
    <section className={cn('px-6 pb-12 pt-8', className)}>
      {search.status === 'idle' && (
        <Message icon={Search} title="Search an address to see nearby schools">
          Type an address in Miami-Dade in the search bar. You'll see your zoned public schools plus every public, charter
          and private school, daycare and Head Start center within {SEARCH_RADIUS_MILES} miles.
        </Message>
      )}
      {search.status === 'loading' && (
        <Message icon={Loader2} spin title="Searching schools">
          Looking up {search.label} in GreatSchools and Miami-Dade County data.
        </Message>
      )}
      {search.status === 'error' && (
        <Message icon={AlertTriangle} title="That search didn't work">
          {search.label}: {search.message}
        </Message>
      )}
      {search.status === 'done' && (
        <Results key={search.origin.placeId} result={search} places={places} filtering={filtering} onClear={onClear} onOpen={onOpen} />
      )}
    </section>
  )
}

function Message({ icon: Icon, spin, title, children }: { icon: typeof Search; spin?: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-8 text-center">
      <Icon className={cn('mx-auto mb-3 size-7 text-brand', spin && 'animate-spin')} />
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600">{children}</p>
    </div>
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

      <AddressSummary result={result} />

      {zoned.length > 0 && (
        <>
          <h2 className="mb-4 mt-8 text-2xl font-bold">Your zoned schools</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {zoned.map((p) => (
              <SpotlightCard key={p.id} place={p} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      <div className="mb-6 mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold">All places</h2>
        <span className="text-sm font-semibold">Sorted by distance</span>
      </div>

      {places.length === 0 && (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="font-semibold">No places match these filters</p>
          {filtering && (
            <button onClick={onClear} className="mt-2 text-sm font-semibold text-primary underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {rest.slice(0, count).map((p) => (
          <ListingCard key={p.id} place={p} onOpen={onOpen} />
        ))}
      </div>
      {rest.length > count && (
        <button
          onClick={() => setCount(count + PAGE)}
          className="mx-auto mt-8 block h-12 rounded-lg border border-ink px-6 font-semibold hover:bg-neutral-50"
        >
          Show more ({rest.length - count} left)
        </button>
      )}
    </>
  )
}

// What the county knows about the address itself, plus where results were cut short.
function AddressSummary({ result }: { result: SearchResult }) {
  const { report, coverage, errors } = result
  const capped = coverage.filter((c) => c.shown < c.total)
  return (
    <div className="mt-6 space-y-4 rounded-xl border border-line bg-bar p-5 text-sm">
      {errors.map((e) => (
        <p key={e} className="flex gap-2 text-[#BE2323]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {e}. Showing results from the other source only.
        </p>
      ))}
      {report && !report.withinMiamiDade && (
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          This address is outside Miami-Dade County, so there are no zoned schools or county listings for it.
        </p>
      )}
      {report?.schoolBoard && (
        <p className="flex gap-2">
          <Landmark className="mt-0.5 size-4 shrink-0 text-brand" />
          <span>
            <span className="font-semibold">School Board District {report.schoolBoard.district}</span>
            {report.schoolBoard.member && <> · Board member {report.schoolBoard.member}</>}
          </span>
        </p>
      )}
      {report && report.nearestBusStops.length > 0 && (
        <div className="flex gap-2">
          <Bus className="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <p className="font-semibold">Nearest school bus stops</p>
            <ul className="mt-1 space-y-0.5 text-neutral-700">
              {report.nearestBusStops.map((s) => (
                <li key={s.id}>
                  {s.description ?? `Stop ${s.id}`} · {s.distanceMiles} mi
                  {s.routeIds.length > 0 && <> · Routes {s.routeIds.join(', ')}</>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {report && report.nearby.clinics.items.length > 0 && <Clinics clinics={report.nearby.clinics.items} />}
      {capped.length > 0 && (
        <div className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <p className="font-semibold">Nearest results shown where a source caps its list</p>
            <ul className="mt-1 space-y-0.5 text-neutral-700">
              {capped.map((c) => (
                <li key={c.label}>
                  {c.label}: nearest {c.shown} of {c.total} within {SEARCH_RADIUS_MILES} mi
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {report?.notes.map((n) => (
        <p key={n} className="flex gap-2 text-neutral-600">
          <Info className="mt-0.5 size-4 shrink-0" /> {n}
        </p>
      ))}
    </div>
  )
}

type Clinic = NonNullable<SearchResult['report']>['nearby']['clinics']['items'][number]

function Clinics({ clinics }: { clinics: Clinic[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? clinics : clinics.slice(0, 3)
  return (
    <div className="flex gap-2">
      <Stethoscope className="mt-0.5 size-4 shrink-0 text-brand" />
      <div>
        <p className="font-semibold">School-based health clinics ({clinics.length})</p>
        <ul className="mt-1 space-y-0.5 text-neutral-700">
          {shown.map((c) => (
            <li key={`${c.name}-${c.lat}-${c.lon}`}>
              {c.name} · {c.distanceMiles} mi
            </li>
          ))}
        </ul>
        {clinics.length > 3 && (
          <button onClick={() => setAll(!all)} className="mt-1 font-semibold text-brand underline">
            {all ? 'Show fewer' : `Show all ${clinics.length}`}
          </button>
        )}
      </div>
    </div>
  )
}
