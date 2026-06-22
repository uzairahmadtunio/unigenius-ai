
-- 1) notes.upvotes: prevent direct column updates by users (toggle_note_upvote bypasses via session_replication_role)
REVOKE UPDATE (upvotes) ON public.notes FROM authenticated, anon;

-- 2) feedbacks: prevent users from supplying user_email/user_name (trigger sets them)
REVOKE INSERT (user_email, user_name) ON public.feedbacks FROM authenticated, anon;

-- 3) groups.invite_code: hide from members; expose only to owners via RPC
REVOKE SELECT (invite_code) ON public.groups FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_group_invite_code(_group_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT invite_code INTO _code FROM public.groups
   WHERE id = _group_id AND owner_id = auth.uid();
  IF _code IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN _code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_invite_code(uuid) TO authenticated;
