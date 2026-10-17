export type Sector = 'public' | 'charter' | 'private' | 'childcare' | 'headstart'
export type Grade = 'A' | 'B' | 'C' | 'D'

export const sectors: Record<Sector, { label: string; count: number }> = {
  public: { label: 'Public', count: 362 },
  charter: { label: 'Charter', count: 181 },
  private: { label: 'Private', count: 965 },
  childcare: { label: 'Childcare', count: 1240 },
  headstart: { label: 'Head Start', count: 38 },
}

export type Place = {
  id: string
  name: string
  address: string
  sector: Sector
  grades: string
  grade?: Grade
  tags: string[]
  cost: string
  zoned?: boolean
  featured?: boolean
  lngLat: [number, number]
}

// placeholder content until places.geojson is wired in
export const places: Place[] = [
  { id: 'p1', name: 'Southside Preparatory Academy', address: '45 SW 13th St, Miami, FL 33130', sector: 'public', grades: 'PK–8', grade: 'A', tags: ['Magnet', 'Gifted program'], cost: 'Free', zoned: true, featured: true, lngLat: [-80.194, 25.762] },
  { id: 'p2', name: 'Coral Way K-8 Center', address: '1950 SW 13th Ave, Miami, FL 33145', sector: 'public', grades: 'PK–8', grade: 'A', tags: ['Dual language', 'Magnet'], cost: 'Free', featured: true, lngLat: [-80.221, 25.757] },
  { id: 'p3', name: 'Little Havana Early Learning', address: '7440 N Kendall Dr, Miami, FL 33156', sector: 'childcare', grades: 'Infant–PK', tags: ['Infant care', 'VPK', 'Meals'], cost: '$1,100–$1,650 a month', lngLat: [-80.305, 25.685] },
  { id: 'p4', name: 'Altos Montessori Academy', address: '2100 SW 8th St, Miami, FL 33135', sector: 'private', grades: 'PK–5', tags: ['Montessori', 'Scholarships accepted'], cost: '$9,800–$14,500 a year', lngLat: [-80.231, 25.765] },
  { id: 'p5', name: 'Wynwood Arts Magnet', address: '2200 NW 2nd Ave, Miami, FL 33127', sector: 'public', grades: '6–12', grade: 'B', tags: ['Magnet', 'Arts'], cost: 'Free', lngLat: [-80.198, 25.801] },
  { id: 'p6', name: 'Edison Senior High', address: '6161 NW 5th Ct, Miami, FL 33127', sector: 'public', grades: '9–12', grade: 'C', tags: ['Career academy', 'AP courses'], cost: 'Free', lngLat: [-80.205, 25.832] },
  { id: 'p7', name: 'Doral Learning Center', address: '8401 NW 36th St, Doral, FL 33166', sector: 'childcare', grades: 'Infant–PK', tags: ['VPK', 'Gold Seal accredited'], cost: '$980–$1,450 a month', lngLat: [-80.33, 25.81] },
  { id: 'p8', name: 'Gables Day School', address: '340 Palermo Ave, Coral Gables, FL 33134', sector: 'private', grades: 'PK–12', tags: ['College prep', 'Sports'], cost: '$18,200–$24,000 a year', lngLat: [-80.262, 25.745] },
  { id: 'p9', name: 'Allapattah Charter Academy', address: '1400 NW 36th St, Miami, FL 33142', sector: 'charter', grades: 'K–8', grade: 'B', tags: ['STEM', 'Free lunch'], cost: 'Free', lngLat: [-80.222, 25.81] },
  { id: 'p10', name: 'Sunshine Head Start', address: '1300 NW 3rd Ave, Miami, FL 33136', sector: 'headstart', grades: 'Infant–PK', tags: ['Free', 'Meals'], cost: 'Free for eligible families', lngLat: [-80.2, 25.786] },
  { id: 'p11', name: 'Kendall Lakes K-8', address: '8000 SW 142nd Ave, Miami, FL 33183', sector: 'public', grades: 'K–8', grade: 'D', tags: ['Gifted', 'Band'], cost: 'Free', lngLat: [-80.42, 25.7] },
  { id: 'p12', name: 'Brickell Child Care', address: '60 SW 13th St, Miami, FL 33130', sector: 'childcare', grades: 'Infant–PK', tags: ['Infant care', 'Weekend care'], cost: '$1,250–$1,900 a month', lngLat: [-80.193, 25.758] },
]

// deterministic scatter so the map has points before real data is wired in
const order: Sector[] = ['public', 'childcare', 'private', 'public', 'charter', 'childcare', 'public', 'headstart']
function scatter(count: number): { lngLat: [number, number]; sector: Sector }[] {
  let s = 7
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
  return Array.from({ length: count }, (_, i) => ({
    lngLat: [-80.3 + rnd() * 0.16, 25.7 + rnd() * 0.15] as [number, number],
    sector: order[i % order.length],
  }))
}

export const dots = scatter(90)
