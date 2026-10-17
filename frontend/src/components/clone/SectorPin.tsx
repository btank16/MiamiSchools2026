import type { Sector } from './data'

const shapes: Record<Sector, React.ReactNode> = {
  public: <circle cx="10" cy="10" r="7" />,
  charter: <rect x="3.5" y="3.5" width="13" height="13" rx="2" />,
  private: <polygon points="10,2 18,10 10,18 2,10" />,
  childcare: <polygon points="10,3 18,17 2,17" />,
  headstart: <polygon points="10,2 17,6 17,14 10,18 3,14 3,6" />,
}

// colour and shape together: the shape is what keeps the map readable for colour-blind users
export function SectorPin({ sector, size = 16, selected }: { sector: Sector; size?: number; selected?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 overflow-visible">
      {selected && <circle cx="10" cy="10" r="12" fill="none" stroke="var(--highlight)" strokeWidth="3" />}
      <g fill={`var(--sector-${sector})`} stroke="#fff" strokeWidth="2" strokeLinejoin="round">
        {shapes[sector]}
      </g>
    </svg>
  )
}
