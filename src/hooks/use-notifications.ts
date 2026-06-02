import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  type: "study_reminder" | "streak" | "quiz" | "assignment" | "teacher" | "system";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any) || [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = (query.data || []).filter((n) => !n.read_at).map((n) => n.id);
    if (!unread.length) return;
    qc.setQueryData<Notification[]>(["notifications", user.id], (old) =>
      (old || []).map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    await supabase
      .from("notifications" as any)
      .update({ read_at: new Date().toISOString() } as any)
      .in("id", unread);
  };

  const remove = async (id: string) => {
    if (!user) return;
    qc.setQueryData<Notification[]>(["notifications", user.id], (old) => (old || []).filter((n) => n.id !== id));
    await supabase.from("notifications" as any).delete().eq("id", id);
  };

  const unreadCount = (query.data || []).filter((n) => !n.read_at).length;

  return { notifications: query.data || [], loading: query.isLoading, unreadCount, markAllRead, remove };
};
