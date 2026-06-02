
-- STUDY PLANS
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  semester INT NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  exam_date DATE,
  weekly_hours INT NOT NULL DEFAULT 14,
  schedule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans select" ON public.study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own plans insert" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans update" ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own plans delete" ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STUDY SESSIONS
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  notes TEXT,
  studied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions select" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sessions insert" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions update" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_study_sessions_user_date ON public.study_sessions(user_id, studied_at DESC);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('study_reminder','streak','quiz','assignment','teacher','system')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notif insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teachers admins insert notif" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own notif update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notif delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at, created_at DESC);

-- SEMESTER EVENTS (calendar)
CREATE TABLE public.semester_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('assignment','quiz','midterm','final','viva','other')),
  event_date DATE NOT NULL,
  event_time TIME,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_events TO authenticated;
GRANT ALL ON public.semester_events TO service_role;
ALTER TABLE public.semester_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ev select" ON public.semester_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ev insert" ON public.semester_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ev update" ON public.semester_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ev delete" ON public.semester_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_semester_events_user_date ON public.semester_events(user_id, event_date);

-- STREAK RECOVERIES (one-time per week)
CREATE TABLE public.streak_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.streak_recoveries TO authenticated;
GRANT ALL ON public.streak_recoveries TO service_role;
ALTER TABLE public.streak_recoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rec select" ON public.streak_recoveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rec insert" ON public.streak_recoveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- updated_at trigger reuse
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_semester_events_updated_at BEFORE UPDATE ON public.semester_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
