(function (global) {
  'use strict';
  function mount(root, config) {
    const {states,accounts} = config;
    let tiers = [1,2,3,4], selected = null, query = '';
    const maximum = AccountMap.scaleMax(accounts, states);
    root.classList.add('visual-export');
    root.style.setProperty('--visual-primary', config.theme?.primary || '#3158d5');
    root.style.fontFamily=config.theme?.font==='jakarta'?'"Plus Jakarta Sans",ui-sans-serif,sans-serif':config.theme?.font==='serif'?'Georgia,serif':config.theme?.font==='mono'?'ui-monospace,Menlo,Consolas,monospace':'ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    root.innerHTML = `<header class="visual-header"><div class="eyebrow">Account strategy / US coverage</div><h1></h1><p class="subtitle"></p><div class="metadata"><span class="sample-badge">Synthetic sample data</span><span class="source"></span></div></header>
      <section class="metrics" aria-label="Account summary"><div><span>Matching accounts</span><strong id="total"></strong></div><div><span>Mapped accounts</span><strong id="mapped"></strong></div><div><span>States + DC with accounts</span><strong id="covered"></strong></div><div><span>Outside US / unknown</span><strong id="unmapped"></strong></div></section>
      <section class="filter-row"><div class="tier-controls" aria-label="Filter account tiers"></div><button class="reset">Reset view</button></section>
      <div class="workspace"><section class="map-card" aria-label="US account concentration"><div class="card-heading"><div><h2>Where your target accounts cluster</h2><p>Select a state to explore its accounts.</p></div><span class="snapshot">Data snapshot</span></div><div class="map-wrap"><svg viewBox="0 0 975 610" role="group" aria-label="US states. Use the state list below as an alternative."></svg></div><div class="legend"><span class="zero-key"></span><span>0 accounts</span><span class="gradient"></span><span class="legend-range"></span></div><p class="map-note">Alaska and Hawaii shown as insets. Colors use the same scale across tier filters.</p><div class="hover-status" role="status" aria-live="polite">Hover or focus on a state to see its tier breakdown.</div></section>
      <aside class="detail-card"><div class="eyebrow">State explorer</div><h2 class="detail-title">Choose a state</h2><p class="detail-description">Select the map or a state in the list to inspect the accounts behind the count.</p><div class="tier-breakdown"></div><label class="search-label" hidden>Find an account<input type="search" placeholder="Search account names" aria-label="Search selected state accounts"></label><div class="account-list"></div></aside></div>
      <details class="table-panel" open><summary>Explore states as a table</summary><div class="state-table"></div></details>
      <details class="excluded-panel"><summary class="excluded-summary"></summary><div class="excluded-list"></div></details>
      <footer>Map geometry: US Atlas 3.0.1 / US Census Bureau, 2017. Sample records are fictional. This visual does not fetch live data.</footer>`;
    const find = selector => root.querySelector(selector);
    find('h1').textContent = config.title;
    find('.subtitle').textContent = config.subtitle;
    find('.source').textContent = config.source;
    if (config.theme?.logo) {
      const logo=document.createElement('img');logo.className='visual-logo';logo.src=config.theme.logo;logo.alt='Brand logo';
      find('.visual-header').insertBefore(logo,find('h1'));
    }
    if (config.dataDate) {
      const date=document.createElement('span');date.textContent='Data date: '+config.dataDate;find('.metadata').appendChild(date);
    }
    if (config.sample === false) find('.sample-badge').remove();
    if (config.embedded) {
      find('.visual-header').hidden = true;
      find('.card-heading p').textContent = 'Select a state to explore its accounts. Filters apply only to this map section.';
    }
    if (config.sample === false) find('footer').textContent = 'Map geometry: US Atlas 3.0.1 / US Census Bureau, 2017. Account data source: '+(config.source||'not supplied')+'. This snapshot does not fetch live data.';
    find('.legend-range').textContent = '1–'+maximum+' accounts';
    const svg = find('svg');
    const paths = new Map();
    for (const state of states) {
      if (state.code === 'DC') continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',state.path); path.setAttribute('tabindex','0'); path.setAttribute('role','button'); path.setAttribute('fill-rule','evenodd');
      path.dataset.state = state.code;
      path.addEventListener('click',()=>select(state.code));
      path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(state.code);}});
      path.addEventListener('mouseenter',()=>describe(state.code)); path.addEventListener('focus',()=>describe(state.code));
      paths.set(state.code,path); svg.appendChild(path);
    }
    const dc = document.createElement('button'); dc.className='dc-button'; dc.textContent='District of Columbia'; dc.addEventListener('click',()=>select('DC')); find('.map-wrap').appendChild(dc);
    for (let tier=1;tier<=4;tier++) {
      const button=document.createElement('button'); button.className='tier-button tier-'+tier; button.textContent='Tier '+tier; button.dataset.tier=tier;
      button.addEventListener('click',()=>{tiers=tiers.includes(tier)?tiers.filter(t=>t!==tier):[...tiers,tier];render();});
      find('.tier-controls').appendChild(button);
    }
    find('.reset').addEventListener('click',()=>{tiers=[1,2,3,4];selected=null;query='';find('input').value='';render();});
    find('input').addEventListener('input',e=>{query=e.target.value;renderDetails();});
    function select(code) {selected=code;query='';find('input').value='';render();}
    function describe(code) {
      const summary=AccountMap.summarize(accounts,states,tiers), state=states.find(s=>s.code===code);
      const rows=summary.matching.filter(a=>a.state===code);
      find('.hover-status').textContent=state.name+' · '+rows.length+' matching accounts · '+[1,2,3,4].map(t=>'Tier '+t+': '+rows.filter(a=>a.tier===t).length).join(' / ');
    }
    function addAccount(container, account) {
      const item=document.createElement('div');item.className='account-row';
      const name=document.createElement('span');name.textContent=account.name;
      const badge=document.createElement('span');badge.className='account-tier tier-'+account.tier;badge.textContent='Tier '+account.tier;
      item.append(name,badge);container.appendChild(item);
    }
    function renderDetails() {
      const panel=find('.account-list'), breakdown=find('.tier-breakdown');panel.replaceChildren();breakdown.replaceChildren();
      find('.search-label').hidden=!selected;
      if(!selected){find('.detail-title').textContent='Choose a state';find('.detail-description').textContent='Select the map or a state in the list to inspect the accounts behind the count.';return;}
      const state=states.find(s=>s.code===selected), rows=accounts.filter(a=>a.state===selected&&tiers.includes(a.tier));
      find('.detail-title').textContent=state.name;
      find('.detail-description').textContent=rows.length+' matching accounts · '+selected;
      for(let tier=1;tier<=4;tier++){const item=document.createElement('div');item.className='breakdown-item tier-'+tier;item.textContent='Tier '+tier+' · '+rows.filter(a=>a.tier===tier).length;breakdown.appendChild(item);}
      const filtered=rows.filter(a=>a.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
      for(const account of filtered)addAccount(panel,account);
      if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent=query?'No accounts match your search.':'No accounts match these tier filters.';panel.appendChild(p);}
    }
    function render() {
      const summary=AccountMap.summarize(accounts,states,tiers);
      find('#total').textContent=summary.total;find('#mapped').textContent=summary.mapped;find('#covered').textContent=Object.values(summary.counts).filter(n=>n>0).length;find('#unmapped').textContent=summary.outside+' / '+summary.unknown;
      for(const button of root.querySelectorAll('.tier-button'))button.setAttribute('aria-pressed',String(tiers.includes(Number(button.dataset.tier))));
      const primary=config.theme?.primary||'#3158d5';
      for(const state of states){const path=paths.get(state.code);if(!path)continue;const n=summary.counts[state.code];path.style.fill=n?`color-mix(in srgb, ${primary} ${25+75*n/maximum}%, white)`:'#edf0f3';path.setAttribute('aria-label',state.name+', '+n+' matching accounts');path.setAttribute('aria-pressed',String(selected===state.code));path.classList.toggle('selected',selected===state.code);}
      dc.setAttribute('aria-pressed',String(selected==='DC'));dc.textContent='DC · '+summary.counts.DC;
      const table=document.createElement('table');table.innerHTML='<thead><tr><th scope="col">State</th><th scope="col">Accounts</th><th scope="col">Tier 1</th><th scope="col">Tier 2</th><th scope="col">Tier 3</th><th scope="col">Tier 4</th></tr></thead><tbody></tbody>';
      for(const state of [...states].sort((a,b)=>summary.counts[b.code]-summary.counts[a.code]||a.name.localeCompare(b.name))){const tr=document.createElement('tr'),td=document.createElement('td'),button=document.createElement('button');button.textContent=state.name;button.setAttribute('aria-pressed',String(selected===state.code));button.addEventListener('click',()=>{select(state.code);find('.detail-title').scrollIntoView({block:'nearest'});});td.appendChild(button);tr.appendChild(td);for(const n of [summary.counts[state.code],...[1,2,3,4].map(t=>summary.matching.filter(a=>a.state===state.code&&a.tier===t).length)]){const cell=document.createElement('td');cell.textContent=n;tr.appendChild(cell);}table.querySelector('tbody').appendChild(tr);}
      find('.state-table').replaceChildren(table);
      find('.excluded-summary').textContent='Outside US / unknown location — '+(summary.outside+summary.unknown)+' matching accounts';
      const excluded=find('.excluded-list');excluded.replaceChildren();for(const account of summary.matching.filter(a=>!states.some(s=>s.code===a.state))){const group=document.createElement('div'),label=document.createElement('small');label.textContent=account.state||'Unknown location';group.appendChild(label);addAccount(group,account);excluded.appendChild(group);}
      renderDetails();
      if(selected)describe(selected);else find('.hover-status').textContent=tiers.length?'Hover or focus on a state to see its tier breakdown.':'No tiers selected. Choose a tier to show accounts.';
    }
    render();
  }
  global.mountAccountMap=mount;
})(globalThis);
