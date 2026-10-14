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
    textEl('div','A Clean Glean / '+(templateId==='trend'?'Trend chart':'Ranked comparison'),'chart-eyebrow',header);
    if(theme.logo){const logo=document.createElement('img');logo.src=theme.logo;logo.alt='Brand logo';logo.className='chart-logo';header.appendChild(logo);}
    textEl('h1',presentation.title,'',header);textEl('p',presentation.subtitle,'chart-subtitle',header);
    const meta=textEl('div','', 'chart-meta',header);if(config.sample)textEl('span','Synthetic sample data','chart-sample',meta);
    textEl('span',presentation.source||'Source not supplied','',meta);if(presentation.dataDate)textEl('span','Data date: '+presentation.dataDate,'',meta);
    const controls=textEl('div','', 'chart-controls',root);
    const figure=textEl('section','', 'chart-panel',root);figure.setAttribute('aria-label',templateId==='trend'?'Trend chart':'Ranked comparison chart');
    const svg=svgEl('svg',{viewBox:'0 0 900 430',role:'img','aria-label':'Interactive chart. Use the data table below to inspect exact values.'},figure);
    const status=textEl('p','Select a mark or table row for details.','chart-detail',root);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const tableWrap=textEl('details','', 'chart-table-wrap',root);tableWrap.open=true;textEl('summary','Explore the data as a table','',tableWrap);
    const table=textEl('table','', 'chart-table',tableWrap);
    const unit=presentation.unit||'';
    function clear(){svg.replaceChildren();table.replaceChildren();}
    function axisLabel(x,y,label){const el=svgEl('text',{x,y,fill:'#60748a','font-size':11,'text-anchor':'middle'},svg);el.textContent=label;}
    function focusable(el,label,description){el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.addEventListener('click',()=>status.textContent=description);el.addEventListener('focus',()=>status.textContent=description);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();status.textContent=description;}});}
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
    if(templateId==='trend'){
      const label=textEl('span','Series: ','chart-label',controls);label.setAttribute('aria-hidden','true');
      for(const series of [...new Set(data.map(d=>d.series))]){const button=textEl('button',series,'chart-filter',controls);button.dataset.series=series;button.setAttribute('aria-pressed','true');button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));renderTrend();});}
      for(const [name,labelText] of [['from','From'],['to','To']]){const label=textEl('label',labelText,'chart-date-label',controls);const input=document.createElement('input');input.type='date';input.name=name;input.addEventListener('input',renderTrend);label.appendChild(input);}
      renderTrend();
    } else {
      const label=textEl('label','Sort','chart-sort-label',controls),select=document.createElement('select');select.name='sort';select.innerHTML='<option value="desc">Highest first</option><option value="asc">Lowest first</option><option value="name">Category name</option>';select.addEventListener('change',renderComparison);label.appendChild(select);
      const searchLabel=textEl('label','Find category','chart-search-label',controls),input=document.createElement('input');input.type='search';input.name='category-search';input.placeholder='Search categories';input.addEventListener('input',renderComparison);searchLabel.appendChild(input);renderComparison();
    }
    textEl('footer','Interactive snapshot · Values remain fixed until a new artifact is exported.','chart-footer',root);
  }
  global.mountChart=mount;
})(globalThis);
