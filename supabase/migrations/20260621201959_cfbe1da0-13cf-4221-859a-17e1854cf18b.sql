
CREATE OR REPLACE FUNCTION public.get_send_push_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT value FROM private.app_secrets WHERE key = 'send_push_secret';
$$;

REVOKE ALL ON FUNCTION public.get_send_push_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_send_push_secret() TO service_role;
