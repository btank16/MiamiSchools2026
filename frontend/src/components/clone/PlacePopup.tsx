import { useEffect, useRef, useState } from 'react'
import { Popup, useMap } from 'react-map-gl/maplibre'
import { Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RatingChip, ZonedBadge, miles, opensPage, tuitionText } from './ListingCard'
import type { Place } from './data'
import { AcademicResults } from './AcademicResults'
import { programSummary } from '@/lib/after-school'

// Map cards put the school's academic summary first; photos live on the detail page.
export function PlacePopup({ place, onClose, onOpen }: { place: Place; onClose: () => void; onOpen: (p: Place) => void }) {
  const programs = programSummary(place)
  const [liked, setLiked] = useState(false)
  const content = useRef<HTMLElement>(null)
  const { current: map } = useMap()
  // Expanded explanations change the card height. Keep the whole card inside the map,
  // including on phones where the filter bar leaves a smaller map viewport.
  useEffect(() => {
    const element = content.current
    if (!element || !map) return
    let frame = 0
    const keepVisible = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const popup = element.closest('.maplibregl-popup')?.getBoundingClientRect()
        if (!popup) return
        const bounds = map.getContainer().getBoundingClientRect()
        const dx = popup.left < bounds.left + 16 ? bounds.left + 16 - popup.left
          : popup.right > bounds.right - 16 ? bounds.right - 16 - popup.right : 0
        const dy = popup.top < bounds.top + 16 ? bounds.top + 16 - popup.top
          : popup.bottom > bounds.bottom - 16 ? bounds.bottom - 16 - popup.bottom : 0
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([-dx, -dy], { duration: 0 })
      })
    }
    const observer = new ResizeObserver(keepVisible)
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [map, place.id])
  return (
    <Popup
      longitude={place.lngLat[0]}
      latitude={place.lngLat[1]}
      offset={14}
      anchor="center"
      maxWidth="none"
      closeButton={false}
      closeOnClick={false}
      className="place-popup"
      onClose={onClose}
    >
      <article ref={content} className="max-h-[calc(100dvh-var(--header-h,133px)-32px)] w-[300px] max-w-[calc(100vw-40px)] cursor-pointer overflow-y-auto bg-white text-ink" onClick={opensPage(place, onOpen)}>
        <div className="space-y-1 px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-600">{place.kind}{place.grades && ` · ${place.grades}`}</span>
            <div className="flex shrink-0 gap-1">
            <button
              aria-label={`Save ${place.name}`}
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
              className="grid size-8 place-items-center rounded-full border border-line bg-white text-brand"
            >
              <Heart className={cn('size-4', liked && 'fill-brand text-brand')} />
            </button>
            <button aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full border border-line bg-white">
              <X className="size-4" />
            </button>
            </div>
          </div>
          {place.zoned.length > 0 && <ZonedBadge place={place} className="mb-2 w-fit" />}
          <h3 className="text-base font-bold leading-snug">{place.name}</h3>
          <AcademicResults place={place} variant="popup" />
          <p className="text-sm text-neutral-600">{place.address}</p>
          <p className="text-xs text-neutral-600">{[place.distanceMiles != null ? miles(place.distanceMiles) : null, tuitionText(place.tuition)].filter(Boolean).join(' · ')}</p>
          {programs && <p className="text-xs leading-relaxed text-neutral-600">{programs}</p>}
          <div className="flex items-center justify-between gap-3 pt-2">
            {place.ratingBand ? <RatingChip band={place.ratingBand} /> : <span />}
            <button
              onClick={() => onOpen(place)}
              className="h-9 rounded-md bg-deep px-3 text-sm font-semibold text-white hover:bg-deep/90"
            >
              View details
            </button>
          </div>
        </div>
      </article>
    </Popup>
  )
}
