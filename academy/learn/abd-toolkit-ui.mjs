import {rate,forecast,territoryBudget,partnershipFit,compareRates,nicheEvidence,microNiche} from './abd-toolkit-math.mjs';
const num=s=>{if(typeof s!=='string'||!s.trim()||!/^\d+(?:\.\d+)?$/.test(s.trim()))throw new TypeError('Enter a nonnegative number.');return Number(s)};
const tri=s=>({yes:true,no:false,unknown:null})[s];
const list=s=>s.split(/\n/).map(x=>x.trim()).filter(Boolean);
const rows=(s,n)=>{const r=list(s).map(x=>x.split(',').map(num));if(!r.length||r.some(x=>x.length!==n))throw new TypeError('Enter one complete comma-separated row per line.');return r};
const yesNo={type:'select',options:['unknown','yes','no']};
const fields=(labels)=>labels.map(label=>({label,...yesNo}));
const fmt=v=>v===null?'Unavailable':(100*v).toFixed(2)+'%';
export const tools={
 'organizational-niche':{fields:[{label:'Claim'},{label:'Independent evidence sources (one per line)'},{label:'Operational owner'},{label:'Boundary'}],run:v=>nicheEvidence({claim:v[0],evidence:list(v[1]),owner:v[2],boundary:v[3]}).readyForReview?'Ready for operational review (not approved)':'More independent evidence or scope information needed'},
 'micro-niche':{fields:fields(['Personal evidence','Organizational fit','Partner-confirmed relevance','Within scope']),run:v=>microNiche({personalEvidence:tri(v[0]),organizationalFit:tri(v[1]),partnerRelevance:tri(v[2]),scope:tri(v[3])}).status},
 'ideal-partnership':{fields:[...fields(['Independent choice respected','No referral inducement','Capacity and scope verified','Privacy and permission respected']),...['Aspiration alignment','Capability evidence','Operational readiness','Mutual value'].map(label=>({label,type:'select',options:['unknown','0','1','2']}))],run:v=>{const r=partnershipFit(v.slice(0,4).map(tri),v.slice(4).map(x=>x==='unknown'?null:num(x)));return r.status+(r.score===null?'':' · '+r.score+'/8 (review only)')}},
 'pipeline-planner':{fields:[{label:'Opportunity rows: estimated value, probability (0–1), one per line'}],run:v=>'Weighted scenario: '+forecast(rows(v[0],2).map(([value,probability])=>({value,probability}))).toLocaleString('en-US',{maximumFractionDigits:2})+' (not booked revenue)'},
 'territory-plan':{fields:[{label:'Weekly available minutes'},{label:'Rows: travel, activity, follow-up minutes'}],run:v=>{const r=territoryBudget(num(v[0]),rows(v[1],3).map(([travel,activity,followup])=>({travel,activity,followup})));return 'Used '+r.used+' min · Remaining '+r.remaining+' min'+(r.overallocated?' · Overallocated':'')}},
 'growth-scorecard':{fields:[{label:'Eligible outcomes'},{label:'Eligible starting cohort'}],run:v=>'Rate: '+fmt(rate(num(v[0]),num(v[1])))},
 'experiment-journal':{fields:['Baseline numerator','Baseline denominator','Current numerator','Current denominator'].map(label=>({label})),run:v=>{const r=compareRates({n:num(v[0]),d:num(v[1])},{n:num(v[2]),d:num(v[3])});return 'Baseline '+fmt(r.before)+' · Current '+fmt(r.after)+' · Difference '+(r.percentagePoints===null?'Unavailable':r.percentagePoints.toFixed(2)+' percentage points')+' · Relative change '+fmt(r.relativeChange)+' (not causal proof)'}}
};
export function calculate(key,values){const t=tools[key];if(!t||!Array.isArray(values)||values.length!==t.fields.length)throw new TypeError('Invalid calculator inputs');return t.run(values)}
// Calculator inputs are deliberately transient; worksheet answers use existing private RPC.
export function attachCalculator(section,key,current){
 const t=tools[key];if(!t)return;
 const wrapper=document.createElement('section');wrapper.className='academy-question';
 const heading=document.createElement('h4');heading.textContent='Practice calculator';wrapper.append(heading);
 const hint=document.createElement('p');hint.textContent='Use fictional or de-identified inputs. Calculations stay in this browser; copy relevant results into your private worksheet to save them.';wrapper.append(hint);
 const controls=t.fields.map(f=>{const label=document.createElement('label');label.textContent=f.label;const input=document.createElement(f.type==='select'?'select':'textarea');input.className='academy-input';if(f.options)for(const v of f.options){const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o)}else{input.rows=2;input.maxLength=2000}label.append(input);wrapper.append(label);return input});
 const result=document.createElement('p');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 const b=document.createElement('button');b.type='button';b.className='academy-btn alt';b.textContent='Calculate';b.addEventListener('click',()=>{if(!current())return;try{result.textContent=calculate(key,controls.map(x=>x.value))}catch{result.textContent='Check the input format, required values and permitted ranges.'}});
 wrapper.append(b,result);section.append(wrapper);
}
export function exportWorksheet(template,answers){
 const page=document.implementation.createHTMLDocument('Private worksheet');const h=page.createElement('h1');h.textContent=template.title;page.body.append(h);
 const note=page.createElement('p');note.textContent='Private learner copy. Includes current worksheet entries; store securely.';page.body.append(note);
 template.prompts.forEach((p,i)=>{const label=page.createElement('h2');label.textContent=p;const a=page.createElement('p');a.style.whiteSpace='pre-wrap';a.textContent=answers[i]||'';page.body.append(label,a)});
 const url=URL.createObjectURL(new Blob(['<!doctype html>',page.documentElement.outerHTML],{type:'text/html'}));const a=document.createElement('a');a.href=url;a.download='private-abd-worksheet.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
