// ===================== BACKEND CONNECTION =====================
// Change this if your API runs somewhere else (e.g. a deployed URL).
// If the backend serves this page (http://localhost:5000) we use the same origin.
// If you open it any other way (Live Server, file://) it calls localhost:5000.
// For a deployed backend, replace the value below with your URL, e.g. "https://your-api.onrender.com/api".
const API_BASE = location.port === "5000" ? "/api" : "http://localhost:5000/api";

let authToken = localStorage.getItem("driveease_token") || null;
let currentUser = JSON.parse(localStorage.getItem("driveease_user") || "null");
let backendOnline = false; // set true once /api/health responds

// Thin fetch wrapper: adds JSON headers + auth token, throws on non-2xx.
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = "Bearer " + authToken;
  const res = await fetch(API_BASE + path, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function logout() {
  authToken = null; currentUser = null;
  localStorage.removeItem("driveease_token");
  localStorage.removeItem("driveease_user");
  $("#loginBtn").textContent = "Login";
}
// ================================================================

// Demo fallback data — used automatically if the backend isn't running,
// so the site still works stand-alone. Once the API responds, loadCars()
// below replaces this with the live data from MySQL.
let cars=[
{id:1,name:"Hyundai i20",type:"hatchback",price:1450,rating:4.6,seats:5,transmission:"Automatic",fuel:"Petrol",image:"https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80",tag:"Popular"},
{id:2,name:"Honda City",type:"sedan",price:2100,rating:4.8,seats:5,transmission:"Automatic",fuel:"Petrol",image:"https://images.unsplash.com/photo-1605559424843-9e4c228bf1c9?auto=format&fit=crop&w=900&q=80",tag:"Top Rated"},
{id:3,name:"Toyota Innova",type:"suv",price:3200,rating:4.9,seats:7,transmission:"Automatic",fuel:"Diesel",image:"https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80",tag:"Family Pick"},
{id:4,name:"Mahindra Thar",type:"suv",price:2800,rating:4.7,seats:5,transmission:"Manual",fuel:"Diesel",image:"https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",tag:"Adventure"},
{id:5,name:"BMW 3 Series",type:"luxury",price:6200,rating:4.9,seats:5,transmission:"Automatic",fuel:"Petrol",image:"https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80",tag:"Premium"},
{id:6,name:"Tata Punch",type:"hatchback",price:1650,rating:4.5,seats:5,transmission:"Manual",fuel:"Petrol",image:"https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80",tag:"Value Pick"}
];
const ADDON_LABELS={"0":"None","300":"Child seat","500":"Extra insurance","700":"GPS + Wi-Fi"};
let selectedCategory="all", compare=[], wishlist=JSON.parse(localStorage.getItem("driveease_wishlist")||"[]"), bookings=JSON.parse(localStorage.getItem("driveease_bookings")||"[]"), quiz={};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function save(){localStorage.setItem("driveease_wishlist",JSON.stringify(wishlist));localStorage.setItem("driveease_bookings",JSON.stringify(bookings));$("#wishCount").textContent=wishlist.length}
function renderCars(){
 let q=$("#carSearch").value.toLowerCase(),sort=$("#sortCars").value;
 let list=cars.filter(c=>(selectedCategory==="all"||c.type===selectedCategory)&&c.name.toLowerCase().includes(q));
 if(sort==="low")list.sort((a,b)=>a.price-b.price); if(sort==="high")list.sort((a,b)=>b.price-a.price); if(sort==="rating")list.sort((a,b)=>b.rating-a.rating);
 $("#carGrid").innerHTML=list.map(c=>`<article class="car-card">
 <div class="car-image"><img src="${c.image}" alt="${c.name}"><span class="car-tag">${c.tag}</span><button class="heart ${wishlist.includes(c.id)?"saved":""}" onclick="toggleWish(${c.id})">${wishlist.includes(c.id)?"♥":"♡"}</button></div>
 <div class="car-body"><div class="car-title"><h3>${c.name}</h3><span class="rating">★ ${c.rating}</span></div>
 <div class="meta"><span>👥 ${c.seats}</span><span>⚙ ${c.transmission}</span><span>⛽ ${c.fuel}</span></div>
 <div class="price">₹${c.price.toLocaleString()} <small>/ day</small></div>
 <div class="card-actions"><button class="details-btn" onclick="showDetails(${c.id})">View Details</button><button class="details-btn" onclick="toggleCompare(${c.id})">${compare.includes(c.id)?"✓ Added":"Compare"}</button></div>
 <button class="book-btn" style="width:100%;margin-top:8px" onclick="openBooking(${c.id})">Book Now</button></div></article>`).join("")||`<div class="empty-state" style="grid-column:1/-1">No matching cars found.</div>`;
}
async function toggleWish(id){
 if(authToken&&backendOnline){
   try{ const {saved}=await api(`/wishlist/${id}`,{method:"POST"}); wishlist=saved?[...wishlist,id]:wishlist.filter(x=>x!==id) }
   catch(err){ return toast(err.message) }
 } else {
   wishlist=wishlist.includes(id)?wishlist.filter(x=>x!==id):[...wishlist,id];
 }
 save();renderCars();toast(wishlist.includes(id)?"Added to wishlist":"Removed from wishlist")
}
async function syncWishlistFromServer(){
 try{ const rows=await api("/wishlist"); wishlist=rows.map(c=>c.id); save(); renderCars() }catch(err){}
}
function toggleCompare(id){if(compare.includes(id))compare=compare.filter(x=>x!==id);else{if(compare.length>=3)return toast("You can compare up to 3 cars");compare.push(id)}renderCars();renderCompare();document.querySelector("#compare").scrollIntoView({behavior:"smooth",block:"center"})}
function renderCompare(){
 if(!compare.length){$("#compareArea").className="compare-area empty-state";$("#compareArea").innerHTML="No cars selected yet. Click <b>Compare</b> on any car card.";return}
 $("#compareArea").className="compare-area";let cs=compare.map(id=>cars.find(c=>c.id===id));
 $("#compareArea").innerHTML=`<table class="compare-table"><tr><th>Feature</th>${cs.map(c=>`<th><img src="${c.image}" alt=""><br>${c.name}</th>`).join("")}</tr>
 ${["Price / day","Rating","Seats","Transmission","Fuel","Category"].map((x,i)=>`<tr><td><b>${x}</b></td>${cs.map(c=>`<td>${[`₹${c.price.toLocaleString()}`,`★ ${c.rating}`,c.seats,c.transmission,c.fuel,c.type.toUpperCase()][i]}</td>`).join("")}</tr>`).join("")}
 <tr><td></td>${cs.map(c=>`<td><button class="btn btn-primary" onclick="openBooking(${c.id})">Book ${c.name}</button></td>`).join("")}</tr></table>`;
}
function showDetails(id){let c=cars.find(x=>x.id===id);$("#detailContent").innerHTML=`<img style="width:100%;height:280px;object-fit:cover;border-radius:14px" src="${c.image}" alt="${c.name}"><div style="padding-top:18px"><span class="eyebrow">${c.type.toUpperCase()}</span><h2>${c.name}</h2><p style="color:#64748b">A comfortable demo vehicle with transparent daily pricing and flexible rental options.</p><div class="meta" style="font-size:14px;margin:16px 0"><span>👥 ${c.seats} seats</span><span>⚙ ${c.transmission}</span><span>⛽ ${c.fuel}</span><span>★ ${c.rating}</span></div><h3>₹${c.price.toLocaleString()} / day</h3><button class="btn btn-primary" style="margin-top:15px" onclick="openBooking(${c.id});closeModal('detailModal')">Book this car</button></div>`;$("#detailModal").classList.add("show")}
function openBooking(id){let c=cars.find(x=>x.id===id),today=new Date().toISOString().split("T")[0];$("#bookingContent").innerHTML=`<span class="eyebrow">BOOKING</span><h2>Reserve ${c.name}</h2><p style="color:#64748b">Complete the demo booking form below.</p><div class="booking-form"><div><label>Pick-up date</label><input id="bookStart" type="date" value="${today}" min="${today}"></div><div><label>Return date</label><input id="bookEnd" type="date" value="${today}" min="${today}"></div><div><label>Pickup location</label><input id="bookLocation" value="Chennai"></div><div><label>Add-on</label><select id="bookAddon"><option value="0">None</option><option value="300">Child seat</option><option value="500">Extra insurance</option><option value="700">GPS + Wi-Fi</option></select></div></div><div class="booking-summary"><b>Estimated total: <span id="bookingTotal">₹${c.price.toLocaleString()}</span></b><br><small>₹${c.price.toLocaleString()} per day · Demo pricing</small></div>
<div class="booking-verification-note">🪪 <b>Identity verification required:</b> Before final rental confirmation, submit your ID proof and rental return date in the <a href="#verification" onclick="closeModal('bookingModal')">Verification section</a>.</div>
<button class="btn btn-primary full" id="confirmBooking">Continue to Verification</button>`;$("#bookingModal").classList.add("show");const update=()=>{let s=new Date($("#bookStart").value),e=new Date($("#bookEnd").value),days=Math.max(1,Math.ceil((e-s)/86400000)||1),addon=+$("#bookAddon").value;$("#bookingTotal").textContent="₹"+((c.price+addon)*days).toLocaleString()};["bookStart","bookEnd","bookAddon"].forEach(x=>$("#"+x).addEventListener("change",update));$("#confirmBooking").onclick=async()=>{
 let s=$("#bookStart").value,e=$("#bookEnd").value,addonVal=$("#bookAddon").value,addon=+addonVal,days=Math.max(1,Math.ceil((new Date(e)-new Date(s))/86400000)||1),total=(c.price+addon)*days;
 let record=null;
 if(authToken&&backendOnline){
   try{
     record=await api("/bookings",{method:"POST",body:JSON.stringify({carId:c.id,startDate:s,endDate:e,pickupLocation:$("#bookLocation").value,addon:ADDON_LABELS[addonVal]||"None"})});
     total=record.total; // always trust the server-calculated total
   }catch(err){ return toast(err.message) }
 }
 window.lastBookingId=record?record.id:null; // used to link the verification form to this booking
 let b=record?{id:record.id,car:c.name,start:s,end:e,total,status:record.status}:{id:Date.now(),car:c.name,start:s,end:e,total,status:"Verification Pending"};
 bookings.unshift(b);save();renderBookings();closeModal("bookingModal");
 document.querySelector("#verification").scrollIntoView({behavior:"smooth"});
 toast(authToken?"Booking saved to your account — complete identity verification 🔐":"Booking saved locally — log in to sync it to your account 🔐")
}}
async function loadBookingsFromServer(){
 try{
   const rows=await api("/bookings");
   bookings=rows.map(r=>({id:r.id,car:r.car_name,start:r.start_date,end:r.end_date,total:r.total,status:r.status}));
   save();renderBookings();
 }catch(err){}
}
function renderBookings(){if(!bookings.length){$("#bookingList").innerHTML='<div class="empty-state">No demo bookings yet. Book a car to see your reservation here.</div>';return}$("#bookingList").innerHTML=bookings.slice(0,5).map(b=>`<div class="booking-item"><div><b>${b.car}</b><br><small>${b.start} → ${b.end} · ₹${b.total.toLocaleString()}</small></div><span class="status">${b.status}</span></div>`).join("")}
function closeModal(id){$("#"+id).classList.remove("show")}
function setupQuiz(){ $$(".option-grid button").forEach(btn=>btn.onclick=()=>{let group=btn.parentElement.dataset.group;quiz[group]=btn.dataset.value;btn.parentElement.querySelectorAll("button").forEach(x=>x.classList.remove("active"));btn.classList.add("active")});$("#matchBtn").onclick=()=>{let result=cars.filter(c=>{let budget=quiz.budget==="low"?c.price<=2000:quiz.budget==="mid"?c.price<=4000:true;let seats=!quiz.seats||c.seats>=+quiz.seats;let trans=!quiz.transmission||quiz.transmission==="Any"||c.transmission===quiz.transmission;let purpose=quiz.purpose==="adventure"?c.type==="suv":quiz.purpose==="business"?c.type==="sedan"||c.type==="luxury":quiz.purpose==="family"?c.seats>=5:true;return budget&&seats&&trans&&purpose}).slice(0,3);if(!result.length)result=cars.slice(0,3);$("#matchResults").innerHTML=`<h3>✨ Your matches</h3>`+result.map(c=>`<div class="match-card"><img src="${c.image}"><div><b>${c.name}</b><br><small>₹${c.price.toLocaleString()}/day · ★ ${c.rating}</small></div><button class="btn btn-primary" onclick="openBooking(${c.id})">Book</button></div>`).join("")}}
async function calc(){
 let c=cars.find(x=>x.id==$("#calcCar").value)||cars[0],days=Math.max(1,+$("#calcDays").value||1),addonVal=$("#calcAddon").value,addon=+addonVal||0,promo=$("#promoInput").value.trim().toUpperCase();
 if(backendOnline){
   try{
     const r=await api("/bookings/calculate",{method:"POST",body:JSON.stringify({carId:c.id,days,addon:ADDON_LABELS[addonVal]||"None",promoCode:promo})});
     $("#calcTotal").textContent="₹"+r.total.toLocaleString();
     $("#calcBreakdown").textContent=`${r.days} day(s) · ₹${r.subtotal.toLocaleString()} subtotal · ${r.discount?`${r.discountPercent}% promo applied`:"No promo discount"}`;
     return;
   }catch(err){ /* fall through to local calc below */ }
 }
 let sub=(c.price+addon)*days,discount=promo==="DRIVE10"?sub*.1:promo==="WELCOME15"?sub*.15:0,total=Math.round(sub-discount);
 $("#calcTotal").textContent="₹"+total.toLocaleString();
 $("#calcBreakdown").textContent=`${days} day(s) · ₹${sub.toLocaleString()} subtotal · ${discount?"Promo discount applied": "No promo discount"}`;
}
function buildCalendar(){let d=new Date();window.calDate=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()}function renderCalendar(){let d=window.calDate,y=d.getFullYear(),m=d.getMonth();$("#calendarTitle").textContent=d.toLocaleString("en",{month:"long",year:"numeric"});let first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),html="";for(let i=0;i<first;i++)html+="<div class='muted'></div>";for(let day=1;day<=last;day++){let busy=(day*7+m)%9===0||day===13||day===27,now=new Date(),today=day===now.getDate()&&m===now.getMonth()&&y===now.getFullYear();html+=`<div class="${busy?"busy":""} ${today?"today":""}" title="${busy?"Busy":"Available"}">${day}</div>`}$("#calendarGrid").innerHTML=html}

function setupAccessibility(){
  $("#highContrastBtn").onclick=()=>{document.body.classList.toggle("high-contrast");toast(document.body.classList.contains("high-contrast")?"High contrast enabled":"High contrast disabled")};
  $("#fontPlusBtn").onclick=()=>{document.body.classList.toggle("large-text");toast(document.body.classList.contains("large-text")?"Larger text enabled":"Normal text size restored")};
  $("#voiceReadBtn").onclick=()=>{
    if(!("speechSynthesis" in window)) return toast("Text-to-speech is not supported in this browser");
    speechSynthesis.cancel();
    const text=document.querySelector("main").innerText.slice(0,5000);
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    toast("Reading page aloud 🔊");
  };
  $("#stopReadBtn").onclick=()=>{if("speechSynthesis" in window)speechSynthesis.cancel();toast("Voice reading stopped")};
}

function setupVerification(){
  const today=new Date().toISOString().split("T")[0];
  $("#rentalDueDate").min=today;
  $("#verificationForm").onsubmit=async e=>{
    e.preventDefault();
    const aadhaar=$("#aadhaarNumber").value.replace(/\D/g,"");
    const file=$("#idProofFile").files[0];
    if(aadhaar.length!==12) return toast("Enter a valid 12-digit demo Aadhaar number");
    if(!file) return toast("Please upload an ID proof");
    const due=$("#rentalDueDate").value;
    if(!due) return toast("Select the rental return date");

    if(authToken&&backendOnline){
      try{
        const fd=new FormData();
        fd.append("fullName",$("#customerName").value);
        fd.append("phone",$("#customerPhone").value);
        fd.append("idNumber",aadhaar);
        fd.append("idProofType",$("#idProofType").value);
        fd.append("rentalDueDate",due);
        if(window.lastBookingId) fd.append("bookingId",window.lastBookingId);
        fd.append("idProofFile",file);
        const result=await api("/verification",{method:"POST",body:fd});
        $("#verificationStatus").innerHTML=`<strong>🟡 Verification submitted</strong><br>Reference: <b>DE-${result.id}</b><br>Aadhaar: <b>XXXX-XXXX-${result.idNumberLast4}</b> · ID: <b>${file.name}</b> · Return date: <b>${due}</b><br><small>Your ID number is hashed and never stored in plain text. An admin can review this request and approve the rental.</small>`;
      }catch(err){ return toast(err.message) }
    } else {
      // Not logged in / backend offline: keep working as a local-only demo.
      const masked="XXXX-XXXX-"+aadhaar.slice(-4);
      localStorage.setItem("driveease_verification",JSON.stringify({
        name:$("#customerName").value, phone:$("#customerPhone").value,
        maskedAadhaar:masked, proofType:$("#idProofType").value,
        proofFileName:file.name, dueDate:due, status:"Pending Review"
      }));
      $("#verificationStatus").innerHTML=`<strong>🟡 Verification submitted (local demo)</strong><br>Aadhaar: <b>${masked}</b> · ID: <b>${file.name}</b> · Return date: <b>${due}</b><br><small>Log in to save this permanently to your account.</small>`;
    }
    $("#verificationStatus").classList.add("show");
    toast("Verification request submitted");
  };
}

function addChatMessage(text,type){
  const box=$("#chatMessages");
  const div=document.createElement("div");
  div.className=type==="user"?"user-msg":"bot-msg";
  div.textContent=text;
  box.appendChild(div);box.scrollTop=box.scrollHeight;
}
function chatbotReply(input){
  const q=input.toLowerCase();
  if(q.includes("id")||q.includes("aadhaar")||q.includes("proof")) return "For a rental, the demo flow asks for an Aadhaar number, an accepted ID proof upload and the rental return date. Never share a real Aadhaar number in this demo.";
  if(q.includes("return")||q.includes("due")||q.includes("date")) return "The return date is required before verification. You can choose it in the Verify before you drive section.";
  if(q.includes("recommend")||q.includes("car")) return "Try Smart Match! Tell us your trip, budget, seats and transmission, and the page will show matching cars.";
  if(q.includes("deaf")||q.includes("speech")||q.includes("voice")) return "DriveEase is text-first: chatbot, visual alerts, forms and buttons work without speaking. Voice read-aloud is also available for users who prefer audio.";
  if(q.includes("book")) return "Choose a car, click Book Now, enter your dates, then complete identity verification before the rental is finalized.";
  return "I can help with cars, Smart Match, booking, ID verification and return dates. Try asking: 'What ID is needed?'";
}
function setupChatbot(){
  $("#chatbotToggle").onclick=()=>$("#chatbotPanel").classList.toggle("open");
  $("#chatbotClose").onclick=()=>$("#chatbotPanel").classList.remove("open");
  $("#chatForm").onsubmit=e=>{e.preventDefault();const input=$("#chatInput");const value=input.value.trim();if(!value)return;addChatMessage(value,"user");input.value="";setTimeout(()=>addChatMessage(chatbotReply(value),"bot"),250)};
  $$(".quick-chat button").forEach(b=>b.onclick=()=>{addChatMessage(b.textContent,"user");setTimeout(()=>addChatMessage(chatbotReply(b.dataset.chat==="verification"?"What ID proof do I need?":b.dataset.chat==="return"?"What is the return due date?":"Recommend a car"),"bot"),250)});
}

async function connectBackend(){
 try{
   await api("/health");
   backendOnline=true;
   const apiCars=await api("/cars");
   if(Array.isArray(apiCars)&&apiCars.length) cars=apiCars.map(c=>({...c,price:Number(c.price),rating:Number(c.rating)}));
   if(authToken){
     try{ const {user}=await api("/auth/me"); currentUser=user; $("#loginBtn").textContent=user.name.split(" ")[0] }
     catch(_){ logout() } // token expired
     if(authToken){ await syncWishlistFromServer(); await loadBookingsFromServer() }
   }
 }catch(err){
   backendOnline=false;
   console.warn("DriveEase backend not reachable — running in local demo mode.",err.message);
 }
}
async function init(){await connectBackend();save();renderCars();renderCompare();renderBookings();setupQuiz();$("#calcCar").innerHTML="";cars.forEach(c=>$("#calcCar").innerHTML+=`<option value="${c.id}">${c.name} — ₹${c.price}/day</option>`);["calcCar","calcDays","calcAddon","promoInput"].forEach(id=>$("#"+id).addEventListener("input",calc));calc();buildCalendar();
 $("#carSearch").oninput=renderCars;$("#sortCars").onchange=renderCars;
 $$("#categoryChips .chip").forEach(x=>x.onclick=()=>{$$("#categoryChips .chip").forEach(c=>c.classList.remove("active"));x.classList.add("active");selectedCategory=x.dataset.cat;renderCars()});
 $("#searchBtn").onclick=()=>{selectedCategory=$("#searchType").value;$$("#categoryChips .chip").forEach(c=>c.classList.toggle("active",c.dataset.cat===selectedCategory));$("#carSearch").value="";renderCars();$("#cars").scrollIntoView({behavior:"smooth"})};
 $("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("driveease_dark",document.body.classList.contains("dark"));$("#themeBtn").textContent=document.body.classList.contains("dark")?"☀️":"🌙"};if(localStorage.getItem("driveease_dark")==="true"){$("#themeBtn").click()}
 $("#menuBtn").onclick=()=>$("#navMenu").classList.toggle("open");$("#heroMatchBtn").onclick=()=>$("#smart-match").scrollIntoView({behavior:"smooth"});
 $("#loginBtn").onclick=()=>{
   if(authToken){ if(confirm("Log out of DriveEase?")){ logout(); wishlist=[];bookings=[];save();renderCars();renderBookings();toast("Logged out") } }
   else $("#authModal").classList.add("show");
 };
 $("#profileBtn").onclick=()=>{document.querySelector(".dashboard-preview").scrollIntoView({behavior:"smooth"});toast("Customer dashboard preview opened")};
 $$(".close").forEach(x=>x.onclick=()=>x.closest(".modal").classList.remove("show"));$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("show")});
 let authMode="login";
 $$(".auth-tabs button").forEach(x=>x.onclick=()=>{$$(".auth-tabs button").forEach(b=>b.classList.remove("active"));x.classList.add("active");authMode=x.dataset.auth;let signup=authMode==="signup";$("#authTitle").textContent=signup?"Create your account":"Welcome back";$("#authText").textContent=signup?"Sign up to manage your bookings.":"Login to manage your bookings.";$("#authName").classList.toggle("hidden",!signup);});
 $("#authForm").onsubmit=async e=>{
   e.preventDefault();
   if(!backendOnline) { closeModal("authModal"); return toast("Backend offline — start the DriveEase API to enable real login") }
   const emailInput=$("#authForm input[type=email]"),passInput=$("#authForm input[type=password]"),nameInput=$("#authName");
   try{
     const body=authMode==="signup"?{name:nameInput.value,email:emailInput.value,password:passInput.value}:{email:emailInput.value,password:passInput.value};
     const data=await api(`/auth/${authMode}`,{method:"POST",body:JSON.stringify(body)});
     authToken=data.token;currentUser=data.user;
     localStorage.setItem("driveease_token",authToken);localStorage.setItem("driveease_user",JSON.stringify(currentUser));
     $("#loginBtn").textContent=currentUser.name.split(" ")[0];
     closeModal("authModal");toast(`Welcome ${currentUser.name.split(" ")[0]} 👋`);
     await syncWishlistFromServer();await loadBookingsFromServer();
   }catch(err){ toast(err.message) }
 };
 $$("[data-copy]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy)}catch{}toast(`Promo ${b.dataset.copy} copied`)});
 $("#rewardsBtn").onclick=()=>toast("Demo rewards: earn 10 points per completed booking ⭐");
 $("#prevMonth").onclick=()=>{window.calDate.setMonth(window.calDate.getMonth()-1);renderCalendar()};$("#nextMonth").onclick=()=>{window.calDate.setMonth(window.calDate.getMonth()+1);renderCalendar()};
}
setupAccessibility();setupVerification();setupChatbot();
init();