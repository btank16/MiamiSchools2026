import { useState } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Check, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dots, places } from './data'

// in a production bundle maplibre cannot find its worker next to itself, so point it at the bundled one
if (import.meta.env.PROD) setWorkerUrl(workerUrl)

// keyless basemap for the clone phase; the Mapbox token path comes later
const STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function MapPanel({ className }: { className?: string }) {
  const [refresh, setRefresh] = useState(true)
  return (
    <div className={cn('relative sticky top-[133px] h-[calc(100vh-133px)] self-start', className)}>
      <Map
        initialViewState={{ longitude: -80.23, latitude: 25.78, zoom: 10.4 }}
        mapStyle={STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
      >
        <NavigationControl showCompass={false} position="bottom-right" />
        {dots.map(([lng, lat], i) => (
          <Marker key={i} longitude={lng} latitude={lat}>
            <span className="block size-3 rounded-full border border-white bg-deep" />
          </Marker>
        ))}
        {places.map((p) => (
          <Marker key={p.id} longitude={p.lngLat[0]} latitude={p.lngLat[1]}>
            <span className="rounded-sm bg-deep px-1.5 py-0.5 text-xs font-bold text-white shadow ring-1 ring-white">
              {p.cost.split('–')[0].replace('/mo', '').replace('/yr', '+')}
            </span>
          </Marker>
        ))}
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
