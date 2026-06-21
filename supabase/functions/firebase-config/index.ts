import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cfg = Deno.env.get('FIREBASE_WEB_CONFIG');
  const vapid = Deno.env.get('FIREBASE_VAPID_PUBLIC_KEY');
  if (!cfg || !vapid) {
    return new Response(JSON.stringify({ error: 'Firebase config not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  let parsed: any;
  try { parsed = JSON.parse(cfg); } catch { return new Response(JSON.stringify({ error: 'Invalid FIREBASE_WEB_CONFIG JSON' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

  return new Response(JSON.stringify({ config: parsed, vapidKey: vapid }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
