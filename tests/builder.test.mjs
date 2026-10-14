import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={};vm.runInNewContext(await readFile('core.js','utf8'),context);
const A=context.AccountMap,states=JSON.parse(await readFile('assets/states.json','utf8'));

test('CSV and TSV import quoted values, multiline fields, BOM, and CRLF',()=>{
  const csv=A.parseTable('\uFEFFname,state,tier\r\n"Acme, Inc.",California,1\r\n"Line\nBreak",DC,Tier 2\r\n');
  assert.deepEqual([...csv.headers],['name','state','tier']);
  assert.equal(csv.rows[0][0],'Acme, Inc.');assert.equal(csv.rows[1][0],'Line\nBreak');
  const tsv=A.parseTable('date\tvalue\n2026-01-01\t10');assert.equal(tsv.rows[0][1],'10');
  assert.throws(()=>A.parseTable(''),/Paste a table/);
  assert.throws(()=>A.parseTable('a,b\n1'),/columns/);
});

test('map import normalizes states, keeps outside and unknown rows, flags duplicates',()=>{
  const parsed=A.parseTable('name,state,tier,id\nA,California,Tier 1,7\nB,DC,4,8\nA,CA,1,7\nC,Canada,2,9\nD,,3,10');
  const {data,warnings}=A.mapRows(parsed,{name:'name',state:'state',tier:'tier',id:'id'},'map',states);
  assert.equal(data.length,5);assert.equal(data[0].state,'CA');assert.equal(data[1].state,'DC');assert.equal(data[3].state,'Canada');assert.equal(data[4].state,'');assert.equal(warnings.length,1);
  const summary=A.summarize(data,states,[1,2,3,4]);assert.equal(summary.total,5);assert.equal(summary.mapped,3);assert.equal(summary.outside,1);assert.equal(summary.unknown,1);
});

test('trend import sorts dates and rejects invalid dates, values, and duplicate points',()=>{
  const table=A.parseTable('date,value,series,note\n2026-02-01,-3,A,late\n2026-01-01,2,A,early');
  const mapping={date:'date',value:'value',series:'series',note:'note'};
  const data=A.mapRows(table,mapping,'trend',states).data;
  assert.equal(data[0].date,'2026-01-01');assert.equal(data[1].value,-3);
  assert.throws(()=>A.mapRows(A.parseTable('date,value\n2026-02-30,4'),{date:'date',value:'value'},'trend',states),/real date/);
  assert.throws(()=>A.mapRows(A.parseTable('date,value\n2026-01-01,no'),{date:'date',value:'value'},'trend',states),/number/);
  assert.throws(()=>A.mapRows(A.parseTable('date,value\n2026-01-01,2\n2026-01-01,3'),{date:'date',value:'value'},'trend',states),/repeated/);
});

test('comparison import retains signed numbers and rejects duplicate categories',()=>{
  const mapping={category:'category',value:'value'};
  const data=A.mapRows(A.parseTable('category,value\nGrowth,7\nLoss,-2'),mapping,'comparison',states).data;
  assert.equal(data[1].value,-2);
  assert.throws(()=>A.mapRows(A.parseTable('category,value\nA,1\na,2'),mapping,'comparison',states),/repeated/);
});

test('project validation preserves canonical data and rejects invalid files',()=>{
  const project={schemaVersion:1,templateId:'map',data:[{id:'a',name:'A',state:'CA',tier:1}],theme:{primary:'#3158d5',logo:''},presentation:{title:'Map',subtitle:'',source:'Source',unit:'',dataDate:''},sample:false};
  assert.equal(A.validateProject(JSON.parse(JSON.stringify(project)),states).data[0].state,'CA');
  assert.throws(()=>A.validateProject({...project,schemaVersion:2},states),/unsupported/);
  assert.throws(()=>A.validateProject({...project,data:[{name:'A',state:'California',tier:1}]},states),/normalized/);
  assert.throws(()=>A.validateProject({...project,data:[{name:'A',state:'CA',tier:'1'}]},states),/numeric tier/);
});

test('all bundled artifacts have inline code, a print rule, and parsable scripts',async()=>{
  for(const path of ['dist/index.html','dist/account-map.html','dist/examples/trend.html','dist/examples/comparison.html']){
    const html=await readFile(path,'utf8');assert.ok(html.includes('<!doctype html>'));
    assert.ok(!/<script[^>]+src=|<link[^>]+href=|\bfetch\s*\(/.test(html),path);
    assert.ok((html.match(/<\/script>/g)||[]).length===1,path);
    new vm.Script(html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>')));
    if(path==='dist/index.html')assert.ok(html.includes('SIL OPEN FONT LICENSE'),path);
    if(path==='dist/index.html'||path==='dist/account-map.html')assert.ok(html.includes('US Atlas'),path);
    if(path!=='dist/index.html')assert.ok(html.includes('@page { size: auto !important; }'));
  }
});
