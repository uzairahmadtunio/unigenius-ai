-- 1) Profiles: prevent self-escalation to Pro
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (no pro escalation)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_pro IS NOT DISTINCT FROM (SELECT p.is_pro FROM public.profiles p WHERE p.user_id = auth.uid())
  AND streak_pro_until IS NOT DISTINCT FROM (SELECT p.streak_pro_until FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 2) Daily streaks: remove direct UPDATE; force RPC
DROP POLICY IF EXISTS "Users can update own streak" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users can update their own streak" ON public.daily_streaks;

-- 3) Notes: add WITH CHECK to prevent ownership reassignment
DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;

CREATE POLICY "Users can update own notes (no ownership transfer)"
ON public.notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4) Notes upvotes: trigger to block direct upvote tampering
CREATE OR REPLACE FUNCTION public.notes_block_upvote_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.upvotes IS DISTINCT FROM OLD.upvotes
     AND current_setting('session_replication_role', true) <> 'replica' THEN
    RAISE EXCEPTION 'Direct modification of upvotes is not allowed. Use toggle_note_upvote().';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_block_upvote_tampering ON public.notes;
CREATE TRIGGER notes_block_upvote_tampering
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.notes_block_upvote_tampering();