import { CircleUserRound, Menu, School, Search } from 'lucide-react'

const links = ['Compare', 'Saved places', 'Guides']

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[70px] items-center justify-between gap-4 border-b border-line bg-bar px-6">
      <a href="/" className="flex shrink-0 items-center sm:w-[229px] gap-2 text-xl font-bold tracking-tight text-deep">
        <School className="size-8 text-brand" strokeWidth={2.2} />
        <span className="max-sm:hidden">School Navigator</span>
      </a>

      <form role="search" className="flex w-full max-w-[460px] items-center gap-2" onSubmit={(e) => e.preventDefault()}>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            aria-label="Search location"
            placeholder="Miami, FL"
            className="h-12 w-full rounded-lg border border-line bg-white pl-10 pr-4 text-base text-ink outline-none placeholder:text-ink focus:border-deep focus:ring-2 focus:ring-deep/20"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand text-white transition hover:brightness-95"
        >
          <Search className="size-5" />
        </button>
      </form>

      <nav className="flex items-center gap-5 text-[15px] text-neutral-600 max-lg:hidden">
        {links.map((l) => (
          <a key={l} href="#" className="hover:text-ink">
            {l}
          </a>
        ))}
        <button
          aria-label="Account menu"
          className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-deep hover:bg-neutral-50"
        >
          <CircleUserRound className="size-6 text-violet" />
          <Menu className="size-4" />
        </button>
      </nav>
    </header>
  )
}
