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

function parseSmart(text){
 const normalized=text.toLowerCase().replace(/,/g,' + ').replace(/\n/g,' + ');
 const parts=normalized.split(/\+| וגם | עם /).map(s=>s.trim()).filter(Boolean);
 const out=[]; const unknown=[];
 for(let part of parts){
   let matched=false;
   for(const f of foods){const key=f.keys.find(k=>part.includes(k));if(!key)continue; const before=part.slice(0,part.indexOf(key)); const after=part.slice(part.indexOf(key)+key.length); const all=before+' '+after; const gm=all.match(/(\d+(?:\.\d+)?)\s*(?:גרם|ג(?:רם)?\b|gr?\b)/); const grams=gm?+gm[1]:100; out.push({name:`${f.name} — ${round(grams)} גרם`,cal:round(f.per100[0]*grams/100),protein:round(f.per100[1]*grams/100,1)});matched=true;break;}
   if(matched)continue;
   for(const u of units){const key=u.keys.find(k=>part.includes(k));if(!key)continue; const nm=part.match(/(^|\s)(\d+)\s*(?:x|×)?\s*(?=[א-תa-z])/i); let count=1; if(nm) count=Math.max(1,+nm[2]); if(part.includes('שני ')||part.includes('שתי '))count=2; if(part.includes('שלושה ')||part.includes('שלוש '))count=3; out.push({name:count>1?`${count} × ${u.name}`:u.name,cal:u.cal*count,protein:round(u.protein*count,1)});matched=true;break;}
   if(!matched && part.length>1)unknown.push(part);
 }
 return {items:out,unknown};
}


function buildChatGPTPrompt(text){
 return `חשב לי את הקלוריות והחלבון בארוחה הבאה:
${text}

החזר הערכה ריאלית לפי הכמויות, אופן ההכנה, שמן/טיגון/רטבים אם צוינו.
בסוף החזר גם JSON בלבד בפורמט הבא כדי שאוכל להדביק אותו ל-NutriTrack:
{"items":[{"name":"שם המאכל","calories":123,"protein":12.3}]}
אל תוסיף שדות אחרים ל-JSON.`;
}

async function openInChatGPT(){
 const text=document.querySelector('#smartInput').value.trim();
 if(!text)return toast('כתוב מה אכלת');
 const prompt=buildChatGPTPrompt(text);
 try{await navigator.clipboard.writeText(prompt);toast('הטקסט הועתק — הדבק אותו ב-ChatGPT');}
 catch(e){toast('פתח את ChatGPT והעתק אליו את תיאור הארוחה');}
 // Opening ChatGPT uses the user's signed-in ChatGPT account; no API key is embedded.
 window.open('https://chatgpt.com/','_blank','noopener');
}

function extractJson(text){
 const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 try{return JSON.parse(cleaned)}catch{}
 const a=cleaned.indexOf('{'), b=cleaned.lastIndexOf('}');
 if(a>=0&&b>a){return JSON.parse(cleaned.slice(a,b+1))}
 throw new Error('JSON_NOT_FOUND');
}

function importChatGPTResult(){
 const raw=document.querySelector('#chatgptResult').value;
 try{
   const data=extractJson(raw);
   if(!Array.isArray(data.items)||!data.items.length)throw new Error('NO_ITEMS');
   const items=data.items.map(i=>({
     name:String(i.name||'מאכל').slice(0,80),
     cal:Math.max(0,round(Number(i.calories)||0)),
     protein:Math.max(0,round(Number(i.protein)||0,1))
   }));
   pending=items;
   hideModals();
   renderPreview({items,unknown:[]});
   toast('התוצאה מוכנה לבדיקה');
 }catch(e){
   toast('לא הצלחתי לקרוא את התוצאה. נסה להעתיק את ה-JSON מ-ChatGPT');
 }
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

function renderPreview(result){pending=result.items;const p=document.querySelector('#preview');p.innerHTML='';if(!result.items.length){p.classList.add('show');p.innerHTML='<div>לא הצלחתי לזהות את המאכלים. אפשר להשתמש בהוספה ידנית.</div>';return} result.items.forEach(i=>{const r=document.createElement('div');r.className='preview-row';r.innerHTML=`<span></span><b>${i.cal} קל׳ · ${i.protein}g</b>`;r.querySelector('span').textContent=i.name;p.appendChild(r)});const totalCal=round(result.items.reduce((s,x)=>s+x.cal,0)), totalP=round(result.items.reduce((s,x)=>s+x.protein,0),1);const sum=document.createElement('div');sum.style.marginTop='10px';sum.innerHTML=`<b>סה״כ: ${totalCal} קל׳ · ${totalP}g חלבון</b>${result.unknown.length?`<div style="color:var(--muted);font-size:12px;margin-top:5px">לא זוהה: ${result.unknown.map(escapeHtml).join(' · ')}</div>`:''}<button class="btn primary" style="width:100%;margin-top:10px" id="confirmSmart">הוסף ליום</button>`;p.appendChild(sum);p.classList.add('show');document.querySelector('#confirmSmart').onclick=()=>{pending.forEach(i=>addFood(i.name,i.cal,i.protein));p.classList.remove('show');document.querySelector('#smartInput').value='';pending=[]}}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

quickFoods.forEach(([n,c,p])=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>addFood(n,c,p);document.querySelector('#quick').appendChild(b)});
document.querySelector('#analyzeBtn').onclick=openInChatGPT;
document.querySelector('#pasteChatGPT').onclick=()=>{document.querySelector('#chatgptResult').value='';showModal('#chatgptResultModal')};
document.querySelector('#importChatGPT').onclick=importChatGPTResult;
document.querySelector('#manualBtn').onclick=()=>showModal('#manualModal');
document.querySelector('#settingsBtn').onclick=()=>{document.querySelector('#goalCal').value=state.settings.calories;document.querySelector('#goalProtein').value=state.settings.protein;showModal('#settingsModal')};
document.querySelectorAll('.closeModal').forEach(b=>b.onclick=hideModals);document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)hideModals()}));
document.querySelector('#saveManual').onclick=()=>{const n=document.querySelector('#manualName').value.trim(),c=+document.querySelector('#manualCal').value,p=+document.querySelector('#manualProtein').value;if(!n||c<0||p<0)return toast('יש להשלים את הפרטים');addFood(n,c,p);['manualName','manualCal','manualProtein'].forEach(id=>document.querySelector('#'+id).value='');hideModals()};
document.querySelector('#saveSettings').onclick=()=>{const c=+document.querySelector('#goalCal').value,p=+document.querySelector('#goalProtein').value;if(c<=0||p<=0)return;state.settings={calories:c,protein:p};save();render();hideModals();toast('היעדים עודכנו')};
document.querySelector('#prevDay').onclick=()=>moveDay(-1);document.querySelector('#nextDay').onclick=()=>moveDay(1);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
render();
