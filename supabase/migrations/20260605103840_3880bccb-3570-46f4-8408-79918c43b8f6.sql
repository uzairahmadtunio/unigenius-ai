CREATE OR REPLACE FUNCTION public.validate_quiz_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total IS NULL OR NEW.total <= 0 OR NEW.total > 50 THEN
    RAISE EXCEPTION 'Invalid total: % (must be 1..50)', NEW.total;
  END IF;
  IF NEW.score IS NULL OR NEW.score < 0 OR NEW.score > NEW.total THEN
    RAISE EXCEPTION 'Invalid score: % (must be 0..total)', NEW.score;
  END IF;
  IF NEW.quiz_type IS NULL OR NEW.quiz_type NOT IN ('practice','daily','past_paper','flashcard') THEN
    RAISE EXCEPTION 'Invalid quiz_type: %', NEW.quiz_type;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_quiz_result_trigger ON public.quiz_results;
CREATE TRIGGER validate_quiz_result_trigger
  BEFORE INSERT OR UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_result();