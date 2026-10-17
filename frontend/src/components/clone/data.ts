import type { Address, AddressReport, NearbySchools, School } from '@/lib/api'
import { milesBetween, type PlaceType } from './filters'

export type ZoneLevel = 'elementary' | 'middle' | 'high'

// One raw record per source, kept whole so the school page can show everything each one returned.
export type Sources = {
  greatSchools?: School
  county?: { dataset: string; record: object }
}

export type Place = {
  id: string
  name: string
  address: string
  kind: PlaceType
  grades: string | null // "PK–5", "K–12", "Infant–PK"
  lngLat: [number, number]
  distanceMiles: number // from the searched address
  zoned: ZoneLevel[] // attendance zones this school serves for the searched address
  ratingBand: string | null // GreatSchools: "Above average", "Average", "Below average"
  summary: string | null
  phone: string | null
  email: string | null
  website: string | null
  greatSchoolsUrl: string | null
  enrollment: number | null
  capacity: number | null
  hue: number // drives the placeholder photo gradient
  sources: Sources
}

// A searched address with the coordinates the school lookups ran against.
export type Origin = Address & { lat: number; lon: number; lngLat: [number, number] }

// How many of each kind the APIs found within the radius vs how many came back (each caps at 50).
export type Coverage = { label: string; shown: number; total: number }[]

type CountyAddress = { street: string | null; city: string | null; zip: string | null }
type Located = { lat: number; lon: number }

// Builds the result list: every GreatSchools school and every county record, with the two
// merged where they describe the same school.
export function buildPlaces(origin: Origin, gs: NearbySchools | null, report: AddressReport | null): Place[] {
  const county: Place[] = []
  const byCountyId = new Map<string, Place>()
  const addCounty = (place: Place, countyId?: string) => {
    if (countyId) {
      if (byCountyId.has(countyId)) return
      byCountyId.set(countyId, place)
    }
    county.push(place)
  }

  if (report) {
    const zones = report.zonedSchools
    for (const level of ['elementary', 'middle', 'high'] as const) {
      for (const s of zones[level]) {
        const existing = byCountyId.get(`public:${s.id}`)
        if (existing) existing.zoned.push(level)
        else if (s.lat != null && s.lon != null) {
          addCounty({ ...fromCounty(origin, s as typeof s & Located, 'Public', 'Zoned public schools', s.grades), zoned: [level] }, `public:${s.id}`)
        }
      }
    }
    for (const s of report.nearby.publicSchools.items) {
      if (s.lat == null || s.lon == null) continue
      addCounty(fromCounty(origin, s as typeof s & Located, 'Public', 'Public school sites', s.grades), `public:${s.id}`)
    }
    for (const s of report.nearby.charterSchools.items) {
      addCounty(fromCounty(origin, s, 'Charter', 'Charter schools', s.grades), `charter:${s.id}`)
    }
    for (const s of report.nearby.privateSchools.items) addCounty(fromCounty(origin, s, 'Private', 'Private schools', s.grades))
    // the county has no ages for these; both serve children under five
    for (const s of report.nearby.daycares.items) addCounty(fromCounty(origin, s, 'Childcare', 'Licensed daycares', 'Infant–PK'))
    for (const s of report.nearby.headStarts.items) addCounty(fromCounty(origin, s, 'Head Start', 'Head Start centers', 'Infant–PK'))
  }

  const merged = new Set<Place>()
  const places: Place[] = []
  for (const school of gs?.schools ?? []) {
    if (school.lat == null || school.lon == null) continue
    const match = sameByStateId(school, byCountyId) ?? sameByName(school, county, merged)
    if (match && !merged.has(match)) {
      merged.add(match)
      places.push(withGreatSchools(match, school))
    } else {
      places.push(fromGreatSchools(origin, school as School & Located))
    }
  }
  places.push(...county.filter((p) => !merged.has(p)))
  return places.sort((a, b) => a.distanceMiles - b.distanceMiles)
}

export function coverageOf(gs: NearbySchools | null, report: AddressReport | null): Coverage {
  const rows: Coverage = []
  if (gs) rows.push({ label: 'GreatSchools schools', shown: gs.schools.length, total: gs.total })
  if (report) {
    const n = report.nearby
    rows.push(
      { label: 'County public schools', shown: n.publicSchools.items.length, total: n.publicSchools.total },
      { label: 'County charter schools', shown: n.charterSchools.items.length, total: n.charterSchools.total },
      { label: 'County private schools', shown: n.privateSchools.items.length, total: n.privateSchools.total },
      { label: 'Licensed daycares', shown: n.daycares.items.length, total: n.daycares.total },
      { label: 'Head Start centers', shown: n.headStarts.items.length, total: n.headStarts.total },
      { label: 'School-based clinics', shown: n.clinics.items.length, total: n.clinics.total },
    )
  }
  return rows
}

// GreatSchools' Florida state id is the district number (13 = Miami-Dade) plus the county's
// 4-digit location id, e.g. 137001 <-> 7001. Private schools have no state id.
function sameByStateId(school: School, byCountyId: Map<string, Place>): Place | undefined {
  const m = school.stateId?.match(/^13(\d{4})$/)
  if (!m) return undefined
  const order = school.type === 'charter' ? ['charter', 'public'] : ['public', 'charter']
  for (const dataset of order) {
    const place = byCountyId.get(`${dataset}:${m[1]}`)
    if (place) return place
  }
  return undefined
}

// Fallback for schools without a shared id: the nearest unmatched county record of a compatible
// kind within a short walk whose distinctive words agree with this one's.
const MATCH_MILES = 0.25
const MATCH_SIMILARITY = 0.6
function sameByName(school: School, county: Place[], taken: Set<Place>): Place | undefined {
  const kinds: PlaceType[] = school.type === 'private' ? ['Private'] : ['Public', 'Charter']
  const words = nameWords(school.name)
  let best: { place: Place; miles: number } | undefined
  for (const place of county) {
    if (taken.has(place) || !kinds.includes(place.kind)) continue
    const miles = milesBetween([school.lon!, school.lat!], place.lngLat)
    if (miles > MATCH_MILES || (best && miles >= best.miles)) continue
    if (similarity(words, nameWords(place.name)) >= MATCH_SIMILARITY) best = { place, miles }
  }
  return best?.place
}

// Words that say what kind of school it is rather than which school it is.
const GENERIC = new Set(
  'the of and at a an in school schools inc llc sr senior high middle elementary elem center ctr academy charter k 8 k8 prep preparatory'.split(' '),
)

function nameWords(name: string): Set<string> {
  const words = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
  return new Set(words.filter((w) => w && !GENERIC.has(w)))
}

// 1 when one name's words all appear in the other ("Key Point Academy" / "Key Point Christian Academy"),
// else the share of words in common. Campuses of a chain differ by one word ("Learning World Downtown"
// / "Learning World Venetian"), which keeps them apart.
function similarity(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  if (!small.size) return 0
  let shared = 0
  for (const w of small) if (large.has(w)) shared++
  if (shared === small.size) return 1
  return shared / (a.size + b.size - shared)
}

type CountyRecord = Located & {
  name: string
  address: CountyAddress
  phone: string | null
  email?: string | null
  website?: string | null
  enrollment?: number | null
  capacity?: number | null
}

function fromCounty(origin: Origin, r: CountyRecord, kind: PlaceType, dataset: string, grades: string | null): Place {
  const id = 'id' in r && r.id ? `county:${kind}:${r.id}` : `county:${kind}:${r.name}:${r.lat},${r.lon}`
  return {
    id,
    name: r.name,
    address: formatAddress(r.address),
    kind,
    grades: normalizeGrades(grades),
    lngLat: [r.lon, r.lat],
    distanceMiles: milesBetween(origin.lngLat, [r.lon, r.lat]),
    zoned: [],
    ratingBand: null,
    summary: null,
    phone: r.phone,
    email: r.email ?? null,
    website: r.website ?? null,
    greatSchoolsUrl: null,
    // county layers use 0 for "not reported"
    enrollment: r.enrollment || null,
    capacity: r.capacity ?? null,
    hue: hueOf(id),
    sources: { county: { dataset, record: r } },
  }
}

const KIND_OF: Record<School['type'], PlaceType> = { public: 'Public', charter: 'Charter', private: 'Private' }

function fromGreatSchools(origin: Origin, s: School & Located): Place {
  const id = `gs:${s.universalId}`
  return {
    id,
    name: s.name,
    address: [s.street, s.city, [s.state, s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    kind: KIND_OF[s.type] ?? 'Public',
    grades: gradesFromList(s.grades),
    lngLat: [s.lon, s.lat],
    distanceMiles: milesBetween(origin.lngLat, [s.lon, s.lat]),
    zoned: [],
    ratingBand: s.ratingBand,
    summary: s.summary,
    phone: s.phone,
    email: null,
    website: s.website,
    greatSchoolsUrl: s.greatSchoolsUrl,
    enrollment: null,
    capacity: null,
    hue: hueOf(id),
    sources: { greatSchools: s },
  }
}

// The county record wins on names, location and enrollment (the district's own data);
// GreatSchools adds its rating, summary and whatever the county left blank.
function withGreatSchools(place: Place, s: School): Place {
  return {
    ...place,
    grades: place.grades ?? gradesFromList(s.grades),
    ratingBand: s.ratingBand,
    summary: s.summary,
    phone: place.phone ?? s.phone,
    website: place.website ?? s.website,
    greatSchoolsUrl: s.greatSchoolsUrl,
    sources: { ...place.sources, greatSchools: s },
  }
}

function formatAddress(a: CountyAddress): string {
  return [a.street, a.city, ['FL', a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

// Grade tokens across both sources: PK, PreK, TK (transitional K), NS (nursery), KG, K, 01-12.
function gradeToken(raw: string): string | null {
  const t = raw.trim().toUpperCase()
  if (t === 'NS') return 'Infant'
  if (t === 'INFANT') return 'Infant'
  if (t === 'PK' || t === 'PREK' || t === 'TK') return 'PK'
  if (t === 'K' || t === 'KG') return 'K'
  const n = Number(t)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? String(n) : null
}

const gradeRank = (g: string) => (g === 'Infant' ? -2 : g === 'PK' ? -1 : g === 'K' ? 0 : Number(g))

// Lowest to highest grade as "PK–5"; tolerates reversed ranges like the county's "05-K".
function gradeSpan(tokens: string[]): string | null {
  const grades = tokens.map(gradeToken).filter((g): g is string => g !== null)
  if (!grades.length) return null
  grades.sort((a, b) => gradeRank(a) - gradeRank(b))
  const lo = grades[0]
  const hi = grades[grades.length - 1]
  return lo === hi ? lo : `${lo}–${hi}`
}

function normalizeGrades(grades: string | null): string | null {
  return grades ? gradeSpan(grades.split(/[–-]/)) : null
}

const gradesFromList = (grades: string[]) => gradeSpan(grades)

function hueOf(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
