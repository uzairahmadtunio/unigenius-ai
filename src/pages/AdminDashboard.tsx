import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Users, Megaphone, BarChart3, Radio, FolderOpen,
  Plus, Trash2, Edit2, UserX, Search, AlertTriangle, X,
  Headset, Send, CheckCircle2, MessageCircle, CreditCard, Eye, XCircle,
  Tag, ToggleLeft, ToggleRight, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const categories = ["general", "fee", "exam", "academic", "event"];
const priorities = ["normal", "high", "urgent"];

type AdminTab = "overview" | "users" | "notices" | "groups" | "alerts" | "support" | "payments";

const tabItems = [
  { id: "overview" as AdminTab, label: "Overview", icon: BarChart3 },
  { id: "users" as AdminTab, label: "Users", icon: Users },
  { id: "notices" as AdminTab, label: "Notices", icon: Megaphone },
  { id: "groups" as AdminTab, label: "Groups", icon: FolderOpen },
  { id: "alerts" as AdminTab, label: "Global Alerts", icon: Radio },
  { id: "support" as AdminTab, label: "Support Inbox", icon: Headset },
  { id: "payments" as AdminTab, label: "Payments", icon: CreditCard },
];

const AdminDashboard = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [supportUnread, setSupportUnread] = useState(0);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  // Fetch unread support count
  useEffect(() => {
    if (!isAdmin) return;
    const fetchUnread = async () => {
      const { data } = await supabase.rpc("admin_get_support_tickets" as any);
      const total = (data || []).reduce((sum: number, t: any) => sum + (t.unread_count || 0), 0);
      setSupportUnread(total);
    };
    fetchUnread();
    const channel = supabase
      .channel("admin-support-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => {
        fetchUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-foreground">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">God Mode • UoL</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "support" && supportUnread > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {supportUnread > 9 ? "9+" : supportUnread}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs" onClick={() => navigate("/")}>
            ← Back to App
          </Button>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card flex">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors relative ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "support" && supportUnread > 0 && (
              <span className="absolute top-1 right-1/4 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {supportUnread > 9 ? "+" : supportUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold text-foreground">Admin</h1>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => navigate("/")}>
              ← App
            </Button>
          </div>

          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "notices" && <NoticesTab />}
          {activeTab === "groups" && <GroupsTab />}
          {activeTab === "alerts" && <GlobalAlertsTab />}
          {activeTab === "support" && <SupportTab />}
          {activeTab === "payments" && <PaymentsTab />}
        </div>
      </main>
    </div>
  );
};

/* ===== OVERVIEW TAB ===== */
const OverviewTab = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    supabase.rpc("admin_get_stats").then(({ data }) => {
      if (data && data.length > 0) setStats(data[0]);
    });
  }, []);

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-400" },
        { label: "Total Groups", value: stats.total_groups, icon: FolderOpen, color: "text-emerald-400" },
        { label: "Files Uploaded", value: stats.total_files, icon: BarChart3, color: "text-amber-400" },
        { label: "Notices Posted", value: stats.total_notices, icon: Megaphone, color: "text-purple-400" },
        { label: "Quizzes Taken", value: stats.total_quizzes, icon: Shield, color: "text-rose-400" },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">System Overview</h2>
        <p className="text-xs text-muted-foreground">University of Larkana — UniGenius AI Platform</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <Card key={s.label} className="border-border/30 bg-card">
              <CardContent className="p-4 text-center">
                <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading statistics...</div>
      )}

      <Card className="border-border/30 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {[65, 40, 85, 55, 70, 90, 45].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary/60 transition-all"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ===== USERS TAB ===== */
const UsersTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data } = await supabase.rpc("admin_get_all_users");
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("admin_delete_user", { _target_user_id: deleteTarget.user_id });
    if (error) {
      toast.error("Failed to delete user: " + error.message);
    } else {
      toast.success(`User ${deleteTarget.display_name || deleteTarget.email} removed.`);
      fetchUsers();
    }
    setDeleteTarget(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.roll_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground">{users.length} registered students</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or roll number..."
          className="pl-9 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading users...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.user_id} className="border-border/30 bg-card">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-border">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.display_name || "No Name"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{u.email}</span>
                    {u.roll_number && <><span>•</span><span>{u.roll_number}</span></>}
                    {u.current_semester && <><span>•</span><span>Sem {u.current_semester}</span></>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg w-8 h-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(u)}
                >
                  <UserX className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No users found.</p>
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget?.display_name || deleteTarget?.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete}>Delete Permanently</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

/* ===== NOTICES TAB ===== */
const NoticesTab = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("university_notices")
      .select("*")
      .order("created_at", { ascending: false });
    setNotices(data || []);
  };

  useEffect(() => { fetchNotices(); }, []);

  const resetForm = () => {
    setTitle(""); setContent(""); setCategory("general"); setPriority("normal");
    setEditId(null); setFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    if (editId) {
      await supabase.from("university_notices").update({ title, content, category, priority } as any).eq("id", editId);
      toast.success("Notice updated!");
    } else {
      await supabase.from("university_notices").insert({ title, content, category, priority } as any);
      toast.success("🎉 Official Notice Live!", { description: "Now visible to all students." });
    }

    setSubmitting(false);
    resetForm();
    fetchNotices();
  };

  const handleEdit = (n: any) => {
    setEditId(n.id); setTitle(n.title); setContent(n.content);
    setCategory(n.category); setPriority(n.priority); setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("university_notices").delete().eq("id", id);
    toast.success("Notice deleted.");
    fetchNotices();
  };

  const priorityColor: Record<string, string> = { urgent: "destructive", high: "secondary", normal: "outline" };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Notice Board Manager</h2>
          <p className="text-xs text-muted-foreground">{notices.length} notices posted</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> New Notice
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editId ? "Edit Notice" : "Post New Notice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Notice Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
            <Textarea placeholder="Notice message..." value={content} onChange={(e) => setContent(e.target.value)} required className="rounded-xl min-h-[100px]" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
              {submitting ? "Posting..." : editId ? "Update Notice" : "🚀 Publish Notice"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {notices.length === 0 ? (
          <Card className="border-border/30 bg-card">
            <CardContent className="p-8 text-center">
              <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No notices yet. Post your first one!</p>
            </CardContent>
          </Card>
        ) : (
          notices.map((n: any, i: number) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-border/30 bg-card">
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{n.title}</p>
                      <Badge variant={priorityColor[n.priority] as any} className="text-[9px] capitalize">{n.priority}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{n.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="rounded-lg w-7 h-7" onClick={() => handleEdit(n)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg w-7 h-7 text-destructive" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

/* ===== GROUPS TAB ===== */
const GroupsTab = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchGroups = async () => {
    const { data } = await supabase.rpc("admin_get_all_groups");
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("admin_delete_group", { _group_id: deleteTarget.group_id });
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`Group "${deleteTarget.name}" deleted.`);
      fetchGroups();
    }
    setDeleteTarget(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Group & Project Control</h2>
        <p className="text-xs text-muted-foreground">{groups.length} groups created</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading groups...</div>
      ) : groups.length === 0 ? (
        <Card className="border-border/30 bg-card">
          <CardContent className="p-8 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No groups created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g: any) => (
            <Card key={g.group_id} className="border-border/30 bg-card">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{g.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span>Owner: {g.owner_name}</span>
                    <span>•</span>
                    <span>{g.member_count} members</span>
                    <span>•</span>
                    <span>{g.file_count} files</span>
                  </div>
                  {g.description && <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{g.description}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg w-8 h-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(g)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Group
            </DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? All messages, files, and members will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete}>Delete Group</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

/* ===== GLOBAL ALERTS TAB ===== */
const GlobalAlertsTab = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from("global_alerts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setAlerts(data || []);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    await (supabase.from("global_alerts" as any) as any).update({ is_active: false }).eq("is_active", true);
    await (supabase.from("global_alerts" as any) as any).insert({ message, alert_type: alertType, is_active: true });
    toast.success("🚨 Global Alert Live!", { description: "All users will see this banner." });
    setMessage("");
    setSubmitting(false);
    fetchAlerts();
  };

  const handleDeactivate = async (id: string) => {
    await (supabase.from("global_alerts" as any) as any).update({ is_active: false }).eq("id", id);
    toast.success("Alert deactivated.");
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("global_alerts" as any) as any).delete().eq("id", id);
    toast.success("Alert deleted.");
    fetchAlerts();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Global Broadcast</h2>
        <p className="text-xs text-muted-foreground">Send a banner message to every user's screen</p>
      </div>

      <Card className="border-border/30 bg-card">
        <CardContent className="p-4">
          <form onSubmit={handlePost} className="space-y-3">
            <Textarea
              placeholder='e.g. "Server Maintenance at 10 PM tonight"'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="rounded-xl min-h-[80px]"
            />
            <div className="flex items-center gap-3">
              <Select value={alertType} onValueChange={setAlertType}>
                <SelectTrigger className="rounded-xl w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="critical">🚨 Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="rounded-xl flex-1" disabled={submitting}>
                {submitting ? "Broadcasting..." : "📡 Broadcast to All Users"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Alert History</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No alerts sent yet.</p>
        ) : (
          alerts.map((a: any) => (
            <Card key={a.id} className={`border-border/30 ${a.is_active ? "border-l-4 border-l-primary bg-primary/5" : "bg-card"}`}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">{a.message}</p>
                    {a.is_active && <Badge className="text-[9px]">LIVE</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(a.created_at).toLocaleString("en-PK")} • {a.alert_type}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {a.is_active && (
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => handleDeactivate(a.id)}>
                      Deactivate
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="rounded-lg w-7 h-7 text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
};

/* ===== SUPPORT INBOX TAB ===== */
const SupportTab = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    const { data } = await supabase.rpc("admin_get_support_tickets" as any);
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  // Realtime for new messages
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        if (selectedTicket && (payload.new as any).ticket_id === selectedTicket.ticket_id) {
          setMessages((prev) => [...prev, payload.new]);
        }
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase
      .from("support_messages" as any)
      .select("*")
      .eq("ticket_id", ticket.ticket_id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark student messages as read
    await (supabase.from("support_messages" as any) as any)
      .update({ is_read: true })
      .eq("ticket_id", ticket.ticket_id)
      .eq("sender_role", "student")
      .eq("is_read", false);
    fetchTickets();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSending(true);
    await (supabase.from("support_messages" as any) as any).insert({
      ticket_id: selectedTicket.ticket_id,
      sender_id: user.id,
      sender_role: "admin",
      message: reply.trim(),
    });
    await (supabase.from("support_tickets" as any) as any)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.ticket_id);
    setReply("");
    setSending(false);
  };

  const handleResolve = async (ticketId: string) => {
    await (supabase.from("support_tickets" as any) as any)
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    toast.success("✅ Ticket marked as resolved!");
    if (selectedTicket?.ticket_id === ticketId) {
      setSelectedTicket(null);
      setMessages([]);
    }
    fetchTickets();
  };

  const filteredTickets = tickets.filter((t: any) => {
    if (filter === "open") return t.status === "open";
    if (filter === "closed") return t.status === "closed";
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Support Inbox</h2>
          <p className="text-xs text-muted-foreground">{tickets.filter((t: any) => t.status === "open").length} open tickets</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="rounded-xl w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "500px" }}>
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-2 overflow-y-auto max-h-[600px]">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <Card className="border-border/30 bg-card">
              <CardContent className="p-8 text-center">
                <Headset className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No support tickets yet</p>
              </CardContent>
            </Card>
          ) : (
            filteredTickets.map((t: any) => (
              <Card
                key={t.ticket_id}
                className={`border-border/30 cursor-pointer transition-colors hover:bg-muted/30 ${
                  selectedTicket?.ticket_id === t.ticket_id ? "border-primary bg-primary/5" : "bg-card"
                }`}
                onClick={() => openTicket(t)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-7 h-7 border border-border">
                      <AvatarImage src={t.user_avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {(t.user_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.user_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.user_email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {t.unread_count}
                        </span>
                      )}
                      <Badge variant={t.status === "open" ? "default" : "secondary"} className="text-[9px]">
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                  {t.last_message && (
                    <p className="text-[11px] text-muted-foreground truncate mt-1 pl-9">{t.last_message}</p>
                  )}
                  {t.last_message_at && (
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5 pl-9">
                      {new Date(t.last_message_at).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-3 border border-border rounded-2xl bg-card flex flex-col overflow-hidden">
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a ticket to view conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={selectedTicket.user_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {(selectedTicket.user_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedTicket.user_name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedTicket.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => handleResolve(selectedTicket.ticket_id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8" onClick={() => { setSelectedTicket(null); setMessages([]); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "380px" }}>
                {messages.map((m: any) => (
                  <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                        m.sender_role === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.sender_role === "student" && (
                        <p className="text-[9px] font-bold text-primary mb-0.5">👤 Student</p>
                      )}
                      {m.sender_role === "admin" && (
                        <p className="text-[9px] font-bold text-primary-foreground/70 mb-0.5">🛡️ You</p>
                      )}
                      <p className="whitespace-pre-wrap">{m.message}</p>
                      <p className={`text-[9px] mt-1 ${m.sender_role === "admin" ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                        {new Date(m.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              {selectedTicket.status === "open" && (
                <div className="p-3 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="rounded-xl min-h-[40px] max-h-[80px] resize-none text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReply();
                        }
                      }}
                    />
                    <Button onClick={handleReply} disabled={!reply.trim() || sending} size="icon" className="rounded-xl shrink-0 self-end">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {selectedTicket.status === "closed" && (
                <div className="p-3 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">✅ This ticket has been resolved</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ===== PAYMENTS TAB ===== */
const PaymentsTab = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchRequests = async () => {
    const { data } = await supabase.rpc("admin_get_payment_requests" as any);
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const note = action === "reject" ? prompt("Rejection reason (optional):") : null;
    await supabase.rpc("admin_handle_payment" as any, {
      _request_id: id,
      _action: action,
      _note: note || null,
    });
    toast.success(action === "approve" ? "✅ Payment approved! User is now Pro." : "❌ Payment rejected.");
    fetchRequests();
  };

  const filtered = requests.filter((r: any) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Payment Approvals</h2>
          <p className="text-xs text-muted-foreground">{pendingCount} pending requests</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading payment requests...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/30 bg-card">
          <CardContent className="p-8 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No {filter !== "all" ? filter : ""} payment requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <Card key={r.id} className={`border-border/30 ${r.status === "pending" ? "border-l-4 border-l-amber-500" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={r.user_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {(r.user_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{r.user_name}</p>
                      <Badge
                        variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                        className="text-[9px]"
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{r.user_email}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="capitalize">{r.payment_method}</span>
                      <span>•</span>
                      <span>PKR {r.amount}</span>
                      <span>•</span>
                      <span>{new Date(r.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}</span>
                    </div>
                    {r.admin_note && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 italic">Note: {r.admin_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg w-8 h-8"
                      onClick={() => setPreviewUrl(r.screenshot_url)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {r.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => handleAction(r.id, "approve")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleAction(r.id, "reject")}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Screenshot Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Payment screenshot"
              className="w-full rounded-xl border border-border"
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminDashboard;
