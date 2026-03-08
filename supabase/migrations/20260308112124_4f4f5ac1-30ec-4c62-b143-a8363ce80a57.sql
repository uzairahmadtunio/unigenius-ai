
-- Fix security definer view by making it invoker
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0) AS total_points,
  COALESCE(q.quizzes_taken, 0) AS quizzes_taken,
  COALESCE(q.perfect_scores, 0) AS perfect_scores,
  COALESCE(q.avg_percentage, 0) AS avg_percentage,
  COALESCE(c.dsa_solved, 0) AS dsa_solved,
  COALESCE(c.interviews_done, 0) AS interviews_done,
  COALESCE(c.best_cv_score, 0) AS best_cv_score
FROM public.profiles p
LEFT JOIN (
  SELECT
    user_id,
    SUM(score * 10 + CASE WHEN score = total THEN 50 ELSE 0 END) AS quiz_points,
    COUNT(*) AS quizzes_taken,
    COUNT(*) FILTER (WHERE score = total) AS perfect_scores,
    ROUND(AVG(score::numeric / NULLIF(total, 0) * 100)) AS avg_percentage
  FROM public.quiz_results
  GROUP BY user_id
) q ON p.user_id = q.user_id
LEFT JOIN (
  SELECT
    user_id,
    SUM(points) AS career_points,
    COUNT(*) FILTER (WHERE activity_type = 'dsa_solve') AS dsa_solved,
    COUNT(*) FILTER (WHERE activity_type = 'interview_complete') AS interviews_done,
    COALESCE(MAX(CASE WHEN activity_type = 'cv_score' THEN (metadata->>'score')::integer END), 0) AS best_cv_score
  FROM public.career_activity
  GROUP BY user_id
) c ON p.user_id = c.user_id
WHERE COALESCE(q.quiz_points, 0) + COALESCE(c.career_points, 0) > 0;
