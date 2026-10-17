import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import { setWorkerUrl, type CircleLayerSpecification, type ExpressionSpecification, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Check, Group, Home, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Origin, Place } from './data'
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

const ZONED = '#F7BE2B' // marigold is reserved for "your zoned school" (colors.md)
const INK = '#0A0F1C'
const DOT = '#2256BB'
// cluster bubbles are one flat color that starts dark and lightens with zoom until it matches the single dots
const CLUSTER_FILL: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 9, '#0B2354', 14, DOT]
const CLUSTER_RADIUS: ExpressionSpecification = ['step', ['get', 'point_count'], 14, 10, 17, 50, 21, 200, 26]

// One small dot per place, drawn by the map itself. By default every place shows on its own; the
// "Group nearby" switch merges close dots into a numbered circle that splits as you zoom in.
const CLUSTER_MAX_ZOOM = 13

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
  const [grouped, setGrouped] = useState(false)

  // react-map-gl's default export shadows the global Map
  const byId = useMemo(() => new globalThis.Map(places.map((p) => [p.id, p] as const)), [places])
  // a selection that the filters have since hidden should not keep its popup
  const shownSelected = selected && byId.has(selected.id) ? selected : null

  const toPoints = (list: Place[]): FeatureCollection<Point> => ({
    type: 'FeatureCollection',
    features: list.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.lngLat },
      properties: { id: p.id },
    })),
  })
  const points = useMemo(() => toPoints(places.filter((p) => !p.zoned.length)), [places])
  const zonedPoints = useMemo(() => toPoints(places.filter((p) => p.zoned.length > 0)), [places])
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

  const sel: ExpressionSpecification = ['==', ['get', 'id'], shownSelected?.id ?? '']

  // the same circle in both modes (grouped and every-place-on-its-own), so only the source differs
  const dotShadow: CircleLayerSpecification['paint'] = {
    'circle-color': INK,
    'circle-opacity': 0.28,
    'circle-blur': 0.8,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 13, 7.5, 16, 10],
    'circle-translate': [0, 1.5],
  }
  const dotHalo: CircleLayerSpecification['paint'] = { 'circle-color': DOT, 'circle-opacity': 0.2, 'circle-radius': 17 }
  const dotPaint: CircleLayerSpecification['paint'] = {
    'circle-color': ['case', sel, INK, DOT],
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      9, ['case', sel, 7, 4],
      13, ['case', sel, 9, 6],
      16, ['case', sel, 11, 8],
    ],
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 2.5],
  }
  const showGrouped = { visibility: grouped ? 'visible' : 'none' } as const
  const showFlat = { visibility: grouped ? 'none' : 'visible' } as const

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (feature?.properties?.cluster) {
      // a numbered circle zooms in to where it splits
      const source = map.current?.getSource('places') as GeoJSONSource | undefined
      source?.getClusterExpansionZoom(feature.properties.cluster_id).then((zoom) => {
        map.current?.easeTo({ center: (feature.geometry as Point).coordinates as [number, number], zoom, duration: 500 })
      })
      return
    }
    const id = feature?.properties?.id as string | undefined
    setSelected(id ? (byId.get(id) ?? null) : null)
  }

  return (
    <div className={cn('relative sticky top-[var(--header-h,133px)] h-[calc(100vh-var(--header-h,133px))] self-start', className)}>
      <Map
        ref={map}
        initialViewState={{ longitude: -80.23, latitude: 25.78, zoom: 10.4 }}
        mapStyle={STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactiveLayerIds={loaded ? (grouped ? ['place-clusters', 'place-dots', 'place-zoned'] : ['place-single', 'place-zoned']) : []}
        cursor={hovering ? 'pointer' : undefined}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onClick}
        onLoad={() => setLoaded(true)}
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
          <>
            {/* clustering is fixed when a source is created, so each mode has its own source and the switch shows one */}
            <Source id="places" type="geojson" data={points} cluster clusterRadius={44} clusterMaxZoom={CLUSTER_MAX_ZOOM}>
              <Layer
                id="place-clusters"
                type="circle"
                layout={{ visibility: grouped ? 'visible' : 'none' }}
                filter={['has', 'point_count']}
                paint={{
                  'circle-color': CLUSTER_FILL,
                  'circle-radius': CLUSTER_RADIUS,
                }}
              />
              <Layer
                id="place-cluster-count"
                type="symbol"
                filter={['has', 'point_count']}
                layout={{
                  visibility: grouped ? 'visible' : 'none',
                  'text-field': ['get', 'point_count_abbreviated'],
                  'text-font': ['Noto Sans Bold'],
                  'text-size': 13,
                  'text-allow-overlap': true,
                }}
                paint={{ 'text-color': '#ffffff' }}
              />
              {/* soft drop shadow lifts each dot off the basemap */}
              <Layer id="place-dot-shadow" type="circle" layout={showGrouped} filter={['!', ['has', 'point_count']]} paint={dotShadow} />
              {/* the selected place gets a soft halo */}
              <Layer id="place-selected-halo" type="circle" layout={showGrouped} filter={['==', ['get', 'id'], shownSelected?.id ?? '']} paint={dotHalo} />
              <Layer id="place-dots" type="circle" layout={showGrouped} filter={['!', ['has', 'point_count']]} paint={dotPaint} />
            </Source>
            {/* default: every place on its own, no grouping */}
            <Source id="places-flat" type="geojson" data={points}>
              <Layer id="place-flat-shadow" type="circle" layout={showFlat} paint={dotShadow} />
              <Layer id="place-flat-halo" type="circle" layout={showFlat} filter={['==', ['get', 'id'], shownSelected?.id ?? '']} paint={dotHalo} />
              <Layer id="place-single" type="circle" layout={showFlat} paint={dotPaint} />
            </Source>
            {/* the zoned school never clusters and always sits on top */}
            <Source id="zoned" type="geojson" data={zonedPoints}>
              <Layer
                id="place-zoned-shadow"
                type="circle"
                paint={{ 'circle-color': INK, 'circle-opacity': 0.3, 'circle-blur': 0.8, 'circle-radius': 12, 'circle-translate': [0, 1.5] }}
              />
              <Layer
                id="place-zoned"
                type="circle"
                paint={{
                  'circle-color': ZONED,
                  'circle-radius': ['case', ['==', ['get', 'id'], shownSelected?.id ?? ''], 11, 9],
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2.5,
                }}
              />
            </Source>
          </>
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

      {!shownSelected && <>
      <button className="absolute left-5 top-5 flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium shadow-sm">
        <MapPin className="size-4 text-brand" /> Points of interest
      </button>

      <button
        aria-pressed={grouped}
        onClick={() => setGrouped(!grouped)}
        title="Merge nearby schools into numbered circles"
        className={cn(
          'absolute right-5 top-5 flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium shadow-sm',
          // on matches the List / Split / Map switch: solid deep + white
          grouped ? 'border-deep bg-deep text-white hover:bg-deep/90' : 'border-line text-ink hover:bg-muted',
        )}
      >
        <Group className="size-4" /> Group nearby
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
      </>}
    </div>
  )
}
