import { CircleUserRound, Menu, School, Search } from 'lucide-react'

const links = ['Compare', 'Saved places', 'Guides']

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[70px] items-center justify-between gap-4 border-b border-border bg-surface-subtle px-6">
      <a href="/" className="flex shrink-0 items-center gap-2 text-xl font-semibold tracking-tight text-foreground sm:w-[229px]">
        <School className="size-7 text-primary" strokeWidth={2.2} />
        <span className="max-sm:hidden">School Navigator</span>
      </a>

      <form role="search" className="flex w-full max-w-[460px] items-center gap-2" onSubmit={(e) => e.preventDefault()}>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search by school name or address"
            placeholder="School or address"
            className="h-12 w-full rounded-lg border border-input bg-white pl-10 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary-hover active:bg-primary-pressed"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </form>

      <nav className="flex items-center gap-5 text-[15px] text-text-secondary max-lg:hidden">
        {links.map((l) => (
          <a key={l} href="#" className="hover:text-foreground hover:underline underline-offset-4">
            {l}
          </a>
        ))}
        <button
          aria-label="Account menu"
          className="flex h-10 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground hover:bg-muted"
        >
          <CircleUserRound className="size-6 text-primary" aria-hidden="true" />
          <Menu className="size-4" aria-hidden="true" />
        </button>
      </nav>
    </header>
  )
}
