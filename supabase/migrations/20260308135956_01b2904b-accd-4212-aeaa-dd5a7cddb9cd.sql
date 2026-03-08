
-- Past papers table for community uploads
CREATE TABLE public.past_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  semester INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  paper_type TEXT NOT NULL DEFAULT 'midterm',
  year INTEGER,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view all papers (community)
CREATE POLICY "Anyone can view past papers" ON public.past_papers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upload past papers" ON public.past_papers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own papers" ON public.past_papers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Flashcard sets table
CREATE TABLE public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  semester INTEGER NOT NULL,
  title TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL DEFAULT 'ai_generated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcards" ON public.flashcard_sets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create flashcards" ON public.flashcard_sets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON public.flashcard_sets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for past papers
INSERT INTO storage.buckets (id, name, public) VALUES ('past-papers', 'past-papers', true);

-- Storage policies for past papers
CREATE POLICY "Anyone can view past papers files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'past-papers');

CREATE POLICY "Users can upload past papers files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'past-papers');

CREATE POLICY "Users can delete own past paper files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'past-papers');
