CREATE OR REPLACE FUNCTION public.recover_streak()
RETURNS TABLE(success boolean, remaining integer, is_unlimited boolean, used_this_month integer, monthly_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
  _used integer;
  _limit integer := 5;
  _month_start timestamptz := date_trunc('month', now());
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _is_admin := public.has_role(_uid, 'admin');

  SELECT COUNT(*)::int INTO _used
  FROM public.streak_recoveries
  WHERE user_id = _uid
    AND recovered_at >= _month_start;

  IF NOT _is_admin AND _used >= _limit THEN
    RETURN QUERY SELECT false, 0, false, _used, _limit;
    RETURN;
  END IF;

  INSERT INTO public.streak_recoveries (user_id) VALUES (_uid);

  -- Reset/repair the streak to 1 day starting today
  INSERT INTO public.daily_streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
  VALUES (_uid, 1, 1, CURRENT_DATE, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = GREATEST(public.daily_streaks.current_streak, 1),
        last_active_date = CURRENT_DATE,
        total_active_days = public.daily_streaks.total_active_days + CASE WHEN public.daily_streaks.last_active_date = CURRENT_DATE THEN 0 ELSE 1 END,
        updated_at = now();

  IF _is_admin THEN
    RETURN QUERY SELECT true, 999999, true, _used + 1, _limit;
  ELSE
    RETURN QUERY SELECT true, _limit - (_used + 1), false, _used + 1, _limit;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_streak_recovery_status()
RETURNS TABLE(remaining integer, is_unlimited boolean, used_this_month integer, monthly_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
  _used integer;
  _limit integer := 5;
  _month_start timestamptz := date_trunc('month', now());
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _is_admin := public.has_role(_uid, 'admin');

  SELECT COUNT(*)::int INTO _used
  FROM public.streak_recoveries
  WHERE user_id = _uid
    AND recovered_at >= _month_start;

  IF _is_admin THEN
    RETURN QUERY SELECT 999999, true, _used, _limit;
  ELSE
    RETURN QUERY SELECT GREATEST(_limit - _used, 0), false, _used, _limit;
  END IF;
END;
$$;