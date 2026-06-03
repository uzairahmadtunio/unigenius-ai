
-- 1. Quiz score validation trigger
CREATE OR REPLACE FUNCTION public.validate_quiz_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total IS NULL OR NEW.total <= 0 OR NEW.total > 100 THEN
    RAISE EXCEPTION 'Invalid total: %', NEW.total;
  END IF;
  IF NEW.score IS NULL OR NEW.score < 0 OR NEW.score > NEW.total THEN
    RAISE EXCEPTION 'Invalid score: % (must be 0..total)', NEW.score;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_quiz_result_trg ON public.quiz_results;
CREATE TRIGGER validate_quiz_result_trg
  BEFORE INSERT OR UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_result();

-- 2. Storage path-scoped INSERT policies
DROP POLICY IF EXISTS "Users can upload past papers files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload slide images" ON storage.objects;

CREATE POLICY "Users can upload past papers to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'past-papers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload chat files to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload slide images to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'slide-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
