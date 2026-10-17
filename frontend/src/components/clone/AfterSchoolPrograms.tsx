import { useId, useMemo } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import type { Place } from './data'
import {
  billingUnit, dateText, money, priceFor, programGroups, programHours,
  programName, programsFor, PROGRAMS_CHECKED, type Program,
} from '@/lib/after-school'

function providerName(p: Program): string {
  return /YMCA|YOUNG MEN'S CHRISTIAN/i.test(p.provider) ? 'YMCA of South Florida' : p.provider
}

function duration(p: Program): string | null {
  if (p.duration_minutes === null) return null
  const hours = Math.floor(p.duration_minutes / 60)
  const minutes = p.duration_minutes % 60
  return [hours ? `${hours} hr` : '', minutes ? `${minutes} min` : ''].filter(Boolean).join(' ')
}

function ContactAndSources({ program: p }: { program: Program }) {
  const links = [...new Set(p.evidence.map(e => e.source_url))]
  return <details className="mt-4 text-sm">
    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-brand underline-offset-4 hover:underline">Fees, enrollment & sources<ChevronDown className="size-3.5" /></summary>
    <div className="mt-3 space-y-4 rounded-lg bg-bar p-4 text-sm leading-relaxed">
      {p.rates.length > 1 && <div><h4 className="font-medium">Rates & discounts</h4><ul className="mt-1 space-y-1 text-neutral-600">{p.rates.map((r, index) => <li key={index}>{money(r.amount, p.currency ?? 'USD')} per {billingUnit(r.billing_unit)}{r.condition ? ` — ${r.condition}` : ''}{r.billed ? `; billed ${r.billed}` : ''}</li>)}</ul></div>}
      {p.fees.length > 0 ? <div><h4 className="font-medium">Additional costs</h4><ul className="mt-1 space-y-2 text-neutral-600">{p.fees.map((fee, index) => <li key={index}>
        {fee.name}{fee.grade_scope ? `, grades ${fee.grade_scope}` : ''}: {fee.percent !== undefined ? `${fee.percent}%` : fee.amount != null ? money(fee.amount, p.currency ?? 'USD') : 'amount not available'}{fee.billing_unit && fee.billing_unit !== 'registration' ? ` (${billingUnit(fee.billing_unit)})` : ''}.{fee.condition && ` ${fee.condition}.`}{fee.scope && ' Confirm whether this fee applies per child or per club.'}
      </li>)}</ul><p className="mt-2 text-xs text-neutral-600">Required school-year insurance may already be held; check before paying again.</p></div> : <p className="text-neutral-600">Additional fees have not been confirmed.</p>}
      <div><h4 className="font-medium">Enrollment questions</h4>
        <p className="mt-1 text-neutral-600">{p.availability === 'registration_closed' ? 'Registration for this session is closed. Ask about the next session.' : p.availability === 'waitlist_review_required' ? 'The YMCA reviews eligibility and space before confirming enrollment.' : 'Ask about eligible grades, available places and how to enroll.'}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{p.contact_phone && <a className="text-brand underline underline-offset-2" href={`tel:${p.contact_phone.replace(/[^+\d]/g, '')}`}>Call {p.contact_phone}</a>}{p.contact_email && <a className="text-brand underline underline-offset-2" href={`mailto:${p.contact_email}`}>Email program contact</a>}</div>
      </div>
      <div className="border-t border-line pt-3 text-xs text-neutral-600"><p>Information checked {dateText(p.evidence[0]?.retrieved_at ?? PROGRAMS_CHECKED)}{p.school_year ? ` · ${p.school_year}` : ' · operating school year unconfirmed'}.</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{links.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand underline underline-offset-2">{p.activityType === null ? 'Directory listing' : links.length === 1 ? `${providerName(p)} program page` : `Program source ${index + 1}`}<ExternalLink className="size-3" /></a>)}</div></div>
    </div>
  </details>
}

function ProgramRow({ options }: { options: readonly Program[] }) {
  const p = options[0]
  const price = priceFor(p)
  const title = p.activityType === 'care' && /YMCA/i.test(p.provider) ? 'YMCA after-school care' : p.name === 'After School' ? 'After-school care' : programName(p)
  const year = p.school_year?.replace('2026-2027', '2026–27')
  return <article className="py-5 first:pt-0 last:pb-0">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><h3 className="text-base font-semibold leading-snug">{title}</h3>{p.activityType !== null && <p className="mt-1 text-xs text-neutral-600">{providerName(p)}{year ? ` · ${year}` : ''}</p>}</div>
      <div className="shrink-0 text-right text-sm"><p className="font-semibold">{p.payment_status === 'paid' ? `${price.amount} ${price.unit}` : p.payment_status === 'free' ? 'Free' : 'Cost unknown'}</p>{p.payment_status === 'paid' && <p className="mt-1 text-xs text-neutral-600">{p.fees.length ? 'Additional fees apply' : 'Check additional fees'}</p>}</div>
    </div>
    {p.activityType === null ? <><p className="mt-3 text-sm leading-relaxed text-neutral-600">An after-school program is listed at this school. Its schedule, price and current operation have not been confirmed.</p>{p.eligibleGrades && <p className="mt-2 text-xs text-neutral-600">Listed for: {p.eligibleGrades}.</p>}</> : <>
      <div className="mt-4 space-y-2.5">{options.map(option => <div key={option.program_id} className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-4">
        <p className="text-neutral-600">{option.eligibleGrades?.replace('PK-8 (provider lists both campuses together; confirm grade placement)', 'PK–8 · confirm grade placement') ?? 'Eligible grades not confirmed'}</p>
        <div><p className="font-medium">{option.day ? `${option.day} · ` : ''}{programHours(option)}</p>{duration(option) && <p className="mt-0.5 text-xs text-neutral-600">{option.duration_basis?.includes('operating window') ? `${duration(option)} operating window; start time depends on grade` : `${duration(option)} per class`}</p>}</div>
      </div>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600">{p.term_start && p.term_end ? `${dateText(p.term_start)}–${dateText(p.term_end)}` : 'Program dates not confirmed'}{p.term_weeks ? ` · ${p.term_weeks} calendar weeks` : ''}{p.service_days !== null ? ` · ${p.service_days} school days` : ''}</p>
      {p.availability === 'registration_closed' && <p className="mt-2 text-xs text-amber-800">Registration for this session is closed.</p>}
      {p.availability === 'waitlist_review_required' && <p className="mt-2 text-xs text-neutral-600">Enrollment depends on eligibility and available places.</p>}
    </>}
    <ContactAndSources program={p} />
  </article>
}

export function AfterSchoolPrograms({ place }: { place: Place }) {
  const groups = useMemo(() => programGroups(programsFor(place)), [place])
  const sectionId = useId()
  return <section aria-labelledby={sectionId}>
    <h2 id={sectionId} className="text-[22px] font-semibold">After-school care & clubs</h2>
    {groups.length ? <>
      <p className="mb-6 mt-1 text-sm text-neutral-600">Programs listed at this campus. Fees below are separate from school tuition.</p>
      <div className="divide-y divide-line">{groups.map(options => <ProgramRow key={options[0].program_id} options={options} />)}</div>
      <p className="mt-6 text-xs leading-relaxed text-neutral-500">Other programs may be available. Confirm schedules and places with the school or program contact.</p>
    </> : <p className="mt-2 text-sm leading-relaxed text-neutral-600">We don’t have after-school information for this campus yet. Ask the school which care and clubs are available, what they cost, and when they run.</p>}
  </section>
}
