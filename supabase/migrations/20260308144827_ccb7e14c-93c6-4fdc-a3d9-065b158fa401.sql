
-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  owner_id uuid NOT NULL,
  semester integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group messages (shared chat)
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  file_urls text[] DEFAULT '{}',
  file_names text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group files
CREATE TABLE public.group_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'document',
  file_size bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_files ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Helper: check if user is group owner
CREATE OR REPLACE FUNCTION public.is_group_owner(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND owner_id = _user_id
  )
$$;

-- Groups policies
CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Auth users can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update groups" ON public.groups
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete groups" ON public.groups
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Anyone can read groups by invite code (for joining)
CREATE POLICY "Anyone can find group by invite code" ON public.groups
  FOR SELECT TO authenticated
  USING (true);

-- Group members policies
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Auth users can join groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    public.is_group_owner(auth.uid(), group_id) OR auth.uid() = user_id
  );

-- Group messages policies
CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can send messages" ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Owners can delete messages" ON public.group_messages
  FOR DELETE TO authenticated
  USING (public.is_group_owner(auth.uid(), group_id) OR auth.uid() = user_id);

-- Group files policies
CREATE POLICY "Members can view group files" ON public.group_files
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can upload files" ON public.group_files
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Owners or uploaders can delete files" ON public.group_files
  FOR DELETE TO authenticated
  USING (
    public.is_group_owner(auth.uid(), group_id) OR auth.uid() = uploaded_by
  );

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Storage bucket for group files
INSERT INTO storage.buckets (id, name, public) VALUES ('group-files', 'group-files', true);

-- Storage policies for group files bucket
CREATE POLICY "Authenticated users can upload group files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-files');

CREATE POLICY "Anyone can view group files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'group-files');

CREATE POLICY "Users can delete own group files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'group-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow profiles to be searched by roll number (for invites)
CREATE POLICY "Users can search profiles by roll number" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
