import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Library, Search, Eye, EyeOff, Lightbulb, Play, Pencil, Trash2, CheckCircle, XCircle, ArrowRight, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";

interface QuestionRow {
  id: string;
  subject: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  semester: number | null;
  created_by: string;
}

const QuestionBankPage = () => {
  const { user } = useAuth();
  const { isTeacher, isAdmin } = useRole();
  const queryClient = useQueryClient();

  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [explained, setExplained] = useState<Record<string, boolean>>({});

  // Practice state
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceQs, setPracticeQs] = useState<QuestionRow[]>([]);
  const [pIdx, setPIdx] = useState(0);
  const [pSelected, setPSelected] = useState<string | null>(null);
  const [pShow, setPShow] = useState(false);
  const [pScore, setPScore] = useState(0);
  const [pDone, setPDone] = useState(false);

  // Edit/delete
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["question-bank-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as QuestionRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const subjects = useMemo(
    () => Array.from(new Set(questions.map((q) => q.subject).filter(Boolean))).sort(),
    [questions]
  );
  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((q) => subjectFilter === "all" || q.subject === subjectFilter)
            .map((q) => q.topic)
            .filter(Boolean)
        )
      ).sort(),
    [questions, subjectFilter]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (subjectFilter !== "all" && q.subject !== subjectFilter) return false;
      if (topicFilter !== "all" && q.topic !== topicFilter) return false;
      if (!s) return true;
      return (
        q.question.toLowerCase().includes(s) ||
        q.topic?.toLowerCase().includes(s) ||
        q.subject?.toLowerCase().includes(s)
      );
    });
  }, [questions, subjectFilter, topicFilter, search]);

  const startPractice = () => {
    if (filtered.length === 0) {
      toast.error("No questions match your filters");
      return;
    }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.min(20, filtered.length));
    setPracticeQs(shuffled);
    setPIdx(0);
    setPSelected(null);
    setPShow(false);
    setPScore(0);
    setPDone(false);
    setPracticeMode(true);
  };

  const submitAnswer = () => {
    if (!pSelected) return;
    if (pSelected === practiceQs[pIdx].correct_answer) setPScore((s) => s + 1);
    setPShow(true);
  };

  const nextQuestion = () => {
    if (pIdx + 1 >= practiceQs.length) {
      setPDone(true);
      return;
    }
    setPIdx((i) => i + 1);
    setPSelected(null);
    setPShow(false);
  };

  const handleDelete = async (q: QuestionRow) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("question_bank").delete().eq("id", q.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Question deleted");
    queryClient.invalidateQueries({ queryKey: ["question-bank-all"] });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("question_bank")
      .update({
        question: editing.question,
        topic: editing.topic,
        option_a: editing.option_a,
        option_b: editing.option_b,
        option_c: editing.option_c,
        option_d: editing.option_d,
        correct_answer: editing.correct_answer,
        explanation: editing.explanation,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Question updated");
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["question-bank-all"] });
  };

  const canEdit = (q: QuestionRow) => isAdmin || (isTeacher && q.created_by === user?.id);

  // PRACTICE MODE UI
  if (practiceMode) {
    const currentQ = practiceQs[pIdx];
    const opts: { key: "A" | "B" | "C" | "D"; text: string }[] = currentQ
      ? [
          { key: "A", text: currentQ.option_a },
          { key: "B", text: currentQ.option_b },
          { key: "C", text: currentQ.option_c },
          { key: "D", text: currentQ.option_d },
        ]
      : [];

    return (
      <PageShell title="Practice Quiz" subtitle={`Question ${Math.min(pIdx + 1, practiceQs.length)} of ${practiceQs.length}`} icon={<Play className="w-6 h-6 text-primary" />}>
        {pDone ? (
          <Card className="p-8 text-center max-w-xl mx-auto">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-5xl font-display font-bold text-primary mb-2">
              {pScore}/{practiceQs.length}
            </p>
            <p className="text-muted-foreground mb-6">
              {Math.round((pScore / practiceQs.length) * 100)}% correct
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setPracticeMode(false)} variant="outline">
                Back to Bank
              </Button>
              <Button onClick={startPractice}>Practice Again</Button>
            </div>
          </Card>
        ) : currentQ ? (
          <Card className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary">{currentQ.subject}</Badge>
                {currentQ.topic && <Badge variant="outline">{currentQ.topic}</Badge>}
              </div>
              <h3 className="text-lg font-semibold">{currentQ.question}</h3>
            </div>
            <div className="space-y-2">
              {opts.map((o) => {
                const isCorrect = pShow && o.key === currentQ.correct_answer;
                const isWrong = pShow && pSelected === o.key && o.key !== currentQ.correct_answer;
                return (
                  <button
                    key={o.key}
                    disabled={pShow}
                    onClick={() => setPSelected(o.key)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isCorrect
                        ? "border-green-500 bg-green-500/10"
                        : isWrong
                        ? "border-destructive bg-destructive/10"
                        : pSelected === o.key
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">{o.key}.</span>
                      <span className="flex-1">{o.text}</span>
                      {isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isWrong && <XCircle className="w-5 h-5 text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {pShow && currentQ.explanation && (
              <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
                <p className="text-sm font-semibold mb-1">Explanation</p>
                <p className="text-sm text-muted-foreground">{currentQ.explanation}</p>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setPracticeMode(false)}>Exit</Button>
              {pShow ? (
                <Button onClick={nextQuestion}>
                  {pIdx + 1 >= practiceQs.length ? "Finish" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submitAnswer} disabled={!pSelected}>Submit</Button>
              )}
            </div>
          </Card>
        ) : null}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Question Bank"
      subtitle="Browse teacher-curated MCQs and practice for exams"
      icon={<Library className="w-6 h-6 text-primary" />}
    >
      {/* Controls */}
      <Card className="p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setTopicFilter("all"); }}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> question{filtered.length !== 1 && "s"}
          </p>
          <Button onClick={startPractice} disabled={filtered.length === 0}>
            <Play className="w-4 h-4 mr-1" /> Start Practice
          </Button>
        </div>
      </Card>

      {/* Questions list */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Library className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No questions found. Try adjusting your filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((q, i) => {
            const showAns = revealed[q.id];
            const showExp = explained[q.id];
            const opts: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
            const optMap = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <Card className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{q.subject}</Badge>
                      {q.topic && <Badge variant="outline">{q.topic}</Badge>}
                    </div>
                    {canEdit(q) && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(q)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(q)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-base">{q.question}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {opts.map((k) => {
                      const isCorrect = showAns && k === q.correct_answer;
                      return (
                        <div
                          key={k}
                          className={`p-3 rounded-lg border ${
                            isCorrect ? "border-green-500 bg-green-500/10" : "border-border bg-muted/30"
                          }`}
                        >
                          <span className="font-bold text-primary mr-2">{k}.</span>
                          <span>{optMap[k]}</span>
                          {isCorrect && <CheckCircle className="w-4 h-4 text-green-500 inline ml-2" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))}
                    >
                      {showAns ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {showAns ? "Hide Answer" : "Show Answer"}
                    </Button>
                    {q.explanation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExplained((r) => ({ ...r, [q.id]: !r[q.id] }))}
                      >
                        <Lightbulb className="w-4 h-4 mr-1" />
                        {showExp ? "Hide Explanation" : "Show Explanation"}
                      </Button>
                    )}
                  </div>
                  {showExp && q.explanation && (
                    <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary text-sm text-muted-foreground">
                      {q.explanation}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Topic</Label>
                <Input value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} />
              </div>
              <div>
                <Label>Question</Label>
                <Textarea value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
              </div>
              {(["a", "b", "c", "d"] as const).map((k) => (
                <div key={k}>
                  <Label>Option {k.toUpperCase()}</Label>
                  <Input
                    value={(editing as any)[`option_${k}`]}
                    onChange={(e) => setEditing({ ...editing, [`option_${k}`]: e.target.value } as QuestionRow)}
                  />
                </div>
              ))}
              <div>
                <Label>Correct Answer</Label>
                <Select
                  value={editing.correct_answer}
                  onValueChange={(v) => setEditing({ ...editing, correct_answer: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Explanation</Label>
                <Textarea
                  value={editing.explanation || ""}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default QuestionBankPage;
