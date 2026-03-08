
-- Daily streaks table
CREATE TABLE public.daily_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_active_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own streak" ON public.daily_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON public.daily_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.daily_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Function to record daily activity and update streak
CREATE OR REPLACE FUNCTION public.record_daily_activity(_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, total_active_days INTEGER, streak_increased BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing RECORD;
  _today DATE := CURRENT_DATE;
  _streak_increased BOOLEAN := false;
BEGIN
  SELECT * INTO _existing FROM public.daily_streaks ds WHERE ds.user_id = _user_id;
  
  IF NOT FOUND THEN
    -- First time user
    INSERT INTO public.daily_streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
    VALUES (_user_id, 1, 1, _today, 1);
    _streak_increased := true;
    RETURN QUERY SELECT 1, 1, 1, true;
    RETURN;
  END IF;
  
  IF _existing.last_active_date = _today THEN
    -- Already recorded today
    RETURN QUERY SELECT _existing.current_streak, _existing.longest_streak, _existing.total_active_days, false;
    RETURN;
  END IF;
  
  IF _existing.last_active_date = _today - 1 THEN
    -- Consecutive day - increase streak
    UPDATE public.daily_streaks ds
    SET current_streak = _existing.current_streak + 1,
        longest_streak = GREATEST(_existing.longest_streak, _existing.current_streak + 1),
        last_active_date = _today,
        total_active_days = _existing.total_active_days + 1,
        updated_at = now()
    WHERE ds.user_id = _user_id;
    _streak_increased := true;
    RETURN QUERY SELECT _existing.current_streak + 1, GREATEST(_existing.longest_streak, _existing.current_streak + 1), _existing.total_active_days + 1, true;
  ELSE
    -- Streak broken - reset to 1
    UPDATE public.daily_streaks ds
    SET current_streak = 1,
        last_active_date = _today,
        total_active_days = _existing.total_active_days + 1,
        updated_at = now()
    WHERE ds.user_id = _user_id;
    RETURN QUERY SELECT 1, _existing.longest_streak, _existing.total_active_days + 1, false;
  END IF;
END;
$$;
