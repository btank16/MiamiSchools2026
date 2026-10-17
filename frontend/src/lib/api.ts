// Client for the schools-api backend (backend/amplify/functions/schools-api/handler.ts).
// Response types come straight from the backend modules so the two cannot drift apart.
import outputs from '../../../amplify_outputs.json'
import type { Place as Address, PlaceSuggestion } from '../../../backend/amplify/functions/schools-api/googleplaces'
import type { School, SchoolList } from '../../../backend/amplify/functions/schools-api/greatschools'
import type { AddressReport } from '../../../backend/amplify/functions/schools-api/miamidade'

export type { Address, AddressReport, PlaceSuggestion, School }

// Miami-Dade's report caps its radius at 5 mi, so both sources search the same circle.
export const SEARCH_RADIUS_MILES = 5
// The most either source returns per page / category.
const PAGE_LIMIT = 50

// VITE_API_URL points at a local backend (`npm run dev` in backend/, http://localhost:3001);
// otherwise use the deployed API that Amplify writes to amplify_outputs.json.
const BASE = (import.meta.env.VITE_API_URL || outputs.custom.API['miami-schools-api'].endpoint).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function get<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE}${path}?${query}`, { signal })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status)
  return body as T
}

// `session` groups the keystrokes and the final lookup into one billed Google session.
export async function autocomplete(input: string, session: string, signal?: AbortSignal) {
  const { suggestions } = await get<{ suggestions: PlaceSuggestion[] }>('/places/autocomplete', { input, session }, signal)
  return suggestions
}

export function lookupAddress(placeId: string, session: string, signal?: AbortSignal) {
  return get<Address>(`/places/${encodeURIComponent(placeId)}`, { session }, signal)
}

export type NearbySchools = { schools: School[]; total: number }

// GreatSchools pages at 50, so fetch the first page to learn how many there are, then the rest at once.
export async function nearbySchools(lat: number, lon: number, signal?: AbortSignal): Promise<NearbySchools> {
  const params = { lat, lon, distance: SEARCH_RADIUS_MILES, type: 'public,charter,private', limit: PAGE_LIMIT }
  const first = await get<SchoolList>('/schools/nearby', { ...params, page: 0 }, signal)
  const rest = await Promise.all(
    Array.from({ length: first.pagination.maxPage }, (_, i) =>
      get<SchoolList>('/schools/nearby', { ...params, page: i + 1 }, signal),
    ),
  )
  const schools = [first, ...rest].flatMap((p) => p.schools)
  return { schools, total: first.pagination.totalCount }
}

export function addressReport(lat: number, lon: number, signal?: AbortSignal) {
  return get<AddressReport>('/address/report', { lat, lon, radius: SEARCH_RADIUS_MILES, limit: PAGE_LIMIT }, signal)
}
