const APP = "Faith Journey DGroup Enhanced";
const STORAGE_KEY = "fj.entries.v3";
const PIN_KEY = "fj.pin.v3";
const PROFILE_KEY = "fj.profile.v3";
const GOSPEL_KEY = "fj.gospel.v3";

const moods = [
  ["peaceful","🕊️ Peaceful"],["anxious","🌧️ Anxious"],["grateful","🌻 Grateful"],
  ["heavy","🪨 Heavy"],["hopeful","🌤️ Hopeful"],["confused","🌫️ Confused"],["joyful","✨ Joyful"]
];

const verses = [
  ["Come to Me, all who labor and are heavy laden, and I will give you rest.","Matthew 11:28"],
  ["The Lord is near to the brokenhearted and saves the crushed in spirit.","Psalm 34:18"],
  ["Cast all your anxiety on Him because He cares for you.","1 Peter 5:7"],
  ["Be still, and know that I am God.","Psalm 46:10"],
  ["My grace is sufficient for you, for My power is made perfect in weakness.","2 Corinthians 12:9"],
  ["Trust in the Lord with all your heart, and do not lean on your own understanding.","Proverbs 3:5"]
];

const prompts = ["What are you carrying today?","Where did you notice grace?","What prayer feels unfinished?","What is God teaching you in this season?"];
let selectedMood = "hopeful";
const viewOrder = ["home","write","gospel","history","insights","prayers","support","settings"];
const $ = id => document.getElementById(id);
const getEntries = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const setEntries = data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const getGospel = () => JSON.parse(localStorage.getItem(GOSPEL_KEY) || "[]");
const setGospel = data => localStorage.setItem(GOSPEL_KEY, JSON.stringify(data));
const getProfile = () => JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"name":"Friend"}');

function init(){
  setupLock(); setupVerse(); renderMoodPicker(); setupNavigation(); setupActions(); renderAll();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

function setupLock(){
  const hasPin = !!localStorage.getItem(PIN_KEY);
  $("setupPanel").classList.toggle("hidden", hasPin);
  $("loginPanel").classList.toggle("hidden", !hasPin);
  $("lockHint").textContent = hasPin ? "Welcome back. Your app is locked." : "Create a private code. Prototype data stays on this device.";
  $("createVaultBtn").onclick = () => {
    const name = $("nameInput").value.trim() || "Friend";
    const pin = $("pinSetupInput").value.trim();
    if(pin.length < 3) return alert("Use at least 3 characters for your private code.");
    localStorage.setItem(PIN_KEY, pin);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({name}));
    unlock();
  };
  $("unlockBtn").onclick = () => {
    if($("pinInput").value.trim() === localStorage.getItem(PIN_KEY)) unlock();
    else $("lockHint").textContent = "That private code does not match.";
  };
  $("resetVaultBtn").onclick = () => {
    if(confirm("Reset everything on this device? This clears profile, code, diary, and Gospel records.")){
      localStorage.removeItem(PIN_KEY); localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(GOSPEL_KEY); location.reload();
    }
  };
}

function unlock(){
  const profile = getProfile();
  const hour = new Date().getHours();
  $("greeting").textContent = hour < 12 ? `Good morning, ${profile.name}` : hour < 18 ? `Good afternoon, ${profile.name}` : `Good evening, ${profile.name}`;
  $("lockScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  $("entryText").placeholder = prompts[new Date().getDate() % prompts.length];
  renderAll();
}

function setupVerse(){
  const v = verses[new Date().getDate() % verses.length];
  $("verseText").textContent = `“${v[0]}”`; $("verseRef").textContent = v[1];
}

function setupNavigation(){
  document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => {
    document.querySelectorAll(".tab,.view").forEach(el => el.classList.remove("active"));
    tab.classList.add("active"); $(tab.dataset.view).classList.add("active"); renderAll();
  });
}

function setupActions(){
  $("lockBtn").onclick = () => { $("app").classList.add("hidden"); $("lockScreen").classList.remove("hidden"); $("pinInput").value = ""; };
  $("copyVerseBtn").onclick = () => navigator.clipboard?.writeText(`${$("verseText").innerText} — ${$("verseRef").innerText}`);
  $("saveEntryBtn").onclick = saveEntry; $("saveGospelBtn").onclick = saveGospelInteraction;
  $("readAloudBtn").onclick = readAloud; $("saveFavoriteBtn").onclick = () => alert("Saved in this entry as a comfort reflection.");
  $("weeklyBtn").onclick = weeklyReflection; $("breathBtn").onclick = breathPrayer; $("supportBtn").onclick = aiSupport;
  $("changeCodeBtn").onclick = changeCode; $("exportJsonBtn").onclick = backupJson; $("importJsonInput").onchange = restoreJson; $("exportPrintBtn").onclick = exportPrintable;
  $("clearBtn").onclick = () => { if(confirm("Clear local diary and Gospel records?")){ setEntries([]); setGospel([]); renderAll(); } };
  $("nextViewBtn").onclick = () => moveView(1); $("prevViewBtn").onclick = () => moveView(-1);
  document.querySelectorAll("[data-go]").forEach(btn => btn.onclick = () => document.querySelector(`.tab[data-view="${btn.dataset.go}"]`)?.click());
  ["searchInput","moodFilter","dateFrom","dateTo"].forEach(id => $(id).oninput = renderHistory);
  document.querySelectorAll("[data-insert]").forEach(btn => btn.onclick = () => { $("entryText").value += `\n${btn.dataset.insert}`; $("entryText").focus(); });
}

function moveView(step){
  const active = document.querySelector(".view.active")?.id || "home";
  const idx = viewOrder.indexOf(active);
  const next = viewOrder[(idx + step + viewOrder.length) % viewOrder.length];
  document.querySelector(`.tab[data-view="${next}"]`)?.click();
  window.scrollTo({top:0, behavior:"smooth"});
}

function renderMoodPicker(){
  $("moodPicker").innerHTML = moods.map(([key,label]) => `<button class="mood ${key===selectedMood?'active':''}" data-mood="${key}">${label}</button>`).join("");
  $("moodFilter").innerHTML = `<option value="">All moods</option>` + moods.map(([key,label])=>`<option value="${key}">${label}</option>`).join("");
  document.querySelectorAll(".mood").forEach(btn => btn.onclick = () => { selectedMood = btn.dataset.mood; renderMoodPicker(); });
}

function saveEntry(){
  const text = $("entryText").value.trim();
  if(!text) return alert("Write a few honest words first.");
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: new Date().toISOString(), mood: selectedMood, text,
    themes: extractThemes(text), prayerRequests: extractLines(text, "Prayer Request"),
    gratitude: extractLines(text, "Gratitude"), answered: extractLines(text, "Answered Prayer"),
    shareable: $("sharePrayerToggle")?.checked || false, response: generateComfort(text, selectedMood)
  };
  setEntries([item, ...getEntries()]);
  $("entryText").value = ""; if($("sharePrayerToggle")) $("sharePrayerToggle").checked = false;
  $("aiResponse").innerHTML = item.response; $("aiResponseCard").classList.remove("hidden"); renderAll();
}

function generateComfort(text, mood){
  const low = text.toLowerCase();
  const moodIntro = {peaceful:"There is a quiet steadiness in your words.",anxious:"I hear the anxious places you are carrying, and God is not distant from them.",grateful:"Your gratitude is becoming a memorial stone of God's faithfulness.",heavy:"Your heart sounds tired. You do not need to perform strength before God.",hopeful:"Hope is showing up here, even if it is still tender.",confused:"Your questions are welcome in God's presence.",joyful:"Joy is present here, and it is worth receiving fully."}[mood] || "God sees what is beneath these words.";
  let focus = [];
  if(low.includes("family")) focus.push("family"); if(low.includes("work")) focus.push("work"); if(low.includes("health")) focus.push("health"); if(low.includes("financial") || low.includes("money")) focus.push("provision");
  return `<p>${moodIntro} ${focus.length ? "You brought " + focus.join(", ") + " before God." : "You came honestly before God."}</p>
  <p>Your prayers do not need perfect words. God graciously receives the sincere heart.</p>
  <p><strong>Scripture to hold:</strong> “Cast all your anxiety on Him because He cares for you” — 1 Peter 5:7.</p>
  <p><strong>Next gentle step:</strong> Ask, <em>Lord, what is mine to obey today, and what must I surrender back to You?</em></p>`;
}

function saveGospelInteraction(){
  const name = $("gospelName").value.trim();
  if(!name) return alert("Please add a contact name or initials.");
  const stage = Number($("gospelStage").value);
  const data = getGospel();
  const existingIndex = data.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  const record = {
    id: existingIndex >= 0 ? data[existingIndex].id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name, stage, topics: $("gospelTopics").value.trim(), prayer: $("gospelPrayer").value.trim(),
    next: $("gospelNext").value, priority: $("gospelPriority").value, consent: $("gospelConsent").value,
    lastInteraction: new Date().toISOString(), history: existingIndex >= 0 ? data[existingIndex].history || [] : []
  };
  record.history.unshift({date: record.lastInteraction, stage, topics: record.topics, prayer: record.prayer, next: record.next, priority: record.priority, consent: record.consent});
  if(existingIndex >= 0) data[existingIndex] = record; else data.unshift(record);
  setGospel(data);
  ["gospelName","gospelTopics","gospelPrayer","gospelNext"].forEach(id => $(id).value = "");
  $("gospelPriority").value = "normal"; $("gospelConsent").value = "ministry";
  renderAll(); alert("Gospel interaction saved.");
}

function renderGospel(){
  const data = getGospel(), now = Date.now();
  [1,2,3,4,5].forEach(stage => { const el = $(`stage${stage}Count`); if(el) el.textContent = data.filter(x => Number(x.stage) === stage).length; });
  const overdue = data.filter(x => x.next && new Date(x.next+"T23:59:59").getTime() < now);
  const active = data.filter(x => x.next && new Date(x.next+"T23:59:59").getTime() >= now);
  $("totalContacts").textContent = data.length; $("activeFollowups").textContent = active.length; $("overdueFollowups").textContent = overdue.length; $("multipliersCount").textContent = data.filter(x => Number(x.stage)===5).length;
  renderPipeline("pipelineBars", data); renderPipeline("homeFunnel", data);
  const urgent = data.filter(x => x.priority === "urgent" || (now - new Date(x.lastInteraction).getTime()) / 86400000 > 14);
  $("urgentCareList").innerHTML = urgent.length ? urgent.map(x => `<div class="urgent"><strong>${escapeHtml(x.name)}</strong><br><small>Last interaction: ${new Date(x.lastInteraction).toLocaleDateString()} • Stage ${x.stage}</small></div>`).join("") : `<p class="muted">No urgent care alerts. Praise God for consistent follow-up.</p>`;
  const moved = data.filter(x => (x.history||[]).length > 1).slice(0,6);
  $("movementList").innerHTML = moved.length ? moved.map(x => { const latest=x.history[0], prev=x.history[1]; const direction = Number(latest.stage)>Number(prev.stage) ? "moved up" : Number(latest.stage)<Number(prev.stage) ? "needs care" : "remained"; return `<div class="movement-item"><strong>${escapeHtml(x.name)}</strong> ${direction}<br><small>Stage ${prev.stage} → Stage ${latest.stage}</small></div>`; }).join("") : `<p class="muted">Stage movement will appear after a contact has more than one logged interaction.</p>`;
  $("gospelList").innerHTML = data.length ? data.map(x => { const pct=(Number(x.stage)/5)*100; const cls=x.priority==="urgent"?"priority-urgent":x.priority==="high"?"priority-high":""; return `<div class="contact-card ${cls}"><strong>${escapeHtml(x.name)}</strong><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><small>Stage ${x.stage}: ${stageLabel(x.stage)}<br>Last: ${new Date(x.lastInteraction).toLocaleDateString()}${x.next ? " • Next: "+x.next : ""}</small><br><span class="badge">${x.priority}</span> <span class="badge">${x.consent}</span>${x.prayer ? `<p>🙏 ${escapeHtml(x.prayer)}</p>` : ""}</div>`; }).join("") : `<p class="muted">No Gospel contacts yet. Add the first person you are praying for or following up.</p>`;
}

function renderPipeline(id, data){
  const el = $(id); if(!el) return;
  const max = Math.max(1, ...[1,2,3,4,5].map(s => data.filter(x => Number(x.stage)===s).length));
  el.innerHTML = [1,2,3,4,5].map(s => { const count=data.filter(x => Number(x.stage)===s).length; return `<div class="pipeline-row"><small><span>Stage ${s}: ${stageLabel(s)}</span><strong>${count}</strong></small><div class="pipeline-bg"><div class="pipeline-fg" style="width:${(count/max)*100}%"></div></div></div>`; }).join("");
}

function renderHome(){
  const diary = getEntries(), gospel = getGospel(), now = Date.now();
  const prayers = diary.reduce((n,e)=>n+(e.prayerRequests?.length||0),0);
  const urgent = gospel.filter(x => x.priority==="urgent" || (now - new Date(x.lastInteraction).getTime())/86400000 > 14);
  $("homeGreeting").textContent = `${getProfile().name || "Friend"}, here is your ministry snapshot.`;
  $("homeEntries").textContent = diary.length; $("homePrayers").textContent = prayers; $("homeContacts").textContent = gospel.length; $("homeUrgent").textContent = urgent.length;
  const stage3 = gospel.filter(x => Number(x.stage)===3).length, stage5 = gospel.filter(x => Number(x.stage)===5).length;
  $("leaderSummary").innerHTML = `<p>Your group currently has <strong>${gospel.length}</strong> tracked Gospel contacts, with <strong>${urgent.length}</strong> needing follow-up or special care. There are <strong>${stage3}</strong> people in regular Bible study and <strong>${stage5}</strong> multiplier(s). Numbers are tools for stewardship, not measures of spiritual worth.</p>`;
  const actions = [];
  urgent.slice(0,3).forEach(x => actions.push(`Follow up with ${escapeHtml(x.name)} — last interaction ${new Date(x.lastInteraction).toLocaleDateString()}.`));
  if(!diary.length) actions.push("Write your first private diary entry today.");
  if(!gospel.length) actions.push("Add your first Gospel contact or person you are praying for.");
  if(actions.length === 0) actions.push("Review your prayer board and thank God for one answered prayer.");
  $("nextActions").innerHTML = actions.map(a => `<div class="action-item">${a}</div>`).join("");
}

function renderHistory(){
  const q=$("searchInput").value.toLowerCase(), mood=$("moodFilter").value, from=$("dateFrom").value, to=$("dateTo").value;
  const data = getEntries().filter(e => { const d=e.date.slice(0,10); return (!q || `${e.text} ${e.response} ${(e.themes||[]).join(" ")}`.toLowerCase().includes(q)) && (!mood || e.mood===mood) && (!from || d>=from) && (!to || d<=to); });
  $("timeline").innerHTML = data.length ? data.map(e => `<article class="timeline-item"><small>${new Date(e.date).toLocaleString()} • ${moods.find(m=>m[0]===e.mood)?.[1] || e.mood}${e.shareable ? " • shareable" : ""}</small><p>${escapeHtml(e.text)}</p><details><summary>Comfort Reflection</summary>${e.response}</details></article>`).join("") : `<p class="muted">No entries yet. Start with one honest sentence.</p>`;
}

function renderInsights(){
  const data=getEntries();
  $("totalEntries").textContent=data.length; $("answeredCount").textContent=data.reduce((n,e)=>n+(e.answered?.length||0),0); $("prayerCount").textContent=data.reduce((n,e)=>n+(e.prayerRequests?.length||0),0); $("streakDays").textContent=streak(data);
  renderMoodChart(data);
  const counts={}; data.flatMap(e=>e.themes||[]).forEach(t=>counts[t]=(counts[t]||0)+1);
  $("themeCloud").innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<span>${t} × ${n}</span>`).join("") || `<p class="muted">Themes will appear as you write more entries.</p>`;
}

function renderPrayerBoard(){
  const data=getEntries();
  const reqs=data.flatMap(e=>(e.prayerRequests||[]).map(x=>({x,date:e.date,share:e.shareable})));
  const ans=data.flatMap(e=>(e.answered||[]).map(x=>({x,date:e.date,share:e.shareable})));
  const grats=data.flatMap(e=>(e.gratitude||[]).map(x=>({x,date:e.date,share:e.shareable})));
  $("requestsList").innerHTML = reqs.length ? reqs.map(r=>`<div>🙏 ${escapeHtml(r.x)} ${r.share?'<span class="badge">shareable</span>':''}<br><small>${new Date(r.date).toLocaleDateString()}</small></div>`).join("") : `<p class="muted">Use “+ Prayer” while writing.</p>`;
  $("answeredList").innerHTML = ans.length ? ans.map(r=>`<div>✨ ${escapeHtml(r.x)} ${r.share?'<span class="badge">shareable</span>':''}<br><small>${new Date(r.date).toLocaleDateString()}</small></div>`).join("") : `<p class="muted">Use “+ Answered” when God answers a prayer.</p>`;
  $("gratitudeList").innerHTML = grats.length ? grats.map(r=>`<div>🌿 ${escapeHtml(r.x)}<br><small>${new Date(r.date).toLocaleDateString()}</small></div>`).join("") : `<p class="muted">Use “+ Gratitude” to remember grace.</p>`;
}

function renderAll(){ renderHistory(); renderInsights(); renderPrayerBoard(); renderGospel(); renderHome(); }

function aiSupport(){
  const type=$("supportType").value, text=$("supportText").value.trim(), low=text.toLowerCase();
  let focus="what you are carrying"; if(low.includes("family")) focus="your family"; if(low.includes("work")) focus="your work"; if(low.includes("health")) focus="healing and strength"; if(low.includes("financial")||low.includes("money")) focus="provision and trust";
  let response="";
  if(type==="prayer") response=`<p>Lord, I lift up ${focus} to You. Please give peace where there is pressure, wisdom where there is confusion, and courage for the next faithful step. Amen.</p>`;
  else if(type==="verse") response=`<p><strong>Suggested verse:</strong> “The Lord is near to the brokenhearted and saves the crushed in spirit.” — Psalm 34:18</p>`;
  else if(type==="reflection") response=`<p>Reflection question: <strong>What part of this situation am I trying to control, and what would it look like to surrender that part to God today?</strong></p>`;
  else response=`<p>You do not have to carry ${focus} alone. God invites you to come honestly, receive grace, and take only the next faithful step.</p><p><strong>Hold this:</strong> “Cast all your anxiety on Him because He cares for you” — 1 Peter 5:7.</p>`;
  $("supportResponse").innerHTML=response;
}

function weeklyReflection(){
  const data=getEntries().slice(0,7); if(data.length<3){ $("weeklyReflection").innerHTML=`<p class="muted">Write at least 3 entries first.</p>`; return; }
  const themes=[...new Set(data.flatMap(e=>e.themes||[]))].join(", ") || "honesty, prayer, surrender";
  $("weeklyReflection").innerHTML=`<article class="timeline-item"><p>Dear ${getProfile().name || "Friend"},</p><p>This week, your heart kept returning to <strong>${themes}</strong>. The pattern I see is not perfection, but returning. That is spiritual growth.</p></article>`;
}

function breathPrayer(){
  const circle=$("breathCircle"), line=$("breathLine"), lines=["Inhale: Lord Jesus","Exhale: I give You my burdens","Inhale: I am held","Exhale: I receive Your peace"];
  let i=0, seconds=0; $("breathBtn").disabled=true;
  const timer=setInterval(()=>{ line.textContent=lines[i%lines.length]; circle.textContent=i%2===0?"Inhale":"Exhale"; circle.classList.toggle("expand", i%2===0); i++; seconds+=4; if(seconds>=60){ clearInterval(timer); circle.textContent="Amen"; line.textContent="Amen. Write when you are ready."; $("breathBtn").disabled=false; }},4000);
}

function renderMoodChart(data){
  const c=$("moodChart"), ctx=c.getContext("2d"); ctx.clearRect(0,0,c.width,c.height); ctx.strokeStyle="#9fb5d0"; ctx.fillStyle="#123a6f"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,160); ctx.lineTo(325,160); ctx.moveTo(28,22); ctx.lineTo(28,160); ctx.stroke();
  const recent=[...data].reverse().slice(-14), score={heavy:1,anxious:2,confused:3,hopeful:4,peaceful:5,grateful:6,joyful:7};
  recent.forEach((e,i)=>{ const x=40+i*(260/Math.max(1,recent.length-1)), y=168-(score[e.mood]||3)*19; if(i>0){ const p=recent[i-1], px=40+(i-1)*(260/Math.max(1,recent.length-1)), py=168-(score[p.mood]||3)*19; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(x,y); ctx.stroke(); } ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); });
  ctx.fillText("heavy",32,154); ctx.fillText("joy",32,36);
}

function readAloud(){ const text=$("aiResponse").innerText; if(!("speechSynthesis" in window)) return alert("Read aloud is not supported."); speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=.88; u.pitch=.95; speechSynthesis.speak(u); }
function changeCode(){ const pin=prompt("Enter a new private code:"); if(pin && pin.trim().length>=3){ localStorage.setItem(PIN_KEY,pin.trim()); alert("Private code updated."); } }
function backupJson(){ const payload={app:APP,version:3,profile:getProfile(),entries:getEntries(),gospel:getGospel(),exportedAt:new Date().toISOString()}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="faith-journey-backup.json"; a.click(); URL.revokeObjectURL(a.href); }
function restoreJson(e){ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(Array.isArray(data.entries)) setEntries(data.entries); if(Array.isArray(data.gospel)) setGospel(data.gospel); if(data.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile)); alert("Backup restored."); renderAll(); }catch{ alert("Could not read backup file."); } }; reader.readAsText(file); }
function exportPrintable(){ const data=getEntries().slice().reverse(); const html=`<html><head><title>My Year with God</title><style>body{font-family:Georgia,serif;padding:35px;line-height:1.65;color:#0f2747}article{page-break-inside:avoid;border-bottom:1px solid #ddd;padding:20px 0}small{color:#777}</style></head><body><h1>My Year with God</h1><p>${escapeHtml(getProfile().name||"Friend")}</p>${data.map(e=>`<article><small>${new Date(e.date).toLocaleString()} • ${e.mood}</small><p>${escapeHtml(e.text)}</p><h3>Comfort Reflection</h3>${e.response}</article>`).join("")}</body></html>`; const w=window.open("","_blank"); w.document.write(html); w.document.close(); w.print(); }
function extractLines(text, marker){ return text.split("\n").filter(l=>l.toLowerCase().includes(marker.toLowerCase()+":")).map(l=>l.replace(/^.*?:/,"").trim()).filter(Boolean); }
function extractThemes(text){ const words=["family","health","financial","work","calling","fear","peace","gratitude","relationship","forgiveness","guidance","waiting","healing","faith","purpose","provision","ministry"]; const low=text.toLowerCase(); return words.filter(w=>low.includes(w)); }
function streak(data){ const days=new Set(data.map(e=>e.date.slice(0,10))); let s=0,d=new Date(); while(days.has(d.toISOString().slice(0,10))){ s++; d.setDate(d.getDate()-1); } return s; }
function stageLabel(stage){ return {1:"Seed Planted",2:"Decision / Open for Follow-up",3:"Foundation",4:"Community",5:"Multiplier"}[Number(stage)] || "Unknown"; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
init();
