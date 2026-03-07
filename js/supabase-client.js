/* GLOBAL ERROR HANDLER */
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('GLOBAL ERROR:', msg, 'at', url, ':', lineNo, error);
  return false;
};

/* =========================================
   SUPABASE CLIENT (SINGLE GLOBAL DECLARATION)
   ========================================= */
let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(
    'https://wyedxqfotzsdxanucvww.supabase.co',
    'sb_publishable_wf_n8NWchrTiB7wqMJU8HA_TIUzAIFb'
  );
} catch (e) {
  console.warn('Supabase client init failed:', e);
}
