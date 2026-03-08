import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trash2, Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";
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
}

const ChatSidebar = ({ activeChatId, onSelectChat, onNewChat, refreshTrigger }: ChatSidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSessions = async () => {
    if (!user) { setSessions([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error && data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [user, refreshTrigger]);

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("chat_sessions").delete().eq("id", chatId);
    if (error) { toast.error("Failed to delete chat"); return; }
    setSessions(prev => prev.filter(s => s.id !== chatId));
    if (activeChatId === chatId) onNewChat();
    toast.success("Chat deleted");
  };

  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 flex flex-col items-center py-4 gap-2 glass border-r border-border/30">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCollapsed(false)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onNewChat}>
          <Plus className="w-4 h-4" />
        </Button>
        <div className="w-6 h-px bg-border/50 my-1" />
        {sessions.slice(0, 8).map(s => (
          <button
            key={s.id}
            onClick={() => onSelectChat(s.id)}
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
    <div className="w-64 flex-shrink-0 flex flex-col glass border-r border-border/30 overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/30">
        <h3 className="font-display font-semibold text-sm text-foreground">Chat History</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7" onClick={onNewChat}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7" onClick={() => setCollapsed(true)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
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
              onClick={() => onSelectChat(session.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2 group transition-colors ${
                activeChatId === session.id
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.title}</p>
                <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={(e) => deleteChat(e, session.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.button>
          ))}
        </AnimatePresence>
        {!loading && user && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No chats yet. Start a conversation!</p>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
