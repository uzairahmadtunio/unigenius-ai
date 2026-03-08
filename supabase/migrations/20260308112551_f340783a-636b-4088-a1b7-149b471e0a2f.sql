
-- Function to get time-filtered leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard_filtered(time_filter TEXT DEFAULT 'all')
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  quizzes_taken BIGINT,
  perfect_scores BIGINT,
  avg_percentage NUMERIC,
  dsa_solved BIGINT,
  interviews_done BIGINT,
  best_cv_score INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ;
BEGIN
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
    (COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0))::BIGINT AS total_points,
    COALESCE(q.quizzes_taken, 0)::BIGINT AS quizzes_taken,
    COALESCE(q.perfect_scores, 0)::BIGINT AS perfect_scores,
    COALESCE(q.avg_percentage, 0)::NUMERIC AS avg_percentage,
    COALESCE(c.dsa_solved, 0)::BIGINT AS dsa_solved,
    COALESCE(c.interviews_done, 0)::BIGINT AS interviews_done,
    COALESCE(c.best_cv_score, 0)::INTEGER AS best_cv_score
  FROM public.profiles p
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
  WHERE COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0) > 0
  ORDER BY total_points DESC
  LIMIT 50;
END;
$$;
