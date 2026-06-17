/* NovaMed v145 - Supabase SDK fallback loader.
   If jsDelivr is blocked or fails, try unpkg before the app starts using Supabase helpers. */
(function () {
  'use strict';
  if (window.supabase) return;
  try {
    document.write('<script src="https://unpkg.com/@supabase/supabase-js@2"><\\/script>');
  } catch (err) {
    console.warn('NovaMed Supabase fallback loader failed:', err);
  }
})();
