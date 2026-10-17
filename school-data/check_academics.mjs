import assert from 'node:assert/strict'
// Run with: node school-data/check_academics.mjs
import {createServer} from '../frontend/node_modules/vite/dist/node/index.js'
import {fileURLToPath} from 'node:url'
import fs from 'node:fs'
const root=fileURLToPath(new URL('../frontend', import.meta.url))
const server=await createServer({root,configFile:false,resolve:{alias:{'@':root+'/src'}},server:{middlewareMode:true,ws:false,hmr:false},appType:'custom'})
let assertions=0
const check=(actual,expected)=>{assert.deepEqual(actual,expected);assertions++}
try {
 const a=await server.ssrLoadModule('/src/lib/academics.ts')
 const raw=JSON.parse(fs.readFileSync(root+'/src/data/academics.json','utf8'))
 const directory=JSON.parse(fs.readFileSync(root+'/src/data/places.json','utf8'))
 const place=(id,kind='Charter',name='Test school',sources={})=>({id,kind,name,sources})
 check(Object.keys(raw.schools).length,473)
 check(raw.source.districtNumber,'13')
 check(a.ACADEMIC_YEAR,'2025–26')
 for(const [id,row] of Object.entries(raw.schools)) {
  check(row.schoolNumber,id)
  assert.match(id,/^\d{4}$/); assertions++
  for(const field of ['math','english']){assert.ok(row[field]===null||typeof row[field]==='number'&&row[field]>=0&&row[field]<=100);assertions++}
 }
 check(a.getAcademics(place('pub-2351','Public')).schoolNumber,'2351')
 check(a.getAcademics(place('chr-0412-c1')).schoolNumber,'0412')
 check(a.getAcademics(place('county:Charter:422', 'Charter','Test',{county:{dataset:'Charter schools',record:{id:'0422'}}})).schoolNumber,'0422')
 check(a.getAcademics(place('county:Public:2351','Public')).schoolNumber,'2351')
 const gs=(stateId,type='charter',state='FL')=>({greatSchools:{stateId,type,state}})
 check(a.getAcademics(place('chr-0412','Charter','Wrong merged name',gs('130422'))).schoolNumber,'0422')
 check(a.getAcademics(place('chr-0412','Charter','Wrong merged name',gs('139999'))),null)
 check(a.getAcademics(place('chr-0412','Charter','Test',gs('060412'))),null)
 check(a.getAcademics(place('chr-0412','Charter','Test',gs('130412','charter','NY'))),null)
 check(a.getAcademics(place('chr-0412','Charter','Test',gs('not-a-state-id'))),null)
 check(a.getAcademics(place('gs:x','Charter','Test',gs('FL-13-0422'))).schoolNumber,'0422')
 check(a.getAcademics(place('chr-0412','Private')),null)
 check(a.getAcademics(place('chr-0412','Charter','Test',gs('130412','private'))),null)
 check(a.getAcademics(place('pub-2351','Childcare')),null)
 check(a.getAcademics(place('pub-2351','Head Start')),null)
 for(const [name,id]of Object.entries(raw.verifiedNameAliases)) {
  check(a.getAcademics(place('chr-None-c4','Charter',name)).schoolNumber,id)
  check(a.getAcademics(place('county:Charter:'+name+':25,-80','Charter',name,{county:{dataset:'Charter schools',record:{id:''}}})).schoolNumber,id)
  check(a.getAcademics(place('chr-9999','Charter',name)),null)
  check(a.getAcademics(place('chr-99999','Charter',name)),null)
  check(a.getAcademics(place('chr-None-c4','Private',name)),null)
  check(a.getAcademics(place('chr-None-c4','Charter',name+' annex')),null)
  check(a.getAcademics(place('chr-None-c4','Charter',name,{county:{dataset:'Charter schools',record:{id:'9999'}}})),null)
 }
 const doral=directory.find(p=>p.id==='chr-None-c4')
 check(a.getAcademics({...doral,sources:{}}).schoolNumber,'5219')
 check(a.getAcademics({...doral,sources:{}}).math,96)
 check(a.getAcademics({...doral,sources:{}}).english,96)
 check(a.getAcademics(place('chr-4002','Charter','Beacon College Prep K-8')).schoolNumber,'6034')
 check(a.getAcademics(place('gs:beacon','Charter','Beacon',gs('134002'))).schoolNumber,'6034')
 check(a.getAcademics(place('chr-0412','Charter','AcadeMir Charter School East Middle')).schoolNumber,'0412')
 check(a.getAcademics(place('chr-None-c1','Charter','Mater Lakes Academy')),null)
 check(a.getAcademics(place('chr-None-c1','Charter','Mater Brickell Preparatory Academy')),null)
 let covered=0
 for(const p of directory){const result=a.getAcademics({...p,sources:{}});if(result)covered++;if(!['Public','Charter'].includes(p.kind))check(result,null)}
 const unique=new Set(directory.map(p=>a.getAcademics({...p,sources:{}})?.schoolNumber).filter(Boolean))
 console.log(JSON.stringify({assertions,rows:473,directoryRecords:directory.length,coveredLocations:covered,uniqueSchoolsCovered:unique.size,missingEnglish:Object.values(raw.schools).filter(r=>r.english===null).length,missingMath:Object.values(raw.schools).filter(r=>r.math===null).length,realZeros:Object.values(raw.schools).filter(r=>r.math===0||r.english===0).length,aliases:Object.keys(raw.verifiedNameAliases).length},null,2))
}finally{await server.close()}
