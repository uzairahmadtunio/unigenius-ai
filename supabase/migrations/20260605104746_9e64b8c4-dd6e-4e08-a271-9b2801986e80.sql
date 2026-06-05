
-- ============================================================
-- 1. Tighten profiles SELECT policies
-- ============================================================

DROP POLICY IF EXISTS "Profiles visible to owner or opted-in users" ON public.profiles;

-- Helper: do two users share at least one group?
CREATE OR REPLACE FUNCTION public.shares_group_with(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = _viewer
      AND gm2.user_id = _target
  );
$$;

REVOKE EXECUTE ON FUNCTION public.shares_group_with(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_group_with(uuid, uuid) TO authenticated;

-- Group co-members can read each other's profile (display name, avatar, roll number for chat)
CREATE POLICY "Group co-members can view profile"
ON public.profiles FOR SELECT
TO authenticated
USING (public.shares_group_with(auth.uid(), user_id));

-- Teachers can view student profiles (TeacherDashboard joins for display_name)
CREATE POLICY "Teachers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Safe public profile RPC (for PublicProfilePage lookup-by-roll)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_profile_by_roll(_roll_number text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  university text,
  headline text,
  github_url text,
  linkedin_url text,
  skills text[],
  roll_number text,
  is_pro boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.university,
    p.headline,
    p.github_url,
    p.linkedin_url,
    p.skills,
    p.roll_number,
    COALESCE(p.is_pro, false) AS is_pro
  FROM public.profiles p
  WHERE p.roll_number = _roll_number
    AND COALESCE(p.show_on_leaderboard, true) = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_roll(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_roll(text) TO authenticated;

-- ============================================================
-- 3. Realtime: restrict to postgres_changes (which obeys RLS)
--    Block broadcast/presence subscriptions across users.
-- ============================================================

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated may receive postgres_changes only" ON realtime.messages;
CREATE POLICY "Authenticated may receive postgres_changes only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (extension = 'postgres_changes');
