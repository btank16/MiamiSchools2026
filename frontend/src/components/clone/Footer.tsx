import { School } from 'lucide-react'

const columns = [
  { title: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
  { title: 'Support', links: ['Help center', 'How it works', 'Data sources', 'Report a problem'] },
  { title: 'Privacy', links: ['Privacy policy', 'Terms of use', 'Accessibility'] },
  { title: 'Explore', links: ['Public schools', 'Charter schools', 'Private schools', 'Childcare', 'Head Start'] },
]

export function Footer() {
  return (
    <footer className="bg-surface-dark text-on-dark">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex items-start gap-2 text-xl font-semibold">
          <School className="size-7" aria-hidden="true" /> School Navigator
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold">{c.title}</h4>
            <ul className="space-y-2 text-sm text-on-dark-muted">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-on-dark hover:underline">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-on-dark-muted">
        © 2026 School Navigator. Data from Miami-Dade County, Florida DCF and Florida DOE.
      </div>
    </footer>
  )
}
