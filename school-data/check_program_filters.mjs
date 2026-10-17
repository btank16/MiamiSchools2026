// Run: node school-data/check_program_filters.mjs
import assert from 'node:assert/strict'
import { createServer } from '../frontend/node_modules/vite/dist/node/index.js'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../frontend', import.meta.url))
const server = await createServer({ root, configFile: false, resolve: { alias: { '@': root + '/src' } }, server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' })
try {
  const a = await server.ssrLoadModule('/src/lib/after-school.ts')
  const f = await server.ssrLoadModule('/src/components/clone/filters.ts')
  const { directory } = await server.ssrLoadModule('/src/components/clone/data.ts')
  const minorca = directory.find(p => p.id === 'pub-0961-c2')
  const zamora = directory.find(p => p.id === 'pub-0961')
  const dunbar = directory.find(p => p.id === 'pub-1441')
  const filter = fields => ({ ...f.emptyFilters, ...fields })
  assert.equal(f.hasProgramFilters(f.emptyFilters), false)
  assert.equal(f.isFiltering(filter({ afterSchool: 'listed' })), true)
  assert.equal(f.isFiltering(filter({ afterSchoolCost: 'free' })), true)
  assert.equal(f.isFiltering(filter({ careUntil: 18 })), true)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs' })), true)
  assert.equal(f.matches(zamora, filter({ afterSchool: 'clubs' })), false)
  assert.equal(f.matches(zamora, filter({ afterSchool: 'care', careUntil: 18 })), true)
  assert.equal(f.matches(dunbar, filter({ afterSchool: 'listed' })), true)
  assert.equal(f.matches(dunbar, filter({ afterSchoolCost: 'free' })), false)
  assert.equal(f.matches(dunbar, filter({ afterSchoolCost: 'paid' })), false)
  assert.equal(f.matches(dunbar, filter({ careUntil: 17 })), false)
  assert.equal(f.matches(minorca, filter({ cost: 'free', afterSchoolCost: 'paid' })), true)
  assert.equal(f.matches(minorca, filter({ cost: 'free', afterSchoolCost: 'free' })), false)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', grades: ['6'] })), false)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', grades: ['2'] })), true)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', grades: ['PK'] })), true)
  assert.equal(f.matches(dunbar, filter({ afterSchool: 'listed', grades: ['6'] })), true)
  assert.equal(f.matches(dunbar, filter({ afterSchool: 'listed', grades: ['5'] })), false)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', levels: ['middle'] })), false)
  assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', levels: ['elementary'] })), true)
  assert.equal(f.matches({ ...minorca, distanceMiles: 2 }, filter({ afterSchool: 'clubs', distance: 1 })), false)
  assert.equal(f.matches({ ...minorca, distanceMiles: 0.5 }, filter({ afterSchool: 'clubs', distance: 1 })), true)
  assert.equal(f.matches({ ...minorca, address: '39 Zamora Ave' }, filter({ afterSchool: 'clubs' })), false)
  // Synthetic future free club at a school with paid care. Do not combine the
  // free status from a club with the closing time or type of a different program.
  const club = a.programsFor(minorca).find(p => p.activityType === 'extracurricular')
  const original = club.payment_status
  try {
    club.payment_status = 'free'
    assert.equal(f.matches(minorca, filter({ afterSchool: 'care', afterSchoolCost: 'free' })), false)
    assert.equal(f.matches(minorca, filter({ careUntil: 18, afterSchoolCost: 'free' })), false)
    assert.equal(f.matches(minorca, filter({ afterSchool: 'clubs', afterSchoolCost: 'free' })), true)
  } finally { club.payment_status = original }
  assert.equal(a.programSummary(minorca).includes('6:00 p.m.'), true)
  const counts = Object.fromEntries([
    ['listed', { afterSchool: 'listed' }], ['care', { afterSchool: 'care' }], ['clubs', { afterSchool: 'clubs' }],
    ['paid', { afterSchoolCost: 'paid' }], ['free', { afterSchoolCost: 'free' }], ['careUntil6', { careUntil: 18 }],
  ].map(([label, fields]) => [label, directory.filter(p => f.matches(p, filter(fields))).length]))
  assert.ok(counts.listed > counts.care)
  assert.equal(counts.clubs, 1)
  assert.equal(counts.free, 0)
  assert.equal(counts.careUntil6, 3)
  console.log('PASS: tuition/program fees, unknowns, grades, campus identity, distance, same-program constraints, and reset state')
  console.log(JSON.stringify(counts, null, 2))
} finally { await server.close() }
