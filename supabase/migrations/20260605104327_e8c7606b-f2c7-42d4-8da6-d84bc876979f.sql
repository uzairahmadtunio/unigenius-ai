
-- 1. Feedbacks: server-side enforce user_email/user_name from auth, prevent impersonation
CREATE OR REPLACE FUNCTION public.feedbacks_set_user_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _name text;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT email::text INTO _email FROM auth.users WHERE id = auth.uid();
  SELECT COALESCE(display_name, _email) INTO _name FROM public.profiles WHERE user_id = auth.uid();
  NEW.user_email := _email;
  NEW.user_name := COALESCE(_name, _email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedbacks_set_user_info_trigger ON public.feedbacks;
CREATE TRIGGER feedbacks_set_user_info_trigger
  BEFORE INSERT ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.feedbacks_set_user_info();

-- 2. Storage: teachers can only delete their own study-materials (files under their uid folder)
DROP POLICY IF EXISTS "Teachers can delete own study materials" ON storage.objects;
CREATE POLICY "Teachers can delete own study materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'study-materials'
  AND public.has_role(auth.uid(), 'teacher')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Also tighten INSERT to require uploads land in user's own folder
DROP POLICY IF EXISTS "Teachers can upload study materials" ON storage.objects;
CREATE POLICY "Teachers can upload study materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'study-materials'
  AND public.has_role(auth.uid(), 'teacher')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Revoke anon EXECUTE on SECURITY DEFINER functions (none should be callable without auth)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.find_group_by_invite_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.grant_streak_pro_day() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.toggle_note_upvote(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_career_activity(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_daily_activity(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_badge(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_all_groups() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_all_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_group(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_manage_user_role(uuid, app_role, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_payment_requests() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_handle_payment(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_support_tickets() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_group_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_streak_pro_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_note_upvote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_career_activity(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_role(uuid, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_payment_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_handle_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_support_tickets() TO authenticated;
