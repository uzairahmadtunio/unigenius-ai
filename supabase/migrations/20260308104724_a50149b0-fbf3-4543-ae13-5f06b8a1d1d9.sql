
-- Create storage bucket for chat file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-uploads');

-- RLS: anyone can read (public bucket for AI to access)
CREATE POLICY "Public read access for chat uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-uploads');

-- RLS: users can delete their own uploads
CREATE POLICY "Users can delete own chat uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
