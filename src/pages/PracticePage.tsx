import { useState } from "react";
import { Brain, ListChecks, Trophy, ArrowRight, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";

interface MCQ {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
}

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

  const subjects = department ? getSubjects(department, semester) : [];

  const startQuiz = async (subjectName: string) => {
    setLoading(true);
    setSelectedSubject(subjectName);
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setQuizDone(false);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          subject: subjectName,
          department: department ? departmentInfo[department].fullName : "Software Engineering",
        }),
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

  const handleAnswer = (key: string) => {
    if (showResult) return;
    setSelected(key);
    setShowResult(true);
    if (key === questions[currentQ].correct) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = async () => {
    setSelected(null);
    setShowResult(false);
    if (currentQ + 1 < questions.length) {
      setCurrentQ((c) => c + 1);
    } else {
      setQuizDone(true);
      // Save result
      if (user) {
        const finalScore = selected === questions[currentQ]?.correct ? score + 1 : score;
        // We already incremented score in handleAnswer, so just use current score
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
  };

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Quiz done screen
  if (quizDone && selectedSubject) {
    return (
      <PageShell
        title="Practice Mode"
        subtitle="Quiz Complete!"
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
          <div className="text-6xl">{percentage >= 80 ? "🏆" : percentage >= 50 ? "👍" : "📚"}</div>
          <h2 className="font-display font-bold text-2xl text-foreground">
            {percentage >= 80 ? "Excellent!" : percentage >= 50 ? "Good Job!" : "Keep Practicing!"}
          </h2>
          <p className="text-muted-foreground">{selectedSubject}</p>
          <div className="text-4xl font-bold gradient-text">{score}/{questions.length}</div>
          <p className="text-sm text-muted-foreground">Score: {percentage}%</p>
          {!user && <p className="text-xs text-muted-foreground">Sign in to save your quiz results!</p>}
          <Button onClick={resetQuiz} className="rounded-xl gradient-primary text-primary-foreground">
            Try Another Quiz
          </Button>
        </motion.div>
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
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full gradient-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
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
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      disabled={showResult}
                      className={`glass rounded-xl p-4 text-left flex items-center gap-3 transition-all border-2 ${borderClass} ${!showResult ? "hover:border-primary/50 cursor-pointer" : ""}`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground">{key}</span>
                      <span className="text-sm text-foreground flex-1">{q.options[key]}</span>
                      {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button onClick={nextQuestion} className="w-full rounded-xl gradient-primary text-primary-foreground gap-2">
                    {currentQ + 1 < questions.length ? "Next Question" : "See Results"} <ArrowRight className="w-4 h-4" />
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
      subtitle="AI-Powered Quizzes"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Brain className="w-5 h-5 text-primary-foreground" /></div>}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Generating quiz questions with AI...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Semester selector */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <Button
                key={s}
                variant={semester === s ? "default" : "outline"}
                size="sm"
                className={`rounded-xl ${semester === s ? "gradient-primary text-primary-foreground" : ""}`}
                onClick={() => setSemester(s)}
              >
                Sem {s}
              </Button>
            ))}
          </div>

          {/* Subject grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => startQuiz(sub.name)}
                className="glass rounded-2xl p-6 text-left space-y-3 hover:border-primary/50 transition-all border-2 border-transparent"
              >
                <span className="text-2xl">{sub.icon}</span>
                <h3 className="font-display font-semibold text-foreground text-sm">{sub.name}</h3>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <ListChecks className="w-3 h-3" /> 5 MCQs
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default PracticePage;
