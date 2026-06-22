REVOKE EXECUTE ON FUNCTION public.recover_streak() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_streak_recovery_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_recovery_status() TO authenticated;