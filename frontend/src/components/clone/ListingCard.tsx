import { useState } from 'react'
import { Bookmark, MapPinCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sectors, type Grade, type Place } from './data'
import { SectorPin } from './SectorPin'

function GradeBadge({ grade, dark }: { grade: Grade; dark?: boolean }) {
  const k = grade.toLowerCase()
  return (
    <span
      className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-[13px] font-semibold', dark && 'ring-1 ring-white/30')}
      style={{ background: `var(--grade-${k}-bg)`, color: `var(--grade-${k}-fg)` }}
    >
      State grade {grade}
    </span>
  )
}

function SectorLabel({ place, dark }: { place: Place; dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium', dark ? 'text-on-dark' : 'text-text-secondary')}>
      <SectorPin sector={place.sector} size={18} />
      {sectors[place.sector].label}
      <span aria-hidden="true" className={dark ? 'text-on-dark-muted' : 'text-muted-foreground'}>/</span>
      <span className="sr-only">, grades</span>
      {place.grades}
    </span>
  )
}

function Save({ name, dark }: { name: string; dark?: boolean }) {
  const [on, setOn] = useState(false)
  return (
    <button
      aria-label={`Save ${name}`}
      aria-pressed={on}
      onClick={() => setOn(!on)}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full transition',
        dark ? 'text-on-dark hover:bg-white/10' : 'text-text-secondary hover:bg-muted',
        on && 'text-highlight-text',
      )}
    >
      <Bookmark className={cn('size-5', on && 'fill-highlight text-highlight-text')} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

function ZonedTag() {
  return (
    <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md bg-highlight px-2 text-[13px] font-semibold text-highlight-foreground">
      <MapPinCheck className="size-3.5" aria-hidden="true" />
      Your zoned school
    </span>
  )
}

// stand-in for a photo: a flat wash of the place's own color, so the card still reads without an image
function Placeholder({ place, className }: { place: Place; className?: string }) {
  return (
    <div
      className={cn('grid place-items-center', className)}
      style={{ background: `color-mix(in oklab, var(--sector-${place.sector}) 14%, white)` }}
      aria-hidden="true"
    >
      <div className="opacity-90">
        <SectorPin sector={place.sector} size={56} />
      </div>
    </div>
  )
}

export function SpotlightCard({ place }: { place: Place }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-surface-dark text-on-dark">
      <Placeholder place={place} className="h-[150px]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-semibold leading-snug tracking-tight">{place.name}</h3>
          <Save name={place.name} dark />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectorLabel place={place} dark />
          {place.zoned && <ZonedTag />}
          {place.grade && <GradeBadge grade={place.grade} dark />}
        </div>
        <p className="text-sm text-on-dark-muted">{place.address}</p>
        <p className="text-sm text-on-dark-muted">{place.tags.join(', ')}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="font-semibold">{place.cost}</p>
          <Button className="h-10 rounded-md bg-white px-4 text-[15px] font-semibold text-surface-dark hover:bg-white/90">View details</Button>
        </div>
      </div>
    </article>
  )
}

export function ListingCard({ place }: { place: Place }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-[0_6px_20px_-8px_rgb(8_53_74/0.25)]">
      <Placeholder place={place} className="h-[120px]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-snug tracking-tight">{place.name}</h3>
          <Save name={place.name} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectorLabel place={place} />
          {place.grade && <GradeBadge grade={place.grade} />}
        </div>
        <p className="text-sm text-muted-foreground">{place.address}</p>
        <p className="text-sm text-text-secondary">{place.tags.join(', ')}</p>
        <p className="mt-auto pt-2 text-base font-semibold">{place.cost}</p>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" className="h-10 flex-1 rounded-md text-[15px] font-semibold">Compare</Button>
          <Button className="h-10 flex-1 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed">View details</Button>
        </div>
      </div>
    </article>
  )
}
