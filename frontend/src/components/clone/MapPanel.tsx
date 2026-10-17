import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import { setWorkerUrl, type Map as MaplibreMap } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Check, Home, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Origin, Place } from './data'
import type { PlaceType } from './filters'
import { PlacePopup } from './PlacePopup'
import county from '@/assets/miami-dade-county.json'
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import { bbox, circle, mask } from '@turf/turf'

// in a production bundle maplibre cannot find its worker next to itself, so point it at the bundled one
if (import.meta.env.PROD) setWorkerUrl(workerUrl)

// keyless basemap for the clone phase; the Mapbox token path comes later
export const STYLE ='https://tiles.openfreemap.org/styles/liberty'

const countyShape = county as unknown as FeatureCollection<Polygon | MultiPolygon>
// world-sized polygon with the county cut out, so only the outside gets the haze
const outside = mask(countyShape.features[0])

// one color and one shape per kind (colors.md section 5), so kinds stay apart for color-blind readers
export const KIND_STYLE: Record<PlaceType, { color: string; shape: Shape }> = {
  Public: { color: '#2256BB', shape: 'circle' },
  Charter: { color: '#966CD7', shape: 'square' },
  Private: { color: '#C9690C', shape: 'diamond' },
  Childcare: { color: '#088F77', shape: 'triangle' },
  'Head Start': { color: '#741E34', shape: 'hexagon' },
}
const ZONED = '#F7BE2B'
const SELECTED_RING = '#060D1A'

type Shape = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon'

// Pins are map images rather than DOM markers: a search returns hundreds of places.
const PIN_PX = 16
const PIXEL_RATIO = 2
function pinImage(shape: Shape, color: string): ImageData {
  const size = PIN_PX * PIXEL_RATIO
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.canvas.width = ctx.canvas.height = size
  const c = size / 2
  const r = c - 2 * PIXEL_RATIO
  ctx.beginPath()
  if (shape === 'circle') ctx.arc(c, c, r, 0, Math.PI * 2)
  else if (shape === 'square') ctx.rect(c - r * 0.85, c - r * 0.85, r * 1.7, r * 1.7)
  else {
    const corners = shape === 'diamond' ? 4 : shape === 'triangle' ? 3 : 6
    const start = shape === 'hexagon' ? Math.PI / 6 : -Math.PI / 2
    for (let i = 0; i < corners; i++) {
      const a = start + (i * Math.PI * 2) / corners
      ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a) + (shape === 'triangle' ? r * 0.15 : 0))
    }
    ctx.closePath()
  }
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2 * PIXEL_RATIO
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  return ctx.getImageData(0, 0, size, size)
}

function addPinImages(map: MaplibreMap) {
  for (const [kind, { color, shape }] of Object.entries(KIND_STYLE)) {
    if (!map.hasImage(`pin-${kind}`)) map.addImage(`pin-${kind}`, pinImage(shape, color), { pixelRatio: PIXEL_RATIO })
  }
}

export function MapPanel({
  places,
  origin,
  radiusMiles,
  className,
  onOpen,
}: {
  places: Place[]
  origin: Origin | null
  radiusMiles: number
  className?: string
  onOpen: (p: Place) => void
}) {
  const map = useRef<MapRef>(null)
  const [loaded, setLoaded] = useState(false)
  const [refresh, setRefresh] = useState(true)
  const [selected, setSelected] = useState<Place | null>(null)
  const [hovering, setHovering] = useState(false)

  // react-map-gl's default export shadows the global Map
  const byId = useMemo(() => new globalThis.Map(places.map((p) => [p.id, p] as const)), [places])
  // a selection that the filters have since hidden should not keep its popup
  const shownSelected = selected && byId.has(selected.id) ? selected : null

  const points = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: places.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.lngLat },
        properties: { id: p.id, kind: p.kind, zoned: p.zoned.length > 0 },
      })),
    }),
    [places],
  )
  const ring = useMemo<Feature<Polygon> | null>(
    () => (origin ? circle(origin.lngLat, radiusMiles, { units: 'miles', steps: 96 }) : null),
    [origin, radiusMiles],
  )

  // frame the search circle whenever a new address is searched or the distance filter changes it
  useEffect(() => {
    if (!loaded || !ring) return
    const [w, s, e, n] = bbox(ring)
    map.current?.fitBounds([[w, s], [e, n]], { padding: 40, duration: 900 })
  }, [loaded, ring])

  const onClick = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id as string | undefined
    setSelected(id ? (byId.get(id) ?? null) : null)
  }

  return (
    <div className={cn('relative sticky top-[133px] h-[calc(100vh-133px)] self-start', className)}>
      <Map
        ref={map}
        initialViewState={{ longitude: -80.23, latitude: 25.78, zoom: 10.4 }}
        mapStyle={STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactiveLayerIds={loaded ? ['place-pins'] : []}
        cursor={hovering ? 'pointer' : undefined}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onClick}
        onLoad={(e) => {
          addPinImages(e.target)
          setLoaded(true)
        }}
      >
        {/* border is a map layer, so it stays locked to the coastline at every zoom */}
        <Source id="outside" type="geojson" data={outside}>
          <Layer id="outside-haze" type="fill" paint={{ 'fill-color': '#f4f6fa', 'fill-opacity': 0.4 }} />
        </Source>
        <Source id="county" type="geojson" data={countyShape}>
          <Layer
            id="county-border"
            type="line"
            layout={{ 'line-join': 'round' }}
            paint={{
              'line-color': '#113375',
              'line-opacity': 0.75,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.75, 12, 1.25, 15, 2],
            }}
          />
        </Source>
        {ring && (
          <Source id="search-radius" type="geojson" data={ring}>
            <Layer id="search-radius-fill" type="fill" paint={{ 'fill-color': '#C3D8FF', 'fill-opacity': 0.18 }} />
            <Layer id="search-radius-line" type="line" paint={{ 'line-color': '#2256BB', 'line-width': 1.5, 'line-dasharray': [3, 2] }} />
          </Source>
        )}
        {loaded && (
          <Source id="places" type="geojson" data={points}>
            {/* zoned schools get the marigold halo, the selected pin a dark ring */}
            <Layer
              id="place-zoned-halo"
              type="circle"
              filter={['==', ['get', 'zoned'], true]}
              paint={{ 'circle-radius': 12, 'circle-color': ZONED, 'circle-stroke-color': SELECTED_RING, 'circle-stroke-width': 1 }}
            />
            <Layer
              id="place-selected-ring"
              type="circle"
              filter={['==', ['get', 'id'], shownSelected?.id ?? '']}
              paint={{ 'circle-radius': 13, 'circle-opacity': 0, 'circle-stroke-color': SELECTED_RING, 'circle-stroke-width': 2.5 }}
            />
            <Layer
              id="place-pins"
              type="symbol"
              layout={{
                'icon-image': ['concat', 'pin-', ['get', 'kind']],
                'icon-size': ['case', ['==', ['get', 'id'], shownSelected?.id ?? ''], 1.35, ['get', 'zoned'], 1.2, 1],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                // zoned schools draw on top of their neighbors
                'symbol-sort-key': ['case', ['get', 'zoned'], 1, 0],
              }}
            />
          </Source>
        )}
        {origin && (
          <Marker longitude={origin.lngLat[0]} latitude={origin.lngLat[1]} anchor="bottom">
            <span className="flex flex-col items-center" aria-label={`Searched address: ${origin.formattedAddress ?? ''}`}>
              <span className="grid size-9 place-items-center rounded-full border-2 border-white bg-ink text-white shadow-md">
                <Home className="size-4" />
              </span>
              <span className="-mt-1 size-2.5 rotate-45 bg-ink" />
            </span>
          </Marker>
        )}
        <NavigationControl showCompass={false} position="bottom-right" />
        {shownSelected && (
          <PlacePopup key={shownSelected.id} place={shownSelected} onClose={() => setSelected(null)} onOpen={onOpen} />
        )}
      </Map>

      <button className="absolute left-5 top-5 flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium shadow-sm">
        <MapPin className="size-4 text-brand" /> Points of interest
      </button>

      <Legend />

      <label className="absolute bottom-8 left-5 flex cursor-pointer items-center gap-3 rounded-md border border-line bg-white px-4 py-3 text-base font-medium shadow-md">
        <span
          className={cn(
            'grid size-5 place-items-center rounded-sm border',
            refresh ? 'border-brand bg-brand text-white' : 'border-neutral-400 bg-white',
          )}
        >
          {refresh && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <input type="checkbox" className="sr-only" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} />
        Refresh as I move map
      </label>
    </div>
  )
}

const SHAPE_CLASS: Record<Shape, string> = {
  circle: 'rounded-full',
  square: 'rounded-[1px]',
  diamond: 'rotate-45 scale-[0.8] rounded-[1px]',
  triangle: '[clip-path:polygon(50%_5%,100%_95%,0_95%)]',
  hexagon: '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]',
}

function Legend() {
  return (
    <ul className="absolute right-5 top-5 space-y-1.5 rounded-md border border-line bg-white px-3 py-2.5 text-[13px] shadow-sm">
      {Object.entries(KIND_STYLE).map(([kind, { color, shape }]) => (
        <li key={kind} className="flex items-center gap-2">
          <span className={cn('block size-3', SHAPE_CLASS[shape])} style={{ backgroundColor: color }} />
          {kind}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="block size-3 rounded-full" style={{ backgroundColor: ZONED }} />
        Your zoned school
      </li>
    </ul>
  )
}
