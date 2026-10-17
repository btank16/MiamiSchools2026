import { useEffect, useState } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import {
  BadgeCheck, BookOpen, Bus, CalendarCheck, ChevronLeft, Clock, Dumbbell, GraduationCap, Heart, Languages,
  Laptop, LayoutGrid, MapPin, Palette, Share, ShieldCheck, Star, Users, Utensils, Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isStreetView, photoUrl, usePhotoNames } from '@/lib/photos'
import { STYLE } from './MapPanel'
import type { Place } from './data'

// everything below the photos is placeholder copy; swap for real data when it is wired
const highlights = [
  { icon: MapPin, title: 'Assigned zone school', text: 'Check if your address is zoned for this campus.' },
  { icon: CalendarCheck, title: 'Tours available', text: 'Book a visit with the front office before applying.' },
  { icon: Users, title: 'Small class sizes', text: 'Teachers know every student by name.' },
]

const offers = [
  { icon: Utensils, label: 'Free and reduced lunch' },
  { icon: Bus, label: 'Bus transportation' },
  { icon: BookOpen, label: 'Media center' },
  { icon: Dumbbell, label: 'Athletics' },
  { icon: Palette, label: 'Arts program' },
  { icon: Languages, label: 'Dual language' },
  { icon: Wifi, label: 'Campus Wi-Fi' },
  { icon: ShieldCheck, label: 'Secure entry' },
  { icon: Laptop, label: 'Student devices' },
]

const scores = ['Teachers', 'Academics', 'Safety', 'Facilities', 'Communication', 'Value']

const reviews = [
  { name: 'Maria', when: 'September 2026', text: 'Warm staff and a calm drop-off line. My daughter looks forward to going every morning.' },
  { name: 'Daniel', when: 'August 2026', text: 'Great after-care and the teachers answer messages fast. Parking is tight at pickup.' },
  { name: 'Carolina', when: 'June 2026', text: 'The dual language program made a real difference for our son in just one year.' },
  { name: 'James', when: 'May 2026', text: 'Clean campus, friendly front office, and a clear enrollment process.' },
]

function Divider() {
  return <hr className="my-8 border-line" />
}

// the gradient is the fallback: shown while the photo loads, when a school has fewer than five, or on error
function Tile({ place, offset, name, width, className }: { place: Place; offset: number; name?: string; width: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundImage: `linear-gradient(${135 + offset * 30}deg, oklch(0.8 0.08 ${place.hue + offset * 18}), oklch(0.52 0.12 ${place.hue + 40 + offset * 18}))` }}
    >
      {name && !failed && (
        <img
          src={photoUrl(name, width)}
          alt={`${place.name}, photo ${offset + 1}`}
          loading={offset === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {name && !failed && isStreetView(name) && (
        <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">Street View</span>
      )}
    </div>
  )
}

function PhotoGrid({ place }: { place: Place }) {
  const names = usePhotoNames(place)
  return (
    <div className="relative grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-xl md:h-[440px] md:grid-cols-4 md:grid-rows-2">
      <Tile place={place} offset={0} name={names[0]} width={960} className="md:col-span-2 md:row-span-2" />
      {[1, 2, 3, 4].map((n) => (
        <Tile key={n} place={place} offset={n} name={names[n]} width={480} className="max-md:hidden" />
      ))}
      <button className="absolute bottom-4 right-4 flex h-9 items-center gap-2 rounded-lg border border-ink bg-white px-3 text-sm font-medium shadow-sm hover:bg-neutral-50">
        <LayoutGrid className="size-4" /> Show all photos
      </button>
    </div>
  )
}

function BookingCard({ place }: { place: Place }) {
  const free = place.cost === 'Free'
  return (
    <aside className="sticky top-[94px] space-y-4">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_6px_20px_rgb(0,0,0,0.1)]">
        <p className="text-sm text-neutral-600">{free ? 'Tuition' : 'Starting at'}</p>
        <p className="text-2xl font-semibold">{place.cost}</p>
        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-400 text-xs">
          <div className="border-b border-r border-neutral-400 p-3">
            <p className="font-bold uppercase">Tour date</p>
            <p className="mt-0.5 text-sm text-neutral-600">Add date</p>
          </div>
          <div className="border-b border-neutral-400 p-3">
            <p className="font-bold uppercase">Grade</p>
            <p className="mt-0.5 text-sm text-neutral-600">{place.grades}</p>
          </div>
          <div className="col-span-2 p-3">
            <p className="font-bold uppercase">Students</p>
            <p className="mt-0.5 text-sm text-neutral-600">1 student</p>
          </div>
        </div>
        <button className="mt-4 h-12 w-full rounded-lg bg-brand text-base font-semibold text-white hover:brightness-95">
          Check availability
        </button>
        <p className="mt-3 text-center text-sm text-neutral-600">You won't be charged yet</p>
        <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
          <div className="flex justify-between"><span className="underline">Tuition</span><span>{place.cost}</span></div>
          <div className="flex justify-between"><span className="underline">Registration fee</span><span>$0</span></div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-5 text-sm shadow-sm">
        <BadgeCheck className="size-7 shrink-0 text-brand" />
        <p><span className="font-semibold">Save to compare.</span> <span className="text-neutral-600">Keep this school on your shortlist.</span></p>
      </div>
    </aside>
  )
}

export function SchoolPage({ place, onBack }: { place: Place; onBack: () => void }) {
  const [liked, setLiked] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [place.id])
  const stars = ((place.rating ?? 9) / 2).toFixed(2) // data is on a 10 scale, page on 5
  const amenities = [...place.tags.map((t) => ({ icon: GraduationCap, label: t })), ...offers].slice(0, 10)
  return (
    <article className="mx-auto max-w-[1120px] px-6 pb-16 pt-6">
      <button
        aria-label="Back to results"
        onClick={onBack}
        className="mb-4 flex h-9 items-center gap-1 rounded-full border border-line bg-white pl-2 pr-4 text-sm font-medium hover:bg-neutral-50"
      >
        <ChevronLeft className="size-4" /> Back to results
      </button>

      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[26px] font-semibold leading-tight">{place.name}</h1>
        <div className="flex shrink-0 items-center gap-4 text-sm font-medium">
          <button className="flex items-center gap-2 underline"><Share className="size-4" /> Share</button>
          <button aria-pressed={liked} onClick={() => setLiked(!liked)} className="flex items-center gap-2 underline">
            <Heart className={cn('size-4', liked && 'fill-brand text-brand')} /> Save
          </button>
        </div>
      </div>

      <PhotoGrid place={place} />

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold">{/^(Public|Private|Charter)$/.test(place.kind) ? `${place.kind} school` : place.kind} in Miami, Florida</h2>
          <p className="mt-1 text-neutral-600">{place.grades} · 640 students · 18:1 student-teacher ratio</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
            <Star className="size-3.5 fill-ink" />
            {stars} · 121 reviews
            {place.verified && (
              <span className="flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            )}
          </p>
          <p className="mt-5 leading-relaxed">
            A welcoming campus with a strong sense of community. {place.name} serves {place.grades} families with {place.tags.join(', ')}, and
            is a short drive from downtown Miami.
          </p>

          <Divider />
          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-0.5 size-6 shrink-0 text-ink" />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-neutral-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <Divider />
          <h2 className="mb-5 text-[22px] font-semibold">What this school offers</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {amenities.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-4">
                <Icon className="size-6 shrink-0" /> {label}
              </li>
            ))}
          </ul>
          <button className="mt-6 h-12 rounded-lg border border-ink px-6 font-semibold hover:bg-neutral-50">Show all amenities</button>

          <Divider />
          <h2 className="mb-1 text-[22px] font-semibold">Where you'll be</h2>
          <p className="mb-5 text-neutral-600">{place.address}</p>
          <div className="h-[380px] overflow-hidden rounded-xl border border-line">
            <Map
              initialViewState={{ longitude: place.lngLat[0], latitude: place.lngLat[1], zoom: 13.5 }}
              mapStyle={STYLE}
              style={{ width: '100%', height: '100%' }}
              attributionControl={false}
              scrollZoom={false}
            >
              <Marker longitude={place.lngLat[0]} latitude={place.lngLat[1]}>
                <span className="grid size-12 place-items-center rounded-full bg-brand/20">
                  <span className="grid size-8 place-items-center rounded-full bg-brand text-white shadow">
                    <GraduationCap className="size-4" />
                  </span>
                </span>
              </Marker>
            </Map>
          </div>

          <Divider />
          <h2 className="mb-6 flex items-center gap-2 text-[22px] font-semibold">
            <Star className="size-5 fill-ink" /> {stars} · 121 reviews
          </h2>
          <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
            {scores.map((s, i) => (
              <div key={s} className="flex items-center justify-between gap-4 text-sm">
                <span>{s}</span>
                <span className="flex items-center gap-3">
                  <span className="h-1 w-24 overflow-hidden rounded-full bg-line">
                    <span className="block h-full bg-ink" style={{ width: `${88 - i * 3}%` }} />
                  </span>
                  <span className="w-7 font-medium">{(4.9 - i * 0.1).toFixed(1)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {reviews.map((r) => (
              <figure key={r.name}>
                <figcaption className="mb-2 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-deep font-semibold text-white">{r.name[0]}</span>
                  <span>
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-sm text-neutral-600">{r.when}</span>
                  </span>
                </figcaption>
                <blockquote className="text-sm leading-relaxed">{r.text}</blockquote>
              </figure>
            ))}
          </div>
          <button className="mt-8 h-12 rounded-lg border border-ink px-6 font-semibold hover:bg-neutral-50">Show all 121 reviews</button>

          <Divider />
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-deep text-white"><GraduationCap className="size-7" /></span>
            <div>
              <h2 className="text-[22px] font-semibold">Meet the front office</h2>
              <p className="text-sm text-neutral-600">Principal and staff · Responds within a day</p>
            </div>
          </div>
          <button className="mt-5 h-12 rounded-lg bg-deep px-6 font-semibold text-white hover:bg-deep/90">Contact the school</button>

          <Divider />
          <h2 className="mb-6 text-[22px] font-semibold">Things to know</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Clock, title: 'School hours', lines: ['Mon–Fri', '7:45 AM – 2:45 PM', 'After-care until 6 PM'] },
              { icon: ShieldCheck, title: 'Safety', lines: ['Secure entry', 'Visitor check-in', 'Campus monitors'] },
              { icon: CalendarCheck, title: 'Enrollment', lines: ['Applications open in January', 'Zone and choice seats', 'Tours by appointment'] },
            ].map(({ icon: Icon, title, lines }) => (
              <div key={title}>
                <Icon className="mb-3 size-6" />
                <h3 className="mb-2 font-semibold">{title}</h3>
                <ul className="space-y-1 text-sm text-neutral-600">
                  {lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <BookingCard place={place} />
      </div>
    </article>
  )
}
