import { useState, useEffect } from "react";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { authHeader } from "@/lib/auth-header";
import { CalendarDays, Sparkles, Loader2, RefreshCw, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import ThinkingAnimation from "@/components/ThinkingAnimation";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const PlannerPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(14);
  const [examDate, setExamDate] = useState("");
  const [schedule, setSchedule] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("current_semester").eq("user_id", user.id).single()
      .then(({ data }) => {
        if ((data as any)?.current_semester) setSemester((data as any).current_semester);
      });
    supabase.from("study_plans" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        const p: any = data;
        if (p) {
          setSemester(p.semester);
          setSelected(p.subjects || []);
          setWeeklyHours(p.weekly_hours || 14);
          setExamDate(p.exam_date || "");
          setSchedule(p.schedule || "");
        }
      });
  }, [user]);

  const subjects = department ? getSubjects(department, semester) : [];

  // auto-select all subjects when semester changes & none selected
  useEffect(() => {
    if (subjects.length && selected.length === 0) {
      setSelected(subjects.map((s) => s.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  const toggle = (name: string) =>
    setSelected((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const generatePlan = async () => {
    if (!selected.length) {
      toast.error("Pick at least one subject");
      return;
    }
    setLoading(true);
    setSchedule("");

    const examInfo = examDate
      ? `\n\nExam date: ${examDate} (${Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)} days away). Prioritize topics for highest weightage subjects.`
      : "";

    const subjectList = subjects
      .filter((s) => selected.includes(s.name))
      .map((s) => `${s.icon} ${s.name}${s.hasLab ? " (has Lab)" : ""}`)
      .join("\n");

    try {
      const resp = await fetchWithRetry(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an academic study planner for Pakistani university students.
Create a detailed 7-day timetable (Mon–Sun) in markdown tables. Use all ${weeklyHours} hours/week.
Distribute time fairly with extra slots for lab subjects. Include morning, afternoon, evening blocks, revision and a weekend review. Add emojis and 2 motivational tips.`,
            },
            {
              role: "user",
              content: `Semester ${semester}. Weekly capacity: ${weeklyHours} hours.\nSubjects:\n${subjectList}${examInfo}\n\nMake it practical and balanced.`,
            },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited, try again shortly");
        else if (resp.status === 402) toast.error("Credits needed — top up in workspace settings");
        else toast.error("Generation failed");
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "", text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { text += c; setSchedule(text); }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!user || !schedule) return;
    setSaving(true);
    const { error } = await supabase.from("study_plans" as any).insert({
      user_id: user.id, semester, subjects: selected,
      exam_date: examDate || null, weekly_hours: weeklyHours, schedule,
    } as any);
    setSaving(false);
    if (error) { toast.error("Couldn't save plan"); return; }
    toast.success("Plan saved!");
  };

  return (
    <PageShell
      title="AI Study Planner"
      subtitle="Smart weekly schedule built around your exams"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Semester</label>
              <Select value={String(semester)} onValueChange={(v) => { setSemester(Number(v)); setSelected([]); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Weekly Study Hours</label>
              <Input type="number" min={1} max={80} value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value) || 14)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Exam Date (optional)</label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          {/* Subject selector */}
          <div>
            <label className="text-xs text-muted-foreground">Subjects ({selected.length}/{subjects.length})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 glass rounded-xl px-3 py-2 cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={selected.includes(s.name)} onCheckedChange={() => toggle(s.name)} />
                  <span className="text-sm text-foreground">{s.icon} {s.name}</span>
                  {s.hasLab && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Lab</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={generatePlan} disabled={loading} className="rounded-xl gap-2 gradient-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate Weekly Plan"}
            </Button>
            {schedule && !loading && (
              <>
                <Button onClick={generatePlan} variant="outline" className="rounded-xl gap-2">
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </Button>
                <Button onClick={savePlan} disabled={saving} variant="outline" className="rounded-xl gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {loading && !schedule && <ThinkingAnimation message="UniGenius aapka study plan bana raha hai..." />}

        {schedule ? (
          <div className="glass rounded-2xl p-6 overflow-x-auto">
            <MarkdownMessage content={schedule} />
          </div>
        ) : !loading ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-display font-semibold text-foreground">Your AI Study Plan</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Pick subjects, set weekly hours & optional exam date. AI builds a personalized weekly timetable.
            </p>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
};

export default PlannerPage;
