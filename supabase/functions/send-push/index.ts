import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushBody {
  target: 'user' | 'users' | 'department' | 'semester' | 'broadcast';
  user_id?: string;
  user_ids?: string[];
  department?: string;
  semester?: number;
  category: string; // study_reminder, quiz_reminder, exam_reminder, viva_reminder, teacher_announcement, streak_alert, premium_updates
  title: string;
  body: string;
  link?: string;
  notification_id?: string;
  image?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ---- Service-account JWT -> OAuth2 access token cache ----
let cachedToken: { token: string; exp: number } | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!saJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  const sa = JSON.parse(saJson);

  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return { token: cachedToken.token, projectId: sa.project_id };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth token error: ${JSON.stringify(json)}`);

  cachedToken = { token: json.access_token, exp: Date.now() + (json.expires_in * 1000) };
  return { token: json.access_token, projectId: sa.project_id };
}

async function fcmSend(token: string, projectId: string, message: any) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ---- Auth: accept either internal shared secret (from DB trigger) or an admin JWT ----
    const providedSecret = req.headers.get('x-push-secret') || '';
    const authHeader = req.headers.get('Authorization') || '';
    let authorized = false;

    if (providedSecret) {
      const { data: expected } = await supabase.rpc('get_send_push_secret');
      if (typeof expected === 'string' && expected.length === providedSecret.length) {
        let diff = 0;
        for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ providedSecret.charCodeAt(i);
        authorized = diff === 0;
      }
    }


    if (!authorized && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabase.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'admin')
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as SendPushBody;
    if (!body?.target || !body?.title || !body?.category) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Resolve target user_ids
    let userIds: string[] = [];
    if (body.target === 'user' && body.user_id) userIds = [body.user_id];
    else if (body.target === 'users' && body.user_ids) userIds = body.user_ids;
    else if (body.target === 'department' && body.department) {
      const { data } = await supabase.from('profiles').select('user_id').eq('department', body.department);
      userIds = (data || []).map((r: any) => r.user_id);
    } else if (body.target === 'semester' && body.semester) {
      const { data } = await supabase.from('profiles').select('user_id').eq('current_semester', body.semester);
      userIds = (data || []).map((r: any) => r.user_id);
    } else if (body.target === 'broadcast') {
      const { data } = await supabase.from('push_subscriptions').select('user_id').eq('enabled', true);
      userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)));
    }

    if (!userIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_targets' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch subscriptions filtered by enabled + category preference
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, fcm_token, notification_preferences')
      .in('user_id', userIds)
      .eq('enabled', true);

    const targets = (subs || []).filter((s: any) =>
      s.notification_preferences?.[body.category] !== false
    );

    if (!targets.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_enabled_subs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token, projectId } = await getAccessToken();

    let sent = 0, failed = 0;
    const invalidTokens: string[] = [];
    const analyticsRows: any[] = [];

    await Promise.all(targets.map(async (t: any) => {
      const msg = {
        token: t.fcm_token,
        notification: { title: body.title, body: body.body },
        data: {
          link: body.link || '/',
          category: body.category,
          notification_id: body.notification_id || '',
        },
        webpush: {
          fcm_options: { link: body.link || '/' },
          notification: {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...(body.image ? { image: body.image } : {}),
          },
        },
      };
      const r = await fcmSend(token, projectId, msg);
      if (r.ok) {
        sent++;
        analyticsRows.push({ user_id: t.user_id, category: body.category, event: 'sent', fcm_token: t.fcm_token, metadata: { notification_id: body.notification_id } });
      } else {
        failed++;
        analyticsRows.push({ user_id: t.user_id, category: body.category, event: 'failed', fcm_token: t.fcm_token, metadata: { status: r.status, error: r.json } });
        const code = r.json?.error?.details?.[0]?.errorCode || r.json?.error?.status;
        if (r.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') {
          invalidTokens.push(t.fcm_token);
        }
      }
    }));

    if (invalidTokens.length) {
      await supabase.from('push_subscriptions').delete().in('fcm_token', invalidTokens);
    }
    if (analyticsRows.length) {
      await supabase.from('push_analytics').insert(analyticsRows);
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: targets.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-push error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
