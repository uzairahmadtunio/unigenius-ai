
-- 1) question_bank: hide correct_answer/explanation from non-teachers
DROP POLICY IF EXISTS "Anyone authenticated can view questions" ON public.question_bank;

CREATE POLICY "Teachers and admins view questions"
  ON public.question_bank FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE OR REPLACE FUNCTION public.list_question_bank_safe()
RETURNS TABLE (
  id uuid, subject text, topic text, question text,
  option_a text, option_b text, option_c text, option_d text,
  semester integer, created_by uuid, created_at timestamptz,
  has_explanation boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, subject, topic, question, option_a, option_b, option_c, option_d,
         semester, created_by, created_at,
         (explanation IS NOT NULL AND length(explanation) > 0) AS has_explanation
  FROM public.question_bank
  ORDER BY created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_question_bank_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.list_question_bank_safe() TO authenticated;

CREATE OR REPLACE FUNCTION public.check_question_answer(_question_id uuid, _answer text)
RETURNS TABLE (is_correct boolean, correct_answer text, explanation text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT (qb.correct_answer = upper(trim(_answer))) AS is_correct,
           qb.correct_answer, COALESCE(qb.explanation, '')
    FROM public.question_bank qb
    WHERE qb.id = _question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.check_question_answer(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_question_answer(uuid, text) TO authenticated;

-- 2) exam_schedule: explicit admin-only write policies
CREATE POLICY "Admins insert exam schedule"
  ON public.exam_schedule FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update exam schedule"
  ON public.exam_schedule FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete exam schedule"
  ON public.exam_schedule FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) push_analytics: require user_id = auth.uid() on inserts (no NULL bypass)
DROP POLICY IF EXISTS "Users insert own push analytics" ON public.push_analytics;
CREATE POLICY "Users insert own push analytics"
  ON public.push_analytics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
