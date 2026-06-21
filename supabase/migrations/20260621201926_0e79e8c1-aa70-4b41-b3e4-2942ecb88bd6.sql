
-- 1. Private schema for shared internal secrets (not exposed via API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.app_secrets FROM anon, authenticated;
GRANT ALL ON private.app_secrets TO service_role;

INSERT INTO private.app_secrets (key, value)
VALUES ('send_push_secret', 'c3314f9cc4aea4800f10fcd4794d13ef156aed16bbd9228a7661718c53a9ad37')
ON CONFLICT (key) DO NOTHING;

-- 2. Update notification trigger to include shared secret header
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private
AS $function$
DECLARE
  _category TEXT;
  _url TEXT := 'https://tvazcfwsnjjbwvzvxghx.supabase.co/functions/v1/send-push';
  _secret TEXT;
BEGIN
  _category := CASE NEW.type
    WHEN 'study_reminder' THEN 'study_reminder'
    WHEN 'streak' THEN 'streak_alert'
    WHEN 'quiz' THEN 'quiz_reminder'
    WHEN 'assignment' THEN 'study_reminder'
    WHEN 'teacher' THEN 'teacher_announcement'
    ELSE 'premium_updates'
  END;

  SELECT value INTO _secret FROM private.app_secrets WHERE key = 'send_push_secret';

  PERFORM extensions.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', COALESCE(_secret, '')
    ),
    body := jsonb_build_object(
      'target', 'user',
      'user_id', NEW.user_id,
      'category', _category,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'link', COALESCE(NEW.link, '/'),
      'notification_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- 3. Promo codes: restrict SELECT to admins only (use via validate_promo_code RPC otherwise)
DROP POLICY IF EXISTS "Admins can view promo codes" ON public.promo_codes;
CREATE POLICY "Admins can view promo codes"
ON public.promo_codes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. push_analytics: prevent NULL user_id inserts
DROP POLICY IF EXISTS "Users insert own push analytics" ON public.push_analytics;
CREATE POLICY "Users insert own push analytics"
ON public.push_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
