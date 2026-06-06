
-- 1. career_activity: block direct client inserts; force use of record_career_activity RPC
DROP POLICY IF EXISTS "Users can insert their own career activity" ON public.career_activity;
DROP POLICY IF EXISTS "career_activity_insert" ON public.career_activity;
CREATE POLICY "No direct inserts to career_activity"
  ON public.career_activity FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 2. payment_requests: server-side validation of promo + amount
CREATE OR REPLACE FUNCTION public.payment_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_price integer := 300; -- PKR
  _discount integer := 0;
  _remaining integer;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NEW.promo_code IS NOT NULL AND length(trim(NEW.promo_code)) > 0 THEN
    SELECT p.discount_percent, (p.usage_limit - p.used_count)
      INTO _discount, _remaining
    FROM public.promo_codes p
    WHERE p.code = upper(trim(NEW.promo_code))
      AND p.is_active = true
    LIMIT 1;

    IF _discount IS NULL OR COALESCE(_remaining, 0) <= 0 THEN
      -- Invalid promo: ignore
      NEW.promo_code := NULL;
      _discount := 0;
    ELSE
      NEW.promo_code := upper(trim(NEW.promo_code));
    END IF;
  END IF;

  NEW.discount_percent := _discount;
  NEW.amount := GREATEST(0, _base_price - (_base_price * _discount / 100));
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_requests_validate_trg ON public.payment_requests;
CREATE TRIGGER payment_requests_validate_trg
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.payment_requests_validate();

-- 3. notes storage bucket: scope uploads to user's own folder
DROP POLICY IF EXISTS "Auth users can upload notes files" ON storage.objects;
CREATE POLICY "Users can upload notes to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Auth users can delete notes files" ON storage.objects;
CREATE POLICY "Users can delete own notes files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. notes table: keep existing trigger AND tighten UPDATE policy to defense-in-depth
-- (trigger notes_block_upvote_tampering already blocks direct upvote changes)
-- No policy change needed; trigger is the enforcement layer and is verified present.
