-- Create question_bank table
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL DEFAULT 'A',
  explanation TEXT DEFAULT '',
  semester INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert own questions"
ON public.question_bank FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update own questions"
ON public.question_bank FOR UPDATE TO authenticated
USING (auth.uid() = created_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete own questions"
ON public.question_bank FOR DELETE TO authenticated
USING (auth.uid() = created_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Anyone authenticated can view questions"
ON public.question_bank FOR SELECT TO authenticated
USING (true);

-- Admin full access to question_bank
CREATE POLICY "Admins full access question_bank"
ON public.question_bank FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create study_materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  semester INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert own materials"
ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update own materials"
ON public.study_materials FOR UPDATE TO authenticated
USING (auth.uid() = uploaded_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete own materials"
ON public.study_materials FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Anyone authenticated can view materials"
ON public.study_materials FOR SELECT TO authenticated
USING (true);

-- Admin full access to study_materials
CREATE POLICY "Admins full access study_materials"
ON public.study_materials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers can upload study materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Anyone can view study materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials');

CREATE POLICY "Teachers can delete own study materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND public.has_role(auth.uid(), 'teacher'));

-- Admin function to manage user roles
CREATE OR REPLACE FUNCTION public.admin_manage_user_role(_target_user_id UUID, _role app_role, _action TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _action = 'add' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _action = 'remove' THEN
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;
END;
$$;