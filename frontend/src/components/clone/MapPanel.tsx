import { useMemo, useState } from 'react'
import Map, { Layer, NavigationControl, Source, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Check, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Place } from './data'
import { PlacePopup } from './PlacePopup'
import county from '@/assets/miami-dade-county.json'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { mask } from '@turf/turf'

// in a production bundle maplibre cannot find its worker next to itself, so point it at the bundled one
if (import.meta.env.PROD) setWorkerUrl(workerUrl)

// keyless basemap for the clone phase; the Mapbox token path comes later
export const STYLE ='https://tiles.openfreemap.org/styles/liberty'

const countyShape = county as unknown as FeatureCollection<Polygon | MultiPolygon>
// world-sized polygon with the county cut out, so only the outside gets the haze
const outside = mask(countyShape.features[0])

export function MapPanel({ places, className, onOpen }: { places: Place[]; className?: string; onOpen: (p: Place) => void }) {
  const [refresh, setRefresh] = useState(true)
  const [selected, setSelected] = useState<Place | null>(null)
  const [hover, setHover] = useState(false)
  const points = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: places.map((p) => ({
        type: 'Feature' as const,
        properties: { id: p.id },
        geometry: { type: 'Point' as const, coordinates: p.lngLat },
      })),
    }),
    [places],
  )
  // a click on a dot selects its place; a click on empty ground closes the popup
  const pick = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id
    setSelected(places.find((p) => p.id === id) ?? null)
  }
  return (
    <div className={cn('relative sticky top-[133px] h-[calc(100vh-133px)] self-start', className)}>
      <Map
        initialViewState={{ longitude: -80.23, latitude: 25.78, zoom: 10.4 }}
        mapStyle={STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactiveLayerIds={['school-dots']}
        cursor={hover ? 'pointer' : ''}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={pick}
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
        <NavigationControl showCompass={false} position="bottom-right" />
        {/* one GPU layer for every place; thousands of DOM markers would make the map crawl */}
        <Source id="schools" type="geojson" data={points}>
          <Layer
            id="school-dots"
            type="circle"
            paint={{
              'circle-color': '#022c3b',
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 13, 6],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            }}
          />
          <Layer
            id="school-selected"
            type="circle"
            filter={['==', ['get', 'id'], selected?.id ?? '']}
            paint={{ 'circle-color': '#2256bb', 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }}
          />
        </Source>
        {selected && <PlacePopup key={selected.id} place={selected} onClose={() => setSelected(null)} onOpen={onOpen} />}
      </Map>

      <button className="absolute left-5 top-5 flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium shadow-sm">
        <MapPin className="size-4 text-brand" /> Points of interest
      </button>

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
