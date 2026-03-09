INSERT INTO storage.buckets (id, name, public) VALUES ('slide-images', 'slide-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read slide images" ON storage.objects FOR SELECT USING (bucket_id = 'slide-images');
CREATE POLICY "Authenticated users can upload slide images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'slide-images');
CREATE POLICY "Users can delete their slide images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'slide-images' AND (storage.foldername(name))[1] = auth.uid()::text);