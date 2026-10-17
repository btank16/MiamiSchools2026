import type { Place } from './data'
import { getAcademics } from '@/lib/academics'
import { programsFor, programServesGrades } from '@/lib/after-school'

export const TYPES = ['Public', 'Charter', 'Private', 'Childcare', 'Head Start'] as const
export type PlaceType = (typeof TYPES)[number]

export const LEVELS = [
  { id: 'infant', label: 'Infant & toddler' },
  { id: 'prek', label: 'Pre-K' },
  { id: 'elementary', label: 'Elementary' },
  { id: 'middle', label: 'Middle' },
  { id: 'high', label: 'High' },
] as const
export type Level = (typeof LEVELS)[number]['id']

export type AfterSchoolType = 'listed' | 'care' | 'clubs'
export type AfterSchoolCost = 'free' | 'paid'
export type Filters = {
  types: PlaceType[]; levels: Level[]; grades: string[]; distance: number | null; cost: Cost | null
  afterSchool: AfterSchoolType | null; afterSchoolCost: AfterSchoolCost | null; careUntil: number | null
}
export const emptyFilters: Filters = { types: [], levels: [], grades: [], distance: null, cost: null, afterSchool: null, afterSchoolCost: null, careUntil: null }
export const hasProgramFilters = (f: Filters) => f.afterSchool != null || f.afterSchoolCost != null || f.careUntil != null

// annual tuition bands, matched on the cheapest grade's price; places with no tuition data drop out
export const COSTS = [
  { id: 'free', label: 'Free', min: 0, max: 0 },
  { id: 'under-10k', label: 'Under $10k', min: 1, max: 9_999 },
  { id: '10-20k', label: '$10k–$20k', min: 10_000, max: 19_999 },
  { id: '20-35k', label: '$20k–$35k', min: 20_000, max: 34_999 },
  { id: '35k-plus', label: '$35k+', min: 35_000, max: Infinity },
] as const
export type Cost = (typeof COSTS)[number]['id']

// Searches cover 5 mi around the address (the most the county data allows), so options stop there.
// 1 mi walkable, 2 mi bike or short drive, 3 mi a few neighborhoods, 5 mi the whole search.
export const DISTANCES = [1, 2, 3, 5] as const

export function milesBetween([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(a))
}

// grades each level contains (infant & toddler has none)
const LEVEL_GRADES: Record<Level, string[]> = {
  infant: [],
  prek: ['PK'],
  elementary: ['K', '1', '2', '3', '4', '5'],
  middle: ['6', '7', '8'],
  high: ['9', '10', '11', '12'],
}
const ALL_GRADES = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// grades you can pick: only those inside the chosen levels (all of them when no level is chosen)
export function gradeOptions(levels: Level[]): { id: string; label: string }[] {
  const ids = levels.length ? ALL_GRADES.filter((g) => levels.some((l) => LEVEL_GRADES[l].includes(g))) : ALL_GRADES
  return ids.map((id) => ({ id, label: id === 'PK' ? 'Pre-K' : id === 'K' ? 'Kindergarten' : id }))
}

// the school level a single grade belongs to
export const levelOfGrade = (g: string): Level =>
  (Object.keys(LEVEL_GRADES) as Level[]).find((l) => LEVEL_GRADES[l].includes(g)) as Level

const rank = (t: string) => (t === 'Infant' ? -2 : t === 'PK' ? -1 : t === 'K' ? 0 : Number(t))

function gradeRange(grades: string): [number, number] {
  const [a, b = a] = grades.split(/[–-]/)
  return [rank(a), rank(b)]
}

// "PK–8", "K–8", "Infant–PK", "9–12" -> the levels that range touches
export function levelsOf(grades: string | null): Level[] {
  if (!grades) return []
  const [lo, hi] = gradeRange(grades)
  const out: Level[] = []
  if (lo <= -2) out.push('infant')
  if (lo <= -1 && hi >= -1) out.push('prek')
  if (lo <= 5 && hi >= 0) out.push('elementary')
  if (lo <= 8 && hi >= 6) out.push('middle')
  if (hi >= 9) out.push('high')
  return out
}

// inside one filter: any of the picked values. Between filters: all must match. Nothing picked = no restriction.
export function matches(p: Place, f: Filters): boolean {
  if (f.types.length && !f.types.includes(p.kind as PlaceType)) return false
  if (f.levels.length && !levelsOf(p.grades).some((l) => f.levels.includes(l))) return false
  if (f.grades.length) {
    if (!p.grades) return false
    const [lo, hi] = gradeRange(p.grades)
    if (!f.grades.some((g) => rank(g) >= lo && rank(g) <= hi)) return false
  }
  if (f.distance != null && (p.distanceMiles == null || p.distanceMiles > f.distance)) return false
  if (f.cost) {
    const band = COSTS.find((c) => c.id === f.cost)!
    if (!p.tuition || p.tuition.low < band.min || p.tuition.low > band.max) return false
  }
  if (hasProgramFilters(f)) {
    const grades = f.grades.length ? f.grades : f.levels.length ? gradeOptions(f.levels).map(g => g.id) : []
    // All program conditions must be true for one program. A paid care program
    // plus a separate free club does not establish free care.
    const found = programsFor(p).some(program => {
      if (f.afterSchool === 'care' && program.activityType !== 'care') return false
      if (f.afterSchool === 'clubs' && program.activityType !== 'extracurricular') return false
      if (f.afterSchoolCost && program.payment_status !== f.afterSchoolCost) return false
      if (!programServesGrades(program, grades)) return false
      if (f.careUntil !== null) {
        if (program.activityType !== 'care' || !program.endTime) return false
        const [hours, minutes] = program.endTime.split(':').map(Number)
        if (hours * 60 + minutes < f.careUntil * 60) return false
      }
      return true
    })
    if (!found) return false
  }
  return true
}

export const isFiltering = (f: Filters) =>
  f.types.length + f.levels.length + f.grades.length > 0 || f.distance != null || f.cost != null || hasProgramFilters(f)

export const SORTS = [
  { id: 'default', label: 'Default' },
  { id: 'distance', label: 'Distance' },
  { id: 'rating', label: 'Rating' },
  { id: 'math', label: 'Math achievement' },
  { id: 'english', label: 'English / ELA achievement' },
  { id: 'price', label: 'Tuition (low to high)' },
  { id: 'name', label: 'Name (A–Z)' },
] as const
export type Sort = (typeof SORTS)[number]['id']

const BAND_RANK: Record<string, number> = { 'Above average': 0, Average: 1, 'Below average': 2 }

// reorders a copy; "default" keeps the order the data came in (nearest first once an address is searched)
export function sortPlaces(places: Place[], sort: Sort): Place[] {
  if (sort === 'default') return places
  const byName = (a: Place, b: Place) => a.name.localeCompare(b.name)
  const key: Record<Exclude<Sort, 'default'>, (a: Place, b: Place) => number> = {
    distance: (a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity) || byName(a, b),
    // places GreatSchools has not rated go last
    rating: (a, b) => (BAND_RANK[a.ratingBand ?? ''] ?? 3) - (BAND_RANK[b.ratingBand ?? ''] ?? 3) || byName(a, b),
    math: (a, b) => (getAcademics(b)?.math ?? -1) - (getAcademics(a)?.math ?? -1) || byName(a, b),
    english: (a, b) => (getAcademics(b)?.english ?? -1) - (getAcademics(a)?.english ?? -1) || byName(a, b),
    // places without tuition data go last
    price: (a, b) => (a.tuition?.low ?? Infinity) - (b.tuition?.low ?? Infinity) || byName(a, b),
    name: byName,
  }
  return [...places].sort(key[sort])
}
