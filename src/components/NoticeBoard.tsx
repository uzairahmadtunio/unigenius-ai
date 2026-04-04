import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, AlertTriangle, Calendar, GraduationCap, Info, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const categoryIcons: Record<string, any> = {
  fee: AlertTriangle,
  exam: Calendar,
  academic: GraduationCap,
  event: PartyPopper,
  general: Info,
};

const priorityStyles: Record<string, string> = {
  urgent: "border-l-4 border-l-destructive bg-destructive/5",
  high: "border-l-4 border-l-amber-500 bg-amber-500/5",
  normal: "border-l-4 border-l-primary/40",
};

const NoticeBoard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notices = [] } = useQuery({
    queryKey: ["university-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("university_notices" as any)
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const { data: readIds = new Set<string>() } = useQuery({
    queryKey: ["notice-reads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: reads } = await supabase
        .from("user_notice_reads" as any)
        .select("notice_id")
        .eq("user_id", user!.id);
      return new Set((reads || []).map((r: any) => r.notice_id));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const dismissNotice = async (noticeId: string) => {
    if (!user) return;
    // Optimistic update
    queryClient.setQueryData(["notice-reads", user.id], (old: Set<string> | undefined) => {
      const next = new Set(old);
      next.add(noticeId);
      return next;
    });
    await supabase.from("user_notice_reads" as any).insert({
      user_id: user.id,
      notice_id: noticeId,
    });
  };

  const activeNotices = notices.filter(
    (n: any) => !readIds.has(n.id) && (!n.expires_at || new Date(n.expires_at) > new Date())
  );

  if (activeNotices.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary" /> University Notices
      </h2>
      <AnimatePresence>
        {activeNotices.slice(0, 3).map((notice: any) => {
          const Icon = categoryIcons[notice.category] || Info;
          return (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              layout
            >
              <Card className={`glass border-border/30 ${priorityStyles[notice.priority] || ""}`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-foreground truncate">{notice.title}</p>
                      {notice.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notice.content}</p>
                  </div>
                  {user && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg w-6 h-6 flex-shrink-0"
                      onClick={() => dismissNotice(notice.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NoticeBoard;
