import { Award, Bell, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type View = 'list' | 'split' | 'map'

const pills = ['Stage', 'Type', 'Grades', 'Distance', 'Programs', 'Cost']

const pill = 'h-10 rounded-md px-3 text-[15px] font-medium text-ink'

export function FilterBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <div className="fixed inset-x-0 top-[70px] z-30 flex h-[63px] items-center justify-between gap-4 border-b border-line bg-white px-6">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {pills.map((p) => (
          <Button key={p} variant="outline" className={pill}>
            {p === 'Distance' && <MapPin className="text-brand" />}
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
