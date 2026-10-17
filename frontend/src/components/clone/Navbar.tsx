import { useEffect, useId, useRef, useState } from 'react'
import { CircleUserRound, Loader2, MapPin, Menu, Search } from 'lucide-react'
import logo from '@/assets/mdcps-logo.png'
import { autocomplete, type PlaceSuggestion } from '@/lib/api'
import { cn } from '@/lib/utils'

const links = ['Compare', 'Saved places', 'Guides']

// wait for a pause in typing before asking Google, so each keystroke is not a request
const DEBOUNCE_MS = 250

function AddressSearch({ busy, onSearch }: { busy: boolean; onSearch: (s: PlaceSuggestion, session: string) => void }) {
  const listId = useId()
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [failed, setFailed] = useState(false)
  // one Google billing session per search: the keystrokes plus the address lookup that ends it
  const session = useRef(crypto.randomUUID())
  // the text of the last picked suggestion, so picking one does not re-query it
  const picked = useRef<string | null>(null)

  useEffect(() => {
    const text = input.trim()
    if (text.length < 2 || text === picked.current) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      autocomplete(text, session.current, controller.signal)
        .then((list) => {
          setSuggestions(list)
          setActive(-1)
          setFailed(false)
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true)
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [input])

  const pick = (s: PlaceSuggestion) => {
    picked.current = s.text
    setInput(s.text)
    setSuggestions([])
    setOpen(false)
    onSearch(s, session.current)
    session.current = crypto.randomUUID()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!suggestions.length) return
      e.preventDefault()
      setOpen(true)
      // -1 is "nothing highlighted", reached by stepping past either end
      const n = suggestions.length
      setActive((i) => (e.key === 'ArrowDown' ? (i + 1 >= n ? -1 : i + 1) : i - 1 < -1 ? n - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && (suggestions.length > 0 || failed)
  return (
    <form
      role="search"
      className="flex w-full max-w-[460px] items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        // Enter or the button searches the highlighted suggestion, else the top one
        const s = suggestions[active] ?? suggestions[0]
        if (s) pick(s)
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          role="combobox"
          aria-label="Search an address"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Enter an address in Miami-Dade"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-lg border border-line bg-white pl-10 pr-4 text-base text-ink outline-none placeholder:text-neutral-500 focus:border-deep focus:ring-2 focus:ring-deep/20"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-[0_6px_20px_rgb(0,0,0,0.12)]"
          >
            {failed && !suggestions.length && <li className="px-4 py-3 text-sm text-neutral-600">Couldn't load suggestions. Try again.</li>}
            {suggestions.map((s, i) => (
              <li
                key={s.placeId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input's blur would close the list before a click lands
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn('flex cursor-pointer items-start gap-3 px-4 py-2.5', i === active && 'bg-muted')}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">{s.mainText}</span>
                  {s.secondaryText && <span className="block truncate text-sm text-neutral-600">{s.secondaryText}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand text-white transition hover:brightness-95"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
      </button>
    </form>
  )
}

export function Navbar({ busy = false, onSearch }: { busy?: boolean; onSearch: (s: PlaceSuggestion, session: string) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[70px] items-center justify-between gap-4 border-b border-line bg-bar px-6">
      <a href="/" className="flex shrink-0 items-center sm:w-[229px] gap-2 text-xl font-bold tracking-tight text-deep">
        <img src={logo} alt="Miami-Dade County Public Schools" className="size-9" />
        <span className="max-sm:hidden">School Navigator</span>
      </a>

      <AddressSearch busy={busy} onSearch={onSearch} />

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
