
-- Career activity table to track DSA solves, interviews, CV scores
CREATE TABLE public.career_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('dsa_solve', 'interview_complete', 'cv_score')),
  points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own career activity" ON public.career_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own career activity" ON public.career_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- User badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for career_activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.career_activity;

-- Drop and recreate leaderboard view to include career points
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
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
