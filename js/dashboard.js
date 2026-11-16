
/* =========================================================
   SomaZon Core V2 — Supabase Production Backend Layer
   UI/HTML structure remains the Core V2 baseline.
   Replace only local demo auth/data/storage operations with Supabase.
   ========================================================= */

/* ---------- Production configuration ---------- */
const STORAGE_BUCKETS = {
  avatars: "avatars",
  products: "products",
};

// Compliance is implemented as an allow-list rather than a sanctions guess.
// Review this list against SomaZon's actual legal/compliance policy before launch.
const ACCEPTED_COUNTRIES = [
  "so","ch","sa","ae","pl","us","gb","fr","de","it","es","nl","be","se","no","dk","fi",
  "at","ie","pt","gr","ro","bg","cz","sk","hu","hr","si","ee","lv","lt","lu","mt","cy",
  "is","li","mc","ca","au","nz","tr","ke","ug","et","tz","rw","dj","eg","ma","dz","tn",
  "qa","kw","bh","om","jo","iq","pk","in","my","id","jp","kr","sg","za","ng","gh","sn"
];

const DEFAULT_PLATFORM_COMMISSION_RATE = 0.05;
const ALTERNATIVE_PLATFORM_COMMISSION_RATE = 0.02;
const PLATFORM_COMMISSION_MODE = "standard"; // "standard" = 5%, "payment_plus" = 2% + payment processor fees

const DEMO_PRODUCTS = [
 {id:"demo-1",name:"Premium Smartphone",category:"Electronics",price:599,old:699,icon:"📱",rating:4.8,badge:"SALE",desc:"Powerful everyday smartphone with a premium display."},
 {id:"demo-2",name:"Wireless Headphones",category:"Electronics",price:89,old:119,icon:"🎧",rating:4.7,badge:"HOT",desc:"Comfortable wireless audio for work and travel."},
 {id:"demo-3",name:"Classic Fashion Watch",category:"Fashion",price:129,old:159,icon:"⌚",rating:4.6,badge:"NEW",desc:"Clean classic design for everyday style."},
 {id:"demo-4",name:"Modern Sneakers",category:"Fashion",price:74,old:99,icon:"👟",rating:4.5,badge:"SALE",desc:"Lightweight sneakers built for everyday movement."},
 {id:"demo-5",name:"Smart Home Device",category:"Home",price:49,old:65,icon:"🏠",rating:4.4,badge:"NEW",desc:"A practical smart device for a connected home."},
 {id:"demo-6",name:"Trading Monitor",category:"Trading Assets",price:329,old:399,icon:"📈",rating:4.9,badge:"TOP",desc:"Wide display setup for charts, work, and productivity."},
 {id:"demo-7",name:"Professional Service",category:"Services",price:35,old:50,icon:"🛠️",rating:4.8,badge:"FEATURED",desc:"Professional service offered by a marketplace seller."},
 {id:"demo-8",name:"Beauty Essentials",category:"Beauty",price:42,old:55,icon:"✨",rating:4.6,badge:"HOT",desc:"Everyday beauty essentials from marketplace sellers."}
];

let products = [];
let cart = [];
let wishlist = [];
let orders = [];
let currentCategory = "All";
let authMode = "login";
let currentSession = null;
let currentProfile = null;
let phoneInputs = {};
let initialLoadComplete = false;
let lastAuthEmail = "";

/* ---------- Small utilities ---------- */
function getStoredTheme(){ return localStorage.getItem("somazon_theme") || "system"; }
function getNotifications(){ return localStorage.getItem("somazon_notifications") !== "off"; }
function isLogged(){ return Boolean(currentSession?.user); }
function isEmailVerified(){ return Boolean(currentSession?.user?.email_confirmed_at); }
function isVerified(){ return true; } // KYC is disabled in Version 0.01.
function requireVerifiedEmail(){
  if(!isLogged()){ openAuth("login"); showToast("Sign in is required to continue"); return false; }
  if(!isEmailVerified()){
    lastAuthEmail=currentSession?.user?.email||lastAuthEmail;
    openAuth("login");
    showToast("Please verify your email before continuing. You can resend the verification email here.");
    return false;
  }
  return true;
}
function userId(){ return currentSession?.user?.id || null; }
function getUser(){
  if(!currentSession?.user) return null;
  return {
    id: currentSession.user.id,
    email: currentSession.user.email || "",
    name: currentProfile?.full_name || currentSession.user.user_metadata?.full_name || "SomaZon User"
  };
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}
function safeFileName(name){ return String(name || "file").replace(/[^a-zA-Z0-9._-]/g,"-").toLowerCase(); }
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.classList.remove("show"),3200);
}
function backendMessage(error, fallback="Something went wrong. Please try again."){
  const message = error?.message || error?.error_description || "";
  if(/email.*not.*confirm|email_not_confirmed/i.test(message)) return "Please verify your email before signing in. Check your inbox or resend the verification email.";
  if(/smtp|email.*send|mail.*send|rate.?limit/i.test(message)) return "Email delivery could not be completed. If your Supabase project uses Resend sandbox SMTP, verify the recipient/domain configuration or use a verified sender domain in Supabase SMTP settings.";
  if(/invalid.*login|invalid.*credentials/i.test(message)) return "The email or password is incorrect.";
  if(/already.*registered|user.*already/i.test(message)) return "An account with this email already exists. Try signing in instead.";
  if(/password/i.test(message) && /short|weak|least/i.test(message)) return "Use a stronger password with at least 6 characters.";
  return message || fallback;
}
function ensureSupabase(action="this action"){
  if(SUPABASE_READY && supabase) return true;
  showToast(`Connect Supabase URL and anon key to use ${action}.`);
  return false;
}

/* ---------- Phone / country selector ---------- */
function initPhoneInput(id){
  const input=document.getElementById(id);
  if(!input || !window.intlTelInput) return null;
  if(phoneInputs[id]) return phoneInputs[id];
  const iti=window.intlTelInput(input,{
    onlyCountries:ACCEPTED_COUNTRIES,
    separateDialCode:true,
    nationalMode:false,
    autoPlaceholder:"aggressive",
    formatOnDisplay:true,
    initialCountry:"so",
    preferredCountries:["so","ae","sa","ch","pl","us","gb"],
    utilsScript:"https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js"
  });
  phoneInputs[id]=iti;
  input.addEventListener("countrychange",()=>syncCountryFromPhone(id));
  input.addEventListener("blur",()=>syncCountryFromPhone(id));
  input.addEventListener("input",()=>{
    const raw=input.value.trim();
    if(raw.startsWith("+")){
      try{ iti.setNumber(raw); }catch(_e){}
    }
  });
  return iti;
}
function syncCountryFromPhone(id){
  const iti=phoneInputs[id];
  if(!iti) return;
  const data=iti.getSelectedCountryData();
  if(id==="phone" && data?.name) document.getElementById("country").value=data.name;
}
function getPhoneValue(id){
  const iti=phoneInputs[id];
  if(!iti) return document.getElementById(id)?.value?.trim() || "";
  if(!iti.getNumber()) return "";
  return iti.getNumber();
}
function validatePhone(id){
  const iti=phoneInputs[id];
  if(!iti) return true;
  const value=iti.getNumber();
  if(!value) return true;
  if(!iti.isValidNumber()){
    showToast("Please enter a valid phone number for the selected country.");
    return false;
  }
  return true;
}

/* ---------- Supabase data loading ---------- */
async function loadProducts(){
  if(!SUPABASE_READY){
    products=[...DEMO_PRODUCTS];
    return;
  }
  try{
    const {data,error}=await supabase.from("products")
      .select("id,title,description,price,compare_at_price,category,images,rating,badge,vendor_id,stock,is_active")
      .eq("is_active",true)
      .order("created_at",{ascending:false});
    if(error) throw error;
    products=(data||[]).map(row=>({
      id:String(row.id),
      name:row.title || "Untitled Product",
      category:row.category || "Other",
      price:Number(row.price||0),
      old:Number(row.compare_at_price||row.price||0),
      icon:row.icon || "🛍️",
      rating:Number(row.rating||0),
      badge:row.badge || "NEW",
      desc:row.description || "",
      images:Array.isArray(row.images)?row.images:[],
      vendor_id:row.vendor_id || null,
      stock:row.stock ?? null
    }));
    if(!products.length) products=[...DEMO_PRODUCTS];
  }catch(error){
    console.error("Supabase products error:",error);
    products=[...DEMO_PRODUCTS];
    showToast("Marketplace data could not be loaded. Showing temporary products.");
  }
}

async function loadProfile(){
  currentProfile=null;
  if(!isLogged() || !SUPABASE_READY) return;
  try{
    const {data,error}=await supabase.from("profiles").select("*").eq("id",userId()).maybeSingle();
    if(error) throw error;
    currentProfile=data || null;
    if(!currentProfile){
      const user=currentSession.user;
      const fallback={id:user.id,full_name:user.user_metadata?.full_name||"SomaZon User"};
      const {data:created,error:createError}=await supabase.from("profiles").upsert(fallback).select().single();
      if(!createError) currentProfile=created;
    }
  }catch(error){
    console.error("Profile load error:",error);
    showToast(backendMessage(error,"Your profile could not be loaded."));
  }
}

async function loadWishlist(){
  if(!isLogged() || !SUPABASE_READY){ wishlist=[]; return; }
  // Wishlist is kept in the user's profile metadata for this Core V2 schema.
  // This avoids introducing another required table before the production schema is expanded.
  const ids=JSON.parse(localStorage.getItem(`somazon_wishlist_${userId()}`)||"[]");
  wishlist=Array.isArray(ids)?ids.map(String):[];
}

async function loadOrders(){
  orders=[];
  if(!isLogged() || !SUPABASE_READY) return;
  try{
    const {data,error}=await supabase.from("orders")
      .select("id,created_at,total,status,payment_method")
      .eq("user_id",userId())
      .order("created_at",{ascending:false});
    if(error) throw error;
    orders=data||[];
  }catch(error){
    console.error("Orders load error:",error);
    showToast(backendMessage(error,"Orders could not be loaded."));
  }
}

async function refreshUserData(){
  if(!isLogged()){
    currentProfile=null;wishlist=[];orders=[];cart=[];updateAccountUI();return;
  }
  await loadProfile();
  await loadWishlist();
  await loadOrders();
  await loadCart();
  updateAccountUI();
}

/* ---------- Supabase Storage ---------- */
async function uploadToBucket(bucket,file,path){
  if(!ensureSupabase("file uploads")) return null;
  const {data,error}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type || undefined});
  if(error) throw error;
  return data?.path || path;
}
function publicStorageUrl(bucket,path){
  if(!path) return "";
  if(/^https?:\/\//i.test(path)) return path;
  const {data}=supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

/* ---------- Vendor / product backend helpers ---------- */
async function getVendorProfile(){
  if(!isLogged() || !SUPABASE_READY) return null;
  const {data,error}=await supabase.from("vendors").select("id,user_id,business_name,status,commission_rate,payment_processing_rate").eq("user_id",userId()).maybeSingle();
  if(error){console.error("Vendor load error:",error);return null;}
  return data;
}
async function createVendorProfile(businessName){
  if(!requireVerifiedEmail()) return null;
 
  if(!ensureSupabase("vendor registration")) return null;
  try{
    const existing=await getVendorProfile();
    if(existing) return existing;
    const {data,error}=await supabase.from("vendors").insert({user_id:userId(),business_name:String(businessName||"SomaZon Seller").trim(),status:"pending",commission_rate:DEFAULT_PLATFORM_COMMISSION_RATE,payment_processing_rate:0}).select().single();
    if(error) throw error;
    return data;
  }catch(error){showToast(backendMessage(error,"Vendor profile could not be created."));return null;}
}
async function uploadProductImage(file, productId="new"){
  if(!file) throw new Error("No product image selected.");
  if(!isLogged()) throw new Error("Sign in is required for product image uploads.");

  if(!ensureSupabase("product image uploads")) return null;
  if(file.size>10*1024*1024) throw new Error("Product image must be 10MB or smaller.");
  const path=`${userId()}/${String(productId)}/${Date.now()}-${safeFileName(file.name)}`;
  const storedPath=await uploadToBucket(STORAGE_BUCKETS.products,file,path);
  return {path:storedPath,url:publicStorageUrl(STORAGE_BUCKETS.products,storedPath)};
}
async function createProductRecord({title,description,price,compare_at_price,category,images=[],stock=null,badge="NEW"}){
  if(!requireVerifiedEmail()) return null;
 
  if(!ensureSupabase("product publishing")) return null;
  try{
    const vendor=await getVendorProfile();
    if(!vendor){showToast("Create your vendor profile before publishing a product.");return null;}
    if(vendor.status!=="approved"){showToast("Your vendor profile must be approved before publishing products.");return null;}
    const payload={vendor_id:vendor.id,user_id:userId(),title:String(title||"").trim(),description:String(description||"").trim(),price:Number(price||0),compare_at_price:compare_at_price==null?null:Number(compare_at_price),category,images,badge,stock:stock==null?null:Number(stock),is_active:true};
    const {data,error}=await supabase.from("products").insert(payload).select().single();
    if(error) throw error;
    await loadProducts();renderProducts();renderDeals();showToast("Product published successfully");return data;
  }catch(error){showToast(backendMessage(error,"Product could not be published."));return null;}
}
async function getCommissionForItems(items){
  if(!SUPABASE_READY || !items.length) return {items,defaultRate:PLATFORM_COMMISSION_MODE==="payment_plus"?ALTERNATIVE_PLATFORM_COMMISSION_RATE:DEFAULT_PLATFORM_COMMISSION_RATE};
  const vendorIds=[...new Set(items.map(x=>x.vendor_id).filter(Boolean))];
  const rates=new Map();
  if(vendorIds.length){
    const {data,error}=await supabase.from("vendors").select("id,commission_rate,payment_processing_rate").in("id",vendorIds);
    if(!error) (data||[]).forEach(v=>rates.set(String(v.id),v));
  }
  const enriched=items.map(item=>{
    const vendor=rates.get(String(item.vendor_id));
    const rate=vendor?.commission_rate!=null?Number(vendor.commission_rate):(PLATFORM_COMMISSION_MODE==="payment_plus"?ALTERNATIVE_PLATFORM_COMMISSION_RATE:DEFAULT_PLATFORM_COMMISSION_RATE);
    return {...item,commission_rate:rate,commission:Number(item.price)*Number(item.quantity)*rate,payment_processing_rate:Number(vendor?.payment_processing_rate||0)};
  });
  return {items:enriched,defaultRate:PLATFORM_COMMISSION_MODE==="payment_plus"?ALTERNATIVE_PLATFORM_COMMISSION_RATE:DEFAULT_PLATFORM_COMMISSION_RATE};
}

/* ---------- Product rendering ---------- */
function productImageMarkup(p){
  const path=p.images?.[0];
  if(path && SUPABASE_READY){
    const url=publicStorageUrl(STORAGE_BUCKETS.products,path);
    if(url) return `<img src="${escapeHtml(url)}" alt="${escapeHtml(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
  }
  return `<span>${escapeHtml(p.icon || "🛍️")}</span>`;
}
function renderCard(p){
  const wished=wishlist.includes(String(p.id));
  const canBuy = !String(p.id).startsWith("demo-");
  return `<article class="product-card">
   <div class="product-image">${productImageMarkup(p)}<span class="product-badge">${escapeHtml(p.badge)}</span></div>
   <div class="product-body">
    <div class="product-category">${escapeHtml(p.category)}</div>
    <div class="product-name">${escapeHtml(p.name)}</div>
    <div class="product-desc">${escapeHtml(p.desc)}</div>
    <div class="rating">★ ${Number(p.rating||0).toFixed(1)} · Trusted listing</div>
    <div class="product-bottom">
      <div><span class="price">$${Number(p.price).toFixed(2)}</span>${Number(p.old)>Number(p.price)?`<span class="old-price">$${Number(p.old).toFixed(2)}</span>`:""}</div>
      <div style="display:flex;gap:6px">
       <button class="icon-btn" onclick="toggleWishlist('${escapeHtml(String(p.id))}')">${wished?"❤️":"♡"}</button>
       <button class="btn btn-black" onclick="buyProduct('${escapeHtml(String(p.id))}')">${canBuy?"Buy":"Demo"}</button>
      </div>
    </div>
   </div>
 </article>`;
}
function renderProducts(){
 const q=(document.getElementById("searchInput")?.value||"").toLowerCase().trim();
 let list=products.filter(p=>{
   const matchesCategory=currentCategory==="All"||p.category===currentCategory;
   const text=(p.name+" "+p.category+" "+p.desc).toLowerCase();
   return matchesCategory && (!q||text.includes(q));
 });
 const html=list.length?list.map(renderCard).join(""):`<div class="empty" style="grid-column:1/-1"><h3>No products found</h3><p>Try another search or category.</p></div>`;
 document.getElementById("homeProducts").innerHTML=products.slice(0,4).map(renderCard).join("");
 document.getElementById("marketProducts").innerHTML=html;
 renderWishlist();
}
function renderDeals(){
 const deals=products.filter(p=>Number(p.old)>Number(p.price));
 document.getElementById("dealProducts").innerHTML=deals.map(renderCard).join("");
}
function filterCategory(cat){currentCategory=cat;showPage("marketplace");renderProducts();}
function resetProducts(){currentCategory="All";document.getElementById("searchInput").value="";renderProducts();showPage("marketplace");}

/* ---------- Cart: Supabase for signed-in users ---------- */
async function loadCart(){
  cart=[];
  if(!isLogged() || !SUPABASE_READY) return;
  try{
    const {data,error}=await supabase.from("carts").select("id,product_id,quantity").eq("user_id",userId());
    if(error) throw error;
    cart=(data||[]).map(row=>({rowId:row.id,id:String(row.product_id),qty:Number(row.quantity||1)}));
  }catch(error){
    console.error("Cart load error:",error);
  }
  updateCartUI();
}
async function addToCart(id){
  if(!requireVerifiedEmail()) return;
 
  const p=products.find(x=>String(x.id)===String(id));
  if(!p || String(p.id).startsWith("demo-")){showToast("This temporary demo product is not orderable.");return;}
  if(!ensureSupabase("cart actions")) return;
  try{
    const existing=cart.find(x=>String(x.id)===String(id));
    if(existing){
      const {error}=await supabase.from("carts").update({quantity:existing.qty+1}).eq("id",existing.rowId).eq("user_id",userId());
      if(error) throw error;
      existing.qty++;
    }else{
      const {data,error}=await supabase.from("carts").insert({user_id:userId(),product_id:p.id,quantity:1}).select("id,product_id,quantity").single();
      if(error) throw error;
      cart.push({rowId:data.id,id:String(data.product_id),qty:data.quantity});
    }
    updateCartUI();showToast("Added to cart");
  }catch(error){showToast(backendMessage(error,"Could not add the product to your cart."));}
}
async function changeQuantity(id,d){
 const item=cart.find(x=>String(x.id)===String(id));if(!item)return;
 const next=item.qty+d;
 try{
   if(next<=0){await removeFromCart(id);return;}
   const {error}=await supabase.from("carts").update({quantity:next}).eq("id",item.rowId).eq("user_id",userId());
   if(error) throw error;
   item.qty=next;updateCartUI();
 }catch(error){showToast(backendMessage(error,"Could not update your cart."));}
}
async function removeFromCart(id){
 const item=cart.find(x=>String(x.id)===String(id));if(!item)return;
 try{
   const {error}=await supabase.from("carts").delete().eq("id",item.rowId).eq("user_id",userId());
   if(error) throw error;
   cart=cart.filter(x=>String(x.id)!==String(id));updateCartUI();
 }catch(error){showToast(backendMessage(error,"Could not remove the product."));}
}
function updateCartUI(){
 const body=document.getElementById("cartBody");
 let total=0,count=0;
 if(!cart.length) body.innerHTML=`<div class="empty"><h3>Your cart is empty</h3><p>Browse the marketplace and add products here.</p></div>`;
 else body.innerHTML=cart.map(item=>{
   const p=products.find(x=>String(x.id)===String(item.id));if(!p)return "";
   total+=Number(p.price)*item.qty;count+=item.qty;
   return `<div class="cart-item"><div class="cart-thumb">${productImageMarkup(p)}</div><div><strong>${escapeHtml(p.name)}</strong><div style="color:var(--text-muted);font-size:13px">$${Number(p.price).toFixed(2)} each</div><div class="qty"><button onclick="changeQuantity('${escapeHtml(String(p.id))}',-1)">−</button><b>${item.qty}</b><button onclick="changeQuantity('${escapeHtml(String(p.id))}',1)">+</button></div></div><button class="icon-btn" onclick="removeFromCart('${escapeHtml(String(p.id))}')">🗑</button></div>`;
 }).join("");
 document.getElementById("cartTotal").textContent="$"+total.toFixed(2);
 document.getElementById("cartCountMobile").textContent=count;
}
function openCart(){document.getElementById("drawerOverlay").classList.add("open");document.getElementById("cartDrawer").classList.add("open");updateCartUI();}
function closeCart(){document.getElementById("drawerOverlay").classList.remove("open");document.getElementById("cartDrawer").classList.remove("open")}

/* ---------- Protected marketplace actions ---------- */
async function buyProduct(id){
 if(String(id).startsWith("demo-")){showToast("This is a temporary preview product. Connect your products table to enable real orders.");return;}
 if(!requireVerifiedEmail()) return;
 await addToCart(id);openCart();
}
function calculateCommission(total, paymentProcessingFee=0, mode=PLATFORM_COMMISSION_MODE){
 const rate=mode==="payment_plus"?ALTERNATIVE_PLATFORM_COMMISSION_RATE:DEFAULT_PLATFORM_COMMISSION_RATE;
 const commission=Number(total||0)*rate;
 return {rate,commission,paymentProcessingFee:Number(paymentProcessingFee||0),platformFee:commission+Number(paymentProcessingFee||0)};
}
async function checkout(){
 if(!cart.length){showToast("Your cart is empty");return}
 if(!requireVerifiedEmail()){closeCart();return}

 if(!ensureSupabase("checkout")) return;
 const baseItems=cart.map(item=>{const p=products.find(x=>String(x.id)===String(item.id));return p?{product_id:p.id,title:p.name,price:Number(p.price),quantity:item.qty,image_url:p.images?.[0]||"",vendor_id:p.vendor_id||null}:null;}).filter(Boolean);
 if(!baseItems.length){showToast("Your cart contains no orderable products.");return}
 const commissionData=await getCommissionForItems(baseItems);
 const items=commissionData.items;
 const total=items.reduce((s,item)=>s+(item.price*item.quantity),0);
 const commission=calculateCommission(total,0,PLATFORM_COMMISSION_MODE);
 const vendorCommissionTotal=items.reduce((s,item)=>s+Number(item.commission||0),0);
 try{
   const {data,error}=await supabase.from("orders").insert({
     user_id:userId(),total,status:"pending",payment_method:"pending",items,platform_commission_rate:commission.rate,platform_commission:vendorCommissionTotal || commission.commission,payment_processing_fee:commission.paymentProcessingFee
   }).select("id,created_at,total,status,payment_method").single();
   if(error) throw error;
   await supabase.from("carts").delete().eq("user_id",userId());
   cart=[];updateCartUI();closeCart();orders.unshift(data);showPage("account");selectAccountPanel("orders");showToast("Order created successfully");
 }catch(error){showToast(backendMessage(error,"The order could not be created. Check your database policies and try again."));}
}
function startSell(){
 if(!requireVerifiedEmail()) return;

 showToast("Seller dashboard is ready for the next backend phase");
}

/* ---------- Authentication navigation ---------- */
function openAuth(mode="login"){ window.location.href = mode === "register" ? "register.html" : "login.html"; }

async function signOut(){
 if(!SUPABASE_READY){showToast("Supabase is not configured.");return}
 const {error}=await supabase.auth.signOut();
 if(error){showToast(backendMessage(error,"Could not sign out."));return}
 currentSession=null;currentProfile=null;cart=[];wishlist=[];orders=[];updateAccountUI();showPage("home");showToast("Signed out");
}
function handleAccountAuth(){if(isLogged())signOut();else openAuth("login")}
async function saveProfileToSupabase(profile){
 if(!isLogged() || !SUPABASE_READY) return null;
 const allowed={id:userId(),updated_at:new Date().toISOString()};
 if(typeof profile.full_name==="string") allowed.full_name=profile.full_name;
 if(typeof profile.avatar_url==="string") allowed.avatar_url=profile.avatar_url;
 if(typeof profile.language==="string") allowed.language=profile.language;
 const {data,error}=await supabase.from("profiles").upsert(allowed).select().single();
 if(error) throw error;
 currentProfile=data;return data;
}

/* ---------- Account / profile ---------- */
async function updateAccountUI(){
 const user=getUser();
 const initials=(user?.name||"Guest User").trim().charAt(0).toUpperCase()||"M";
 const photo=currentProfile?.avatar_url||"";
 ["sideAvatar","bigAvatar"].forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=photo?`<img src="${escapeHtml(photo)}" alt="Profile">`:escapeHtml(initials);
 });
 const mobileAvatar=document.getElementById("mobileAvatar");if(mobileAvatar)mobileAvatar.textContent=photo?"👤":initials;
 document.getElementById("sideName").textContent=user?.name||"Guest User";
 document.getElementById("sideStatus").textContent=user?(!isEmailVerified()?"Email confirmation required":"Account active · KYC paused"):"Browsing mode";
 document.getElementById("headerAuthBtn").textContent=user?"Account":"Sign In";
 document.getElementById("accountAuthAction").textContent=user?"🚪 Sign Out":"🔐 Sign In";
 const profile=currentProfile||{};
 document.getElementById("fullName").value=profile.full_name||user?.name||"";
 document.getElementById("email").value=user?.email||"";
 const phoneInput=document.getElementById("phone");
 if(phoneInputs.phone){
   phoneInput.value="";
 }else phoneInput.value="";
 document.getElementById("country").value="";
 renderVerification();renderOrders();renderWishlist();loadSettings();
}
function showPage(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 const page=document.getElementById(id);if(page)page.classList.add("active");
 document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));
 document.querySelectorAll("[data-mobile]").forEach(b=>b.classList.toggle("active",b.dataset.mobile===id));
 window.scrollTo({top:0,behavior:"smooth"});
 if(id==="account")updateAccountUI();
 if(id==="deals")renderDeals();
}
function selectAccountPanel(name){
 document.querySelectorAll(".account-panel").forEach(p=>p.classList.remove("active"));
 const target=document.getElementById("panel-"+name);if(target)target.classList.add("active");
 document.querySelectorAll(".account-menu button[data-panel]").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
 if(name==="verification")renderVerification();
 if(name==="orders")renderOrders();
 if(name==="wishlist")renderWishlist();
 updateAccountUI();
}
async function saveProfile(e){
 e.preventDefault();
 if(!isLogged()){openAuth("login");showToast("Sign in to save your profile.");return}
 if(!ensureSupabase("profile updates"))return;
 if(!validatePhone("phone"))return;
 const payload={full_name:document.getElementById("fullName").value.trim()};
 try{await saveProfileToSupabase(payload);updateAccountUI();showToast("Profile saved successfully");}
 catch(error){showToast(backendMessage(error,"Profile could not be saved."));}
}
async function handleProfilePhoto(e){
 const file=e.target.files[0];if(!file)return;
 if(file.size>5*1024*1024){showToast("Photo must be 5MB or smaller");return}
 if(!isLogged()){openAuth("login");return}
 if(!ensureSupabase("profile photo uploads"))return;
 try{
   const path=`${userId()}/${Date.now()}-${safeFileName(file.name)}`;
   const storedPath=await uploadToBucket(STORAGE_BUCKETS.avatars,file,path);
   const url=publicStorageUrl(STORAGE_BUCKETS.avatars,storedPath);
   await saveProfileToSupabase({avatar_url:url});
   updateAccountUI();showToast("Profile photo updated");
 }catch(error){console.error(error);showToast(backendMessage(error,"Profile photo upload failed."));}
}

/* ---------- Version 0.01 verification status ---------- */
function renderVerification(){
 const box=document.getElementById("verificationStatus");
 const btn=document.getElementById("verifyActionBtn");
 if(box) box.innerHTML='<div class="status-box notverified"><div class="status-title">Identity verification unavailable</div><div>KYC is intentionally disabled in SomaZon Version 0.01. You can continue exploring the experimental marketplace without submitting identity documents.</div></div>';
 if(btn){btn.textContent="Unavailable in Version 0.01";btn.disabled=true;}
}
function startVerification(){showToast("Identity verification is disabled in Version 0.01.");}

/* ---------- Wishlist ---------- */
async function toggleWishlist(id){
 if(!requireVerifiedEmail()) return
 const sid=String(id);
 wishlist=wishlist.includes(sid)?wishlist.filter(x=>x!==sid):[...wishlist,sid];
 try{
   if(!ensureSupabase("wishlist actions"))return;
   localStorage.setItem(`somazon_wishlist_${userId()}`,JSON.stringify(wishlist));
   renderProducts();renderWishlist();showToast(wishlist.includes(sid)?"Saved to wishlist":"Removed from wishlist");
 }catch(error){showToast(backendMessage(error,"Wishlist could not be updated."));}
}
function renderWishlist(){
 const list=wishlist.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);
 document.getElementById("wishlistList").innerHTML=list.length?list.map(renderCard).join(""):`<div class="empty" style="grid-column:1/-1"><h3>Your wishlist is empty</h3><p>Save products while browsing the marketplace.</p></div>`;
}

/* ---------- Orders ---------- */
function renderOrders(){
 const el=document.getElementById("ordersList");
 if(!orders.length){el.innerHTML=`<div class="empty"><h3>No orders yet</h3><p>Your completed and pending marketplace orders will appear here.</p></div>`;return}
 el.innerHTML=orders.map(o=>`<div class="order-card"><div class="order-top"><strong>Order ${escapeHtml(o.id)}</strong><span class="badge badge-warning">${escapeHtml(o.status||"pending")}</span></div><div style="color:var(--text-muted);font-size:13px">Placed ${escapeHtml(new Date(o.created_at||Date.now()).toLocaleDateString())}</div><div style="font-weight:900;margin-top:8px">$${Number(o.total||0).toFixed(2)}</div></div>`).join("");
}

/* ---------- FAQ / settings ---------- */
function toggleFaq(btn){btn.parentElement.classList.toggle("open");btn.querySelector("span").textContent=btn.parentElement.classList.contains("open")?"−":"+"}
function setTheme(theme){localStorage.setItem("somazon_theme",theme);applyTheme();updateThemeButtons();}
function applyTheme(){
 const theme=getStoredTheme();
 const dark=theme==="dark"||(theme==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
 document.body.classList.toggle("dark",dark);
}
function updateThemeButtons(){
 const t=getStoredTheme();
 document.querySelectorAll("#themeButtons button").forEach(b=>b.classList.toggle("active",b.textContent.toLowerCase()===t));
}
function toggleNotifications(){
 const on=getNotifications();
 localStorage.setItem("somazon_notifications",on?"off":"on");
 loadSettings();showToast(on?"Notifications turned off":"Notifications turned on");
}
function saveSettings(){
 const lang=document.getElementById("languageSetting").value;
 localStorage.setItem("somazon_language",lang);
 if(lang!=="en"){
   document.getElementById("languageSetting").value="en";
   localStorage.setItem("somazon_language","en");
   showToast("English is the official language; additional languages are coming soon");
 }
 updateThemeButtons();
}
function loadSettings(){
 document.getElementById("languageSetting").value="en";
 document.getElementById("notificationToggle").textContent=getNotifications()?"ON":"OFF";
 applyTheme();updateThemeButtons();
}
function togglePassword(id,button){
 const input=document.getElementById(id);if(!input)return;
 const visible=input.type==="text";input.type=visible?"password":"text";
 button.innerHTML=visible?'<i class="fa-regular fa-eye"></i>':'<i class="fa-regular fa-eye-slash"></i>';
 button.setAttribute("aria-label",visible?"Show password":"Hide password");
}

/* ---------- Startup / auth events ---------- */
async function initSupabaseApp(){
 applyTheme();loadSettings();
 initPhoneInput("phone");
 renderProducts();renderDeals();updateCartUI();updateAccountUI();selectAccountPanel("profile");
 if(!SUPABASE_READY){
   showToast("Supabase is not configured yet. Add your URL and anon key to activate production mode.");
   initialLoadComplete=true;return;
 }
 try{
   const {data:{session}}=await supabase.auth.getSession();
   currentSession=session;
   await loadProducts();
   renderProducts();renderDeals();
   await refreshUserData();
   initialLoadComplete=true;
 }catch(error){
   console.error("Supabase startup error:",error);
   showToast(backendMessage(error,"Supabase connection could not be established."));
 }
 supabase.auth.onAuthStateChange((event,session)=>{
   currentSession=session;
   setTimeout(async()=>{
     if(event==="SIGNED_OUT"){currentProfile=null;wishlist=[];orders=[];cart=[];}
     else await refreshUserData();
     updateAccountUI();
   },0);
 });
}

window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if(getStoredTheme()==="system")applyTheme();});
initSupabaseApp();

