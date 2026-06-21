
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  browser TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notification_preferences JSONB NOT NULL DEFAULT '{
    "study_reminder": true,
    "quiz_reminder": true,
    "exam_reminder": true,
    "viva_reminder": true,
    "teacher_announcement": true,
    "streak_alert": true,
    "premium_updates": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subs_enabled ON public.push_subscriptions(enabled) WHERE enabled = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs - select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs - insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs - update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs - delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Analytics
CREATE TABLE public.push_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('sent','delivered','clicked','failed')),
  fcm_token TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_analytics_user ON public.push_analytics(user_id, created_at DESC);
CREATE INDEX idx_push_analytics_event ON public.push_analytics(event, created_at DESC);

GRANT SELECT, INSERT ON public.push_analytics TO authenticated;
GRANT ALL ON public.push_analytics TO service_role;

ALTER TABLE public.push_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own push analytics" ON public.push_analytics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push analytics" ON public.push_analytics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
