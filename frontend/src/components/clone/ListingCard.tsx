import { useState } from 'react'
import { BadgeCheck, Bookmark, CalendarDays, ChevronLeft, ChevronRight, MapPinHouse, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isStreetView, photoUrl, usePhotoNames } from '@/lib/photos'
import type { Place } from './data'

// whole card opens the school page; buttons (save, arrows, dots, tour) keep their own behaviour
export const opensPage = (place: Place, onOpen: (p: Place) => void) => (e: React.MouseEvent) => {
  if ((e.target as HTMLElement).closest('button')) return
  e.preventDefault()
  onOpen(place)
}

// real photos load one at a time (the current slide) from Google, so a page of cards stays light;
// the gradient shows while loading, for schools without photos, and when an image fails
export function Photo({ place, className, children, arrows, width = 480 }: { place: Place; className?: string; children?: React.ReactNode; arrows?: boolean; width?: number }) {
  const [slide, setSlide] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const names = usePhotoNames(place)
  const dots = place.photos ?? 1
  const name = names[slide]
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: `linear-gradient(${135 + slide * 25}deg, oklch(0.78 0.09 ${place.hue}), oklch(0.5 0.12 ${place.hue + 40}))`,
      }}
    >
      {name && !failed.includes(name) && (
        <img
          key={name}
          src={photoUrl(name, width)}
          alt={`${place.name}, photo ${slide + 1}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed((f) => [...f, name])}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {name && !failed.includes(name) && isStreetView(name) && (
        <span className="absolute bottom-2.5 left-3 z-10 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">Street View</span>
      )}
      {children}
      {arrows && dots > 1 && (
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
      {dots > 1 && (
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
      )}
    </div>
  )
}

// top-left tag for the school the searched address is zoned for: the one place the accent color is used
function ZonedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'absolute z-10 flex h-8 items-center gap-1.5 rounded-md bg-highlight pl-2 pr-3 text-sm font-bold text-ink shadow-md ring-1 ring-ink/10',
        className,
      )}
    >
      <MapPinHouse className="size-4" strokeWidth={2.4} />
      Your zoned school
    </span>
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

export function SpotlightCard({ place, onOpen }: { place: Place; onOpen: (p: Place) => void }) {
  return (
    <article
      className={cn('relative cursor-pointer overflow-hidden rounded-xl bg-deep text-white', place.zoned && 'ring-2 ring-highlight')}
      onClick={opensPage(place, onOpen)}
    >
      <Photo place={place} className="h-[350px]">
        {place.zoned ? (
          <ZonedBadge className="left-4 top-4" />
        ) : (
          place.badge && (
            <span className="absolute left-4 top-4 z-10 flex h-[22px] items-center gap-1 rounded-sm bg-white px-3 text-sm text-neutral-800">
              <Star className="size-3.5 fill-brand text-brand" />
              {place.badge}
            </span>
          )
        )}
        <Save name={place.name} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-deep via-deep/80 to-transparent" />
        <div className="absolute inset-x-4 bottom-9 z-10">
          <h3 className="flex items-center gap-1.5 text-xl font-bold">
            {place.name}
            {place.verified && <BadgeCheck className="size-5" />}
          </h3>
        </div>
      </Photo>
      <div className="space-y-2 px-4 pb-5 pt-3">
        <p className="text-sm">{place.address}</p>
        <p className="text-sm">
          <a href="#" className="underline">Quick look</a>
          <span className="mx-2 opacity-50">|</span>
          <a href="#" className="underline">View details</a>
        </p>
        <p className="flex flex-wrap items-center gap-2 pt-1 text-sm font-bold">
          {place.cost}
          <Chip dark>{place.kind}</Chip>
          <Chip dark>{place.grades}</Chip>
        </p>
        <div className="flex items-center gap-4 pt-4">
          <button className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4" /> Tour
          </button>
          <button className="h-10 flex-1 rounded-md bg-white text-sm font-semibold text-ink hover:bg-neutral-100">
            Check availability
          </button>
        </div>
      </div>
    </article>
  )
}

export function ListingCard({ place, onOpen }: { place: Place; onOpen: (p: Place) => void }) {
  return (
    <article
      className={cn('cursor-pointer overflow-hidden rounded-xl border border-line bg-white', place.zoned && 'ring-2 ring-highlight')}
      onClick={opensPage(place, onOpen)}
    >
      <Photo place={place} className="h-[207px]">
        <Save name={place.name} />
        {place.zoned && <ZonedBadge className="left-3 top-3" />}
        {!place.zoned && place.badge && (
          <span className="absolute left-3 top-3 z-10 rounded-sm bg-white px-2.5 py-0.5 text-sm text-neutral-800">
            {place.badge}
          </span>
        )}
        {place.posted && (
          <span className="absolute bottom-3 right-3 z-10 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-white">
            {place.posted}
          </span>
        )}
      </Photo>
      <div className="space-y-1.5 px-4 pb-4 pt-3">
        <div className="flex items-center gap-2 text-sm">
          {place.rating && (
            <>
              <span className="rounded-sm bg-violet px-1.5 py-0.5 text-xs font-bold text-white">{place.rating}</span>
              <span>{place.ratingLabel}</span>
            </>
          )}
          {place.verified && (
            <span className="flex items-center gap-1">
              <BadgeCheck className="size-4" /> Verified
            </span>
          )}
          <a href="#" className="ml-auto text-sm text-violet">Quick look</a>
        </div>
        <h3 className="text-lg font-bold leading-snug">{place.name}</h3>
        <p className="text-sm text-neutral-600">{place.address}</p>
        <p className="truncate text-sm">{place.tags.join('  |  ')}</p>
        <p className="text-sm">
          {place.kind} <span className="mx-1 text-neutral-300">|</span> {place.grades}
          <span className="mx-1 text-neutral-300">|</span>
          <a href="#" className="underline">View details</a>
        </p>
        <p className="flex items-center gap-2 text-xl font-bold">
          {place.cost}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">Total cost</span>
        </p>
        <div className="flex items-center gap-4 border-t border-line pt-3">
          <button className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4" /> Tour
          </button>
          <button className="h-10 flex-1 rounded-md bg-deep text-sm font-semibold text-white hover:bg-deep/90">
            Check availability
          </button>
        </div>
      </div>
    </article>
  )
}
