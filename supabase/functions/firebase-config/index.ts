// v2 - tolerant parser
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
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  parsed = tryParse(cfg);
  if (!parsed) {
    // Extract object literal and normalize JS-object form -> JSON
    const m = cfg.match(/\{[\s\S]*\}/);
    if (m) {
      let s = m[0]
        .replace(/\/\/.*$/gm, "")                  // strip line comments
        .replace(/'/g, '"')                         // single -> double quotes
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":') // quote unquoted keys
        .replace(/,(\s*[}\]])/g, "$1");             // strip trailing commas
      parsed = tryParse(s);
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return new Response(JSON.stringify({ error: 'Invalid FIREBASE_WEB_CONFIG — paste the firebaseConfig object as JSON with apiKey, authDomain, projectId, messagingSenderId, appId' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ config: parsed, vapidKey: vapid }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
