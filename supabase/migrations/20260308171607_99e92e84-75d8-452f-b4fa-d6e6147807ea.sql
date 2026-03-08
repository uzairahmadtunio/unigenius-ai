
-- Promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 50,
  usage_limit INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promo codes (to validate)
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes FOR SELECT USING (true);
-- Only admins can manage
CREATE POLICY "Admins can insert promo codes" ON public.promo_codes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update promo codes" ON public.promo_codes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete promo codes" ON public.promo_codes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add promo_code column to payment_requests
ALTER TABLE public.payment_requests ADD COLUMN promo_code TEXT DEFAULT NULL;
ALTER TABLE public.payment_requests ADD COLUMN discount_percent INTEGER DEFAULT 0;

-- Seed default promo codes
INSERT INTO public.promo_codes (code, discount_percent, usage_limit) VALUES
  ('UOL50', 50, 100),
  ('FIRST50', 50, 50);
