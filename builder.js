(function () {
  'use strict';
  const A=window.AccountMap, assets=window.BuilderAssets;
  const templates={
    map:{label:'US account map',purpose:'Explore account coverage by state and tier.',required:['name','state','tier'],optional:['id'],fields:{name:'Account name',state:'HQ state',tier:'Tier',id:'Account ID'},defaults:{title:'Where target accounts cluster',subtitle:'Explore headquarters coverage and tier distribution, one state at a time.',unit:''},columns:'name,state,tier,id'},
    trend:{label:'Trend chart',purpose:'Compare values over time and filter series.',required:['date','value'],optional:['series','note'],fields:{date:'Date',value:'Value',series:'Series',note:'Annotation'},defaults:{title:'Performance over time',subtitle:'Select a series and date range to explore the trend.',unit:''},columns:'date,value,series,note'},
    comparison:{label:'Ranked bars',purpose:'Rank categories, search, and inspect exact values.',required:['category','value'],optional:['note'],fields:{category:'Category',value:'Value',note:'Annotation'},defaults:{title:'How categories compare',subtitle:'Sort and search the ranked values.',unit:''},columns:'category,value,note'},
    funnel:{label:'Pipeline funnel',purpose:'Compare ordered stages and inspect stage-to-stage change.',required:['stage','value'],optional:['note'],fields:{stage:'Stage',value:'Value',note:'Annotation'},defaults:{title:'How accounts move through the funnel',subtitle:'Explore stage totals and conversion from the previous stage.',unit:'accounts'},columns:'stage,value,note'},
    scatter:{label:'Account scatterplot',purpose:'Explore two numeric measures, account size, and segments.',required:['name','x','y'],optional:['size','segment','note'],fields:{name:'Account name',x:'X value',y:'Y value',size:'Bubble size',segment:'Segment',note:'Annotation'},defaults:{title:'Which accounts deserve attention',subtitle:'Compare fit and intent across target accounts.',unit:'',xLabel:'Intent score',yLabel:'Fit score'},columns:'name,x,y,size,segment,note'},
    heatmap:{label:'Category heatmap',purpose:'Compare values across two category dimensions.',required:['row','column','value'],optional:['note'],fields:{row:'Row category',column:'Column category',value:'Value',note:'Annotation'},defaults:{title:'Where activity concentrates',subtitle:'Explore the intersections between two dimensions.',unit:'accounts',xLabel:'Columns',yLabel:'Rows'},columns:'row,column,value,note'}
  };
  const samples={
    map:A.sampleAccounts(),
    trend:[['2026-01-01',34,29],['2026-02-01',41,32],['2026-03-01',47,30],['2026-04-01',45,38],['2026-05-01',52,44],['2026-06-01',61,49]].flatMap(([date,a,b])=>[{date,value:a,series:'Engaged accounts',note:''},{date,value:b,series:'Meetings',note:''}]),
    comparison:[['Security',82],['Operations',66],['Finance',49],['Product',73],['People',28],['Other',13]].map(([category,value])=>({category,value,note:''})),
    funnel:[['Identified',520],['Engaged',310],['Qualified',156],['Opportunity',64],['Customer',18]].map(([stage,value])=>({stage,value,note:''})),
    scatter:[['Acme West',82,75,24,'Tier 1'],['Northstar',69,88,16,'Tier 1'],['Bluebird',45,63,10,'Tier 2'],['Cedar Works',77,43,12,'Tier 2'],['Evergreen',35,29,7,'Tier 3'],['Harbor Labs',55,52,9,'Tier 3'],['Redstone',92,67,20,'Tier 1']].map(([name,x,y,size,segment])=>({name,x,y,size,segment,note:''})),
    heatmap:[['Enterprise','Security',42],['Enterprise','Operations',31],['Enterprise','Finance',19],['Mid-market','Security',35],['Mid-market','Operations',27],['Mid-market','Finance',14],['Growth','Security',24],['Growth','Operations',18],['Growth','Finance',9]].map(([row,column,value])=>({row,column,value,note:''}))
  };
  let project=sampleProject('map');
  let parsed=null,pending=null,dirty=false;
  const $=selector=>document.querySelector(selector);
  const el=(tag,klass,text,parent)=>{const node=document.createElement(tag);if(klass)node.className=klass;if(text!==undefined)node.textContent=text;if(parent)parent.appendChild(node);return node;};
  function sampleProject(id){const spec=templates[id];return {schemaVersion:1,templateId:id,data:structuredClone(samples[id]),theme:{primary:'#3158d5',font:'system',logo:''},presentation:{title:spec.defaults.title,subtitle:spec.defaults.subtitle,source:'Synthetic example · no live connection',dataDate:'',unit:spec.defaults.unit,xLabel:spec.defaults.xLabel||'',yLabel:spec.defaults.yLabel||''},sample:true};}
  function status(message,kind='info'){const box=$('#status');box.textContent=message;box.dataset.kind=kind;}
  function markDirty(){dirty=true;$('#save-project').classList.add('dirty');}
  function configFor(p){if(p.templateId==='map')return {states:assets.states,accounts:p.data,title:p.presentation.title,subtitle:p.presentation.subtitle,source:p.presentation.source,dataDate:p.presentation.dataDate,theme:p.theme,sample:p.sample};return p;}
  function artifact(p){
    A.validateProject(p,assets.states);
    const isMap=p.templateId==='map',style=(p.theme.font==='jakarta'?assets.fontCSS:'')+(isMap?assets.mapCSS:assets.chartCSS);
    const scripts=assets.core+'\n'+(isMap?assets.mapJS:assets.chartJS)+'\n'+(isMap?'mountAccountMap':'mountChart')+'(document.getElementById("visual"),'+A.serialize(configFor(p))+');';
    const title=p.presentation.title.replace(/[<>&"]/g,'');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>@page { size: auto !important; }\n'+style+'</style></head><body><main id="visual"></main><script>'+scripts+'<'+'/script>'+(isMap?'<!-- '+assets.mapLicense.replace(/--/g,'—')+' -->':'')+'</body></html>';
  }
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function readFile(file){if(!file)throw new Error('Choose a file first.');if(file.size>5_000_000)throw new Error('Keep imported files under 5 MB.');return await file.text();}
  function preview(){
    try{const html=artifact(project);$('#preview').srcdoc=html;$('#preview-caption').textContent=(project.sample?'Synthetic sample':'Imported snapshot')+' · '+project.data.length.toLocaleString()+' records · '+templates[project.templateId].label;}
    catch(error){status(error.message,'error');}
  }
  function showProject(){
    for(const button of document.querySelectorAll('[data-template]'))button.setAttribute('aria-pressed',String(button.dataset.template===project.templateId));
    $('#visual-name').textContent=templates[project.templateId].label;
    for(const key of ['title','subtitle','source','dataDate','unit','xLabel','yLabel'])$('#field-'+key).value=project.presentation[key]||'';
    $('#field-primary').value=project.theme.primary;
    $('#field-font').value=project.theme.font||'system';
    $('#color-code').textContent=project.theme.primary.toUpperCase();
    $('#logo-name').textContent=project.theme.logo?'Embedded PNG/JPEG logo':'No logo selected';
    $('#unit-row').hidden=project.templateId==='map';
    $('#axis-row').hidden=!['scatter','heatmap'].includes(project.templateId);
    $('#data-count').textContent=project.data.length.toLocaleString()+' '+(project.templateId==='map'?'accounts':'rows')+(project.sample?' · synthetic sample':' · imported snapshot');
    $('#format-hint').textContent='Required: '+templates[project.templateId].required.map(key=>templates[project.templateId].fields[key]).join(', ')+'. Optional: '+templates[project.templateId].optional.map(key=>templates[project.templateId].fields[key]).join(', ')+'.';
    $('#column-mapping').replaceChildren();$('#duplicate-review').hidden=true;$('#import-input').value='';$('#paste-table').value='';parsed=null;pending=null;
    preview();
  }
  function suggest(field,headers){const aliases={name:['account name','company','company name'],state:['hq state','headquarters state','region'],tier:['account tier','priority tier'],id:['account id','company id'],date:['period','month','day'],value:['count','amount','total','metric'],series:['group','segment'],category:['industry','label'],stage:['pipeline stage','funnel stage'],x:['intent','intent score','x value'],y:['fit','fit score','y value'],size:['pipeline','pipeline value','bubble size'],segment:['group','tier'],row:['industry','row category'],column:['region','column category'],note:['annotation','comment']};return headers.find(h=>h.toLowerCase()===field)||headers.find(h=>(aliases[field]||[]).includes(h.toLowerCase()))||'';}
  function showMappings(){
    const container=$('#column-mapping');container.replaceChildren();
    const spec=templates[project.templateId];el('p','mapping-help','Choose which input column supplies each field.',container);
    for(const field of [...spec.required,...spec.optional]){
      const label=el('label','mapping-label',spec.fields[field]+(spec.required.includes(field)?' *':''),container);label.htmlFor='map-'+field;
      const select=el('select','',undefined,label);select.id='map-'+field;select.dataset.field=field;
      for(const header of ['',...parsed.headers]){const option=el('option','',header||'Choose column',select);option.value=header;}
      select.value=suggest(field,parsed.headers);
    }
    $('#apply-import').hidden=false;
    status(parsed.rows.length.toLocaleString()+' data rows parsed. Check column assignments, then apply.');
  }
  function applyData(data){project.data=data;project.sample=false;project.presentation.source='Imported table · source not supplied';$('#field-source').value=project.presentation.source;parsed=null;pending=null;$('#duplicate-review').hidden=true;$('#column-mapping').replaceChildren();$('#apply-import').hidden=true;$('#data-count').textContent=data.length.toLocaleString()+' '+(project.templateId==='map'?'accounts':'rows')+' · imported snapshot';markDirty();preview();status('Imported '+data.length.toLocaleString()+' rows. Enter the source and review the preview before export.','success');}
  function uniqueAccounts(rows){const keys=new Set();return rows.filter(row=>{const key=row.id&&!/^row-\d+$/.test(row.id)?'id:'+row.id.trim().toLowerCase():'name:'+row.name.trim().toLowerCase()+'|'+row.state.toLowerCase();if(keys.has(key))return false;keys.add(key);return true;});}
  function gleanPrompt(){const spec=templates[project.templateId], label=spec.label, fields=[...spec.required,...spec.optional].map(key=>spec.fields[key]);return `Populate the attached ${label} HTML artifact with my authorized Glean data. Replace every synthetic example row with real records; do not add invented accounts, dates, categories, or values. Supply these columns: ${fields.join(', ')}. Keep the existing HTML, CSS, JavaScript, SVG geometry, filters, keyboard controls, and table behavior. Provide a source name and data date. Flag records with missing or uncertain fields instead of guessing. Remove the Synthetic sample data label only after all sample records are replaced. Verify totals against the source, then let me test the interactions in Canvas. This exported file is a snapshot; do not describe it as live or automatically refreshed.`;}
  for(const button of document.querySelectorAll('[data-template]'))button.addEventListener('click',()=>{if(button.dataset.template===project.templateId)return;const theme=structuredClone(project.theme);project=sampleProject(button.dataset.template);project.theme=theme;dirty=false;$('#save-project').classList.remove('dirty');showProject();status('Loaded '+templates[project.templateId].label+' with synthetic example data.');});
  for(const key of ['title','subtitle','source','dataDate','unit','xLabel','yLabel'])$('#field-'+key).addEventListener('input',event=>{project.presentation[key]=event.target.value;markDirty();preview();});
  $('#field-primary').addEventListener('input',event=>{project.theme.primary=event.target.value;$('#color-code').textContent=event.target.value.toUpperCase();markDirty();preview();});
  $('#field-font').addEventListener('change',event=>{project.theme.font=event.target.value;markDirty();preview();});
  $('#logo-file').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(!['image/png','image/jpeg'].includes(file.type)||file.size>1_000_000)throw new Error('Logo must be a PNG or JPEG under 1 MB.');const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read logo.'));reader.readAsDataURL(file);});project.theme.logo=url;$('#logo-name').textContent=file.name;markDirty();preview();status('Logo embedded in this project and future HTML exports.','success');}catch(error){status(error.message,'error');}});
  $('#clear-logo').addEventListener('click',()=>{project.theme.logo='';$('#logo-file').value='';$('#logo-name').textContent='No logo selected';markDirty();preview();});
  $('#parse-import').addEventListener('click',async()=>{try{const file=$('#import-input').files[0],text=file?await readFile(file):$('#paste-table').value;parsed=A.parseTable(text);showMappings();}catch(error){status(error.message,'error');}});
  $('#apply-import').addEventListener('click',()=>{try{const mapping=Object.fromEntries([...document.querySelectorAll('#column-mapping select')].map(node=>[node.dataset.field,node.value]));const result=A.mapRows(parsed,mapping,project.templateId,assets.states);if(result.warnings.length){pending=result.data;$('#duplicate-review').hidden=false;$('#duplicate-messages').textContent=result.warnings.slice(0,8).join(' ') +(result.warnings.length>8?' '+(result.warnings.length-8)+' more possible duplicates.':'');status('Review possible duplicate accounts before applying.','warning');}else applyData(result.data);}catch(error){status(error.message,'error');}});
  $('#keep-duplicates').addEventListener('click',()=>{if(pending)applyData(pending);});
  $('#remove-duplicates').addEventListener('click',()=>{if(pending)applyData(uniqueAccounts(pending));});
  $('#load-sample').addEventListener('click',()=>{const id=project.templateId,theme=structuredClone(project.theme),presentation=structuredClone(project.presentation);project=sampleProject(id);project.theme=theme;project.presentation={...presentation,source:'Synthetic example · no live connection'};markDirty();showProject();status('Synthetic example restored.','success');});
  $('#save-project').addEventListener('click',()=>{try{A.validateProject(project,assets.states);download('a-clean-glean-'+project.templateId+'.json',JSON.stringify(project,null,2),'application/json');dirty=false;$('#save-project').classList.remove('dirty');status('Editable project downloaded. Keep it with the source data you trust.','success');}catch(error){status(error.message,'error');}});
  $('#open-project').addEventListener('change',async event=>{try{const value=JSON.parse(await readFile(event.target.files[0]));A.validateProject(value,assets.states);project=value;dirty=false;$('#save-project').classList.remove('dirty');showProject();status('Project opened and validated.','success');}catch(error){status('Could not open project: '+error.message,'error');}event.target.value='';});
  $('#save-brand').addEventListener('click',()=>{download('a-clean-glean-brand.json',JSON.stringify({schemaVersion:1,name:'Brand preset',primary:project.theme.primary,font:project.theme.font||'system',logo:project.theme.logo},null,2),'application/json');status('Brand preset downloaded.','success');});
  $('#open-brand').addEventListener('change',async event=>{try{const value=JSON.parse(await readFile(event.target.files[0]));if(value.schemaVersion!==1||!/^#[0-9a-f]{6}$/i.test(value.primary)||typeof value.logo!=='string'||(value.logo&&!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value.logo))||value.logo.length>1400000||!['system','jakarta','serif','mono'].includes(value.font||'system'))throw new Error('Brand preset is invalid or unsupported.');project.theme={primary:value.primary,font:value.font||'system',logo:value.logo};$('#field-primary').value=value.primary;$('#field-font').value=project.theme.font;$('#color-code').textContent=value.primary.toUpperCase();$('#logo-name').textContent=value.logo?'Embedded PNG/JPEG logo':'No logo selected';markDirty();preview();status('Brand preset applied.','success');}catch(error){status(error.message,'error');}event.target.value='';});
  $('#download-html').addEventListener('click',()=>{try{download('a-clean-glean-'+project.templateId+'.html',artifact(project),'text/html');status('HTML snapshot downloaded. Upload the .html file to Glean Canvas and test it there.','success');}catch(error){status(error.message,'error');}});
  $('#copy-html').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(artifact(project));status('HTML copied. If Glean cannot access pasted code, upload the downloaded .html file instead.','success');}catch(error){status('Clipboard unavailable. Use Download HTML.','error');}});
  $('#download-template').addEventListener('click',()=>{try{const sample=sampleProject(project.templateId);sample.theme=structuredClone(project.theme);download('a-clean-glean-'+project.templateId+'-sample.html',artifact(sample),'text/html');status('Synthetic sample HTML downloaded. Use the Glean population prompt to request authorized data.','success');}catch(error){status(error.message,'error');}});
  $('#copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(gleanPrompt());status('Glean population prompt copied. Attach the sample .html file with it.','success');}catch(error){status('Clipboard unavailable. Select and copy the prompt below.','error');}});
  $('#show-prompt').addEventListener('click',()=>{const area=$('#prompt-text');area.hidden=!area.hidden;area.value=gleanPrompt();});
  function setPreviewExpanded(expanded){$('#toggle-preview').setAttribute('aria-expanded',String(expanded));$('#toggle-preview').textContent=expanded?'Close preview':'Expand preview';$('.builder-preview').classList.toggle('is-expanded',expanded);document.body.classList.toggle('preview-open',expanded);}
  $('#toggle-preview').addEventListener('click',()=>setPreviewExpanded($('#toggle-preview').getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#toggle-preview').getAttribute('aria-expanded')==='true')setPreviewExpanded(false);});
  showProject();status('Choose a visual. The preview shows synthetic example data until you import your own table.');
})();
