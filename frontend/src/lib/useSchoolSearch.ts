import { useCallback, useRef, useState } from 'react'
import { addressReport, lookupAddress, nearbySchools, type AddressReport, type NearbySchools, type PlaceSuggestion } from './api'
import { buildPlaces, coverageOf, type Coverage, type Origin, type Place } from '@/components/clone/data'

export type SearchResult = {
  origin: Origin
  places: Place[]
  report: AddressReport | null
  coverage: Coverage
  // one message per source that failed; the other source's results still show
  errors: string[]
}

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'error'; label: string; message: string }
  | ({ status: 'done' } & SearchResult)

// Address suggestion -> coordinates -> GreatSchools and Miami-Dade County in parallel -> one merged list.
export function useSchoolSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const current = useRef<AbortController | null>(null)

  const search = useCallback(async (suggestion: PlaceSuggestion, session: string) => {
    // a newer search replaces one still in flight
    current.current?.abort()
    const controller = new AbortController()
    current.current = controller
    const { signal } = controller
    const label = suggestion.text
    setState({ status: 'loading', label })

    try {
      const address = await lookupAddress(suggestion.placeId, session, signal)
      if (address.lat == null || address.lon == null) throw new Error('Google has no coordinates for that address')
      const origin: Origin = { ...address, lat: address.lat, lon: address.lon, lngLat: [address.lon, address.lat] }

      const [gs, county] = await Promise.allSettled([
        nearbySchools(origin.lat, origin.lon, signal),
        addressReport(origin.lat, origin.lon, signal),
      ])
      if (signal.aborted) return
      const schools: NearbySchools | null = gs.status === 'fulfilled' ? gs.value : null
      const report = county.status === 'fulfilled' ? county.value : null
      const errors = [
        gs.status === 'rejected' && `GreatSchools: ${messageOf(gs.reason)}`,
        county.status === 'rejected' && `Miami-Dade County: ${messageOf(county.reason)}`,
      ].filter((e): e is string => !!e)

      setState({
        status: 'done',
        origin,
        places: buildPlaces(origin, schools, report),
        report,
        coverage: coverageOf(schools, report),
        errors,
      })
    } catch (err) {
      if (signal.aborted) return
      setState({ status: 'error', label, message: messageOf(err) })
    }
  }, [])

  return [state, search] as const
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')
