
-- Add avatar_url to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create group-avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for group-avatars
CREATE POLICY "Anyone can view group avatars" ON storage.objects FOR SELECT USING (bucket_id = 'group-avatars');
CREATE POLICY "Authenticated users can upload group avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update group avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete group avatars" ON storage.objects FOR DELETE USING (bucket_id = 'group-avatars' AND auth.role() = 'authenticated');
