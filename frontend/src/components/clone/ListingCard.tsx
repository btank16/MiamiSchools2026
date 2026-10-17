import { useState } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, ExternalLink, Phone, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Place, ZoneLevel } from './data'

// whole card opens the school page; buttons and links (save, arrows, dots, website) keep their own behaviour
export const opensPage = (place: Place, onOpen: (p: Place) => void) => (e: React.MouseEvent) => {
  if ((e.target as HTMLElement).closest('button, a')) return
  e.preventDefault()
  onOpen(place)
}

export const miles = (d: number) => `${d < 10 ? d.toFixed(1) : Math.round(d)} mi away`

// GreatSchools rating bands on the grade chip colors (colors.md section 5): above = A, average = C, below = D
const BAND_STYLE: Record<string, string> = {
  'Above average': 'bg-[#D9F8E0] text-[#0E4926]',
  Average: 'bg-[#FCEDCD] text-[#4F3901]',
  'Below average': 'bg-[#FEEADF] text-[#5F2D0C]',
}

export function RatingChip({ band, className }: { band: string; className?: string }) {
  return (
    <span className={cn('rounded-sm px-1.5 py-0.5 text-xs font-bold', BAND_STYLE[band] ?? 'bg-muted text-ink', className)}>
      {band}
    </span>
  )
}

export const zonedLabel = (zoned: ZoneLevel[]) => `Your zoned ${zoned.join(' & ')} school`

// marigold is reserved for "your zoned school" (colors.md)
export function ZonedBadge({ place, className }: { place: Place; className?: string }) {
  return (
    <span className={cn('flex h-[22px] items-center gap-1 rounded-sm bg-[#F7BE2B] px-2.5 text-sm font-medium text-ink', className)}>
      <Star className="size-3.5 fill-ink" />
      {zonedLabel(place.zoned)}
    </span>
  )
}

export function Photo({ place, className, children, arrows }: { place: Place; className?: string; children?: React.ReactNode; arrows?: boolean }) {
  const [slide, setSlide] = useState(0)
  const dots = 4
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: `linear-gradient(${135 + slide * 25}deg, oklch(0.78 0.09 ${place.hue}), oklch(0.5 0.12 ${place.hue + 40}))`,
      }}
    >
      {children}
      {arrows && (
        <>
          {slide > 0 && (
            <button
              aria-label="Previous photo"
              onClick={() => setSlide(slide - 1)}
              className="absolute left-3 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white shadow"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {slide < dots - 1 && (
            <button
              aria-label="Next photo"
              onClick={() => setSlide(slide + 1)}
              className="absolute right-3 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white shadow"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </>
      )}
      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1">
        {Array.from({ length: dots }, (_, i) => (
          <button
            key={i}
            aria-label={`Photo ${i + 1} of ${dots}`}
            onClick={() => setSlide(i)}
            className={cn('size-1.5 rounded-full bg-white', i === slide ? 'opacity-100' : 'opacity-60')}
          />
        ))}
      </div>
    </div>
  )
}

function Save({ name }: { name: string }) {
  const [on, setOn] = useState(false)
  return (
    <button
      aria-label={`Save ${name}`}
      aria-pressed={on}
      onClick={() => setOn(!on)}
      className="absolute right-3 top-3 z-10 grid size-8 place-items-center text-white drop-shadow"
    >
      <Bookmark className={cn('size-7', on && 'fill-white')} strokeWidth={2} />
    </button>
  )
}

function Chip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-[13px] font-semibold',
        dark ? 'bg-white/15 text-white' : 'bg-[#e9f3f3] text-deep',
      )}
    >
      {children}
    </span>
  )
}

// "171 students · 275 seats", or just one of the two when the other is missing
export function enrollmentText(place: Place): string | null {
  const { enrollment, capacity } = place
  if (enrollment && capacity) return `${enrollment.toLocaleString()} students · ${capacity.toLocaleString()} seats`
  if (enrollment) return `${enrollment.toLocaleString()} students`
  if (capacity) return `${capacity.toLocaleString()} seats`
  return null
}

// the zoned schools for the searched address
export function SpotlightCard({ place, onOpen }: { place: Place; onOpen: (p: Place) => void }) {
  const enrollment = enrollmentText(place)
  return (
    <article className="relative cursor-pointer overflow-hidden rounded-xl bg-deep text-white" onClick={opensPage(place, onOpen)}>
      <Photo place={place} className="h-[280px]">
        <ZonedBadge place={place} className="absolute left-4 top-4 z-10" />
        <Save name={place.name} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-deep via-deep/80 to-transparent" />
        <div className="absolute inset-x-4 bottom-9 z-10">
          <h3 className="text-xl font-bold">{place.name}</h3>
        </div>
      </Photo>
      <div className="space-y-2 px-4 pb-5 pt-3">
        <p className="text-sm">{place.address}</p>
        <p className="flex flex-wrap items-center gap-2 pt-1 text-sm font-bold">
          {miles(place.distanceMiles)}
          <Chip dark>{place.kind}</Chip>
          {place.grades && <Chip dark>{place.grades}</Chip>}
          {place.ratingBand && <RatingChip band={place.ratingBand} />}
        </p>
        {enrollment && <p className="text-sm">{enrollment}</p>}
        <div className="flex items-center gap-4 pt-3">
          {place.phone && (
            <a href={`tel:${place.phone}`} className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="size-4" /> {place.phone}
            </a>
          )}
          <button
            onClick={() => onOpen(place)}
            className="h-10 flex-1 rounded-md bg-white text-sm font-semibold text-ink hover:bg-neutral-100"
          >
            View details
          </button>
        </div>
      </div>
    </article>
  )
}

export function ListingCard({ place, onOpen }: { place: Place; onOpen: (p: Place) => void }) {
  const enrollment = enrollmentText(place)
  return (
    <article className="cursor-pointer overflow-hidden rounded-xl border border-line bg-white" onClick={opensPage(place, onOpen)}>
      <Photo place={place} className="h-[160px]">
        <Save name={place.name} />
        <span className="absolute bottom-3 right-3 z-10 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-white">
          {miles(place.distanceMiles)}
        </span>
      </Photo>
      <div className="space-y-1.5 px-4 pb-4 pt-3">
        {place.ratingBand && (
          <p className="flex items-center gap-2 text-sm">
            <RatingChip band={place.ratingBand} />
            <span className="text-neutral-600">GreatSchools rating</span>
          </p>
        )}
        <h3 className="text-lg font-bold leading-snug">{place.name}</h3>
        <p className="text-sm text-neutral-600">{place.address}</p>
        <p className="text-sm">
          {place.kind}
          {place.grades && <><span className="mx-1 text-neutral-300">|</span>{place.grades}</>}
          {enrollment && <><span className="mx-1 text-neutral-300">|</span>{enrollment}</>}
        </p>
        <div className="flex items-center gap-4 border-t border-line pt-3">
          {place.website ? (
            <a
              href={place.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold"
            >
              <ExternalLink className="size-4" /> Website
            </a>
          ) : place.phone ? (
            <a href={`tel:${place.phone}`} className="flex items-center gap-1.5 text-sm font-semibold">
              <Phone className="size-4" /> Call
            </a>
          ) : null}
          <button
            onClick={() => onOpen(place)}
            className="h-10 flex-1 rounded-md bg-deep text-sm font-semibold text-white hover:bg-deep/90"
          >
            View details
          </button>
        </div>
      </div>
    </article>
  )
}
