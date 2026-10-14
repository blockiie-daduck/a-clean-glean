(function (global) {
  'use strict';
  function serialize(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  function summarize(accounts, states, tiers) {
    const codes = new Set(states.map(s => s.code));
    const counts = Object.fromEntries(states.map(s => [s.code, 0]));
    let unknown = 0, outside = 0, mapped = 0;
    const matching = accounts.filter(a => tiers.includes(a.tier));
    for (const account of matching) {
      if (!account.state) unknown++;
      else if (!codes.has(account.state)) outside++;
      else { counts[account.state]++; mapped++; }
    }
    return {counts, mapped, unknown, outside, total: matching.length, matching};
  }
  function scaleMax(accounts, states) {
    return Math.max(1, ...Object.values(summarize(accounts, states, [1,2,3,4]).counts));
  }
  function sampleAccounts() {
    const counts = {CA:34,TX:39,NY:22,IL:20,MA:15,WA:13,FL:19,CO:8,GA:11,NC:10,VA:12,PA:9,OH:7,MI:6,NJ:7,AZ:5,OR:4,MN:6,AK:2,HI:1,DC:5};
    const accounts = [];
    for (const [state,count] of Object.entries(counts)) {
      for(let i=0;i<count;i++) accounts.push({id:state+'-'+i,name:'Sample '+state+' Account '+String(i+1).padStart(2,'0'),state,tier:(i%4)+1});
    }
    accounts.push({id:'outside-1',name:'Sample International Account',state:'Outside US',tier:2}, {id:'unknown-1',name:'Sample Unlocated Account',state:'',tier:1});
    return accounts;
  }
  function parseTable(input) {
    const text = String(input || '').replace(/^\uFEFF/, '');
    if (!text.trim()) throw new Error('Paste a table or choose a CSV file first.');
    const first = text.split(/\r?\n/, 1)[0];
    const delimiter = first.includes('\t') && !first.includes(',') ? '\t' : ',';
    const rows = []; let row = [], field = '', quoted = false, justClosed = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { quoted = false; justClosed = true; }
        else field += ch;
      } else if (ch === '"') {
        if (field !== '' || justClosed) throw new Error('Unexpected quote near row ' + (rows.length + 1) + '.');
        quoted = true;
      } else if (ch === delimiter) { row.push(field); field = ''; justClosed = false; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); if (row.some(cell => cell !== '')) rows.push(row);
        row = []; field = ''; justClosed = false;
      } else if (justClosed && ch !== ' ') throw new Error('Unexpected text after a quoted value near row ' + (rows.length + 1) + '.');
      else if (!justClosed) field += ch;
    }
    if (quoted) throw new Error('A quoted value is not closed.');
    row.push(field); if (row.some(cell => cell !== '')) rows.push(row);
    if (rows.length < 2) throw new Error('Include a header row and at least one data row.');
    const width = rows[0].length;
    if (rows[0].some(h => !h.trim())) throw new Error('Every column needs a header.');
    const problems = rows.slice(1).flatMap((r, index) => r.length === width ? [] : ['Row ' + (index + 2) + ' has ' + r.length + ' columns; expected ' + width + '.']);
    if (problems.length) throw new Error(problems.slice(0, 5).join(' '));
    return {headers:rows[0].map(h => h.trim()), rows:rows.slice(1).map(r => r.map(v => v.trim()))};
  }
  function normalizeState(value, states) {
    const raw = String(value ?? '').trim();
    if (!raw || /^(?:—|-|unknown|n\/?a|not specified)$/i.test(raw)) return '';
    const match = states.find(s => s.code.toLowerCase() === raw.toLowerCase() || s.name.toLowerCase() === raw.toLowerCase());
    return match ? match.code : raw;
  }
  function mapRows(parsed, mapping, template, states) {
    const required = template === 'map' ? ['name','state','tier'] : template === 'trend' ? ['date','value'] : ['category','value'];
    for (const field of required) if (mapping[field] === undefined || !parsed.headers.includes(mapping[field])) throw new Error('Map the ' + field + ' column.');
    const indices = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, parsed.headers.indexOf(header)]));
    const data = [], errors = [], warnings = [], keys = new Set();
    for (let i = 0; i < parsed.rows.length; i++) {
      const source = parsed.rows[i], rowNumber = i + 2, get = field => indices[field] < 0 || indices[field] === undefined ? '' : source[indices[field]];
      if (template === 'map') {
        const name=get('name'), state=normalizeState(get('state'),states), tierText=get('tier');
        const match=/^(?:Tier\s*)?([1-4])$/i.exec(tierText);
        if (!name) { errors.push('Row '+rowNumber+': account name is empty.'); continue; }
        if (!match) { errors.push('Row '+rowNumber+': tier must be 1–4.'); continue; }
        const id=get('id'); const key=id ? 'id:'+id.trim().toLowerCase() : 'name:'+name.toLowerCase()+'|'+state.toLowerCase();
        if (keys.has(key)) warnings.push('Row '+rowNumber+': possible duplicate account '+name+'.');
        keys.add(key); data.push({id:id||'row-'+rowNumber,name,state,tier:Number(match[1])});
      } else if (template === 'trend') {
        const date=get('date'), valueText=get('value'), series=get('series')||'Value';
        const parsedDate=/^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date+'T00:00:00Z') : null;
        if (!parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10)!==date) { errors.push('Row '+rowNumber+': use a real date in YYYY-MM-DD format.'); continue; }
        const value=Number(valueText);
        if (!valueText || !Number.isFinite(value)) { errors.push('Row '+rowNumber+': value must be a number.'); continue; }
        const key=date+'|'+series.toLowerCase(); if (keys.has(key)) { errors.push('Row '+rowNumber+': date and series are repeated.'); continue; }
        keys.add(key); data.push({date,value,series,note:get('note')});
      } else {
        const category=get('category'), valueText=get('value'), value=Number(valueText);
        if (!category) { errors.push('Row '+rowNumber+': category is empty.'); continue; }
        if (!valueText || !Number.isFinite(value)) { errors.push('Row '+rowNumber+': value must be a number.'); continue; }
        const key=category.toLowerCase(); if (keys.has(key)) { errors.push('Row '+rowNumber+': category is repeated.'); continue; }
        keys.add(key); data.push({category,value,note:get('note')});
      }
    }
    if (errors.length) throw new Error(errors.slice(0,8).join(' ') + (errors.length>8?' '+(errors.length-8)+' more rows need correction.':''));
    if (!data.length) throw new Error('No valid data rows were found.');
    if (template==='trend') data.sort((a,b)=>a.date.localeCompare(b.date)||a.series.localeCompare(b.series));
    return {data,warnings};
  }
  function validateProject(value, states) {
    if (!value || value.schemaVersion !== 1) throw new Error('This project file uses an unsupported version.');
    if (!['map','trend','comparison'].includes(value.templateId)) throw new Error('This project has an unknown visual type.');
    if (!Array.isArray(value.data) || !value.data.length || value.data.length > 10000) throw new Error('Project data must contain 1–10,000 rows.');
    if (!value.theme || !/^#[0-9a-f]{6}$/i.test(value.theme.primary)) throw new Error('Project brand color must be a six-digit hex value.');
    if (value.theme.font && !['system','jakarta','serif','mono'].includes(value.theme.font)) throw new Error('Project font choice is unsupported.');
    if (value.theme.logo && (!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value.theme.logo) || value.theme.logo.length > 1400000)) throw new Error('Project logo must be a PNG or JPEG under 1 MB.');
    if (!value.presentation || typeof value.presentation.title !== 'string' || typeof value.presentation.subtitle !== 'string' || typeof value.presentation.source !== 'string') throw new Error('Project presentation settings are invalid.');
    if (value.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Every project row must be an object.');
    if (value.templateId==='map' && value.data.some(row => typeof row.name!=='string' || typeof row.state!=='string' || !Number.isInteger(row.tier) || row.tier<1 || row.tier>4)) throw new Error('Map project rows must have an account name, state, and numeric tier 1–4.');
    if (value.templateId==='map' && value.data.some(row => normalizeState(row.state,states)!==row.state)) throw new Error('Map project states must use normalized postal abbreviations or an outside-US label.');
    if (value.templateId==='trend' && value.data.some(row => typeof row.date!=='string' || typeof row.value!=='number' || !Number.isFinite(row.value) || typeof row.series!=='string')) throw new Error('Trend project rows must have a date, numeric value, and series.');
    if (value.templateId==='comparison' && value.data.some(row => typeof row.category!=='string' || typeof row.value!=='number' || !Number.isFinite(row.value))) throw new Error('Comparison project rows must have a category and numeric value.');
    const headers = value.templateId==='map'?['name','state','tier','id']:value.templateId==='trend'?['date','value','series','note']:['category','value','note'];
    const parsed = {headers,rows:value.data.map(row=>headers.map(h=>String(row[h]??'')))};
    mapRows(parsed,Object.fromEntries(headers.map(h=>[h,h])),value.templateId,states);
    return value;
  }
  global.AccountMap = {serialize,summarize,scaleMax,sampleAccounts,parseTable,normalizeState,mapRows,validateProject};
})(globalThis);
