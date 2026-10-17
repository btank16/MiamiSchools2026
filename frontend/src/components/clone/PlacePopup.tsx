import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import { Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Photo, RatingChip, ZonedBadge, miles, opensPage } from './ListingCard'
import type { Place } from './data'

// click popup for a map pin: photo carousel on top, summary below (Airbnb-style card, our palette)
export function PlacePopup({ place, onClose, onOpen }: { place: Place; onClose: () => void; onOpen: (p: Place) => void }) {
  const [liked, setLiked] = useState(false)
  return (
    <Popup
      longitude={place.lngLat[0]}
      latitude={place.lngLat[1]}
      offset={14}
      maxWidth="none"
      closeButton={false}
      closeOnClick={false}
      className="place-popup"
      onClose={onClose}
    >
      <article className="w-[280px] cursor-pointer bg-white text-ink" onClick={opensPage(place, onOpen)}>
        <Photo place={place} arrows width={560} className="h-[150px]">
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            <button
              aria-label={`Save ${place.name}`}
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
              className="grid size-8 place-items-center rounded-full bg-white shadow"
            >
              <Heart className={cn('size-4', liked && 'fill-brand text-brand')} />
            </button>
            <button aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-white shadow">
              <X className="size-4" />
            </button>
          </div>
          {place.zoned.length > 0 && <ZonedBadge place={place} className="absolute bottom-3 left-3 z-10" />}
        </Photo>
        <div className="space-y-1 px-4 pb-4 pt-3">
          <h3 className="text-base font-bold leading-snug">{place.name}</h3>
          <p className="text-sm text-neutral-600">{place.address}</p>
          <p className="text-sm">
            {place.kind}
            {place.grades && <><span className="mx-1 text-neutral-300">|</span>{place.grades}</>}
            <span className="mx-1 text-neutral-300">|</span>
            {miles(place.distanceMiles)}
          </p>
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
