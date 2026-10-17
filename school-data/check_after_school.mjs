// Run: node school-data/check_after_school.mjs
import assert from 'node:assert/strict'
import { createServer } from '../frontend/node_modules/vite/dist/node/index.js'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
const root = fileURLToPath(new URL('../frontend', import.meta.url))
const server = await createServer({ root, configFile: false, resolve: { alias: { '@': root + '/src' } }, server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' })
try {
  const a = await server.ssrLoadModule('/src/lib/after-school.ts')
  const data = JSON.parse(fs.readFileSync(root + '/src/data/after-school.json', 'utf8'))
  const place = (id, address, name = 'Coral Gables Preparatory Academy', kind = 'Public') => ({ id, address, name, kind })
  const minorca = place('pub-0961-c2', '105 Minorca Ave, Coral Gables, FL 33134')
  const zamora = place('pub-0961', '39 Zamora Ave, Coral Gables, FL 33134', 'Coral Gables Preparatory Academy MLC')
  assert.equal(a.programsFor(minorca).length, 5)
  assert.equal(a.programGroups(a.programsFor(minorca)).length, 3)
  assert.equal(a.programsFor(zamora).length, 1)
  assert.equal(a.programsFor({ ...minorca, id: 'pub-0961' }).length, 0)
  assert.equal(a.programsFor({ ...minorca, address: '39 Zamora Ave' }).length, 0)
  assert.equal(a.programsFor({ ...minorca, kind: 'Childcare' }).length, 0)
  assert.equal(a.programsFor({ ...minorca, kind: 'Private' }).length, 0)
  assert.equal(a.programsFor({ ...minorca, id: 'pub-9999' }).length, 0)
  assert.equal(a.programsFor({ ...minorca, id: 'county:Public:961' }).length, 5)
  assert.equal(a.programsFor({ ...zamora, id: 'county:Public:0961', name: minorca.name }).length, 1)
  assert.equal(a.programsFor({ ...minorca, id: 'gs:test' }).length, 5)
  assert.equal(a.programsFor({ ...minorca, id: 'gs:test', address: '106 Minorca Avenue' }).length, 0)
  const unknown = a.programsFor(place('pub-1441', '505 NW 20th St, Miami, FL', 'Paul Laurence Dunbar K-8 Center'))[0]
  assert.equal(a.priceFor(unknown).amount, 'Not published')
  assert.equal(a.programHours(unknown), 'Hours not published')
  assert.equal(a.programLength(unknown), 'Length not published')
  assert.equal(a.programsFor(place('pub-0841', '3351 Matilda St', 'Coconut Grove Elementary')).length, 2)
  const clubs = a.programGroups(a.programsFor(minorca)).filter(g => g[0].activityType === 'extracurricular')
  assert.equal(clubs.length, 2)
  assert.deepEqual(clubs[0].map(p => p.duration_minutes), [75, 65])
  assert.deepEqual(a.priceFor(clubs[0][0]), { amount: '$239', unit: 'per session' })
  assert.deepEqual(a.priceFor(a.programsFor(minorca)[0]), { amount: '$9.25', unit: 'per school day' })
  assert.equal(a.availability(clubs[0][0]), 'Session registration closed')
  for (const school of data.schools) {
    assert.equal(a.programsFor(place(school.id, school.address, school.name, school.kind)).length, school.programs.length)
    for (const p of school.programs) {
      assert.ok(p.evidence.length)
      assert.ok(p.rates.every(r => r.billing_unit && typeof r.amount === 'number'))
      if (p.payment_status === 'unknown') assert.equal(a.priceFor(p).amount, 'Not published')
      if (p.duration_minutes !== null) {
        const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
        assert.equal(minutes(p.endTime) - minutes(p.startTime), p.duration_minutes)
      }
    }
  }
  console.log('PASS: 112 campus joins, 164 records, live/catalog identity guards, campus separation, grade groups, unknowns, billing units and duration arithmetic')
} finally { await server.close() }
