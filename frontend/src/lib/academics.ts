import raw from '@/data/academics.json'
import type { Place } from '@/components/clone/data'

export type SchoolAcademics = {
  schoolNumber: string
  name: string
  schoolGrade: string | null
  math: number | null
  english: number | null
}

export const ACADEMIC_YEAR = '2025–26'
export const ACADEMIC_SOURCE_URL = 'https://www.fldoe.org/file/18534/SchoolGrades26.xlsx'
export const ACADEMIC_METHOD_URL = 'https://www.fldoe.org/file/18534/SchoolGradesCalcGuide26.pdf'

const schools: Readonly<Record<string, SchoolAcademics>> = raw.schools
const nameAliases: Readonly<Record<string, string>> = raw.verifiedNameAliases
const numberAliases: Readonly<Record<string, string>> = raw.schoolNumberAliases

function result(schoolNumber: string): SchoolAcademics | null {
  return schools[numberAliases[schoolNumber] ?? schoolNumber] ?? null
}

function schoolNumber(value: unknown): string | null {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
  return /^\d{1,4}$/.test(text) && Number(text) > 0 ? text.padStart(4, '0') : null
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

// GreatSchools' six-digit Florida identifier is district13 followed by four school digits.
// Explicit foreign, malformed or unmatched authoritative IDs must not fall through to a guess.
function stateSchoolNumber(value: string): string | null {
  return /^(?:13(\d{4})|(?:FL-)?13-(\d{4}))$/.exec(value.trim())?.slice(1).find(Boolean) ?? null
}

export function getAcademics(place: Pick<Place, 'id' | 'kind' | 'name' | 'sources'>): SchoolAcademics | null {
  if (place.kind !== 'Public' && place.kind !== 'Charter') return null
  const gs = place.sources.greatSchools
  if (gs?.type === 'private') return null
  if (hasValue(gs?.stateId)) {
    if (gs?.state && gs.state.toUpperCase() !== 'FL') return null
    const id = stateSchoolNumber(gs!.stateId!)
    return id ? result(id) : null
  }

  const county = place.sources.county?.record
  if (county && typeof county === 'object') {
    const record = county as Record<string, unknown>
    const id = record.id ?? record.ID
    if (hasValue(id)) {
      const number = schoolNumber(id)
      return number ? result(number) : null
    }
  }

  const directory = /^(?:pub|chr)-(\d{4})(?:-[a-zA-Z0-9_]+)*$/.exec(place.id)
  if (directory) return result(directory[1])
  if (/^(?:pub|chr)-/.test(place.id) && !/^chr-None-c\d+$/.test(place.id)) return null
  const live = /^county:(?:Public|Charter):(\d{1,4})$/.exec(place.id)
  if (live) return result(live[1].padStart(4, '0'))

  // Only the five blank-ID charter rows verified in the saved reconciliation.
  // Never search all workbook names, nor reuse an elementary unit's result for a sibling division.
  const exactName = place.name.trim().toLowerCase().replace(/\s+/g, ' ')
  const verified = place.kind === 'Charter' ? nameAliases[exactName] : undefined
  return verified ? result(verified) : null
}
