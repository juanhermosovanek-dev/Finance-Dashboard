// db/supabaseClient.js
// Single shared Supabase client instance, used by db.js and auth.js.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

if (SUPABASE_URL.includes('PASTE_YOUR')) {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto;">' +
    'Setup incomplete: open <code>js/config.js</code> and paste in your Supabase Project URL and anon key. ' +
    'Find them in your Supabase project under Project Settings → API.</p>';
  throw new Error('Supabase config not set.');
}

// supabase-js is loaded globally via the CDN script tag in index.html.
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
