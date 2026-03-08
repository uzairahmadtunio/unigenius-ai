
CREATE OR REPLACE FUNCTION public.admin_handle_payment(_request_id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _promo text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT user_id, promo_code INTO _user_id, _promo FROM public.payment_requests WHERE id = _request_id;

  IF _action = 'approve' THEN
    UPDATE public.payment_requests SET status = 'approved', reviewed_at = now(), admin_note = _note WHERE id = _request_id;
    UPDATE public.profiles SET is_pro = true WHERE user_id = _user_id;
    -- Auto-increment promo used_count
    IF _promo IS NOT NULL THEN
      UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = _promo;
    END IF;
  ELSIF _action = 'reject' THEN
    UPDATE public.payment_requests SET status = 'rejected', reviewed_at = now(), admin_note = _note WHERE id = _request_id;
  END IF;
END;
$function$;
