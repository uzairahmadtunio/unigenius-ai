
-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'student',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: students see own, admins see all
CREATE POLICY "Students can view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can update own tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Messages: ticket owner + admins
CREATE POLICY "Ticket owner can view messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Ticket owner can send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  );
CREATE POLICY "Admins can update messages" ON public.support_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Function for admin to get all tickets with user info
CREATE OR REPLACE FUNCTION public.admin_get_support_tickets()
RETURNS TABLE(
  ticket_id UUID,
  user_id UUID,
  subject TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  unread_count BIGINT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
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
    t.id AS ticket_id,
    t.user_id,
    t.subject,
    t.status,
    t.created_at,
    t.updated_at,
    COALESCE(p.display_name, 'Unknown') AS user_name,
    u.email::text AS user_email,
    p.avatar_url AS user_avatar,
    (SELECT COUNT(*) FROM public.support_messages sm WHERE sm.ticket_id = t.id AND sm.is_read = false AND sm.sender_role = 'student')::bigint AS unread_count,
    (SELECT sm2.message FROM public.support_messages sm2 WHERE sm2.ticket_id = t.id ORDER BY sm2.created_at DESC LIMIT 1) AS last_message,
    (SELECT sm3.created_at FROM public.support_messages sm3 WHERE sm3.ticket_id = t.id ORDER BY sm3.created_at DESC LIMIT 1) AS last_message_at
  FROM public.support_tickets t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  LEFT JOIN auth.users u ON u.id = t.user_id
  ORDER BY t.updated_at DESC;
END;
$$;
