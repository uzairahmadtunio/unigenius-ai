import { useState, useEffect, useRef } from "react";
import { MessageCircleQuestion, Send, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const SupportChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unreadAdmin, setUnreadAdmin] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find or create ticket
  useEffect(() => {
    if (!user || !open) return;
    const init = async () => {
      const { data: existing } = await supabase
        .from("support_tickets" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        setTicketId((existing[0] as any).id);
      }
    };
    init();
  }, [user, open]);

  // Fetch messages when ticket changes
  useEffect(() => {
    if (!ticketId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("support_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Mark admin messages as read
      await (supabase.from("support_messages" as any) as any)
        .update({ is_read: true })
        .eq("ticket_id", ticketId)
        .eq("sender_role", "admin")
        .eq("is_read", false);
      setUnreadAdmin(0);
    };
    fetch();
  }, [ticketId]);

  // Realtime subscription
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if ((payload.new as any).sender_role === "admin" && !open) {
          setUnreadAdmin((c) => c + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, open]);

  // Check for unread admin replies on mount
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: tickets } = await supabase
        .from("support_tickets" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "open");
      if (!tickets || tickets.length === 0) return;
      const tid = (tickets[0] as any).id;
      setTicketId(tid);
      const { count } = await supabase
        .from("support_messages" as any)
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", tid)
        .eq("sender_role", "admin")
        .eq("is_read", false);
      setUnreadAdmin(count || 0);
    };
    check();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    let tid = ticketId;

    if (!tid) {
      const { data } = await (supabase.from("support_tickets" as any) as any)
        .insert({ user_id: user.id, subject: "Help Request" })
        .select("id")
        .single();
      if (data) {
        tid = data.id;
        setTicketId(data.id);
      }
    }

    if (tid) {
      await (supabase.from("support_messages" as any) as any)
        .insert({
          ticket_id: tid,
          sender_id: user.id,
          sender_role: "student",
          message: message.trim(),
        });
      // Update ticket timestamp
      await (supabase.from("support_tickets" as any) as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", tid);
    }
    setMessage("");
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-24 md:bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              className="rounded-full w-14 h-14 shadow-lg gradient-primary relative"
              size="icon"
            >
              <MessageCircleQuestion className="w-6 h-6" />
              {unreadAdmin > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadAdmin}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "480px" }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircleQuestion className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">Help Desk</p>
                  <p className="text-[10px] text-muted-foreground">Chat with Admin • Usually replies fast</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircleQuestion className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">Koi bhi sawal poochein!</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Admin jaldi reply karega 🚀</p>
                </div>
              )}
              {messages.map((m: any) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_role === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                      m.sender_role === "student"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.sender_role === "admin" && (
                      <p className="text-[9px] font-bold text-primary mb-0.5">🛡️ Admin</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    <p className={`text-[9px] mt-1 ${m.sender_role === "student" ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                      {new Date(m.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Apna message likhein..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl min-h-[40px] max-h-[80px] resize-none text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  size="icon"
                  className="rounded-xl shrink-0 self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatWidget;
