import { useEffect, useState } from 'react'
import type { Place } from '@/components/clone/data'

// Photos are Google Places photo ids listed per school in /photos/<id>.json; the images themselves are
// fetched from Google on demand through the key-holding proxy (dev: vite.config.ts, prod: backend route).
const PHOTO_BASE = import.meta.env.VITE_PHOTO_BASE ?? '/gphoto'
const cache = new Map<string, Promise<string[]>>()

function load(id: string) {
  let names = cache.get(id)
  if (!names) {
    names = fetch(`/photos/${id}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
    cache.set(id, names)
  }
  return names
}

const STREETVIEW_BASE = import.meta.env.VITE_STREETVIEW_BASE ?? '/gsv'

// "sv:<pano>:<heading>:<fov>" is a Street View shot aimed at the building; anything else is a Places photo
export const isStreetView = (name: string) => name.startsWith('sv:')

export function photoUrl(name: string, width: number) {
  if (isStreetView(name)) {
    const [, pano, heading, fov] = name.split(':')
    const w = Math.min(width, 640) // Street View Static tops out at 640 px
    return `${STREETVIEW_BASE}?pano=${pano}&heading=${heading}&fov=${fov}&pitch=8&size=${w}x${Math.round(w * 0.65)}`
  }
  return `${PHOTO_BASE}/${name}?maxWidthPx=${width}`
}

export function usePhotoNames(place: Place): string[] {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    let live = true
    if (place.photos) load(place.id).then((n) => live && setNames(n))
    return () => {
      live = false
    }
  }, [place.id, place.photos])
  return names
}
