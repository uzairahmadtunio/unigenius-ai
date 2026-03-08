import { useState, useEffect } from "react";
import { CalendarDays, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [schedule, setSchedule] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("current_semester")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if ((data as any)?.current_semester) setSemester((data as any).current_semester);
      });
  }, [user]);

  const subjects = department ? getSubjects(department, semester) : [];

  const generatePlan = async () => {
    if (!subjects.length) {
      toast.error("No subjects found for this semester");
      return;
    }
    setLoading(true);
    setSchedule("");

    const subjectList = subjects.map((s) => `${s.icon} ${s.name}${s.hasLab ? " (has Lab)" : ""}`).join("\n");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an academic study planner for Pakistani university students. Create a detailed weekly study timetable.

RULES:
- Plan for 7 days (Monday to Sunday)
- Include study sessions, lab practice, revision, and breaks
- Allocate more time to subjects with labs
- Include morning, afternoon, and evening slots
- Add motivational tips
- Use markdown tables for the schedule
- Keep it practical for a university student
- Include a "Weekend Review" session
- Add emoji for each subject`,
            },
            {
              role: "user",
              content: `Create a weekly study plan for Semester ${semester} with these subjects:\n${subjectList}\n\nMake it balanced and practical. Include specific topics to cover each day.`,
            },
          ],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Rate limited, try again shortly");
        else if (resp.status === 402) toast.error("Credits needed — top up in workspace settings");
        else throw new Error(err.error || "Generation failed");
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let text = "";

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
            if (c) {
              text += c;
              setSchedule(text);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="AI Study Planner"
      subtitle="Weekly schedule tailored to your semester"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Semester</label>
            <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
              <SelectTrigger className="rounded-xl w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generatePlan} disabled={loading} className="rounded-xl gap-2 gradient-primary text-primary-foreground">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Weekly Plan"}
          </Button>

          {schedule && (
            <Button onClick={generatePlan} disabled={loading} variant="outline" className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
          )}
        </div>

        {/* Subjects preview */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Semester {semester} Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                {s.icon} {s.name}
              </span>
            ))}
            {subjects.length === 0 && <p className="text-xs text-muted-foreground">No subjects found</p>}
          </div>
        </div>

        {loading && !schedule && (
          <ThinkingAnimation message="UniGenius aapka study plan bana raha hai..." />
        )}

        {/* Schedule output */}
        {schedule ? (
          <div className="glass rounded-2xl p-6 overflow-x-auto">
            <MarkdownMessage content={schedule} />
          </div>
        ) : !loading ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-display font-semibold text-foreground">Your AI Study Plan</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select your semester and click generate. AI will create a personalized weekly study timetable based on your subjects.
            </p>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
};

export default PlannerPage;
