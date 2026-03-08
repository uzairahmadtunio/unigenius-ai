import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trash2, Plus, Clock, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  refreshTrigger: number;
  subject?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ChatSidebar = ({ activeChatId, onSelectChat, onNewChat, refreshTrigger, subject, mobileOpen, onMobileClose }: ChatSidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const fetchSessions = async () => {
    if (!user) { setSessions([]); setLoading(false); return; }
    let query = supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (subject !== undefined) {
      if (subject) {
        query = query.eq("subject", subject);
      } else {
        query = query.is("subject", null);
      }
    }
    const { data, error } = await query;
    if (!error && data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [user, refreshTrigger]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("chat_sessions").delete().eq("id", chatId);
    if (error) { toast.error("Failed to delete chat"); return; }
    setSessions(prev => prev.filter(s => s.id !== chatId));
    if (activeChatId === chatId) onNewChat();
    toast.success("Chat deleted");
  };

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const saveTitle = async (chatId: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingId(null); return; }
    setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: trimmed } : s));
    setEditingId(null);
    const { error } = await supabase.from("chat_sessions").update({ title: trimmed }).eq("id", chatId);
    if (error) toast.error("Failed to rename chat");
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    onMobileClose?.();
  };

  const handleNewChat = () => {
    onNewChat();
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/30">
        <h3 className="font-display font-semibold text-sm text-foreground">Chat History</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7" onClick={handleNewChat}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          {/* Desktop collapse button */}
          <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7 hidden md:flex" onClick={() => setCollapsed(true)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          {/* Mobile close button */}
          {onMobileClose && (
            <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7 md:hidden" onClick={onMobileClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {!user && (
          <p className="text-xs text-muted-foreground text-center py-4">Sign in to save chats</p>
        )}
        {loading && user && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <AnimatePresence>
          {sessions.map(session => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => handleSelectChat(session.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2 group transition-colors ${
                activeChatId === session.id
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {editingId === session.id ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveTitle(session.id); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => saveTitle(session.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium w-full bg-background/60 border border-border/50 rounded-md px-1.5 py-0.5 outline-none focus:border-primary/50 text-foreground"
                  />
                ) : (
                  <p className="text-xs font-medium truncate">{session.title}</p>
                )}
                <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId === session.id ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); saveTitle(session.id); }}
                    className="p-1 rounded-lg hover:bg-primary/20 hover:text-primary"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => startEditing(e, session)}
                    className="p-1 rounded-lg hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => deleteChat(e, session.id)}
                  className="p-1 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        {!loading && user && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No chats yet. Start a conversation!</p>
        )}
      </div>
    </>
  );

  // Desktop collapsed state
  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 hidden md:flex flex-col items-center py-4 gap-2 glass border-r border-border/30">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCollapsed(false)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleNewChat}>
          <Plus className="w-4 h-4" />
        </Button>
        <div className="w-6 h-px bg-border/50 my-1" />
        {sessions.slice(0, 8).map(s => (
          <button
            key={s.id}
            onClick={() => handleSelectChat(s.id)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              activeChatId === s.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="w-64 flex-shrink-0 hidden md:flex flex-col glass border-r border-border/30 overflow-hidden">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-card border-r border-border/50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;
