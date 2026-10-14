(function (global) {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { const el=document.createElementNS(NS,tag);for(const [name,value] of Object.entries(attrs))el.setAttribute(name,String(value));parent.appendChild(el);return el; }
  function textEl(tag,text,klass,parent) { const el=document.createElement(tag);if(klass)el.className=klass;el.textContent=text;parent.appendChild(el);return el; }
  function amount(value,unit){return new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(value)+(unit?' '+unit:'');}
  function mount(root, config) {
    const {templateId,data,presentation,theme}=config;
    root.replaceChildren();root.className='chart-export';root.style.setProperty('--visual-primary',theme.primary);
    root.style.fontFamily=theme.font==='jakarta'?'"Plus Jakarta Sans",ui-sans-serif,sans-serif':theme.font==='serif'?'Georgia,serif':theme.font==='mono'?'ui-monospace,Menlo,Consolas,monospace':'ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    const header=textEl('header','',null,root);header.textContent='';
    const visualNames={trend:'Trend chart',comparison:'Ranked comparison',funnel:'Pipeline funnel',scatter:'Account scatterplot',heatmap:'Category heatmap'};
    textEl('div','A Clean Glean / '+visualNames[templateId],'chart-eyebrow',header);
    if(theme.logo){const logo=document.createElement('img');logo.src=theme.logo;logo.alt='Brand logo';logo.className='chart-logo';header.appendChild(logo);}
    textEl('h1',presentation.title,'',header);textEl('p',presentation.subtitle,'chart-subtitle',header);
    const meta=textEl('div','', 'chart-meta',header);if(config.sample)textEl('span','Synthetic sample data','chart-sample',meta);
    textEl('span',presentation.source||'Source not supplied','',meta);if(presentation.dataDate)textEl('span','Data date: '+presentation.dataDate,'',meta);
    const controls=textEl('div','', 'chart-controls',root);
    const figure=textEl('section','', 'chart-panel',root);figure.setAttribute('aria-label',visualNames[templateId]);
    const svg=svgEl('svg',{viewBox:'0 0 900 430',role:'img','aria-label':'Interactive chart. Use the data table below to inspect exact values.'},figure);
    const status=textEl('p','Select a mark or table row for details.','chart-detail',root);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const tableWrap=textEl('details','', 'chart-table-wrap',root);tableWrap.open=true;textEl('summary','Explore the data as a table','',tableWrap);
    const table=textEl('table','', 'chart-table',tableWrap);
    const unit=presentation.unit||'';
    function clear(){svg.replaceChildren();table.replaceChildren();}
    function axisLabel(x,y,label){const el=svgEl('text',{x,y,fill:'#60748a','font-size':11,'text-anchor':'middle'},svg);el.textContent=label;}
    function focusable(el,label,description){el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.addEventListener('click',()=>status.textContent=description);el.addEventListener('focus',()=>status.textContent=description);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();status.textContent=description;}});}
    function tableRows(headers,rows){
      const head=document.createElement('thead'),tr=document.createElement('tr');head.appendChild(tr);table.appendChild(head);
      for(const label of headers){const th=textEl('th',label,'',tr);th.scope='col';}
      const body=document.createElement('tbody');table.appendChild(body);
      for(const values of rows){const row=document.createElement('tr');body.appendChild(row);for(const value of values)textEl('td',String(value??''),'',row);}
    }
    function renderTrend(){
      clear();status.textContent='Select a point or read the table for details.';const chosen=[...controls.querySelectorAll('[data-series][aria-pressed="true"]')].map(b=>b.dataset.series);
      const from=controls.querySelector('[name="from"]').value,to=controls.querySelector('[name="to"]').value;
      const filtered=data.filter(d=>chosen.includes(d.series)&&(!from||d.date>=from)&&(!to||d.date<=to));
      if(!filtered.length){axisLabel(450,210,'No values match the selected filters.');return;}
      const dates=[...new Set(filtered.map(d=>d.date))].sort(), values=filtered.map(d=>d.value);
      let low=Math.min(0,...values),high=Math.max(0,...values);if(low===high){low-=1;high+=1;}
      const x=d=>95+(dates.length===1?355:710*dates.indexOf(d)/(dates.length-1));
      const y=v=>345-275*(v-low)/(high-low);
      for(let i=0;i<=4;i++){const v=low+(high-low)*i/4,yy=y(v);svgEl('line',{x1:95,y1:yy,x2:805,y2:yy,stroke:'#e5eaf1'},svg);const label=svgEl('text',{x:84,y:yy+4,'text-anchor':'end',fill:'#66788c','font-size':11},svg);label.textContent=amount(v,unit);}
      const ticks=dates.filter((_,i)=>i===0||i===dates.length-1||i%Math.max(1,Math.ceil(dates.length/7))===0);
      for(const date of ticks)axisLabel(x(date),378,date);
      const colors=[theme.primary,'#14926b','#d9901f','#687589','#9b55ad'];
      chosen.forEach((series,index)=>{
        const rows=filtered.filter(d=>d.series===series), color=colors[index%colors.length];
        if(rows.length>1)svgEl('polyline',{points:rows.map(d=>x(d.date)+','+y(d.value)).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round'},svg);
        for(const d of rows){const description=series+' · '+d.date+' · '+amount(d.value,unit)+(d.note?' · '+d.note:'');const mark=svgEl('circle',{cx:x(d.date),cy:y(d.value),r:6,fill:color,stroke:'#fff','stroke-width':2},svg);focusable(mark,description,description);}
      });
      const head=document.createElement('thead');head.innerHTML='<tr><th scope="col">Date</th><th scope="col">Series</th><th scope="col">Value</th><th scope="col">Note</th></tr>';table.appendChild(head);
      const body=document.createElement('tbody');table.appendChild(body);
      for(const d of filtered){const tr=document.createElement('tr');for(const val of [d.date,d.series,amount(d.value,unit),d.note||''])textEl('td',val,'',tr);body.appendChild(tr);}
    }
    function renderComparison(){
      clear();status.textContent='Select a bar or read the table for details.';const sort=controls.querySelector('[name="sort"]').value,query=controls.querySelector('[name="category-search"]').value.toLowerCase();
      const filtered=data.filter(d=>d.category.toLowerCase().includes(query)).sort((a,b)=>sort==='desc'?b.value-a.value||a.category.localeCompare(b.category):sort==='asc'?a.value-b.value||a.category.localeCompare(b.category):a.category.localeCompare(b.category));
      if(!filtered.length){axisLabel(450,210,'No categories match your search.');return;}
      const maxAbs=Math.max(1,...data.map(d=>Math.abs(d.value))),hasNegative=data.some(d=>d.value<0),left=hasNegative?455:225,right=820;
      svgEl('line',{x1:left,y1:55,x2:left,y2:385,stroke:'#52657c','stroke-width':1.5},svg);
      const visible=filtered.slice(0,12),step=Math.min(27,310/visible.length);
      visible.forEach((d,index)=>{
        const yy=65+index*step,width=(d.value<0?170:right-left-15)*Math.abs(d.value)/maxAbs;
        const label=svgEl('text',{x:hasNegative?210:200,y:yy+11,'text-anchor':'end',fill:'#263d57','font-size':11},svg);label.textContent=d.category.length>27?d.category.slice(0,26)+'…':d.category;
        const bar=svgEl('rect',{x:d.value>=0?left:left-width,y:yy,width:Math.max(1,width),height:step-5,rx:3,fill:theme.primary},svg);
        const description=d.category+' · '+amount(d.value,unit)+(d.note?' · '+d.note:'');focusable(bar,description,description);
        const value=svgEl('text',{x:d.value>=0?left+width+7:left-width-7,y:yy+11,'text-anchor':d.value>=0?'start':'end',fill:'#465d78','font-size':11},svg);value.textContent=amount(d.value,unit);
      });
      if(filtered.length>12)status.textContent='Showing the first 12 categories in the chart. The table lists all '+filtered.length+'.';
      const head=document.createElement('thead');head.innerHTML='<tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Note</th></tr>';table.appendChild(head);
      const body=document.createElement('tbody');table.appendChild(body);
      for(const d of filtered){const tr=document.createElement('tr');for(const val of [d.category,amount(d.value,unit),d.note||''])textEl('td',val,'',tr);body.appendChild(tr);}
    }
    function renderFunnel(){
      clear();status.textContent='Select a stage or read the table for exact values.';
      const metric=controls.querySelector('[name="funnel-metric"]').value;
      const max=Math.max(1,...data.map(d=>d.value)),first=data[0].value,visible=data.slice(0,8),step=Math.min(46,345/visible.length);
      visible.forEach((d,i)=>{
        const y=48+i*step,width=510*d.value/max,previous=i?data[i-1].value:null;
        const pct=previous===null?'Starting stage':previous===0?'No prior base':(100*d.value/previous).toFixed(1)+'% of previous';
        const description=d.stage+' · '+amount(d.value,unit)+' · '+pct+(d.note?' · '+d.note:'');
        const label=svgEl('text',{x:215,y:y+step/2+4,'text-anchor':'end',fill:'#263d57','font-size':12},svg);label.textContent=d.stage.length>25?d.stage.slice(0,24)+'…':d.stage;
        const bar=svgEl('rect',{x:235,y,width:Math.max(2,width),height:Math.max(20,step-10),rx:5,fill:theme.primary,opacity:1-i*.055},svg);focusable(bar,description,description);
        const shown=metric==='conversion'?(previous===null?'Start':pct):amount(d.value,unit);
        const value=svgEl('text',{x:Math.min(820,245+width),y:y+step/2+4,fill:'#263d57','font-size':11},svg);value.textContent=shown;
      });
      if(data.length>8)status.textContent='Showing the first 8 stages in the chart. The table lists all '+data.length+'.';
      tableRows(['Stage','Value','Vs previous','Vs first','Note'],data.map((d,i)=>[d.stage,amount(d.value,unit),i===0?'Starting stage':data[i-1].value?(100*d.value/data[i-1].value).toFixed(1)+'%':'No prior base',first?(100*d.value/first).toFixed(1)+'%':'No starting base',d.note||'']));
    }
    function renderScatter(){
      clear();const query=controls.querySelector('[name="account-search"]').value.trim().toLowerCase();
      const xInput=controls.querySelector('[name="min-x"]').value,yInput=controls.querySelector('[name="min-y"]').value;
      const minX=xInput===''?-Infinity:Number(xInput),minY=yInput===''?-Infinity:Number(yInput);
      const chosen=new Set([...controls.querySelectorAll('[data-segment][aria-pressed="true"]')].map(button=>button.dataset.segment));
      const filtered=data.filter(d=>chosen.has(d.segment)&&d.x>=minX&&d.y>=minY&&d.name.toLowerCase().includes(query));
      status.textContent=filtered.length+' of '+data.length+' accounts match. Select a bubble for details.';
      const xs=data.map(d=>d.x),ys=data.map(d=>d.y);let loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
      if(loX===hiX){loX-=1;hiX+=1;}if(loY===hiY){loY-=1;hiY+=1;}
      const x=d=>95+710*(d.x-loX)/(hiX-loX),y=d=>345-285*(d.y-loY)/(hiY-loY);
      for(let i=0;i<=4;i++){
        const xx=95+710*i/4,yy=345-285*i/4;
        svgEl('line',{x1:xx,y1:60,x2:xx,y2:345,stroke:'#e8edf2'},svg);svgEl('line',{x1:95,y1:yy,x2:805,y2:yy,stroke:'#e8edf2'},svg);
        const xl=svgEl('text',{x:xx,y:365,'text-anchor':'middle',fill:'#60748a','font-size':11},svg);xl.textContent=amount(loX+(hiX-loX)*i/4,'');
        const yl=svgEl('text',{x:80,y:yy+4,'text-anchor':'end',fill:'#60748a','font-size':11},svg);yl.textContent=amount(loY+(hiY-loY)*i/4,'');
      }
      axisLabel(450,410,presentation.xLabel||'X value');
      const vertical=svgEl('text',{x:20,y:200,transform:'rotate(-90 20 200)','text-anchor':'middle',fill:'#60748a','font-size':12},svg);vertical.textContent=presentation.yLabel||'Y value';
      const segments=[...new Set(data.map(d=>d.segment))],colors=[theme.primary,'#14926b','#d9901f','#8d60a8','#cb6c55','#637b91'],maxSize=Math.max(1,...data.map(d=>d.size));
      for(const d of filtered.slice(0,500)){
        const color=colors[segments.indexOf(d.segment)%colors.length],r=5+9*Math.sqrt(d.size/maxSize);
        const description=d.name+' · '+(presentation.xLabel||'X')+': '+amount(d.x,'')+' · '+(presentation.yLabel||'Y')+': '+amount(d.y,'')+' · '+d.segment+(d.note?' · '+d.note:'');
        const mark=svgEl('circle',{cx:x(d),cy:y(d),r,fill:color,'fill-opacity':.77,stroke:'#fff','stroke-width':1.5},svg);focusable(mark,description,description);
      }
      if(filtered.length>500)status.textContent='Showing 500 of '+filtered.length+' matching bubbles. The table lists all matching rows.';
      tableRows(['Account',presentation.xLabel||'X value',presentation.yLabel||'Y value','Size','Segment','Note'],filtered.map(d=>[d.name,amount(d.x,''),amount(d.y,''),amount(d.size,''),d.segment,d.note||'']));
    }
    function renderHeatmap(){
      clear();const rowQuery=controls.querySelector('[name="row-search"]').value.trim().toLowerCase(),columnQuery=controls.querySelector('[name="column-search"]').value.trim().toLowerCase();
      const allRows=[...new Set(data.map(d=>d.row))],allColumns=[...new Set(data.map(d=>d.column))];
      let rows=allRows.filter(name=>name.toLowerCase().includes(rowQuery));const columns=allColumns.filter(name=>name.toLowerCase().includes(columnQuery));
      if(controls.querySelector('[name="row-sort"]').value==='total'){
        const totals=new Map();for(const d of data)totals.set(d.row,(totals.get(d.row)||0)+d.value);
        rows.sort((a,b)=>(totals.get(b)||0)-(totals.get(a)||0));
      }
      const filtered=data.filter(d=>rows.includes(d.row)&&columns.includes(d.column));
      status.textContent=filtered.length+' of '+data.length+' cells match. Select a cell for details.';
      if(!rows.length||!columns.length){axisLabel(450,210,'No categories match the search.');tableRows(['Row','Column','Value','Note'],[]);return;}
      const shownRows=rows.slice(0,8),shownColumns=columns.slice(0,8),width=640/shownColumns.length,height=300/shownRows.length;
      const cellKey=(row,column)=>JSON.stringify([row,column]);
      const lookup=new Map(data.map(d=>[cellKey(d.row,d.column),d])),maxAbs=Math.max(1,...data.map(d=>Math.abs(d.value)));
      const rgb=[1,3,5].map(i=>parseInt(theme.primary.slice(i,i+2),16)),negative=data.some(d=>d.value<0);
      shownColumns.forEach((name,j)=>{const t=svgEl('text',{x:225+j*width+width/2,y:53,'text-anchor':'middle',fill:'#334960','font-size':11},svg);t.textContent=name.length>13?name.slice(0,12)+'…':name;});
      shownRows.forEach((name,i)=>{
        const t=svgEl('text',{x:212,y:68+i*height+height/2+4,'text-anchor':'end',fill:'#334960','font-size':11},svg);t.textContent=name.length>24?name.slice(0,23)+'…':name;
        shownColumns.forEach((column,j)=>{
          const d=lookup.get(cellKey(name,column)),ratio=d?Math.abs(d.value)/maxAbs:0,alpha=.16+.76*ratio,color=d?(d.value<0?[192,91,53]:rgb):null;
          const cell=svgEl('rect',{x:225+j*width,y:68+i*height,width:width-3,height:height-3,rx:5,fill:d?'rgba('+color.join(',')+','+alpha+')':'#f0f3f6'},svg);
          if(d){const description=name+' / '+column+' · '+amount(d.value,unit)+(d.note?' · '+d.note:'');focusable(cell,description,description);const value=svgEl('text',{x:225+j*width+width/2,y:68+i*height+height/2+4,'text-anchor':'middle',fill:alpha>.62?'#fff':'#263d57','font-size':11,'pointer-events':'none'},svg);value.textContent=amount(d.value,'');}
        });
      });
      const legend=svgEl('text',{x:225,y:400,fill:'#60748a','font-size':11},svg);legend.textContent='Pale = smaller magnitude · '+(negative?'Orange = negative · ':'')+'Gray = no data';
      if(rows.length>8||columns.length>8)status.textContent='Showing the first 8 rows and columns. The table lists all '+filtered.length+' matching cells.';
      tableRows([presentation.yLabel||'Row',presentation.xLabel||'Column','Value','Note'],filtered.map(d=>[d.row,d.column,amount(d.value,unit),d.note||'']));
    }
    if(templateId==='trend'){
      const label=textEl('span','Series: ','chart-label',controls);label.setAttribute('aria-hidden','true');
      for(const series of [...new Set(data.map(d=>d.series))]){const button=textEl('button',series,'chart-filter',controls);button.dataset.series=series;button.setAttribute('aria-pressed','true');button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));renderTrend();});}
      for(const [name,labelText] of [['from','From'],['to','To']]){const label=textEl('label',labelText,'chart-date-label',controls);const input=document.createElement('input');input.type='date';input.name=name;input.addEventListener('input',renderTrend);label.appendChild(input);}
      renderTrend();
    } else if(templateId==='comparison'){
      const label=textEl('label','Sort','chart-sort-label',controls),select=document.createElement('select');select.name='sort';select.innerHTML='<option value="desc">Highest first</option><option value="asc">Lowest first</option><option value="name">Category name</option>';select.addEventListener('change',renderComparison);label.appendChild(select);
      const searchLabel=textEl('label','Find category','chart-search-label',controls),input=document.createElement('input');input.type='search';input.name='category-search';input.placeholder='Search categories';input.addEventListener('input',renderComparison);searchLabel.appendChild(input);renderComparison();
    } else if(templateId==='funnel'){
      const label=textEl('label','Show','chart-sort-label',controls),select=document.createElement('select');select.name='funnel-metric';select.innerHTML='<option value="count">Stage values</option><option value="conversion">Conversion from previous</option>';select.addEventListener('change',renderFunnel);label.appendChild(select);renderFunnel();
    } else if(templateId==='scatter'){
      for(const segment of [...new Set(data.map(d=>d.segment))]){const button=textEl('button',segment,'chart-filter',controls);button.dataset.segment=segment;button.setAttribute('aria-pressed','true');button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));renderScatter();});}
      const search=textEl('label','Find account','chart-search-label',controls),input=document.createElement('input');input.type='search';input.name='account-search';input.placeholder='Search accounts';input.addEventListener('input',renderScatter);search.appendChild(input);
      for(const [name,labelText] of [['min-x','Minimum X'],['min-y','Minimum Y']]){const label=textEl('label',labelText,'chart-sort-label',controls),field=document.createElement('input');field.type='number';field.name=name;field.placeholder='Any';field.addEventListener('input',renderScatter);label.appendChild(field);}renderScatter();
    } else if(templateId==='heatmap'){
      for(const [name,labelText] of [['row-search','Find row'],['column-search','Find column']]){const label=textEl('label',labelText,'chart-search-label',controls),field=document.createElement('input');field.type='search';field.name=name;field.placeholder='Search '+(name==='row-search'?'rows':'columns');field.addEventListener('input',renderHeatmap);label.appendChild(field);}
      const sortLabel=textEl('label','Row order','chart-sort-label',controls),sort=document.createElement('select');sort.name='row-sort';sort.innerHTML='<option value="source">Source order</option><option value="total">Highest total</option>';sort.addEventListener('change',renderHeatmap);sortLabel.appendChild(sort);renderHeatmap();
    }
    textEl('footer','Interactive snapshot · Values remain fixed until a new artifact is exported.','chart-footer',root);
  }
  global.mountChart=mount;
})(globalThis);
