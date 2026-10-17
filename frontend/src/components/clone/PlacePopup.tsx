import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import { Heart, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Photo, opensPage } from './ListingCard'
import type { Place } from './data'

// click popup for a map dot: photo carousel on top, summary below (Airbnb-style card, our palette)
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
        <Photo place={place} arrows className="h-[170px]">
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
          {place.posted && (
            <span className="absolute bottom-3 right-3 z-10 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-white">
              {place.posted}
            </span>
          )}
        </Photo>
        <div className="space-y-1 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-snug">{place.name}</h3>
            {place.rating && (
              <span className="flex shrink-0 items-center gap-1 text-sm">
                <Star className="size-3.5 fill-ink" /> {place.rating}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-600">{place.address}</p>
          <p className="text-sm">
            {place.kind} <span className="mx-1 text-neutral-300">|</span> {place.grades}
          </p>
          <p className="truncate text-sm text-neutral-600">{place.tags.join(' · ')}</p>
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-lg font-bold">{place.cost}</span>
            <button className="h-9 rounded-md bg-deep px-3 text-sm font-semibold text-white hover:bg-deep/90">
              Check availability
            </button>
          </div>
        </div>
      </article>
    </Popup>
  )
}
