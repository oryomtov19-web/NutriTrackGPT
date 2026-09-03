const STORAGE_KEY='nutritrack.v1';
const defaults={settings:{calories:1800,protein:140},days:{}};
let state=loadState();
let selectedDate=todayKey();
let pending=[];

const foods=[
 {keys:['שניצל','schnitzel'],name:'שניצל',per100:[300,24]},
 {keys:['אורז','rice'],name:'אורז מבושל',per100:[130,2.7]},
 {keys:['חזה עוף','פילה עוף','chicken breast'],name:'חזה עוף',per100:[165,31]},
 {keys:['לבבות','לבבות עוף'],name:'לבבות עוף',per100:[185,26]},
 {keys:['המבורגר','burger'],name:'המבורגר',per100:[250,26]},
 {keys:['פסטה','pasta'],name:'פסטה מבושלת',per100:[155,5.8]},
 {keys:['פירה','mashed'],name:'פירה',per100:[115,2]},
 {keys:['טונה','tuna'],name:'טונה',per100:[132,29]},
 {keys:['דניס'],name:'דניס',per100:[145,23]},
 {keys:['בולגרית'],name:'גבינה בולגרית 5%',per100:[140,17]},
 {keys:['סלט','ירקות'],name:'סלט ירקות',per100:[35,1.5]},
];
const units=[
 {keys:['בקבוק פרו','פרו','pro'],name:'בקבוק PRO',cal:130,protein:25},
 {keys:['פיתה כוסמין','פיתת כוסמין'],name:'פיתה כוסמין',cal:99,protein:4},
 {keys:['ביצה','ביצים'],name:'ביצה L',cal:78,protein:6.5},
 {keys:['אספרסו','קפה'],name:'אספרסו',cal:3,protein:0},
 {keys:['קולה זירו','ספרייט זירו','זירו'],name:'משקה זירו',cal:0,protein:0},
];
const quickFoods=[
 ['בקבוק PRO',130,25],['ביצה L',78,6.5],['פיתה כוסמין',99,4],['100 גרם אורז',130,2.7],['100 גרם חזה עוף',165,31]
];

function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function todayKey(){const d=new Date();return keyFromDate(d)}
function keyFromDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function dateFromKey(k){const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)}
function fmtDate(k){const d=dateFromKey(k), t=todayKey(); if(k===t)return 'היום'; const y=new Date();y.setDate(y.getDate()-1); if(k===keyFromDate(y))return 'אתמול'; return new Intl.DateTimeFormat('he-IL',{weekday:'short',day:'numeric',month:'short'}).format(d)}
function dayItems(){return state.days[selectedDate]||[]}
function addFood(name,cal,protein){state.days[selectedDate]??=[];state.days[selectedDate].push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name,cal:+cal,protein:+protein,ts:Date.now()});save();render();toast('נוסף ליום')}
function round(n,d=0){const p=10**d;return Math.round(n*p)/p}


function normalizeHebrewNumberWords(s){
 const map=[
   ['שלושה','3'],['שלוש','3'],['שתי','2'],['שני','2'],['שניים','2'],['שתיים','2'],
   ['אחת','1'],['אחד','1']
 ];
 let out=s;
 map.forEach(([w,n])=>out=out.replace(new RegExp(`\\b${w}\\b`,'g'),n));
 return out;
}

function parseSmart(text){
 const normalized=normalizeHebrewNumberWords(
   text.toLowerCase()
     .replace(/[،;]/g,',')
     .replace(/\n/g,' + ')
     .replace(/\s*,\s*/g,' + ')
     .replace(/\s+וגם\s+/g,' + ')
 );
 const parts=normalized.split(/\s*\+\s*/).map(s=>s.trim()).filter(Boolean);
 const out=[]; const unknown=[];

 for(let part of parts){
   let matched=false;

   // Exact values supplied by the user, e.g. "PRO 130 calories 25 protein".
   const explicitCal=part.match(/(\d+(?:\.\d+)?)\s*(?:קלוריות|קלוריה|קל׳|kcal)/);
   const explicitProtein=part.match(/(\d+(?:\.\d+)?)\s*(?:גרם\s*)?(?:חלבון|protein)/i);
   if(explicitCal && explicitProtein){
     let count=1;
     const cm=part.match(/(?:^|\s)(\d+)\s*(?:x|×|בקבוק(?:ים)?|יחידות?)?/);
     if(cm && +cm[1] <= 20) count=Math.max(1,+cm[1]);
     const name=part.replace(/\d+(?:\.\d+)?\s*(?:קלוריות|קלוריה|קל׳|kcal)/g,'')
                    .replace(/\d+(?:\.\d+)?\s*(?:גרם\s*)?(?:חלבון|protein)/gi,'')
                    .replace(/\s+/g,' ').trim() || 'פריט';
     out.push({name,cal:round(+explicitCal[1]*count),protein:round(+explicitProtein[1]*count,1)});
     continue;
   }

   // Weight-based foods.
   for(const f of foods){
     const key=f.keys.find(k=>part.includes(k));
     if(!key)continue;
     const gm=part.match(/(\d+(?:\.\d+)?)\s*(?:גרם|ג(?:רם)?\b|g(?:r)?\b)/i);
     let grams=gm?+gm[1]:100;

     // If wording says "together 200g" with 2 schnitzels, do NOT multiply the weight.
     let cal=f.per100[0]*grams/100;
     let protein=f.per100[1]*grams/100;

     // Preparation modifiers for common foods.
     if(f.name==='שניצל'){
       if(/שמן עמוק|מטוגן עמוק|deep.?fried/.test(part)) cal*=1.12;
       else if(/מטוגן|טיגון/.test(part)) cal*=1.06;
     }
     if(/מעט שמן|קצת שמן/.test(part)) cal+=35;
     if(/כף שמן/.test(part)) cal+=120;

     out.push({name:`${f.name} — ${round(grams)} גרם`,cal:round(cal),protein:round(protein,1)});
     matched=true;break;
   }
   if(matched)continue;

   // Unit foods (eggs, PRO bottles, pita).
   for(const u of units){
     const key=u.keys.find(k=>part.includes(k));
     if(!key)continue;
     let count=1;
     const idx=part.indexOf(key);
     const before=part.slice(0,idx);
     const nums=[...before.matchAll(/(\d+(?:\.\d+)?)/g)].map(m=>+m[1]);
     if(nums.length){
       const candidate=nums[nums.length-1];
       if(candidate>0 && candidate<=20) count=candidate;
     }
     out.push({
       name:count>1?`${count} × ${u.name}`:u.name,
       cal:round(u.cal*count),
       protein:round(u.protein*count,1)
     });
     matched=true;break;
   }
   if(!matched && part.length>1)unknown.push(part);
 }
 return {items:out,unknown};
}

function buildChatGPTPrompt(text){
 return `חשב לי קלוריות וחלבון עבור הארוחה הבאה:
${text}

תן הערכה ריאלית וקצרה. לכל פריט כתוב בשורה:
שם המאכל — X קלוריות — Y גרם חלבון
ובסוף:
סה"כ — X קלוריות — Y גרם חלבון

אל תשתמש בטבלה ואל תשתמש ב-JSON.`;
}

async function openInChatGPT(){
 const text=document.querySelector('#smartInput').value.trim();
 if(!text)return toast('כתוב קודם מה אכלת');
 const prompt=buildChatGPTPrompt(text);
 try{
   await navigator.clipboard.writeText(prompt);
   toast('הבקשה הועתקה');
 }catch(e){
   toast('לא הצלחתי להעתיק אוטומטית');
 }
 window.open('https://chatgpt.com/','_blank','noopener');
}

function parseChatGPTPlainText(raw){
 const lines=raw.split(/\n/).map(x=>x.trim()).filter(Boolean);
 const items=[];
 for(const line of lines){
   if(/סה.?כ|total/i.test(line)) continue;
   const cal=line.match(/(\d+(?:[.,]\d+)?)\s*(?:קלוריות|קלוריה|קל['׳]?|kcal)/i);
   const prot=line.match(/(\d+(?:[.,]\d+)?)\s*(?:גרם\s*)?(?:חלבון|protein|g\s*protein)/i);
   if(!cal || !prot) continue;
   let name=line.split(/[—–|-]/)[0].trim()
     .replace(/^[•*-]\s*/,'')
     .replace(/^\d+[.)]\s*/,'');
   if(!name || name.length>100) name='מאכל';
   items.push({
     name,
     cal:round(parseFloat(cal[1].replace(',','.'))),
     protein:round(parseFloat(prot[1].replace(',','.')),1)
   });
 }
 return items;
}

function importChatGPTResult(){
 const raw=document.querySelector('#chatgptResult').value.trim();
 if(!raw)return toast('הדבק את התשובה שקיבלת');
 let items=parseChatGPTPlainText(raw);

 // Backward compatibility: also accept JSON if it happens to be present.
 if(!items.length){
   try{
     const a=raw.indexOf('{'),b=raw.lastIndexOf('}');
     const data=JSON.parse(a>=0&&b>a?raw.slice(a,b+1):raw);
     items=(data.items||[]).map(i=>({
       name:String(i.name||'מאכל').slice(0,80),
       cal:Math.max(0,round(Number(i.calories??i.cal)||0)),
       protein:Math.max(0,round(Number(i.protein)||0,1))
     })).filter(i=>i.cal||i.protein);
   }catch{}
 }
 if(!items.length)return toast('לא הצלחתי לזהות קלוריות וחלבון בתשובה');
 pending=items;
 hideModals();
 renderPreview({items,unknown:[]});
 toast('התוצאה מוכנה לבדיקה');
}

function render(){
 const items=dayItems(); const cal=round(items.reduce((s,x)=>s+x.cal,0)); const prot=round(items.reduce((s,x)=>s+x.protein,0),1); const cg=state.settings.calories||1800, pg=state.settings.protein||140;
 document.querySelector('#dateLabel').textContent=fmtDate(selectedDate);
 document.querySelector('#calValue').textContent=cal; document.querySelector('#proteinValue').textContent=`${prot}g`; document.querySelector('#calGoalText').textContent=cg;document.querySelector('#proteinGoalText').textContent=pg;
 document.querySelector('#calRing').style.setProperty('--p',Math.min(100,cal/cg*100));document.querySelector('#proteinRing').style.setProperty('--p',Math.min(100,prot/pg*100));
 document.querySelector('#calRemaining').textContent=Math.max(0,round(cg-cal));document.querySelector('#proteinRemaining').textContent=`${Math.max(0,round(pg-prot,1))}g`;
 const list=document.querySelector('#foodList'); list.innerHTML=''; if(!items.length){list.innerHTML='<div class="card empty">עדיין לא הוספת אוכל ליום הזה.</div>'} else [...items].reverse().forEach(x=>{const el=document.createElement('div');el.className='food';el.innerHTML=`<div class="food-main"><div class="food-name"></div><div class="food-meta">${round(x.cal)} קל׳ · ${round(x.protein,1)}g חלבון</div></div><button class="delete" aria-label="מחיקה">×</button>`;el.querySelector('.food-name').textContent=x.name;el.querySelector('.delete').onclick=()=>{state.days[selectedDate]=dayItems().filter(i=>i.id!==x.id);save();render()};list.appendChild(el)});
}
function moveDay(delta){const d=dateFromKey(selectedDate);d.setDate(d.getDate()+delta); if(d>new Date())return;selectedDate=keyFromDate(d);render()}
function toast(msg){const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)}
function showModal(id){document.querySelector(id).classList.add('show')}
function hideModals(){document.querySelectorAll('.modal-bg').forEach(x=>x.classList.remove('show'))}

function renderPreview(result){
 pending=result.items.map(i=>({...i}));
 const p=document.querySelector('#preview');
 p.innerHTML='';
 if(!pending.length){
   p.classList.add('show');
   p.innerHTML='<div>לא הצלחתי לזהות את המאכלים. נסה לכתוב כמויות בגרמים, או השתמש בהוספה ידנית.</div>';
   return;
 }
 pending.forEach((i,idx)=>{
   const r=document.createElement('div');
   r.className='preview-row';
   r.innerHTML=`<span class="preview-name"></span>
     <div class="preview-numbers">
       <label style="font-size:11px;color:var(--muted)">kcal <input class="edit-cal" type="number" inputmode="decimal" min="0" value="${i.cal}"></label>
       <label style="font-size:11px;color:var(--muted)">protein <input class="edit-protein" type="number" inputmode="decimal" min="0" step="0.1" value="${i.protein}"></label>
     </div>`;
   r.querySelector('.preview-name').textContent=i.name;
   r.querySelector('.edit-cal').oninput=e=>{pending[idx].cal=Math.max(0,+e.target.value||0);updatePreviewTotal()};
   r.querySelector('.edit-protein').oninput=e=>{pending[idx].protein=Math.max(0,+e.target.value||0);updatePreviewTotal()};
   p.appendChild(r);
 });
 const sum=document.createElement('div');
 sum.style.marginTop='12px';
 sum.innerHTML=`<div id="previewTotal" style="font-size:17px;font-weight:900"></div>
   ${result.unknown.length?`<div style="color:var(--warn);font-size:12px;margin-top:7px">לא זוהה: ${result.unknown.map(escapeHtml).join(' · ')}</div>`:''}
   <button class="btn primary" style="width:100%;margin-top:12px" id="confirmSmart">הוסף ליום</button>`;
 p.appendChild(sum);
 p.classList.add('show');
 updatePreviewTotal();
 document.querySelector('#confirmSmart').onclick=()=>{
   const items=[...pending];
   state.days[selectedDate]??=[];
   items.forEach(i=>state.days[selectedDate].push({
     id:crypto.randomUUID?.()||String(Date.now()+Math.random()),
     name:i.name,cal:+i.cal,protein:+i.protein,ts:Date.now()
   }));
   save();render();
   p.classList.remove('show');
   document.querySelector('#smartInput').value='';
   pending=[];
   toast('הארוחה נוספה');
 };
}
function updatePreviewTotal(){
 const el=document.querySelector('#previewTotal'); if(!el)return;
 const c=round(pending.reduce((s,x)=>s+(+x.cal||0),0));
 const pr=round(pending.reduce((s,x)=>s+(+x.protein||0),0),1);
 el.textContent=`סה״כ: ${c} קל׳ · ${pr}g חלבון`;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

quickFoods.forEach(([n,c,p])=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>addFood(n,c,p);document.querySelector('#quick').appendChild(b)});
document.querySelector('#analyzeBtn').onclick=()=>renderPreview(parseSmart(document.querySelector('#smartInput').value));
document.querySelector('#chatgptBtn').onclick=()=>showModal('#chatgptModal');
document.querySelector('#openChatGPT').onclick=openInChatGPT;
document.querySelector('#importChatGPT').onclick=importChatGPTResult;
document.querySelector('#manualBtn').onclick=()=>showModal('#manualModal');
document.querySelector('#settingsBtn').onclick=()=>{document.querySelector('#goalCal').value=state.settings.calories;document.querySelector('#goalProtein').value=state.settings.protein;showModal('#settingsModal')};
document.querySelectorAll('.closeModal').forEach(b=>b.onclick=hideModals);document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)hideModals()}));
document.querySelector('#saveManual').onclick=()=>{const n=document.querySelector('#manualName').value.trim(),c=+document.querySelector('#manualCal').value,p=+document.querySelector('#manualProtein').value;if(!n||c<0||p<0)return toast('יש להשלים את הפרטים');addFood(n,c,p);['manualName','manualCal','manualProtein'].forEach(id=>document.querySelector('#'+id).value='');hideModals()};
document.querySelector('#saveSettings').onclick=()=>{const c=+document.querySelector('#goalCal').value,p=+document.querySelector('#goalProtein').value;if(c<=0||p<=0)return;state.settings={calories:c,protein:p};save();render();hideModals();toast('היעדים עודכנו')};
document.querySelector('#prevDay').onclick=()=>moveDay(-1);document.querySelector('#nextDay').onclick=()=>moveDay(1);
document.querySelector('#smartInput').addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
   e.preventDefault();
   renderPreview(parseSmart(e.currentTarget.value));
 }
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
render();
