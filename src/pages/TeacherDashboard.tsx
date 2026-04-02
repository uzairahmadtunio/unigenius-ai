import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, Upload, ClipboardList, BarChart3,
  Plus, Trash2, ArrowLeft, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";

type TeacherTab = "dashboard" | "create-quiz" | "upload-material" | "question-bank" | "results";

const TeacherDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TeacherTab>("dashboard");

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || (!isTeacher && !isAdmin))) {
      navigate("/");
    }
  }, [authLoading, roleLoading, user, isTeacher, isAdmin, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isTeacher && !isAdmin) return null;

  const tabs = [
    { id: "dashboard" as TeacherTab, label: "Dashboard", icon: BarChart3 },
    { id: "create-quiz" as TeacherTab, label: "Create Quiz", icon: ClipboardList },
    { id: "upload-material" as TeacherTab, label: "Upload Material", icon: Upload },
    { id: "question-bank" as TeacherTab, label: "Question Bank", icon: BookOpen },
    { id: "results" as TeacherTab, label: "Student Results", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-foreground">Teacher Panel</h1>
              <p className="text-[10px] text-muted-foreground">UniGenius AI</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs" onClick={() => navigate("/")}>
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Dashboard
          </Button>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold text-foreground">Teacher</h1>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => navigate("/")}>
              ← Home
            </Button>
          </div>

          {activeTab === "dashboard" && <TeacherOverview onNavigate={setActiveTab} />}
          {activeTab === "create-quiz" && <CreateQuizTab />}
          {activeTab === "upload-material" && <UploadMaterialTab />}
          {activeTab === "question-bank" && <QuestionBankTab />}
          {activeTab === "results" && <StudentResultsTab />}
        </div>
      </main>
    </div>
  );
};

/* ===== OVERVIEW ===== */
const TeacherOverview = ({ onNavigate }: { onNavigate: (tab: TeacherTab) => void }) => {
  const [questionCount, setQuestionCount] = useState(0);
  const [materialCount, setMaterialCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from("question_bank" as any).select("id", { count: "exact", head: true }).eq("created_by", user.id)
      .then(({ count }) => setQuestionCount(count || 0));
    supabase.from("study_materials" as any).select("id", { count: "exact", head: true }).eq("uploaded_by", user.id)
      .then(({ count }) => setMaterialCount(count || 0));
  }, [user]);

  const cards = [
    { label: "Create Quiz", desc: "Add MCQs to question bank", icon: ClipboardList, tab: "create-quiz" as TeacherTab, color: "text-blue-400" },
    { label: "Upload Material", desc: "Share study resources", icon: Upload, tab: "upload-material" as TeacherTab, color: "text-emerald-400" },
    { label: "Question Bank", desc: `${questionCount} questions created`, icon: BookOpen, tab: "question-bank" as TeacherTab, color: "text-amber-400" },
    { label: "Student Results", desc: "View quiz performance", icon: BarChart3, tab: "results" as TeacherTab, color: "text-purple-400" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Teacher Dashboard</h2>
        <p className="text-xs text-muted-foreground">Manage quizzes, materials, and track student progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Card
            key={c.tab}
            className="border-border/30 bg-card cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => onNavigate(c.tab)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/30 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{questionCount}</p>
            <p className="text-[10px] text-muted-foreground">Questions Created</p>
          </CardContent>
        </Card>
        <Card className="border-border/30 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{materialCount}</p>
            <p className="text-[10px] text-muted-foreground">Materials Uploaded</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-4">
        <p className="text-[10px] text-muted-foreground">Built by Uzair Ahmad</p>
      </div>
    </motion.div>
  );
};

/* ===== CREATE QUIZ ===== */
const CreateQuizTab = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [semester, setSemester] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !question.trim() || !optionA || !optionB || !optionC || !optionD) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("question_bank" as any).insert({
      created_by: user.id,
      subject: subject.trim(),
      topic: topic.trim(),
      question: question.trim(),
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      option_c: optionC.trim(),
      option_d: optionD.trim(),
      correct_answer: correct,
      explanation: explanation.trim(),
      semester: parseInt(semester),
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Question added to bank!");
      setQuestion(""); setOptionA(""); setOptionB(""); setOptionC(""); setOptionD("");
      setExplanation(""); setTopic("");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground">Create Quiz Question</h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Subject *</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Binary Trees" className="rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Semester</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Correct Answer *</label>
            <Select value={correct} onValueChange={setCorrect}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Option A</SelectItem>
                <SelectItem value="B">Option B</SelectItem>
                <SelectItem value="C">Option C</SelectItem>
                <SelectItem value="D">Option D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Question *</label>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the question..." className="rounded-xl min-h-[80px]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Option A *</label>
            <Input value={optionA} onChange={(e) => setOptionA(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Option B *</label>
            <Input value={optionB} onChange={(e) => setOptionB(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Option C *</label>
            <Input value={optionC} onChange={(e) => setOptionC(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Option D *</label>
            <Input value={optionD} onChange={(e) => setOptionD(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Explanation (optional)</label>
          <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why is this the correct answer?" className="rounded-xl" />
        </div>

        <Button type="submit" disabled={submitting} className="rounded-xl w-full sm:w-auto">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Plus className="w-4 h-4 mr-2" /> Add Question</>}
        </Button>
      </form>
    </motion.div>
  );
};

/* ===== UPLOAD MATERIAL ===== */
const UploadMaterialTab = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [semester, setSemester] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !title.trim() || !file || !user) {
      toast.error("Please fill subject, title and select a file");
      return;
    }
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("study-materials").upload(path, file);

    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("study-materials").getPublicUrl(path);

    const { error } = await supabase.from("study_materials" as any).insert({
      uploaded_by: user.id,
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      file_url: urlData.publicUrl,
      file_name: file.name,
      semester: parseInt(semester),
    });

    setUploading(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Study material uploaded!");
      setTitle(""); setDescription(""); setFile(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground">Upload Study Material</h2>

      <form onSubmit={handleUpload} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Subject *</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Database Systems" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Semester</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Notes" className="rounded-xl" />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="rounded-xl" />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">File (PDF, PPT, DOCX) *</label>
          <Input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="rounded-xl"
          />
          {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
        </div>

        <Button type="submit" disabled={uploading} className="rounded-xl w-full sm:w-auto">
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-2" /> Upload Material</>}
        </Button>
      </form>
    </motion.div>
  );
};

/* ===== QUESTION BANK ===== */
const QuestionBankTab = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("question_bank" as any)
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("question_bank" as any).delete().eq("id", id);
    toast.success("Question deleted");
    fetchQuestions();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground">Question Bank</h2>
        <Badge variant="secondary">{questions.length} Questions</Badge>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No questions yet. Create your first quiz!</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any) => (
            <Card key={q.id} className="border-border/30 bg-card">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{q.subject}</Badge>
                      {q.topic && <Badge variant="secondary" className="text-[10px]">{q.topic}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">Sem {q.semester}</Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span className={q.correct_answer === "A" ? "text-emerald-400 font-semibold" : ""}>A: {q.option_a}</span>
                      <span className={q.correct_answer === "B" ? "text-emerald-400 font-semibold" : ""}>B: {q.option_b}</span>
                      <span className={q.correct_answer === "C" ? "text-emerald-400 font-semibold" : ""}>C: {q.option_c}</span>
                      <span className={q.correct_answer === "D" ? "text-emerald-400 font-semibold" : ""}>D: {q.option_d}</span>
                    </div>
                    {q.explanation && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">💡 {q.explanation}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

/* ===== STUDENT RESULTS ===== */
const StudentResultsTab = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from("quiz_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) { setLoading(false); return; }

      // Fetch profile names for each user
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || "Unknown"]));

      setResults(data.map(r => ({
        ...r,
        student_name: nameMap.get(r.user_id) || "Unknown",
      })));
      setLoading(false);
    };
    fetchResults();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground">Student Results</h2>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading results...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No quiz results found yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 px-3">Student</th>
                <th className="text-left py-2 px-3">Subject</th>
                <th className="text-left py-2 px-3">Score</th>
                <th className="text-left py-2 px-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{r.student_name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.subject}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={r.score === r.total ? "default" : "secondary"}>
                      {r.score}/{r.total}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default TeacherDashboard;
