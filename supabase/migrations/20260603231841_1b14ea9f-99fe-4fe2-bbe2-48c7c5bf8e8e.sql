
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check CHECK (department IS NULL OR department IN ('se','cs','ai'));

DROP FUNCTION IF EXISTS public.get_leaderboard_filtered(text, integer);
DROP FUNCTION IF EXISTS public.get_leaderboard_filtered(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard_filtered(
  time_filter text DEFAULT 'all',
  semester_filter integer DEFAULT NULL,
  department_filter text DEFAULT NULL
)
 RETURNS TABLE(
   user_id uuid,
   display_name text,
   avatar_url text,
   university text,
   department text,
   current_semester integer,
   current_streak integer,
   longest_streak integer,
   total_points bigint,
   quizzes_taken bigint,
   perfect_scores bigint,
   avg_percentage numeric,
   dsa_solved bigint,
   interviews_done bigint,
   best_cv_score integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cutoff TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF time_filter = 'week' THEN
    cutoff := now() - interval '7 days';
  ELSIF time_filter = 'month' THEN
    cutoff := now() - interval '30 days';
  ELSE
    cutoff := '1970-01-01'::timestamptz;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.university,
    p.department,
    p.current_semester,
    COALESCE(ds.current_streak, 0)::INTEGER  AS current_streak,
    COALESCE(ds.longest_streak, 0)::INTEGER  AS longest_streak,
    (COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0))::BIGINT AS total_points,
    COALESCE(q.quizzes_taken, 0)::BIGINT AS quizzes_taken,
    COALESCE(q.perfect_scores, 0)::BIGINT AS perfect_scores,
    COALESCE(q.avg_percentage, 0)::NUMERIC AS avg_percentage,
    COALESCE(c.dsa_solved, 0)::BIGINT AS dsa_solved,
    COALESCE(c.interviews_done, 0)::BIGINT AS interviews_done,
    COALESCE(c.best_cv_score, 0)::INTEGER AS best_cv_score
  FROM public.profiles p
  LEFT JOIN public.daily_streaks ds ON ds.user_id = p.user_id
  LEFT JOIN (
    SELECT
      qr.user_id,
      SUM(qr.score * 10 + CASE WHEN qr.score = qr.total THEN 50 ELSE 0 END) AS quiz_points,
      COUNT(*) AS quizzes_taken,
      COUNT(*) FILTER (WHERE qr.score = qr.total) AS perfect_scores,
      ROUND(AVG(qr.score::numeric / NULLIF(qr.total, 0) * 100)) AS avg_percentage
    FROM public.quiz_results qr
    WHERE qr.created_at >= cutoff
    GROUP BY qr.user_id
  ) q ON p.user_id = q.user_id
  LEFT JOIN (
    SELECT
      ca.user_id,
      SUM(ca.points) AS career_points,
      COUNT(*) FILTER (WHERE ca.activity_type = 'dsa_solve') AS dsa_solved,
      COUNT(*) FILTER (WHERE ca.activity_type = 'interview_complete') AS interviews_done,
      COALESCE(MAX(CASE WHEN ca.activity_type = 'cv_score' THEN (ca.metadata->>'score')::integer END), 0) AS best_cv_score
    FROM public.career_activity ca
    WHERE ca.created_at >= cutoff
    GROUP BY ca.user_id
  ) c ON p.user_id = c.user_id
  WHERE COALESCE(p.show_on_leaderboard, true) = true
    AND (COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0)) > 0
    AND (semester_filter IS NULL OR p.current_semester = semester_filter)
    AND (department_filter IS NULL OR p.department = department_filter)
  ORDER BY total_points DESC, avg_percentage DESC, COALESCE(ds.current_streak, 0) DESC
  LIMIT 200;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(text, integer, text) TO authenticated;
