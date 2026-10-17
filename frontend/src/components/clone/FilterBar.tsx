import { Award, Bell, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DISTANCES, LEVELS, TYPES, gradeOptions, levelOfGrade, type Filters } from './filters'

export type View = 'list' | 'split' | 'map'

// placeholders until their data exists
const pills = ['Programs', 'Cost']

const pill = 'h-10 rounded-md px-3 text-[15px] font-medium text-ink'

function DistanceDropdown({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const active = value != null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={cn(pill, active && 'border-primary bg-primary/10 text-primary')} />}
      >
        <MapPin className="text-brand" />
        {active ? `Within ${value} mi` : 'Distance'}
        <ChevronDown className="size-3.5!" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>From your search location</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup
          value={value == null ? 'any' : String(value)}
          onValueChange={(v) => {
            const miles = Number(v)
            onChange(Number.isFinite(miles) && miles > 0 ? miles : null)
          }}
        >
          <DropdownMenuRadioItem value="any">Any distance</DropdownMenuRadioItem>
          {DISTANCES.map((d) => (
            <DropdownMenuRadioItem key={d} value={String(d)}>
              Within {d} {d === 1 ? 'mile' : 'miles'}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterDropdown({
  label,
  options,
  selected,
  disabled,
  prefix,
  onToggle,
}: {
  label: string
  options: { id: string; label: string }[]
  selected: string[]
  disabled?: boolean
  prefix?: [string, string] // shown before the picked names, e.g. Grade 3 / Grades 3, 4
  onToggle: (id: string) => void
}) {
  const active = selected.length > 0
  // show what was picked, not a count: "Elementary", "Public, Charter", "Elementary +2"
  const names = options.filter((o) => selected.includes(o.id)).map((o) => o.label)
  const summary = names.length <= 2 ? names.join(', ') : `${names[0]} +${names.length - 1}`
  const text = !active ? label : prefix ? `${prefix[names.length > 1 ? 1 : 0]} ${summary}` : summary
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={disabled} className={cn(pill, active && 'border-primary bg-primary/10 text-primary')} />
        }
      >
        {text}
        <ChevronDown className="size-3.5!" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.id}
            checked={selected.includes(o.id)}
            onCheckedChange={() => onToggle(o.id)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const toggle = <T extends string>(list: T[], id: T) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function FilterBar({
  view,
  onView,
  filters,
  onFilters,
}: {
  view: View
  onView: (v: View) => void
  filters: Filters
  onFilters: (f: Filters) => void
}) {
  return (
    <div className="fixed inset-x-0 top-[70px] z-30 flex h-[63px] items-center justify-between gap-4 border-b border-line bg-white px-6">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        <FilterDropdown
          label="Level"
          options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
          selected={filters.levels}
          onToggle={(id) => {
            const levels = toggle(filters.levels, id as Filters['levels'][number])
            const allowed = gradeOptions(levels).map((g) => g.id)
            onFilters({ ...filters, levels, grades: filters.grades.filter((g) => allowed.includes(g)) })
          }}
        />
        <FilterDropdown
          label="Type"
          options={TYPES.map((t) => ({ id: t, label: t }))}
          selected={filters.types}
          onToggle={(id) => onFilters({ ...filters, types: toggle(filters.types, id as Filters['types'][number]) })}
        />
        <FilterDropdown
          label="Grades"
          prefix={['Grade', 'Grades']}
          options={gradeOptions(filters.levels)}
          selected={filters.grades}
          disabled={filters.levels.length > 0 && gradeOptions(filters.levels).length === 0}
          onToggle={(id) => {
            // picking a grade also picks its school level
            const lvl = levelOfGrade(id)
            const levels = filters.levels.includes(lvl) ? filters.levels : [...filters.levels, lvl]
            onFilters({ ...filters, levels, grades: toggle(filters.grades, id) })
          }}
        />
        <DistanceDropdown value={filters.distance} onChange={(distance) => onFilters({ ...filters, distance })} />
        {pills.map((p) => (
          <Button key={p} variant="outline" className={pill}>
            {p}
            <ChevronDown className="size-3.5!" />
          </Button>
        ))}
        <Button variant="outline" className={pill}>
          <Award />
          Highest rated
        </Button>
        <Button variant="ghost" className={pill}>
          <SlidersHorizontal />
          More
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className={cn(pill, 'max-md:hidden')}>
          <Bell />
          Save search
        </Button>
        <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border border-border">
          {(['list', 'split', 'map'] as const).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => onView(v)}
              className={cn(
                'h-10 px-3 text-[15px] capitalize transition sm:px-4',
                view === v ? 'bg-deep font-semibold text-white' : 'bg-white text-ink hover:bg-muted',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
