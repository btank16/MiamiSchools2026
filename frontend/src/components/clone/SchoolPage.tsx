import { useEffect, useState } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import {
  Baby, BadgeCheck, Building2, CalendarDays, ChevronLeft, ExternalLink, GraduationCap, Heart, Home, IdCard, Mail,
  MapPin, Phone, Printer, Share, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLE } from './MapPanel'
import type { Origin, Place } from './data'
import { RatingChip, ZonedBadge, enrollmentText, miles, zonedLabel } from './ListingCard'

function Divider() {
  return <hr className="my-8 border-line" />
}

function Tile({ place, offset, className, children }: { place: Place; offset: number; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundImage: `linear-gradient(${135 + offset * 30}deg, oklch(0.8 0.08 ${place.hue + offset * 18}), oklch(0.52 0.12 ${place.hue + 40 + offset * 18}))` }}
    >
      {children}
    </div>
  )
}

// placeholder tiles until the sources have photos
function PhotoGrid({ place }: { place: Place }) {
  return (
    <div className="relative grid h-[240px] grid-cols-1 gap-2 overflow-hidden rounded-xl md:h-[360px] md:grid-cols-4 md:grid-rows-2">
      <Tile place={place} offset={0} className="md:col-span-2 md:row-span-2" />
      {[1, 2, 3, 4].map((n) => (
        <Tile key={n} place={place} offset={n} className="max-md:hidden" />
      ))}
    </div>
  )
}

// a field from the county record, which differs by dataset (private schools have coed, daycares a license...)
function countyField(place: Place, key: string): unknown {
  return (place.sources.county?.record as Record<string, unknown> | undefined)?.[key]
}

const HEAD_START_PROGRAM: Record<string, string> = {
  'early-head-start': 'Early Head Start (infants and toddlers)',
  'grantee-agency': 'Head Start, run by the grantee agency',
  'delegate-agency': 'Head Start, run by a delegate agency',
}

function facts(place: Place, origin: Origin) {
  const list: { icon: typeof MapPin; title: string; text: string }[] = []
  if (place.zoned.length) {
    list.push({ icon: MapPin, title: zonedLabel(place.zoned), text: `${origin.formattedAddress} is in this school's attendance zone.` })
  }
  const enrollment = enrollmentText(place)
  const utilization = countyField(place, 'utilization')
  if (enrollment) {
    list.push({
      icon: Users,
      title: 'Enrollment',
      text: typeof utilization === 'number' ? `${enrollment} · ${Math.round(utilization * 100)}% full` : enrollment,
    })
  }
  if (place.grades) list.push({ icon: GraduationCap, title: 'Grades', text: place.grades })
  const coed = countyField(place, 'coed')
  if (typeof coed === 'string') list.push({ icon: Users, title: 'Students', text: coed === 'coed' ? 'Coed' : `${coed[0].toUpperCase()}${coed.slice(1)} only` })
  const year = countyField(place, 'yearEstablished')
  if (typeof year === 'number') list.push({ icon: CalendarDays, title: 'Established', text: String(year) })
  const license = countyField(place, 'licenseNumber')
  if (typeof license === 'string') list.push({ icon: IdCard, title: 'Child care license', text: license })
  const program = countyField(place, 'program')
  if (typeof program === 'string') list.push({ icon: Baby, title: 'Program', text: HEAD_START_PROGRAM[program] ?? program })
  const district = place.sources.greatSchools?.districtName
  if (district) list.push({ icon: Building2, title: 'District', text: district })
  const campuses = countyField(place, 'otherCampuses')
  if (Array.isArray(campuses) && campuses.length) {
    list.push({ icon: Building2, title: 'Other campuses', text: campuses.map((c) => `${c.name} (${c.address.street ?? 'no address'})`).join('; ') })
  }
  return list
}

function ContactCard({ place }: { place: Place }) {
  const fax = place.sources.greatSchools?.fax
  const rows = [
    place.phone && { icon: Phone, label: place.phone, href: `tel:${place.phone}` },
    place.email && { icon: Mail, label: place.email, href: `mailto:${place.email}` },
    place.website && { icon: ExternalLink, label: 'School website', href: place.website },
    place.greatSchoolsUrl && { icon: BadgeCheck, label: 'GreatSchools profile', href: place.greatSchoolsUrl },
    fax && { icon: Printer, label: `Fax ${fax}` },
  ].filter((r): r is { icon: typeof Phone; label: string; href?: string } => !!r)
  return (
    <aside className="sticky top-[94px]">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_6px_20px_rgb(0,0,0,0.1)]">
        <p className="text-sm text-neutral-600">{place.kind}</p>
        <p className="text-xl font-semibold">{place.name}</p>
        <p className="mt-1 text-sm text-neutral-600">{place.address}</p>
        {rows.length ? (
          <ul className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
            {rows.map(({ icon: Icon, label, href }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon className="size-4 shrink-0 text-brand" />
                {href ? (
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="break-all underline">
                    {label}
                  </a>
                ) : (
                  label
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 border-t border-line pt-5 text-sm text-neutral-600">No contact details in either source.</p>
        )}
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="mt-5 grid h-12 w-full place-items-center rounded-lg bg-brand text-base font-semibold text-white hover:brightness-95"
          >
            Call the school
          </a>
        )}
      </div>
    </aside>
  )
}

// camelCase key -> "Camel case"
const labelOf = (key: string) => {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words[0].toUpperCase() + words.slice(1)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '—'
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if ('street' in o || 'city' in o) return [o.street, o.city, o.zip].filter(Boolean).join(', ') || '—'
    if ('name' in o) return [o.name, o.address && formatValue(o.address)].filter(Boolean).join(' — ')
    return JSON.stringify(value)
  }
  return String(value)
}

// every field the source returned, so nothing it knows is hidden
function SourceTable({ title, subtitle, record }: { title: string; subtitle: string; record: object }) {
  return (
    <section className="rounded-xl border border-line">
      <header className="border-b border-line px-5 py-3">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-neutral-600">{subtitle}</p>
      </header>
      <dl className="divide-y divide-line text-sm">
        {Object.entries(record).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[160px_1fr] gap-4 px-5 py-2">
            <dt className="text-neutral-600">{labelOf(key)}</dt>
            <dd className="min-w-0 break-words">
              {typeof value === 'string' && /^https?:\/\//.test(value) ? (
                <a href={value} target="_blank" rel="noreferrer" className="break-all text-brand underline">
                  {value}
                </a>
              ) : (
                formatValue(value)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function SchoolPage({ place, origin, onBack }: { place: Place; origin: Origin; onBack: () => void }) {
  const [liked, setLiked] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [place.id])
  const city = place.address.split(', ')[1]
  const kindLabel = /^(Public|Private|Charter)$/.test(place.kind) ? `${place.kind} school` : place.kind
  const enrollment = enrollmentText(place)
  const { greatSchools, county } = place.sources
  return (
    <article className="mx-auto max-w-[1120px] px-6 pb-16 pt-6">
      <button
        aria-label="Back to results"
        onClick={onBack}
        className="mb-4 flex h-9 items-center gap-1 rounded-full border border-line bg-white pl-2 pr-4 text-sm font-medium hover:bg-neutral-50"
      >
        <ChevronLeft className="size-4" /> Back to results
      </button>

      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[26px] font-semibold leading-tight">{place.name}</h1>
        <div className="flex shrink-0 items-center gap-4 text-sm font-medium">
          <button className="flex items-center gap-2 underline"><Share className="size-4" /> Share</button>
          <button aria-pressed={liked} onClick={() => setLiked(!liked)} className="flex items-center gap-2 underline">
            <Heart className={cn('size-4', liked && 'fill-brand text-brand')} /> Save
          </button>
        </div>
      </div>

      <PhotoGrid place={place} />

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold">
            {kindLabel}
            {city && ` in ${city}, Florida`}
          </h2>
          <p className="mt-1 text-neutral-600">
            {[place.grades, enrollment, miles(place.distanceMiles)].filter(Boolean).join(' · ')}
          </p>
          {(place.zoned.length > 0 || place.ratingBand) && (
            <p className="mt-3 flex flex-wrap items-center gap-2">
              {place.zoned.length > 0 && <ZonedBadge place={place} />}
              {place.ratingBand && (
                <span className="flex items-center gap-2 text-sm">
                  <RatingChip band={place.ratingBand} /> GreatSchools rating
                </span>
              )}
            </p>
          )}
          {place.summary && <p className="mt-5 leading-relaxed">{place.summary}</p>}

          <Divider />
          <h2 className="mb-5 text-[22px] font-semibold">At a glance</h2>
          <ul className="space-y-6">
            {facts(place, origin).map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-0.5 size-6 shrink-0 text-ink" />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-neutral-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <Divider />
          <h2 className="mb-1 text-[22px] font-semibold">Where it is</h2>
          <p className="mb-5 text-neutral-600">
            {place.address} · {miles(place.distanceMiles)} from {origin.street ?? origin.formattedAddress}
          </p>
          <div className="h-[380px] overflow-hidden rounded-xl border border-line">
            <Map
              initialViewState={{
                bounds: [
                  [Math.min(place.lngLat[0], origin.lon), Math.min(place.lngLat[1], origin.lat)],
                  [Math.max(place.lngLat[0], origin.lon), Math.max(place.lngLat[1], origin.lat)],
                ],
                fitBoundsOptions: { padding: 70, maxZoom: 15 },
              }}
              mapStyle={STYLE}
              style={{ width: '100%', height: '100%' }}
              attributionControl={false}
              scrollZoom={false}
            >
              <Marker longitude={origin.lon} latitude={origin.lat}>
                <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-ink text-white shadow">
                  <Home className="size-4" />
                </span>
              </Marker>
              <Marker longitude={place.lngLat[0]} latitude={place.lngLat[1]}>
                <span className="grid size-12 place-items-center rounded-full bg-brand/20">
                  <span className="grid size-8 place-items-center rounded-full bg-brand text-white shadow">
                    <GraduationCap className="size-4" />
                  </span>
                </span>
              </Marker>
            </Map>
          </div>

          <Divider />
          <h2 className="mb-1 text-[22px] font-semibold">All data by source</h2>
          <p className="mb-5 text-sm text-neutral-600">Every field each source returned for this place.</p>
          <div className="space-y-6">
            {county && <SourceTable title="Miami-Dade County GIS" subtitle={county.dataset} record={county.record} />}
            {greatSchools && <SourceTable title="GreatSchools" subtitle="NearbySchools API" record={greatSchools} />}
          </div>
        </div>

        <ContactCard place={place} />
      </div>
    </article>
  )
}
