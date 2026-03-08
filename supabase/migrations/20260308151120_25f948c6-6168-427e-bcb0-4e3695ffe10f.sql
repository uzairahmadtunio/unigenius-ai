
-- University notices table
CREATE TABLE public.university_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Anyone can read notices (public info)
ALTER TABLE public.university_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view notices" ON public.university_notices FOR SELECT USING (true);

-- User dismissed notices (to track read state)
CREATE TABLE public.user_notice_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notice_id uuid NOT NULL REFERENCES public.university_notices(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notice_id)
);

ALTER TABLE public.user_notice_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notice reads" ON public.user_notice_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notice reads" ON public.user_notice_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exam schedule table
CREATE TABLE public.exam_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  exam_type text NOT NULL DEFAULT 'midterm',
  exam_date timestamp with time zone NOT NULL,
  semester integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exam schedule" ON public.exam_schedule FOR SELECT USING (true);
