export type Place = {
  id: string
  name: string
  address: string
  kind: string
  grades: string
  rating?: number
  ratingLabel?: string
  tags: string[]
  cost: string
  badge?: string
  posted?: string
  verified?: boolean
  spotlight?: boolean
  lngLat: [number, number]
  hue: number
}

export const places: Place[] = [
  { id: 'p1', name: 'Brickell Preparatory', address: '2555 SW 17th St, Miami, FL 33145', kind: 'Charter', grades: 'PK–8', tags: ['Bilingual', 'After-care'], cost: 'Free', badge: 'Must-see', verified: true, spotlight: true, lngLat: [-80.215, 25.752], hue: 200 },
  { id: 'p2', name: 'Coral Way K-8 Center', address: '1950 SW 13th Ave, Miami, FL 33145', kind: 'Public', grades: 'PK–8', tags: ['Dual language', 'Magnet'], cost: 'Free', badge: 'Must-see', verified: true, spotlight: true, lngLat: [-80.221, 25.757], hue: 160 },
  { id: 'p3', name: 'Little Havana Early Learning', address: '7440 N Kendall Dr, Miami, FL 33156', kind: 'Childcare', grades: 'Infant–PK', rating: 9.9, ratingLabel: 'Excellent', tags: ['Infant care', 'VPK', 'Meals'], cost: '$1,100–$1,650/mo', posted: '17h ago', verified: true, lngLat: [-80.305, 25.685], hue: 28 },
  { id: 'p4', name: 'Altos Montessori Academy', address: '2100 SW 8th St, Miami, FL 33135', kind: 'Private', grades: 'PK–5', rating: 9.6, ratingLabel: 'Excellent', tags: ['Montessori', 'Scholarships'], cost: '$9,800–$14,500/yr', posted: '3h ago', verified: true, lngLat: [-80.231, 25.765], hue: 320 },
  { id: 'p5', name: 'Wynwood Arts Magnet', address: '2200 NW 2nd Ave, Miami, FL 33127', kind: 'Public', grades: '6–12', rating: 9.1, ratingLabel: 'Great', tags: ['Magnet', 'Arts'], cost: 'Free', badge: 'Featured', lngLat: [-80.198, 25.801], hue: 275 },
  { id: 'p6', name: 'Edison Senior High', address: '6161 NW 5th Ct, Miami, FL 33127', kind: 'Public', grades: '9–12', rating: 8.4, ratingLabel: 'Good', tags: ['Career academy', 'AP'], cost: 'Free', badge: 'Highly rated', lngLat: [-80.205, 25.832], hue: 120 },
  { id: 'p7', name: 'Doral Learning Center', address: '8401 NW 36th St, Doral, FL 33166', kind: 'Childcare', grades: 'Infant–PK', rating: 9.2, ratingLabel: 'Excellent', tags: ['VPK', 'Gold Seal'], cost: '$980–$1,450/mo', posted: '1d ago', verified: true, lngLat: [-80.33, 25.81], hue: 45 },
  { id: 'p8', name: 'Gables Day School', address: '340 Palermo Ave, Coral Gables, FL 33134', kind: 'Private', grades: 'PK–12', rating: 9.4, ratingLabel: 'Excellent', tags: ['College prep', 'Sports'], cost: '$18,200–$24,000/yr', posted: '5d+ ago', lngLat: [-80.262, 25.745], hue: 230 },
  { id: 'p9', name: 'Allapattah Charter Academy', address: '1400 NW 36th St, Miami, FL 33142', kind: 'Charter', grades: 'K–8', rating: 8.8, ratingLabel: 'Good', tags: ['STEM', 'Free lunch'], cost: 'Free', posted: '5d+ ago', lngLat: [-80.222, 25.81], hue: 190 },
  { id: 'p10', name: 'Sunshine Head Start', address: '1300 NW 3rd Ave, Miami, FL 33136', kind: 'Head Start', grades: 'Infant–PK', rating: 8.7, ratingLabel: 'Good', tags: ['Free', 'Meals'], cost: 'Free', posted: '1d ago', verified: true, lngLat: [-80.2, 25.786], hue: 10 },
  { id: 'p11', name: 'Kendall Lakes K-8', address: '8000 SW 142nd Ave, Miami, FL 33183', kind: 'Public', grades: 'K–8', rating: 8.9, ratingLabel: 'Good', tags: ['Gifted', 'Band'], cost: 'Free', posted: '5d+ ago', lngLat: [-80.42, 25.7], hue: 95 },
  { id: 'p12', name: 'Brickell Child Care', address: '60 SW 13th St, Miami, FL 33130', kind: 'Childcare', grades: 'Infant–PK', rating: 9.0, ratingLabel: 'Excellent', tags: ['Infant care', 'Weekend'], cost: '$1,250–$1,900/mo', posted: '5d+ ago', verified: true, lngLat: [-80.193, 25.758], hue: 355 },
]

// deterministic scatter so the map has dots before real data is wired in
function scatter(count: number): [number, number][] {
  let s = 7
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
  return Array.from({ length: count }, () => [-80.3 + rnd() * 0.18, 25.7 + rnd() * 0.17] as [number, number])
}

// placeholder details borrowed from the hand-written places until real data replaces them
export const dots: Place[] = scatter(90).map((lngLat, i) => ({
  ...places[i % places.length],
  id: `d${i}`,
  spotlight: false,
  lngLat,
  hue: (i * 37) % 360,
}))
