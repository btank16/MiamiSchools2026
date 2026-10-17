import { useEffect, useState } from 'react'
import index from '@/data/photo-index.json'
import type { Place } from '@/components/clone/data'
import { API_BASE } from '@/lib/api'

// Photos are Google Places photo ids listed per school in /photos/<id>.json; the images themselves are
// fetched from Google on demand through the schools API, which holds the Google key (the "googlemap"
// Amplify secret, or GOOGLE_MAPS_API_KEY in backend/.env when VITE_API_URL points at a local backend).
// Schools arrive from the live search with their own ids, so each one is matched to the photo index by
// place and name (see data/build_frontend_data.py for how the index is built).
type Entry = { id: string; lng: number; lat: number; name: string; words: Set<string>; count: number }

const STOP = new Set(['the', 'of', 'and', 'at', 'inc', 'llc', 'school', 'schools', 'a'])
const wordsOf = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)))
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// ~200 m grid cells so a school only compares against its neighbours
const cell = (lng: number, lat: number) => `${Math.floor(lng * 500)},${Math.floor(lat * 500)}`
const grid = new Map<string, Entry[]>()
for (const [id, lng, lat, name, count] of index as [string, number, number, string, number][]) {
  const key = cell(lng, lat)
  const entry = { id, lng, lat, name, words: wordsOf(name), count }
  grid.set(key, [...(grid.get(key) ?? []), entry])
}

const matched = new Map<string, Entry | null>()

function match(place: Place): Entry | null {
  const known = matched.get(place.id)
  if (known !== undefined) return known
  const [lng, lat] = place.lngLat
  const mine = wordsOf(place.name)
  let best: { entry: Entry; score: number; meters: number } | null = null
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (const e of grid.get(cell(lng + dx / 500, lat + dy / 500)) ?? []) {
        const meters = Math.hypot((e.lat - lat) * 111320, (e.lng - lng) * 100300)
        const shared = [...mine].filter((w) => e.words.has(w)).length
        const sim = shared / Math.max(1, new Set([...mine, ...e.words]).size)
        const contain = squash(place.name).includes(squash(e.name)) || squash(e.name).includes(squash(place.name))
        if ((meters <= 120 && (sim >= 0.4 || contain)) || (meters <= 400 && (sim >= 0.6 || contain))) {
          const score = sim + (contain ? 1 : 0)
          if (!best || score > best.score || (score === best.score && meters < best.meters)) best = { entry: e, score, meters }
        }
      }
    }
  }
  const found = best?.entry ?? null
  matched.set(place.id, found)
  return found
}

export const photoCount = (place: Place) => match(place)?.count ?? 0

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

// "sv:<pano>:<heading>:<fov>" is a Street View shot aimed at the building; anything else is a Places photo
export const isStreetView = (name: string) => name.startsWith('sv:')

export function photoUrl(name: string, width: number) {
  if (isStreetView(name)) {
    const [, pano, heading, fov] = name.split(':')
    const w = Math.min(width, 640) // Street View Static tops out at 640 px
    return `${API_BASE}/streetview?pano=${pano}&heading=${heading}&fov=${fov}&pitch=8&size=${w}x${Math.round(w * 0.65)}`
  }
  // name is places/<placeId>/photos/<ref>, which is also the API route
  return `${API_BASE}/${name}?maxWidthPx=${width}`
}

export function usePhotoNames(place: Place): string[] {
  const [names, setNames] = useState<string[]>([])
  const id = match(place)?.id
  useEffect(() => {
    let live = true
    if (id) load(id).then((n) => live && setNames(n))
    return () => {
      live = false
    }
  }, [id])
  return names
}
