
-- 1. promo_codes: restrict to authenticated + active
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
CREATE POLICY "Authenticated users can view active promo codes"
ON public.promo_codes FOR SELECT TO authenticated
USING (is_active = true);

-- 2. user_roles: prevent privilege escalation - admin-only writes
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. payment-screenshots: make bucket private + scoped read access
UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

DROP POLICY IF EXISTS "Anyone can view payment screenshots" ON storage.objects;

CREATE POLICY "Users can view own payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND public.has_role(auth.uid(), 'admin')
);

-- 4. notes uploader_name spoof protection - trigger sets from profile
CREATE OR REPLACE FUNCTION public.set_notes_uploader_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(display_name, 'Anonymous') INTO NEW.uploader_name
  FROM public.profiles WHERE user_id = auth.uid();
  IF NEW.uploader_name IS NULL OR NEW.uploader_name = '' THEN
    NEW.uploader_name := 'Anonymous';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_set_uploader_name ON public.notes;
CREATE TRIGGER notes_set_uploader_name
BEFORE INSERT ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_notes_uploader_name();

-- 5. Validate career_activity inserts (allowed types + point caps)
CREATE OR REPLACE FUNCTION public.validate_career_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.activity_type NOT IN ('dsa_solve', 'interview_complete', 'cv_score') THEN
    RAISE EXCEPTION 'Invalid activity_type: %', NEW.activity_type;
  END IF;
  IF NEW.points < 0 OR NEW.points > 100 THEN
    RAISE EXCEPTION 'Points out of allowed range (0-100): %', NEW.points;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS career_activity_validate ON public.career_activity;
CREATE TRIGGER career_activity_validate
BEFORE INSERT ON public.career_activity
FOR EACH ROW EXECUTE FUNCTION public.validate_career_activity();

-- 6. Validate user_badges inserts (restrict to known badge ids)
CREATE OR REPLACE FUNCTION public.validate_user_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.badge_id NOT IN (
    'dsa_warrior','interview_ready','cv_master','cv_ready','profile_pro','top_scorer'
  ) THEN
    RAISE EXCEPTION 'Invalid badge_id: %', NEW.badge_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_badges_validate ON public.user_badges;
CREATE TRIGGER user_badges_validate
BEFORE INSERT ON public.user_badges
FOR EACH ROW EXECUTE FUNCTION public.validate_user_badge();
