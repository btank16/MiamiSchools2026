import raw from '@/data/after-school.json'
import type { Place } from '@/components/clone/data'

export type Program = {
  program_id: string
  name: string
  provider: string
  activityType: string | null
  eligibleGrades: string | null
  age_groups: string | null
  school_year: string | null
  payment_status: string
  currency: string | null
  rates: { amount: number; billing_unit: string; condition?: string; billed?: string }[]
  fees: { name: string; amount?: number | null; percent?: number; billing_unit?: string; grade_scope?: string; scope?: string; condition?: string }[]
  day: string | null
  startTime: string | null
  endTime: string | null
  duration_minutes: number | null
  duration_basis: string | null
  term_start: string | null
  term_end: string | null
  term_weeks: number | null
  service_days: number | null
  schedule_text: string | null
  availability: string
  registrationUrl: string | null
  contact_phone: string | null
  contact_email: string | null
  notes: string[]
  evidence: { source_url: string; fields: string[]; retrieved_at: string; pdf_page: number | null }[]
}
type School = { id: string; name: string; address: string; kind: string; programs: Program[] }
const schools: readonly School[] = raw.schools
export const PROGRAMS_CHECKED = raw.checked

// A school number alone cannot distinguish the Minorca and Zamora campuses.
// Require a street address for every match, including known catalog IDs.
function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/\b(street|avenue|road|highway|drive|terrace|boulevard|elementary|preparatory|school)\b/g,
      word => ({ street: 'st', avenue: 'ave', road: 'rd', highway: 'hwy', drive: 'dr', terrace: 'ter', boulevard: 'blvd', elementary: 'elem', preparatory: 'prep', school: '' })[word] ?? word)
    .replace(/[^a-z0-9]/g, '')
}

const schoolsByAddress = new Map<string, School[]>()
for (const school of schools) {
  const key = `${school.kind}:${normalize(school.address)}`
  schoolsByAddress.set(key, [...(schoolsByAddress.get(key) ?? []), school])
}

export function programsFor(place: Pick<Place, 'id' | 'name' | 'address' | 'kind'>): readonly Program[] {
  if (!['Public', 'Charter', 'Private'].includes(place.kind)) return []
  const address = normalize(place.address.split(',')[0])
  if (!address) return []
  const sameAddress = schoolsByAddress.get(`${place.kind}:${address}`) ?? []
  const direct = sameAddress.find(s => s.id === place.id)
  if (direct) return direct.programs
  if (/^(pub|chr|prv)-/.test(place.id)) return []
  const county = /^county:(Public|Charter|Private):(\d+)$/.exec(place.id)
  if (county) {
    const prefix = ({ Public: 'pub', Charter: 'chr', Private: 'prv' })[county[1]]
    const number = county[1] === 'Private' ? county[2] : county[2].padStart(4, '0')
    const id = `${prefix}-${number}`
    const matches = sameAddress.filter(s => s.id === id || s.id.startsWith(`${id}-c`))
    return matches.length === 1 ? matches[0].programs : []
  }
  const matches = sameAddress.filter(s => normalize(s.name) === normalize(place.name))
  return matches.length === 1 ? matches[0].programs : []
}

export function programGroups(programs: readonly Program[]): Program[][] {
  const groups = new Map<string, Program[]>()
  for (const program of programs) {
    // Only named enrichment classes become grade choices. Directory/funding
    // records retain their individual identities and source links.
    const key = program.activityType === 'extracurricular'
      ? JSON.stringify([program.name, program.provider, program.term_start, program.term_end])
      : program.program_id
    const group = groups.get(key) ?? []
    group.push(program)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export const programName = (p: Program) => p.activityType ? p.name : p.provider
export const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount)
export const billingUnit = (unit: string) => ({ service_day: 'school day', week: 'week', session: 'session', school_year: 'school year', one_time: 'one time', registration: 'registration', '15_minutes_per_child': '15 minutes per child' })[unit] ?? unit.replaceAll('_', ' ')
export function priceFor(p: Program): { amount: string; unit: string } {
  if (p.payment_status === 'unknown') return { amount: 'Not published', unit: 'Price to confirm' }
  if (p.payment_status === 'free') return { amount: 'Free', unit: 'Check eligibility' }
  const rate = p.rates.find(r => !r.condition)
  return rate ? { amount: money(rate.amount, p.currency ?? 'USD'), unit: `per ${billingUnit(rate.billing_unit)}` } : { amount: 'Paid', unit: 'Rate to confirm' }
}
export function clock(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'p.m.' : 'a.m.'}`
}
export const programHours = (p: Program) => p.startTime && p.endTime ? `${clock(p.startTime)}–${clock(p.endTime)}` : 'Hours not published'
export function programLength(p: Program): string {
  if (p.duration_minutes === null) return 'Length not published'
  return `${p.duration_basis?.includes('operating window') ? 'Up to ' : ''}${p.duration_minutes} minutes`
}
export const dateText = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
export function availability(p: Program): string {
  return ({ registration_closed: 'Session registration closed', waitlist_review_required: 'Enrollment review required', not_verified: 'Availability to confirm' })[p.availability] ?? 'Confirm with provider'
}

export function programSummary(place: Pick<Place, 'id' | 'name' | 'address' | 'kind'>): string | null {
  const programs = programsFor(place)
  if (!programs.length) return null
  const care = programs.filter(p => p.activityType === 'care')
  const latest = care.map(p => p.endTime).filter((time): time is string => time !== null).sort().at(-1)
  const labels = [care.length ? `After-school care${latest ? ` until ${clock(latest)}` : ''}` : null,
    programs.some(p => p.activityType === 'extracurricular') ? 'Clubs' : null].filter(Boolean)
  return labels.length ? `Listed: ${labels.join(' · ')}` : 'After-school program listed · details to confirm'
}

// A program's published grade scope, rather than the school's overall grade span.
export function programServesGrades(p: Program, grades: readonly string[]): boolean {
  if (!grades.length) return true
  if (!p.eligibleGrades) return false
  const scope = p.eligibleGrades.split('(')[0].toUpperCase().replace(/(\d+)(ST|ND|RD|TH)\b/g, '$1')
  const covered = new Set<string>()
  if (scope.includes('ELEMENTARY')) ['K', '1', '2', '3', '4', '5'].forEach(g => covered.add(g))
  if (scope.includes('MIDDLE')) ['6', '7', '8'].forEach(g => covered.add(g))
  if (scope.includes('HIGH')) ['9', '10', '11', '12'].forEach(g => covered.add(g))
  const rank = (grade: string) => grade === 'PK' ? -1 : grade === 'K' ? 0 : Number(grade)
  for (const match of scope.matchAll(/\b(PK|K|1[0-2]|[1-9])\s*[-–]\s*(PK|K|1[0-2]|[1-9])\b/g)) {
    for (let n = rank(match[1]); n <= rank(match[2]); n++) covered.add(n === -1 ? 'PK' : n === 0 ? 'K' : String(n))
  }
  if (!covered.size) {
    for (const match of scope.matchAll(/\b(PK|K|1[0-2]|[1-9])\b/g)) covered.add(match[1])
  }
  return grades.some(g => covered.has(g))
}
