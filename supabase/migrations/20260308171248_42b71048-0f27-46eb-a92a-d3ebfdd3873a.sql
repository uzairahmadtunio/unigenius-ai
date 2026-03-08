
-- Notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  semester INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploader_name TEXT NOT NULL DEFAULT 'Anonymous',
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Auth users can upload notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);

-- Note votes table
CREATE TABLE public.note_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, user_id)
);

ALTER TABLE public.note_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.note_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON public.note_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true);

CREATE POLICY "Anyone can read notes files" ON storage.objects FOR SELECT USING (bucket_id = 'notes');
CREATE POLICY "Auth users can upload notes files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes' AND auth.uid() IS NOT NULL);
