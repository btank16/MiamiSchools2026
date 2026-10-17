import { Info } from 'lucide-react'
import { ACADEMIC_METHOD_URL, ACADEMIC_SOURCE_URL, ACADEMIC_YEAR, getAcademics } from '@/lib/academics'
import { cn } from '@/lib/utils'
import type { Place } from './data'

export function AcademicResults({
  place,
  variant = 'card',
  inverted = false,
}: {
  place: Place
  variant?: 'card' | 'detail' | 'popup'
  inverted?: boolean
}) {
  if (!['Public', 'Charter', 'Private'].includes(place.kind)) {
    return variant === 'card' ? null : (
      <p className="py-2 text-xs leading-relaxed text-neutral-600">
        Math and English state results aren’t reported for {place.kind === 'Head Start' ? 'Head Start programs' : 'childcare centers'}.
      </p>
    )
  }
  const results = getAcademics(place)
  const muted = inverted ? 'text-white/80' : 'text-neutral-600'

  if (!results) {
    return (
      <p className={cn('py-2 text-xs', muted)}>
        {place.kind === 'Private'
          ? 'State results not provided for private schools.'
          : `State results unavailable · ${ACADEMIC_YEAR}`}
      </p>
    )
  }

  const detailed = variant === 'detail'
  const subjects = [
    { label: 'Math', value: results.math },
    { label: 'English / ELA', value: results.english },
  ]

  return (
    <section
      aria-label={`${place.name} academic results`}
      data-academic-results
      className={cn('space-y-2 py-2', detailed && 'my-6 space-y-3 rounded-xl border border-line bg-bar p-5 sm:p-6')}
      onClick={(event) => event.stopPropagation()}
    >
      {detailed && <h2 className="text-[22px] font-semibold">Learning</h2>}
      <div className="flex items-center gap-2.5">
        <span
          aria-label={`Florida state grade ${results.schoolGrade ?? 'unavailable'}`}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-md text-xl font-semibold',
            inverted ? 'bg-white text-deep' : 'bg-brand/10 text-brand',
          )}
        >
          {results.schoolGrade ?? '—'}
        </span>
        <div className={cn('text-xs leading-relaxed', muted)}>
          <p>Florida state grade</p>
          <p>{ACADEMIC_YEAR}</p>
        </div>
      </div>

      <details className="group/meaning">
        <summary className={cn(
          'flex min-h-7 w-fit cursor-pointer list-none items-center gap-1.5 text-left text-xs leading-relaxed [&::-webkit-details-marker]:hidden',
          inverted ? 'text-white/85' : 'text-neutral-600',
        )}>
          Students meeting state standards
          <Info aria-hidden="true" className={cn('size-4 shrink-0', inverted ? 'text-white' : 'text-brand')} />
        </summary>
        <div className="mb-3 mt-1 space-y-2 rounded-lg bg-[#edf3ff] p-3 text-xs leading-relaxed text-ink">
          <p>
            {results.math != null ? (
              <><strong>{results.math}% in math</strong> means about {results.math} out of 100 students included in Florida’s school-grade calculation met the math achievement standard. The English percentage works the same way.</>
            ) : (
              <>Each percentage shows how many students included in Florida’s school-grade calculation met the state’s achievement standard in that subject.</>
            )}
          </p>
          <p>These are achievement rates, not percentile rankings. The letter is the school’s overall state grade.</p>
          <p>English / ELA means English Language Arts. A dash means a result is unavailable, not zero.</p>
          <a href={ACADEMIC_METHOD_URL} target="_blank" rel="noreferrer" className="inline-block py-1 font-medium text-brand underline underline-offset-2">
            How Florida calculates these results
          </a>
        </div>
      </details>

      <dl className="grid grid-cols-2 gap-3">
        {subjects.map(({ label, value }) => (
          <div key={label}>
            <dt className={cn('mb-1 text-xs', muted)}>{label}</dt>
            <dd
              aria-label={`${label}: ${value == null ? 'unavailable' : `${value}% of students meeting state standards`}`}
              className={cn(
                'font-semibold leading-none tracking-tight tabular-nums',
                detailed ? 'text-4xl' : 'text-2xl',
              )}
            >
              {value == null ? '—' : `${value}%`}
            </dd>
          </div>
        ))}
      </dl>
      <a
        href={ACADEMIC_SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        className={cn('inline-block py-1 text-[11px] underline underline-offset-2', muted)}
      >
        Florida DOE · {ACADEMIC_YEAR}
      </a>
    </section>
  )
}
