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

test('funnel import preserves stage order and rejects invalid values or repeated stages',()=>{
  const mapping={stage:'stage',value:'value'};
  const data=A.mapRows(A.parseTable('stage,value\nIdentified,120\nEngaged,75\nQualified,30'),mapping,'funnel',states).data;
  assert.equal(data.map(row=>row.stage).join(','),'Identified,Engaged,Qualified');
  assert.throws(()=>A.mapRows(A.parseTable('stage,value\nA,-1'),mapping,'funnel',states),/non-negative/);
  assert.throws(()=>A.mapRows(A.parseTable('stage,value\nA,2\na,1'),mapping,'funnel',states),/repeated/);
});

test('scatter import keeps signed axes and rejects duplicate accounts or negative size',()=>{
  const mapping={name:'name',x:'x',y:'y',size:'size',segment:'segment'};
  const data=A.mapRows(A.parseTable('name,x,y,size,segment\nA,-2,4,0,Priority\nB,3,-5,,Watch'),mapping,'scatter',states).data;
  assert.equal(data[0].x,-2);assert.equal(data[1].y,-5);assert.equal(data[1].size,1);
  const grouped=A.mapRows(A.parseTable('name,x,y,segment\nA,1,2,Tier 1\nB,2,3,tier 1'),{name:'name',x:'x',y:'y',segment:'segment'},'scatter',states).data;
  assert.equal(grouped[1].segment,'Tier 1');
  assert.throws(()=>A.mapRows(A.parseTable('name,x,y\nA,1,2\na,3,4'),{name:'name',x:'x',y:'y'},'scatter',states),/repeated/);
  assert.throws(()=>A.mapRows(A.parseTable('name,x,y,size\nA,1,2,-1'),{name:'name',x:'x',y:'y',size:'size'},'scatter',states),/non-negative/);
});

test('heatmap import retains signed cells and rejects repeated intersections',()=>{
  const mapping={row:'row',column:'column',value:'value'};
  const data=A.mapRows(A.parseTable('row,column,value\nEnterprise,Security,4\nGrowth,Security,-2'),mapping,'heatmap',states).data;
  assert.equal(data[1].value,-2);
  const grouped=A.mapRows(A.parseTable('row,column,value\nEnterprise,Security,4\nenterprise,Finance,2'),mapping,'heatmap',states).data;
  assert.equal(grouped[1].row,'Enterprise');
  assert.throws(()=>A.mapRows(A.parseTable('row,column,value\nA,B,1\na,b,2'),mapping,'heatmap',states),/repeated/);
});

test('radial progress import preserves ring order and checks values against positive targets',()=>{
  const mapping={label:'label',value:'value',target:'target',note:'note'};
  const data=A.mapRows(A.parseTable('label,value,target,note\nReach,125,100,over target\nMeetings,0,40,not started'),mapping,'radial',states).data;
  assert.equal(data.map(row=>row.label).join(','),'Reach,Meetings');
  assert.equal(data[0].value/data[0].target,1.25);
  assert.equal(data[1].value,0);
  assert.throws(()=>A.mapRows(A.parseTable('label,value,target\nA,-1,10'),mapping,'radial',states),/non-negative/);
  assert.throws(()=>A.mapRows(A.parseTable('label,value,target\nA,1,0'),mapping,'radial',states),/positive/);
  assert.throws(()=>A.mapRows(A.parseTable('label,value,target\nA,1,10\na,2,10'),mapping,'radial',states),/repeated/);
});

test('project validation preserves canonical data and rejects invalid files',()=>{
  const project={schemaVersion:1,templateId:'map',data:[{id:'a',name:'A',state:'CA',tier:1}],theme:{primary:'#3158d5',logo:''},presentation:{title:'Map',subtitle:'',source:'Source',unit:'',dataDate:''},sample:false};
  assert.equal(A.validateProject(JSON.parse(JSON.stringify(project)),states).data[0].state,'CA');
  assert.throws(()=>A.validateProject({...project,schemaVersion:2},states),/unsupported/);
  assert.throws(()=>A.validateProject({...project,data:[{name:'A',state:'California',tier:1}]},states),/normalized/);
  assert.throws(()=>A.validateProject({...project,data:[{name:'A',state:'CA',tier:'1'}]},states),/numeric tier/);
  const scatter={...project,templateId:'scatter',data:[{name:'A',x:3,y:4,size:1,segment:'Tier 1',note:''}]};
  assert.equal(A.validateProject(scatter,states).data[0].name,'A');
  assert.throws(()=>A.validateProject({...scatter,data:[{...scatter.data[0],size:-1}]},states),/size/);
  const radial={...project,templateId:'radial',data:[{label:'Reach',value:125,target:100,note:''}]};
  assert.equal(A.validateProject(radial,states).data[0].value,125);
  assert.throws(()=>A.validateProject({...radial,data:[{...radial.data[0],target:0}]},states),/positive target/);
});

test('all bundled artifacts have inline code, a print rule, and parsable scripts',async()=>{
  for(const path of ['dist/index.html','dist/account-map.html','dist/examples/trend.html','dist/examples/comparison.html','dist/examples/funnel.html','dist/examples/scatter.html','dist/examples/heatmap.html','dist/examples/radial.html']){
    const html=await readFile(path,'utf8');assert.ok(html.includes('<!doctype html>'));
    assert.ok(!/<script[^>]+src=|<link[^>]+href=|\bfetch\s*\(/.test(html),path);
    assert.ok((html.match(/<\/script>/g)||[]).length===1,path);
    new vm.Script(html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>')));
    if(path==='dist/index.html')assert.ok(html.includes('SIL OPEN FONT LICENSE'),path);
    if(path==='dist/index.html'||path==='dist/account-map.html')assert.ok(html.includes('US Atlas'),path);
    if(path!=='dist/index.html')assert.ok(html.includes('@page { size: auto !important; }'));
  }
});
