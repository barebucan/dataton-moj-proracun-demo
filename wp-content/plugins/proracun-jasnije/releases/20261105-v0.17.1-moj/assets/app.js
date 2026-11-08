(() => {
'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = new Intl.NumberFormat('hr-HR', {maximumFractionDigits:0});
const dec = new Intl.NumberFormat('hr-HR', {maximumFractionDigits:2});
const known = n => n !== null && n !== undefined;
const change = g => known(g.before)&&known(g.after)?g.after-g.before:null;
const unit=()=>data?.meta.currency==='HRK'?'kn':'€';
const euro = n => known(n)?`${dec.format(n/100)} ${unit()}`:'Nije navedeno';
const short = n => { if(!known(n))return 'Nije navedeno';const v=n/100, a=Math.abs(v); return a>=1e9?`${dec.format(v/1e9)} mlrd. ${unit()}`:a>=1e6?`${dec.format(v/1e6)} mil. ${unit()}`:a>=1e4?`${dec.format(v/1e3)} tis. ${unit()}`:euro(n); };
const signed = (n,compact=false) => known(n)?`${n>0?'+':n<0?'−':''}${(compact?short:euro)(Math.abs(n))}`:'—';
const pct = a => a._isPair?'Zbroj dva evidencijska zapisa':a._relatedGroup||a._reorganizationContext&&a.delta!==0?'Redak u preustroju; nije dokaz novog/ukinutog projekta':!known(a.before)||!known(a.after)||!known(a.delta)?'Nema usporedive osnovice':a.before<0||a.after<0?'Postotak nije primjenjiv':a.before>0 ? `${a.delta>0?'+':a.delta<0?'−':''}${Math.abs(a.delta/a.before*100)>0&&Math.abs(a.delta/a.before*100)<.01?'<0,01':dec.format(Math.abs(a.delta/a.before*100))} %` : a.after===0?'Oba plana nula':'Nulta osnovica';
const fold = s => String(s).toLocaleLowerCase('hr').replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const icons = {
 all:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 obrazovanje:'<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v6c4 3 8 3 12 0v-6M22 9v8"/>',
 kultura:'<path d="M3 5c4-2 6-1 9 1 3-2 5-3 9-1v14c-4-2-6-1-9 1-3-2-5-3-9-1Z"/><path d="M12 6v14"/>',
 socijalno:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 promet:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 18v3m8-3v3M9 15h.01M15 15h.01M9 6h6"/>',
 prostor:'<path d="M20 3c-9-1-16 4-15 10 0 4 4 6 7 4 5-2 7-8 8-14Z"/><path d="M4 21 16 8"/>',
 uprava:'<path d="m3 8 9-5 9 5M3 21h18M5 9v9m7-9v9m7-9v9M2 9h20"/>'
};
const icon = type=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[type]||icons.all}</svg>`;
const topics=[['all','Sve teme'],['obrazovanje','Obrazovanje'],['kultura','Kultura i sport'],['socijalno','Zdravstvo i skrb'],['promet','Promet'],['prostor','Prostor i okoliš'],['uprava','Uprava i ostalo']];
const itemTopics=a=>a.topics||[a.topic];
const topicName=k=>topics.find(t=>t[0]===k)?.[1]||k;
const type = a => a._isPair||a._relatedGroup||a._reorganizationContext&&a.delta!==0?'reorganization':!known(a.delta)?'unmatched':a.delta>0?'up':a.delta<0?'down':a.composition?'mix':'same';
const typeLabel = a => a._isPair?'Mogući prijenos · 2 zapisa':a._relatedGroup||a._reorganizationContext&&a.delta!==0?'Promjena izvornog retka':!known(a.delta)?'Bez usporedivog retka':a.delta>0?'Veći plan':a.delta<0?'Manji plan':a.composition?'Promjena raspodjele':'Isti plan';
let comparisonScope='pocetni',periodDraft=null,nameCounts=new Map(),rowContextCounts=new Map(),returnFocusTo=null,rowVisualMax=1;
let registry, activeCity, cityFilter='ready', cityQuery='', loadToken=0, routeLoading=false, bound=false;
const cityCache=new Map(),versionRequests=new Map(),baselineCache=new Map(),searchTextCache=new WeakMap();
let renderedListKey=null;
const listStateKey=()=>JSON.stringify([activeCity?.id,activeVersion?.id,[...selectedGroups].sort(),activeTopic,direction,query,sort,limit]);
let data, filtered=[], limit=12, activeTopic='all', direction='all', query='', sort='delta', selected=new Set(), current=null, detailTab='funds', toastTimer;
let presentationItems=[], activeVersion=null, selectedGroups=new Set(), initialMode=false;
const reviewedReorganizations={"version":1,"cityEvidence":{"osijek":{"url":"https://www.osijek.hr/wp-content/uploads/2026/07/503-izmjena_i_dopuna_Proracuna_Grada_Osijeka_2026-i-projekcija-2027-2028.docx","section":"III. Obrazloženje općeg dijela rebalansa","summary":"Obrazloženje navodi promjenu nadležnosti upravnih tijela i povezane organizacijske/programske klasifikacije; ukupni rashodi se ne mijenjaju.","sha256":"817a652b0cd3c8c8e360f548ef40d94b63e94fa3f486827c934e2aaad647d467"},"rijeka":{"url":"https://www.rijeka.hr/gradsko-vijece-grada-rijeke-usvojilo-odluku-o-reorganizaciji-gradske-uprave-i-prvi-rebalans-proracuna-za-2026/","section":"Službena objava Gradskog vijeća 21.5.2026.","summary":"Grad opisuje rebalans kao usklađivanje s novim ustrojstvom upravnih tijela uz nepromijenjen ukupni plan.","sha256":"7bbaacc1ff526d099855612c7bd08e1abac9c1a1ff409b4b24f77631f48822a3"}},"cities":{"karlovac":[],"osijek":[{"id":"202-20201-1184-k118406-372","beforeId":"202-20201-1184-k118406-372","afterId":"213-21301-1203-k120305-2252","amount":283200000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"202-20201-1184-a118402-320","beforeId":"202-20201-1184-a118402-320","afterId":"213-21301-1203-a120302-2221","amount":40000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"202-20201-1198-k119802-403","beforeId":"202-20201-1198-k119802-403","afterId":"213-21301-1205-k120502-2283","amount":30000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"202-20201-1184-k118405-367","beforeId":"202-20201-1184-k118405-367","afterId":"213-21301-1203-k120304-2247","amount":20000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"202-20201-1198-k119801-399","beforeId":"202-20201-1198-k119801-399","afterId":"213-21301-1205-k120501-2279","amount":2000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."}],"rijeka":[{"id":"k140404","beforeId":"k140404","afterId":"k100307","amount":521440000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"k106135","beforeId":"k106135","afterId":"k100301","amount":133800000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"k136229","beforeId":"k136229","afterId":"k100305","amount":60000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"k117649","beforeId":"k117649","afterId":"k100302","amount":5000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"a100136","beforeId":"a100136","afterId":"a100201","amount":2000000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"t132023","beforeId":"t132023","afterId":"t142302","amount":1500000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"k100121","beforeId":"k100121","afterId":"k100202","amount":500000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."},{"id":"a110611","beforeId":"a110611","afterId":"a110702","amount":80000,"qualification":"Podudarni zapisi nakon preustroja. Nije pronađena izričita službena mapa stare i nove šifre; povezivanje se temelji na jedinstvenom nazivu, jednakom iznosu i potpuno jednakim rastavima."}],"split":[],"zagreb":[]}};
const find=id=>presentationItems.find(a=>a.id===id)||data?.items.find(a=>a.id===id);
const beforeLabel=()=>data?.meta.beforeShort||'Plan prije';
const afterLabel=()=>data?.meta.afterShort||'Plan poslije';
const notify=text=>{ const t=$('#toast');t.textContent=text;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,3500); };
function bars(a,max=Math.max(a.before,a.after,1),large=false){
 if(data?.meta.kind!=='initial'&&!canVisualCompare(a)||data?.meta.kind==='initial'&&(!known(a.after)||a.after<0))return '';
 if(data?.meta.kind==='initial')return `<div class="paired-bars ${large?'large':''}"><div class="bar-caption"><span>Početni plan ${data.meta.year}.</span><strong>${esc(short(a.after))}</strong></div><div class="bar-track"><span class="bar-after same" style="width:${Math.max(0,a.after/max*100)}%"></span></div></div>`;
 return `<div class="paired-bars ${large?'large':''}" role="img" aria-label="${esc(beforeLabel())} ${esc(euro(a.before))}, ${esc(afterLabel())} ${esc(euro(a.after))}"><div class="bar-caption"><span>${esc(beforeLabel())}</span><strong>${esc(short(a.before))}</strong></div><div class="bar-track"><span class="bar-before" style="width:${Math.max(0,a.before/max*100)}%"></span></div><div class="bar-caption"><span>${esc(afterLabel())}</span><strong>${esc(short(a.after))}</strong></div><div class="bar-track"><span class="bar-after ${type(a)}" style="width:${Math.max(0,a.after/max*100)}%"></span></div></div>`;
}
function contextLabel(a){
 if(a.locations?.length>1)return 'Više nositelja, zbrojeno po šifri';
 const h=String(a.head||a.organization||'');
 if(/predškol|vrtić/i.test(h))return 'Predškolske ustanove';
 if(/osnovnoškol|osnovnog škol/i.test(h))return 'Osnovne škole';
 if(/srednjoškol|srednjeg škol/i.test(h))return 'Srednje škole';
 if(/javnozdrav/i.test(h))return 'Javnozdravstvene ustanove';
 if(/ustanove u kulturi/i.test(h))return 'Ustanove u kulturi';
 return h;
}
function prepareSourcePresentation(){
 const raw=data.items;for(const a of raw){delete a._identityContext;delete a._identityCode;delete a._relatedGroup;}const byId=new Map(raw.map(a=>[a.id,a])),consumed=new Set(),pairs=[];
 const signature=(a,field,side)=>JSON.stringify(a[field].filter(g=>g[side]).map(g=>[g.code,g[side]]).sort((x,y)=>x[0].localeCompare(y[0])));
 for(const link of !initialMode&&(!data.meta.history||data.meta.versionId==='osijek-2026-2'||data.meta.versionId==='rijeka-2026-1')?(reviewedReorganizations.cities[data.meta.slug]||[]):[]){
  const a=byId.get(link.beforeId),b=byId.get(link.afterId);
  const valid=a&&b&&a.id!==b.id&&!consumed.has(a.id)&&!consumed.has(b.id)&&a.originalName===b.originalName&&a.before===link.amount&&a.after===0&&b.before===0&&b.after===link.amount&&['funds','expenses'].every(f=>signature(a,f,'before')===signature(b,f,'after'));
  if(!valid)continue;
  const aggregate=field=>{const map=new Map();for(const item of [a,b])for(const g of item[field]){if(!map.has(g.code))map.set(g.code,{code:g.code,label:g.label,before:0,after:0,rows:[]});const out=map.get(g.code);out.before+=g.before;out.after+=g.after;out.rows.push(...g.rows);}return [...map.values()];};
  const id='related-'+a.id;const group={...a,id,code:a.code+' → '+b.code,before:a.before+b.before,after:a.after+b.after,delta:0,composition:false,transfer:true,reviewed:false,warning:null,_isPair:true,sourceBlocks:[a,b],citizenGroups:[...(a.citizenGroups||[]),...(b.citizenGroups||[])],pairEvidence:reviewedReorganizations.cityEvidence[data.meta.slug],linkQualification:link.qualification,funds:aggregate('funds'),expenses:aggregate('expenses'),locations:[...a.locations.map(l=>({...l,code:a.code})),...b.locations.map(l=>({...l,code:b.code}))],rows:[...a.rows,...b.rows],organization:a.organization+' → '+b.organization,head:'Dva izvorna zapisa nakon preustroja',program:a.program===b.program?a.program:a.program+' → '+b.program,topics:[...new Set([...itemTopics(a),...itemTopics(b)])]};
  a._relatedGroup=id;b._relatedGroup=id;consumed.add(a.id);consumed.add(b.id);pairs.push(group);
 }
 const isReorganizationCity=data.meta.history?data.meta.reorganization:['osijek','rijeka'].includes(data.meta.slug);for(const a of raw){if(isReorganizationCity){a._identityContext=String(a.head||a.organization||'').replace(/^UPRAVNI ODJEL(?: ZA)?\s*/i,'').trim();a._identityCode=a.code;a._reorganizationContext=true;}}
 const at=new Map(pairs.map(g=>[g.sourceBlocks[0].id,g]));presentationItems=[];
 for(const a of raw){if(at.has(a.id))presentationItems.push(at.get(a.id));else if(!consumed.has(a.id))presentationItems.push(a);}
 const names=new Map();for(const a of presentationItems){const key=fold(a.originalName.trim());if(!names.has(key))names.set(key,[]);names.get(key).push(a);}
 const simplify=text=>String(text||'').replace(/^UPRAVNI ODJEL(?: ZA)?\s*/i,'').replace(/^GRADSKI URED(?: ZA)?\s*/i,'').trim();
 for(const aa of names.values())if(aa.length>1){
  for(const a of aa){if(a._isPair)continue;const where=a.locations?.[0]||{};a._identityContext=simplify(a.head||a.organization);a._identityCode=a.code+(a.entityCode?' · '+(a.entityType==='korisnik'?'korisnik ':'RKP ')+a.entityCode:'');}
  const seen=new Map();for(const a of aa){const key=a._identityContext+'|'+a._identityCode;seen.set(key,(seen.get(key)||0)+1);}
  for(const a of aa){if(a._isPair)continue;const key=a._identityContext+'|'+a._identityCode;if(seen.get(key)>1){const l=a.locations?.[0]||{};a._identityCode+=' · '+[l.org,l.head,l.program].filter(Boolean).join('/');}}
 }
 const finalIdentity=new Map();for(const a of presentationItems){const key=a.originalName+'|'+(a._identityContext||'')+'|'+(a._identityCode||'');finalIdentity.set(key,(finalIdentity.get(key)||0)+1);}for(const a of presentationItems){const key=a.originalName+'|'+(a._identityContext||'')+'|'+(a._identityCode||'');if(finalIdentity.get(key)>1)a._identityCode=(a._identityCode||a.code)+' · redak '+a.row;}
 // The presentation is a partition of source items, with identical financial totals.
 const represented=presentationItems.flatMap(a=>a._isPair?a.sourceBlocks.map(b=>b.id):[a.id]);
 if(represented.length!==raw.length||new Set(represented).size!==raw.length||['before','after'].some(side=>presentationItems.reduce((n,a)=>n+(a[side]||0),0)!==raw.reduce((n,a)=>n+(a[side]||0),0)))throw new Error('Neispravna razdioba izvornih stavki');
}
function relatedDetail(a){
 const shortHolder=b=>String(b.head||b.organization).replace(/^UPRAVNI ODJEL(?: ZA)?\s*/i,'');
 return `<button type="button" class="close-btn" data-close aria-label="Zatvori povezane zapise">×</button><h2 id="detail-title">${esc(a.name)}</h2><p id="detail-owner" class="detail-owner">Mogući prijenos između nositelja</p><p class="related-qualification">Iznos ova dva zapisa ostaje isti. Službena veza stare i nove šifre nije potvrđena.</p><div class="related-total"><span>Zbroj dva izvorna zapisa</span><strong>${esc(euro(a.before))} → ${esc(euro(a.after))}</strong><span>Razlika zbroja: ${esc(signed(a.delta))}</span></div><div class="related-holders">${a.sourceBlocks.map((b,i)=>`<section><span>${i===0?'Raniji nositelj':'Novi nositelj'} · ${esc(b.code)}</span><strong>${esc(shortHolder(b))}</strong></section>`).join('<span class="holder-arrow" aria-hidden="true">→</span>')}</div><details class="related-source-details"><summary>Dva izvorna zapisa</summary>${a.sourceBlocks.map((b,i)=>`<section class="related-source"><span class="eyebrow">${i===0?'RANIJI ZAPIS':'NOVI ZAPIS'} · ${esc(b.code)}</span><h3>${esc(b.head||b.organization)}</h3><p>${esc(b.program)}</p><div class="related-values"><span>${esc(data.meta.beforeLabel)}<strong>${esc(euro(b.before))}</strong></span><span>${esc(data.meta.afterLabel)}<strong>${esc(euro(b.after))}</strong></span></div><p class="small">${esc(data.meta.sourceSheet)} · redak ${b.row}. Izvorni naziv: ${esc(b.originalName)}.</p><button type="button" class="text-btn" data-open="${esc(b.id)}">Financiranje, troškovi i dokaz ovog retka ↗</button></section>`).join('')}</details><details class="related-proof"><summary>Zašto su povezani / Izvori</summary><p>${esc(a.linkQualification)}</p><p>Podudara se puni naziv, iznos i cjelokupan financijski i ekonomski rastav. Izvorni zapisi i sve njihove vrijednosti sačuvani su odvojeno. Drugi nositelji ili RKP oznake ne spajaju se samo po istom nazivu.</p><p>${esc(a.pairEvidence.summary)}</p><a href="${esc(a.pairEvidence.url)}" target="_blank" rel="noopener">${esc(a.pairEvidence.section)} ↗</a><p class="small source-hash">SHA-256 izvora: ${esc(a.pairEvidence.sha256)}</p></details><div class="detail-footer"><p>Planovi, ne izvršenje.</p><div><button type="button" class="secondary-btn" data-download="${esc(a.id)}" data-export="proof">Dokaz · JSON ↓</button><button type="button" class="secondary-btn" data-share="${esc(a.id)}">Kopiraj poveznicu ↗</button></div><p class="share-feedback small" role="status"></p></div>`;
}
function shortContext(a){
 if(a._isPair)return 'Dva izvorna zapisa nakon preustroja';
 if(a._identityContext)return a._identityContext[0]+a._identityContext.slice(1).toLocaleLowerCase('hr');
 const text=contextLabel(a);
 if(/upravni|služba|gradski ured|ured gradonačelnika/i.test(text))return '';
 if(a.locations?.length>1)return a.transfer?'Više nositelja':'';
 return text?text[0]+text.slice(1).toLocaleLowerCase('hr'):'';
}
function card(a){
 const initial=data.meta.kind==='initial',duplicate=(nameCounts.get(fold(friendlyTitle(a)))||0)>1,context=a._isPair?'Mogući prijenos':duplicate?friendlyContext(a):'',unmatched=!known(a.before)||!known(a.after),reorg=a._reorganizationContext&&known(a.delta)&&a.delta!==0,warning=!!a.warning&&!unmatched;
 const deltaLabel=initial?'':unmatched?'Nije usporedivo':reorg?'Promjena odjela':a.composition?'Drukčija raspodjela':signed(a.delta,true);
 return `<article class="budget-card ${initial?'initial ':''}${selected.has(a.id)?'selected':''}" data-item="${esc(a.id)}"><button type="button" class="row-open" data-open="${esc(a.id)}" aria-label="${esc(a.name)}, ${esc(contextLabel(a))}. ${initial?'Plan '+esc(euro(a.after)):'Prije '+esc(euro(a.before))+', poslije '+esc(euro(a.after))+'. '+esc(deltaLabel)}"><span class="row-identity"><span class="row-topic" aria-hidden="true">${rowIcon(a)}</span><span class="card-title">${esc(friendlyTitle(a))}</span>${context?`<span class="card-owner ${duplicate?'required-identity':''}">${esc(context)}${duplicate&&(rowContextCounts.get(fold(friendlyTitle(a))+'|'+friendlyContext(a))||0)>1?`<span class="identity-code">${esc(a._identityCode||a.code+' · '+a.row)}</span>`:''}</span>`:''}</span><span class="row-amounts">${!initial?`<span class="row-before"><span class="row-value-label">Prije</span><strong>${esc(short(a.before))}</strong>${rowBar(a,'before')}</span><span class="row-arrow" aria-hidden="true">→</span>`:''}<span class="row-after"><span class="row-value-label">${initial?'Planirano':'Poslije'}</span><strong>${esc(short(a.after))}</strong>${rowBar(a,'after')}</span></span>${!initial?`<span class="row-change ${type(a)}"><strong>${esc(deltaLabel)}</strong></span>`:'<span></span>'}<span class="row-chevron" aria-hidden="true">${selected.has(a.id)?'✓':'›'}</span></button></article>`;
}

function matchesSearch(a,text){
 let hay=searchTextCache.get(a);if(!hay){hay=fold([friendlyTitle(a),a.name,a.originalName,a.beforeName,a.organization,a.head,a.program,a.code,...(a.sourceBlocks||[]).flatMap(b=>[b.code,b.head,b.organization,b.program])].join(' '));searchTextCache.set(a,hay);}
 return (fold(text).replace(/\bz\s*\.\s*e\s*\.\s*t\.?/g,'zet').match(/[a-z0-9]+/g)||[]).every(term=>{
  if(!term)return true;
   const tokens=hay.match(/[a-z0-9]+/g)||[];
   if(tokens.some(token=>token===term||(term.length>=3&&token.startsWith(term))))return true;
   if(term==='zet'&&hay.includes('zagrebacki elektricni tramvaj'))return true;
  const alternatives=/^vrtic/.test(term)?['vrtic','predskol']:/^skol/.test(term)?['skol','osnovnoskol','srednjoskol']:/^knjiznic/.test(term)?['knjiznic']:/^cest/.test(term)?['cest']:/^trznic/.test(term)?['trznic']:/^autobus/.test(term)?['autobus']:[];
  return alternatives.some(t=>new RegExp('\\b'+t).test(hay));
 });
}
function defaultSort(){return data?.meta.kind==='initial'?'after':'delta';}
function filterItems(){
 if(!data)return;
 filtered=presentationItems.filter(a=>(!selectedGroups.size||(a.citizenGroups||a.sourceBlocks?.flatMap(b=>b.citizenGroups||[])||[]).some(g=>selectedGroups.has(g.id)))&&(activeTopic==='all'||itemTopics(a).includes(activeTopic))&&(!query||matchesSearch(a,query))&&(direction==='all'||(direction==='composition'?a.composition:direction==='same'?a.delta===0:direction==='up'?a.delta>0:direction==='down'?a.delta<0:direction==='unmatched'?(!known(a.before)||!known(a.after)||!known(a.delta)):type(a)===direction)));
 if(sort==='delta')filtered.sort((a,b)=>Number(known(b.delta))-Number(known(a.delta))||Math.abs(b.delta??0)-Math.abs(a.delta??0)||(b.after??b.before??0)-(a.after??a.before??0)||a.name.localeCompare(b.name,'hr'));
 if(sort==='after')filtered.sort((a,b)=>Number(known(b.after))-Number(known(a.after))||(b.after??0)-(a.after??0)||a.name.localeCompare(b.name,'hr'));
 if(sort==='name'){const collator=new Intl.Collator('hr');filtered.sort((a,b)=>collator.compare(a.name,b.name));}
 $('#change-filter').value=direction;$('#budget-sort').value=sort;$('#clear-filters').hidden=activeTopic==='all'&&direction==='all'&&!query&&sort===defaultSort()&&!selectedGroups.size;$('#extra-filters').classList.toggle('has-filters',direction!=='all'||sort!==defaultSort());$('#filter-label').textContent=(activeTopic!=='all'||direction!=='all'||sort!==defaultSort())?'Filtri · uključeni':'Filtri';renderCards();syncViewURL();
}
function renderCards(){
 const visible=filtered.slice(0,limit);rowVisualMax=visible.reduce((m,a)=>canVisualCompare(a)?Math.max(m,a.before,a.after):m,0)||1;
 $('#cards').setAttribute('aria-busy','false');
 $('#cards').innerHTML=filtered.length?filtered.slice(0,limit).map(card).join(''):`<div class="empty-state"><span aria-hidden="true">⌕</span><h3>Nema rezultata.</h3><p>Pokušaj kraći naziv ili ukloni filtre.</p><button type="button" class="secondary-btn" data-action="reset">Prikaži sve stavke</button></div>`;
 const word={one:'stavka',few:'stavke',other:'stavki'}[new Intl.PluralRules('hr').select(filtered.length)];$('#result-count').textContent=nf.format(filtered.length)+' '+word;$('#result-count').setAttribute('aria-label','Pronađeno: '+nf.format(filtered.length));
 $('#load-more').hidden=filtered.length<=limit;if(!filtered.length)$('#clear-filters').hidden=true;renderedListKey=listStateKey();
}
function renderTopics(){
 $('#topics').innerHTML=topics.map(([key,label])=>`<button type="button" class="topic-btn ${key===activeTopic?'active':''}" data-topic="${key}" aria-pressed="${key===activeTopic}">${icon(key)}<span>${({all:'Sve',socijalno:'Skrb i zdravlje',prostor:'Okoliš',uprava:'Uprava'})[key]||label}</span></button>`).join('');
}
function updateSelections(){
 $$('.budget-card[data-item]').forEach(el=>{const on=selected.has(el.dataset.item);el.classList.toggle('selected',on);if(el.querySelector('.row-chevron'))el.querySelector('.row-chevron').textContent=on?'✓':'›';});
 $$('.compare-check input').forEach(el=>{el.checked=selected.has(el.dataset.select);el.closest('.budget-card').classList.toggle('selected',el.checked);});
 $('#compare-tray').hidden=!selected.size;
 $('#compare-count').textContent=`${selected.size} ${selected.size===1?'stavka odabrana':'stavke odabrane'}`;
 $('#compare-names').textContent=[...selected].map(id=>{const a=find(id);return /^redovna djelatnost/i.test(a.name)?contextLabel(a):a.name;}).join(' · ');
 $('#open-compare').disabled=selected.size<2;
 $('#open-compare').innerHTML=selected.size<2?'Odaberi još jednu':`Usporedi ${selected.size} <span aria-hidden="true">↔</span>`;
 syncViewURL();
}
function toggleSelect(id,checked){
 if(checked&&selected.size>=3){notify('Možeš usporediti najviše tri stavke.');updateSelections();return;}
 checked?selected.add(id):selected.delete(id);updateSelections();
}
function detailEvidence(a){
 if(data.meta.history)return historyEvidence(a);
 if(data.meta.slug!=='zagreb')return cityEvidence(a);
 const links=data.meta.sources;
 return `<div class="evidence-status ${a.reviewed?'reviewed':'automatic'}"><strong>${a.reviewed?'✓ Ovaj je primjer pojedinačno pregledan':a.portalLinked?'Iznosi povezani s portalnom osnovom':'Polazni portalni redak nije potvrđen'}</strong><p>${a.reviewed?'Provjereni su početni iznos, iznos u rebalansu i njihov rastav.':a.portalLinked?'Polazni iznos povezan je s portalnim CSV-om po organizaciji, programu i aktivnosti. Neizmijenjeni sadržaj i obuhvat nisu pojedinačno potvrđeni.':'Oba iznosa izravno su navedena u odabranom rebalansu. Veza s početnim portalnim redcima nije potvrđena; ne tumači to kao dokaz nove ili ukinute politike.'}</p></div><div class="evidence-grid"><div><span>GODINA I VRSTA</span><strong>2026. · financijski planovi</strong></div><div><span>IZDAVAČ</span><strong>${esc(data.meta.city)}</strong></div><div><span>AKTIVNOST</span><strong>${esc(a.code)}</strong></div><div><span>ORGANIZACIJA / GLAVA / PROGRAM</span><strong>${esc(a.key.split('|').slice(0,3).join(' / '))}</strong></div></div><div class="proof-line"><span class="proof-number">01</span><div><h4>Početni podaci s portala</h4><p>${a.portalRows.length?'CSV redci '+a.portalRows.join(', ')+' · stupac Plan':'Za ovu aktivnost nije potvrđeno odgovarajuće polazno povezivanje.'}</p><a href="${esc(links.portal)}" target="_blank" rel="noopener">Portalni zapis ↗</a> ${a.portalRows.length?`<a href="${esc(links.csv)}" target="_blank" rel="noopener">Izvorni CSV ↗</a>`:''}</div></div><div class="proof-line"><span class="proof-number">02</span><div><h4>Rebalans na četvrtoj razini</h4><p>List „Rebalans ”, redak ${a.row}. C: izvorni plan · D: promjena · E: novi plan. Iznosi u EUR.</p><a href="${esc(links.rebalance)}" target="_blank" rel="noopener">Izvorni XLS ↗</a></div></div><p class="small muted">Pomoćne teme: ${esc(itemTopics(a).map(topicName).join(", "))}. Temelj: ${esc(a.topicBasis?.text||a.head||a.organization)}.</p><p class="small muted">${esc(a.organization)} · ${esc(a.head)}. Izvorni naziv: ${esc(a.originalName)}. Podaci provjereni ${data.meta.asOf}</p>`;
}
function breakdownCheck(a,field){
 const groups=a[field]||[],total=side=>groups.every(g=>known(g[side]))?groups.reduce((n,g)=>n+g[side],0):null;
 const before=total('before'),after=total('after');return {before,after,beforeDiff:known(before)&&known(a.before)?before-a.before:null,afterDiff:known(after)&&known(a.after)?after-a.after:null};
}
function breakdownIssues(a){return ['funds','expenses'].map(field=>({field,...breakdownCheck(a,field)})).filter(x=>x.beforeDiff!==null&&x.beforeDiff!==0||x.afterDiff!==null&&x.afterDiff!==0);}
function breakdown(a,field){
 const groups=a[field]||[],check=breakdownCheck(a,field),initial=data.meta.kind==='initial',colors=['#176d61','#bba97c','#9177ad','#7996a5','#c77864','#7f9155','#a1a7a2'],max=Math.max(1,...groups.flatMap(g=>[g.before,g.after].filter(known)));
 const differences=['before','after'].filter(side=>(!initial||side==='after')&&check[side+'Diff']!==null&&check[side+'Diff']!==0);
 const chart=g=>!initial&&known(g.before)&&known(g.after)&&g.before>=0&&g.after>=0?`<div class="mini-pair" aria-hidden="true"><div><span style="width:${g.before/max*100}%;background:var(--green);opacity:.32"></span></div><div><span style="width:${g.after/max*100}%;background:var(--green)"></span></div></div>`:'';
 return `${data.meta.initialBaseline&&groups.some(g=>!known(g.before)||!known(g.after))?'<p class="inline-note">Nisu sve oznake razrade povezane između dokumenata. Nedostajući iznos ostaje nepoznat.</p>':''}${groups.map((g,i)=>`<div class="breakdown-row"><div class="breakdown-label"><span class="legend-dot" style="background:${colors[i%colors.length]}"></span><div><strong>${esc(g.label[0]+g.label.slice(1).toLocaleLowerCase('hr'))}</strong><span>${field==='funds'?'Izvor':'Račun'} ${esc(g.code)}</span></div>${initial?'':`<span class="breakdown-delta ${change(g)>0?'up':change(g)<0?'down':'same'}">${esc(signed(change(g),true))}</span>`}</div><div class="breakdown-values">${initial?'':`<span>Prije <strong>${esc(euro(g.before))}</strong></span>`}<span>${initial?'Planirano':'Poslije'} <strong>${esc(euro(g.after))}</strong></span></div>${chart(g)}</div>`).join('')}<div class="breakdown-total"><strong>Iznos aktivnosti</strong><span>${initial?'':esc(euro(a.before))+' → '}<strong>${esc(euro(a.after))}</strong></span></div>${differences.length?`<div class="inline-note warning breakdown-warning"><strong>Odstupanje u izvornoj razradi</strong>${differences.map(side=>`<p>${initial?'Planirano':side==='before'?'Prije':'Poslije'}: zbroj razrade <strong>${esc(euro(check[side]))}</strong>, iznos aktivnosti <strong>${esc(euro(a[side]))}</strong>. Razlika: <strong>${esc(signed(check[side+'Diff']))}</strong>.</p>`).join('')}<p>Izvorne vrijednosti su sačuvane; razradu s odstupanjem ne tumačimo kao potvrđenu promjenu raspodjele.</p></div>`:''}`;
}

function renderDetailContent(){
 const a=current;if(a._isPair){$('#detail-content').innerHTML=relatedDetail(a);return;}
 $('#detail-content').innerHTML=`<button type="button" class="close-btn" data-close aria-label="Zatvori detalj">×</button><span class="topic-tag ${a.topic}">${icon(a.topic)}${esc(topicName(a.topic))}</span><h2 id="detail-title">${esc(a.name)}</h2><p class="detail-owner" id="detail-owner">${esc(contextLabel(a))}</p><p class="dialog-lead">${esc(data.meta.city)} · ${esc(data.meta.year)} · ${data.meta.kind==='initial'?esc(data.meta.afterLabel):esc(data.meta.beforeLabel)+' → '+esc(data.meta.afterLabel)}</p><div class="detail-summary"><div><span>${esc(beforeLabel().toLocaleUpperCase("hr"))}</span><strong>${esc(euro(a.before))}</strong></div><span class="summary-arrow" aria-hidden="true">→</span><div><span>${esc(afterLabel().toLocaleUpperCase("hr"))}</span><strong>${esc(euro(a.after))}</strong></div><div class="detail-change ${type(a)}"><span>${esc(typeLabel(a).toLocaleUpperCase('hr'))}</span><strong>${esc(signed(a.delta))}</strong>${type(a)==='reorganization'?'':`<small>${esc(pct(a))}</small>`}</div></div>${a._reorganizationContext||a._relatedGroup?`<div class="inline-note"><strong>Redak u preustroju.</strong> Razlika ovog retka nije dokaz povećanja ili ukidanja projekta.${a._relatedGroup?` <button type="button" class="text-btn" data-open="${esc(a._relatedGroup)}">Pogledaj oba povezana zapisa ↗</button>`:''}</div>`:''}${a.warning?`<div class="inline-note warning"><strong>${a.beforePresent===false?"Nedostaje usporediv redak.":a.nameChanged?"Provjeri promjenu naziva.":"Napomena uz podatke."}</strong> ${esc(a.warning)}</div>`:""}${data.meta.status==='proposal'?'<div class="inline-note warning"><strong>Prijedlog izmjena.</strong> Ovim izvorom nije potvrđeno usvajanje.</div>':""}${a.transfer?'<div class="inline-note">Aktivnost je zbrojena kroz više nositelja iste šifre. Izvorni blokovi i njihove promjene dostupni su u dokazima.</div>':""}${a.composition?'<div class="inline-note mix"><strong>Ukupan iznos ostaje isti, ali raspodjela se promijenila.</strong> Pogledaj vrste troška i izvore financiranja.</div>':''}${citizenEvidence(a)}<div class="detail-tabs" role="tablist" aria-label="Razrada promjene"><button type="button" role="tab" id="tab-funds" aria-controls="detail-panel" data-tab="funds" aria-selected="${detailTab==='funds'}" tabindex="${detailTab==='funds'?0:-1}">Odakle novac</button><button type="button" role="tab" id="tab-expenses" aria-controls="detail-panel" data-tab="expenses" aria-selected="${detailTab==='expenses'}" tabindex="${detailTab==='expenses'?0:-1}">Na što se troši</button><button type="button" role="tab" id="tab-proof" aria-controls="detail-panel" data-tab="proof" aria-selected="${detailTab==='proof'}" tabindex="${detailTab==='proof'?0:-1}">Izvori</button></div><div id="detail-panel" role="tabpanel" aria-labelledby="tab-${detailTab}">${detailTab==='proof'?detailEvidence(a):breakdown(a,detailTab)}</div><details class="activity-context"><summary>Službeni naziv i oznake</summary><p><strong>${esc(a.code)}</strong> · ${esc(a.organization)}<br>${esc(a.head)}<br>${esc(a.program)}</p><p>${esc(a.originalName)}</p></details><div class="detail-footer"><p>Planirani iznosi, ne isplate.</p><div><button type="button" class="secondary-btn" data-download="${esc(a.id)}" data-export="funds">Financiranje · CSV ↓</button><button type="button" class="secondary-btn" data-download="${esc(a.id)}" data-export="expenses">Troškovi · CSV ↓</button><button type="button" class="secondary-btn" data-download="${esc(a.id)}" data-export="proof">Dokaz · JSON ↓</button><button type="button" class="secondary-btn" data-share="${esc(a.id)}">Kopiraj poveznicu ↗</button></div><p class="share-feedback small" role="status"></p></div>`;
}
function openDetail(id,fromRoute=false){
 const a=find(id);if(!a){notify('Aktivnost nije pronađena u odabranom gradu.');return;}
 if(fromRoute!==true){const url=new URL(location.href);url.searchParams.set('stavka',id);url.searchParams.delete('prikaz');url.searchParams.delete('razrada');return navigate(url,true);}
 current=a;detailTab=['funds','expenses','proof'].includes(new URL(location.href).searchParams.get('razrada'))?new URL(location.href).searchParams.get('razrada'):'funds';renderDetail();const dialog=$('#detail-dialog');if(!dialog.open)dialog.showModal();
}
function openCompare(fromRoute=false){
 if(selected.size<2)return;
 if(fromRoute!==true){const url=new URL(location.href);url.searchParams.set('prikaz','usporedba');url.searchParams.delete('stavka');url.searchParams.delete('razrada');return navigate(url,true);}
 const items=[...selected].map(find);if(items.length<2)return;
 const max=Math.max(...items.map(a=>Math.max(a.before,a.after)),1);
 $('#compare-content').innerHTML=`<button type="button" class="close-btn" data-close aria-label="Zatvori usporedbu">×</button><div class="eyebrow">JEDNA GODINA. JASNA USPOREDBA.</div><h2 id="compare-title">Jedno pokraj drugog.</h2><p class="dialog-lead">${esc(data.meta.city)} · ${esc(data.meta.year)}. ${data.meta.kind==='initial'?esc(data.meta.afterLabel):esc(data.meta.beforeLabel)+' → '+esc(data.meta.afterLabel)}.</p><div class="comparison-grid" style="--columns:${items.length}">${items.map(a=>`<article><span class="topic-tag ${a.topic}">${icon(a.topic)}${esc(topicName(a.topic))}</span><h3>${esc(a.name)}</h3><p class="compare-owner">${esc(contextLabel(a))}</p>${bars(a,max,true)}<div class="comparison-amounts"><span>${esc(beforeLabel())}<strong>${esc(euro(a.before))}</strong></span><span>${esc(afterLabel())}<strong>${esc(euro(a.after))}</strong></span></div><div class="compare-change ${type(a)}"><span>${esc(typeLabel(a))}</span><strong>${esc(signed(a.delta))}</strong><small>${esc(pct(a))}</small></div>${a._isPair?'<p class="small">Zbroj dva podudarna zapisa nakon preustroja; izričita službena veza šifri nije potvrđena.</p>':a.composition?'<p class="small">Ukupno je isto, ali sastav se promijenio.</p>':''}<button type="button" class="secondary-btn" data-compare-detail="${esc(a.id)}">Pogledaj razradu ↗</button></article>`).join('')}</div><button type="button" class="secondary-btn" data-share-comparison>Podijeli ovu usporedbu ↗</button><p class="share-feedback small" role="status"></p><div class="inline-note">Uspoređuju se financijski planovi različitih aktivnosti. Razlika u iznosu ne govori koja je usluga važnija ili kvalitetnija.</div>`;
 $('#compare-dialog').showModal();
}
function download(a,field='funds'){
 if(!a)return;
 let blob,suffix;
 if(field==='proof'){
  const proof={format:'proracun-jasnije-evidence-v1',meta:data.meta,activity:a,interpretation:'Financijski izvori i ekonomski troškovi su dvije razrade iste aktivnosti. Ne zbrajati međusobno.',presentationKind:a._isPair?'matched-source-pair':'source-activity',checks:{beforePresent:known(a.before),funds:{before:!known(a.before)||a.funds.some(g=>!known(g.before))?null:a.funds.reduce((n,g)=>n+(g.before||0),0),after:!known(a.after)||a.funds.some(g=>!known(g.after))?null:a.funds.reduce((n,g)=>n+g.after,0)},expenses:{before:!known(a.before)||a.expenses.some(g=>!known(g.before))?null:a.expenses.reduce((n,g)=>n+(g.before||0),0),after:!known(a.after)||a.expenses.some(g=>!known(g.after))?null:a.expenses.reduce((n,g)=>n+g.after,0)}},unit:data.meta.currency==='HRK'?'HRK lipa':'EUR cents'};
  blob=new Blob([JSON.stringify(proof,null,2)],{type:'application/json;charset=utf-8'});suffix='dokaz.json';
 }else{
  const csvcell=v=>{let s=typeof v==='number'?v.toFixed(2).replace('.',','):String(v??'');if(typeof v==='string'&&/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const rows=[['Grad','Godina','Aktivnost','Sifra','Razrada','Oznaka','Naziv',data.meta.beforeLabel+' '+data.meta.currency,data.meta.afterLabel+' '+data.meta.currency,'Promjena '+data.meta.currency,'Dokument/list','Izvorni redci','Izvor','Status dokumenta','Upozorenje izvora'],...a[field].map(g=>[data.meta.city,String(data.meta.year),a.originalName,a.code,field==='funds'?'Izvori financiranja':'Vrste troska',g.code,g.label,known(g.before)?g.before/100:'',known(g.after)?g.after/100:'',known(change(g))?change(g)/100:'',data.meta.pairType==='two-documents'?data.meta.beforeSheet+' / '+data.meta.sourceSheet:data.meta.sourceSheet,data.meta.initialBaseline?'Početni plan: '+(g.baselineSourceLocations||[]).map(locationLabel).join(' | ')+' / Odabrana verzija: '+(g.sourceLocations||[]).map(locationLabel).join(' | '):data.meta.pairType==='two-documents'?'Nacrt: '+g.beforeRows.join(', ')+' / Plan: '+g.afterRows.join(', '):(data.meta.history&&g.sourceLocations?g.sourceLocations.map(locationLabel).join(' | '):g.rows.join(', ')),data.meta.initialBaseline?data.meta.sources.baseline+' | '+data.meta.sources.rebalance:data.meta.pairType==='two-documents'?data.meta.sources.baseline+' | '+data.meta.sources.adopted:data.meta.sources.rebalance,data.meta.period,a.warning||''])];
  blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvcell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});suffix=(field==='funds'?'financiranje':'troskovi')+'.csv';
 }
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`proracun-${data.meta.slug}-${data.meta.year}-${a.id}-${suffix}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function share(a){
 const url=new URL(location.href);url.hash='';url.searchParams.set('grad',data.meta.slug);if(a){url.searchParams.set('stavka',a.id);url.searchParams.delete('prikaz');if(detailTab!=='funds')url.searchParams.set('razrada',detailTab);}
 let copied=false;
 if(navigator.clipboard?.writeText){copied=await Promise.race([navigator.clipboard.writeText(url.href).then(()=>true).catch(()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),700))]);}
 if(!copied){
  const previous=document.activeElement,el=document.createElement('textarea');el.value=url.href;el.readOnly=true;el.style.cssText='position:fixed;left:-9999px;top:0';($('dialog[open]')||document.body).append(el);el.select();try{copied=document.execCommand('copy');}catch{}el.remove();previous?.focus({preventScroll:true});
 }
 const feedback=$('dialog[open] .share-feedback');
 if(copied){notify('Poveznica je kopirana.');if(feedback)feedback.textContent='Poveznica je kopirana.';}
 else{notify('Preglednik nije dopustio automatsko kopiranje. Poveznicu možeš označiti i kopirati.');if(feedback){feedback.textContent='Označi i kopiraj poveznicu:';const field=document.createElement('input');field.type='url';field.readOnly=true;field.value=url.href;field.className='share-url';field.setAttribute('aria-label','Poveznica za ručno kopiranje');feedback.append(field);field.focus();field.select();}}
}
function reset(){activeTopic='all';direction='all';query='';sort=defaultSort();limit=12;$('#budget-search').value='';$('#budget-sort').value=sort;$('#change-filter').value=direction;renderTopics();filterItems();}
function bind(){
 if(bound)return;bound=true;
 document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(routeLoading&&['change-period','highlights','citizens','filters','quality','overview'].includes(t.dataset.action))return;
  if(routeLoading&&(t.dataset.topic||t.dataset.direction||t.dataset.open||t.dataset.insight||t.dataset.scope||t.dataset.version))return;
  if(t.dataset.scope)chooseComparison({scope:t.dataset.scope});
  if(t.dataset.version)chooseComparison({version:t.dataset.version});
  if(t.dataset.action==='change-period'&&data)openPeriod();
  if(t.dataset.action==='apply-period'&&periodDraft){$('#period-dialog').close();chooseComparison({version:periodDraft.version,scope:periodDraft.scope});}
  if(t.dataset.action==='filters'&&data)$('#filters-dialog').showModal();
  if(t.dataset.action==='quality'&&data)openQuality();
  if(t.dataset.action==='unmatched-source'){selectedGroups.clear();activeTopic='all';query='';$('#budget-search').value='';direction='unmatched';limit=12;renderTopics();renderPersonalContext();filterItems();$('#quality-dialog').close();}
  if(t.dataset.action==='compare-current'&&current){if(!selected.has(current.id)&&selected.size>=3){notify('Možeš usporediti najviše tri stavke.');return;}toggleSelect(current.id,!selected.has(current.id));history.replaceState({...history.state,deltaOverlay:false},'',location.href);$('#detail-dialog').close();notify(selected.size<2?'Odaberi još jednu stavku s popisa.':'Stavke su spremne za usporedbu.');}
  if(t.dataset.topic){activeTopic=t.dataset.topic;limit=12;renderTopics();$(`[data-topic="${activeTopic}"]`).focus();filterItems();}
  if(t.dataset.direction){direction=t.dataset.direction;limit=12;$$('[data-direction]').forEach(b=>{const active=b===t;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});filterItems();}
  if(t.dataset.open)openDetail(t.dataset.open);
  if(t.dataset.action==='reset'){selectedGroups.clear();renderPersonalContext();reset();}
  if(t.dataset.action==='retry-stories'&&data)renderHighlights();
  if(t.dataset.action==='story-period'&&data){$('#highlights-dialog').close();openPeriod();}
  if(t.dataset.storyItem&&data){$('#highlights-dialog').close();openDetail(t.dataset.storyItem);}
  if(t.dataset.action==='method')$('#method-dialog').showModal();
  if(t.dataset.action==='highlights'&&data){renderHighlights();$('#highlights-dialog').showModal();t.setAttribute('aria-expanded','true');}
   if(t.dataset.action==='citizens'&&data){renderCitizenOptions();$('#citizens-dialog').showModal();t.setAttribute('aria-expanded','true');}
   if(t.dataset.action==='clear-citizens'){selectedGroups.clear();renderCitizenOptions();renderPersonalContext();filterItems();}
   if(t.dataset.action==='apply-citizens'){$('#citizens-dialog').close();limit=12;renderPersonalContext();filterItems();}
   if(t.dataset.action==='overview'&&data)$('#overview-dialog').showModal();
  if(t.dataset.action==='reload')location.reload();
  if(t.dataset.retryCity)applyRoute();
  if(t.dataset.action==='cities'||t.dataset.action==='sources'){if(!registry){notify('Katalog gradova još se učitava.');return;}cityFilter=t.dataset.action==='sources'?'documents':'ready';cityQuery='';$('#city-search').value='';$$('[data-city-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.cityFilter===cityFilter);b.setAttribute('aria-pressed',String(b.dataset.cityFilter===cityFilter));});renderCityResults();$('#city-dialog').showModal();$('#city-search').focus();}
  if(t.dataset.city){$('#city-dialog').close();loadCity(t.dataset.city);}
  if(t.dataset.cityFilter){cityFilter=t.dataset.cityFilter;$$('[data-city-filter]').forEach(b=>{b.classList.toggle('active',b===t);b.setAttribute('aria-pressed',String(b===t));});renderCityResults();}
  if(t.dataset.insight){$('#overview-dialog').close();direction=t.dataset.insight;activeTopic='all';query='';$('#budget-search').value='';limit=12;renderTopics();$$('[data-direction]').forEach(b=>{b.classList.toggle('active',b.dataset.direction===direction);b.setAttribute('aria-pressed',String(b.dataset.direction===direction));});filterItems();$('#istrazi').scrollIntoView({behavior:'smooth'});}
  if(t.hasAttribute('data-close'))t.closest('dialog').close();
  if(t.dataset.tab){detailTab=t.dataset.tab;renderDetail();const tabUrl=new URL(location.href);if(detailTab==='funds')tabUrl.searchParams.delete('razrada');else tabUrl.searchParams.set('razrada',detailTab);history.replaceState(history.state,'',tabUrl);$(`[data-tab="${detailTab}"]`).focus();}
  if(t.dataset.download)download(find(t.dataset.download),t.dataset.export);
  if(t.dataset.share)share(find(t.dataset.share));
  if(t.hasAttribute('data-share-comparison'))share();
  if(t.dataset.compareDetail)openDetail(t.dataset.compareDetail);
 });
 document.addEventListener('change',e=>{if(e.target.matches('[data-select]'))toggleSelect(e.target.dataset.select,e.target.checked);if(e.target.matches('[data-citizen]')){if(e.target.checked)selectedGroups.add(e.target.dataset.citizen);else selectedGroups.delete(e.target.dataset.citizen);renderPersonalContext();filterItems();}});
  $('#budget-year').addEventListener('change',()=>selectPeriod('year'));$('#period-options').addEventListener('change',e=>{if(e.target.matches('input[name="budget-version"]')){const chosen=e.target.value;selectPeriod('version');$('#period-options input[value="'+CSS.escape(chosen)+'"]').focus();}});
  for(const [action,id] of [['highlights','highlights-dialog'],['citizens','citizens-dialog']])$('#'+id).addEventListener('close',()=>$('[data-action="'+action+'"]').setAttribute('aria-expanded','false'));
 $('#city-dialog').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('#city-dialog').close();}});
 $('#city-search').addEventListener('input',e=>{cityQuery=e.target.value;renderCityResults();});
 let searchTimer;$('#budget-search').addEventListener('input',e=>{query=e.target.value;limit=12;clearTimeout(searchTimer);searchTimer=setTimeout(filterItems,100);});
 $('#change-filter').addEventListener('change',e=>{direction=e.target.value;limit=12;filterItems();});
 $('#budget-sort').addEventListener('change',e=>{sort=e.target.value;limit=12;filterItems();});
 $('#load-more').addEventListener('click',()=>{limit+=12;renderCards();syncViewURL();});
 $('#open-compare').addEventListener('click',()=>openCompare());$('#clear-compare').addEventListener('click',()=>{selected.clear();updateSelections();});
 $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const rect=d.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)d.close();}}));
 window.addEventListener('popstate',()=>applyRoute(true));
 ['detail-dialog','compare-dialog'].forEach(id=>$('#'+id).addEventListener('close',()=>overlayClosed(id)));
 document.addEventListener('keydown',e=>{
  
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!$('dialog[open]')){e.preventDefault();$('#budget-search').focus();}
  if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=['funds','expenses','proof'],i=tabs.indexOf(detailTab);detailTab=e.key==='Home'?tabs[0]:e.key==='End'?tabs[2]:tabs[(i+(e.key==='ArrowRight'?1:2))%3];renderDetail();const u=new URL(location.href);if(detailTab==='funds')u.searchParams.delete('razrada');else u.searchParams.set('razrada',detailTab);history.replaceState(history.state,'',u);$(`[data-tab="${detailTab}"]`).focus();}
 });
}

const statusLabel=c=>c.status==='adopted'?'Usporedba spremna':c.status==='proposal'?'Prijedlog za pregled':'Pronađeni izvori';
function renderCityResults(){
 const cityNeedle=fold(cityQuery).trim();
 const cities=registry.cities.filter(c=>(!cityQuery||fold(c.name).includes(cityNeedle))&&(cityFilter==='all'||(cityFilter==='ready'?c.status==='adopted':cityFilter==='proposal'?c.status==='proposal':!c.data))).sort((a,b)=>({adopted:0,proposal:1,documents:2}[a.status]-{adopted:0,proposal:1,documents:2}[b.status])||a.name.localeCompare(b.name,'hr'));
 $('#city-title').textContent=cityFilter==='ready'?'Odaberi vizualnu usporedbu.':cityFilter==='documents'?'Pronađi izvorne dokumente.':cityFilter==='proposal'?'Pregledaj prijedlog.':'Usporedbe i dokumenti.';
 $('#city-results-count').textContent=cityFilter==='ready'?`Pronađeno: ${cities.length}. Grafikoni i aktivnosti otvaraju se u ovoj aplikaciji`:cityFilter==='documents'?`Pronađeno: ${cities.length}. Samo dokumenti, bez obrađene usporedbe aktivnosti`:cityFilter==='proposal'?`${cities.length} prijedlog za pregled · usvajanje nije potvrđeno`:`${cities.length} zapisa · provjeri oznaku: usporedba, prijedlog ili samo dokumenti`;
 const elsewhere=cityQuery?registry.cities.filter(c=>fold(c.name).includes(cityNeedle)):[];
 const crossCategory=elsewhere.length?`<div class="empty-state"><h3>Grad je u drugoj kategoriji.</h3><p>U odabranom prikazu nema rezultata. Evo što je stvarno dostupno:</p><div class="cross-category-results">${elsewhere.map(c=>`<button type="button" class="secondary-btn" data-city="${esc(c.id)}"><strong>${esc(c.name)}</strong><span>${c.data?(c.status==='proposal'?'Otvori prijedlog u aplikaciji':'Otvori vizualnu usporedbu'):'Samo izvorni dokumenti · bez usporedbe'} →</span></button>`).join('')}</div></div>`:null;
 $('#city-results').innerHTML=cities.length?cities.map(c=>`<button type="button" class="city-card ${c.status} ${activeCity?.id===c.id?'current':''}" data-city="${esc(c.id)}"><span class="city-card-top"><span class="dot ${c.status==='adopted'?'up':c.status==='proposal'?'proposal':'docs'}"></span>${esc(statusLabel(c))}${activeCity?.id===c.id?'<span class="city-current">Odabrano</span>':''}</span><strong>${esc(c.name)}</strong><span>${c.data?esc(c.year)+' · '+nf.format(c.count)+' aktivnosti':c.official?'Službena stranica i dostupni portalni zapisi':'Portalni zapisi · različite godine'}</span><span class="city-card-cta">${c.data?(c.status==="proposal"?"Pregledaj prijedlog u aplikaciji":"Otvori usporedbu u aplikaciji"):"Popis dokumenata · nema usporedbe"} →</span></button>`).join(''):crossCategory||`<div class="empty-state"><h3>Grad nije u pronađenim izvorima.</h3><p>Ukloni filtar ili potraži naziv bez dijakritike. Još ne obuhvaćamo sve gradove.</p><a href="https://data.gov.hr/ckan/dataset/?q=prora%C4%8Dun" target="_blank" rel="noopener">Potraži izvor na data.gov.hr ↗</a></div>`;
}
function renderQuickCities(){
 const order=['zagreb','split','rijeka','osijek','karlovac'];
 $('#quick-cities').innerHTML=registry.cities.filter(c=>c.data).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)).map(c=>`<button type="button" data-city="${esc(c.id)}" class="quick-city ${activeCity?.id===c.id?'active':''}" aria-pressed="${activeCity?.id===c.id}" aria-label="${esc(c.name)}, ${c.year}, ${nf.format(c.count)} aktivnosti">${esc(c.name)}</button>`).join('');
}
function twoDocumentEvidence(a){
 const m=data.meta,b=m.provenance.before,c=m.provenance.after;
 return `<div class="evidence-status automatic"><strong>${a.beforePresent===false?'Nema odgovarajućeg retka u nacrtu':a.nameChanged?'Ista složena šifra, promijenjen naziv':'Upareno po razdjelu, glavi, ustanovi RKP, programu i aktivnosti'}</strong><p>${esc(a.warning||'Iznosi i rastavi kontrolno su zbrojeni za oba dokumenta. Podudaranje šifri ne potvrđuje da su se usluge ili obuhvat aktivnosti promijenili.')}</p></div><div class="evidence-grid"><div><span>GRAD / GODINA</span><strong>${esc(m.city)} · ${m.year}</strong></div><div><span>USTANOVA RKP</span><strong>${esc(a.entityCode||'Gradski odjel')}</strong></div><div><span>AKTIVNOST</span><strong>${esc(a.code)}</strong></div><div><span>EKONOMSKA / FINANCIJSKA RAZINA</span><strong>${m.level}. / ${m.fundLevel}.</strong></div></div><div class="proof-line"><span class="proof-number">01</span><div><h4>${esc(m.beforeLabel)}</h4><p>${esc(m.beforeSheet)} · stupac Plan 2026. · ${a.beforePresent===false?'redak nije pronađen':'redak '+a.beforeRow}. ${esc(a.beforeName||'')}</p><a href="${esc(m.sources.baseline)}" target="_blank" rel="noopener">Izvorni nacrt · DOCX ↗</a><p class="small source-hash">SHA-256: ${esc(b.sha256)}</p></div></div><div class="proof-line"><span class="proof-number">02</span><div><h4>${esc(m.afterLabel)}</h4><p>${esc(m.sourceSheet)} · stupac Plan 2026. · redak ${a.afterRow}. ${esc(a.originalName)}</p><a href="${esc(m.sources.adopted)}" target="_blank" rel="noopener">Objavljeni proračun · DOCX ↗</a><p class="small source-hash">SHA-256: ${esc(c.sha256)}</p></div></div><div class="source-locations"><h4>Organizacija i ustanova</h4><p>${esc(a.organization)} / ${esc(a.head)} / ${esc(a.program)}</p><p>${esc(m.sourceColumns)}</p></div><p class="small muted">${esc(m.notes)}</p><a href="${esc(m.sources.city)}" target="_blank" rel="noopener">Gradska stranica s dokumentima ↗</a><p class="small muted">Pomoćne teme: ${esc(itemTopics(a).map(topicName).join(', '))}. Temelj: ${esc(a.topicBasis?.text||a.head)}. Dohvaćeno ${esc(m.asOf)}.</p>`;
}
function cityEvidence(a){
 const m=data.meta;
 if(m.pairType==='two-documents')return twoDocumentEvidence(a);
 return `<div class="evidence-status automatic"><strong>${a.warning?'! Pronađena neusklađenost rastava':'Kontrolni zbrojevi aktivnosti i cijelog dokumenta su provjereni'}</strong><p>${a.warning?esc(a.warning):'Iznosi su preneseni iz dva stupca istog dokumenta. Nije provedeno pojedinačno povezivanje svake aktivnosti s početno usvojenim portalnim planom.'}</p></div><div class="evidence-grid"><div><span>GRAD / GODINA</span><strong>${esc(m.city)} · ${m.year}</strong></div><div><span>VRSTA DOKUMENTA</span><strong>${esc(m.period)}</strong></div><div><span>AKTIVNOST</span><strong>${esc(a.code)}</strong></div><div><span>RAZINA TROŠKOVA</span><strong>${m.level}. razina ekonomske klasifikacije</strong></div></div><div class="proof-line"><span class="proof-number">01</span><div><h4>Izvorni dokument</h4><p>${esc(m.sourceSheet)}. ${esc(m.sourceColumns)}. Iznosi u EUR.</p><a href="${esc(m.sources.rebalance)}" target="_blank" rel="noopener">${esc(m.status==='proposal'?'Prijedlog':m.afterLabel)} · ${esc(m.sourceFile.split('.').pop().toUpperCase())} ↗</a></div></div><div class="source-locations"><h4>Izvorni blokovi aktivnosti</h4>${a.entityType==='korisnik'?`<p>Korisnik ${esc(a.entityCode)} · ${esc(a.head)} · zaglavlje u retku ${a.entityRow}.</p>`:''}${a.locations.map(l=>`<div><span>Redak ${l.row} · ${esc(l.org)} / ${esc(l.head)} / ${esc(l.program)}</span><strong>${esc(l.organization)}</strong><span>${esc(euro(l.before))} → ${esc(euro(l.after))}</span></div>`).join('')}</div><p class="small muted">${esc(m.notes)}</p><div class="source-links"><a href="${esc(m.sources.portal)}" target="_blank" rel="noopener">Portalni zapis i dozvola ↗</a><a href="${esc(m.sources.city)}" target="_blank" rel="noopener">Gradska stranica s dokumentima ↗</a></div><p class="small muted">Pomoćne teme: ${esc(itemTopics(a).map(topicName).join(", "))}. Temelj: ${esc(a.topicBasis?.text||a.head||a.organization)}.</p><p class="small muted">Izvorni naziv: ${esc(a.originalName)}. Dohvaćeno ${esc(m.asOf)}.</p>`;
}
function applyData(){
 const m=data.meta,delta=m.after-m.before,max=Math.max(m.before,m.after,1);$('#delta-app').dataset.kind=m.kind;
 $('#explore-controls').inert=false;$('#scope-city').textContent=m.city+' · '+m.year;
 $('#scope-period').textContent=m.history?m.periodShort:m.slug==='split'?'Nacrt → objavljeni plan · nije rebalans':m.periodShort+((reviewedReorganizations.cities[m.slug]||[]).length?' · preustroj':'');
 $('#summary-total').textContent=short(m.after);$('#overview-title').textContent=m.city+' · '+m.year;
 $('#overall-new').innerHTML=esc(short(m.after)).replace(/(mlrd\. €|mil\. €|tis\. €|€)$/,'<small>$1</small>');
 $('#overall-delta').innerHTML=m.kind==='initial'?'Početno usvojeni plan':`${delta===0?'Ukupan plan ostaje isti':esc(signed(delta,true))} <span>${delta===0?'raspodjela se može promijeniti':esc(pct({before:m.before,after:m.after,delta}))}</span>`;
 $('#overall-delta').classList.toggle('down',delta<0);$('#overall-before-short').textContent=short(m.before);$('#overall-after-short').textContent=short(m.after);$('#before-label').textContent=m.beforeLabel;$('#after-label').textContent=m.afterLabel;
 $('.overview-fill.before').style.width=`${m.before/max*100}%`;$('.overview-fill.after').style.width=`${m.after/max*100}%`;$('#overview-period').textContent=m.period;$('#overview-version').textContent=m.periodShort;
 renderDocumentPair(m);$('#city-context').innerHTML='<p>'+esc(m.notes)+'</p>';
 const up=presentationItems.filter(a=>a.delta>0).length,down=presentationItems.filter(a=>a.delta<0).length,same=presentationItems.filter(a=>a.delta===0).length,missing=presentationItems.filter(a=>!known(a.delta)).length;
 $('#glance').innerHTML=[['up','↗',up,'s većim planom'],['down','↘',down,'s manjim planom'],['same','↔',same,'s istim iznosom'],...(missing?[['unmatched','?',missing,'bez retka u nacrtu']]:[])].map(([key,symbol,n,label])=>`<button type="button" class="glance-card ${key}" data-insight="${key}"><span class="glance-symbol" aria-hidden="true">${symbol}</span><strong>${n}</strong><span>${label}</span></button>`).join('');
 $('#change-filter option[value="unmatched"]').hidden=!missing;
 $('#method-intro').textContent=`${m.city}, ${m.year}. ${m.beforeLabel} → ${m.afterLabel}. ${m.scope}.`;
 $('#method-coverage').textContent=m.notes;
 $('#method-links').innerHTML=(m.pairType==='two-documents'?[['city','Gradska stranica s dokumentima'],['baseline',m.beforeLabel],['adopted',m.afterLabel]]:[['portal','Portalni skup data.gov.hr'],['city','Gradski dokumenti'],['adopted','Početno usvojeni plan'],['rebalance','Odabrane izmjene'],['license','Dozvola portalnog zapisa']]).filter(([key])=>m.sources[key]).map(([key,label])=>`<a href="${esc(m.sources[key])}" target="_blank" rel="noopener">${label} ↗</a>`).join('');
 renderHistoryControls();
 renderQuality();
}
function showDocuments(c,error=false){
 data=null;$('#comparison-summary').hidden=true;$('#personal-context').hidden=true;$('#period-explanation').textContent='Odabrana usporedba nije učitana. Pokušaj ponovno.';$('#explore-controls').inert=true;$('#scope-city').textContent=c.name;$('#scope-period').textContent='Usporedba se nije učitala';$('#summary-total').textContent='—';$('#city-notice').hidden=true;$('#result-count').textContent='Učitavanje nije uspjelo';$('#cards').setAttribute('aria-busy','false');$('#load-more').hidden=true;$('#coverage-note').textContent='';
 $('#method-intro').textContent=c.name+': usporedba se nije učitala.';$('#method-coverage').textContent='Pokušaj ponovno. Financijske podatke ne zamjenjujemo nulama ni iznosima drugog grada.';$('#method-links').innerHTML=`<a href="${esc(c.official)}" target="_blank" rel="noopener">Službeni gradski dokumenti ↗</a>`;
 $('#cards').innerHTML=`<div class="error-state"><h3>Podatke trenutačno nije moguće učitati.</h3><p>Pokušaj ponovno ili otvori izvorne gradske dokumente.</p><button type="button" class="secondary-btn" data-retry-city="${esc(c.id)}">Pokušaj ponovno ↻</button><a href="${esc(c.official)}" target="_blank" rel="noopener">Gradski dokumenti ↗</a></div>`;
}
function renderDocumentPair(m){
 const same=m.history?!m.initialBaseline:m.slug!=='zagreb'&&m.pairType!=='two-documents';$('#document-pair').hidden=false;
 $('#document-pair').innerHTML=`<div class="document-pair-title"><span class="eyebrow">${esc(m.city)} · ${m.year} · ${m.status==='proposal'?'PRIJEDLOG, USVAJANJE NIJE POTVRĐENO':'PLANOVI, NE IZVRŠENJE'}</span><span class="small">${same?'Dva stupca istog dokumenta izmjena':m.kind==='initial'?'Početni plan · bez usporedbe':m.pairType==='two-documents'?'Dva dokumenta iste proračunske godine':'Početni dokument i odabrane izmjene'}</span></div><div class="document-pair-grid"><a href="${esc(same?m.sources.rebalance:(m.sources.baseline||m.sources.adopted))}" target="_blank" rel="noopener"><span class="document-step">1</span><div><strong>${esc(m.beforeLabel)}</strong><span>${same?'Polazni stupac u dokumentu izmjena':m.beforeDocumentLabel||('Usvojeni plan za '+m.year+'.')} ↗</span></div></a><span aria-hidden="true">→</span><a href="${esc(m.sources.rebalance)}" target="_blank" rel="noopener"><span class="document-step">2</span><div><strong>${esc(m.afterLabel)}</strong><span>${esc(m.period)} ↗</span></div></a></div>`;
}
function silentClose(d){if(d.open){d.dataset.silentClose='1';d.close();}}
function syncViewURL(){
 if(routeLoading||!data||!activeCity)return;
 const url=new URL(location.href),put=(k,v)=>v?url.searchParams.set(k,v):url.searchParams.delete(k);
 put('grad',activeCity.id);put('godina',String(data.meta.year));put('verzija',activeVersion?.id);put('osnova','');put('skupine',[...selectedGroups].join(','));put('q',query);put('tema',activeTopic==='all'?'':activeTopic);put('promjena',direction==='all'?'':direction);put('poredaj',sort===defaultSort()?'':sort);put('usporedi',[...selected].join(','));put('koliko',limit>12?String(limit):'');
 history.replaceState(history.state,'',url);
}
function navigate(url,overlay=false){
 const el=document.activeElement,focus=el?.dataset?.open?{open:el.dataset.open}:el?.id?{id:el.id}:null;history.replaceState({...history.state,scrollY:scrollY,focus},'',location.href);
 if(url.href===location.href)return applyRoute();
 history.pushState({deltaBudget:true,deltaOverlay:overlay},'',url);return applyRoute();
}
function overlayClosed(id){
 const d=$('#'+id);if(d.dataset.silentClose){delete d.dataset.silentClose;return;}if(routeLoading)return;
 const url=new URL(location.href),present=id==='detail-dialog'?url.searchParams.has('stavka'):url.searchParams.get('prikaz')==='usporedba';if(!present)return;
 returnFocusTo=id==='detail-dialog'?{open:current?.id||url.searchParams.get('stavka')}:{id:'open-compare'};
 if(history.state?.deltaOverlay){history.back();return;}
 url.searchParams.delete('stavka');url.searchParams.delete('prikaz');url.searchParams.delete('razrada');history.replaceState({deltaBudget:true,deltaOverlay:false},'',url);applyRoute();
}
async function loadCity(id,initial=false){
 if(initial)return applyRoute();
 const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('grad',id);await navigate(url);if(activeCity?.id===id&&!routeLoading){$('#comparison-heading').focus({preventScroll:true});}
}
async function applyRoute(fromPop=false){
 if(!registry)return;
 const url=new URL(location.href),requested=url.searchParams.get('grad')||'zagreb',c=registry.cities.find(c=>c.id===requested)||registry.cities.find(c=>c.id==='zagreb'),token=++loadToken;
 const all=c.versions||[],year=Number(url.searchParams.get('godina')),wanted=url.searchParams.get('verzija');let v=all.find(v=>v.id===wanted)||all.filter(v=>v.year===year).at(-1)||all.at(-1);
 routeLoading=true;$('.period-button').disabled=true;$('.summary-info').disabled=true;$('#comparison-summary').setAttribute('aria-busy','true');$('.history-controls').inert=true;$('.history-actions').inert=true;$$('dialog').forEach(d=>silentClose(d));selected.clear();updateSelections();current=null;$('#delta-app').setAttribute('aria-busy','true');$('#istrazi').inert=true;
 try{
  const scope='pocetni',sameDataset=Boolean(data&&activeCity?.id===c.id&&activeVersion?.id===v.id&&comparisonScope===scope);
  const needsFull=url.searchParams.has('stavka')||url.searchParams.get('prikaz')==='usporedba';
  if(needsFull&&sameDataset&&data.meta.preview){$('#detail-content').innerHTML='<button type="button" class="close-btn" data-close aria-label="Zatvori detalje">×</button><h2 id="detail-title">Učitavanje…</h2>';$('#detail-dialog').showModal();}
  let next,mode=v.kind!=='initial';
  if(sameDataset&&(!needsFull||!data.meta.preview))next=data;
  else if(!needsFull)next=await previewData(v,c);
  else next=await fullComparison(v,c);
  const refreshData=!sameDataset||next!==data;
  if(token!==loadToken)return;activeCity=c;activeVersion=v;data=next;initialMode=mode;comparisonScope=scope;selectedGroups=new Set();document.title=c.name+' '+v.year+' · '+v.label+' · Moj proračun';$('#header-city').textContent=c.name+' / '+v.year;
  if(requested!==c.id){url.search='';url.searchParams.set('grad',c.id);notify('Traženi grad nije u izboru. Prikazan je Zagreb.');}
  if(wanted&&wanted!==v.id)notify('Tražena verzija nije dostupna. Prikazana je dostupna obrađena verzija.');
  if(refreshData){preparePresentation();applyData();}selectedGroups=new Set((url.searchParams.get('skupine')||'').split(',').filter(id=>registry.citizenGroups.some(g=>g.id===id)));renderPersonalContext();
  activeTopic=topics.some(t=>t[0]===url.searchParams.get('tema'))?url.searchParams.get('tema'):'all';direction=['up','down','composition','same','unmatched'].includes(url.searchParams.get('promjena'))?url.searchParams.get('promjena'):'all';sort=['delta','after','name'].includes(url.searchParams.get('poredaj'))?url.searchParams.get('poredaj'):defaultSort();limit=Math.max(12,Math.min(data.items.length,parseInt(url.searchParams.get('koliko')||'12',10)||12));query=(url.searchParams.get('q')||'').slice(0,200);$('#budget-search').value=query;$('#budget-sort').value=sort;renderTopics();if(!sameDataset||renderedListKey!==listStateKey())filterItems();
  const ids=(url.searchParams.get('usporedi')||'').split(',').filter(Boolean);selected=new Set(ids.filter(id=>find(id)).slice(0,3));updateSelections();
  if(url.searchParams.has('stavka')){if(find(url.searchParams.get('stavka')))openDetail(url.searchParams.get('stavka'),true);else{url.searchParams.delete('stavka');url.searchParams.delete('razrada');notify('Aktivnost nije dostupna u odabranoj verziji.');}}
  else if(url.searchParams.get('prikaz')==='usporedba'){silentClose($('#detail-dialog'));if(selected.size>=2)openCompare(true);else url.searchParams.delete('prikaz');}
  renderQuickCities();history.replaceState(history.state||{deltaBudget:true,deltaOverlay:false},'',url);
 }catch(e){if(token!==loadToken)return;if(url.searchParams.has('stavka')&&data?.meta.preview&&activeVersion?.id===v.id){$('#detail-content').innerHTML='<button type="button" class="close-btn" data-close aria-label="Zatvori detalje">×</button><h2 id="detail-title">Detalji nisu učitani</h2><button type="button" class="secondary-btn" data-retry-city="1">Pokušaj ponovno</button>';if(!$('#detail-dialog').open)$('#detail-dialog').showModal();return;}activeCity=c;data=null;showDocuments(c,true);renderQuickCities();console.error(e);}
 finally{if(token===loadToken){routeLoading=false;$('.period-button').disabled=!data;$('.summary-info').disabled=!data;$('#comparison-summary').setAttribute('aria-busy','false');$('.history-controls').inert=!data;$('.history-actions').inert=!data;$('#delta-app').setAttribute('aria-busy','false');$('#istrazi').inert=false;if(data)syncViewURL();if(returnFocusTo&&!$('dialog[open]')){const focusTarget=returnFocusTo.open?$('[data-open="'+CSS.escape(returnFocusTo.open)+'"]'):$('#'+returnFocusTo.id);returnFocusTo=null;if(focusTarget)requestAnimationFrame(()=>focusTarget.focus({preventScroll:true}));}if(fromPop&&!$('dialog[open]'))requestAnimationFrame(()=>window.scrollTo({top:history.state?.scrollY||0,behavior:'instant'}));}}
}

function dateLabel(value){return value?new Intl.DateTimeFormat('hr-HR').format(new Date(value+'T12:00:00Z')):'';}
function preparePresentation(){
 prepareSourcePresentation();nameCounts=new Map();rowContextCounts=new Map();for(const a of presentationItems){const k=fold(friendlyTitle(a));nameCounts.set(k,(nameCounts.get(k)||0)+1);const c=k+'|'+friendlyContext(a);rowContextCounts.set(c,(rowContextCounts.get(c)||0)+1);}
}
function periodOption(v){return v.kind==='initial'?'Početni plan · '+dateLabel(v.date):'Promjena od '+dateLabel(v.date);}
function renderHistoryControls(){renderComparison();if(!$('#period-dialog').open){periodDraft={year:data.meta.year,version:activeVersion.id,scope:comparisonScope};renderPeriodDraft();}}
function openPeriod(){periodDraft={year:data.meta.year,version:activeVersion.id,scope:comparisonScope};renderPeriodDraft();$('#period-dialog').showModal();}
function renderPeriodDraft(){
 if(!periodDraft)return;const years=[...new Set(activeCity.versions.map(v=>v.year))].sort((a,b)=>b-a),vs=activeCity.versions.filter(v=>v.year===periodDraft.year).sort((a,b)=>a.ordinal-b.ordinal),chosen=vs.find(v=>v.id===periodDraft.version),initial=chosen?.kind==='initial';
 $('#budget-year').innerHTML=years.map(y=>`<option value="${y}" ${y===periodDraft.year?'selected':''}>${y}.</option>`).join('');
 $('#period-options').innerHTML=vs.map(v=>`<label class="period-option ${v.kind==='initial'?'initial-option':''}"><input type="radio" name="budget-version" value="${esc(v.id)}" ${v.id===periodDraft.version?'checked':''}><span class="period-option-name">${v.kind==='initial'?'Početni proračun':v.ordinal+'. promjena'}</span>${v.kind==='initial'?'':`<span class="period-option-date">${esc(dateLabel(v.date))}</span>`}</label>`).join('');
 $('#year-progress').textContent=vs.some(v=>v.kind!=='initial')?'':'Za ovu godinu obrađen je samo početni proračun.';
 $('#period-explanation').textContent=initial?'Početni proračun bez usporedbe.':periodDraft.scope==='pocetni'?'Početni proračun uspoređuje se s planom nakon odabrane promjene.':'Uspoređuje se plan prije i poslije odabrane promjene.';
 $('[data-action="apply-period"]').textContent=initial?'Prikaži proračun':'Prikaži promjenu';
}
function selectPeriod(which){
 if(!periodDraft)return;if(which==='year'){periodDraft.year=Number($('#budget-year').value);periodDraft.version=activeCity.versions.filter(v=>v.year===periodDraft.year).at(-1).id;}else periodDraft.version=$('input[name="budget-version"]:checked').value;
 renderPeriodDraft();
}

function chooseComparison({scope=comparisonScope,version=activeVersion.id}={}){
 const v=activeCity.versions.find(v=>v.id===version);if(!v)return;const url=new URL(location.href);url.searchParams.set('godina',String(v.year));url.searchParams.set('verzija',v.id);url.searchParams.delete('osnova');['stavka','razrada','prikaz','usporedi','koliko'].forEach(k=>url.searchParams.delete(k));navigate(url);
}
function renderComparison(){
 const m=data.meta,initial=m.kind==='initial';$('#comparison-summary').hidden=false;$('#comparison-summary').dataset.initial=String(initial);const chosenDate=initial?String(m.year)+'.':dateLabel(m.adoptedAt||activeVersion.date).replace(/\s/g,'');$('#period-current').textContent=m.city+' · '+chosenDate;$('.simple-heading h1').textContent=initial?'Plan za '+m.year+'.':initialMode?'Od početka godine':'Promjene u proračunu';$('.list-head>span:nth-child(2)').textContent=initial?'Planirano':'Početni → odabrani plan';$('.list-head>span:nth-child(3)').textContent=initial?'':'Promjena';
 $('#period-current').parentElement.setAttribute('aria-label','Promijeni godinu ili promjenu proračuna. Trenutačno '+m.year+'. '+dateLabel(m.adoptedAt||activeVersion.date));$('#summary-from-label').textContent=(m.initialBaseline?'Početni plan':m.beforeShort||m.beforeLabel||'Početni plan')+' '+m.year+'.';$('#summary-to-label').textContent=(initial?'Početni plan':m.periodShort||activeVersion.ordinal+'. rebalans')+' '+m.year+'.';$('#summary-from-value').innerHTML=initial?'':summaryMoney(m.before);$('#summary-to-value').innerHTML=summaryMoney(m.after);$('#summary-difference-value').innerHTML=initial?'':summaryMoney(m.after-m.before,true);$('#summary-difference-value').className=m.after-m.before>0?'up':m.after-m.before<0?'down':'same';
 renderSummaryVisual();
 $('#comparison-summary').setAttribute('aria-label',m.city+' '+m.year+'. '+(initial?'Plan '+euro(m.after):$('#summary-from-label').textContent+' '+euro(m.before)+', '+$('#summary-to-label').textContent+' '+euro(m.after)+', razlika '+signed(m.after-m.before)));$('#comparison-caption').textContent=m.city+' '+m.year+' '+m.beforeLabel+' → '+m.afterLabel;$('#budget-sort option[value="delta"]').textContent='Prema veličini promjene';
}
function renderQuality(){
 $('#city-notice').hidden=true;$('#city-notice').innerHTML='';$('.summary-info').textContent='Izvori';$('.summary-info').setAttribute('aria-label','Izvori podataka');$('#quality-content').innerHTML='';$('#overview-quality').hidden=false;$('#overview-quality').innerHTML='<button type="button" class="source-quality-link" data-action="quality">Provjera podataka <span aria-hidden="true">›</span></button>';
 $('#coverage-note').textContent=data.meta.currency==='HRK'?'Iznosi za 2022. prikazani su u kunama.':'';
}
function renderQualityDetails(){
 const m=data.meta,warnings=data.items.filter(a=>a.warning),unmatched=warnings.filter(a=>a.baselineNote&&(!known(a.before)||!known(a.after))),financial=data.items.map(a=>({a,issues:breakdownIssues(a)})).filter(x=>x.issues.length),other=warnings.filter(a=>!unmatched.includes(a)&&!financial.some(x=>x.a===a)),beforeDiff=data.items.reduce((n,a)=>n+(a.before??0),0)-m.before,afterDiff=data.items.reduce((n,a)=>n+(a.after??0),0)-m.after,mismatch=beforeDiff!==0||afterDiff!==0,count=financial.length+other.length;
 // Per-activity issues belong to that activity, not to an unrelated search result or the published totals.
 const totalText=mismatch?`<p>Zbroj aktivnosti odstupa od objavljenog ukupnog iznosa u gradskom dokumentu.${m.kind==='initial'?'':` Prije: <strong>${esc(signed(beforeDiff))}</strong>.`} Poslije: <strong>${esc(signed(afterDiff))}</strong>. Izvorne iznose nismo mijenjali.</p>`:'<p>Ukupni iznosi podudaraju se sa zbrojem aktivnosti.</p>';
 $('#quality-content').innerHTML=totalText+(unmatched.length?`<p>Za <strong>${unmatched.length} stavki</strong> nije potvrđena veza između dokumenata. Nedostajući iznosi ostaju nepoznati.</p><button type="button" class="secondary-btn" data-action="unmatched-source">Prikaži nepovezane stavke</button>`:'')+(financial.length?`<h3>Odstupanja u razradi stavki</h3><ul class="quality-list">${financial.map(({a,issues})=>`<li><button type="button" data-open="${esc(a.id)}">${esc(a.name)}</button>${issues.map(x=>`<p>${x.field==='funds'?'Financiranje':'Troškovi'}${m.kind==='initial'?'':` prije: ${esc(euro(x.before))} (razlika ${esc(signed(x.beforeDiff))});`} poslije: <strong>${esc(euro(x.after))}</strong> (razlika <strong>${esc(signed(x.afterDiff))}</strong>). Iznos aktivnosti: ${m.kind==='initial'?'':esc(euro(a.before))+' → '}${esc(euro(a.after))}.</p>`).join('')}</li>`).join('')}</ul><p>Ovo su odstupanja unutar razrade izvornog dokumenta. Ukupni iznosi aktivnosti preneseni su zasebno.</p>`:'')+(other.length?`<h3>Ostale napomene</h3><ul class="quality-list">${other.map(a=>`<li><button type="button" data-open="${esc(a.id)}">${esc(a.name)}</button><p>${esc(a.warning)}</p></li>`).join('')}</ul>`:'')+`<p><a href="${esc(m.sources.rebalance)}" target="_blank" rel="noopener">Gradski dokument ↗</a></p>`;
 $('#coverage-note').textContent=m.currency==='HRK'?'Iznosi za 2022. prikazani su u kunama.':'';
}

function renderCitizenOptions(){
 $('#citizen-options').innerHTML=(registry.citizenGroups||[]).map((g,i)=>`<label class="citizen-option ${selectedGroups.has(g.id)?'chosen':''}"><input type="checkbox" data-citizen="${esc(g.id)}" ${selectedGroups.has(g.id)?'checked':''}><span class="citizen-symbol" aria-hidden="true">${['♧','⌑','☀','▦','◎','♡','↔'][i]}</span><span><strong>${esc(g.label)}</strong><small>${esc(g.description)}</small></span></label>`).join('');
}
function renderPersonalContext(){
 const gs=(registry.citizenGroups||[]).filter(g=>selectedGroups.has(g.id)),label=gs.length===1?gs[0].label:gs.length+(gs.length<5?' odabrane skupine':' odabranih skupina');$('#citizen-count').textContent=gs.length?'('+gs.length+')':'';$('#personal-context').hidden=!gs.length;$('#personal-context').innerHTML=gs.length?`<span>${esc(label)}</span><button type="button" class="text-btn" data-action="clear-citizens">Ukloni ×</button>`:'';const button=$('[data-action="citizens"]');button.classList.toggle('has-choice',gs.length>0);button.setAttribute('aria-label',gs.length?'Za mene: '+gs.map(g=>g.label).join(', '):'Odaberi skupinu građana');
}

function citizenEvidence(a){
 const groups=a.citizenGroups||a.sourceBlocks?.flatMap(b=>b.citizenGroups||[])||[];if(!selectedGroups.size)return '';
 const found=groups.filter(g=>selectedGroups.has(g.id));return found.length?`<div class="citizen-reason"><strong>Zašto je povezano s tvojim izborom?</strong>${found.map(g=>`<p>${esc(registry.citizenGroups.find(x=>x.id===g.id)?.label)}: u nazivu ${esc(g.basis)} navodi se „${esc(g.text)}”.</p>`).join('')}<small>Povezanost s programom ne potvrđuje osobno pravo na uslugu ili potporu.</small></div>`:'';
}
function locationLabel(loc){return !loc?'':loc.page?'stranica '+loc.page:loc.table?'tablica '+loc.table+', redak '+loc.row:'list '+loc.sheet+', redak '+loc.row;}
function historyEvidence(a){
 const m=data.meta,loc=m.initialBaseline&&!known(a.after)?null:(a.sourceLocation||a.locations?.[0]?.sourceLocation);return `<div class="evidence-status automatic"><strong>${a.warning?'Označena neusklađenost u izvoru':'Iznosi preneseni iz službenog dokumenta'}</strong><p>${esc(a.warning||'Zbrojevi aktivnosti i rastava kontrolno su provjereni. Podudaranje šifre nije samostalni dokaz nepromijenjenog sadržaja projekta.')}</p></div><div class="evidence-grid"><div><span>GRAD I GODINA</span><strong>${esc(m.city)} · ${m.year}.</strong></div><div><span>VERZIJA</span><strong>${esc(m.periodShort)}</strong></div><div><span>AKTIVNOST</span><strong>${esc(a.code)}</strong></div><div><span>VALUTA IZVORA</span><strong>${esc(m.currency)}</strong></div></div><div class="proof-line"><span class="proof-number">01</span><div><h4>Izvorni dokument i položaj</h4><p>${esc(loc?locationLabel(loc):m.initialBaseline&&!known(a.after)?'Nema jednoznačno potvrđenog retka u ovom dokumentu':m.sourceSheet+' · redak '+a.row)}.</p><p>${esc(a.organization)} / ${esc(a.head)} / ${esc(a.program)}${a.entityCode?' · RKP '+esc(a.entityCode):''}.</p><a href="${esc(m.sources.rebalance)}" target="_blank" rel="noopener">${esc(m.afterLabel)} · ${esc(m.sourceFile.split('.').pop().toUpperCase())} ↗</a><p class="small source-hash">SHA-256: ${esc(m.provenance.sha256||'U potvrdi izvornih dokumenata')}</p></div></div>${m.initialBaseline?`<div class="source-box"><h4>Početni plan u ovoj usporedbi</h4><p>${esc(locationLabel(a.baselineLocation))}. ${esc(a.baselineNote||'Upareno po organizaciji, glavi, ustanovi, programu i šifri aktivnosti.')}</p><a href="${esc(m.sources.baseline)}" target="_blank" rel="noopener">Početno usvojeni plan ↗</a></div>`:''}${m.currency==='HRK'?`<p class="inline-note">Informativno u eurima: ${known(a.before)?dec.format(a.before/100/7.5345)+' €':'Nije navedeno'} → ${known(a.after)?dec.format(a.after/100/7.5345)+' €':'Nije navedeno'}. Fiksni tečaj 7,53450 kn za 1 €. Kontrole zbrojeva provode se u izvornoj valuti.</p>`:''}${citizenEvidence(a)}<p>${esc(m.notes)}</p><p class="small muted">${esc(a.fundBasis||'Rastavi su sačuvani uz izvorne retke.')} ${esc(m.asOf)}</p><div class="source-links"><a href="${esc(m.sources.decision||m.sources.rebalance)}" target="_blank" rel="noopener">Odluka / službena objava ↗</a><a href="${esc(m.sources.city)}" target="_blank" rel="noopener">Gradska arhiva ↗</a>${m.sources.portal?`<a href="${esc(m.sources.portal)}" target="_blank" rel="noopener">Povezani skup data.gov.hr ↗</a>`:''}</div>`;
}
let storyRequest=null,storyLibrary=null,storyRenderToken=0;
async function loadStories(){
 if(storyLibrary)return storyLibrary;
 if(!storyRequest)storyRequest=(async()=>{const res=await fetch(new URL('stories.json',new URL(window.DELTA_BUDGET.registryUrl,location.href)));if(!res.ok)throw new Error('Priče: '+res.status);const lib=await res.json();if(lib.schemaVersion!==2||!lib.versions)throw new Error('Neispravni podaci priča');storyLibrary=lib;return lib;})().finally(()=>{storyRequest=null;});
 return storyRequest;
}
function storyItemLabel(a){
 const title=friendlyTitle(a);if(title==='Redovni rad ustanova'){
  const head=fold(a.head||'');if(head.includes('predskol'))return 'Redovni rad vrtića';if(head.includes('kultur'))return 'Redovni rad ustanova u kulturi';if(head.includes('zdrav'))return 'Redovni rad zdravstvenih ustanova';if(head.includes('osnovnoskol'))return 'Redovni rad osnovnih škola';if(head.includes('srednjoskol'))return 'Redovni rad srednjih škola';return title+' · '+friendlyContext(a);
 }
 return title;
}
function storyRelated(x){
 const seen=new Set();return (x.activityIds||[]).map(find).filter(Boolean).filter(a=>{const label=storyItemLabel(a);if(seen.has(label))return false;seen.add(label);return true;});
}
async function renderHighlights(){
 const m=data.meta,id=activeVersion.id,token=++storyRenderToken;
 $('#highlights-title').textContent='Zanimljivosti · '+m.city;$('#highlights-period').textContent=m.kind==='initial'?m.year+'. · Početni plan':'Od početka '+m.year+'. do '+dateLabel(m.adoptedAt||activeVersion.date);
 const content=$('#highlights-content');content.setAttribute('aria-busy','false');
 if(m.kind==='initial'){content.innerHTML='<p>Odaberi promjenu za priče iza nje.</p><button type="button" class="secondary-btn" data-action="story-period">Odaberi promjenu</button>';return;}
 content.setAttribute('aria-busy','true');content.innerHTML='<p role="status">Učitavanje…</p>';
 try{
  const lib=await loadStories();if(token!==storyRenderToken||activeVersion?.id!==id)return;
  const stories=lib.versions[id]||[];
  content.innerHTML=stories.map(x=>{const related=storyRelated(x);return `<article class="story-card"><div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><div class="story-sources">${(x.sources||[]).map(a=>`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)} ↗</a>`).join('')}</div>${related.length?`<div class="story-related">${related.slice(0,2).map(a=>`<button type="button" class="text-btn" data-story-item="${esc(a.id)}"><span>${esc(storyItemLabel(a))}</span><span aria-hidden="true">→</span></button>`).join('')}</div>`:''}</div></article>`}).join('')||'<p>Za ovu promjenu još nema istraženih priča.</p>';
 }catch(error){if(token===storyRenderToken&&activeVersion?.id===id)content.innerHTML='<p>Priče nisu učitane.</p><button type="button" class="secondary-btn" data-action="retry-stories">Pokušaj ponovno</button>';}
 finally{if(token===storyRenderToken)content.setAttribute('aria-busy','false');}
}
const previewCache=new Map(),previewRequests=new Map();
function boundedSet(cache,key,value,max){cache.delete(key);cache.set(key,value);while(cache.size>max)cache.delete(cache.keys().next().value);}
async function previewData(v,city){
 if(previewCache.has(v.id))return previewCache.get(v.id);
 if(!previewRequests.has(v.id))previewRequests.set(v.id,(async()=>{const res=await fetch(new URL('previews/'+v.id+'.json',new URL(window.DELTA_BUDGET.registryUrl,location.href)));if(!res.ok)throw new Error('Popis: '+res.status);const obj=await res.json();if(obj.meta.slug!==city.id||obj.meta.versionId!==v.id||!obj.meta.preview||!Array.isArray(obj.items))throw new Error('Popis ne odgovara odabiru');boundedSet(previewCache,v.id,obj,20);return obj;})().finally(()=>previewRequests.delete(v.id)));
 return previewRequests.get(v.id);
}
async function fullComparison(v,city){
 const base=v.kind!=='initial'?city.versions.find(x=>x.year===v.year&&x.kind==='initial'):null,key=v.id+'|'+(base?.id||'initial');
 if(baselineCache.has(key))return baselineCache.get(key);
 const [current,initial]=await Promise.all([versionData(v,city),base?versionData(base,city):Promise.resolve(null)]),out=initial?withInitial(current,initial):current;boundedSet(baselineCache,key,out,3);return out;
}
async function openQuality(){
 const id=activeVersion.id,dialog=$('#quality-dialog');silentClose($('#overview-dialog'));$('#quality-content').innerHTML='<p role="status">Učitavanje provjere…</p>';if(!dialog.open)dialog.showModal();
 try{if(data.meta.preview){const full=await fullComparison(activeVersion,activeCity);if(activeVersion.id!==id||!dialog.open)return;data=full;preparePresentation();}renderQualityDetails();}
 catch(e){if(activeVersion.id===id&&dialog.open)$('#quality-content').innerHTML='<p>Provjera nije učitana.</p><button type="button" class="secondary-btn" data-action="quality">Pokušaj ponovno</button>';}
}
async function versionData(v,city){
 if(cityCache.has(v.id))return cityCache.get(v.id);if(versionRequests.has(v.id))return versionRequests.get(v.id);
 const pending=(async()=>{const res=await fetch(new URL(v.data,new URL(window.DELTA_BUDGET.registryUrl,location.href)));if(!res.ok)throw new Error('Podaci verzije: '+res.status);const obj=await res.json();if(obj.meta.slug!==city.id||obj.meta.versionId!==v.id||!Array.isArray(obj.items))throw new Error('Verzija ne odgovara odabiru');boundedSet(cityCache,v.id,obj,6);return obj;})();versionRequests.set(v.id,pending);try{return await pending;}finally{versionRequests.delete(v.id);}
}

function initialIdentity(a){
 const l=a.locations?.[0];if(l)return [l.org,l.head,l.entity||a.entityCode||'',l.program,a.code].join('|');
 const parts=String(a.key||'').split('|');if(parts.length===4&&parts[3]===a.code)return [parts[0],parts[1],'',parts[2],parts[3]].join('|');if(parts.length===5&&parts[4]===a.code)return parts.join('|');return 'unresolved:'+a.id;
}
function withInitial(current,base){
 const out=structuredClone(current),m=out.meta,key=initialIdentity,bg=new Map(),cg=new Map(),used=new Set(),baseCodes=new Map(),currentCodes=new Map();
 for(const a of base.items){const k=key(a);if(!bg.has(k))bg.set(k,[]);bg.get(k).push(a);}for(const a of out.items){const k=key(a);if(!cg.has(k))cg.set(k,[]);cg.get(k).push(a);}
 for(const a of base.items){if(!baseCodes.has(a.code))baseCodes.set(a.code,[]);baseCodes.get(a.code).push(a);}for(const a of out.items)currentCodes.set(a.code,(currentCodes.get(a.code)||0)+1);
 for(const a of out.items){const aa=bg.get(key(a))||[],valid=aa.length===1&&cg.get(key(a)).length===1&&(a.locations?.length||0)<=1;let old=valid?aa[0]:null;
  if(!old&&current.meta.versionId==='rijeka-2026-1'&&a.locations?.length===2&&currentCodes.get(a.code)===1){const candidates=baseCodes.get(a.code)||[],candidate=candidates.length===1?candidates[0]:null;if(candidate&&fold(candidate.originalName.trim())===fold(a.originalName.trim())){const same=a.locations.filter(l=>initialIdentity({locations:[l],code:a.code})===key(candidate)),others=a.locations.filter(l=>!same.includes(l));if(same.length===1&&others.every(l=>l.before===0)){old=candidate;a.baselineLinkBasis='same-code-name-and-original-block';}}}
  if(old)used.add(old.id);a.baselineLocation=old?.sourceLocation;a.baselineNote=old?(a.baselineLinkBasis?'Jedinstvena ista šifra i naziv; početni zapis odgovara izvornom bloku iste organizacije, glave i programa. Drugi blok ima nultu polaznu vrijednost. Odabrani plan zbraja oba izvorna bloka.':'Jednoznačno podudaranje organizacije, glave, ustanove, programa i šifre.'):'Nema jednoznačno uparenog retka u početnom planu; osnovica ostaje nepoznata.';a.before=old?old.after:null;a.delta=known(a.before)?a.after-a.before:null;a.composition=false;a.warning=a.warning||(!old?a.baselineNote:null);
  for(const field of ['funds','expenses']){
   const map=new Map((old?old[field]:[]).map(g=>[g.code,g])),seen=new Set();
   for(const g of a[field]){const b=map.get(g.code);seen.add(g.code);g.before=b?b.after:null;g.baselineSourceLocations=b?.sourceLocations||[];}
   if(old)for(const b of old[field])if(!seen.has(b.code))a[field].push({...structuredClone(b),before:b.after,after:null,sourceLocations:[],rows:[],baselineSourceLocations:b.sourceLocations||[]});
  }
 }
 for(const original of base.items)if(!used.has(original.id)){
  const a=structuredClone(original);a.id='baseline-'+a.id;a.baselineLocation=a.sourceLocation;a.sourceLocation=null;a.baselineNote='Redak početnog plana nije jednoznačno povezan s odabranim rebalansom. Iznos nakon izmjene nije zamijenjen nulom.';a.before=a.after;a.after=null;a.delta=null;a.composition=false;a.warning=a.baselineNote;for(const field of ['funds','expenses'])for(const g of a[field]){g.before=g.after;g.after=null;g.baselineSourceLocations=g.sourceLocations||[];g.sourceLocations=[];g.rows=[];}out.items.push(a);
 }
 out.items.sort((a,b)=>Number(known(b.delta))-Number(known(a.delta))||Math.abs(b.delta??0)-Math.abs(a.delta??0)||(b.after??b.before??0)-(a.after??a.before??0));
 m.before=base.meta.after;m.initialBaseline=true;m.beforeLabel='Početni plan '+m.year+'.';m.beforeShort='Početni plan';m.sources.baseline=base.meta.sources.rebalance;m.pairType='two-adopted-documents';m.count=out.items.length;m.reorganization=Boolean(current.meta.reorganization);m.sourceWarnings=[];m.activityTotals={before:out.items.reduce((n,a)=>n+(a.before||0),0),after:out.items.reduce((n,a)=>n+(a.after||0),0)};m.sourceWarnings=['before','after'].filter(side=>m.activityTotals[side]!==m[side]).map(side=>({side,difference:m.activityTotals[side]-m[side]}));m.notes='Usporedba početnog plana i odabrane verzije po jednoznačnom složenom ključu. Nepovezani retci sačuvani su odvojeno s nepoznatim drugim iznosom; nisu pretvoreni u nove ili ukinute projekte.';return out;
}

function renderDetail(){
 renderDetailContent();const content=$('#detail-content'),anchor=content.querySelector('.detail-summary,.related-total');const action=`<div class="detail-compare"><button type="button" class="secondary-btn" data-action="compare-current">${selected.has(current.id)?'Ukloni iz usporedbe':'Usporedi s drugom stavkom'}</button></div>`;if(anchor)anchor.insertAdjacentHTML('afterend',action);else content.insertAdjacentHTML('beforeend',action);
 const footer=content.querySelector('.detail-footer>div');if(footer){const exports=footer.querySelectorAll('[data-export]');if(exports.length){const group=document.createElement('details');group.className='export-options';group.innerHTML='<summary>Preuzmi podatke</summary><div></div>';for(const button of exports)group.querySelector('div').append(button);footer.prepend(group);}}
}
function longDate(value){return value?new Intl.DateTimeFormat('hr-HR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00Z')):'';}
function friendlyTitle(a){
 const value=a.name.trim().replace(/\s+/g,' '),key=fold(value),names={'redovna djelatnost proracunskih korisnika':'Redovni rad ustanova','aktivnosti i mjere u vezi s gospodarenjem otpadom':'Gospodarenje otpadom','energetska obnova zgrada javne namjene':'Energetska obnova javnih zgrada'};return names[key]||value;
}
function friendlyContext(a){return shortContext(a)||contextLabel(a)||a.code;}

function canVisualCompare(a){return data?.meta.kind!=='initial'&&known(a.before)&&known(a.after)&&a.before>=0&&a.after>=0&&Math.max(a.before,a.after)>0&&(a._isPair||!a._reorganizationContext);}
function rowBar(a,side){if(!canVisualCompare(a))return '';const width=Math.min(100,Math.max(0,a[side]/rowVisualMax*100));return `<span class="amount-bar ${side==='after'?'after '+(a.delta<0?'fall':'rise'):''}" aria-hidden="true"><span style="width:${width}%"></span></span>`;}
function summaryMoney(value,withSign=false){const text=withSign?signed(value,true):short(value),parts=text.match(/^([+−\d.,]+)\s+(.+)$/);return parts?'<span class="summary-amount-number">'+esc(parts[1])+'</span> <span class="summary-amount-unit">'+esc(parts[2])+'</span>':esc(text);}
function percentageChange(before,after){return Number.isFinite(before)&&Number.isFinite(after)&&before>0&&after>=0?(after-before)/before*100:null;}
function renderSummaryVisual(){
 const m=data.meta,show=m.kind!=='initial',badge=$('#summary-percent'),percent=show?percentageChange(m.before,m.after):null;badge.hidden=percent===null||percent===0;$('.summary-difference').classList.toggle('has-percentage',percent!==null&&percent!==0);badge.className='change-badge '+(percent>0?'up':percent<0?'down':'same');badge.textContent=percent===null?'':percent===0?'= 0 %':(percent>0?'↑ ':'↓ ')+(Math.abs(percent)<.01?'<0,01':dec.format(Math.abs(percent)))+' %';badge.setAttribute('aria-label',percent===null?'':percent===0?'Ukupni plan ostaje isti':(percent>0?'Povećanje':'Smanjenje')+' plana '+(Math.abs(percent)<.01?'manje od 0,01':dec.format(Math.abs(percent)))+' posto');
}

function rowIcon(a){const t=fold(friendlyTitle(a));return icon(/\b(sport|bazen|igralist|stadion|nogomet|kosark|rukomet)/.test(t)?'sport':/\btrznic/.test(t)?'market':/\b(cest|ulic|prometnic|raskriz|most)/.test(t)?'road':/\botpad/.test(t)?'waste':/\b(park(?!ir|ing)|zelen|okolis|drvor|sum)/.test(t)?'prostor':a.topic==='prostor'?'urban':a.topic);}
Object.assign(icons,{
 waste:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
 market:'<path d="M3 10h18M5 10v10h14V10M3 10l2-6h14l2 6M9 20v-6h6v6M8 4v6m8-6v6"/>',
 sport:'<circle cx="12" cy="12" r="9"/><path d="m12 8 4 3-1.5 4.5h-5L8 11l4-3Zm0-5v5m9 1-5 2m1 9-2.5-4.5M7 20l2.5-4.5M3 9l5 2"/>',
 road:'<path d="m8 3-4 18M16 3l4 18M12 3v3m0 4v4m0 4v3"/>',
 urban:'<path d="M3 21h18M5 21V5h8v16m0-12h6v12M8 8h2m-2 4h2m-2 4h2m6-4h1m-1 4h1"/>'
});
async function init(){
 bind();
 try{
  const response=await fetch(window.DELTA_BUDGET.registryUrl);if(!response.ok)throw new Error('Katalog: '+response.status);registry=await response.json();registry.cities=registry.cities.filter(c=>!!c.data);registry.cityCount=registry.cities.length;
  $('#national-coverage').textContent=`${registry.readyCount} ${{one:'grad',few:'grada',other:'gradova'}[new Intl.PluralRules('hr').select(registry.readyCount)]} · 2022.–2026.`;
  $('#city-coverage').textContent=`Obrađeni javni podaci za ${registry.readyCount} grada i ${registry.versionCount} verzija proračuna. Izvori i razdoblje navedeni su uz odabrani grad.`;
  bind();await loadCity(new URLSearchParams(location.search).get('grad')||'zagreb',true);
 }catch(e){$('#cards').innerHTML='<div class="error-state"><h3>Katalog gradova trenutačno nije dostupan.</h3><p>Osvježi stranicu i pokušaj ponovno.</p><button class="secondary-btn" type="button" data-action="reload">Pokušaj ponovno ↻</button><a href="https://data.gov.hr/ckan/dataset/?q=prora%C4%8Dun" target="_blank" rel="noopener">Izvorni podaci na nacionalnom portalu ↗</a></div>';$('#result-count').textContent='Učitavanje nije uspjelo';$('#cards').setAttribute('aria-busy','false');$('#national-coverage').textContent='Katalog nije učitan';console.error(e);}
}
init();
})();
