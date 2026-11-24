/* SomaZon Version 0.01 — Supabase client configuration.
   Add the Supabase Project URL and Publishable/anon key below.
   NEVER place a service_role or other secret key in browser code. */
const SUPABASE_URL = "https://zxflsrhlcwoptudjhnqe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E0msXYdTskz_WugBJJPsYg_4aNuJJ81";
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_SUPABASE") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE"));
const SUPABASE_LIBRARY_LOADED = Boolean(window.supabase && window.supabase.createClient);
const SUPABASE_READY = SUPABASE_CONFIGURED && SUPABASE_LIBRARY_LOADED;
const SUPABASE_PROBLEM = !SUPABASE_CONFIGURED ? "Supabase URL/key are missing in js/supabase.js." : (!SUPABASE_LIBRARY_LOADED ? "The Supabase library could not be downloaded. Check your internet connection or ad/content blocker, then reload." : "");
if(SUPABASE_PROBLEM) console.error("[SomaZon]", SUPABASE_PROBLEM);
const supabase = SUPABASE_READY ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
window.somazonSupabase = supabase;
