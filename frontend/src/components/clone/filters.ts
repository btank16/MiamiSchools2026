import type { Place } from './data'

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

export type Filters = { types: PlaceType[]; levels: Level[]; grades: string[]; distance: number | null }
export const emptyFilters: Filters = { types: [], levels: [], grades: [], distance: null }

// Miami-Dade's built-up area runs ~45 mi north to south and ~20 mi east to west, so more than 15 mi
// is a different part of the county. 1 mi walkable, 2 mi bike or short drive, 5 mi neighborhood,
// 10 mi across a few areas, 15 mi the widest anyone commutes to a school.
export const DISTANCES = [1, 2, 5, 10, 15] as const

// stand-in for the user's search location until location search exists (downtown Miami) [lng, lat]
export const ORIGIN = { name: 'downtown Miami', lngLat: [-80.1918, 25.7617] as [number, number] }

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
export function levelsOf(grades: string): Level[] {
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
    const [lo, hi] = gradeRange(p.grades)
    if (!f.grades.some((g) => rank(g) >= lo && rank(g) <= hi)) return false
  }
  if (f.distance != null && milesBetween(ORIGIN.lngLat, p.lngLat) > f.distance) return false
  return true
}

export const isFiltering = (f: Filters) => f.types.length + f.levels.length + f.grades.length > 0 || f.distance != null
