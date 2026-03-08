
-- Create a leaderboard view aggregating quiz results
-- Points formula: (score * 10) + (50 bonus per perfect score)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  qr.user_id,
  p.display_name,
  p.avatar_url,
  SUM(qr.score * 10) + (COUNT(*) FILTER (WHERE qr.score = qr.total) * 50) AS total_points,
  COUNT(*) AS quizzes_taken,
  COUNT(*) FILTER (WHERE qr.score = qr.total) AS perfect_scores,
  ROUND(AVG(qr.score::numeric / NULLIF(qr.total, 0) * 100), 1) AS avg_percentage
FROM public.quiz_results qr
LEFT JOIN public.profiles p ON p.user_id = qr.user_id
GROUP BY qr.user_id, p.display_name, p.avatar_url;

-- Enable realtime for quiz_results so leaderboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_results;
