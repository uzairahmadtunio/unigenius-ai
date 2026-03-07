import { useState, useEffect } from "react";
import { User, Trophy, Calculator, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  total: number;
  semester: number;
  quiz_type: string;
  created_at: string;
}

const gradePoints: Record<string, number> = { "A+": 4.0, A: 4.0, "A-": 3.67, "B+": 3.33, B: 3.0, "B-": 2.67, "C+": 2.33, C: 2.0, "C-": 1.67, D: 1.0, F: 0.0 };

interface CourseGrade { grade: string; credits: number }

const ProfilePage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const navigate = useNavigate();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [courses, setCourses] = useState<CourseGrade[]>([{ grade: "A", credits: 3 }]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const fetchResults = async () => {
      const { data } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setQuizResults(data);
    };
    fetchResults();
  }, [user, navigate]);

  const addCourse = () => setCourses([...courses, { grade: "A", credits: 3 }]);
  const removeCourse = (i: number) => setCourses(courses.filter((_, idx) => idx !== i));
  const updateCourse = (i: number, field: keyof CourseGrade, value: string | number) => {
    const updated = [...courses];
    updated[i] = { ...updated[i], [field]: value };
    setCourses(updated);
  };

  const gpa = (() => {
    let totalPoints = 0, totalCredits = 0;
    for (const c of courses) {
      const points = gradePoints[c.grade] ?? 0;
      totalPoints += points * c.credits;
      totalCredits += c.credits;
    }
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  })();

  if (!user) return null;

  return (
    <PageShell
      title="My Profile"
      subtitle={user.email || "Student"}
      icon={<div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><User className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">{user.email}</h2>
              <p className="text-sm text-muted-foreground">
                {department ? departmentInfo[department].fullName : "No department selected"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{quizResults.length}</p>
              <p className="text-xs text-muted-foreground">Quizzes</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">
                {quizResults.length > 0 ? Math.round(quizResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / quizResults.length) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xl font-bold gradient-text">{gpa}</p>
              <p className="text-xs text-muted-foreground">GPA</p>
            </div>
          </div>
        </motion.div>

        {/* GPA Calculator */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">GPA Calculator (4.0 Scale)</h3>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {courses.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={c.grade} onValueChange={(v) => updateCourse(i, "grade", v)}>
                  <SelectTrigger className="rounded-lg w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(gradePoints).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(c.credits)} onValueChange={(v) => updateCourse(i, "credits", Number(v))}>
                  <SelectTrigger className="rounded-lg w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((cr) => <SelectItem key={cr} value={String(cr)}>{cr} CH</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeCourse(i)} className="text-xs text-destructive">✕</Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addCourse} className="rounded-xl text-xs">+ Add Course</Button>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Semester GPA</p>
              <p className="text-2xl font-bold gradient-text">{gpa}</p>
            </div>
          </div>
        </motion.div>

        {/* Quiz History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Recent Quiz Results</h3>
          </div>

          {quizResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No quiz results yet. Go to Practice Mode to take your first quiz!</p>
              <Button onClick={() => navigate("/practice")} className="mt-3 rounded-xl gradient-primary text-primary-foreground" size="sm">
                Start Practicing
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {quizResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">Sem {r.semester} • {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${(r.score / r.total) * 100 >= 60 ? "text-emerald-500" : "text-destructive"}`}>
                      {r.score}/{r.total}
                    </p>
                    <p className="text-xs text-muted-foreground">{Math.round((r.score / r.total) * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </PageShell>
  );
};

export default ProfilePage;
