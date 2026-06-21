
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: trigger to call send-push edge function on new notification
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _category TEXT;
  _url TEXT := 'https://tvazcfwsnjjbwvzvxghx.supabase.co/functions/v1/send-push';
  _service_key TEXT;
BEGIN
  -- Map notification type to push category
  _category := CASE NEW.type
    WHEN 'study_reminder' THEN 'study_reminder'
    WHEN 'streak' THEN 'streak_alert'
    WHEN 'quiz' THEN 'quiz_reminder'
    WHEN 'assignment' THEN 'study_reminder'
    WHEN 'teacher' THEN 'teacher_announcement'
    ELSE 'premium_updates'
  END;

  PERFORM extensions.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'target', 'user',
      'user_id', NEW.user_id,
      'category', _category,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'link', COALESCE(NEW.link, '/'),
      'notification_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block notification inserts on push failures
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_send_push ON public.notifications;
CREATE TRIGGER trg_notifications_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push_on_notification();
