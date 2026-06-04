
-- 1. promo_codes: scope admin policies to authenticated
DROP POLICY IF EXISTS "Admins can delete promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can insert promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can update promo codes" ON public.promo_codes;

CREATE POLICY "Admins can delete promo codes" ON public.promo_codes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert promo codes" ON public.promo_codes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update promo codes" ON public.promo_codes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. study_materials: add WITH CHECK to prevent ownership reassignment
DROP POLICY IF EXISTS "Teachers can update own materials" ON public.study_materials;
CREATE POLICY "Teachers can update own materials" ON public.study_materials
  FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by AND public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (auth.uid() = uploaded_by AND public.has_role(auth.uid(), 'teacher'));

-- 3. notifications: remove self-insert; only admins and SECURITY DEFINER RPCs may insert
DROP POLICY IF EXISTS "own notif insert" ON public.notifications;

-- 4. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_admin_on_signup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_notes_uploader_name() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notes_protect_upvotes() FROM PUBLIC, anon;

-- Ensure authenticated keeps access where needed by RLS evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO authenticated;
