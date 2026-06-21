const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  try {
    parsed = JSON.parse(cfg);
  } catch {
    // Tolerate JS-object form (unquoted keys, single quotes, trailing commas).
    try {
      const m = cfg.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no object");
      parsed = (new Function("return (" + m[0] + ")"))();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid FIREBASE_WEB_CONFIG — must be a JSON object with apiKey, authDomain, projectId, messagingSenderId, appId' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  return new Response(JSON.stringify({ config: parsed, vapidKey: vapid }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
