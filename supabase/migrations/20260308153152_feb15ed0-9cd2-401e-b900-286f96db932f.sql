
-- Global alerts table for admin broadcast messages
CREATE TABLE public.global_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message text NOT NULL,
    alert_type text NOT NULL DEFAULT 'info',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz
);

ALTER TABLE public.global_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active alerts
CREATE POLICY "Anyone can view global alerts" ON public.global_alerts
FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert global alerts" ON public.global_alerts
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update global alerts" ON public.global_alerts
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete global alerts" ON public.global_alerts
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Edge function for admin to list all users (security definer)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
    user_id uuid,
    email text,
    created_at timestamptz,
    display_name text,
    roll_number text,
    avatar_url text,
    current_semester integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        u.id AS user_id,
        u.email::text AS email,
        u.created_at AS created_at,
        p.display_name,
        p.roll_number,
        p.avatar_url,
        p.current_semester
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Admin function to delete a user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Delete from auth.users cascades to profiles etc.
    DELETE FROM auth.users WHERE id = _target_user_id;
END;
$$;

-- Admin function to list all groups
CREATE OR REPLACE FUNCTION public.admin_get_all_groups()
RETURNS TABLE (
    group_id uuid,
    name text,
    description text,
    owner_id uuid,
    owner_name text,
    member_count bigint,
    file_count bigint,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        g.id AS group_id,
        g.name,
        g.description,
        g.owner_id,
        COALESCE(p.display_name, 'Unknown') AS owner_name,
        (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id) AS member_count,
        (SELECT COUNT(*) FROM public.group_files gf WHERE gf.group_id = g.id) AS file_count,
        g.created_at
    FROM public.groups g
    LEFT JOIN public.profiles p ON p.user_id = g.owner_id
    ORDER BY g.created_at DESC;
END;
$$;

-- Admin function to delete a group and its data
CREATE OR REPLACE FUNCTION public.admin_delete_group(_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    DELETE FROM public.group_messages WHERE group_id = _group_id;
    DELETE FROM public.group_files WHERE group_id = _group_id;
    DELETE FROM public.group_members WHERE group_id = _group_id;
    DELETE FROM public.groups WHERE id = _group_id;
END;
$$;

-- Admin stats function
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS TABLE (
    total_users bigint,
    total_groups bigint,
    total_files bigint,
    total_notices bigint,
    total_quizzes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM auth.users)::bigint AS total_users,
        (SELECT COUNT(*) FROM public.groups)::bigint AS total_groups,
        (SELECT COUNT(*) FROM public.group_files)::bigint AS total_files,
        (SELECT COUNT(*) FROM public.university_notices)::bigint AS total_notices,
        (SELECT COUNT(*) FROM public.quiz_results)::bigint AS total_quizzes;
END;
$$;
