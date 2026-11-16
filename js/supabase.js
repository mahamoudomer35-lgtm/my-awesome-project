/* SomaZon Version 0.01 — Supabase client configuration.
   Add the Supabase Project URL and Publishable/anon key below.
   NEVER place a service_role or other secret key in browser code. */
const SUPABASE_URL = "https://zxflsrhlcwoptudjhnqe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E0msXYdTskz_WugBJJPsYg_4aNuJJ81";
const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_SUPABASE") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE"));
const supabase = SUPABASE_READY && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
window.somazonSupabase = supabase;
