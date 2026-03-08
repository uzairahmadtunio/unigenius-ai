import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Copy, ArrowRight, LogIn, Crown, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  semester: number;
  created_at: string;
  avatar_url: string | null;
  member_count?: number;
  is_owner?: boolean;
}

const GroupAvatar = ({ url, name, size = "md" }: { url?: string | null; name?: string; size?: "sm" | "md" }) => {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10" };
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-primary-foreground text-sm">
          {(name || "G")[0].toUpperCase()}
        </span>
      )}
    </div>
  );
};

const GroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    // Get groups user is member of
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      // Also check owned groups
      const { data: owned } = await supabase
        .from("groups")
        .select("*")
        .eq("owner_id", user.id);
      setGroups((owned as Group[]) || []);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map(m => m.group_id);
    const { data } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds);

    // Also get owned groups not yet in memberships
    const { data: owned } = await supabase
      .from("groups")
      .select("*")
      .eq("owner_id", user.id);

    const allGroups = new Map<string, Group>();
    (data || []).forEach((g: any) => allGroups.set(g.id, { ...g, is_owner: g.owner_id === user.id }));
    (owned || []).forEach((g: any) => allGroups.set(g.id, { ...g, is_owner: true }));

    // Get member counts
    const ids = Array.from(allGroups.keys());
    for (const gId of ids) {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", gId);
      const g = allGroups.get(gId)!;
      g.member_count = count || 0;
    }

    setGroups(Array.from(allGroups.values()));
    setLoading(false);
  };

  const createGroup = async () => {
    if (!user || !newName.trim()) { toast.error("Enter a group name"); return; }
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: newName.trim(), description: newDesc.trim() || null, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Add owner as member
      await supabase.from("group_members").insert({
        group_id: (data as any).id,
        user_id: user.id,
        role: "owner",
      });

      toast.success("Group created!");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      fetchGroups();
    } catch (e: any) {
      toast.error(e.message || "Failed to create group");
    }
  };

  const joinByCode = async () => {
    if (!user || !inviteSearch.trim()) { toast.error("Enter an invite code"); return; }
    setJoining(true);
    try {
      const { data: group, error: findErr } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", inviteSearch.trim().toLowerCase())
        .single();
      if (findErr || !group) throw new Error("Invalid invite code");

      const { error: joinErr } = await supabase.from("group_members").insert({
        group_id: (group as any).id,
        user_id: user.id,
        role: "member",
      });
      if (joinErr) {
        if (joinErr.message.includes("duplicate")) {
          toast.info("You're already a member!");
        } else {
          throw joinErr;
        }
      } else {
        toast.success(`Joined "${(group as any).name}"!`);
      }
      setJoinOpen(false);
      setInviteSearch("");
      fetchGroups();
    } catch (e: any) {
      toast.error(e.message || "Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  if (!user) {
    return (
      <PageShell
        title="Group Projects"
        subtitle="Collaborate with classmates"
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Users className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-foreground font-display font-semibold">Sign in to collaborate</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Group Projects"
      subtitle="Collaborate with classmates"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Users className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gradient-primary text-primary-foreground gap-2">
                <Plus className="w-4 h-4" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Group name (e.g., FYP Team Alpha)" value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl" />
                <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="rounded-xl" rows={2} />
                <Button onClick={createGroup} className="w-full rounded-xl gradient-primary text-primary-foreground">Create Group</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2">
                <LogIn className="w-4 h-4" /> Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50">
              <DialogHeader>
                <DialogTitle className="font-display">Join a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Enter invite code (e.g., a1b2c3d4)" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} className="rounded-xl" />
                <Button onClick={joinByCode} disabled={joining} className="w-full rounded-xl gradient-primary text-primary-foreground">
                  {joining ? "Joining..." : "Join Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-4">
            <Users className="w-16 h-16 text-muted-foreground/20 mx-auto" />
            <p className="font-display font-semibold text-foreground">No groups yet</p>
            <p className="text-sm text-muted-foreground">Create a group or join one with an invite code.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groups.map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="glass rounded-2xl p-5 cursor-pointer hover:border-primary/30 border-2 border-transparent transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <GroupAvatar url={g.avatar_url} name={g.name} />
                    {g.is_owner && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        <Crown className="w-2.5 h-2.5" /> Owner
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-foreground truncate">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {g.member_count || 1}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); copyInviteCode(g.invite_code); }}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        title="Copy invite code"
                      >
                        <Hash className="w-3 h-3" /> {g.invite_code}
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default GroupsPage;
