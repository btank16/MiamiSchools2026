import { useEffect, useRef } from 'react'
import { ArrowUpDown, Award, Bell, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react'
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
import { COSTS, DISTANCES, LEVELS, SORTS, TYPES, gradeOptions, levelOfGrade, type Cost, type Filters, type Sort } from './filters'

export type View = 'list' | 'split' | 'map'

// placeholders until their data exists
const pills = ['Programs']

const pill = 'h-10 rounded-md px-3 text-[15px] font-medium text-ink'

function SortDropdown({ value, hasOrigin, onChange }: { value: Sort; hasOrigin: boolean; onChange: (s: Sort) => void }) {
  const current = SORTS.find((s) => s.id === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={cn(pill, value !== 'default' && 'border-primary bg-primary/10 text-primary')} />}
      >
        <ArrowUpDown />
        {value === 'default' ? 'Sort by' : `Sort: ${current?.label}`}
        <ChevronDown className="size-3.5!" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as Sort)}>
          {SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.id} value={s.id} disabled={s.id === 'distance' && !hasOrigin}>
              {s.label}
              {s.id === 'distance' && !hasOrigin && <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">search an address</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// the button always looks normal; with no address searched its menu explains what to do and shows the choices greyed
function DistanceDropdown({
  value,
  needsAddress,
  onChange,
}: {
  value: number | null
  needsAddress: boolean
  onChange: (v: number | null) => void
}) {
  const active = value != null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className={cn(pill, active && 'border-primary bg-primary/10 text-primary')} />
        }
      >
        <MapPin className="text-brand" />
        {active ? `Within ${value} mi` : 'Distance'}
        <ChevronDown className="size-3.5!" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className={cn(needsAddress && 'max-w-60 whitespace-normal text-sm font-medium text-ink')}>
            {needsAddress ? 'Search an address to filter by distance' : 'From your search location'}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup
          value={value == null ? 'any' : String(value)}
          onValueChange={(v) => {
            const miles = Number(v)
            onChange(Number.isFinite(miles) && miles > 0 ? miles : null)
          }}
        >
          <DropdownMenuRadioItem value="any" disabled={needsAddress}>
            Any distance
          </DropdownMenuRadioItem>
          {DISTANCES.map((d) => (
            <DropdownMenuRadioItem key={d} value={String(d)} disabled={needsAddress}>
              Within {d} {d === 1 ? 'mile' : 'miles'}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CostDropdown({ value, onChange }: { value: Cost | null; onChange: (v: Cost | null) => void }) {
  const current = COSTS.find((c) => c.id === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={cn(pill, current && 'border-primary bg-primary/10 text-primary')} />}
      >
        {current ? current.label : 'Cost'}
        <ChevronDown className="size-3.5!" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Yearly tuition, lowest grade</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup value={value ?? 'any'} onValueChange={(v) => onChange(v === 'any' ? null : (v as Cost))}>
          <DropdownMenuRadioItem value="any">Any cost</DropdownMenuRadioItem>
          {COSTS.map((c) => (
            <DropdownMenuRadioItem key={c.id} value={c.id}>
              {c.label}
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
  sort,
  onSort,
  hasOrigin,
}: {
  view: View
  onView: (v: View) => void
  filters: Filters
  onFilters: (f: Filters) => void
  sort: Sort
  onSort: (s: Sort) => void
  hasOrigin: boolean // distance needs a searched address to measure from
}) {
  const bar = useRef<HTMLDivElement>(null)
  // the bar grows when it wraps, so publish the header height for the content below it to offset by
  useEffect(() => {
    const el = bar.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--header-h', `${70 + el.offsetHeight}px`)
    publish()
    const watcher = new ResizeObserver(publish)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])
  return (
    <div
      ref={bar}
      className="fixed inset-x-0 top-[70px] z-30 flex min-h-[63px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-white px-6 py-2"
    >
      {/* buttons wrap onto a second row when space runs out, so none is ever cut off */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="contents">
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
        <DistanceDropdown value={filters.distance} needsAddress={!hasOrigin} onChange={(distance) => onFilters({ ...filters, distance })} />
        <CostDropdown value={filters.cost} onChange={(cost) => onFilters({ ...filters, cost })} />
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
      </div>
        <Button variant="outline" className={cn(pill, 'shrink-0')}>
          <SlidersHorizontal />
          More
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <SortDropdown value={sort} hasOrigin={hasOrigin} onChange={onSort} />
        <Button variant="outline" aria-label="Save search" title="Save search" className={cn(pill, 'w-10 px-0 max-md:hidden')}>
          <Bell />
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
