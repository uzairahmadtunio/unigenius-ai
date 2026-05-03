import { useState, useRef } from "react";
import { Brain, ListChecks, Trophy, ArrowRight, CheckCircle, XCircle, Loader2, BarChart3, ChevronDown, ChevronUp, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { authHeader } from "@/lib/auth-header";
import PageShell from "@/components/PageShell";

interface MCQ {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  explanation?: string;
}

interface AnswerRecord {
  questionIndex: number;
  selected: string;
  correct: string;
  isCorrect: boolean;
}

const ALLOWED_QUIZ_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.pptx,.ppt";

const PracticePage = () => {
  const { department } = useDepartment();
  const { user } = useAuth();
  const [semester, setSemester] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = department ? getSubjects(department, semester) : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large! Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({ name: file.name, type: file.type, dataUrl: reader.result as string });
      toast.success(`${file.name} attached! Select a subject or click "Generate from File" to start.`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startQuiz = async (subjectName: string) => {
    setLoading(true);
    setSelectedSubject(subjectName);
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setQuizDone(false);
    setAnswers([]);
    setShowBreakdown(false);

    try {
      const body: any = {
        subject: subjectName,
        department: department ? departmentInfo[department].fullName : "Software Engineering",
        count: 30,
      };

      // If file is uploaded, include file data for vision analysis
      if (uploadedFile) {
        body.fileData = uploadedFile.dataUrl;
        body.fileType = uploadedFile.type;
        body.fileName = uploadedFile.name;
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${await authHeader()}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate quiz");
      }

      const data = await resp.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error("No questions generated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz");
      setSelectedSubject(null);
    } finally {
      setLoading(false);
    }
  };

  const startQuizFromFile = async () => {
    if (!uploadedFile) {
      toast.error("Please upload a file first!");
      return;
    }
    await startQuiz(uploadedFile.name.replace(/\.[^/.]+$/, ""));
  };

  const handleAnswer = (key: string) => {
    if (showResult) return;
    setSelected(key);
    setShowResult(true);
    const isCorrect = key === questions[currentQ].correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, {
      questionIndex: currentQ,
      selected: key,
      correct: questions[currentQ].correct,
      isCorrect,
    }]);
  };

  const nextQuestion = async () => {
    setSelected(null);
    setShowResult(false);
    if (currentQ + 1 < questions.length) {
      setCurrentQ((c) => c + 1);
    } else {
      setQuizDone(true);
      if (user) {
        try {
          await supabase.from("quiz_results").insert({
            user_id: user.id,
            subject: selectedSubject!,
            semester,
            score,
            total: questions.length,
            quiz_type: "practice",
          });
        } catch (e) {
          console.error("Failed to save quiz result:", e);
        }
      }
    }
  };

  const resetQuiz = () => {
    setSelectedSubject(null);
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setQuizDone(false);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setShowBreakdown(false);
    setUploadedFile(null);
  };

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Final scorecard
  if (quizDone && selectedSubject) {
    return (
      <PageShell
        title="Practice Mode"
        subtitle="Final Scorecard"
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="text-6xl">{percentage >= 80 ? "🏆" : percentage >= 50 ? "👍" : "📚"}</div>
            <h2 className="font-display font-bold text-2xl text-foreground">
              {percentage >= 80 ? "Excellent!" : percentage >= 50 ? "Good Job!" : "Keep Practicing!"}
            </h2>
            <p className="text-muted-foreground">{selectedSubject}</p>
            <div className="text-4xl font-bold gradient-text">{score}/{questions.length}</div>
            <p className="text-sm text-muted-foreground">Score: {percentage}%</p>

            <div className="flex justify-center gap-6 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{answers.filter(a => a.isCorrect).length}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{answers.filter(a => !a.isCorrect).length}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{questions.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {!user && <p className="text-xs text-muted-foreground">Sign in to save your quiz results!</p>}

            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => setShowBreakdown(!showBreakdown)} variant="outline" className="rounded-xl gap-2">
                <BarChart3 className="w-4 h-4" />
                {showBreakdown ? "Hide" : "View"} Breakdown
                {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button onClick={resetQuiz} className="rounded-xl gradient-primary text-primary-foreground">
                Try Another Quiz
              </Button>
            </div>
          </motion.div>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {questions.map((q, i) => {
                  const ans = answers[i];
                  if (!ans) return null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`glass rounded-xl p-4 border-l-4 ${ans.isCorrect ? "border-l-emerald-500" : "border-l-destructive"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">
                          {ans.isCorrect
                            ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                            : <XCircle className="w-5 h-5 text-destructive" />}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground">Q{i + 1}: {q.question}</p>
                          {!ans.isCorrect && (
                            <p className="text-xs text-destructive">
                              Your answer: {ans.selected} — {q.options[ans.selected as keyof typeof q.options]}
                            </p>
                          )}
                          <p className="text-xs text-emerald-400">
                            Correct: {ans.correct} — {q.options[ans.correct as keyof typeof q.options]}
                          </p>
                          {q.explanation && (
                            <p className="text-xs text-muted-foreground italic mt-1">💡 {q.explanation}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageShell>
    );
  }

  // Active quiz
  if (questions.length > 0 && selectedSubject) {
    const q = questions[currentQ];
    return (
      <PageShell
        title="Practice Mode"
        subtitle={`${selectedSubject} — Q${currentQ + 1}/${questions.length}`}
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Brain className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div className="h-2 rounded-full gradient-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{currentQ + 1}/{questions.length}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="glass rounded-2xl p-6">
                <p className="text-sm text-muted-foreground mb-2">Question {currentQ + 1}</p>
                <h3 className="font-display font-semibold text-foreground text-lg">{q.question}</h3>
              </div>

              <div className="grid gap-3">
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const isCorrect = key === q.correct;
                  const isSelected = key === selected;
                  let borderClass = "border-border/50";
                  if (showResult) {
                    if (isCorrect) borderClass = "border-emerald-500 bg-emerald-500/10";
                    else if (isSelected && !isCorrect) borderClass = "border-destructive bg-destructive/10";
                  }

                  return (
                    <motion.button
                      key={key}
                      whileHover={!showResult ? { scale: 1.01 } : undefined}
                      whileTap={!showResult ? { scale: 0.99 } : undefined}
                      onClick={() => handleAnswer(key)}
                      disabled={showResult}
                      className={`glass rounded-xl p-4 text-left flex items-center gap-3 transition-all border-2 ${borderClass} ${!showResult ? "hover:border-primary/50 cursor-pointer" : ""}`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground">{key}</span>
                      <span className="text-sm text-foreground flex-1">{q.options[key]}</span>
                      {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                    </motion.button>
                  );
                })}
              </div>

              {showResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {q.explanation && (
                    <div className="glass rounded-xl p-4 border-l-4 border-l-primary">
                      <p className="text-xs text-muted-foreground font-medium mb-1">💡 Explanation</p>
                      <p className="text-sm text-foreground">{q.explanation}</p>
                    </div>
                  )}
                  <Button onClick={nextQuestion} className="w-full rounded-xl gradient-primary text-primary-foreground gap-2">
                    {currentQ + 1 < questions.length ? "Next Question" : "See Final Scorecard"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </PageShell>
    );
  }

  // Subject selection
  return (
    <PageShell
      title="Practice Mode"
      subtitle="AI-Powered Quizzes — 30 MCQs"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Brain className="w-5 h-5 text-primary-foreground" /></div>}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">
            {uploadedFile ? "AI is reading your file and generating MCQs..." : "Generating 30 quiz questions with AI..."}
          </p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Upload for Vision MCQs */}
          <div className="glass rounded-2xl p-4 border border-dashed border-primary/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Upload File for AI-Powered MCQs</span>
              </div>
              {uploadedFile && (
                <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {uploadedFile ? (
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                {uploadedFile.type.startsWith("image/") ? (
                  <img src={uploadedFile.dataUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">AI will analyze this file to generate relevant MCQs</p>
                </div>
                <Button onClick={startQuizFromFile} size="sm" className="rounded-xl gradient-primary text-primary-foreground gap-1.5 flex-shrink-0">
                  <Brain className="w-3.5 h-3.5" /> Generate
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-3">
                <p className="text-xs text-muted-foreground">Upload a textbook page, lecture slide, or document — AI will read it and create MCQs</p>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Choose File
                </Button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={ALLOWED_QUIZ_EXTENSIONS} className="hidden" />
          </div>

          {/* Semester selector */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <motion.div key={s} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={semester === s ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl ${semester === s ? "gradient-primary text-primary-foreground" : ""}`}
                  onClick={() => setSemester(s)}
                >
                  Sem {s}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Subject grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub, idx) => (
              <motion.button
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startQuiz(sub.name)}
                className="glass rounded-2xl p-6 text-left space-y-3 hover:border-primary/50 transition-all border-2 border-transparent hover:shadow-elevated"
              >
                <span className="text-2xl">{sub.icon}</span>
                <h3 className="font-display font-semibold text-foreground text-sm">{sub.name}</h3>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <ListChecks className="w-3 h-3" /> 30 MCQs
                  {uploadedFile && <span className="text-amber-400 ml-1">+ File Analysis</span>}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default PracticePage;
