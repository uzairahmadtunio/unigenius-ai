
-- 1. record_daily_activity: enforce caller identity
CREATE OR REPLACE FUNCTION public.record_daily_activity(_user_id uuid)
 RETURNS TABLE(current_streak integer, longest_streak integer, total_active_days integer, streak_increased boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing RECORD;
  _today DATE := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO _existing FROM public.daily_streaks ds WHERE ds.user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.daily_streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
    VALUES (_user_id, 1, 1, _today, 1);
    RETURN QUERY SELECT 1, 1, 1, true;
    RETURN;
  END IF;

  IF _existing.last_active_date = _today THEN
    RETURN QUERY SELECT _existing.current_streak, _existing.longest_streak, _existing.total_active_days, false;
    RETURN;
  END IF;

  IF _existing.last_active_date = _today - 1 THEN
    UPDATE public.daily_streaks ds
    SET current_streak = _existing.current_streak + 1,
        longest_streak = GREATEST(_existing.longest_streak, _existing.current_streak + 1),
        last_active_date = _today,
        total_active_days = _existing.total_active_days + 1,
        updated_at = now()
    WHERE ds.user_id = _user_id;
    RETURN QUERY SELECT _existing.current_streak + 1, GREATEST(_existing.longest_streak, _existing.current_streak + 1), _existing.total_active_days + 1, true;
  ELSE
    UPDATE public.daily_streaks ds
    SET current_streak = 1,
        last_active_date = _today,
        total_active_days = _existing.total_active_days + 1,
        updated_at = now()
    WHERE ds.user_id = _user_id;
    RETURN QUERY SELECT 1, _existing.longest_streak, _existing.total_active_days + 1, false;
  END IF;
END;
$function$;

-- 2. Tighten profiles SELECT policy
DROP POLICY IF EXISTS "Users can search profiles by roll number" ON public.profiles;
CREATE POLICY "Profiles visible to owner or opted-in users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR COALESCE(show_on_leaderboard, true) = true);

-- 3. Promo codes: hide list, validate via RPC
DROP POLICY IF EXISTS "Authenticated users can view active promo codes" ON public.promo_codes;

CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
 RETURNS TABLE(code text, discount_percent integer, remaining integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT p.code, p.discount_percent, (p.usage_limit - p.used_count) AS remaining
  FROM public.promo_codes p
  WHERE p.code = upper(trim(_code))
    AND p.is_active = true
    AND (p.usage_limit - p.used_count) > 0
  LIMIT 1;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated;

-- 4. Stop broadcasting feedbacks via realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.feedbacks;

-- 5. Notes upvotes: block direct counter edits + add RPC
CREATE OR REPLACE FUNCTION public.notes_protect_upvotes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.upvotes := OLD.upvotes;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notes_protect_upvotes_trg ON public.notes;
CREATE TRIGGER notes_protect_upvotes_trg
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_protect_upvotes();

CREATE OR REPLACE FUNCTION public.toggle_note_upvote(_note_id uuid)
 RETURNS TABLE(upvoted boolean, total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _exists boolean;
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.note_votes WHERE note_id = _note_id AND user_id = auth.uid())
    INTO _exists;

  IF _exists THEN
    DELETE FROM public.note_votes WHERE note_id = _note_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.note_votes (note_id, user_id) VALUES (_note_id, auth.uid())
      ON CONFLICT (note_id, user_id) DO NOTHING;
  END IF;

  SELECT COUNT(*)::int INTO _count FROM public.note_votes WHERE note_id = _note_id;

  -- Bypass trigger by updating via a definer-side direct write using session_replication_role
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.notes SET upvotes = _count WHERE id = _note_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  RETURN QUERY SELECT (NOT _exists), _count;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.toggle_note_upvote(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.toggle_note_upvote(uuid) TO authenticated;

-- 6. Career activity: server-validated RPC
DROP POLICY IF EXISTS "Users can insert own career activity" ON public.career_activity;

CREATE OR REPLACE FUNCTION public.record_career_activity(_activity_type text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _points integer;
  _id uuid;
  _score integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF _activity_type = 'dsa_solve' THEN
    _points := 20;
  ELSIF _activity_type = 'interview_complete' THEN
    _points := 25;
  ELSIF _activity_type = 'cv_score' THEN
    _score := COALESCE((_metadata->>'score')::int, 0);
    IF _score < 0 OR _score > 100 THEN RAISE EXCEPTION 'Invalid score'; END IF;
    _points := GREATEST(0, LEAST(30, _score / 4));
  ELSE
    RAISE EXCEPTION 'Invalid activity_type: %', _activity_type;
  END IF;

  INSERT INTO public.career_activity (user_id, activity_type, points, metadata)
  VALUES (auth.uid(), _activity_type, _points, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.record_career_activity(text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_career_activity(text, jsonb) TO authenticated;

-- 7. User badges: server-validated awarding
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.award_badge(_badge_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _dsa int; _iv int; _cv int; _cv_top int;
  _name text; _icon text;
  _ok boolean := false;
  _profile_complete boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COUNT(*) FILTER (WHERE activity_type='dsa_solve'),
         COUNT(*) FILTER (WHERE activity_type='interview_complete'),
         COUNT(*) FILTER (WHERE activity_type='cv_score'),
         COALESCE(MAX(CASE WHEN activity_type='cv_score' THEN (metadata->>'score')::int END),0)
    INTO _dsa, _iv, _cv, _cv_top
  FROM public.career_activity WHERE user_id = _uid;

  IF _badge_id = 'dsa_warrior' THEN
    _name := 'DSA Warrior'; _icon := '⚔️'; _ok := _dsa >= 5;
  ELSIF _badge_id = 'interview_ready' THEN
    _name := 'Interview Ready'; _icon := '🎤'; _ok := _iv >= 5;
  ELSIF _badge_id = 'cv_ready' THEN
    _name := 'CV Ready'; _icon := '📝'; _ok := _cv >= 1;
  ELSIF _badge_id = 'cv_master' THEN
    _name := 'CV Master'; _icon := '📄'; _ok := _cv_top >= 80;
  ELSIF _badge_id = 'profile_pro' THEN
    _name := 'Profile Pro'; _icon := '✨';
    SELECT (display_name IS NOT NULL AND roll_number IS NOT NULL
            AND avatar_url IS NOT NULL AND headline IS NOT NULL
            AND (github_url IS NOT NULL OR linkedin_url IS NOT NULL)
            AND section IS NOT NULL)
      INTO _profile_complete FROM public.profiles WHERE user_id = _uid;
    _ok := COALESCE(_profile_complete, false);
  ELSE
    RAISE EXCEPTION 'Invalid badge_id: %', _badge_id;
  END IF;

  IF NOT _ok THEN RETURN false; END IF;

  INSERT INTO public.user_badges (user_id, badge_id, badge_name, badge_icon)
  VALUES (_uid, _badge_id, _name, _icon)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.award_badge(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;

-- 8. Notifications: remove broad teacher insert
DROP POLICY IF EXISTS "teachers admins insert notif" ON public.notifications;
CREATE POLICY "Admins can insert any notification"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. Group storage: enforce ownership / membership
DROP POLICY IF EXISTS "Authenticated users can update group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload group files" ON storage.objects;

CREATE POLICY "Group owner can upload group avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-avatars'
    AND public.is_group_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Group owner can update group avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-avatars'
    AND public.is_group_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Group owner can delete group avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-avatars'
    AND public.is_group_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Group members can upload group files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-files'
    AND public.is_group_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 10. Restrict listing of public buckets to authenticated users
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view group files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view past papers files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read notes files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read slide images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view study materials" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for chat uploads" ON storage.objects;

CREATE POLICY "Authenticated can read public app buckets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','group-avatars','group-files','past-papers','notes','slide-images','study-materials','chat-uploads'));

-- 11. Revoke anon EXECUTE on internal definer functions
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_group(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_all_groups() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_all_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_support_tickets() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_payment_requests() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_handle_payment(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_manage_user_role(uuid, app_role, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.grant_streak_pro_day() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_daily_activity(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.find_group_by_invite_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_filtered(text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_support_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_payment_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_handle_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_role(uuid, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_streak_pro_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_group_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text) TO authenticated;
