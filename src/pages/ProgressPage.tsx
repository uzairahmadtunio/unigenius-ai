import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Clock, BookOpen, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Session {
  id: string;
  subject: string;
  duration_minutes: number;
  studied_at: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#14b8a6"];

const ProgressPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("30");

  const subjects = department ? getSubjects(department, semester) : [];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("study_sessions" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("studied_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setSessions((data as any) || []);
        setLoading(false);
      });
  }, [user]);

  const addSession = async () => {
    if (!user || !subject || !duration) {
      toast.error("Pick a subject and duration");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("study_sessions" as any)
      .insert({ user_id: user.id, subject, duration_minutes: parseInt(duration, 10) } as any)
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast.error("Couldn't save session");
      return;
    }
    setSessions((prev) => [data as any, ...prev]);
    toast.success("Session logged!");
    setSubject("");
    setDuration("30");
  };

  // Aggregations
  const last7DaysData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const mins = sessions
        .filter((s) => {
          const t = new Date(s.studied_at);
          return t >= d && t < next;
        })
        .reduce((a, b) => a + b.duration_minutes, 0);
      return {
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        hours: +(mins / 60).toFixed(1),
      };
    });
  }, [sessions]);

  const bySubject = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => map.set(s.subject, (map.get(s.subject) || 0) + s.duration_minutes));
    return Array.from(map.entries()).map(([name, mins]) => ({ name, value: +(mins / 60).toFixed(1) }));
  }, [sessions]);

  const totalHours = useMemo(
    () => +(sessions.reduce((a, b) => a + b.duration_minutes, 0) / 60).toFixed(1),
    [sessions]
  );
  const weekHours = useMemo(() => last7DaysData.reduce((a, b) => a + b.hours, 0).toFixed(1), [last7DaysData]);

  // Subject progress %: target 20h per subject (semester goal)
  const subjectProgress = useMemo(() => {
    const target = 20;
    return subjects.map((s) => {
      const hours = (bySubject.find((b) => b.name === s.name)?.value as number) || 0;
      return { ...s, hours, pct: Math.min(100, Math.round((hours / target) * 100)) };
    });
  }, [subjects, bySubject]);

  return (
    <PageShell
      title="Progress Tracker"
      subtitle="Your study analytics & subject completion"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={Clock} label="Total Hours" value={`${totalHours}h`} gradient="from-violet-500 to-purple-500" />
          <StatCard icon={TrendingUp} label="This Week" value={`${weekHours}h`} gradient="from-emerald-500 to-teal-500" />
          <StatCard icon={BookOpen} label="Sessions" value={String(sessions.length)} gradient="from-amber-500 to-orange-500" />
        </div>

        {/* Log session */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-semibold text-foreground text-sm">Log a Study Session</h3>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground">Semester</label>
              <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">Minutes</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl" />
            </div>
            <Button onClick={addSession} disabled={adding} className="rounded-xl gradient-primary text-primary-foreground gap-2">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Log
            </Button>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="glass rounded-2xl p-4">
          <h3 className="font-display font-semibold text-foreground text-sm mb-3">Last 7 Days (hours)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By subject + Subject progress bars */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="font-display font-semibold text-foreground text-sm mb-3">Hours by Subject</h3>
            {bySubject.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Log a session to see breakdown</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bySubject} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => `${e.name}`}>
                      {bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="glass rounded-2xl p-4">
            <h3 className="font-display font-semibold text-foreground text-sm mb-3">Semester {semester} Completion</h3>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {subjectProgress.map((s) => (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground truncate">{s.icon} {s.name}</span>
                    <span className="text-muted-foreground">{s.hours}h / 20h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.8 }} className="h-full gradient-primary" />
                  </div>
                </div>
              ))}
              {subjectProgress.length === 0 && <p className="text-xs text-muted-foreground">No subjects</p>}
            </div>
          </div>
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground">Loading...</p>}
      </div>
    </PageShell>
  );
};

const StatCard = ({ icon: Icon, label, value, gradient }: any) => (
  <div className="glass rounded-2xl p-4">
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="text-2xl font-display font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default ProgressPage;
