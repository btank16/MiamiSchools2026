import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dots, places } from './data'
import { SectorPin } from './SectorPin'

// in a production bundle maplibre cannot find its worker next to itself, so point it at the bundled one
if (import.meta.env.PROD) setWorkerUrl(workerUrl)

// a quiet basemap, so the pins are the loudest thing on the map
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export function MapPanel({ className }: { className?: string }) {
  return (
    <div className={cn('relative sticky top-[133px] h-[calc(100vh-133px)] self-start', className)}>
      <Map
        initialViewState={{ longitude: -80.23, latitude: 25.78, zoom: 10.4 }}
        mapStyle={STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
      >
        <NavigationControl showCompass={false} position="bottom-right" />
        {dots.map((d, i) => (
          <Marker key={i} longitude={d.lngLat[0]} latitude={d.lngLat[1]}>
            <SectorPin sector={d.sector} size={14} />
          </Marker>
        ))}
        {places.map((p) => (
          <Marker key={p.id} longitude={p.lngLat[0]} latitude={p.lngLat[1]} style={{ zIndex: p.zoned ? 2 : 1 }}>
            <SectorPin sector={p.sector} size={p.zoned ? 24 : 20} selected={p.zoned} />
          </Marker>
        ))}
      </Map>

      <button className="absolute left-5 top-5 flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
        <MapPin className="size-4 text-primary" aria-hidden="true" /> Points of interest
      </button>

      <div className="absolute bottom-8 left-5 flex items-center gap-2 rounded-md border border-border bg-white px-4 py-3 text-sm font-medium text-foreground shadow-md">
        <SectorPin sector="public" size={18} selected />
        <span>Your zoned school</span>
      </div>
    </div>
  )
}
