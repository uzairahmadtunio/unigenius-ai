import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, Edit2, Megaphone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const categories = ["general", "fee", "exam", "academic", "event"];
const priorities = ["normal", "high", "urgent"];

const AdminDashboard = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [notices, setNotices] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("university_notices" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setNotices(data || []);
  };

  useEffect(() => {
    if (isAdmin) fetchNotices();
  }, [isAdmin]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("general");
    setPriority("normal");
    setEditId(null);
    setFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    if (editId) {
      await (supabase.from("university_notices" as any) as any)
        .update({ title, content, category, priority })
        .eq("id", editId);
      toast.success("Notice updated successfully!");
    } else {
      await (supabase.from("university_notices" as any) as any)
        .insert({ title, content, category, priority });
      toast.success("🎉 Official Notice Live!", {
        description: "Your notice is now visible to all students.",
      });
    }

    setSubmitting(false);
    resetForm();
    fetchNotices();
  };

  const handleEdit = (notice: any) => {
    setEditId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setCategory(notice.category);
    setPriority(notice.priority);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("university_notices" as any) as any).delete().eq("id", id);
    toast.success("Notice deleted.");
    fetchNotices();
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const priorityColor: Record<string, string> = {
    urgent: "destructive",
    high: "secondary",
    normal: "outline",
  };

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage University of Larkana notices</p>
            </div>
          </div>

          <Dialog open={formOpen} onOpenChange={(o) => { if (!o) resetForm(); else setFormOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" /> Post Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">{editId ? "Edit Notice" : "Post New Notice"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Notice Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="rounded-xl"
                />
                <Textarea
                  placeholder="Notice message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="rounded-xl min-h-[100px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                  {submitting ? "Posting..." : editId ? "Update Notice" : "🚀 Publish Notice"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Notices List */}
        <div className="space-y-3">
          {notices.length === 0 ? (
            <Card className="glass border-border/30">
              <CardContent className="p-8 text-center">
                <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No notices posted yet. Click "Post Notice" to create one.</p>
              </CardContent>
            </Card>
          ) : (
            notices.map((notice: any, i: number) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="glass border-border/30">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground">{notice.title}</p>
                        <Badge variant={priorityColor[notice.priority] as any} className="text-[10px] capitalize">
                          {notice.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {notice.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{notice.content}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(notice.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8" onClick={() => handleEdit(notice)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-destructive" onClick={() => handleDelete(notice.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
