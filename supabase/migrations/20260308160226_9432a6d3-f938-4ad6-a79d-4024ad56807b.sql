
-- Add is_pro to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

-- Create payment_requests table
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  screenshot_url text NOT NULL,
  payment_method text NOT NULL DEFAULT 'jazzcash',
  amount integer NOT NULL DEFAULT 300,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Students can insert their own requests
CREATE POLICY "Students can create payment requests"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Students can view their own requests
CREATE POLICY "Students can view own payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update payment requests"
ON public.payment_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true);

-- Storage policies
CREATE POLICY "Auth users can upload payment screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots');

-- Admin RPC to get payment requests
CREATE OR REPLACE FUNCTION public.admin_get_payment_requests()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  screenshot_url text,
  payment_method text,
  amount integer,
  status text,
  admin_note text,
  created_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  user_name text,
  user_email text,
  user_avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    pr.user_id,
    pr.screenshot_url,
    pr.payment_method,
    pr.amount,
    pr.status,
    pr.admin_note,
    pr.created_at,
    pr.reviewed_at,
    COALESCE(p.display_name, 'Unknown') AS user_name,
    u.email::text AS user_email,
    p.avatar_url AS user_avatar
  FROM public.payment_requests pr
  LEFT JOIN public.profiles p ON p.user_id = pr.user_id
  LEFT JOIN auth.users u ON u.id = pr.user_id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Admin approve/reject function
CREATE OR REPLACE FUNCTION public.admin_handle_payment(_request_id uuid, _action text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT user_id INTO _user_id FROM public.payment_requests WHERE id = _request_id;

  IF _action = 'approve' THEN
    UPDATE public.payment_requests SET status = 'approved', reviewed_at = now(), admin_note = _note WHERE id = _request_id;
    UPDATE public.profiles SET is_pro = true WHERE user_id = _user_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.payment_requests SET status = 'rejected', reviewed_at = now(), admin_note = _note WHERE id = _request_id;
  END IF;
END;
$$;
