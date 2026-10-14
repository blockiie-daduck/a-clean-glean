import {readFile,mkdir,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const paths=['core.js','runtime.js','charts.js','styles.css','charts.css','builder.js','builder.css','assets/states.json','builder.html'];
const [core,mapJS,chartJS,mapCSS,chartCSS,builderJS,builderCSS,statesText,builderShell]=await Promise.all(paths.map(path=>readFile(path,'utf8')));
const [mapLicense,fontLicense]=await Promise.all(['assets/US-ATLAS-LICENSE.txt','assets/fonts/OFL.txt'].map(path=>readFile(path,'utf8')));
const [latin,latinExt]=await Promise.all(['assets/fonts/plus-jakarta-sans-latin.woff2','assets/fonts/plus-jakarta-sans-latin-ext.woff2'].map(path=>readFile(path)));
const fontCSS='/* Plus Jakarta Sans · SIL Open Font License 1.1\n'+fontLicense.replace(/\*\//g,'* /')+'\n*/'+
  '@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:400 600;font-display:swap;src:url(data:font/woff2;base64,'+latinExt.toString('base64')+') format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}'+
  '@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:400 600;font-display:swap;src:url(data:font/woff2;base64,'+latin.toString('base64')+') format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}';
const states=JSON.parse(statesText),context={};vm.runInNewContext(core,context);
const safe=context.AccountMap.serialize;
function standalone(templateId,data,title,subtitle,source){
  const map=templateId==='map';
  const config=map?{states,accounts:data,title,subtitle,source,theme:{primary:'#3158d5',logo:''},sample:true}:{templateId,data,presentation:{title,subtitle,source,dataDate:'',unit:''},theme:{primary:'#3158d5',logo:''},sample:true};
  const script=core+'\n'+(map?mapJS:chartJS)+'\n'+(map?'mountAccountMap':'mountChart')+'(document.getElementById("visual"),'+safe(config)+');';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>@page { size: auto !important; }\n'+(map?mapCSS:chartCSS)+'</style></head><body><main id="visual"></main><script>'+script+'</'+'script>'+(map?'<!-- '+mapLicense.replace(/--/g,'—')+' -->':'')+'</body></html>';
}
const trend=[['2026-01-01',34,29],['2026-02-01',41,32],['2026-03-01',47,30],['2026-04-01',45,38],['2026-05-01',52,44],['2026-06-01',61,49]].flatMap(([date,a,b])=>[{date,value:a,series:'Engaged accounts',note:''},{date,value:b,series:'Meetings',note:''}]);
const comparison=[['Security',82],['Operations',66],['Finance',49],['Product',73],['People',28],['Other',13]].map(([category,value])=>({category,value,note:''}));
const assets={core,mapJS,chartJS,mapCSS,chartCSS,fontCSS,mapLicense,states};
const builder=builderShell.replace('</body>','<!-- '+mapLicense.replace(/--/g,'—')+' --></body>').replace('/* BUILDER_CSS */',fontCSS+builderCSS).replace('/* BUILDER_SCRIPT */',core+'\nwindow.BuilderAssets='+safe(assets)+';\n'+builderJS);
await mkdir('dist',{recursive:true});await mkdir('dist/examples',{recursive:true});
await Promise.all([
  writeFile('dist/index.html',builder),
  writeFile('dist/account-map.html',standalone('map',context.AccountMap.sampleAccounts(),'A clearer view of your target accounts','Explore headquarters coverage and tier distribution — one state at a time.','Synthetic example · no live connection')),
  writeFile('dist/examples/trend.html',standalone('trend',trend,'Performance over time','Select a series and date range to explore the trend.','Synthetic example · no live connection')),
  writeFile('dist/examples/comparison.html',standalone('comparison',comparison,'How categories compare','Sort and search the ranked values.','Synthetic example · no live connection'))
]);
console.log('Built visual builder and three standalone examples ('+states.length+' state/DC geometries).');
