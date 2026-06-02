import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, Check, Loader2, FileText, Brain, GraduationCap, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type EventType = "assignment" | "quiz" | "midterm" | "final" | "viva" | "other";

interface SemEvent {
  id: string;
  title: string;
  subject: string | null;
  event_type: EventType;
  event_date: string;
  event_time: string | null;
  notes: string | null;
  completed: boolean;
}

const typeMeta: Record<EventType, { icon: any; color: string; label: string }> = {
  assignment: { icon: FileText, color: "from-blue-500 to-indigo-500", label: "Assignment" },
  quiz: { icon: Brain, color: "from-violet-500 to-purple-500", label: "Quiz" },
  midterm: { icon: BookOpen, color: "from-amber-500 to-orange-500", label: "Midterm" },
  final: { icon: GraduationCap, color: "from-rose-500 to-red-500", label: "Final" },
  viva: { icon: MessageSquare, color: "from-emerald-500 to-teal-500", label: "Viva" },
  other: { icon: Sparkles, color: "from-slate-500 to-gray-500", label: "Other" },
};

const CalendarPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "all" | "done">("upcoming");

  // form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<EventType>("assignment");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("semester_events" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("event_date", { ascending: true });
    setEvents((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const reset = () => {
    setTitle(""); setSubject(""); setType("assignment"); setDate(""); setTime(""); setNotes("");
  };

  const save = async () => {
    if (!user || !title || !date) {
      toast.error("Title and date required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("semester_events" as any).insert({
      user_id: user.id,
      title, subject: subject || null, event_type: type,
      event_date: date, event_time: time || null, notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Couldn't save event"); return; }
    toast.success("Event added!");
    setOpen(false); reset(); load();
  };

  const toggleDone = async (e: SemEvent) => {
    setEvents((prev) => prev.map((x) => x.id === e.id ? { ...x, completed: !x.completed } : x));
    await supabase.from("semester_events" as any).update({ completed: !e.completed } as any).eq("id", e.id);
  };

  const remove = async (id: string) => {
    setEvents((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("semester_events" as any).delete().eq("id", id);
    toast.success("Deleted");
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = events.filter((e) => {
    if (filter === "done") return e.completed;
    if (filter === "upcoming") return !e.completed && e.event_date >= today;
    return true;
  });

  return (
    <PageShell
      title="Semester Calendar"
      subtitle="Track assignments, quizzes, exams & viva"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            {(["upcoming", "all", "done"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="rounded-xl capitalize">
                {f}
              </Button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gradient-primary text-primary-foreground gap-2">
                <Plus className="w-4 h-4" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader><DialogTitle>New Calendar Event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title (e.g., OOP Assignment 2)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
                <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" />
                <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(typeMeta) as EventType[]).map((t) => (
                      <SelectItem key={t} value={t}>{typeMeta[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
                </div>
                <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
                <Button onClick={save} disabled={saving} className="w-full rounded-xl gradient-primary text-primary-foreground">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-display font-semibold text-foreground">No events</p>
            <p className="text-xs text-muted-foreground">Add deadlines, quizzes, midterms, finals & vivas to stay on track.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e, idx) => {
              const m = typeMeta[e.event_type];
              const Icon = m.icon;
              const daysLeft = Math.ceil((new Date(e.event_date).getTime() - Date.now()) / 86400000);
              const urgent = !e.completed && daysLeft >= 0 && daysLeft <= 3;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn("glass rounded-2xl p-4 flex items-center gap-3", e.completed && "opacity-60")}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("font-semibold text-sm text-foreground truncate", e.completed && "line-through")}>{e.title}</p>
                      {urgent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">{daysLeft === 0 ? "TODAY" : `${daysLeft}d left`}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.label}{e.subject ? ` · ${e.subject}` : ""} · {new Date(e.event_date).toLocaleDateString()}{e.event_time ? ` ${e.event_time.slice(0,5)}` : ""}
                    </p>
                    {e.notes && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{e.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => toggleDone(e)}>
                    <Check className={cn("w-4 h-4", e.completed && "text-emerald-500")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-xl shrink-0 text-destructive" onClick={() => remove(e.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default CalendarPage;
