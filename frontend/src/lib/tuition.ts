import raw from '@/data/tuition.json'
import type { PlaceType } from '@/components/clone/filters'

// Private school tuition from school-data/schools.csv (school-data/build_tuition_json.py builds the file),
// keyed by the county's private-school id: the number in the directory's `prv-<id>` and the `id`
// /address/report returns. "estimate" rows are category medians, not published prices.
export type TuitionSource = 'official' | 'third_party' | 'estimate' | 'free'
export type Tuition = { low: number; high: number; year: string | null; source: TuitionSource; url: string | null }

type Row = { name: string; low: number; high: number; year?: string; source: TuitionSource; url?: string; hidden?: boolean }

const rows = raw as Record<string, Row>
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// exact-name fallback for when the id is missing or no longer matches; names two schools share are left out
const byName = new Map<string, Row | null>()
for (const row of Object.values(rows)) {
  const key = squash(row.name)
  byName.set(key, byName.has(key) ? null : row)
}

// the id is checked against the name in case the county ever renumbers its layer
function rowFor(countyId: string | null, name: string): Row | undefined {
  const row = countyId ? rows[countyId] : undefined
  if (row && squash(row.name) === squash(name)) return row
  return byName.get(squash(name)) ?? undefined
}

const FREE: Tuition = { low: 0, high: 0, year: null, source: 'free', url: null }

// public, charter and Head Start are free; childcare has no tuition data yet
export function tuitionFor(kind: PlaceType, countyId: string | null, name: string): Tuition | null {
  if (kind === 'Public' || kind === 'Charter' || kind === 'Head Start') return FREE
  if (kind !== 'Private') return null
  const row = rowFor(countyId, name)
  if (!row) return null
  return { low: row.low, high: row.high, year: row.year ?? null, source: row.source, url: row.url ?? null }
}

// closed, not a school, or adults only (found while researching tuition), so the app leaves it out
export const isRetired = (countyId: string | null, name: string) => !!rowFor(countyId, name)?.hidden
