-- 1) Server-side streak Pro day
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_pro_until timestamptz;

CREATE OR REPLACE FUNCTION public.grant_streak_pro_day()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _streak integer;
  _until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT current_streak INTO _streak FROM public.daily_streaks WHERE user_id = auth.uid();
  IF COALESCE(_streak, 0) < 7 THEN
    RAISE EXCEPTION 'Streak too low';
  END IF;
  _until := (CURRENT_DATE + 1)::timestamptz;
  UPDATE public.profiles
    SET streak_pro_until = GREATEST(COALESCE(streak_pro_until, now()), _until)
    WHERE user_id = auth.uid();
  RETURN _until;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_streak_pro_day() FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_streak_pro_day() TO authenticated;

-- 2) Past-papers storage DELETE: must own the file (folder = user id)
DROP POLICY IF EXISTS "Users can delete own past paper files" ON storage.objects;
CREATE POLICY "Users can delete own past paper files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'past-papers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Groups: remove broad SELECT policy, add SECURITY DEFINER lookup
DROP POLICY IF EXISTS "Anyone can find group by invite code" ON public.groups;

CREATE OR REPLACE FUNCTION public.find_group_by_invite_code(_code text)
RETURNS TABLE(id uuid, name text, description text, owner_id uuid, semester integer, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.description, g.owner_id, g.semester, g.avatar_url, g.created_at
  FROM public.groups g
  WHERE g.invite_code = _code
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.find_group_by_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_group_by_invite_code(text) TO authenticated;

-- 4) Support message role spoofing
DROP POLICY IF EXISTS "Ticket owner can send messages" ON public.support_messages;
CREATE POLICY "Ticket owner or admin can send messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (sender_role = 'student'
      AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()))
    OR (sender_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
  )
);